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

  recordBinding.mOnValueChange = (context, _mapping, value) => {
    if (value) {
      globalBooleanVariables.isValueDisplayModeActive.toggle(context);

      // Send display mode status to Stream Deck via sysex
      // See STREAMDECK_INTEGRATION.md for Stream Deck button configuration
      const isActive = globalBooleanVariables.isValueDisplayModeActive.get(context);
      const displayText = isActive ? "Display: ON" : "Display: OFF";

      // Convert text to ASCII bytes for sysex message
      const textBytes: number[] = [];
      for (let i = 0; i < displayText.length; i++) {
        textBytes.push(displayText.charCodeAt(i));
      }

      // Send sysex message to Stream Deck
      // Format: F0 7D 00 <ASCII text bytes> F7
      // - F0: Sysex start
      // - 7D: Manufacturer ID (educational/development use)
      // - 00: Message type identifier
      // - <text bytes>: ASCII text content
      // - F7: Sysex end
      device.sdPortPair.output.sendMidi(context, [
        0xF0,  // Sysex start
        0x7D,  // Manufacturer ID
        0x00,  // Message type identifier
        ...textBytes,  // ASCII text
        0xF7   // Sysex end
      ]);
    }
  };

  // If subpage references are provided, set up the special bindings
  if (subpages) {
    // Bind Select buttons (1-5) to Mixer, Control Room, MIDI CC
    device.channelControls.forEach((channelControl, index) => {
      const labelData = [
        { page: subpages.mixer, label: 'Mixer' },
        { page: subpages.controlRoom, label: 'Ctl Rm' },
        { page: subpages.midiCC, label: 'MIDICC' },
        { page: subpages.selectedTrack[0], label: 'SelChl' },
        { page: subpages.channelStrip[0], label: 'ChStrp' },
      ];
      // Select buttons activate specific pages (cycling through first 3)
      if (index < labelData.length && labelData[index]) {
        page
          .makeActionBinding(
            channelControl.buttons.select.mSurfaceValue,
            labelData[index].page.mAction.mActivate
          )
          .setSubPage(subPage);
      }
    });

    // Custom mOnActivate handler that replicates BindingCreator behavior plus LCD setup
    // NOTE: We inline the logic instead of calling the original handler to avoid Duktape
    // compatibility issues. See DUKTAPE_COMPATIBILITY.md for details on why chaining
    // function references causes "DukValue is uninitialized" errors in Cubase.
    subPage.mOnActivate = (activeDevice: any, _activeMapping: any) => {
      // Set current page ID in global state
      const pageId = 'shift';
      globalBooleanVariables.currentPageId.set(activeDevice, pageId);

      // Initialize page in DisplayStateManager and set as active
      device.displayStateManager.initializePage(pageId);
      device.displayStateManager.setActivePage(activeDevice, pageId);

      // Log activation message (from SHIFT_PAGE_CONFIG)
      console.log('from script: Platform M+ page "Shift Page" activated');

      // Update global variables (from SHIFT_PAGE_CONFIG activation.globalVariables)
      globalBooleanVariables.displayChannelValueName.set(activeDevice, false);
      globalBooleanVariables.displayParameterTitle.set(activeDevice, true);
      globalBooleanVariables.refreshDisplay.toggle(activeDevice);

      // Update page settings in DisplayStateManager
      const pageSettings: any = {
        displayChannelValueName: false,
        displayParameterTitle: true,
      };
      if (SHIFT_PAGE_CONFIG.displayBindings) {
        pageSettings.areKnobsBound = SHIFT_PAGE_CONFIG.displayBindings.knobsBound;
        pageSettings.areFadersBound = SHIFT_PAGE_CONFIG.displayBindings.fadersBound;
      }
      device.displayStateManager.updatePageSettings(activeDevice, pageId, pageSettings);

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

      // Set LCD labels for the Shift page
      const labelData = [
        { label: 'Mixer' },
        { label: 'Ctl Rm' },
        { label: 'MIDICC' },
        { label: 'SelChl' },
        { label: 'ChStrp' },
      ];

      for (var i = 0; i < labelData.length; i++) {
        var data = labelData[i];
        var formattedLabel = formatLabel(data.label);
        device.lcdManager.setChannelText(activeDevice, 1, i, formattedLabel);
        device.lcdManager.setChannelText(activeDevice, 0, i, '');
      }
    };
  };

  // Note: The masterButton 'subPageShift' will automatically be bound to activate this subpage
  // The Mixer button binding to activate Shift is handled in the main file

  return subPage;
}
