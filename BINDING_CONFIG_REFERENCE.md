# Quick Reference: Binding Configuration System

## Overview

The binding configuration system enables declarative definition of MIDI Remote bindings using JSON or TypeScript.

## Core Components

### 1. Type Definitions (`bindingConfig.ts`)
All interfaces and types for configuration structures.

### 2. Loader & Validator (`bindingConfigLoader.ts`)
- Parse JSON configurations
- Validate structure and correctness
- Build configurations programmatically

### 3. Binding Creator (`bindingCreator.ts`)
- Process configurations
- Create Cubase mappings
- Handle activation logic

## Configuration Structure

### Basic Subpage Configuration

```typescript
const config: BindingConfig = {
  id: "mixer",
  name: "Mixer",
  description: "Track mixer with volume and pan controls",       // Optional description
  masterButton: "subPageMixer",
  hostAccessor: "hostMixerBankZone",
  bindings: {
    perChannel: [
      /* binding definitions */
    ],
    dummyBindings: ["buttons.solo.mSurfaceValue"]
  },
  displayBindings: {                                              // Optional - marks which controls are bound
    knobsBound: true,
    fadersBound: true
  },
  displayLineConfiguration: {                                     // Optional - LCD display settings
    line0Default: "parameterName",
    line0Toggle: "encoderValue",
    line1Default: "trackName",
    line1Toggle: "faderValue",
    toggleable: true
  },
  activation: {
    logMessage: "Mixer page activated",
    globalVariables: [
      { name: "displayChannelValueName", value: false }
    ]
  }
};
```

## Configuration Options

### Host Accessors
- `"hostMixerBankZone"` - Mixer bank zone for channel strips
- `"controlRoom"` - Control room mixer
- `"selectedTrack"` - Selected track with sends and quick controls
- `"selectedTrackStripEffects"` - Selected track's strip effects
- `null` - No accessor (use for custom logic)

### Binding Options

```typescript
{
  takeOverMode: "jump" | "pickup",  // Value pickup behavior
  toggle: boolean,                   // Toggle button behavior
  customHandler: string,             // Custom handler reference
  duplicate: boolean,                // Create duplicate binding (Cubase 12.0.60+ workaround)
  hostValueKey: string               // Alternative host value key (e.g., 'param' for parameter bank zones)
}
```

### Channel Ranges

```typescript
{
  start: 0,                          // Start index
  end?: "maxCueSends",              // Dynamic end constraint
  maxValue: "device.numStrips" | 8   // Max value (fixed or dynamic)
}
```

### Display Line Configuration Options

```typescript
{
  line0Default: string,              // Default display for line 0
  line0Toggle: string,               // Toggled display for line 0
  line1Default: string,              // Default display for line 1
  line1Toggle: string,               // Toggled display for line 1
  toggleable: boolean,               // Whether this page supports display toggle
  encoderTitleTransform: function    // Optional function to transform encoder display text
}
```

## Usage Patterns

### Pattern 1: Per-Channel Bindings

Create same bindings for all channels:

```json
{
  "id": "mixer",
  "name": "Mixer",
  "bindings": {
    "perChannel": [
      {
        "id": "fader",
        "surface": "fader.mSurfaceValue",
        "hostValue": "bankChannel.mValue.mVolume",
        "options": { "takeOverMode": "jump" }
      },
      {
        "id": "soloButton",
        "surface": "buttons.solo.mSurfaceValue",
        "hostValue": "bankChannel.mValue.mSolo",
        "options": { "toggle": true }
      }
    ]
  }
}
```

### Pattern 2: Multiple Bindings Per Channel (perChannelMulti)

Group multiple related bindings per channel for better organization:

```json
{
  "id": "sendsQC",
  "name": "SendsQC",
  "bindings": {
    "perChannelMulti": [
      {
        "id": "sendsQCChannelControls",
        "bindings": [
          {
            "surface": "encoder.mEncoderValue",
            "hostValue": "mSends.getByIndex(i).mLevel"
          },
          {
            "surface": "encoder.mPushValue",
            "hostValue": "mSends.getByIndex(i).mOn",
            "options": { "toggle": true }
          },
          {
            "surface": "fader.mSurfaceValue",
            "hostValue": "mFocusedQuickControls.getByIndex(i)",
            "options": {
              "takeOverMode": "jump",
              "duplicate": true
            }
          }
        ]
      }
    ]
  }
}
```

**Key Features**:
- `duplicate: true` - Creates a duplicate binding as a workaround for Cubase 12.0.60+ bugs
- `hostValueKey: "param"` - Use alternative key for parameter bank zones (e.g., extract 'param' from complex object)
- Better organization when a single channel has many related controls

### Pattern 3: Fixed Channel Bindings

Specific channels with different bindings:

```json
{
  "bindings": {
    "fixedChannels": [
      {
        "channelIndex": 0,
        "bindings": [
          {
            "id": "mainLevel",
            "surface": "fader.mSurfaceValue",
            "hostValue": "controlRoom.mMainChannel.mLevelValue",
            "options": { "takeOverMode": "jump" }
          }
        ]
      },
      {
        "channelIndex": 1,
        "bindings": [
          {
            "id": "phonesLevel",
            "surface": "fader.mSurfaceValue",
            "hostValue": "controlRoom.getPhonesChannelByIndex(0).mLevelValue",
            "options": { "takeOverMode": "jump" }
          }
        ]
      }
    ]
  }
}
```

### Pattern 4: Fixed Index Bindings with Commands

Specific channels with command bindings instead of value bindings:

```json
{
  "bindings": {
    "fixedIndexBindings": [
      {
        "id": "sendQCCh4SoloCmd",
        "channelIndex": 4,
        "surface": "buttons.solo.mSurfaceValue",
        "command": {
          "category": "Automation",
          "action": "Show Used Automation (Selected Tracks)"
        }
      },
      {
        "id": "sendQCCh6SoloValue",
        "channelIndex": 6,
        "surface": "buttons.solo.mSurfaceValue",
        "hostValue": "mValue.mEditorOpen",
        "options": { "toggle": true }
      }
    ]
  }
}
```

**Key Features**:
- Mix command bindings and value bindings in same array
- Useful for handy button functions at specific channel locations
- `command` object with `category` and `action` triggers Cubase commands
- `hostValue` creates standard value bindings

### Pattern 5: Variable Range Bindings

Dynamic range with function calls:

```json
{
  "bindings": {
    "variableChannels": {
      "range": {
        "start": 0,
        "maxValue": "controlRoom.getMaxCueChannels()"
      },
      "hostValueFactory": "getCueChannelByIndex(i)",
      "bindings": [
        {
          "id": "cueLevel",
          "surface": "encoder.mEncoderValue",
          "hostValue": "mLevelValue"
        }
      ]
    }
  }
}
```

### Pattern 6: Dummy Bindings

Disable unused controls:

```json
{
  "bindings": {
    "dummyBindings": [
      "buttons.solo.mSurfaceValue",
      "buttons.record.mSurfaceValue"
    ],
    "dummyChannelRanges": [
      {
        "range": { "start": 8, "maxValue": "device.numStrips" },
        "bindings": [
          "fader.mSurfaceValue",
          "buttons.mute.mSurfaceValue"
        ]
      }
    ]
  }
}
```

### Pattern 7: Activation Handlers

Execute code when subpage activates with global variables and MIDI output:

```json
{
  "activation": {
    "logMessage": "Mixer page activated",
    "globalVariables": [
      { "name": "displayChannelValueName", "value": false },
      { "name": "refreshDisplay", "action": "toggle" }
    ],
    "lcdTextLine0": "Mixer",
    "midiOutput": {
      "onActivate": [
        { "status": 0x90, "data1": 0, "data2": 127 },
        { "status": 0xB0, "data1": 7, "data2": 100 }
      ],
      "onDeactivate": [
        { "status": 0x90, "data1": 0, "data2": 0 }
      ]
    }
  }
}
```

**Key Features**:
- `logMessage` - Logs when page activates
- `globalVariables` - Set boolean flags or toggle values
- `lcdTextLine0` - Set custom LCD text on activation
- `midiOutput` - Send MIDI messages on page activation/deactivation
- `displayBindings` - Marks which controls are bound (optional)

## Surface Value Paths

Navigate channel control structure using dot notation:

```
fader.mSurfaceValue
encoder.mEncoderValue
encoder.mPushValue
scribbleStrip.trackTitle
buttons.solo.mSurfaceValue
buttons.mute.mSurfaceValue
buttons.select.mSurfaceValue
buttons.record.mSurfaceValue
```

Example:
```
device.channelControls[0].fader.mSurfaceValue
                         ↑ resolved from path above
```

## Host Value Paths

### Dot Notation (Simple)
```
controlRoom.mMainChannel.mLevelValue
selectedTrackChannel.mValue.mVolume
```

### Function Calls (with index)
```
controlRoom.getCueChannelByIndex(i)
→ resolved to: controlRoom.getCueChannelByIndex(0) for channel 0
              controlRoom.getCueChannelByIndex(1) for channel 1
```

### Combined
```
getPhonesChannelByIndex(0).mLevelValue
→ returns: getPhonesChannelByIndex(0).mLevelValue
```

## Creating Bindings Programmatically

### Using BindingCreator Directly

```typescript
const creator = new BindingCreator(page, device, dummy, globalVariables);
const subPage = creator.createSubPageBindings(config, faderSubPageArea);
```

### Using BindingConfigBuilder

```typescript
const config = new BindingConfigBuilder('mixer', 'Mixer')
  .withDescription('Track mixer controls')
  .withMasterButton('subPageMixer')
  .withHostAccessor('hostMixerBankZone')
  .addPerChannelBindings([
    {
      id: 'fader',
      surface: 'fader.mSurfaceValue',
      hostValue: 'bankChannel.mValue.mVolume',
      options: { takeOverMode: 'jump' }
    }
  ])
  .withActivationConfig({
    logMessage: 'Mixer activated',
    globalVariables: [
      { name: 'displayChannelValueName', value: false }
    ]
  })
  .build();
```

## Loading from JSON

### Validation Only

```typescript
import { BindingConfigValidator } from './config/bindingConfigLoader';

const result = BindingConfigValidator.validate(myConfig);
if (!result.valid) {
  console.log('Errors:', result.errors);
}
```

### Load and Validate

```typescript
import { BindingConfigLoader } from './config/bindingConfigLoader';

const configs = BindingConfigLoader.load(jsonString);
// Throws error if validation fails
```

## Error Handling

The validator provides detailed error messages:

```
Configuration validation failed:
- BindingConfig: missing required field "id"
- BindingConfig "mixer": bindings.perChannel[0].surface is required
- BindingConfig "mixer": Master button "invalid" not found in device.master.buttons
```

## Common Mistakes to Avoid

### ❌ Wrong: Hardcoded indices in function calls
```json
"hostValueFactory": "controlRoom.getCueChannelByIndex(0)"
```

### ✓ Right: Use `i` for dynamic index
```json
"hostValueFactory": "controlRoom.getCueChannelByIndex(i)"
```

---

### ❌ Wrong: Missing required fields
```json
{
  "bindings": { "perChannel": [] }
}
```

### ✓ Right: Include all required fields
```json
{
  "id": "mypage",
  "name": "My Page",
  "bindings": { "perChannel": [] }
}
```

---

### ❌ Wrong: Binding multiple controls to same unused channel
```json
{
  "perChannel": [
    { "id": "fader", "surface": "fader.mSurfaceValue", "hostValue": "..." },
    { "id": "dummy", "surface": "fader.mSurfaceValue", "hostValue": "dummy" }
  ]
}
```

### ✓ Right: Use dummyBindings for cleanup
```json
{
  "perChannel": [ ... ],
  "dummyBindings": ["buttons.solo.mSurfaceValue"]
}
```

## Performance Tips

1. **Leverage Caching**: Surface values are cached - reuse frequently accessed paths

2. **Minimize Dynamic Resolution**: Prefer fixed values over dynamic property resolution

3. **Batch Configurations**: Load all subpage configs at once rather than individually

4. **Profile Activation**: Keep activation handlers simple - heavy logic should be elsewhere

## Debugging

Enable logging in activation handlers:

```json
{
  "activation": {
    "logMessage": "Subpage X activated - proceeding with initialization..."
  }
}
```

Check surface value resolution failures:

```
Warning: Could not resolve surface value at channel 5, path "unknown.path"
```

Check global variable lookup failures:

```
Warning: Global variable "unknownVar" not found in globalBooleanVariables
```
