# Changelog

All notable changes to the Icon Platform M+ MIDI Remote project will be documented in this file.

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
