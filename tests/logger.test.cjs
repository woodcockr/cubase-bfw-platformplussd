const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadLogger(debugLogs) {
  const messages = [];
  const compiled = ts.transpileModule(readFileSync(path.join(__dirname, "../src/logger.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
  });
  const exportsObject = {};
  runInNewContext(compiled.outputText, {
    exports: exportsObject,
    console: { log(message) { messages.push(message); } },
    __BFW_DEBUG_LOGS__: debugLogs,
  });
  return { logger: exportsObject, messages };
}

test("release build suppresses debug logs but keeps info, warnings and errors", () => {
  const { logger, messages } = loadLogger(false);
  assert.equal(logger.debugLogsEnabled, false);
  logger.logDebug("trace");
  logger.logInfo("ready");
  logger.logWarning("careful");
  logger.logError("broken");
  assert.deepEqual(messages, ["ready", "Warning: careful", "Error: broken"]);
});

test("development build prints debug logs", () => {
  const { logger, messages } = loadLogger(true);
  assert.equal(logger.debugLogsEnabled, true);
  logger.logDebug("trace");
  assert.deepEqual(messages, ["trace"]);
});
