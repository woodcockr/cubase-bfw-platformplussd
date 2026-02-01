import { TouchSensitiveFader } from "../decorators/surface";
import { IconPlatformMplus } from "../icon_elements";
import {
  BooleanContextStateVariable,
  ContextStateVariable,
  TimerUtils,
  createElements,
} from "../util";
import { PortPair } from "./PortPair";
import { ActivationCallbacks } from "./connection";
import { LcdManager } from "./LcdManager";

/** Declares some global context-dependent variables that (may) affect multiple devices */
export const createGlobalBooleanVariables = () => ({
  areMotorsActive: new BooleanContextStateVariable(),
  isValueDisplayModeActive: new BooleanContextStateVariable(),
  refreshDisplay: new BooleanContextStateVariable(), // Toggling this will refresh the display with TrackTitles etc)
  areDisplayRowsFlipped: new BooleanContextStateVariable(),
  areFadersBound: new BooleanContextStateVariable(), // Ugly workaround for not receiving mOnTitleChange events when switching pages to unbound Faders
  areKnobsBound: new BooleanContextStateVariable(), // Ugly workaround for not receiving mOnTitleChange events when switching pages to unbound Knobs
  isFlipModeActive: new BooleanContextStateVariable(),
  displayChannelValueName: new BooleanContextStateVariable(),
  displayParameterTitle: new BooleanContextStateVariable(),
  isMidiCcPageActive: new BooleanContextStateVariable(),
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

  function bindFader(ports: PortPair, fader: TouchSensitiveFader, faderIndex: number) {
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


    fader.mSurfaceValue.mOnTitleChange = (context, title) => {
      // Ensure faders update on a title change
      forceUpdate.set(context, true);
      // Set fader to `0` when unassigned
      if (title === "") {
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

    // Scribble Strip
    const currentParameterTitle = new ContextStateVariable("");
    const currentParameterName = new ContextStateVariable("");
    const currentDisplayValue = new ContextStateVariable("");
    const currentChannelName = new ContextStateVariable("");
    const currentChannelValueName = new ContextStateVariable("");
    const isLocalValueModeActive = new ContextStateVariable(false);

    const updateNameValueDisplay = (context: MR_ActiveDevice) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }
      const row = +globalBooleanVariables.areDisplayRowsFlipped.get(context);
      const displayParameterTitle = globalBooleanVariables.displayParameterTitle.get(context)

      if (globalBooleanVariables.areKnobsBound.get(context)) {
        let name = currentParameterName.get(context)
        if (displayParameterTitle) {
          name = currentParameterTitle.get(context)
        }
        device.lcdManager.setChannelText(
          context,
          row,
          channelIndex,
          isLocalValueModeActive.get(context) ||
            globalBooleanVariables.isValueDisplayModeActive.get(context)
            ? currentDisplayValue.get(context)
            : name
        );
      } else {
        device.lcdManager.setChannelText(context, row, channelIndex, "");
      }
    };

    channel.encoder.mEncoderValue.mOnDisplayValueChange = (context, value) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }
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

      currentDisplayValue.set(
        context,
        LcdManager.centerString(
          LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(value))
        )
      );
      isLocalValueModeActive.set(context, true);
      updateNameValueDisplay(context);
      setTimeout(
        context,
        `updateDisplay${channelIndex}`,
        (context) => {
          isLocalValueModeActive.set(context, false);
          updateNameValueDisplay(context);
        },
        1
      );
    };

    channel.encoder.mEncoderValue.mOnTitleChange = (context, title1, title2) => {
      if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
        return;
      }

      globalBooleanVariables.areKnobsBound.set(context, true);
      // Luckily, `mOnTitleChange` runs after `mOnDisplayValueChange`, so setting
      // `isLocalValueModeActive` to `false` here overwrites the `true` that `mOnDisplayValueChange`
      // sets
      isLocalValueModeActive.set(context, false);
      currentParameterTitle.set(
        context,
        LcdManager.centerString(
          LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(title1))
        )
      );
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

      currentParameterName.set(
        context,
        LcdManager.centerString(
          LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(title2))
        )
      );
      updateNameValueDisplay(context);
    };

    globalBooleanVariables.isValueDisplayModeActive.addOnChangeCallback(updateNameValueDisplay);
    globalBooleanVariables.areDisplayRowsFlipped.addOnChangeCallback(updateNameValueDisplay);
    globalBooleanVariables.refreshDisplay.addOnChangeCallback(updateNameValueDisplay);

    const updateTrackTitleDisplay = (context: MR_ActiveDevice) => {
      const row = 1 - +globalBooleanVariables.areDisplayRowsFlipped.get(context);
      const displayChannelValueName = globalBooleanVariables.displayChannelValueName.get(context)
      if (globalBooleanVariables.areFadersBound.get(context)) {
        let name = currentChannelName.get(context)
        if (displayChannelValueName) {
          name = currentChannelValueName.get(context)
        }
        device.lcdManager.setChannelText(context, row, channelIndex, name);
      } else {
        device.lcdManager.setChannelText(context, row, channelIndex, "");
      }
    };

    channel.scribbleStrip.trackTitle.mOnTitleChange = (context, title, valueTitle) => {
      globalBooleanVariables.areFadersBound.set(context, true);
      currentChannelName.set(
        context,
        LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(title))
      );
      currentChannelValueName.set(
        context,
        LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(valueTitle))
      );
      updateTrackTitleDisplay(context);
    };

    globalBooleanVariables.areDisplayRowsFlipped.addOnChangeCallback(updateTrackTitleDisplay);
    globalBooleanVariables.refreshDisplay.addOnChangeCallback(updateTrackTitleDisplay);

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
    bindFader(ports, channel.fader, channelIndex);
  }

  // Master Section
  const master = device.master

  activationCallbacks.addCallback((context) => {
    device.lcdManager.setIndicator2Text(context, 'N')
  });


  const currentMasterFaderParameterName = new ContextStateVariable("");
  const currentMasterFaderDisplayValue = new ContextStateVariable("");

  bindFader(ports, master.fader, 8);

  master.fader.mSurfaceValue.mOnTitleChange = (context: MR_ActiveDevice, objectTitle: string, valueTitle: string) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    var title = objectTitle ? objectTitle + ":" + valueTitle : "No AI Parameter under mouse"
    currentMasterFaderParameterName.set(
      context,
      title
    );
    currentMasterFaderDisplayValue.set(
      context,
      ' '
    );
    if (master.fader.mTouchedValue.getProcessValue(context) === 1) {
      device.lcdManager.setTextLine(context, 1, currentMasterFaderParameterName.get(context))
      device.lcdManager.setTextLine(context, 0, currentMasterFaderDisplayValue.get(context))
    }
  }

  master.fader.mSurfaceValue.mOnDisplayValueChange = (context: MR_ActiveDevice, value: string, units: string) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    currentMasterFaderDisplayValue.set(
      context,
      value + ' ' + units
    );
    if (master.fader.mTouchedValue.getProcessValue(context) === 1) {
      device.lcdManager.setTextLine(context, 1, currentMasterFaderParameterName.get(context))
      device.lcdManager.setTextLine(context, 0, currentMasterFaderDisplayValue.get(context))
    }
  }

  master.fader.mTouchedValue.mOnProcessValueChange = (context, touched, value2) => {
    if (globalBooleanVariables.isMidiCcPageActive.get(context)) {
      return;
    }
    // value===-1 means touch released
    if (value2 == -1) {
      globalBooleanVariables.refreshDisplay.toggle(context);
    } else {
      device.lcdManager.setTextLine(context, 1, currentMasterFaderParameterName.get(context))
      device.lcdManager.setTextLine(context, 0, currentMasterFaderDisplayValue.get(context))
    }
  }

  master.buttons.mixer.bindToNote(ports, 84);
  master.buttons.read.bindToNote(ports, 74);
  master.buttons.write.bindToNote(ports, 75);
  // SD buttons
  master.buttons.subPageMixer.bindToNote(sd_ports, 0);
  master.buttons.subPageEQ.bindToNote(sd_ports, 1);
  master.buttons.subPageSendsQC.bindToNote(sd_ports, 2);
  master.buttons.subPagePreFilter.bindToNote(sd_ports, 3);
  master.buttons.subPageCueSends.bindToNote(sd_ports, 4);
  master.buttons.subPageGate.bindToNote(sd_ports, 5);
  master.buttons.subPageCompressor.bindToNote(sd_ports, 6);
  master.buttons.subPageTools.bindToNote(sd_ports, 7);
  master.buttons.subPageSaturator.bindToNote(sd_ports, 8);
  master.buttons.subPageLimiter.bindToNote(sd_ports, 9);
  master.buttons.subPageControlRoom.bindToNote(sd_ports, 10);
  master.buttons.subPageMIDICC.bindToNote(sd_ports, 11);

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
