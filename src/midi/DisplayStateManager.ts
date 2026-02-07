import { LcdManager } from "./LcdManager";

/**
 * Represents the raw data to be displayed for a single channel
 */
export interface ChannelDisplayData {
  // Encoder (top row when not flipped) data
  encoder: {
    title1: string; // Parameter title (e.g., "Pan")
    title2: string; // Parameter name (e.g., "Pan Left-Right")
    displayValue: string; // Current value (e.g., "C")
  };

  // Fader (bottom row when not flipped) data
  fader: {
    title: string; // Track title (e.g., "Audio 01")
    valueTitle: string; // Track value title (e.g., "Volume")
    displayValue: string; // Current value (e.g., "-6.0 dB")
  };
}

/**
 * Global display elements that should be preserved across all pages
 */
export interface GlobalDisplayData {
  indicator1: string; // Bottom right indicator (e.g., "R" for recording)
  indicator2: string; // Top right indicator (e.g., "N" for navigation)
  trackNames: Map<number, { title: string; valueTitle: string }>; // Channel track names
}

/**
 * State for managing what should be displayed per page
 */
export interface PageDisplayState {
  isActive: boolean;
  areFadersBound: boolean;
  areKnobsBound: boolean;
  displayChannelValueName: boolean;
  displayParameterTitle: boolean;
  areDisplayRowsFlipped: boolean;
  isValueDisplayModeActive: boolean;

  // Per-channel data for this page
  channels: Map<number, ChannelDisplayData>;

  // Local display modes per channel (e.g., temporary value display)
  localValueModeActive: Map<number, boolean>;
}

/**
 * Master fader display data (separate from channels)
 */
export interface MasterFaderDisplayData {
  parameterName: string;
  displayValue: string;
  isTouched: boolean;
}

/**
 * Central state manager for all display data and rendering logic.
 *
 * This class:
 * - Stores raw title and value information per page and channel
 * - Maintains global state like track names and indicators
 * - Handles abbreviation and formatting before sending to LcdManager
 * - Provides methods to update state from callbacks and trigger refreshes
 */
export class DisplayStateManager {
  // Page-specific state
  private pageStates: Map<string, PageDisplayState> = new Map();

  // Global state shared across all pages
  private globalData: GlobalDisplayData = {
    indicator1: '',
    indicator2: '',
    trackNames: new Map(),
  };

  // Master fader state
  private masterFaderData: MasterFaderDisplayData = {
    parameterName: '',
    displayValue: '',
    isTouched: false,
  };

  // Current active page ID
  private activePageId: string = '';

  constructor(private lcdManager: LcdManager) {}

  /**
   * Initialize a new page with default state
   */
  initializePage(pageId: string): void {
    if (!this.pageStates.has(pageId)) {
      this.pageStates.set(pageId, {
        isActive: false,
        areFadersBound: false,
        areKnobsBound: false,
        displayChannelValueName: false,
        displayParameterTitle: false,
        areDisplayRowsFlipped: false,
        isValueDisplayModeActive: true,
        channels: new Map(),
        localValueModeActive: new Map(),
      });
    }
  }

  /**
   * Set the active page
   */
  setActivePage(context: MR_ActiveDevice, pageId: string): void {
    // Deactivate previous page
    if (this.activePageId && this.pageStates.has(this.activePageId)) {
      const prevState = this.pageStates.get(this.activePageId)!;
      prevState.isActive = false;
    }

    // Activate new page
    this.activePageId = pageId;
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;
    state.isActive = true;

    // Refresh display for new page
    this.refreshAllChannels(context);
  }

  /**
   * Get the current active page state
   */
  private getActivePageState(): PageDisplayState | null {
    if (!this.activePageId) return null;
    return this.pageStates.get(this.activePageId) || null;
  }

  /**
   * Update encoder title information for a channel
   */
  updateEncoderTitle(
    context: MR_ActiveDevice,
    pageId: string,
    channelIndex: number,
    title1: string,
    title2: string
  ): void {
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;

    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title: '', valueTitle: '', displayValue: '' },
      });
    }

    const channelData = state.channels.get(channelIndex)!;
    channelData.encoder.title1 = title1;
    channelData.encoder.title2 = title2;

    // Mark knobs as bound when we receive a title
    state.areKnobsBound = true;

    // Refresh the display for this channel
    if (pageId === this.activePageId) {
      this.refreshEncoderDisplay(context, channelIndex);
    }
  }

  /**
   * Update encoder display value for a channel
   */
  updateEncoderValue(
    context: MR_ActiveDevice,
    pageId: string,
    channelIndex: number,
    displayValue: string
  ): void {
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;

    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title: '', valueTitle: '', displayValue: '' },
      });
    }

    const channelData = state.channels.get(channelIndex)!;
    channelData.encoder.displayValue = displayValue;

    // Temporarily activate local value mode for this channel
    state.localValueModeActive.set(channelIndex, true);

    // Refresh the display for this channel
    if (pageId === this.activePageId) {
      this.refreshEncoderDisplay(context, channelIndex);
    }
  }

  /**
   * Clear local value mode for a channel (called after timeout)
   */
  clearLocalValueMode(context: MR_ActiveDevice, pageId: string, channelIndex: number): void {
    const state = this.pageStates.get(pageId);
    if (state) {
      state.localValueModeActive.set(channelIndex, false);

      // Refresh the display for this channel
      if (pageId === this.activePageId) {
        this.refreshEncoderDisplay(context, channelIndex);
      }
    }
  }

  /**
   * Update fader display value for a channel
   */
  updateFaderValue(
    context: MR_ActiveDevice,
    pageId: string,
    channelIndex: number,
    displayValue: string
  ): void {
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;

    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title: '', valueTitle: '', displayValue: '' },
      });
    }

    const channelData = state.channels.get(channelIndex)!;
    channelData.fader.displayValue = displayValue;

    // Note: We don't automatically show fader values on the display
    // They're stored for potential future use (e.g., when fader is touched)
  }

  /**
   * Update fader track title for a channel (global state)
   */
  updateTrackTitle(
    context: MR_ActiveDevice,
    channelIndex: number,
    title: string,
    valueTitle: string
  ): void {
    // Track titles are global - store them separately
    this.globalData.trackNames.set(channelIndex, { title, valueTitle });

    // Update all pages that have this channel
    this.pageStates.forEach((state, pageId) => {
      if (state.channels.has(channelIndex)) {
        const channelData = state.channels.get(channelIndex)!;
        channelData.fader.title = title;
        channelData.fader.valueTitle = valueTitle;
      } else {
        state.channels.set(channelIndex, {
          encoder: { title1: '', title2: '', displayValue: '' },
          fader: { title, valueTitle, displayValue: '' },
        });
      }

      // Mark faders as bound when we receive a track title
      state.areFadersBound = true;
    });

    // Refresh the display for this channel on the active page
    if (this.activePageId) {
      this.refreshFaderDisplay(context, channelIndex);
    }
  }

  /**
   * Update global indicator text
   */
  updateIndicator1(context: MR_ActiveDevice, text: string): void {
    this.globalData.indicator1 = text;
    this.lcdManager.setIndicator1Text(context, text);
  }

  /**
   * Update global indicator text
   */
  updateIndicator2(context: MR_ActiveDevice, text: string): void {
    this.globalData.indicator2 = text;
    this.lcdManager.setIndicator2Text(context, text);
  }

  /**
   * Update page display settings
   */
  updatePageSettings(
    context: MR_ActiveDevice,
    pageId: string,
    settings: Partial<Omit<PageDisplayState, 'channels' | 'localValueModeActive'>>
  ): void {
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;

    Object.assign(state, settings);

    // If this is the active page, refresh the display
    if (pageId === this.activePageId) {
      this.refreshAllChannels(context);
    }
  }

  /**
   * Update master fader data
   */
  updateMasterFader(
    context: MR_ActiveDevice,
    data: Partial<MasterFaderDisplayData>
  ): void {
    Object.assign(this.masterFaderData, data);

    // Display master fader info if touched
    if (this.masterFaderData.isTouched) {
      this.lcdManager.setTextLine(context, 1, this.masterFaderData.parameterName);
      this.lcdManager.setTextLine(context, 0, this.masterFaderData.displayValue);
    }
  }

  /**
   * Refresh encoder display for a specific channel
   */
  private refreshEncoderDisplay(context: MR_ActiveDevice, channelIndex: number): void {
    const state = this.getActivePageState();
    if (!state) return;

    const channelData = state.channels.get(channelIndex);
    if (!channelData) return;

    const row = +state.areDisplayRowsFlipped ? 1 : 0;

    // Determine what to display
    let displayText = '';

    if (state.areKnobsBound) {
      const isLocalValueMode = state.localValueModeActive.get(channelIndex) || false;
      const isGlobalValueMode = state.isValueDisplayModeActive;

      if (isLocalValueMode || isGlobalValueMode) {
        // Show value
        displayText = this.abbreviateAndCenter(channelData.encoder.displayValue);
      } else {
        // Show parameter name or title
        const parameterText = state.displayParameterTitle
          ? channelData.encoder.title1
          : channelData.encoder.title2;
        displayText = this.abbreviateAndCenter(parameterText);
      }
    }

    this.lcdManager.setChannelText(context, row, channelIndex, displayText);
  }

  /**
   * Refresh fader display for a specific channel
   */
  private refreshFaderDisplay(context: MR_ActiveDevice, channelIndex: number): void {
    const state = this.getActivePageState();
    if (!state) return;

    // Use global track names
    const trackData = this.globalData.trackNames.get(channelIndex);
    if (!trackData) return;

    const row = state.areDisplayRowsFlipped ? 0 : 1;

    // Determine what to display
    let displayText = '';

    if (state.areFadersBound) {
      displayText = state.displayChannelValueName
        ? this.abbreviate(trackData.valueTitle)
        : this.abbreviate(trackData.title);
    }

    this.lcdManager.setChannelText(context, row, channelIndex, displayText);
  }

  /**
   * Refresh display for all channels
   */
  refreshAllChannels(context: MR_ActiveDevice): void {
    for (let i = 0; i < 8; i++) {
      this.refreshEncoderDisplay(context, i);
      this.refreshFaderDisplay(context, i);
    }

    // Restore indicators
    this.lcdManager.restoreCurrentIndicators(context);
  }

  /**
   * Clear the entire display
   */
  clearDisplay(context: MR_ActiveDevice): void {
    this.lcdManager.clearDisplays(context);
  }

  /**
   * Abbreviate a string to fit channel width
   */
  private abbreviate(text: string): string {
    return LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(text));
  }

  /**
   * Abbreviate and center a string
   */
  private abbreviateAndCenter(text: string): string {
    return LcdManager.centerString(
      LcdManager.abbreviateString(LcdManager.stripNonAsciiCharacters(text))
    );
  }

  /**
   * Get current page state for debugging
   */
  getPageState(pageId: string): PageDisplayState | undefined {
    return this.pageStates.get(pageId);
  }

  /**
   * Get global data for debugging
   */
  getGlobalData(): GlobalDisplayData {
    return this.globalData;
  }
}
