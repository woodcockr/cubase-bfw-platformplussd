export const jogParameterTags = {
  active: 4041,
  position: 4044,
};

export const shuttleSpeedLevels = [
  { speed: 1 / 8, forwardTag: 2010, reverseTag: 2013 },
  { speed: 1 / 4, forwardTag: 2009, reverseTag: 2012 },
  { speed: 1 / 2, forwardTag: 2008, reverseTag: 2011 },
  { speed: 1, forwardTag: 2000, reverseTag: 2004 },
  { speed: 2, forwardTag: 2001, reverseTag: 2005 },
  { speed: 4, forwardTag: 2002, reverseTag: 2006 },
  { speed: 8, forwardTag: 2003, reverseTag: 2007 },
];

export const shuttleStopIndex = 7;
export const shuttleSelectorTags = [
  2007, 2006, 2005, 2004, 2011, 2012, 2013,
  -1,
  2010, 2009, 2008, 2000, 2001, 2002, 2003,
];

export const shuttleParameterTags = shuttleSpeedLevels.map(level => level.forwardTag)
  .concat(shuttleSpeedLevels.map(level => level.reverseTag));

export const defaultJogOptions = {
  idleTimeoutMs: 200,
  // Wheel input stays blocked this long after a Record press or transport
  // replacement unless Cubase's record feedback confirms the state sooner.
  recordPendingTimeoutMs: 1000,
};

export interface JogState {
  mode: "nudge" | "scrub" | "shuttle";
  position: number;
  moving: boolean;
  lastMotionAt: number;
  recording: boolean;
  shuttlePositionIndex: number;
  shuttleActiveTag: number;
  shuttlePendingTag: number;
  shuttleWaitCycles: number;
}

export interface JogTransport {
  setPosition(value: number): void;
  setShuttle(tag: number, value: number): void;
}

export type RelativeInputReset = (value: number) => void;

export function createJogState(): JogState {
  return {
    mode: "nudge",
    position: 0.5,
    moving: false,
    lastMotionAt: 0,
    recording: false,
    shuttlePositionIndex: shuttleStopIndex,
    shuttleActiveTag: -1,
    shuttlePendingTag: -1,
    shuttleWaitCycles: 0,
  };
}

export function decodeJogValue(value: number): number {
  if (!isFinite(value) || value < 0 || value > 1) return 0;
  const raw = Math.round(value * 127);
  const magnitude = raw & 0x3f;
  if (magnitude === 0) return 0;
  return raw & 0x40 ? -magnitude : magnitude;
}

export class JogController {
  private transport: JogTransport;
  private state: JogState;
  private options: typeof defaultJogOptions;

  constructor(
    transport: JogTransport,
    state: JogState,
    options = defaultJogOptions
  ) {
    this.transport = transport;
    this.state = state;
    this.options = options;
    if (typeof state.shuttlePositionIndex !== "number") state.shuttlePositionIndex = shuttleStopIndex;
    if (typeof state.shuttleActiveTag !== "number") state.shuttleActiveTag = -1;
    if (typeof state.shuttlePendingTag !== "number") state.shuttlePendingTag = -1;
    if (typeof state.shuttleWaitCycles !== "number") state.shuttleWaitCycles = 0;
  }

  turn(delta: number, now: number) {
    if (this.state.recording || this.state.mode !== "shuttle" || !isFinite(delta) || delta === 0) {
      return;
    }

    this.turnShuttle(delta, now);
  }

  turnRelative(value: number, difference: number, now: number, resetInput: RelativeInputReset) {
    if (this.state.recording || this.state.mode !== "scrub" || !isFinite(value)
      || !isFinite(difference) || difference === 0) {
      return false;
    }

    if (value < 0.1 || value > 0.9) {
      resetInput(difference < 0 ? 0.9 : 0.1);
      return true;
    }

    this.state.position = value;
    this.state.lastMotionAt = now;
    this.state.moving = true;
    this.transport.setPosition(value);
    return true;
  }

  private turnShuttle(delta: number, now: number) {
    const direction = delta > 0 ? 1 : -1;
    const positionIndex = Math.max(0, Math.min(shuttleSelectorTags.length - 1,
      this.state.shuttlePositionIndex + direction));
    if (positionIndex === this.state.shuttlePositionIndex) return;

    const tag = shuttleSelectorTags[positionIndex];
    this.state.lastMotionAt = now;
    this.state.moving = true;

    if (this.state.shuttleActiveTag >= 0) {
      const previousTag = this.state.shuttleActiveTag;
      this.state.shuttleActiveTag = -1;
      this.transport.setShuttle(previousTag, 0);
    }

    this.state.shuttlePositionIndex = positionIndex;
    if (tag < 0) {
      this.state.shuttlePendingTag = -1;
      this.state.shuttleWaitCycles = 0;
      this.state.moving = false;
      this.state.lastMotionAt = 0;
    } else {
      if (this.state.shuttlePendingTag < 0) {
        this.state.shuttleWaitCycles = 2;
      }
      this.state.shuttlePendingTag = tag;
    }
  }

  idle(now: number) {
    if (!this.state.moving) return;
    if (this.state.recording) {
      this.release();
      return;
    }
    if (this.state.mode === "shuttle") {
      if (this.state.shuttlePendingTag < 0) {
        return;
      }
      this.state.shuttleWaitCycles--;
      if (this.state.shuttleWaitCycles <= 0) {
        const tag = this.state.shuttlePendingTag;
        this.state.shuttlePendingTag = -1;
        this.state.shuttleActiveTag = tag;
        this.transport.setShuttle(tag, 1);
      }
      return;
    }
    if (now - this.state.lastMotionAt >= this.options.idleTimeoutMs) {
      this.release();
    }
  }

  release() {
    const shuttleTag = this.state.shuttleActiveTag;
    this.state.shuttlePositionIndex = shuttleStopIndex;
    this.state.shuttleActiveTag = -1;
    this.state.shuttlePendingTag = -1;
    this.state.shuttleWaitCycles = 0;
    this.state.moving = false;
    this.state.lastMotionAt = 0;
    if (shuttleTag >= 0) this.transport.setShuttle(shuttleTag, 0);
  }
}