# Icon Platform M+ Quick Reference Guide

A comprehensive guide to all buttons and faders on each page of the Icon Platform M+ MIDI Remote for Cubase.

## Hardware Layout Overview

The Icon Platform M+ has:
- **8 Channel Strips** (Ch.1-8): Each with fader, encoder (knob), 4 buttons (Select, Mute, Solo, Record)
- **Scribble Strips**: LCD displays above each fader showing parameter/track information
- **Master Section**: Fader, Read/Write buttons, page selector buttons, and additional control buttons
- **Display Lines**: 2-line LCD text per channel (line 0 and line 1)

---

## Master/Transport Controls (Global)

**Transport Buttons**:
| Control | Function |
|---------|----------|
| Prev Chn | Unmute All |
| Next Chn | Deactivate All Solo |
| Prev Bnk | Locate Previous Marker |
| Next Bnk | Locate Next Marker |
| Rewind | Rewind |
| Forward | Fast Forward |
| Start | Play |
| Stop | Stop |
| Record | Record |
| Cycle | Loop On/Off |

**Stream Deck (SD) Buttons**:
| Control | Function |
|---------|----------|
| Unmute All | Unmute All |
| Deactivate All Solo | Deactivate All Solo |

---

## Page Reference

### 1. MIXER PAGE

**Purpose**: Complete mixing control with volume, pan, and channel management

**Fader Controls** (All 8 channels):
| Control | Function | Range |
|---------|----------|-------|
| Fader | Track Volume | -∞ to +6dB |
| Encoder (Knob) | Track Pan | L100 to R100 |
| Encoder (Push) | Open Channel Editor | Toggle |

**Button Controls** (All 8 channels):
| Button | Function |
|--------|----------|
| **Select** | Select/Deselect Track |
| **Mute** | Mute Track |
| **Solo** | Solo Track |
| **Record** | Enable Recording |

**Display**:
- **Line 0**: Parameter Name (default) / Encoder Value (toggle)
- **Line 1**: Track Name (default) / Fader Value (toggle)
- **Display Toggle**: Use Shift page to toggle between view modes

**Notes**:
- All faders use Jump takeoverMode (pick up current value)
- All buttons use toggle behavior
- Encoder displays the current pan value when toggled

---

### 2. CONTROL ROOM PAGE

**Purpose**: Master output control with phone monitoring and cue sends

#### Main Output (Channel 1)

| Control | Function | Notes |
|---------|----------|-------|
| Fader | Main Output Level | Master faders use Jump mode |
| Select Button | Metronome Click | Toggle metronome on/off |
| Mute Button | Mute Main Output | Full mute of main out |

#### Phones Output (Channel 2)

| Control | Function | Notes |
|---------|----------|-------|
| Fader | Phones Output Level | Jump mode |
| Select Button | Phones Metronome | Toggle metronome in headphones |
| Mute Button | Mute Phones Output | Controls headphone output |

#### Cue Sends (Channels 3-8)

**Dynamic Cue Send Levels** - Quantity depends on project configuration:

| Control | Function |
|---------|----------|
| Encoder (Knob) | Cue Send Level |
| Encoder (Push) | Mute Cue Send |

**Notes**:
- Number of cue sends varies per project
- Unused faders and buttons are dummy-bound (no function)
- Solo and Record buttons have no function on this page

**Display**:
- Main/Phones channels show their level values
- Cue sends display parameter names

---

### 3. CHANNEL STRIP EFFECTS PAGES

Five separate pages for mixer channel effects: **Gate**, **Compressor**, **Tools**, **Saturator**, **Limiter**

**Purpose**: Control effect parameters on selected track's channel strip

#### Parameter Controls (Channels 1-8, All pages)

| Control | Function |
|---------|----------|
| Fader | Effect Parameter Value |
| Scribble Strip | Parameter Name |

**Effect Toggle Controls** (Fixed across all effect pages):

| Channel | Record Button | Mute Button |
|---------|--------------|-----------|
| 1 | Toggle Effect ON/OFF | Toggle Bypass |
| 2 | Toggle Effect ON/OFF | Toggle Bypass |
| 3 | Toggle Effect ON/OFF | Toggle Bypass |
| 4 | Toggle Effect ON/OFF | Toggle Bypass |
| 5 | Toggle Effect ON/OFF | Toggle Bypass |
| 6 | Toggle Effect ON/OFF | Toggle Bypass |
| 7 | Toggle Effect ON/OFF | Toggle Bypass |
| 8 | Toggle Effect ON/OFF | Toggle Bypass |

**Display**:
- **Line 0**: Parameter Name (default) / Encoder Value (toggle)
- **Line 1**: Fader Value Title (default) / Fader Value (toggle)
- **Toggleable**: Yes - use Shift page display toggle

**Notes**:
- Select, Solo, and Encoder buttons have no function on effect pages
- Each effect page shows the currently selected parameter from the parameter bank zone
- Parameter bank zone advances to next parameter set as you navigate channels
- Effects ON/OFF and Bypass state persists across all effect pages for same channel

---

### 4. SELECTED TRACK PAGES

The Selected Track section has multiple sub-pages: **SendsQC**, **EQ**, **PreFilter**, **CueSends**

#### SENDS QC PAGE

**Purpose**: Send and quick control management for selected track

**Per-Channel Controls** (Channels 1-8):

| Control | Function | Notes |
|---------|----------|-------|
| Fader | Send Level / Quick Control Value | Jump mode |
| Encoder (Knob) | Send Level (same as fader) | |
| Encoder (Push) | Send ON/OFF | Toggle |
| Select Button | Send ON/OFF | Toggle duplicate |
| Mute Button | Send Pre/Post | Toggle |
| Scribble Strip | Send Name / Quick Control Name | Shows parameter or control name |

**Handy Controls** (Channels 4-8, Record & Solo buttons):

| Channel | Solo Button | Record Button |
|---------|-----------|---------------|
| 1 | EQ Band 1 ON/OFF | — (unused) |
| 2 | EQ Band 2 ON/OFF | — (unused) |
| 3 | EQ Band 3 ON/OFF | — (unused) |
| 4 | EQ Band 4 ON/OFF | — (unused) |
| 5 | Show Used Automation | Monitor Enable |
| 6 | Hide Automation | Mute Track |
| 7 | Channel Editor Toggle | Solo Track |
| 8 | Instrument Editor Toggle | Record Enable |

**Display**:
- **Line 0**: Parameter Name (default) / Encoder Value (toggle)
- **Line 1**: Fader Value Title (default) / Fader Value (toggle)
- **Toggleable**: Yes

**Notes**:
- Encoder and fader send same value (workaround for Cubase 12.0.60+ duplicate binding requirement)
- Quick Controls 1-8 populate fader display with their names
- Sends shown with their abbreviations

---

#### EQ PAGE

**Purpose**: 4-band parametric EQ control for selected track

**Per-Channel Controls** (Channels 1-8):

| Control | Function |
|---------|----------|
| Fader | EQ Parameter Value |
| Encoder (Knob) | EQ Parameter Value |
| Scribble Strip | EQ Parameter Name |

**EQ Band Mapping** (each parameter bank repeats for 4 bands):
- **Channels 1-4**: Band 1-4 of first parameter type (Frequency, Gain, Q, etc.)
- **Channels 5-8**: Next parameter bank for Band 1-4

**Handy Controls** (Fixed to channels 1-4):

| Channel | Solo Button |
|---------|-----------|
| 1 | EQ Band 1 ON/OFF |
| 2 | EQ Band 2 ON/OFF |
| 3 | EQ Band 3 ON/OFF |
| 4 | EQ Band 4 ON/OFF |

**Display**:
- **Line 0**: Parameter Name (default) / Encoder Value (toggle)
- **Line 1**: Fader Value Title (default) / Fader Value (toggle)
- **Toggleable**: Yes

---

#### PREFILTER PAGE

**Purpose**: HP/LP filter control for selected track

**Controls**: Similar to EQ page

| Control | Function |
|---------|----------|
| Fader | Filter Parameter Value |
| Encoder (Knob) | Filter Parameter Value |
| Scribble Strip | Parameter Name |

**Display**:
- **Line 0**: Parameter Name (default) / Encoder Value (toggle)
- **Line 1**: Fader Value Title (default) / Fader Value (toggle)
- **Toggleable**: Yes

---

#### CUE SENDS PAGE

**Purpose**: Control cue send levels for selected track

**Per-Channel Controls** (Channels 1-8):

| Control | Function |
|---------|----------|
| Encoder (Knob) | Cue Send Level |
| Encoder (Push) | Cue Send Mute |

**Display**:
- Shows cue send names and levels

---

### 5. MIDI CC PAGE

**Purpose**: Send MIDI CC messages and control parameters via MIDI faders

**Controls**:

| Control | Function |
|---------|----------|
| Fader | Send MIDI CC Value (0-127) |
| Encoder | Select MIDI CC Number |
| Scribble Strip | Show Current CC Number |

**Configuration**:
- Each fader can be assigned a different CC number
- CC values sent as 0-127 (mapped from fader 0-100%)
- Use encoder to select which CC each fader controls

**Display**:
- LCD shows current CC number selected for each channel

**Notes**:
- Custom handlers manage MIDI output
- All buttons have dummy bindings (no function)

---

### 6. SHIFT PAGE

**Purpose**: Navigation and mode toggle for all main pages

**Button Functions** (Select buttons on channels 1-8):

| Channel | Function |
|---------|----------|
| 1 | Mixer Page |
| 2 | Control Room Page |
| 3 | MIDI CC Page |
| 4 | Gate Page |
| 5 | Compressor Page |
| 6 | Tools Page |
| 7 | Saturator Page |
| 8 | Limiter Page |

**Button Functions** (Mute buttons on channels 1-4):

| Channel | Function |
|---------|----------|
| 1 | EQ Page |
| 2 | Sends QC Page |
| 3 | PreFilter Page |
| 4 | Cue Sends Page |

**Display Mode Toggle** (Record button on Channel 1):
- Press to toggle value display mode (show encoder/fader values)
- Applies globally to pages with bound controls

**Display**:
- Scribble strips show custom page label names
- No fader or encoder functionality on this page

**Notes**:
- Solo buttons and all other controls (faders, encoders, other buttons) are disabled on Shift page
- Used for quick navigation between pages
- Display mode affects all channels on current page simultaneously

---

## Control Summary Table

| Feature | Icon Platform M+ |
|---------|-----------------|
| **Channels** | 8 |
| **Faders** | 8 (+ 1 master) |
| **Encoders** | 8 (knobs with push) |
| **Buttons per Channel** | 4 (Select, Mute, Solo, Record) |
| **Pages** | 13 total (6 mixer pages + 5 effect pages + Shift) |
| **LCD Display** | 2-line per channel + custom Shift page labels |

---

## Display Mode Toggling

Press the **Record button on Channel 1** in the **Shift page** to toggle value display mode:

- **Default**: Uses each page's `displayLineConfiguration` for names/titles
- **Value Mode**: Shows encoder/fader values where available

---

## Tips & Tricks

1. **Channel Organization**: Use the mixer page Select buttons to quickly navigate and organize your session
2. **Quick Monitoring**: The Control Room page gives fast access to main, phones, and cue sends
3. **Effect Workflow**: The Effect pages show toggle states for ON/OFF and Bypass to see effect status at a glance
4. **Parameter Navigation**: Use keyboard shortcuts to advance parameter banks while on EQ/PreFilter pages
5. **Stream Deck Integration**: If using Stream Deck MIDI plugin, buttons can display current state and parameter values

---

## Stream Deck Integration

For integration with Elgato Stream Deck, see [STREAMDECK_INTEGRATION.md](STREAMDECK_INTEGRATION.md).

---

## Architecture Notes

For technical details about the binding system, configuration format, and development information, see:
- [BINDING_CONFIG_REFERENCE.md](BINDING_CONFIG_REFERENCE.md) - Configuration system documentation
- [DUKTAPE_COMPATIBILITY.md](DUKTAPE_COMPATIBILITY.md) - Cubase JavaScript engine compatibility notes
- [README.md](README.md) - Build and general information
