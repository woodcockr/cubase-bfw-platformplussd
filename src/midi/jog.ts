import type { IconPlatformMplus } from "../icon_elements";
import { jogOptions } from "../config";
import { ContextStateVariable } from "../util";
import { logInfo, logWarning } from "../logger";
import {
  createJogState,
  JogController,
  JogState,
  jogParameterTags,
  shuttleParameterTags,
  shuttleSelectorTags,
} from "./JogController";

export function setupJogBindings(
  page: MR_FactoryMappingPage,
  surface: MR_DeviceSurface,
  device: IconPlatformMplus,
  nudgePage: MR_SubPage,
  scrubPage: MR_SubPage,
  shuttlePage: MR_SubPage
) {
  const directAccess = page.mHostAccess.makeDirectAccess(page.mHostAccess.mTransport);
  const stateVariable = new ContextStateVariable(createJogState());
  const available = new ContextStateVariable(false);
  const shuttleAvailable = new ContextStateVariable(false);
  const recordingKnown = new ContextStateVariable(false);
  const waitingNoticeShown = new ContextStateVariable(false);
  const transportObjectID = new ContextStateVariable(-1);
  // Confirmed recording comes only from recordMonitor; this guards the gap
  // before that feedback arrives without latching if it never does.
  const recordPendingUntil = new ContextStateVariable(0);
  // Local encoder value we set ourselves; its callback echo must not scrub.
  const scrubInputEcho = new ContextStateVariable(-1);
  const activity = new ContextStateVariable({ ticks: 0, peakDelta: 0, forwardTicks: 0, reverseTicks: 0, rebases: 0 });
  const recordMonitor = surface.makeCustomValueVariable("jogRecordMonitor");
  let currentMapping: MR_ActiveMapping | undefined;
  device.transport.jog_wheel.mRelativeScrubEnabled = true;
  const relativeScrubHost = page.mCustom.makeHostValueVariable("jogRelativeScrubHost");
  page.makeValueBinding(device.transport.jog_wheel.mEncoderValue, relativeScrubHost)
    .setSubPage(scrubPage).mOnValueChange = (context, mapping, value, difference) => {
      const echo = scrubInputEcho.get(context);
      if (echo >= 0) {
        scrubInputEcho.set(context, -1);
        if (Math.abs(value - echo) < 1e-6) return;
      }
      if (wheelInputBlocked(context) || !available.get(context)) return;
      const objectID = directAccess.getBaseObjectID(mapping);
      if (objectID < 0 || objectID !== transportObjectID.get(context)) return;

      // At the start of a gesture, continue from Cubase's current Jog
      // position rather than the local encoder value, so the first write
      // cannot jump. Skipped near the edges, where the local rebase applies.
      let input = value;
      if (!stateVariable.get(context).moving && isFinite(difference)) {
        const host = directAccess.getParameterProcessValue(mapping, objectID, jogParameterTags.position);
        const target = host + difference;
        if (isFinite(host) && Math.abs(host - (value - difference)) > 1e-4
          && target >= 0.1 && target <= 0.9) {
          input = target;
          setScrubInput(context, target);
        }
      }

      const summary = activity.get(context);
      const values = summary.ticks > 0 ? summary : {
        ticks: 0,
        peakDelta: 0,
        forwardTicks: 0,
        reverseTicks: 0,
        rebases: 0,
      };
      values.ticks++;
      values.peakDelta = Math.max(values.peakDelta, Math.abs(difference));
      if (difference > 0) values.forwardTicks++;
      if (difference < 0) values.reverseTicks++;
      activity.set(context, values);

      withController(context, mapping, controller => controller.turnRelative(
        input,
        difference,
        Date.now(),
        resetValue => {
          const currentActivity = activity.get(context);
          currentActivity.rebases++;
          activity.set(context, currentActivity);
          setScrubInput(context, resetValue);
        }
      ));
    };

  function setScrubInput(context: MR_ActiveDevice, value: number) {
    scrubInputEcho.set(context, value);
    device.transport.jog_wheel.mEncoderValue.setProcessValue(context, value);
  }

  function wheelInputBlocked(context: MR_ActiveDevice) {
    return !recordingKnown.get(context) || stateVariable.get(context).recording
      || Date.now() < recordPendingUntil.get(context);
  }

  function guardUntilRecordFeedback(context: MR_ActiveDevice) {
    recordPendingUntil.set(context, Date.now() + jogOptions.recordPendingTimeoutMs);
  }

  function withController(
    context: MR_ActiveDevice,
    mapping: MR_ActiveMapping,
    callback: (controller: JogController, state: JogState) => void
  ) {
    const state = stateVariable.get(context);
    const wasMoving = state.moving;
    const previousMode = state.mode;
    const controller = new JogController({
      setPosition(value) {
        const objectID = directAccess.getBaseObjectID(mapping);
        directAccess.setParameterProcessValue(mapping, objectID, jogParameterTags.position, value);
      },
      setShuttle(tag, value) {
        const objectID = directAccess.getBaseObjectID(mapping);
        if (objectID >= 0 && objectID === transportObjectID.get(context)
          && shuttleAvailable.get(context) && shuttleParameterTags.indexOf(tag) >= 0) {
          if (jogOptions.diagnostics && jogOptions.traceValues) {
            logInfo("Shuttle write tag=" + tag + " value=" + value);
          }
          stateVariable.set(context, state);
          directAccess.setParameterProcessValue(mapping, objectID, tag, value);
        }
      },
    }, state, jogOptions);
    callback(controller, state);
    stateVariable.set(context, state);
    if (jogOptions.diagnostics && wasMoving && !state.moving) {
      const summary = activity.get(context);
      if (previousMode === "shuttle") {
        logInfo("Shuttle ended: ticks=" + summary.ticks + " fwd=" + summary.forwardTicks
          + " rev=" + summary.reverseTicks + " peak=" + summary.peakDelta);
      } else {
        logInfo("Jog ended: ticks=" + summary.ticks + " fwd=" + summary.forwardTicks
          + " rev=" + summary.reverseTicks + " peak=" + summary.peakDelta
          + " rebases=" + summary.rebases
          + " pos=" + state.position.toFixed(4));
      }
          activity.set(context, { ticks: 0, peakDelta: 0, forwardTicks: 0, reverseTicks: 0, rebases: 0 });
    }
  }

  function logShuttleRelease(state: JogState, reason: string) {
    if (jogOptions.diagnostics && jogOptions.traceValues && state.mode === "shuttle"
      && (state.shuttleActiveTag >= 0 || state.shuttlePendingTag >= 0)) {
      logInfo("Shuttle release reason=" + reason + " active=" + state.shuttleActiveTag
        + " pending=" + state.shuttlePendingTag);
    }
  }

  function releaseController(context: MR_ActiveDevice, mapping: MR_ActiveMapping, reason: string) {
    logShuttleRelease(stateVariable.get(context), reason);
    withController(context, mapping, controller => controller.release());
  }

  function probe(context: MR_ActiveDevice, mapping: MR_ActiveMapping) {
    const objectID = directAccess.getBaseObjectID(mapping);
    if (objectID === transportObjectID.get(context) && (available.get(context) || shuttleAvailable.get(context))) return;
    transportObjectID.set(context, objectID);
    let hasPosition = false;
    let hasActive = false;
    let shuttleTagCount = 0;
    if (objectID >= 0) {
      const count = directAccess.getNumberOfParameters(mapping, objectID);
      for (let index = 0; index < count; index++) {
        const tag = directAccess.getParameterTagByIndex(mapping, objectID, index);
        if (tag === jogParameterTags.position) hasPosition = true;
        if (tag === jogParameterTags.active) hasActive = true;
        if (shuttleParameterTags.indexOf(tag) >= 0) shuttleTagCount++;
        if (jogOptions.diagnostics && (tag === jogParameterTags.position || tag === jogParameterTags.active)) {
          logInfo("Jog parameter " + tag + ": " + directAccess.getParameterTitle(mapping, objectID, tag, 128)
            + ", process=" + directAccess.getParameterProcessValue(mapping, objectID, tag)
            + ", default=" + directAccess.getParameterDefaultProcessValue(mapping, objectID, tag)
            + ", display=" + directAccess.getParameterDisplayValue(mapping, objectID, tag));
        }
      }
    }
    const ready = hasPosition && hasActive;
    available.set(context, ready);
    shuttleAvailable.set(context, shuttleTagCount === shuttleParameterTags.length);
    if (ready) {
      const state = stateVariable.get(context);
      const position = directAccess.getParameterProcessValue(mapping, objectID, jogParameterTags.position);
      if (isFinite(position) && position >= 0 && position <= 1) state.position = position;
      stateVariable.set(context, state);
    }
    if (ready) logInfo("Direct Access Scrub ready (single CC60 relative binding)");
    else logWarning("Direct Access Scrub disabled: transport parameters 4041/4044 unavailable");
    if (shuttleAvailable.get(context)) logInfo("Direct Access Shuttle ready (latched selector; starts at Stop)");
    else logWarning("Direct Access Shuttle disabled: native speed parameters unavailable");
  }

  function selectMode(context: MR_ActiveDevice, mapping: MR_ActiveMapping, mode: JogState["mode"]) {
    releaseController(context, mapping, "mode change to " + mode);
    withController(context, mapping, (_controller, state) => {
      state.mode = mode;
    });
    if (jogOptions.diagnostics && jogOptions.traceValues) {
      logInfo("Jog mode selected=" + mode);
    }
    device.lcdManager.setIndicator2Text(context, mode === "nudge" ? "N" : mode === "scrub" ? "S" : "H");
  }

  nudgePage.mOnActivate = (context, mapping) => selectMode(context, mapping, "nudge");
  scrubPage.mOnActivate = (context, mapping) => selectMode(context, mapping, "scrub");
  shuttlePage.mOnActivate = (context, mapping) => selectMode(context, mapping, "shuttle");

  page.makeValueBinding(recordMonitor, page.mHostAccess.mTransport.mValue.mRecord).mOnValueChange =
    (context, mapping, value) => {
      recordingKnown.set(context, true);
      recordPendingUntil.set(context, 0);
      waitingNoticeShown.set(context, false);
      if (jogOptions.diagnostics) logInfo("Jog recording state=" + value);
      withController(context, mapping, (controller, state) => {
        state.recording = value > 0;
        if (state.recording) {
          logShuttleRelease(state, "recording");
          controller.release();
        }
      });
    };

  device.transport.jog_wheel.mOnInput = (_context, value, delta) => {
    if (jogOptions.diagnostics && jogOptions.traceValues) {
      logInfo("Jog CC60 raw=" + Math.round(value * 127) + " delta=" + delta);
    }
  };

  device.transport.jog_wheel.mOnTurn = (context, delta) => {
    if (jogOptions.diagnostics && jogOptions.traceValues) logInfo("Jog input delta=" + delta);
    if (!currentMapping) return true;
    if (!recordingKnown.get(context)) {
      if (!waitingNoticeShown.get(context)) {
        logInfo("Jog input blocked: waiting for Cubase recording-state feedback");
        waitingNoticeShown.set(context, true);
      }
      return true;
    }
    const mapping = currentMapping;
    const state = stateVariable.get(context);
    if (wheelInputBlocked(context)) return true;
    if (state.mode === "nudge") {
      if (jogOptions.diagnostics && jogOptions.traceValues) {
        logInfo("Nudge command direction=" + (delta > 0 ? "right" : "left")
          + " ticks=" + Math.abs(delta));
      }
      return false;
    }
    if (state.mode === "scrub") return true;
    const objectID = directAccess.getBaseObjectID(mapping);
    if (objectID < 0 || objectID !== transportObjectID.get(context)) return true;
    if (!shuttleAvailable.get(context)) return true;
    const summary = activity.get(context);
    const values = summary.ticks > 0 ? summary : {
      ticks: 0,
      peakDelta: 0,
      forwardTicks: 0,
      reverseTicks: 0,
      rebases: 0,
    };
    values.ticks++;
    values.peakDelta = Math.max(values.peakDelta, Math.abs(delta));
    if (delta > 0) values.forwardTicks++;
    if (delta < 0) values.reverseTicks++;
    activity.set(context, values);
    const previousSelectorIndex = state.shuttlePositionIndex;
    withController(context, mapping, controller => controller.turn(delta, Date.now()));
    const selectedIndex = stateVariable.get(context).shuttlePositionIndex;
    if (jogOptions.diagnostics && jogOptions.traceValues && selectedIndex !== previousSelectorIndex) {
      logInfo("Shuttle selector index=" + selectedIndex
        + " tag=" + shuttleSelectorTags[selectedIndex]);
    }
    return true;
  };

  for (const button of [
    device.transport.buttons.start,
    device.transport.buttons.stop,
    device.transport.buttons.forward,
    device.transport.buttons.rewind,
    device.transport.buttons.record,
  ]) {
    button.onHardwareValueChange = (context, value) => {
      if (value > 0 && currentMapping) {
        const buttonName = button === device.transport.buttons.start ? "start"
          : button === device.transport.buttons.stop ? "stop"
          : button === device.transport.buttons.forward ? "forward"
          : button === device.transport.buttons.rewind ? "rewind"
          : "record";
        if (button === device.transport.buttons.record) guardUntilRecordFeedback(context);
        withController(context, currentMapping, (controller, state) => {
          if (jogOptions.diagnostics && jogOptions.traceValues) {
            logInfo("Transport button input=" + buttonName + " value=" + value);
          }
          logShuttleRelease(state, "transport button " + buttonName);
          controller.release();
        });
      }
    };
  }

  for (const button of [
    device.transport.buttons.zoomVertIn,
    device.transport.buttons.zoomVertOut,
    device.transport.buttons.zoomHorizIn,
    device.transport.buttons.zoomHorizOut,
    device.transport.buttons.zoomOnOff,
  ]) {
    button.onHardwareValueChange = (context, value) => {
      if (value > 0 && currentMapping) {
        releaseController(context, currentMapping, "Zoom takeover");
      }
    };
  }

  directAccess.mOnParameterChange = (context, mapping, objectID, tag) => {
    if (jogOptions.diagnostics && jogOptions.traceValues
      && (tag === jogParameterTags.active || tag === jogParameterTags.position || shuttleParameterTags.indexOf(tag) >= 0)) {
      logInfo("Jog change " + tag + ": process=" + directAccess.getParameterProcessValue(mapping, objectID, tag)
        + ", display=" + directAccess.getParameterDisplayValue(mapping, objectID, tag));
    }
  };
  directAccess.mOnObjectChange = (context, mapping) => {
    if (directAccess.getBaseObjectID(mapping) === transportObjectID.get(context)) return;
    releaseController(context, mapping, "transport object change");
    // A replacement transport may belong to a project whose record state has
    // not been reported yet; feedback that already arrived stays authoritative.
    guardUntilRecordFeedback(context);
    probe(context, mapping);
  };
  directAccess.mOnObjectWillBeRemoved = (context, mapping, objectID) => {
    if (objectID === directAccess.getBaseObjectID(mapping)) {
      available.set(context, false);
      shuttleAvailable.set(context, false);
      transportObjectID.set(context, -1);
      releaseController(context, mapping, "transport object removal");
    }
  };

  return {
    activate(context: MR_ActiveDevice, mapping: MR_ActiveMapping) {
      currentMapping = mapping;
      waitingNoticeShown.set(context, false);
      const state = stateVariable.get(context);
      state.moving = false;
      stateVariable.set(context, state);
      directAccess.activate(mapping);
      probe(context, mapping);
      nudgePage.mAction.mActivate.trigger(mapping);
    },
    deactivate(context: MR_ActiveDevice, mapping: MR_ActiveMapping) {
      releaseController(context, mapping, "page deactivation");
      available.set(context, false);
      shuttleAvailable.set(context, false);
      transportObjectID.set(context, -1);
      recordingKnown.set(context, false);
      recordPendingUntil.set(context, 0);
      scrubInputEcho.set(context, -1);
      currentMapping = undefined;
      directAccess.deactivate(mapping);
    },
    idle(context: MR_ActiveDevice, mapping: MR_ActiveMapping) {
      const state = stateVariable.get(context);
      if (jogOptions.diagnostics && jogOptions.traceValues
        && state.mode === "shuttle" && state.shuttlePendingTag >= 0) {
        logInfo("Shuttle idle pending=" + state.shuttlePendingTag
          + " wait=" + state.shuttleWaitCycles);
      }
      withController(context, mapping, controller => controller.idle(Date.now()));
    },
  };
}