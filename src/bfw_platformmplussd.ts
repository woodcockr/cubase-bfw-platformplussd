// Polyfills
import "core-js/actual/array/iterator";
import "core-js/actual/array/from";
import "core-js/actual/array/reverse";
import "core-js/actual/array/flat-map";
import "core-js/actual/string/pad-start";
import "core-js/actual/string/replace-all";
import "core-js/actual/object/entries";
import "core-js/actual/reflect/construct";

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
import { setTextOfColumn, setTextOfLine, makeLabel } from "./helper"
import * as mixer from "./mixer"
import * as control_room from "./control_room"
import * as midi from "./midi"
import * as selected_track from "./selected_track"
import * as channel_strip from "./channel_strip"


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
mixer.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
selected_track.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
channel_strip.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
control_room.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
midi.makeSubPages(page, faderSubPageArea, device, globalBooleanVariables, dummy)
const timerUtils = makeTimerUtils(deviceDriver, page, surface, isAPIVersion1_1);

bindDeviceToMidi(device, globalBooleanVariables, activationCallbacks, timerUtils);
