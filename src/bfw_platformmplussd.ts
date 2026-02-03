// Polyfills
import "core-js/actual/array/iterator";
import "core-js/actual/array/from";
import "core-js/actual/array/reverse";
import "core-js/actual/array/flat-map";
import "core-js/actual/string/pad-start";
import "core-js/actual/string/replace-all";
import "core-js/actual/object/entries";
import "core-js/actual/object/values";
import "core-js/actual/reflect/construct";
import "core-js/actual/map";

// @ts-ignore Workaround because the core-js polyfill doesn't play nice with SWC:
Reflect.get = undefined;

import midiremote_api from "midiremote_api_v1";
import { decoratePage } from "./decorators/page";
import { decorateSurface, DecoratedDeviceSurface } from "./decorators/surface";
import { makePortPair } from "./midi/PortPair";
import { setupDeviceConnection } from "./midi/connection"
import { makeTimerUtils } from "./util";
import { createGlobalBooleanVariables, bindDeviceToMidi } from "./midi/binding"
import { IconPlatformMplus, ChannelSurfaceElements, makeChannelControls, makeMasterControl, makeTransport } from "./icon_elements";
import { makePageWithDefaults } from "./master_controls"
import * as mixer from "./mixer"
import * as control_room from "./control_room"
import * as midi from "./midi"
import * as selected_track from "./selected_track"
import * as channel_strip from "./channel_strip"
import * as shift from "./shift"


// create the device driver main object
const deviceDriver = midiremote_api.makeDeviceDriver('BFW', 'Platform Mplus SD', 'Big Fat Wombat');

var surface = decorateSurface(deviceDriver.mSurface)

const device = new IconPlatformMplus(deviceDriver, surface);
const isAPIVersion1_1 = device.channelControls[0].fader.mSurfaceValue.mTouchState ? true: false

const activationCallbacks = setupDeviceConnection(deviceDriver, device);

activationCallbacks.addCallback(() => {
    console.log('Icon Platform M+ Activated');
});

const globalBooleanVariables = createGlobalBooleanVariables();

activationCallbacks.addCallback((context) => {
  // Setting `runCallbacksInstantly` to `true` below is a workaround for
  // https://forums.steinberg.net/t/831123.
  globalBooleanVariables.areMotorsActive.set(context, true);
});

var page = decoratePage(makePageWithDefaults('Main', device, deviceDriver, globalBooleanVariables, activationCallbacks), surface)
// Dummy variable for unused controls in subpages
const dummy = page.mCustom.makeHostValueVariable("null");
var faderSubPageArea = page.makeSubPageArea('MixerArea')
const mixerSubPage = mixer.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const selectedTrackSubPages = selected_track.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const channelStripSubPages = channel_strip.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const controlRoomSubPage = control_room.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const midiCCSubPage = midi.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const shiftSubPage = shift.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy, {
  mixer: mixerSubPage,
  selectedTrack: selectedTrackSubPages,
  channelStrip: channelStripSubPages,
  controlRoom: controlRoomSubPage,
  midiCC: midiCCSubPage
})

// Bind the physical Mixer button to activate the Shift page
page.makeActionBinding(device.master.buttons.mixer.mSurfaceValue, shiftSubPage.mAction.mActivate)
const timerUtils = makeTimerUtils(deviceDriver, page, surface, isAPIVersion1_1);

bindDeviceToMidi(device, globalBooleanVariables, activationCallbacks, timerUtils);

// Initialize LCD indicators after all subpages are set up
// This ensures the default indicators are set and will persist
activationCallbacks.addCallback((context) => {
  // Set default indicators: Zoom mode (Z) and Nudge mode (N)
  // These will be tracked in LcdManager and restored after display updates
  device.lcdManager.setIndicator1Text(context, 'Z');
  device.lcdManager.setIndicator2Text(context, 'N');
});
