import { createElements, getArrayElements } from "./util";
import {
  DecoratedDeviceSurface,
  DecoratedLamp,
  JogWheel,
  LedButton,
  LedPushEncoder,
  TouchSensitiveFader,
} from "./decorators/surface";
import { LcdManager } from "./midi/LcdManager";
import { makePortPair, PortPair } from "./midi/PortPair";


// The ICon Platform M+ Device
export class IconPlatformMplus {
  channelControls: ChannelSurfaceElements[];
  numStrips: number;
  master: MasterControl;
  transport: TransportControl;

  midiPortPair: PortPair;
  ccPortPair: PortPair;

  lcdManager: LcdManager;

  constructor(
    driver: MR_DeviceDriver,
    deviceSurface: DecoratedDeviceSurface,
  ) {
    var xKnobStrip = 0
    var yKnobStrip = 5


    this.channelControls = makeChannelControls(deviceSurface, xKnobStrip, yKnobStrip)
    this.numStrips = 8
    this.master = makeMasterControl(deviceSurface, xKnobStrip + 1, yKnobStrip + 4)
    this.transport = makeTransport(deviceSurface, xKnobStrip + 63, yKnobStrip + 4)

    // create objects representing the hardware's MIDI ports
    this.midiPortPair = makePortPair(driver, false)
    this.ccPortPair = makePortPair(driver, false)
    driver.makeDetectionUnit().detectPortPair(this.midiPortPair.input, this.midiPortPair.output)
      .expectInputNameContains('Platform M+')
      .expectOutputNameContains('Platform M+')

    driver.makeDetectionUnit().detectPortPair(this.ccPortPair.input, this.ccPortPair.output)
      .expectOutputNameEquals('Icon CC')

    this.lcdManager = new LcdManager(this);
  }
}

export interface ChannelSurfaceElements {
  index: number;
  encoder: MR_PushEncoder;
  scribbleStrip: {
    trackTitle: MR_SurfaceCustomValueVariable;
    faderTitle: MR_SurfaceCustomValueVariable;
  };
  buttons: {
    record: LedButton;
    solo: LedButton;
    mute: LedButton;
    select: LedButton;
  };
  fader: TouchSensitiveFader;
}

export interface MasterControl {
  fader: TouchSensitiveFader,
  buttons: {
    mixer: LedButton,
    read: LedButton,
    write: LedButton,
  }
}

export interface TransportControl {
  buttons: {
    prevChn: LedButton,
    nextChn: LedButton,
    prevBnk: LedButton,
    nextBnk: LedButton,
    rewind: LedButton,
    forward: LedButton,
    stop: LedButton,
    start: LedButton,
    record: LedButton,
    cycle: LedButton,
    flip: LedButton, // HiddenLedButton
    zoomOnOff: LedButton, // HiddenLedButton
    zoomVertOut: LedButton, // HiddenLedButton
    zoomVertIn: LedButton, // HiddenLedButton
    zoomHorizOut: LedButton, // HiddenLedButton
    zoomHorizIn: LedButton, // HiddenLedButton
  },
  jog_wheel: JogWheel
}

export function makeMasterControl(surface: DecoratedDeviceSurface, x: number, y: number): MasterControl {
  x = x + 7 * 8;
  // Fader + Fader Touch
  const fader_x = x
  const fader_y = y + 3

  return {
    buttons: {
      mixer: surface.makeLedButton(fader_x + 3, fader_y + 6, 3, 3),
      read: surface.makeLedButton(fader_x + 3, fader_y + 9, 3, 3),
      write: surface.makeLedButton(fader_x + 3, fader_y + 12, 3, 3),
    },
    fader: surface.makeTouchSensitiveFader(fader_x, fader_y, 3, 18),
  }

}

export function makeTransport(surface: DecoratedDeviceSurface, x: number, y: number): TransportControl {
  var w = 3
  var h = 3

  const prevChn = surface.makeLedButton(x, y, w, h )
  const nextChn = surface.makeLedButton(x + 3, y, w, h)

  const prevBnk = surface.makeLedButton(x, y + 3, w, h)
  const nextBnk = surface.makeLedButton(x + 3, y + 3, w, h)

  const btnRewind = surface.makeLedButton(x, y + 6, w, h)
  const btnForward = surface.makeLedButton(x + 3, y + 6, w, h)

  const btnStop = surface.makeLedButton(x + 3, y + 9, w, h)
  const btnStart = surface.makeLedButton(x, y + 9, w, h)

  const btnRecord = surface.makeLedButton(x, y + 12, w, h)
  const btnCycle = surface.makeLedButton(x + 3, y + 12, w, h)

  // The Note on/off events for the special functions are timestamped at the same time
  // cubase midi remote doesn't show anything on screen though a note is sent
  const btnFlip = surface.makeHiddenLedButton()

  // Pressing the Zoom keys simultaneously will toggle on and off a note event. If on
  // either zoom button will send a Note 100 when zoom is activated or deactivated by either button
  // If zoom is active and you simply press then other button the event will not be sent
  //
  const btnZoomOnOff = surface.makeHiddenLedButton()

  // The Jog wheel will change CC/Note based on which of thte Zoom buttons have been activated
  // None - CC 60
  // Vertical - Note Clockwise  97, CounterClockwise 96
  // Horizontal - Note Clockwise  99, CounterClockwise 98
  // The Jog wheel is an endless encoder but the surface Push Encoder is control value 0-127
  // In this case it pays to use the Absolute binding type as the Platform M+ produces a rate based
  // CC value - turn clockwise slowly -> 1, turn it rapidly -> 7 (counter clockwise values are offset by 50, turn CCW slowly -> 51)
  // In the Jog (or more correctly Nudge Cursor) mapping we use this to "tap the key severel times" - giving the impact of fine grain control if turned slowly
  // or large nudges if turned quickly.
  // ? One weird side effect of this is the Knob displayed in Cubase will show its "value" in a weird way.
  // todo I wonder if there is a way to change that behaviour?

  const jog_wheel = surface.makeJogWheel(x, y + 17, 6, 6)

  // Zoom Vertical
  const zoomVertOut = surface.makeHiddenLedButton()
  const zoomVertIn = surface.makeHiddenLedButton()


  // Zoom Horizontal
  const zoomHorizOut = surface.makeHiddenLedButton()
  const zoomHorizIn = surface.makeHiddenLedButton()

  return {
    buttons: {
      prevChn: prevChn,
      nextChn: nextChn,
      prevBnk: prevBnk,
      nextBnk: nextBnk,
      rewind: btnRewind,
      forward: btnForward,
      stop: btnStop,
      start: btnStart,
      record: btnRecord,
      cycle: btnCycle,
      flip: btnFlip,
      zoomOnOff: btnZoomOnOff,
      zoomVertOut: zoomVertOut,
      zoomVertIn: zoomVertIn,
      zoomHorizOut: zoomHorizOut,
      zoomHorizIn: zoomHorizIn,
    },
    jog_wheel: jog_wheel
  }
}

export function makeChannelControls(surface: DecoratedDeviceSurface, x: number, y: number): ChannelSurfaceElements[] {
  return createElements(8, (index) => {
    const currentChannelXPosition = x + index * 7;

    const encoder = surface.makePushEncoder(currentChannelXPosition, y + 2, 4, 4);
    const selectButton = surface.makeLedButton(currentChannelXPosition + 4, y + 13, 3, 3);

    // Scribble strip
    surface.makeBlindPanel(currentChannelXPosition-0.4, y-1.4, 7.2, 3.4);
    surface.makeLabelField(currentChannelXPosition, y-1.2, 6.4, 1.5).relateTo(encoder);
    surface
      .makeLabelField(currentChannelXPosition, y-1 + 1.2, 6.4, 1.5)
      .relateTo(selectButton);

    return {
      index,
      encoder,
      scribbleStrip: {
        trackTitle: surface.makeCustomValueVariable("scribbleStripTrackTitle"),
        faderTitle: surface.makeCustomValueVariable("scribbleStripFaderTitle"),
      },
      buttons: {
        record: surface.makeLedButton(currentChannelXPosition + 4, y + 22, 3, 3),
        solo: surface.makeLedButton(currentChannelXPosition + 4, y + 19, 3, 3),
        mute: surface.makeLedButton(currentChannelXPosition + 4, y + 16, 3, 3),
        select: selectButton,
      },

      fader: surface.makeTouchSensitiveFader(currentChannelXPosition, y + 7, 3, 18),
    };
  });
}
