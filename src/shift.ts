/**
 * Shift subpage - Configuration-driven approach
 *
 * This module provides a Shift page with special functionality:
 * - Select buttons (1-3) to activate Mixer, Control Room, MIDI CC pages
 * - Mute buttons to activate Selected Track subpages
 * - Solo buttons to activate Channel Strip subpages
 * - First Record button toggles value display mode
 * - All other controls have dummy bindings
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import { SHIFT_PAGE_CONFIG } from "./config/subpages/shift_page.config"

interface SubpageReferences {
  mixer: any; // MR_SubPage
  selectedTrack: any; // MR_SubPage[]
  channelStrip: any; // MR_SubPage[]
  controlRoom: any; // MR_SubPage
  midiCC: any; // MR_SubPage
}

/**
 * Create shift subpage with all bindings
 *
 * @param page - The mapping page
 * @param faderSubPageArea - The subpage area for shift controls
 * @param device - The Icon Platform M+ device
 * @param globalBooleanVariables - Global state variables
 * @param dummy - Dummy host value for unused controls
 * @param subpages - References to other subpages (mixer, control_room, midi, selected_track, channel_strip)
 */
export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any, // MR_HostValueVariable
  subpages?: SubpageReferences
) {
  // Create the binding creator
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables);

  // Create subpage and all bindings from configuration
  const subPage = creator.createSubPageBindings(SHIFT_PAGE_CONFIG, faderSubPageArea);

  // Custom handler for the first channel Record button to toggle value display mode
  const recordBinding = page
    .makeValueBinding(
      device.channelControls[0].buttons.record.mSurfaceValue,
      page.mCustom.makeHostValueVariable("Toggle Display Mode")
    )
    .setSubPage(subPage);

  recordBinding.mOnValueChange = (context, mapping, value) => {
    if (value) {
      globalBooleanVariables.isValueDisplayModeActive.toggle(context);
    }
  };

  // If subpage references are provided, set up the special bindings
  if (subpages) {
    // Bind Select buttons (1-5) to Mixer, Control Room, MIDI CC
    // Set up LCD display when shift page is activated
    subPage.mOnActivate = function (context) {
      const labelData = [
        { page: subpages.mixer, label: 'Mixer' },
        { page: subpages.controlRoom, label: 'Ctl Rm' },
        { page: subpages.midiCC, label: 'MIDICC' },
        { page: subpages.selectedTrack[0], label: 'SelChl' },
        { page: subpages.channelStrip[0], label: 'ChStrp' },
      ];
    device.channelControls.forEach((channelControl, index) => {
      // Select buttons activate specific pages (cycling through first 3)
      if (index < labelData.length && labelData[index]) {
        const selectBinding = page
          .makeActionBinding(
            channelControl.buttons.select.mSurfaceValue,
            labelData[index].page.mAction.mActivate
          )
          .setSubPage(subPage);
      }
      // TODO Leave this here for the moment. We may want to use them for more detailed page selection or for something else on the shift page.
      // // Mute buttons activate Selected Track subpages
      // if (subpages.selectedTrack && subpages.selectedTrack[index]) {
      //   const muteBinding = page
      //     .makeActionBinding(
      //       channelControl.buttons.mute.mSurfaceValue,
      //       subpages.selectedTrack[index].mAction.mActivate
      //     )
      //     .setSubPage(subPage);
      // }

      // // Solo buttons activate Channel Strip subpages
      // if (subpages.channelStrip && subpages.channelStrip[index]) {
      //   const soloBinding = page
      //     .makeActionBinding(
      //       channelControl.buttons.solo.mSurfaceValue,
      //       subpages.channelStrip[index].mAction.mActivate
      //     )
      //     .setSubPage(subPage);
      // }
    });

      // Helper function to format label with prefix (max 6 chars)
      function formatLabel(label: string): string {
        if (label.length <= 6) {
          var padding = '';
          var spacesNeeded = 6 - label.length;
          var i = 0;
          while (i < spacesNeeded) {
            padding = padding + ' ';
            i = i + 1;
          }
          return label + padding;
        }
        return label.substring(0, 6);
      }

      // Set LCD labels for each channel (row 0 and row 1)
      for (var i = 0; i < labelData.length; i++) {
        var data = labelData[i];
        var formattedLabel = formatLabel(data.label);
        device.lcdManager.setChannelText(context, 1, i, formattedLabel);
        device.lcdManager.setChannelText(context, 0, i, '');
      }
    }
  };

  // Note: The masterButton 'subPageShift' will automatically be bound to activate this subpage
  // The Mixer button binding to activate Shift is handled in the main file

  return subPage;
}
