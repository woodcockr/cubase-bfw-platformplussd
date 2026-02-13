/**
 * Type definitions for the binding configuration system.
 * Provides a declarative schema for defining subpage bindings.
 */

/**
 * Main binding configuration for a subpage
 */
export interface BindingConfig {
  id: string;
  name: string;
  description?: string;
  masterButton?: string; // Key in device.master.buttons (e.g., "subPageMixer")
  hostAccessor?: string; // Type of host accessor to create
  hostAccessorFactory?: HostAccessorFactory;
  bindings: BindingDefinitions;
  displayBindings?: DisplayBindings;
  displayLineConfiguration?: DisplayLineConfiguration; // Per-page display layout
  activation?: ActivationConfig;
  customHandlers?: CustomHandlerDefinition[]; // Custom handlers for bindings
}

/**
 * Multi-subpage configuration (for modules with multiple subpages)
 */
export interface MultiSubpageConfig {
  id: string;
  subpages: BindingConfig[];
  masterButtons?: string[]; // Master button bindings for subpage switching
}

/**
 * Custom handler definition for value binding events
 */
export interface CustomHandlerDefinition {
  name: string;
  type: 'valueChange' | 'activation' | 'deactivation';
  handlerPath?: string; // Path to handler function if not inline
}

/**
 * Factory for creating host accessors
 */
export interface HostAccessorFactory {
  type: 'mixerBankZone' | 'controlRoom' | 'custom';
  parameters?: string[];
}

/**
 * All binding definitions for a subpage
 */
export interface BindingDefinitions {
  perChannel?: PerChannelBinding[]; // Bindings applied to all channels in a loop
  perChannelMulti?: PerChannelMultiBinding[]; // Multiple bindings per channel (complex patterns)
  indexedChannels?: IndexedChannelBinding; // Indexed range bindings with surface offsets
  fixedChannels?: FixedChannelBinding[]; // Bindings for specific channel indices
  fixedIndexBindings?: FixedIndexBinding[]; // Individual bindings at specific indices
  variableChannels?: VariableChannelBinding; // Bindings for a dynamic range of channels
  commandBindings?: CommandBinding[]; // Non-value command bindings
  dummyBindings?: string[]; // Surface control paths to bind to dummy (all channels)
  dummyChannelRanges?: DummyChannelRange[]; // Multiple ranges of dummy bindings
}

/**
 * Per-page display binding presence
 */
export interface DisplayBindings {
  knobsBound: boolean;
  fadersBound: boolean;
}

/**
 * Display line configuration for per-page display layout
 * Defines what content should display on each line (encoder row and fader row)
 *
 */
export type LineDisplayMode = 'trackName' | 'faderValue' | 'encoderValue' | 'parameterName' | 'none';

export interface DisplayLineConfiguration {
  /**
   * Default line 0 (encoder row) display mode when display toggle is off
   */
  line0Default: LineDisplayMode;

  /**
   * What line 0 should show when display toggle is on (if different from default)
   * If not specified, toggle does not affect line 0
   */
  line0Toggle?: LineDisplayMode;

  /**
   * Default line 1 (fader row) display mode when display toggle is off
   */
  line1Default: LineDisplayMode;

  /**
   * What line 1 should show when display toggle is on (if different from default)
   * If not specified, toggle does not affect line 1
   */
  line1Toggle?: LineDisplayMode;

  /**
   * Whether this page supports toggling display modes
   * If false, display is always shown in default mode
   */
  toggleable: boolean;
}

/**
 * Single binding definition applied per channel
 */
export interface PerChannelBinding {
  id: string; // Unique identifier within subpage
  surface: string; // Path to surface control (e.g., "fader.mSurfaceValue")
  hostValue?: string; // Path to host value (e.g., "bankChannel.mValue.mVolume")
  options?: BindingOptions;
}

/**
 * Multiple bindings per channel for complex patterns
 * Allows defining multiple surface→host pairs in a single config item
 */
export interface PerChannelMultiBinding {
  id: string;
  bindings: {
    surface: string;
    hostValue: string;
    hostValueKey?: string; // Reuse resolved host value per channel
    options?: BindingOptions;
    duplicate?: boolean; // For workaround bindings (e.g., C12.0.60+ bug)
  }[];
}

/**
 * Indexed channel binding group (e.g., EQ bands)
 * Uses a limited range and supports surface index offsets.
 */
export interface IndexedChannelBinding {
  range: ChannelRange;
  bindings: {
    surface: string;
    hostValue: string;
    surfaceIndexOffset?: number; // e.g., +4 for second bank of controls
    options?: BindingOptions;
    duplicate?: boolean;
  }[];
}

/**
 * Individual binding at a specific channel index
 * Useful for fixed-position controls like "channel 4 solo button"
 */
export interface FixedIndexBinding {
  id: string;
  channelIndex: number;
  surface: string;
  hostValue?: string;
  command?: {
    category: string;
    action: string;
  };
  options?: BindingOptions;
  duplicate?: boolean; // Create a second identical binding (workarounds)
}

/**
 * Command binding definition (for non-value bindings)
 */
export interface CommandBinding {
  id: string;
  surface: string;
  command: {
    category: string; // e.g., "Automation"
    action: string; // e.g., "Show Used Automation (Selected Tracks)"
  };
  options?: BindingOptions;
}

/**
 * Binding options for customizing value binding behavior
 */
export interface BindingOptions {
  takeOverMode?: 'jump' | 'pickup';
  toggle?: boolean;
  customHandler?: string; // Reference to custom handler function name
}

/**
 * Bindings fixed to specific channel indices
 */
export interface FixedChannelBinding {
  channelIndex: number;
  bindings: PerChannelBinding[];
}

/**
 * Bindings applied to a dynamic range of channels
 */
export interface VariableChannelBinding {
  range: ChannelRange;
  hostValueFactory: string; // Function path like "controlRoom.getCueChannelByIndex"
  bindings: PerChannelBinding[];
  dummyBindings?: string[]; // Optional dummy bindings for channels beyond range
  dummyRangeMax?: number | string; // Max range for dummy bindings (default device.numStrips)
}

/**
 * Defines a range of channels
 */
export interface ChannelRange {
  start: number;
  end?: string; // Dynamic property name like "maxCueSends"
  maxValue: number | string; // Either fixed number or device property like "device.numStrips"
}

/**
 * Range of channels to bind to dummy controls
 */
export interface DummyChannelRange {
  range: ChannelRange;
  bindings: string[]; // Surface control paths (e.g., "buttons.solo.mSurfaceValue")
}

/**
 * Activation handler configuration with MIDI output support
 */
export interface ActivationConfig {
  logMessage?: string;
  globalVariables?: GlobalVariableConfig[];
  midiOutput?: MIDIOutputConfig; // MIDI CC output on activation
  lcdTextLine0?: string; // LCD text for line 0 on activation
}

/**
 * Global variable configuration for activation
 */
export interface GlobalVariableConfig {
  name: string; // Variable name in GlobalBooleanVariables
  value?: boolean; // Value to set
  action?: 'toggle' | 'set'; // Action to perform
}

/**
 * MIDI output configuration for activation handlers
 * Defines MIDI CC messages to send when subpage activates/deactivates
 */
export interface MIDIOutputConfig {
  onActivate?: {
    status: number; // MIDI status byte (e.g., 0x90)
    data1: number; // MIDI data1 (e.g., note/cc)
    data2?: number; // MIDI data2 (e.g., value/velocity)
  }[];
  onDeactivate?: {
    status: number;
    data1: number;
    data2?: number;
  }[];
}

/**
 * Configuration collection
 */
export interface BindingConfigCollection {
  subpages: BindingConfig[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
