# Stream Deck Integration Guide

This guide explains how to integrate the Icon Platform M+ MIDI Remote with Elgato Stream Deck using the [Stream Deck MIDI Plugin](https://marketplace.elgato.com/product/midi-b068a591-1a69-48fe-9206-b2d24762228b).

## Overview

The MIDI Remote script sends MIDI SysEx messages to the Stream Deck to update button text dynamically based on the current state of Cubase parameters. This provides visual feedback directly on the Stream Deck buttons.

## Prerequisites

1. **Stream Deck Software** - Install [Elgato Stream Deck application](https://www.elgato.com/en/Stream-Deck)
2. **Stream Deck MIDI Plugin** - Install from the [Elgato Marketplace](https://marketplace.elgato.com/product/midi-b068a591-1a69-48fe-9206-b2d24762228b)
3. **Virtual MIDI Ports** - Configure MIDI ports for communication:
   - **Windows**: Install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) or similar virtual MIDI cable software
   - **macOS**: Create MIDI ports in Audio MIDI Setup (MIDI Studio)
   - **Linux**: Use virtual MIDI ports or JACK connections

## MIDI Port Setup

### Port Configuration

The MIDI Remote expects to find the following MIDI ports specifically for Stream Deck communication:

- **Input Port**: `Platform M+ SD Input`
- **Output Port**: `Platform M+ SD Output`

These are separate from the main control ports and handle SysEx communication only.

### Windows (loopMIDI)

1. Open loopMIDI application
2. Create two virtual ports:
   - Click "+" button
   - Enter: `Platform M+ SD Input`
   - Click "+" button again
   - Enter: `Platform M+ SD Output`
3. In Stream Deck MIDI Plugin settings:
   - Set **MIDI Input** to: `Platform M+ SD Output`
   - Set **MIDI Output** to: `Platform M+ SD Input`

**Note**: The input/output naming is reversed because what the MIDI Remote sends as output is received as input by Stream Deck.

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

### Linux

Configure virtual MIDI ports using JACK or ALSA:
- Create virtual ports: `Platform M+ SD Input` and `Platform M+ SD Output`
- Connect them through your MIDI routing application (Patchbay, Ardour, etc.)

## SysEx Message Format

The MIDI Remote sends SysEx messages in the following format:

```
F0 7D <msg-type> <ASCII text bytes> F7
```

- `F0` - SysEx start byte
- `7D` - Manufacturer ID (educational/development use)
- `<msg-type>` - Message type identifier (default `00` for display mode)
- `<ASCII text bytes>` - Variable length ASCII text (0-127 range, printable only)
- `F7` - SysEx end byte

### Example SysEx Messages

**Display Mode Status** (message type `00`):
```
F0 7D 00 56 61 6C 75 65 0A 44 69 73 70 6C 61 79 0A 4F 4E F7
              └─ ASCII: "Value\nDisplay\nON"
```

## Stream Deck Button Configuration

### Basic Setup

1. In **Stream Deck** application, open your profile
2. Drag a button to the grid
3. Search for "MIDI" action
4. Configure the button action as needed

### Listening for SysEx Updates (Display Mode)

To have the button text update dynamically when display mode toggles:

```javascript
[
   (init) {text:Value\nDisplay}
   (sysex:F0 7D 00 XX F7) {text:#@e_sysextext#}
]
```

**Script Breakdown**:
- `(init) {text:Value\nDisplay}` - Set initial button text on load
- `(sysex:F0 7D 00 XX F7)` - Event matching SysEx with message type `00`
  - `F0` - SysEx start
  - `7D` - Manufacturer ID
   - `00` - Message type
  - `XX` - Wildcard for variable text bytes
  - `F7` - SysEx end
- `{text:#@e_sysextext#}` - Update button text with extracted ASCII

### Multiple Message Types

To handle different message types on different buttons, use different type codes:

**Button 1 - Display Mode** (type `00`):
```javascript
[
   (init) {text:Value\nDisplay}
   (sysex:F0 7D 00 XX F7) {text:#@e_sysextext#}
]
```

**Button 2 - Parameter Info** (type `02`):
```javascript
[
  (init) {text:Parameter}
  (sysex:F0 7D 02 XX F7) {text:#@e_sysextext#}
]
```

## Value Display Mode Toggle

The MIDI Remote supports a global value display mode that shows current values in the LCD.

### How It Works

1. Press the **Record button (Channel 1)** on the **Shift Page**
2. The MIDI Remote toggles value display mode
3. A SysEx message is sent to Stream Deck with the current mode text

## Sending SysEx from MIDI Remote Code

### Implementation Pattern

```typescript
// Send SysEx message to Stream Deck
const text = "Value\nDisplay\nON";
const textBytes: number[] = [];
for (let i = 0; i < text.length; i++) {
  textBytes.push(text.charCodeAt(i));
}

device.sdPortPair.output.sendMidi(context, [
   0xF0, 0x7D, 0x00, ...textBytes, 0xF7
]);
```

### Message Type Identifiers

Reserve these message types for specific purposes:
- `0x00` - Display mode status
- `0x02-0x7C` - Available for custom extensions

## Troubleshooting

### No Text Appears on Stream Deck Button

1. **Verify MIDI Port Connections**:
   - Cubase MIDI Remote output → `Platform M+ SD Output` (virtual port)
   - `Platform M+ SD Input` (virtual port) → Stream Deck MIDI Plugin input
   - Test with MIDI monitoring tools (MIDI-OX, Patchbay, etc.)

2. **Check Port Names**:
   - Port names must match exactly (case-sensitive on some systems)
   - Verify ports appear in both Cubase and Stream Deck

3. **Verify Stream Deck Script Syntax**:
   - Check all brackets match: `[ ( ) { } ]`
   - Ensure manufacturer ID `7D` matches your code
   - Test with simple script: `[(init) {text:Test}]`

4. **Enable Debugging**:
   - In Cubase MIDI Remote Console, enable message logging
   - Use external MIDI monitor (MIDI-OX, Patchbay, etc.) to see if SysEx is being sent
   - Watch Stream Deck editor for script parse errors

### Button Receives Messages But Text Doesn't Update

1. Verify SysEx frame format exactly:
   - Start byte: `F0`
   - Manufacturer: `7D`
   - Message type: `00` (or your configured value)
   - End byte: `F7`

2. Check text contains only valid ASCII (32-126, printable):
   - Avoid special Unicode characters
   - No extended ASCII or control characters

3. Verify the special variable is correct: `#@e_sysextext#`

4. Check event pattern matches message type:
   - Button listening for `00` but message sends `01`
   - Check message type byte in both code and script

### MIDI Port Connection Issues

**Windows (loopMIDI)**:
- Check that loopMIDI application is running
- Ports must be created before Cubase starts
- Restart loopMIDI and Cubase if ports aren't recognized
- Use MIDI-OX to test port routing

**macOS**:
- Verify IAC Driver is enabled in Audio MIDI Setup
- Ports must be created before Cubase starts
- Restart Core Audio if ports aren't recognized
- Use MIDI Monitor app to verify connections

**Linux**:
- Use MIDI routing tools (QJackCtl, Patchbay, Ardour, etc.)
- Check connections with: `aconnect -l` (ALSA) or `jack_lsp` (JACK)

### Display Mode Not Toggling

1. **Test Toggle Manually**:
   - Press Record button on Channel 1 of Shift page
   - Check if values appear on the Icon Platform M+

2. **Verify SysEx Reception**:
   - If the Icon display changes but the Stream Deck does not, check the SysEx script and port routing

## Resources

- [Stream Deck MIDI Plugin Documentation](https://trevligaspel.se/streamdeck/midi/index.php)
- [Stream Deck MIDI Script Overview](https://trevligaspel.se/streamdeck/midi/index.php/script/overview)
- [loopMIDI (Windows)](https://www.tobias-erichsen.de/software/loopmidi.html)
- [MIDI Monitor (macOS)](https://www.snoize.com/MIDIMonitor/)
- [MIDI-OX (Windows)](https://www.midiox.com/)
- [QJackCtl (Linux)](https://qjackctl.sourceforge.io/)

## Example Use Cases

By extending the SysEx integration, you can display on Stream Deck:

- **Automation State** - Show automation type and status
- **Track Status** - Display track mute/solo/record state
- **Level Information** - Current fader values with units
- **Effect Status** - Whether effects are ON/OFF or bypassed
- **Transport Info** - Play/stop/record/loop status
- **Tempo & Time** - Project tempo and playback position
- **Meter Levels** - Input/output peak levels (advanced)
- **Page Indicators** - Current active page name

## Contributing

If you develop useful Stream Deck extensions or additional SysEx-based features, consider contributing them back to the project!
