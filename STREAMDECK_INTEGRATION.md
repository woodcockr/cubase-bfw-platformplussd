# Stream Deck Integration Guide

This guide explains how to integrate the Icon Platform M+ MIDI Remote with Elgato Stream Deck using the [Stream Deck MIDI Plugin](https://marketplace.elgato.com/product/midi-b068a591-1a69-48fe-9206-b2d24762228b).

## Overview

The MIDI Remote script sends MIDI SysEx messages to the Stream Deck to update button text dynamically based on the current state of Cubase parameters. This provides visual feedback directly on the Stream Deck buttons.

## Prerequisites

1. **Stream Deck MIDI Plugin** - Install from the [Elgato Marketplace](https://marketplace.elgato.com/product/midi-b068a591-1a69-48fe-9206-b2d24762228b)
2. **Virtual MIDI Ports** - Configure MIDI ports for communication:
   - **Windows**: Install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) or similar virtual MIDI cable software
   - **macOS**: Create MIDI ports in Audio MIDI Setup (MIDI Studio)

## MIDI Port Setup

### Port Configuration

The MIDI Remote expects to find the following MIDI ports:

- **Input Port**: `Platform M+ SD Input`
- **Output Port**: `Platform M+ SD Output`

### Windows (loopMIDI)

1. Open loopMIDI
2. Create two virtual ports:
   - `Platform M+ SD Input`
   - `Platform M+ SD Output`
3. In Stream Deck MIDI Plugin settings:
   - Set **MIDI Input** to: `Platform M+ SD Output`
   - Set **MIDI Output** to: `Platform M+ SD Input`

Note: The input/output naming is reversed because what the MIDI Remote sends as output is received as input by Stream Deck.

### macOS (Audio MIDI Setup)

1. Open **Applications** → **Utilities** → **Audio MIDI Setup**
2. Open **MIDI Studio** (Window menu → Show MIDI Studio)
3. Double-click **IAC Driver**
4. Check "Device is online"
5. Create ports named:
   - `Platform M+ SD Input`
   - `Platform M+ SD Output`
6. In Stream Deck MIDI Plugin settings:
   - Set **MIDI Input** to: `Platform M+ SD Output`
   - Set **MIDI Output** to: `Platform M+ SD Input`

## SysEx Message Format

The MIDI Remote sends SysEx messages in the following format:

```
F0 7D 00 <ASCII text bytes> F7
```

- `F0` - SysEx start byte
- `7D` - Manufacturer ID (educational/development use)
- `00` - Message type identifier
- `<ASCII text bytes>` - Variable length ASCII text
- `F7` - SysEx end byte

## Example: Display Mode Toggle Button

The **Record button on channel 1** in the Shift page toggles the value display mode and sends the current status to Stream Deck.

### Stream Deck Button Configuration

1. Add a **Generic MIDI** button to your Stream Deck
2. Configure the button:
   - **Button Type**: Script
   - **Send on Press**: (leave empty or configure as desired)
   - **MIDI Input Port**: Select the appropriate virtual MIDI port
   - **MIDI Output Port**: Select the appropriate virtual MIDI port

3. **Script Configuration**:

```javascript
// Script for Display Mode Toggle button

[(init){text:Display\nMode}]
[(sysex:F0 7D 00 XX F7){text:#@e_sysextext#}
]
```

### Script Explanation

- `(sysex:F0 7D 00 XX F7)` - Event that triggers when a SysEx message is received:
  - `F0` - SysEx start byte
  - `7D` - Manufacturer ID
  - `00` - Message type identifier
  - `XX` - Wildcard for the text payload bytes
  - `F7` - SysEx end byte

- `{text:#@e_sysextext#}` - Action that updates the button text:
  - `#@e_sysextext#` - Special variable that contains the ASCII text extracted from the SysEx message

- `[(init){text:Display\nMode}]` - Optional initialization command:
  - Sets default text when the button is first loaded
  - `\n` creates a line break in the button text

### Expected Behavior

When you press the Record button on channel 1 of the Shift page:
1. The display mode toggles between ON and OFF
2. A SysEx message is sent to Stream Deck
3. The Stream Deck button text updates to show:
   - `Display: ON` when value display mode is active
   - `Display: OFF` when value display mode is inactive

## Adding More Stream Deck Buttons

You can extend this pattern to display other Cubase parameters on Stream Deck buttons:

### Generic Pattern

1. **In MIDI Remote code**: Send SysEx whenever state changes:
```typescript
const text = "Your text here";
const textBytes: number[] = [];
for (let i = 0; i < text.length; i++) {
  textBytes.push(text.charCodeAt(i));
}

device.sdPortPair.output.sendMidi(context, [
  0xF0, 0x7D, 0x00, ...textBytes, 0xF7
]);
```

2. **In Stream Deck Script**:
```javascript
[(sysex:F0 7D 00 XX F7){text:#@e_sysextext#}
]
```

### Advanced: Button-Specific Messages

To send different messages to different buttons, use different message type identifiers:

**MIDI Remote** (using message type `01` for a second button):
```typescript
device.sdPortPair.output.sendMidi(context, [
  0xF0, 0x7D, 0x01, ...textBytes, 0xF7  // Note: 0x01 instead of 0x00
]);
```

**Stream Deck Script** (listening for message type `01`):
```javascript
[(sysex:F0 7D 01 XX F7)  // Note: 01 for display line toggle status
  {text:#@e_sysextext#}
]
```

## Display Line Toggle Button (New Feature)

The MIDI Remote now includes a Stream Deck button to toggle between default and alternate display line configurations per page.

### Display Line Modes

Each page is configured with flexible display line options:

- **Default Mode**: Primary display configuration for the page
- **Toggle Mode**: Alternate display configuration when the button is active

### Page-Specific Configurations

| Page | Line 0 Default | Line 0 Toggle | Line 1 Default | Toggleable |
|------|---|---|---|---|
| **Mixer** | Track Name | Fader Value | Parameter Name | Yes |
| **Control Room** | Track Name | — | Fader Value | No |
| **Channel Strip** | None | — | Fader Value | No |
| **Cue Sends** | Track Name | Fader Value | Parameter Name | Yes |
| **EQ** | Parameter Name | Encoder Value | Fader Value | Yes |
| **PreFilter** | Parameter Name | Encoder Value | Fader Value | Yes |
| **Sends QC** | Track Name | Fader Value | Parameter Name | Yes |
| **MIDI CC** | (No display) | — | (No display) | No |
| **Shift** | (Labels only) | — | (Custom) | No |

### Setup Instructions

#### Step 1: Configure Virtual MIDI Ports

Follow the "Port Configuration" section above to set up virtual MIDI ports for Stream Deck communication.

#### Step 2: Create Stream Deck Button

1. In **Stream Deck**, create a new button and set its action to **MIDI**
2. Configure the MIDI action with:
   - **Type**: Control Change (CC)
   - **Channel**: 2 (displayed) / 1 (0-indexed in code)
   - **Control**: 127
   - **Value**: 127 (pressed action)

3. Set the button text action to display the current mode:
   - **Text**: `{text:Display Lines}`
   - OR add the MIDI SysEx event handler below

#### Step 3: Add Text Display Handler (Optional)

To show the current display line mode on the button, add this Stream Deck MIDI script:

```javascript
// Stream Deck MIDI Script for Display Line Toggle Button
[
  // Listen for sysex messages with manufacturer ID 7D and message type 01
  (sysex:F0 7D 01 XX F7)
  {
    text:{text:#@e_sysextext#}
  }
]
```

This will:
- Capture SysEx messages from the MIDI Remote (format: `F0 7D 01 <ASCII> F7`)
- Parse the ASCII text and display it on the button
- Show "Line: DEF" when in default mode
- Show "Line: ALT" when in alternate (toggled) mode

#### Step 4: Test the Integration

1. Ensure both Cubase and Stream Deck are running
2. Verify the virtual MIDI ports are connected
3. Press the Display Line Toggle button on Stream Deck
4. Observe:
   - Display line configuration changes on Icon Platform M+ display
   - Stream Deck button text updates to show current mode (if script configured)

### Example Workflow

**Mixer Page with Display Toggle**:

1. **Default Mode** (Display Line Toggle OFF):
   - Line 0 (Top): Track Names (e.g., "Audio 01", "Bass", "Drums")
   - Line 1 (Bottom): Parameter Names (e.g., "Pan", "Pan", "Pan")

2. **Toggle Mode** (Display Line Toggle ON):
   - Line 0 (Top): Fader Values (e.g., "-6.0dB", "0.0dB", "+3.0dB")
   - Line 1 (Bottom): Parameter Names (unchanged)

3. **Use Case**: Show fader values when adjusting levels, then toggle back to track names for overview

### Troubleshooting Display Line Toggle

#### Button doesn't respond

1. Verify CC 127 on channel 2 is not used by other controls
2. Check that virtual MIDI ports are connected
3. Monitor MIDI using MIDI-OX or similar tool

#### Display doesn't change

1. Ensure the page supports toggling (check Toggleable column in table above)
2. Control Room page does NOT support toggling (fixed configuration)
3. Check that displayLineConfiguration is properly set in page config

#### Text not appearing on button

Follow the "Troubleshooting" section below regarding SysEx messages.

## Troubleshooting

### No text appears on Stream Deck button

1. **Check MIDI Port Connections**:
   - Verify virtual MIDI ports exist and are named correctly
   - Ensure Stream Deck MIDI Plugin is using the correct ports
   - Remember: Input/Output are reversed between MIDI Remote and Stream Deck

2. **Check Script Syntax**:
   - Use the Stream Deck plugin's built-in syntax checker
   - Verify brackets are properly matched: `[ ( ) { } ]`
   - Check manufacturer ID matches: `7D` in both script and code

3. **Enable SysEx Debugging**:
   - In Cubase, check the MIDI Remote Console for errors
   - Use MIDI monitoring tools (e.g., MIDI-OX on Windows, MIDI Monitor on macOS) to verify SysEx messages are being sent

### Button shows wrong text format

- Verify `#@e_sysextext#` variable is used in the text action
- Check that the text being sent from MIDI Remote is properly formatted
- Try adding `\n` for line breaks: `{text:Line1\nLine2}`

### Messages received but text not updating

- Ensure the sysex event parameters match exactly
- Verify manufacturer ID `7D` and message type `00` (or your custom values)
- Check that the `*` wildcard is used for the data bytes parameter

## Resources

- [Stream Deck MIDI Plugin Documentation](https://trevligaspel.se/streamdeck/midi/index.php)
- [Stream Deck MIDI Script Overview](https://trevligaspel.se/streamdeck/midi/index.php/script/overview)
- [Stream Deck MIDI Forum](https://trevligaspel.forumotion.eu/)
- [loopMIDI (Windows)](https://www.tobias-erichsen.de/software/loopmidi.html)

## Example Use Cases

- **Track Names**: Display currently selected track name
- **Parameter Values**: Show knob/fader values with units
- **Effect Status**: Display whether effects are bypassed/active
- **Transport State**: Show play/stop/record status
- **Tempo**: Display current project tempo
- **Time Code**: Show current playback position

## Contributing

If you create useful Stream Deck integrations for this MIDI Remote, please share them in the repository's documentation!
