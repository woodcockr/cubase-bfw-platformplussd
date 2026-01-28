import { EnhancedMidiOutput, PortPair } from "../midi/PortPair";
import { CallbackCollection, createElements } from "../util";
import { enhanceButtonToLedButton } from "./button";

export interface LedButton extends MR_Button {
  mLedValue: MR_SurfaceCustomValueVariable;
  onSurfaceValueChange: CallbackCollection<
    Parameters<MR_Button["mSurfaceValue"]["mOnProcessValueChange"]>
  >;
  bindToNote: (ports: PortPair, note: number, isChannelButton?: boolean) => void;
}

export interface LedPushEncoder extends MR_PushEncoder {
  mDisplayModeValue: MR_SurfaceCustomValueVariable;
}

export interface TouchSensitiveFader extends MR_Fader {
  mTouchedValue: MR_SurfaceCustomValueVariable;
  mTouchedValueInternal: MR_SurfaceCustomValueVariable;
}

export interface JogWheel extends MR_PushEncoder {
  mKnobModeEnabledValue: MR_SurfaceCustomValueVariable;
  mJogRightValue: MR_SurfaceCustomValueVariable;
  mJogLeftValue: MR_SurfaceCustomValueVariable;
  bindToControlChange: (input: MR_DeviceMidiInput, controlChangeNumber: number) => void;
  bindToNote: (input: MR_DeviceMidiInput, note: number) => void;
}

export interface DecoratedLamp extends MR_Lamp {
  bindToNote: (output: EnhancedMidiOutput, note: number) => void;
}

export interface DecoratedDeviceSurface extends MR_DeviceSurface {
  makeLedButton: (...args: Parameters<MR_DeviceSurface["makeButton"]>) => LedButton;

  /**
   * Creates a mock LedButton that doesn't have a surface element, but uses a `customValueVariable`
   * internally. While it's typed as a button for convenience, it doesn't implement all the button
   * methods, like `setTypeToggle()` and friends.
   */
  makeHiddenLedButton: () => LedButton;
  makeHiddenLedButtons: (numberOfButtons: number) => LedButton[];
  makeLedPushEncoder: (...args: Parameters<MR_DeviceSurface["makePushEncoder"]>) => LedPushEncoder;
  makeTouchSensitiveFader: (
    ...args: Parameters<MR_DeviceSurface["makeFader"]>
  ) => TouchSensitiveFader;
  makeJogWheel: (...args: Parameters<MR_DeviceSurface["makeKnob"]>) => JogWheel;
  makeDecoratedLamp: (...args: Parameters<MR_DeviceSurface["makeLamp"]>) => DecoratedLamp;
}

export function decorateSurface(surface: MR_DeviceSurface) {
  const decoratedSurface = surface as DecoratedDeviceSurface;

  decoratedSurface.makeLedButton = (...args) =>
    enhanceButtonToLedButton(surface.makeButton(...args), surface);

  decoratedSurface.makeHiddenLedButton = () =>
    enhanceButtonToLedButton(
      { mSurfaceValue: surface.makeCustomValueVariable("HiddenLedButton") } as MR_Button,
      surface
    );

  decoratedSurface.makeHiddenLedButtons = (numberOfButtons) =>
    createElements(numberOfButtons, () => decoratedSurface.makeHiddenLedButton());

  decoratedSurface.makeLedPushEncoder = (...args) => {
    const encoder = surface.makePushEncoder(...args) as LedPushEncoder;
    encoder.mDisplayModeValue = surface.makeCustomValueVariable("encoderDisplayMode");
    return encoder;
  };

  decoratedSurface.makeTouchSensitiveFader = (...args) => {
    const fader = surface.makeFader(...args) as TouchSensitiveFader;

    fader.mTouchedValue = surface.makeCustomValueVariable("faderTouched");
    // Workaround because `filterByValue` in the encoder bindings hides zero values from
    // `mOnProcessValueChange`
    fader.mTouchedValueInternal = surface.makeCustomValueVariable("faderTouchedInternal");

    // Cubase 13 only:
    if (fader.mSurfaceValue.mTouchState) {
      fader.mSurfaceValue.mTouchState.bindTo(fader.mTouchedValue);
    }

    return fader;
  };

  decoratedSurface.makeJogWheel = (...args) => {
    const jogWheel = surface.makePushEncoder(...args) as JogWheel;

    const mProxyValue = surface.makeCustomValueVariable("jogWheelProxy");
    jogWheel.mKnobModeEnabledValue = surface.makeCustomValueVariable("jogWheelKnobModeEnabled");
    jogWheel.mJogRightValue = surface.makeCustomValueVariable("jogWheelJogRight");
    jogWheel.mJogLeftValue = surface.makeCustomValueVariable("jogWheelJogLeft");

    jogWheel.bindToNote = (input, note) => {
      jogWheel.mPushValue.mMidiBinding.setInputPort(input).bindToNote(0, note)
    }

    jogWheel.bindToControlChange = (input, controlChangeNumber) => {
      mProxyValue.mMidiBinding
        .setInputPort(input)
        .bindToControlChange(0, controlChangeNumber)
        .setTypeAbsolute();
      mProxyValue.mOnProcessValueChange = (context, value, difference) => {
        if (value < 0.5) {
          var jump_rate = Math.floor(value * 127)
          jogWheel.mJogRightValue.setProcessValue(context, jump_rate);
        } else if (value > 0.5) {
          var jump_rate = Math.floor((value - 0.5) * 127)
          jogWheel.mJogLeftValue.setProcessValue(context, jump_rate);
        }
      };
    };

    return jogWheel;
  };

  decoratedSurface.makeDecoratedLamp = (...args) => {
    const lamp = decoratedSurface.makeLamp(...args) as DecoratedLamp;

    lamp.bindToNote = (output, note) => {
      lamp.mSurfaceValue.mOnProcessValueChange = (context, value) => {
        output.sendNoteOn(context, note, value);
      };
    };

    return lamp;
  };

  return decoratedSurface;
}
