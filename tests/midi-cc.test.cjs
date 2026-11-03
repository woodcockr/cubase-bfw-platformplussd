const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const moduleCache = new Map();

function loadTypeScript(filePath) {
  const resolved = path.resolve(filePath);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved);
  const compiled = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
  });
  const exportsObject = {};
  moduleCache.set(resolved, exportsObject);
  runInNewContext(compiled.outputText, {
    exports: exportsObject,
    require(specifier) {
      assert.ok(specifier.startsWith("."));
      return loadTypeScript(path.resolve(path.dirname(resolved), specifier + ".ts"));
    },
  }, { filename: resolved });
  return exportsObject;
}

const config = loadTypeScript(path.join(__dirname, "../src/midi/MidiCcConfig.ts"));
const names = loadTypeScript(path.join(__dirname, "../src/midi/CcNames.ts"));

// Values from the vm context have a different Object prototype; normalise them.
const plain = (value) => JSON.parse(JSON.stringify(value));

const defaults = [
  { cc: 1, title: "Dynamics" },
  { cc: 11, title: "Expression" },
  { cc: 2, title: "Breath" },
  { cc: 21, title: "Vibrato" },
  { cc: 7, title: "Volume" },
  { cc: 16, title: "General Purpose 1" },
  { cc: 17, title: "General Purpose 2" },
  { cc: 18, title: "General Purpose 3" },
];

test("built-in defaults use orchestral and standard names", () => {
  assert.deepEqual(plain(config.getDefaultMidiCcConfig()), defaults);
  assert.equal(names.getCcName(64), "Sustain Pedal");
  assert.equal(names.getCcName(33), "LSB 1");
  assert.equal(names.getCcName(3), "CC3");
  assert.equal(names.getCcName(127), "Poly On");
});

test("shipped midi-cc-config.js matches the built-in defaults", () => {
  const shipped = require("../src/midi-cc-config.js");
  const result = config.parseMidiCcConfig(shipped);
  assert.deepEqual(plain(result.errors), []);
  assert.deepEqual(plain(result.config), defaults);
});

test("valid rows override channels and blank names use built-in names", () => {
  const result = config.parseMidiCcConfig({ rows: [" 64 , Sustain ", "7,", "", "# 3, ignored", "1, Dynamics"] });
  assert.deepEqual(plain(result.errors), []);
  assert.deepEqual(plain(result.config.slice(0, 4)), [
    { cc: 64, title: "Sustain" },
    { cc: 7, title: "Volume" },
    { cc: 1, title: "Dynamics" },
    defaults[3],
  ]);
  assert.equal(result.config.length, 8);
});

test("no rows uses defaults without errors", () => {
  const result = config.parseMidiCcConfig({ rows: [] });
  assert.deepEqual(plain(result.errors), []);
  assert.deepEqual(plain(result.config), defaults);
});

test("any invalid row falls back to the complete defaults and reports every error", () => {
  const result = config.parseMidiCcConfig({ rows: ["1, Dynamics", "128, Too big", "x, Bad", "5", 7, "9, Na\u00efve"] });
  assert.deepEqual(plain(result.config), defaults);
  assert.equal(result.errors.length, 5);
  assert.match(result.errors[0], /row 2 "128, Too big"/);
  assert.match(result.errors[1], /row 3/);
  assert.match(result.errors[2], /row 4/);
  assert.match(result.errors[3], /row 5/);
  assert.match(result.errors[4], /row 6.*ASCII/);
});

test("rejects more than 8 rows, extra characters and a bad export shape", () => {
  const rows = ["1,", "2,", "3,", "4,", "5,", "6,", "7,", "8,", "9,"];
  assert.match(config.parseMidiCcConfig({ rows }).errors[0], /at most 8/);
  assert.equal(config.parseMidiCcConfig({ rows: ["1.5, x"] }).errors.length, 1);
  assert.equal(config.parseMidiCcConfig({ rows: ["-1, x"] }).errors.length, 1);
  assert.equal(config.parseMidiCcConfig({}).errors.length, 1);
  assert.equal(config.parseMidiCcConfig(undefined).errors.length, 1);
});

test("loader never throws and logs fallbacks", () => {
  const log = [];
  const result = config.loadMidiCcConfig(() => { throw new TypeError("invalid module load callback return value"); }, (m) => log.push(m));
  assert.deepEqual(plain(result), defaults);
  assert.match(log[0], /^\[MIDI CC config\] midi-cc-config\.js: ERROR could not load/);
  assert.match(log[1], /Using built-in MIDI CC defaults\./);

  log.length = 0;
  config.loadMidiCcConfig(() => ({ rows: ["200,"] }), (m) => log.push(m));
  assert.equal(log.length, 2);
  assert.match(log[1], /Using built-in MIDI CC defaults\./);

  log.length = 0;
  config.loadMidiCcConfig(() => ({ rows: ["64, Sustain"] }), (m) => log.push(m));
  assert.equal(log.length, 1);
  assert.match(log[0], /loaded CC64 Sustain, CC11 Expression/);
});

test("encoder steps one CC per detent and clamps", () => {
  assert.equal(config.stepCcNumber(10, 0.0078), 11);
  assert.equal(config.stepCcNumber(10, -0.05), 9);
  assert.equal(config.stepCcNumber(127, 0.01), 127);
  assert.equal(config.stepCcNumber(0, -0.01), 0);
  assert.equal(config.stepCcNumber(5, 0), 5);
  assert.equal(config.stepCcNumber(5, NaN), 5);
});

test("display title uses configured name only for the configured CC", () => {
  const channel = { cc: 1, title: "Dyn" };
  assert.equal(config.getDisplayTitle(channel, 1), "Dyn");
  assert.equal(config.getDisplayTitle(channel, 11), "Expression");
});
