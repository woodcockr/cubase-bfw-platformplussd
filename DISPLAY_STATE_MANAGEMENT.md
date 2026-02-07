# Display State Management Architecture

## Overview

The MIDI Remote API's callback system (`onTitleChange`, `onSurfaceValueChange`, `onActivate`) operates asynchronously, with callbacks being triggered per-channel and per-value independently. These callbacks are **not** triggered by page activation or page changes, which means that simply updating the display in callbacks often fails to maintain accurate state across page transitions.

To address this architectural challenge, we have implemented a centralized state management system that:

1. **Stores raw display data** for each page independently
2. **Maintains global state** (track names, indicators) that persists across all pages
3. **Handles abbreviation and formatting** before sending to the display
4. **Provides reliable display updates** regardless of callback timing

## Architecture Components

### 1. DisplayStateManager

**Location:** `src/midi/DisplayStateManager.ts`

The `DisplayStateManager` class is the central hub for all display state and rendering logic.

#### Key Responsibilities:

- **Per-Page State Management**: Stores raw title and value information for each page
- **Global State Management**: Maintains track names and indicators that are shared across all pages
- **Display Rendering**: Abbreviates and formats data before sending to `LcdManager`
- **State Propagation**: Updates display when state changes occur

#### Data Structures:

##### ChannelDisplayData
```typescript
interface ChannelDisplayData {
  // Encoder (top row when not flipped) data
  encoder: {
    title1: string;      // Parameter title (e.g., "Pan")
    title2: string;      // Parameter name (e.g., "Pan Left-Right")
    displayValue: string; // Current value (e.g., "C")
  };

  // Fader (bottom row when not flipped) data
  fader: {
    title: string;       // Track title (e.g., "Audio 01")
    valueTitle: string;  // Track value title (e.g., "Volume")
    displayValue: string; // Current value (e.g., "-6.0 dB")
  };
}
```

##### PageDisplayState
```typescript
interface PageDisplayState {
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
```

##### GlobalDisplayData
```typescript
interface GlobalDisplayData {
  indicator1: string; // Bottom right indicator (e.g., "R" for recording)
  indicator2: string; // Top right indicator (e.g., "N" for navigation)
  trackNames: Map<number, { title: string; valueTitle: string }>; // Channel track names
}
```

#### Key Methods:

**State Update Methods:**
- `updateEncoderTitle()` - Updates encoder parameter titles from `onTitleChange`
- `updateEncoderValue()` - Updates encoder display values from `onDisplayValueChange`
- `updateFaderValue()` - Updates fader display values from `onDisplayValueChange`
- `updateTrackTitle()` - Updates track names (global state)
- `updateIndicator1()`, `updateIndicator2()` - Updates global indicators
- `updatePageSettings()` - Updates page display configuration
- `updateMasterFader()` - Updates master fader state

**Display Refresh Methods:**
- `refreshEncoderDisplay()` - Refreshes encoder display for a specific channel
- `refreshFaderDisplay()` - Refreshes fader display for a specific channel
- `refreshAllChannels()` - Refreshes entire display
- `setActivePage()` - Changes active page and refreshes display

**Utility Methods:**
- `clearLocalValueMode()` - Clears temporary value display mode after timeout
- `abbreviate()` - Shortens text to fit channel width
- `abbreviateAndCenter()` - Shortens and centers text

### 2. Integration with Callbacks

**Location:** `src/midi/binding.ts`

The binding layer has been refactored to use `DisplayStateManager` instead of individual `ContextStateVariable` instances.

#### Encoder Callbacks:

```typescript
channel.encoder.mEncoderValue.mOnDisplayValueChange = (context, value) => {
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updateEncoderValue(context, pageId, channelIndex, value);

  // Clear local value mode after 1 second
  setTimeout(context, `clearLocalValueMode${channelIndex}`, (context) => {
    const pageId = globalBooleanVariables.currentPageId.get(context);
    device.displayStateManager.clearLocalValueMode(context, pageId, channelIndex);
  }, 1);
};

channel.encoder.mEncoderValue.mOnTitleChange = (context, title1, title2) => {
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updateEncoderTitle(context, pageId, channelIndex, title1, title2);
};
```

#### Fader Callbacks:

```typescript
channel.scribbleStrip.trackTitle.mOnTitleChange = (context, title, valueTitle) => {
  // Track titles are global - stored separately and available to all pages
  device.displayStateManager.updateTrackTitle(context, channelIndex, title, valueTitle);
};

channelFader.mSurfaceValue.mOnDisplayValueChange = (context, value, units) => {
  const displayValue = units ? `${value} ${units}` : value;
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updateFaderValue(context, pageId, channelIndex, displayValue);
};
```

#### Global Setting Callbacks:

```typescript
globalBooleanVariables.isValueDisplayModeActive.addOnChangeCallback((context, value) => {
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updatePageSettings(context, pageId, {
    isValueDisplayModeActive: value,
  });
});

globalBooleanVariables.refreshDisplay.addOnChangeCallback((context) => {
  device.displayStateManager.refreshAllChannels(context);
});
```

### 3. Page Activation

**Location:** `src/config/bindingCreator.ts`, `src/shift.ts`, `src/midi.ts`

Each page's `mOnActivate` handler has been enhanced to:

1. Set the current page ID in global state
2. Initialize the page in `DisplayStateManager`
3. Mark the page as active
4. Update page-specific display settings
5. Refresh the display

```typescript
subPage.mOnActivate = (activeDevice, activeMapping) => {
  // Set current page ID in global state
  globalBooleanVariables.currentPageId.set(activeDevice, config.id);

  // Initialize page in DisplayStateManager and set as active
  device.displayStateManager.initializePage(config.id);
  device.displayStateManager.setActivePage(activeDevice, config.id);

  // ... rest of activation logic

  // Apply page settings to DisplayStateManager
  device.displayStateManager.updatePageSettings(activeDevice, config.id, pageSettings);
};
```

## Global vs. Per-Page State

### Global State (Shared Across All Pages)

The following state is **global** and persists across page changes:

1. **Track Names** - Store in `globalData.trackNames`
   - Updated via `updateTrackTitle()`
   - Available to all pages for fader display
   - Example: "Audio 01", "Kick Drum", etc.

2. **Indicators** - Store in `globalData.indicator1/2`
   - Updated via `updateIndicator1/2()`
   - Always visible in top/bottom right of display
   - Example: "N" for navigation, "R" for recording

3. **Master Fader** - Store in `masterFaderData`
   - Shows parameter info when master fader is touched
   - Temporarily overrides channel display

### Per-Page State (Page-Specific)

The following state is **per-page** and changes when pages switch:

1. **Encoder Titles** - Store in `pageState.channels[i].encoder`
   - Different parameters per page (Pan, EQ, Sends, etc.)
   - Restored when returning to a page

2. **Display Settings** - Store in `pageState`
   - `displayParameterTitle` - Show title vs. name
   - `displayChannelValueName` - Show value title vs. track title
   - `isValueDisplayModeActive` - Show values vs. names
   - `areDisplayRowsFlipped` - Swap encoder/fader rows

3. **Binding Status** - Store in `pageState`
   - `areFadersBound` - Whether faders have active bindings
   - `areKnobsBound` - Whether encoders have active bindings

## Display Update Flow

### 1. Callback Receives Data

```
onTitleChange (encoder) → updateEncoderTitle() → Store in state
onDisplayValueChange (encoder) → updateEncoderValue() → Store + Refresh
onTitleChange (fader) → updateTrackTitle() → Store in global state
onDisplayValueChange (fader) → updateFaderValue() → Store in state
```

### 2. State Manager Processes

```
Store raw data in pageState.channels[i]
Check if page is active
If active → refreshEncoderDisplay()
```

### 3. Display Refresh

```
refreshEncoderDisplay():
  1. Read raw data from state
  2. Check display settings (value mode, flip, etc.)
  3. Determine what to show (title/name/value)
  4. Abbreviate text to fit screen
  5. Center if needed
  6. Send to LcdManager
```

### 4. LCD Manager Sends to Hardware

```
LcdManager.setChannelText():
  1. Format text to 7 characters
  2. Send via MIDI SysEx
  3. Restore indicators if needed
```

## Benefits of This Architecture

### 1. Reliable Display Updates
- State is stored independently of callbacks
- Display can be refreshed at any time from stored state
- Page switches no longer cause incorrect displays

### 2. Asynchronous Callback Handling
- Callbacks update state asynchronously
- State manager coordinates all updates
- No race conditions between callbacks

### 3. Global State Preservation
- Track names persist across all pages
- Indicators remain visible through page changes
- Master fader info is globally accessible

### 4. Per-Page Configuration
- Each page has its own encoder parameter mappings
- Display settings are page-specific
- Returning to a page restores its state

### 5. Clean Separation of Concerns
- `DisplayStateManager` - State and rendering logic
- `LcdManager` - Low-level LCD communication
- `binding.ts` - MIDI binding callbacks
- Page configs - Page-specific bindings and settings

## Usage Examples

### Update Encoder Title (from onTitleChange)

```typescript
channel.encoder.mEncoderValue.mOnTitleChange = (context, title1, title2) => {
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updateEncoderTitle(
    context,
    pageId,
    channelIndex,
    title1,  // e.g., "Pan"
    title2   // e.g., "Pan Left-Right"
  );
};
```

### Update Track Name (global)

```typescript
channel.scribbleStrip.trackTitle.mOnTitleChange = (context, title, valueTitle) => {
  device.displayStateManager.updateTrackTitle(
    context,
    channelIndex,
    title,       // e.g., "Audio 01"
    valueTitle   // e.g., "Volume"
  );
};
```

### Update Fader Value (per-page)

```typescript
channelFader.mSurfaceValue.mOnDisplayValueChange = (context, value, units) => {
  const displayValue = units ? `${value} ${units}` : value;
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updateFaderValue(
    context,
    pageId,
    channelIndex,
    displayValue  // e.g., "-6.0 dB"
  );
};
```

### Change Page Settings

```typescript
globalBooleanVariables.displayParameterTitle.addOnChangeCallback((context, value) => {
  const pageId = globalBooleanVariables.currentPageId.get(context);
  device.displayStateManager.updatePageSettings(context, pageId, {
    displayParameterTitle: value,
  });
});
```

### Force Display Refresh

```typescript
globalBooleanVariables.refreshDisplay.addOnChangeCallback((context) => {
  device.displayStateManager.refreshAllChannels(context);
});
```

## Future Enhancements

Potential improvements to the state management system:

1. **State Persistence** - Save state to disk and restore on restart
2. **State Snapshots** - Store and recall display states
3. **Debug Logging** - Add detailed logging for troubleshooting
4. **State Inspection** - Tools to view current state
5. **Animation Support** - Smooth transitions between states
6. **Validation** - Ensure state consistency and catch errors

## Troubleshooting

### Display Not Updating

1. Check that `currentPageId` is set correctly
2. Verify page is initialized via `initializePage()`
3. Ensure `setActivePage()` was called on page activation
4. Confirm callbacks are receiving data (add logging)

### Wrong Data Displayed

1. Check if correct page ID is being used
2. Verify global vs. per-page state separation
3. Ensure display settings match expectations
4. Check abbreviation logic isn't truncating incorrectly

### Indicators Disappearing

1. Indicators are global state - check `updateIndicator1/2()`
2. Ensure `restoreCurrentIndicators()` is called after LCD updates
3. Verify `LcdManager` is preserving indicator state

### Page Switch Issues

1. Confirm `mOnActivate` calls `setActivePage()`
2. Check page settings are applied correctly
3. Verify refresh is triggered after page switch
4. Ensure old page state doesn't interfere with new page
