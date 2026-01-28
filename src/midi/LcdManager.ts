// @ts-expect-error No type defs available
import abbreviate from "abbreviate";
import { IconPlatformMplus } from "../icon_elements";

export class LcdManager {
  static readonly channelWidth = 6;

  /**
   * Strips any non-ASCII character from the provided string, since devices only support ASCII.
   **/
  static stripNonAsciiCharacters(input: string) {
    return input.replace(/[^\x00-\x7F]/g, "");
  }

  /**
   * Given a <= `LcdManager.channelWidth` characters long string, returns a left-padded version of
   * it that appears centered on a `LcdManager.channelWidth`-character display.
   */
  static centerString(input: string) {
    if (input.length >= LcdManager.channelWidth) {
      return input;
    }

    return LcdManager.makeSpaces(Math.floor((LcdManager.channelWidth - input.length) / 2)) + input;
  }

  /**
   * Given a string, returns an abbreviated version of it consisting of at most
   * `LcdManager.channelWidth` characters.
   */
  static abbreviateString(input: string) {
    if (input.length < LcdManager.channelWidth) {
      return input;
    }

    return abbreviate(input, { length: LcdManager.channelWidth });
  }

  private static asciiStringToCharArray(input: string) {
    const chars = [];
    for (let i = 0; i < input.length; i++) {
      chars.push(input.charCodeAt(i));
    }
    return chars;
  }

  private static makeSpaces(length: number) {
    return Array(length + 1).join(" ");
  }

  constructor(private device: IconPlatformMplus) {}

  private sendText(context: MR_ActiveDevice, startIndex: number, text: string) {
    const chars = LcdManager.asciiStringToCharArray(text.slice(0, 111));
    this.device.midiPortPair.output.sendSysex(context, [0x12, startIndex, ...chars]);
  }

  setTextLine(context: MR_ActiveDevice, row: number, text: string) {
    var blank = Array(56).join(" ")
    var text = (text + blank).slice(0, 56) // ensure to always clear the entire row
    this.sendText(context, row * 56, text);
  }

  setChannelText(context: MR_ActiveDevice, row: number, channelIndex: number, text: string) {
    while (text.length < 7) {
      text += " ";
    }
    this.sendText(context, row * 56 + (channelIndex % 8) * 7, text);
  }

  setIndicator1Text(context: MR_ActiveDevice, text: string) {
    this.sendText(context, 111, text);
  }

  setIndicator2Text(context: MR_ActiveDevice, text: string) {
    this.sendText(context, 55, text);
  }

  clearDisplays(context: MR_ActiveDevice) {
    this.sendText(context, 0, LcdManager.makeSpaces(112));
  }
}
