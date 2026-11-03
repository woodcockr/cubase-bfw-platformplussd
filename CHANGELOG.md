# Changelog

All notable changes to the Icon Platform M+ MIDI Remote project will be documented in this file.

## [4.1.0-rc2] - 2026-11-04

Release notes: [release-notes/v4.1.0-rc2.md](release-notes/v4.1.0-rc2.md)

### Fixed
- Pressing Record when Cubase did not actually start recording no longer leaves the jog wheel blocked in all modes. The wheel now waits at most 1 s for Cubase's record feedback, and that feedback alone decides whether recording is active.
- After a project/transport switch, Scrub and Shuttle wait for the new project's record state before accepting wheel input.
- Scrub now starts each gesture from Cubase's current Jog position instead of the encoder's local value, so the first movement cannot jump. Encoder recentering no longer echoes a write to Cubase. This may also reduce the scrub skip-back; please report whether it does.

## [4.1.0-rc1] - 2026-11-04

Release notes: [release-notes/v4.1.0-rc1.md](release-notes/v4.1.0-rc1.md)

### Added
- **Jog wheel modes**: tap the wheel to cycle Nudge (`N`), Scrub (`S`) and Shuttle (`H`). Scrub uses Cubase 15 Direct Access audio scrubbing; Shuttle is a latched speed selector (Stop, 1/8x to 8x forward and reverse).
- **Editable MIDI CC configuration**: `midi-cc-config.js` ships beside the driver and sets each MIDI CC page channel with simple `"<CC>, <name>"` lines. Any error falls back to the built-in defaults and logs `[MIDI CC config]` messages to the script console.
- Standard MIDI CC names, with orchestral library names for CC1 (Dynamics), CC2 (Breath), CC7 (Volume), CC11 (Expression) and CC21 (Vibrato).
- **Logging levels**: `src/logger.ts` with debug/info/warning/error. `npm run build` prints only startup status, warnings and errors; `npm run build:dev` adds development tracing.

### Changed
- Releases now include a zip with the Cubase folder layout (`bfw/platformmplussd/`) as well as the individual files.
- MIDI CC page defaults are now CC1, CC11, CC2, CC21, CC7, CC16, CC17, CC18.
- MIDI CC page LCD shows the CC name and fader value; encoders step one CC per detent.
- `midi_cc` removed from `src/config.ts`.
- Jog `diagnostics` now follows the build type instead of being always on.
- The idle-callback warning now prints once instead of on every idle tick.

### Fixed
- Removed the unused `masterButton` subpage option, which logged 9 "Master button … not found" warnings at startup. Stream Deck page buttons are bound directly and are unchanged.
- Removed a leftover MIDI CC fader binding (`customVariable`) that logged 8 "Could not resolve host value" warnings at startup.

### Known issues
- Scrub can occasionally jump back after long continuous jogging. Pausing briefly every few turns limits this.

## [3.0.0] - 2026-02-14

### Added
- **Quick Reference Guide**: New comprehensive [QUICK_REFERENCE.md](QUICK_REFERENCE.md) documenting all pages, buttons, and controls
- **Stream Deck Integration**: Updated [STREAMDECK_INTEGRATION.md](STREAMDECK_INTEGRATION.md) with comprehensive setup and troubleshooting
- **Stream Deck Quick Reference**: New quick reference guide at [scripts/streamdeck/QUICK_REFERENCE.md](scripts/streamdeck/QUICK_REFERENCE.md) for Stream Deck button scripts

### Improved
- **Binding Configuration Reference**: Enhanced [BINDING_CONFIG_REFERENCE.md](BINDING_CONFIG_REFERENCE.md) with new patterns
  - Added documentation for `perChannelMulti` binding pattern
  - Added documentation for `fixedIndexBindings` with command support
  - Added documentation for `midiOutput` and `displayLineConfiguration` options
  - Expanded examples for complex binding scenarios
- **Documentation Structure**: Better organization of documentation with consistent cross-references
- **README**: Added usage section with link to Quick Reference Guide

### Documentation Details

#### QUICK_REFERENCE.md Features
- Complete mapping of all 13 pages (Mixer, Control Room, 5 effect pages, 4 selected track pages, MIDI CC, Shift)
- Button and fader functions for each page
- Display mode toggling information
- Tips and tricks for efficient workflow
- Hardware overview and control summary

#### STREAMDECK_INTEGRATION.md Improvements
- Clearer setup instructions for Windows, macOS, and Linux
- Enhanced SysEx message format documentation
- Multiple Stream Deck button script examples
- Better troubleshooting guide
- Hardware-specific instructions and tools

#### BINDING_CONFIG_REFERENCE.md Enhancements
- New configuration pattern documentation
- Advanced binding examples with duplicate flag
- Command binding support examples
- MIDI output on activation/deactivation
- Display line configuration options

---

## Format Notes

This project follows [Semantic Versioning](https://semver.org/).

- **PATCH** version for documentation and bug fixes
- **MINOR** version for new features and improvements
- **MAJOR** version for breaking changes
