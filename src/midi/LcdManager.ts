// @ts-expect-error No type defs available
import abbreviate from "abbreviate";
import { IconPlatformMplus } from "../icon_elements";

export class LcdManager {
  static readonly channelWidth = 6;

  // Track current indicator state to restore after display updates
  private currentIndicator1 = '';
  private currentIndicator2 = '';

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
    var fullText = (text + blank).slice(0, 56) // ensure to always clear the entire row

    this.sendText(context, row * 56, fullText);

    // Immediately restore indicators after ANY text line write
    // Row 0 affects position 55 (Indicator2Text)
    // Row 1 affects position 111 (Indicator1Text)
    if (row === 0 && this.currentIndicator2) {
      this.sendText(context, 55, this.currentIndicator2);
    } else if (row === 1 && this.currentIndicator1) {
      this.sendText(context, 111, this.currentIndicator1);
    }
  }

  setChannelText(context: MR_ActiveDevice, row: number, channelIndex: number, text: string) {
    while (text.length < 7) {
      text += " ";
    }

    this.sendText(context, row * 56 + (channelIndex % 8) * 7, text);

    // Immediately restore indicators if we just wrote to channel 7
    // Channel 7 in Row 0 ends at position 55 (Indicator2Text)
    // Channel 7 in Row 1 ends at position 111 (Indicator1Text)
    if (channelIndex === 7) {
      if (row === 0 && this.currentIndicator2) {
        this.sendText(context, 55, this.currentIndicator2);
      } else if (row === 1 && this.currentIndicator1) {
        this.sendText(context, 111, this.currentIndicator1);
      }
    }
  }

  setIndicator1Text(context: MR_ActiveDevice, text: string) {
    this.currentIndicator1 = text;
    this.sendText(context, 111, text);
  }

  setIndicator2Text(context: MR_ActiveDevice, text: string) {
    this.currentIndicator2 = text;
    this.sendText(context, 55, text);
  }

  /**
   * Clear both indicators
   */
  clearIndicators(context: MR_ActiveDevice) {
    this.currentIndicator1 = '';
    this.currentIndicator2 = '';
    this.sendText(context, 111, ' ');
    this.sendText(context, 55, ' ');
  }

  /**
   * Restores both indicator texts. Call this after batch updates to ensure indicators survive.
   */
  restoreIndicators(context: MR_ActiveDevice, indicator1?: string, indicator2?: string) {
    if (indicator1 !== undefined) {
      this.setIndicator1Text(context, indicator1);
    }
    if (indicator2 !== undefined) {
      this.setIndicator2Text(context, indicator2);
    }
  }

  /**
   * Restores the current indicators without arguments. Use after display updates.
   */
  restoreCurrentIndicators(context: MR_ActiveDevice) {
    if (this.currentIndicator1) {
      this.sendText(context, 111, this.currentIndicator1);
    }
    if (this.currentIndicator2) {
      this.sendText(context, 55, this.currentIndicator2);
    }
  }

  clearDisplays(context: MR_ActiveDevice) {
    this.sendText(context, 0, LcdManager.makeSpaces(112));
  }
}
