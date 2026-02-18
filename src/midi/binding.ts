import { TouchSensitiveFader } from "../decorators/surface";
import { IconPlatformMplus } from "../icon_elements";
import {
  BooleanContextStateVariable,
  ContextStateVariable,
  TimerUtils,
} from "../util";
import { PortPair } from "./PortPair";
import { ActivationCallbacks } from "./connection";

/** Declares some global context-dependent variables that (may) affect multiple devices */
export const createGlobalBooleanVariables = () => ({
  areMotorsActive: new BooleanContextStateVariable(),
  isValueDisplayModeActive: new BooleanContextStateVariable(false),
  refreshDisplay: new BooleanContextStateVariable(), // Toggling this will refresh the display with TrackTitles etc)
  areDisplayRowsFlipped: new BooleanContextStateVariable(),
  isFlipModeActive: new BooleanContextStateVariable(),
  isMidiCcPageActive: new BooleanContextStateVariable(),
  currentPageId: new ContextStateVariable('unknown'), // Track current active page
  displayLineToggleActive: new BooleanContextStateVariable(false), // Toggle for alternate display line modes
});

export type GlobalBooleanVariables = ReturnType<typeof createGlobalBooleanVariables>;

export function bindDeviceToMidi(
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  activationCallbacks: ActivationCallbacks,
  { setTimeout }: TimerUtils
) {
  const ports = device.midiPortPair;
  const sd_ports = device.sdPortPair;

  function bindFader(ports: PortPair, fader: TouchSensitiveFader, faderIndex: number, device?: IconPlatformMplus) {
    fader.mSurfaceValue.mMidiBinding.setInputPort(ports.input).bindToPitchBend(faderIndex);
    fader.mTouchedValue.mMidiBinding.setInputPort(ports.input).bindToNote(0, 104 + faderIndex);
    fader.mTouchedValueInternal.mMidiBinding
      .setInputPort(ports.input)
      .bindToNote(0, 104 + faderIndex);

    const sendValue = (context: MR_ActiveDevice, value: number) => {
      value *= 0x3fff;
      ports.output.sendMidi(context, [0xe0 + faderIndex, value & 0x7f, value >> 7]);
    };

    const isFaderTouched = new ContextStateVariable(false);
    fader.mTouchedValueInternal.mOnProcessValueChange = (context, value) => {
      const isFaderTouchedValue = Boolean(value);
      isFaderTouched.set(context, isFaderTouchedValue);
      if (!isFaderTouchedValue) {
        sendValue(context, lastFaderValue.get(context));
      }
    };

    const forceUpdate = new ContextStateVariable(true);
    const lastFaderValue = new ContextStateVariable(0);
    fader.mSurfaceValue.mOnProcessValueChange = (context, newValue, difference) => {
      // Prevent identical messages to reduce fader noise
      if (
        globalBooleanVariables.areMotorsActive.get(context) &&
        !isFaderTouched.get(context) &&
        (difference !== 0 || lastFaderValue.get(context) === 0 || forceUpdate.get(context))
      ) {
        forceUpdate.set(context, false);
        sendValue(context, newValue);
      }

      lastFaderValue.set(context, newValue);
    };


    fader.mSurfaceValue.mOnTitleChange = (context, objectTitle, valueTitle) => {
      // Ensure faders update on a title change
      forceUpdate.set(context, true);
      // Update display state with fader title information
      const pageId = globalBooleanVariables.currentPageId.get(context);
      device.displayStateManager.updateFaderTitle(context, pageId, faderIndex, objectTitle, valueTitle);
      // Set fader to `0` when unassigned
      if (objectTitle === "") {
        fader.mSurfaceValue.setProcessValue(context, 0);
        // `mOnProcessValueChange` somehow isn't run here on `setProcessValue()`, hence:
        lastFaderValue.set(context, 0);
        if (globalBooleanVariables.areMotorsActive.get(context)) {
          forceUpdate.set(context, false);
          sendValue(context, 0);
        }
      }
    };

    globalBooleanVariables.areMotorsActive.addOnChangeCallback((context, areMotorsActive) => {
      if (areMotorsActive) {
        sendValue(context, lastFaderValue.get(context));
      }
    });

    return fader;
  }

  for (const [channelIndex, channel] of device.channelControls.entries()) {
    // Push Encoder
    channel.encoder.mEncoderValue.mMidiBinding
      .setInputPort(ports.input)
      .bindToControlChange(0, 16 + channelIndex)
      .setTypeRelativeSignedBit();
    channel.encoder.mPushValue.mMidiBinding
      .setInputPort(ports.input)
      .bindToNote(0, 32 + channelIndex);

    // Encoder callbacks - use DisplayStateManager
    channel.encoder.mEncoderValue.mOnDisplayValueChange = (context, value) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }

      // Translate localized strings to English
      value =
        {
          // French
          Éteint: "Eteint",

          // Japanese
          オン: "On",
          オフ: "Off",

          // Russian
          "Вкл.": "On",
          "Выкл.": "Off",

          // Chinese
          开: "On",
          关: "Off",
        }[value] ?? value;

      const pageId = globalBooleanVariables.currentPageId.get(context);
      device.displayStateManager.updateEncoderValue(context, pageId, channelIndex, value);

      // Clear local value mode after 1 second
      setTimeout(
        context,
        `clearLocalEncoderValueMode${channelIndex}`,
        (context) => {
          const pageId = globalBooleanVariables.currentPageId.get(context);
          device.displayStateManager.clearLocalValueMode(context, pageId, channelIndex);
        },
        7
      );
    };

    channel.encoder.mEncoderValue.mOnTitleChange = (context, title1, title2) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }

      // Translate localized strings for title2
      title2 =
        {
          // English
          "Pan Left-Right": "Pan",

          // German
          "Pan links/rechts": "Pan",

          // Spanish
          "Pan izquierda-derecha": "Pan",

          // French
          "Pan gauche-droit": "Pan",
          "Pré/Post": "PrePost",

          // Italian
          "Pan sinistra-destra": "Pan",
          Monitoraggio: "Monitor",

          // Japanese
          左右パン: "Pan",
          モニタリング: "Monitor",
          レベル: "Level",

          // Portuguese
          "Pan Esquerda-Direita": "Pan",
          Nível: "Nivel",
          "Pré/Pós": "PrePost",

          // Russian
          "Панорама Лево-Право": "Pan",
          Монитор: "Monitor",
          Уровень: "Level",
          "Пре/Пост": "PrePost",

          // Chinese
          "声像 左-右": "Pan",
          监听: "Monitor",
          电平: "Level",
          "前置/后置": "PrePost",
        }[title2] ?? title2;

      const pageId = globalBooleanVariables.currentPageId.get(context);
      device.displayStateManager.updateEncoderTitle(context, pageId, channelIndex, title1, title2);
    };

    // Scribble Strip - Track Title
    channel.scribbleStrip.trackTitle.mOnTitleChange = (context, title, valueTitle) => {
      console.log(`scribbleStrip.trackTitle.mOnTitleChange updated for channel ${title}:${valueTitle}`);
      device.displayStateManager.updateTrackTitle(context, channelIndex, title, valueTitle);
    };

    // Channel Buttons
    const buttons = channel.buttons;
    for (const [row, button] of [
      buttons.record,
      buttons.solo,
      buttons.mute,
      buttons.select,
    ].entries()) {
      button.bindToNote(ports, row * 8 + channelIndex, true);
    }

    // Fader
    const channelFader = bindFader(ports, channel.fader, channelIndex, device);

    // Fader display value callback
    channelFader.mSurfaceValue.mOnDisplayValueChange = (context, value, units) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }
      const displayValue = units ? `${value} ${units}` : value;
      const pageId = globalBooleanVariables.currentPageId.get(context);
      device.displayStateManager.updateFaderValue(context, pageId, channelIndex, displayValue);

      // Clear local value mode after 1 second
      setTimeout(
        context,
        `clearLocalFaderValueMode${channelIndex}`,
        (context) => {
          const pageId = globalBooleanVariables.currentPageId.get(context);
          device.displayStateManager.clearLocalValueMode(context, pageId, channelIndex);
        },
        7
      );
    };
  }

  // Pass global variables to DisplayStateManager so it can read directly
  device.displayStateManager.setGlobalBooleanVariables(globalBooleanVariables);

  // Add global callbacks for display setting changes
  globalBooleanVariables.areDisplayRowsFlipped.addOnChangeCallback((context, value) => {
    const pageId = globalBooleanVariables.currentPageId.get(context);
    device.displayStateManager.updatePageSettings(context, pageId, {
      areDisplayRowsFlipped: value,
    });
  });

  globalBooleanVariables.refreshDisplay.addOnChangeCallback((context) => {
    // Don't refresh during page activation - callbacks haven't populated data yet
    if (!device.displayStateManager.getIsActivatingPage()) {
      device.displayStateManager.refreshAllChannels(context);
    }
  });

  // Master Section
  const master = device.master

  activationCallbacks.addCallback((context) => {
    device.displayStateManager.updateIndicator2(context, 'N');
  });

  bindFader(ports, master.fader, 8, device);

  master.fader.mSurfaceValue.mOnTitleChange = (context: MR_ActiveDevice, objectTitle: string, valueTitle: string) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    const title = objectTitle ? objectTitle + ":" + valueTitle : "No AI Parameter under mouse";
    device.displayStateManager.updateMasterFader(context, {
      parameterName: title,
    });
  }

  master.fader.mSurfaceValue.mOnDisplayValueChange = (context: MR_ActiveDevice, value: string, units: string) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    device.displayStateManager.updateMasterFader(context, {
      displayValue: value + ' ' + units,
    });
  }

  master.fader.mTouchedValue.mOnProcessValueChange = (context, _touched, value2) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    // value2===-1 means touch released
    if (value2 == -1) {
      device.displayStateManager.updateMasterFader(context, { isTouched: false });
      globalBooleanVariables.refreshDisplay.toggle(context);
    } else {
      device.displayStateManager.updateMasterFader(context, { isTouched: true });
    }
  }

  master.buttons.mixer.bindToNote(ports, 84);
  master.buttons.read.bindToNote(ports, 74);
  master.buttons.write.bindToNote(ports, 75);
  // SD buttons
  master.sd_buttons.subPageMixer.bindToNote(sd_ports, 0);
  master.sd_buttons.subPageEQ.bindToNote(sd_ports, 1);
  master.sd_buttons.subPageSendsQC.bindToNote(sd_ports, 2);
  master.sd_buttons.subPagePreFilter.bindToNote(sd_ports, 3);
  master.sd_buttons.subPageCueSends.bindToNote(sd_ports, 4);
  master.sd_buttons.subPageGate.bindToNote(sd_ports, 5);
  master.sd_buttons.subPageCompressor.bindToNote(sd_ports, 6);
  master.sd_buttons.subPageTools.bindToNote(sd_ports, 7);
  master.sd_buttons.subPageSaturator.bindToNote(sd_ports, 8);
  master.sd_buttons.subPageLimiter.bindToNote(sd_ports, 9);
  master.sd_buttons.subPageControlRoom.bindToNote(sd_ports, 10);
  master.sd_buttons.subPageMIDICC.bindToNote(sd_ports, 11);
  master.sd_buttons.subPageShift.bindToNote(sd_ports, 12);
  master.sd_buttons.deactivateAllSolo.bindToNote(sd_ports, 13);
  master.sd_buttons.unmuteAll.bindToNote(sd_ports, 14);

  // Transport Section
  const transport = device.transport;
  const buttons = device.transport.buttons

  for (const [index, button] of [
    buttons.prevBnk,
    buttons.nextBnk,
    buttons.prevChn,
    buttons.nextChn,
  ].entries()) {
    button.bindToNote(ports, 46 + index);
  }

  for (const [index, button] of [
    buttons.rewind,
    buttons.forward,
    buttons.stop,
    buttons.start,
    buttons.record
  ].entries()) {
    button.bindToNote(ports, 91 + index);
  }

  buttons.cycle.bindToNote(ports, 86)

  buttons.flip.bindToNote(ports, 50)
  buttons.zoomOnOff.bindToNote(ports, 100)
  buttons.zoomVertOut.bindToNote(ports, 96)
  buttons.zoomVertIn.bindToNote(ports, 97)
  buttons.zoomHorizOut.bindToNote(ports, 98)
  buttons.zoomHorizIn.bindToNote(ports, 99)

  // Jog wheel
  transport.jog_wheel.bindToControlChange(ports.input, 0x3c);
  transport.jog_wheel.bindToNote(ports.input, 101);

}
