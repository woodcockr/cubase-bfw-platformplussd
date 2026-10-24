const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const moduleCache = new Map();
let currentTime = 0;
const logMessages = [];

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
    performance: { now: () => currentTime },
    Date: { now: () => currentTime },
    console: { log(message) { logMessages.push(message); } },
  }, { filename: resolved });
  return exportsObject;
}

const { JogController, createJogState, decodeJogValue, shuttleParameterTags, shuttleSelectorTags, shuttleStopIndex } = loadTypeScript(
  path.join(__dirname, "../src/midi/JogController.ts")
);

function fixture() {
  const state = createJogState();
  const positions = [];
  const shuttleWrites = [];
  const controller = new JogController({
    setPosition(value) { positions.push(value); },
    setShuttle(tag, value) { shuttleWrites.push({ tag, value }); },
  }, state);
  return { state, positions, shuttleWrites, controller };
}

test("MCU signed-bit decoding preserves direction and magnitude", () => {
  for (let magnitude = 1; magnitude <= 63; magnitude++) {
    assert.equal(decodeJogValue(magnitude / 127), magnitude);
    assert.equal(decodeJogValue((64 + magnitude) / 127), -magnitude);
  }
  for (const value of [0, 64 / 127, NaN, Infinity, -1, 2]) {
    assert.equal(decodeJogValue(value), 0);
  }
});

test("startup and Nudge do not write transport parameters", () => {
  const { controller, positions, shuttleWrites } = fixture();
  controller.turn(1, 0);
  controller.idle(1000);
  controller.release();
  assert.equal(positions.length, 0);
  assert.equal(shuttleWrites.length, 0);
});

test("Scrub preserves repeated identical ticks and reverses precisely", () => {
  const { controller, state, positions } = fixture();
  state.mode = "scrub";
  controller.turnRelative(0.51, 0.01, 0, () => {});
  controller.turnRelative(0.52, 0.01, 10, () => {});
  controller.turnRelative(0.51, -0.01, 20, () => {});
  assert.equal(positions.length, 3);
  assert.ok(positions[1] > positions[0]);
  assert.ok(Math.abs(positions[2] - positions[0]) < 1e-12);
});

test("reference relative Scrub recenters only its local input at both edges", () => {
  const { controller, state, positions } = fixture();
  state.mode = "scrub";
  const localResets = [];
  assert.equal(controller.turnRelative(0.095, -0.005, 0, value => localResets.push(value)), true);
  assert.deepEqual(localResets, [0.9]);
  assert.equal(positions.length, 0);
  assert.equal(controller.turnRelative(0.905, 0.005, 10, value => localResets.push(value)), true);
  assert.deepEqual(localResets, [0.9, 0.1]);
  assert.equal(positions.length, 0);
});

test("reference relative Scrub writes in-range encoder values without the unit-step cap", () => {
  const { controller, state, positions } = fixture();
  state.mode = "scrub";
  controller.turnRelative(0.25, 0.25, 0, () => assert.fail("unexpected local rebase"));
  controller.turnRelative(0.81, 0.56, 10, () => assert.fail("unexpected local rebase"));
  assert.deepEqual(positions, [0.25, 0.81]);
});

test("relative Scrub path is inactive outside Scrub and during recording", () => {
  const { controller, state, positions } = fixture();
  const localResets = [];
  assert.equal(controller.turnRelative(0.3, 0.1, 0, value => localResets.push(value)), false);
  state.mode = "scrub";
  state.recording = true;
  assert.equal(controller.turnRelative(0.3, 0.1, 10, value => localResets.push(value)), false);
  assert.equal(positions.length, 0);
  assert.deepEqual(localResets, []);
});

test("invalid and zero movement cannot take ownership of playback", () => {
  const { controller, state, positions, shuttleWrites } = fixture();
  state.mode = "scrub";
  for (const delta of [0, NaN, Infinity]) controller.turnRelative(0.6, delta, 0, () => {});
  assert.equal(positions.length, 0);
  assert.equal(shuttleWrites.length, 0);
});

test("Shuttle starts centered at Stop and advances one absolute slot regardless of tick magnitude", () => {
  const { controller, state, shuttleWrites } = fixture();
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex);
  state.mode = "shuttle";
  controller.turn(7, 0);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex + 1);
  controller.idle(10);
  assert.deepEqual(shuttleWrites, []);
  controller.idle(20);
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }]);
  assert.equal(state.shuttleActiveTag, 2010);
});

test("clockwise steps progress through forward speeds and release before each new speed", () => {
  const { controller, state, shuttleWrites } = fixture();
  state.mode = "shuttle";
  for (let index = 8; index <= 14; index++) {
    controller.turn(index === 8 ? 63 : 1, index * 10);
    assert.equal(state.shuttlePositionIndex, index);
    controller.idle(index * 10 + 1);
    controller.idle(index * 10 + 2);
    assert.equal(state.shuttleActiveTag, shuttleSelectorTags[index]);
  }
  assert.deepEqual(shuttleWrites.filter(write => write.value === 1).map(write => write.tag),
    Array.from(shuttleSelectorTags).slice(8));
  assert.deepEqual(shuttleWrites.filter(write => write.value === 0).map(write => write.tag),
    Array.from(shuttleSelectorTags).slice(8, 14));
});

test("counterclockwise steps pass through Stop before selecting reverse speeds", () => {
  const { controller, state, shuttleWrites } = fixture();
  state.mode = "shuttle";
  controller.turn(63, 0);
  controller.idle(1);
  controller.idle(2);
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }]);

  controller.turn(-63, 3);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex);
  assert.deepEqual(shuttleWrites[1], { tag: 2010, value: 0 });
  controller.idle(4);
  assert.equal(shuttleWrites.length, 2);

  controller.turn(-1, 5);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex - 1);
  controller.idle(6);
  controller.idle(7);
  assert.deepEqual(shuttleWrites[2], { tag: 2013, value: 1 });
});

test("Shuttle speed remains latched through inactivity and releases on mode exit", () => {
  const { controller, state, shuttleWrites } = fixture();
  state.mode = "shuttle";
  controller.turn(1, 0);
  controller.idle(1);
  controller.idle(2);
  controller.idle(10000);
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }]);
  assert.equal(state.moving, true);

  controller.release();
  state.mode = "scrub";
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex);
  assert.equal(state.shuttleActiveTag, -1);
  assert.equal(state.moving, false);
});

test("selecting Stop cancels a queued speed and releases an active speed", () => {
  const { controller, state, shuttleWrites } = fixture();
  state.mode = "shuttle";
  controller.turn(1, 0);
  controller.idle(1);
  controller.idle(2);
  controller.turn(-1, 3);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex);
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  controller.idle(4);
  controller.idle(5);
  assert.equal(shuttleWrites.length, 2);
});

test("Shuttle clamps at selector ends and ignores wheel magnitude beyond direction", () => {
  const { controller, state } = fixture();
  state.mode = "shuttle";
  for (let index = 0; index < 20; index++) controller.turn(-63, index);
  assert.equal(state.shuttlePositionIndex, 0);
  for (let index = 0; index < 3; index++) controller.turn(7, index + 30);
  assert.equal(state.shuttlePositionIndex, 3);
});

test("recording and transport takeover clear only the owned Shuttle speed", () => {
  const { controller, state, shuttleWrites } = fixture();
  state.mode = "shuttle";
  controller.turn(1, 0);
  controller.idle(1);
  controller.idle(2);
  state.recording = true;
  controller.release();
  controller.turn(7, 3);
  assert.deepEqual(shuttleWrites, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  assert.equal(state.shuttlePositionIndex, shuttleStopIndex);
});

const { setupJogBindings } = loadTypeScript(path.join(__dirname, "../src/midi/jog.ts"));
const { jogOptions } = loadTypeScript(path.join(__dirname, "../src/config.ts"));
const { makeCallbackCollection } = loadTypeScript(path.join(__dirname, "../src/util.ts"));
const { decorateSurface } = loadTypeScript(path.join(__dirname, "../src/decorators/surface.ts"));

function adapterFixture(tags = [4041, 4044].concat(shuttleParameterTags), initialPosition = 0.5) {
  const stored = new Map();
  const context = {
    getState: key => stored.get(key) || "",
    setState: (key, value) => stored.set(key, value),
  };
  const mapping = {};
  const events = [];
  const writes = [];
  const variables = new Map();
  const valueBindings = [];
  const midiBindingTypes = [];
  const directAccess = {
    activate: () => events.push("activate"),
    deactivate: () => events.push("deactivate"),
    getBaseObjectID: () => 42,
    getNumberOfParameters: () => tags.length,
    getParameterTagByIndex: (_mapping, _objectID, index) => tags[index],
    getParameterTitle: (_mapping, _objectID, tag) => tag === 4044 ? "Jog" : "Jog Active",
    getParameterProcessValue: (_mapping, _objectID, tag) => tag === 4044 ? initialPosition : 0,
    getParameterDefaultProcessValue: (_mapping, _objectID, tag) => tag === 4044 ? 0.5 : 0,
    getParameterDisplayValue: (_mapping, _objectID, tag) => tag === 4044 ? "0.5" : "Off",
    setParameterProcessValue(activeMapping, objectID, tag, value) {
      assert.equal(activeMapping, mapping);
      assert.equal(objectID, 42);
      writes.push({ tag, value });
      if (tag === 4041 && value === 0) events.push("jogOff");
    },
  };
  const surface = {
    makePushEncoder: () => ({ mEncoderValue: surface.makeCustomValueVariable("jogEncoderValue") }),
    makeCustomValueVariable(name) {
      const midiBinding = {
        setInputPort() { return this; },
        bindToControlChange() { return this; },
        bindToNote() { return this; },
        setTypeAbsolute() { midiBindingTypes.push("absolute"); return this; },
        setTypeRelativeSignedBit() { midiBindingTypes.push("relativeSignedBit"); return this; },
      };
      let processValue = 0;
      const variable = {
        mMidiBinding: midiBinding,
        writes: [],
        setProcessValue(_context, value) {
          processValue = value;
          this.writes.push(value);
          if (this.command && value === 1) events.push(this.command);
        },
        getProcessValue() { return processValue; },
      };
      variables.set(name, variable);
      return variable;
    },
  };
  const page = {
    mHostAccess: {
      mTransport: { mValue: { mRecord: {} } },
      makeDirectAccess: () => directAccess,
    },
    mCustom: { makeHostValueVariable: name => ({ name }) },
    makeCommandBinding(variable, _category, command) { variable.command = command; },
    makeValueBinding(variable, hostValue) {
      const binding = { variable, hostValue };
      binding.setSubPage = () => binding;
      valueBindings.push(binding);
      return binding;
    },
  };
  const buttons = {};
  for (const name of ["start", "stop", "forward", "rewind", "record",
    "zoomVertIn", "zoomVertOut", "zoomHorizIn", "zoomHorizOut", "zoomOnOff"]) {
    buttons[name] = {
      onSurfaceValueChange: makeCallbackCollection({}, "change"),
      onHardwareValueChange: undefined,
    };
  }
  const device = {
    transport: { jog_wheel: decorateSurface(surface).makeJogWheel(), buttons },
    lcdManager: { setIndicator2Text: (_context, value) => events.push(value) },
  };
  function makeSubPage() {
    const subPage = { mAction: { mActivate: { trigger() {
      subPage.mOnActivate(context, mapping);
    } } } };
    return subPage;
  }
  const nudge = makeSubPage();
  const scrub = makeSubPage();
  const shuttle = makeSubPage();
  const lifecycle = setupJogBindings(page, surface, device, nudge, scrub, shuttle);
  return {
    context, mapping, events, writes, variables, valueBindings, midiBindingTypes, device, directAccess, nudge, scrub, shuttle, lifecycle,
    activate() { lifecycle.activate(context, mapping); },
    recording(value) {
      const binding = valueBindings.find(item => item.variable === variables.get("jogRecordMonitor"));
      binding.mOnValueChange(context, mapping, value);
    },
    relativeScrub(value, difference) {
      const binding = valueBindings.find(item => item.variable === device.transport.jog_wheel.mEncoderValue);
      binding.mOnValueChange(context, mapping, value, difference);
    },
    rawMidi(value) {
      const variable = variables.get("jogWheelProxy");
      variable.mOnProcessValueChange(context, value / 127, 0);
    },
    selectScrub() { scrub.mAction.mActivate.trigger(mapping); },
    selectShuttle() { shuttle.mAction.mActivate.trigger(mapping); },
    turn(delta, now = 0) {
      currentTime = now;
      return device.transport.jog_wheel.mOnTurn(context, delta);
    },
    idle(now) { currentTime = now; lifecycle.idle(context, mapping); },
    press(name) { buttons[name].onHardwareValueChange(context, 1); },
    surfaceButtonValue(name, value) { buttons[name].onSurfaceValueChange(context, value); },
    deactivate() { lifecycle.deactivate(context, mapping); },
  };
}

test("adapter starts in Nudge and waits for recording feedback before accepting input", () => {
  const remote = adapterFixture();
  remote.activate();
  assert.deepEqual(remote.events, ["activate", "N"]);
  assert.equal(remote.turn(1), true);
  remote.recording(0);
  assert.equal(remote.turn(1), false);
  assert.equal(remote.writes.length, 0);
  assert.equal(remote.events.includes("Stop"), false);
});

test("same transport object notifications preserve relative Scrub availability", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.55, 0.05);
  remote.directAccess.mOnObjectChange(remote.context, remote.mapping, 42);
  remote.idle(200);
  assert.deepEqual(remote.writes, [{ tag: 4044, value: 0.55 }]);
});

test("relative Scrub writes forward samples from the encoder binding", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  for (let index = 1; index <= 10; index++) {
    remote.relativeScrub(0.5 + index * 0.01, 0.01);
  }
  let previous = 0.5;
  for (const write of remote.writes) {
    if (write.tag === 4044) {
      assert.ok(write.value > previous, "forward spin sent a reverse delta");
      previous = write.value;
    }
  }
});

test("relative Scrub writes reverse samples from the encoder binding", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  for (let index = 1; index <= 10; index++) {
    remote.relativeScrub(0.5 - index * 0.01, -0.01);
  }
  let previous = 0.5;
  for (const write of remote.writes) {
    if (write.tag === 4044) {
      assert.ok(write.value < previous, "reverse spin sent a forward delta");
      previous = write.value;
    }
  }
});

test("relative Scrub inactivity does not add host parameter writes", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.51, 0.01);
  remote.idle(200);
  assert.equal(remote.events.includes("Stop"), false);
  assert.deepEqual(remote.writes, [{ tag: 4044, value: 0.51 }]);
});

test("relative Scrub recenters at the upper edge without writing a reset", () => {
  const remote = adapterFixture([4041, 4044], 0.9);
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.905, 0.005);
  assert.equal(remote.writes.length, 0);
  remote.relativeScrub(0.895, -0.005);
  assert.equal(remote.writes.length, 1);
  assert.equal(remote.writes[0].tag, 4044);
  assert.ok(remote.writes[0].value < 0.9 && remote.writes[0].value > 0.89);
});

test("startup movement uses the observed host baseline rather than a guessed midpoint", () => {
  const remote = adapterFixture([4041, 4044], 0.7);
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.705, 0.005);
  assert.equal(remote.writes.length, 1);
  assert.ok(remote.writes[0].value > 0.7 && remote.writes[0].value < 0.71);
});

test("default diagnostics stay quiet when idle and emit one summary after a gesture", () => {
  const previousDiagnostics = jogOptions.diagnostics;
  const previousTrace = jogOptions.traceValues;
  jogOptions.diagnostics = true;
  jogOptions.traceValues = false;
  try {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    let scans = 0;
    remote.directAccess.getNumberOfParameters = () => { scans++; return 2; };
    const initialLogCount = logMessages.length;
    for (let index = 0; index < 100; index++) {
      remote.directAccess.mOnObjectChange(remote.context, remote.mapping, 42);
      remote.idle(index);
    }
    assert.equal(scans, 0);
    assert.equal(logMessages.length, initialLogCount);
    for (let index = 1; index <= 3; index++) {
      remote.relativeScrub(0.5 + index * 0.01, 0.01);
    }
    assert.equal(logMessages.length, initialLogCount);
    remote.idle(1000);
    remote.idle(2000);
    assert.equal(logMessages.length, initialLogCount + 1);
    assert.match(logMessages[logMessages.length - 1], /Jog ended: ticks=3 fwd=3 rev=0 peak=0\.01 rebases=0/);
  } finally {
    jogOptions.diagnostics = previousDiagnostics;
    jogOptions.traceValues = previousTrace;
  }
});

test("gesture diagnostics preserve signed packet counts without printing every tick", () => {
  const previousDiagnostics = jogOptions.diagnostics;
  jogOptions.diagnostics = true;
  try {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    currentTime = 0;
    remote.relativeScrub(0.55, 0.05);
    remote.relativeScrub(0.6, 0.05);
    remote.relativeScrub(0.55, -0.05);
    remote.idle(220);
    assert.match(logMessages[logMessages.length - 1], /ticks=3 fwd=2 rev=1 peak=0\.05/);
  } finally {
    jogOptions.diagnostics = previousDiagnostics;
  }
});

test("relative Scrub summary reports each local encoder rebase", () => {
  const previousDiagnostics = jogOptions.diagnostics;
  jogOptions.diagnostics = true;
  try {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    currentTime = 0;
    const initialLogCount = logMessages.length;
    remote.relativeScrub(0.095, -0.005);
    remote.relativeScrub(0.11, 0.015);
    remote.idle(200);
    const summary = logMessages.slice(initialLogCount).find(message => message.indexOf("Jog ended:") === 0);
    assert.match(summary, /Jog ended: ticks=2/);
    assert.match(summary, /rebases=1/);
  } finally {
    jogOptions.diagnostics = previousDiagnostics;
  }
});

test("Scrub fails closed without the jog-active tag needed for native release", () => {
  const remote = adapterFixture([4044]);
  remote.activate();
  remote.recording(0);
  assert.equal(remote.turn(1), false);
  remote.selectScrub();
  remote.turn(7);
  remote.idle(1000);
  assert.equal(remote.writes.length, 0);
  assert.equal(remote.events.includes("Stop"), false);
});

test("adapter writes only the discovered relative Scrub tag without jogActive cleanup", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.51, 0.01);
  remote.relativeScrub(0.52, 0.01);
  assert.equal(remote.writes.length, 2);
  assert.ok(remote.writes.every(write => write.tag === 4044));
  remote.idle(209);
  assert.equal(remote.events.includes("Stop"), false);
  remote.idle(210);
  remote.idle(1000);
  assert.equal(remote.events.filter(event => event === "jogOff").length, 0);
  assert.ok(remote.writes.every(write => write.tag === 4044));
});

test("missing Scrub tag disables Direct Access writes but preserves Nudge", () => {
  const remote = adapterFixture([4041]);
  remote.activate();
  remote.recording(0);
  assert.equal(remote.turn(1), false);
  remote.selectScrub();
  assert.equal(remote.turn(1), true);
  remote.idle(1000);
  assert.equal(remote.writes.length, 0);
  assert.equal(remote.events.includes("Stop"), false);
});

test("recording feedback protects both Nudge and Scrub including startup while recording", () => {
  const remote = adapterFixture();
  remote.recording(1);
  remote.activate();
  assert.equal(remote.turn(1), true);
  remote.selectScrub();
  remote.turn(1);
  remote.idle(1000);
  assert.equal(remote.writes.length, 0);
  assert.equal(remote.events.includes("Stop"), false);
});

test("recording started during Scrub cancels its timeout without stopping recording", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.51, 0.01);
  remote.recording(1);
  remote.relativeScrub(0.52, 0.01);
  remote.idle(1000);
  remote.deactivate();
  assert.equal(remote.writes.length, 1);
  assert.equal(remote.events.includes("Stop"), false);
});

test("Zoom takeover and mode changes leave relative Scrub jogActive untouched", () => {
  for (const takeover of [remote => remote.press("zoomVertIn"),
    remote => remote.nudge.mAction.mActivate.trigger(remote.mapping)]) {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    remote.relativeScrub(0.51, 0.01);
    takeover(remote);
    remote.idle(1000);
    assert.equal(remote.events.filter(event => event === "jogOff").length, 0);
    assert.ok(remote.writes.every(write => write.tag === 4044));
    assert.equal(remote.events.includes("Stop"), false);
  }
});

test("explicit transport takeover cancels the old scrub timeout", () => {
  for (const button of ["start", "stop", "forward", "rewind", "record"]) {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    remote.relativeScrub(0.51, 0.01);
    remote.press(button);
    remote.idle(1000);
    assert.equal(remote.events.includes("Stop"), false);
  }
});

test("page deactivation leaves relative Scrub jogActive untouched before Direct Access release", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.51, 0.01);
  remote.deactivate();
  assert.deepEqual(remote.events.slice(-1), ["deactivate"]);
  assert.ok(remote.writes.every(write => write.tag === 4044));
  assert.equal(remote.turn(1), true);
});

test("reactivation waits for fresh recording feedback", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.deactivate();
  remote.activate();
  assert.equal(remote.turn(1), true);
  remote.recording(1);
  assert.equal(remote.turn(1), true);
  assert.equal(remote.writes.length, 0);
});

test("runtime transport removal cancels pending work without stopping a replacement project", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.51, 0.01);
  remote.directAccess.mOnObjectWillBeRemoved(remote.context, remote.mapping, 42);
  remote.relativeScrub(0.52, 0.01);
  remote.idle(1000);
  assert.equal(remote.writes.length, 1);
  assert.equal(remote.events.includes("Stop"), false);
});

test("raw signed-bit CC60 routes Nudge and Shuttle while Scrub keeps its ValueBinding", () => {
  const remote = adapterFixture();
  const wheel = remote.device.transport.jog_wheel;
  wheel.bindToControlChange({}, 60);
  const raw = remote.variables.get("jogWheelProxy");
  remote.activate();
  remote.recording(0);
  for (const value of [1, 1, 65, 0, 64]) {
    raw.mOnProcessValueChange(remote.context, value / 127, 0);
  }
  assert.deepEqual(remote.variables.get("jogWheelJogRight").writes, [1, 1]);
  assert.deepEqual(remote.variables.get("jogWheelJogLeft").writes, [1]);
  remote.selectScrub();
  remote.rawMidi(7);
  remote.relativeScrub(0.57, 0.07);
  assert.equal(remote.writes.length, 1);
  assert.equal(remote.variables.get("jogWheelJogRight").writes.length, 2);
});

test("Scrub always binds CC60 signed-bit to the actual encoder value", () => {
  const remote = adapterFixture();
  remote.device.transport.jog_wheel.bindToControlChange({}, 60);
  assert.equal(remote.device.transport.jog_wheel.mRelativeScrubEnabled, true);
  assert.deepEqual(remote.midiBindingTypes, ["relativeSignedBit", "absolute"]);
  const binding = remote.valueBindings.find(item => item.variable === remote.device.transport.jog_wheel.mEncoderValue);
  assert.ok(binding, "relative Scrub ValueBinding should use the actual encoder value");
});

test("relative Scrub recenters only its surface value and writes samples to Direct Access", () => {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    const wheel = remote.device.transport.jog_wheel;
    wheel.bindToControlChange({}, 60);
    const relative = remote.variables.get("jogEncoderValue");

    assert.equal(remote.turn(7), true);
    assert.equal(remote.writes.length, 0, "absolute decoder must not write Scrub position in relative mode");

    remote.relativeScrub(0.095, -0.005);
    assert.deepEqual(relative.writes, [0.9]);
    assert.equal(remote.writes.length, 0);

    remote.relativeScrub(0.11, 0.01);
    assert.deepEqual(remote.writes, [{ tag: 4044, value: 0.11 }]);
    remote.relativeScrub(0.905, 0.005);
    assert.deepEqual(relative.writes, [0.9, 0.1]);
    assert.deepEqual(remote.writes, [{ tag: 4044, value: 0.11 }]);

    remote.relativeScrub(0.12, 0.02);
    assert.deepEqual(remote.writes[1], { tag: 4044, value: 0.12 });
    assert.ok(remote.writes.every(write => write.tag === 4044 && write.value >= 0.1 && write.value <= 0.9));
});

test("reference relative Scrub never writes jogActive and lets Cubase release it", () => {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectScrub();
    remote.relativeScrub(0.6, 0.1);
    remote.idle(200);
    remote.nudge.mAction.mActivate.trigger(remote.mapping);
    assert.ok(remote.writes.length > 0);
    assert.ok(remote.writes.every(write => write.tag === 4044));
    assert.equal(remote.writes.some(write => write.tag === 4041), false);
});

test("single relative encoder binding dispatches Nudge and Shuttle while Scrub uses its ValueBinding", () => {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    const wheel = remote.device.transport.jog_wheel;
    wheel.bindToControlChange({}, 60);
    assert.deepEqual(remote.midiBindingTypes, ["relativeSignedBit", "absolute"]);
    const encoder = wheel.mEncoderValue;

    remote.rawMidi(2);
    assert.deepEqual(remote.variables.get("jogWheelJogRight").writes, [2]);
    assert.deepEqual(remote.writes, []);

    remote.selectShuttle();
    remote.rawMidi(4);
    remote.idle(10);
    remote.idle(20);
    assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);
    assert.equal(remote.variables.get("jogWheelJogLeft").writes.length, 0);

    remote.selectScrub();
    assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
    remote.rawMidi(65);
    assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
    remote.relativeScrub(0.51, 1 / 127);
    assert.deepEqual(remote.writes[2], { tag: 4044, value: 0.51 });
});

test("Shuttle starts at Stop, latches its first speed, and resets on mode exit", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectShuttle();
  assert.equal(remote.events[remote.events.length - 1], "H");
  remote.turn(7, 0);
  remote.idle(10);
  assert.equal(remote.writes.length, 0);
  remote.idle(20);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);
  remote.idle(200);
  remote.idle(300);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);
  remote.selectScrub();
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  assert.equal(remote.events.includes("Stop"), false);
});

test("host transport button feedback does not release a latched Shuttle speed", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectShuttle();
  remote.turn(1, 0);
  remote.idle(10);
  remote.idle(20);

  remote.surfaceButtonValue("stop", 1);
  remote.surfaceButtonValue("forward", 1);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);

  remote.press("stop");
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
});

test("Shuttle decrements through Stop before starting reverse speed", () => {
  const remote = adapterFixture();
  remote.activate();
  remote.recording(0);
  remote.selectShuttle();
  remote.turn(7, 0);
  remote.idle(10);
  remote.idle(20);
  remote.turn(-7, 30);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  remote.idle(40);
  assert.equal(remote.writes.length, 2);
  remote.turn(-1, 45);
  remote.idle(46);
  remote.idle(50);
  assert.deepEqual(remote.writes[2], { tag: 2013, value: 1 });
  assert.ok(remote.writes.every(write => write.tag !== 4041 && write.tag !== 4044));
});

test("all transport, Zoom, and mode takeovers cancel pending or active Shuttle", () => {
  const takeovers = ["start", "stop", "forward", "rewind", "record", "zoomVertIn",
    "zoomVertOut", "zoomHorizIn", "zoomHorizOut", "zoomOnOff", "nudgeMode", "scrubMode"];
  for (const activate of [false, true]) {
    for (const takeover of takeovers) {
      const remote = adapterFixture();
      remote.activate();
      remote.recording(0);
      remote.selectShuttle();
      remote.turn(7, 0);
      if (activate) {
        remote.idle(10);
        remote.idle(20);
      }
      if (takeover === "nudgeMode") remote.nudge.mAction.mActivate.trigger(remote.mapping);
      else if (takeover === "scrubMode") remote.selectScrub();
      else remote.press(takeover);
      remote.idle(30);
      remote.idle(40);
      remote.idle(300);
      assert.deepEqual(remote.writes, activate ? [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }] : []);
      assert.equal(remote.events.includes("Stop"), false);
    }
  }
});

test("recording feedback blocks new Shuttle starts and releases an already held speed", () => {
  for (const activate of [false, true]) {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectShuttle();
    remote.turn(7, 0);
    if (activate) {
      remote.idle(10);
      remote.idle(20);
    }
    remote.recording(1);
    remote.turn(7, 30);
    remote.idle(40);
    remote.idle(50);
    remote.deactivate();
    assert.deepEqual(remote.writes, activate ? [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }] : []);
    assert.equal(remote.events.includes("Stop"), false);
  }
});

test("any missing Shuttle speed tag disables Shuttle without affecting Scrub", () => {
  for (const missingTag of shuttleParameterTags) {
    const tags = [4041, 4044].concat(shuttleParameterTags).filter(tag => tag !== missingTag);
    const remote = adapterFixture(tags);
    remote.activate();
    remote.recording(0);
    remote.selectShuttle();
    remote.turn(7, 0);
    remote.idle(10);
    remote.idle(20);
    assert.equal(remote.writes.length, 0);
    remote.selectScrub();
    remote.relativeScrub(0.51, 0.01);
    assert.equal(remote.writes.length, 1);
    assert.equal(remote.writes[0].tag, 4044);
  }
});

test("Shuttle availability is independent of Scrub parameters", () => {
  const remote = adapterFixture(shuttleParameterTags);
  remote.activate();
  remote.recording(0);
  remote.selectShuttle();
  remote.turn(1, 0);
  remote.idle(10);
  remote.idle(20);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);
});

test("Scrub boundary does not block Shuttle and Shuttle does not reset the Scrub baseline", () => {
  const remote = adapterFixture([4041, 4044].concat(shuttleParameterTags), 0.9);
  remote.activate();
  remote.recording(0);
  remote.selectScrub();
  remote.relativeScrub(0.905, 0.005);
  assert.equal(remote.writes.length, 0);
  remote.selectShuttle();
  remote.turn(7, 10);
  remote.idle(20);
  remote.idle(30);
  remote.selectScrub();
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }]);
  remote.relativeScrub(0.895, -0.005);
  assert.equal(remote.writes[2].tag, 4044);
  assert.ok(remote.writes[2].value < 0.9 && remote.writes[2].value > 0.89);
});

test("Shuttle deactivation clears held speed and cannot leave a delayed start", () => {
  for (const activate of [false, true]) {
    const remote = adapterFixture();
    remote.activate();
    remote.recording(0);
    remote.selectShuttle();
    remote.turn(7, 0);
    if (activate) {
      remote.idle(10);
      remote.idle(20);
    }
    remote.deactivate();
    remote.idle(30);
    remote.idle(40);
    assert.deepEqual(remote.writes, activate ? [{ tag: 2010, value: 1 }, { tag: 2010, value: 0 }] : []);
    assert.equal(remote.events[remote.events.length - 1], "deactivate");
  }
});

test("transport invalidation cancels Shuttle without writing to a replacement project", () => {
  for (const activate of [false, true]) {
    for (const replace of [false, true]) {
      const remote = adapterFixture();
      remote.activate();
      remote.recording(0);
      remote.selectShuttle();
      remote.turn(7, 0);
      if (activate) {
        remote.idle(10);
        remote.idle(20);
      }
      if (replace) {
        remote.directAccess.getBaseObjectID = () => 43;
        remote.directAccess.mOnObjectChange(remote.context, remote.mapping, 43);
      } else {
        remote.directAccess.mOnObjectWillBeRemoved(remote.context, remote.mapping, 42);
      }
      remote.idle(30);
      remote.idle(40);
      remote.idle(300);
      assert.deepEqual(remote.writes, activate ? [{ tag: 2010, value: 1 }] : []);
    }
  }
});

test("startup while recording cannot queue or start Shuttle", () => {
  const remote = adapterFixture();
  remote.recording(1);
  remote.activate();
  remote.selectShuttle();
  remote.turn(7, 0);
  remote.idle(10);
  remote.idle(20);
  assert.equal(remote.writes.length, 0);
});

test("raw MCU packets drive Shuttle without triggering Nudge or Scrub values", () => {
  const remote = adapterFixture();
  const wheel = remote.device.transport.jog_wheel;
  wheel.bindToControlChange({}, 60);
  const encoder = wheel.mEncoderValue;
  remote.activate();
  remote.recording(0);
  remote.selectShuttle();
  currentTime = 0;
  remote.rawMidi(1);
  remote.idle(10);
  remote.idle(20);
  assert.deepEqual(remote.writes, [{ tag: 2010, value: 1 }]);
  assert.equal(remote.variables.get("jogWheelJogRight").writes.length, 0);
  assert.equal(remote.variables.get("jogWheelJogLeft").writes.length, 0);
  assert.equal(remote.events.includes("Stop"), false);
});