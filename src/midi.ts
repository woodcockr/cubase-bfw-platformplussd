import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { LcdManager } from "./midi/LcdManager";

import { midi_cc } from "./config";
import { DecoratedFactoryMappingPage } from "./decorators/page";

export function makeSubPages(page: DecoratedFactoryMappingPage, faderSubPageArea: MR_SubPageArea, device: IconPlatformMplus, globalBooleanVariables: GlobalBooleanVariables) {


  var subPageMIDICC = faderSubPageArea.makeSubPage('MIDI CC')

  function makeMidiCCBinding(page: MR_FactoryMappingPage, subPageMIDICC: MR_SubPage, displayName: string, cc: number, fader: number) {
    // ? I have no idea what page.mCustom.makeHostValueVariable actually does- all I know is I can make a value binding this way. I can't seem to be able to look it up
    // ? or access it all once made.
    page.makeValueBinding(device.channelControls[fader].fader.mSurfaceValue, page.mCustom.makeHostValueVariable(displayName)).setValueTakeOverModeJump().setSubPage(subPageMIDICC)
      .mOnValueChange = (activeDevice: MR_ActiveDevice, mapping: any, value: number, value2: any) => {
        var ccValue = Math.ceil(value * 127)
        var pitchBendValue = Math.ceil(value * 16383)
        var val1 = pitchBendValue % 128
        var val2 = Math.floor(pitchBendValue / 128)

        // this is the value going back to the icon Fader
        device.channelControls[fader].fader.mSurfaceValue.setProcessValue(activeDevice, value);
        // this is the value going back to Cubendo - only send if touched
        if (device.channelControls[fader].fader.mTouchedValue.getProcessValue(activeDevice) === 1) {
          device.ccPortPair.output.sendMidi(activeDevice, [0xB0, cc, ccValue])
        }
        // Update display
        device.lcdManager.setChannelText(activeDevice, 1, fader, displayName);
        device.lcdManager.setChannelText(activeDevice, 0, fader, ccValue.toString());
      }
  }

  for (var i = 0; i < device.numStrips; ++i) {
    let name = LcdManager.centerString(
      LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(midi_cc[i].title))
    )
    makeMidiCCBinding(page, subPageMIDICC, name, midi_cc[i].cc, i)
  }

  page.mOnActivate = (context: MR_ActiveDevice) => {
    console.log('from script: Platform M+ page "Midi" activated')

    // This fails on activate due to overwrite from faders! thankfully the valueBinding doesn't. Looks like the scribble strip updates when the faders are deactivated occur
    // after the mOnActivate call thus wiping this out.
    for (var i = 0; i < device.numStrips; ++i) {
      let name = LcdManager.centerString(
        LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(midi_cc[i].title))
      )
      device.lcdManager.setChannelText(context, 1, i, name);
      device.lcdManager.setChannelText(context, 0, i, "?");
    }
  }
  page.makeActionBinding(device.master.buttons.subPageMIDICC.mSurfaceValue, subPageMIDICC.mAction.mActivate)
}