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
  areDisplayRowsFlipped: boolean;
  isValueDisplayModeActive: boolean;

  // Display line configuration for this page
  displayLineConfiguration?: DisplayLineConfiguration;

  // Optional encoder title transform function (per-page custom logic)
  encoderTitleTransform?: (title1: string, title2: string) => string;

  // Optional fader title transform function (per-page custom logic)
  faderTitleTransform?: (title: string, valueTitle: string) => string;

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
  setActivePage(_context: MR_ActiveDevice, pageId: string): void {
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

  private ensureChannelData(state: PageDisplayState, channelIndex: number): ChannelDisplayData {
    if (!state.channels.has(channelIndex)) {
      state.channels.set(channelIndex, {
        encoder: { title1: '', title2: '', displayValue: '' },
        fader: { title: '', valueTitle: '', displayValue: '' },
      });
    }

    return state.channels.get(channelIndex)!;
  }

  private shouldRefreshPage(pageId: string): boolean {
    return pageId === this.activePageId && !this.isActivatingPage;
  }

  private getRowForControl(state: PageDisplayState, control: 'encoder' | 'fader'): 0 | 1 {
    if (control === 'encoder') {
      return (state.areDisplayRowsFlipped ? 1 : 0) as 0 | 1;
    }

    return (state.areDisplayRowsFlipped ? 0 : 1) as 0 | 1;
  }

  private refreshControlDisplay(
    context: MR_ActiveDevice,
    channelIndex: number,
    control: 'encoder' | 'fader'
  ): void {
    const state = this.getActivePageState();
    if (!state) return;

    const channelData = state.channels.get(channelIndex);
    if (!channelData) return;

    const isBound = control === 'encoder' ? state.areKnobsBound : state.areFadersBound;
    if (!isBound) return;

    const row = this.getRowForControl(state, control);
    const isLocalValueMode = state.localValueModeActive.get(channelIndex) || false;
    const isGlobalValueMode = state.isValueDisplayModeActive;
    let displayText = '';

    if (isLocalValueMode || isGlobalValueMode) {
      displayText = this.abbreviateAndCenter(
        control === 'encoder'
          ? channelData.encoder.displayValue
          : channelData.fader.displayValue
      );
    } else if (state.displayLineConfiguration) {
      displayText = this.getDisplayTextForLine(
        context,
        control === 'encoder' ? 0 : 1,
        channelData,
        state.displayLineConfiguration,
        this.displayLineToggleActive
      );
    }

    console.log(
      `Displaying ${control} value for channel ${channelIndex}: "${displayText}" (local: ${isLocalValueMode}, global: ${isGlobalValueMode})`
    );

    this.lcdManager.setChannelText(context, row, channelIndex, displayText);
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

    const channelData = this.ensureChannelData(state, channelIndex);
    channelData.encoder.title1 = title1;
    channelData.encoder.title2 = title2;

    // Refresh the display for this channel (unless we're still activating)
    if (this.shouldRefreshPage(pageId)) {
      this.refreshControlDisplay(context, channelIndex, 'encoder');
    }
  }

  /**
   * Update fader title for a channel
   */
  updateFaderTitle(
    context: MR_ActiveDevice,
    pageId: string,
    channelIndex: number,
    title: string,
    valueTitle: string
  ): void {
    this.initializePage(pageId);
    const state = this.pageStates.get(pageId)!;

    const channelData = this.ensureChannelData(state, channelIndex);
    channelData.fader.title = title;
    channelData.fader.valueTitle = valueTitle;

    // Refresh the display for this channel (unless we're still activating)
    if (this.shouldRefreshPage(pageId)) {
      this.refreshControlDisplay(context, channelIndex, 'fader');
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
    const state = this.pageStates.get(pageId)!;

    const channelData = this.ensureChannelData(state, channelIndex);
    channelData.encoder.displayValue = displayValue;

    // Temporarily activate local value mode for this channel
    state.localValueModeActive.set(channelIndex, true);

    // Refresh the display for this channel (unless we're still activating)
    if (this.shouldRefreshPage(pageId)) {
      this.refreshControlDisplay(context, channelIndex, 'encoder');
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
      if (this.shouldRefreshPage(pageId)) {
        this.refreshControlDisplay(context, channelIndex, 'encoder');
        this.refreshControlDisplay(context, channelIndex, 'fader');
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
    const state = this.pageStates.get(pageId)!;

    const channelData = this.ensureChannelData(state, channelIndex);
    channelData.fader.displayValue = displayValue;

    // Temporarily activate local value mode for this channel
    state.localValueModeActive.set(channelIndex, true);

    // Refresh the display for this channel (unless we're still activating)
    if (this.shouldRefreshPage(pageId)) {
      this.refreshControlDisplay(context, channelIndex, 'fader');
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

    const channelData = this.ensureChannelData(state, channelIndex);
    channelData.fader.title = title;
    channelData.fader.valueTitle = valueTitle;

    // Refresh the display for this channel (unless we're still activating)
    if (!this.isActivatingPage) {
      this.refreshControlDisplay(context, channelIndex, 'fader');
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
    this.refreshControlDisplay(context, channelIndex, 'encoder');
  }

  /**
   * Refresh fader display for a specific channel
   */
  private refreshFaderDisplay(context: MR_ActiveDevice, channelIndex: number): void {
    this.refreshControlDisplay(context, channelIndex, 'fader');
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
  /**
   * Get display text for a given line based on configuration and toggle state
   */
  private getDisplayTextForLine(
    _context: MR_ActiveDevice,
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
      case 'faderValueTitle':
        // Use custom transform if available, otherwise use valueTitle
        const faderTitle = displayLineConfig.faderTitleTransform
          ? displayLineConfig.faderTitleTransform(channelData.fader.title, channelData.fader.valueTitle)
          : channelData.fader.valueTitle;
        return this.abbreviateAndCenter(faderTitle);
      case 'faderValue':
        return this.abbreviateAndCenter(channelData.fader.displayValue);
      case 'encoderValue':
        return this.abbreviateAndCenter(channelData.encoder.displayValue);
      case 'parameterName':
        console.log(`Displaying encoder title1/title2 for channel: "${channelData.encoder.title1}/${channelData.encoder.title2}"`);
        // Use custom transform if available, otherwise use title2
        const encoderTitle = displayLineConfig.encoderTitleTransform
          ? displayLineConfig.encoderTitleTransform(channelData.encoder.title1, channelData.encoder.title2)
          : channelData.encoder.title2;
        return this.abbreviateAndCenter(encoderTitle);
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
