import { IconPlatformMplus } from "../icon_elements";
import { makeCallbackCollection } from "../util";

export type ActivationCallbacks = ReturnType<typeof setupDeviceConnection>;

export function setupDeviceConnection(driver: MR_DeviceDriver, device: IconPlatformMplus) {
  const activationCallbacks = makeCallbackCollection(driver, "mOnActivate");

  driver.mOnDeactivate = (context) => {

    device.lcdManager.clearDisplays(context);

    const output = device.midiPortPair.output;
    // Reset via `output.sendSysex(context, [0x63])` is not recognized by the X-Touch :(

    // Reset faders
    for (let faderIndex = 0; faderIndex < 9; faderIndex++) {
      output.sendMidi(context, [0xe0 + faderIndex, 0, 0]);
    }

    // Reset LEDs
    for (let note = 0; note < 0x76; note++) {
      output.sendNoteOn(context, note, 0);
    }

  };

  return activationCallbacks;
}
