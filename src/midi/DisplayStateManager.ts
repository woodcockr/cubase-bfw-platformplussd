import { LcdManager } from "./LcdManager";
import { DisplayLineConfiguration, LineDisplayMode } from "../config/bindingConfig";

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

  // Display line configuration for this page
  displayLineConfiguration?: DisplayLineConfiguration;

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
 * - Stores raw title and value information per page and channel (page-specific)
 * - Maintains global state like indicators
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
  };

  // Master fader state
  private masterFaderData: MasterFaderDisplayData = {
    parameterName: '',
    displayValue: '',
    isTouched: false,
  };

  // Current active page ID
  private activePageId: string = '';

  // Current display line toggle state
  private displayLineToggleActive: boolean = false;

  // Flag to suppress refreshes during page activation
  private isActivatingPage: boolean = false;

  constructor(private lcdManager: LcdManager) { }

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
        isValueDisplayModeActive: false,
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

    // Set flag to suppress refreshes while page activates and callbacks populate data
    this.isActivatingPage = true;

    // Activate new page
    this.activePageId = pageId;
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;
    state.isActive = true;

    // Clear all channel data for fresh start - callbacks will repopulate
    // TODO: Fairly certain this is incorrect - the callbacks will not always repopulate and we want to preserve existing data. Need to rethink this logic.
    // state.channels.clear();
    // state.localValueModeActive.clear();

    // Clear displays for all channels
    // TODO: similarly to much reliance on the callbacks to populate data - refresh with the stored data instead and then let the callbacks update as needed? Need to rethink this logic.
    // for (let i = 0; i < 8; i++) {
    //   const row0 = state.areDisplayRowsFlipped ? 1 : 0;
    //   const row1 = state.areDisplayRowsFlipped ? 0 : 1;
    //   this.lcdManager.setChannelText(context, row0, i, '');
    //   this.lcdManager.setChannelText(context, row1, i, '');
    // }
  }

  /**
   * Complete page activation and enable display refreshes
   * Call this after all activation setup is complete
   */
  completePageActivation(context: MR_ActiveDevice): void {
    this.isActivatingPage = false;
    // Now that the flag is cleared, refresh to display all the data populated by callbacks
    this.refreshAllChannels(context);
  }

  /**
   * Check if a page is currently being activated
   */
  getIsActivatingPage(): boolean {
    return this.isActivatingPage;
  }

  /**
   * Get the current active page state
   */
  private getActivePageState(): PageDisplayState | null {
    if (!this.activePageId) return null;
    return this.pageStates.get(this.activePageId) || null;
  }

  /**
   * Set the display line toggle state and refresh if active page exists
   */
  setDisplayLineToggle(context: MR_ActiveDevice, active: boolean): void {
    const wasActive = this.displayLineToggleActive;
    this.displayLineToggleActive = active;

    // Only refresh if toggle state actually changed (and not during page activation)
    if (wasActive !== active && this.activePageId && !this.isActivatingPage) {
      this.refreshAllChannels(context);
    }
  }

  /**
   * Get the current display line toggle state
   */
  getDisplayLineToggle(): boolean {
    return this.displayLineToggleActive;
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

    // Refresh the display for this channel (unless we're still activating)
    if (pageId === this.activePageId && !this.isActivatingPage) {
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
    // TODO this.initializePage(pageId);
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

    // Refresh the display for this channel (unless we're still activating)
    if (pageId === this.activePageId && !this.isActivatingPage) {
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

      // Refresh the display for this channel (unless we're still activating)
      if (pageId === this.activePageId && !this.isActivatingPage) {
        this.refreshEncoderDisplay(context, channelIndex);
        this.refreshFaderDisplay(context, channelIndex);
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
    // TODO This seems wrong
    // this.initializePage(pageId);

    const state = this.pageStates.get(pageId)!;

    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title: '', valueTitle: '', displayValue: '' },
      });
    }

    const channelData = state.channels.get(channelIndex)!;
    channelData.fader.displayValue = displayValue;

    // Temporarily activate local value mode for this channel
    state.localValueModeActive.set(channelIndex, true);

    // Refresh the display for this channel (unless we're still activating)
    if (pageId === this.activePageId && !this.isActivatingPage) {
      this.refreshFaderDisplay(context, channelIndex);
    }
  }

  /**
   * Update fader track title for a channel (page-specific)
   */
  updateTrackTitle(
    context: MR_ActiveDevice,
    channelIndex: number,
    title: string,
    valueTitle: string
  ): void {
    // Only update the ACTIVE page's track titles
    // Each page can bind scribbleStrip to different things (mixer tracks, control room, etc.)
    if (!this.activePageId) return;

    const state = this.pageStates.get(this.activePageId);
    if (!state) return;

    console.log(`Updating track title for ACTIVE page ${this.activePageId} channel ${channelIndex}: "${title}" / "${valueTitle}"`);

    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title, valueTitle, displayValue: '' },
      });
    } else {
      const channelData = state.channels.get(channelIndex)!;
      channelData.fader.title = title;
      channelData.fader.valueTitle = valueTitle;
    }

    // Refresh the display for this channel (unless we're still activating)
    if (!this.isActivatingPage) {
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

    // If this is the active page, refresh the display (unless we're still activating)
    if (pageId === this.activePageId && !this.isActivatingPage) {
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
        // If page has display line configuration, use it
        if (state.displayLineConfiguration) {
          displayText = this.getDisplayTextForLine(
            context,
            0 as const,
            channelData,
            state.displayLineConfiguration,
            this.displayLineToggleActive
          );
        } else {
          // Fall back to legacy logic
          // Show parameter name or title
          const parameterText = state.displayParameterTitle
            ? channelData.encoder.title1
            : channelData.encoder.title2;
          displayText = this.abbreviateAndCenter(parameterText);
        }
      }
      console.log(`Displaying encoder value for channel ${channelIndex}: "${displayText}" (local: ${isLocalValueMode}, global: ${isGlobalValueMode})`);

      this.lcdManager.setChannelText(context, row, channelIndex, displayText);
    }
  }

  /**
   * Refresh fader display for a specific channel
   */
  private refreshFaderDisplay(context: MR_ActiveDevice, channelIndex: number): void {
    const state = this.getActivePageState();
    if (!state) return;

    const channelData = state.channels.get(channelIndex);
    if (!channelData) return;

    const row = state.areDisplayRowsFlipped ? 0 : 1;

    // Determine what to display
    let displayText = '';

    if (state.areFadersBound) {
      const isLocalValueMode = state.localValueModeActive.get(channelIndex) || false;
      const isGlobalValueMode = state.isValueDisplayModeActive;
      // If page has display line configuration, use it
      if (isLocalValueMode || isGlobalValueMode) {
        // Show value
        displayText = this.abbreviateAndCenter(channelData.fader.displayValue);
      } else {
        if (state.displayLineConfiguration) {
            displayText = this.getDisplayTextForLine(
              context,
              1 as const,
              channelData,
              state.displayLineConfiguration,
              this.displayLineToggleActive
            );
        } else {
          // Fall back to legacy logic using page-specific channel data
          displayText = state.displayChannelValueName
            ? this.abbreviateAndCenter(channelData.fader.valueTitle)
            : this.abbreviateAndCenter(channelData.fader.title);
        }
    }
    console.log(`Displaying fader value for channel ${channelIndex}: "${displayText}" (local: ${isLocalValueMode}, global: ${isGlobalValueMode})`);

    this.lcdManager.setChannelText(context, row, channelIndex, displayText);
  }
}

  /**
   * Refresh display for all channels
   */
  refreshAllChannels(context: MR_ActiveDevice): void {
    this.clearDisplay(context);
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
  // TODO Is this extra redirection really necessary? Should the DisplayStateManager just call the LcdManager method directly instead of having this passthrough?
  clearDisplay(context: MR_ActiveDevice): void {
    this.lcdManager.clearDisplays(context);
  }

  /**
   * Clear encoder row (Row 0) display for a specific channel
   */
  private clearEncoderDisplay(context: MR_ActiveDevice, channelIndex: number): void {
    const row = this.getActivePageState()?.areDisplayRowsFlipped ? 1 : 0;
    this.lcdManager.setChannelText(context, row, channelIndex, '');
  }
  /**
   * Get display text for a given line based on configuration and toggle state
   */
  private getDisplayTextForLine(
    context: MR_ActiveDevice,
    lineNum: 0 | 1,
    channelData: ChannelDisplayData,
    displayLineConfig?: DisplayLineConfiguration,
    displayLineToggleActive?: boolean
  ): string {
    if (!displayLineConfig) return '';

    // Determine which mode to use (default or toggled)
    const isToggled = displayLineToggleActive && displayLineConfig.toggleable;
    let mode: LineDisplayMode;

    if (lineNum === 0) {
      mode = isToggled && displayLineConfig.line0Toggle
        ? displayLineConfig.line0Toggle
        : displayLineConfig.line0Default;
    } else {
      mode = isToggled && displayLineConfig.line1Toggle
        ? displayLineConfig.line1Toggle
        : displayLineConfig.line1Default;
    }

    // Generate display text based on mode
    switch (mode) {
      case 'trackName':
        return this.abbreviate(channelData.fader.title);
      case 'faderValue':
        return this.abbreviateAndCenter(channelData.fader.displayValue);
      case 'encoderValue':
        return this.abbreviateAndCenter(channelData.encoder.displayValue);
      case 'parameterName':
        return this.abbreviateAndCenter(channelData.encoder.title2);
      case 'none':
        return '';
      default:
        return '';
    }
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
