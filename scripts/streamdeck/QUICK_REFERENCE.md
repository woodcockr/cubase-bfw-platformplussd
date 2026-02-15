# Stream Deck Quick Reference

Quick reference guide for setting up Stream Deck integration with Icon Platform M+ MIDI Remote for Cubase.

## Ports to Create

Create these virtual MIDI ports on your system:

```
Platform M+ SD Input   (receive port for MIDI Remote)
Platform M+ SD Output  (send port from MIDI Remote)
```

## Stream Deck Button Scripts

### Display Mode Status Button

Copy and paste this script into a Stream Deck MIDI button to display the current display line mode:

```javascript
[
  (init) {text:Value\nDisplay}
  (sysex:F0 7D 00 XX F7) {text:#@e_sysextext#}
]
```

**Setup**:
1. Add a button to Stream Deck
2. Search for "MIDI" action
3. Paste the script above
4. Ensure the button is configured to listen for SysEx updates

## SysEx Message Format

Messages from MIDI Remote follow this structure:

```
F0 7D 00 <ASCII text> F7
```

- `F0 7D 00` - Header (manufacturer + message type)
- `<ASCII text>` - The text to display (printable characters only)
- `F7` - End marker

## Button Event Pattern

Always use this pattern in Stream Deck scripts to listen for SysEx:

```javascript
(sysex:F0 7D 00 XX F7)
```

Where:
- `F0 7D 00` - Fixed header
- `XX` - Wildcard for variable text bytes
- `F7` - Fixed end

## Text Display Action

Use this action to update button text from SysEx messages:

```javascript
{text:#@e_sysextext#}
```

Special variables:
- `#@e_sysextext#` - Extracts ASCII text from SysEx payload

## Common Issues

| Issue | Solution |
|-------|----------|
| Text not appearing | Check virtual ports are created and connected |
| Script not parsing | Verify brackets match: `[ ( ) { } ]` |
| Old text showing | Ensure `#@e_sysextext#` variable is used |
| No response to toggle | Verify Stream Deck has correct MIDI port selected |
| Wrong message received | Check message type matches (default: `00`) |

## Testing SysEx Reception

To verify your Stream Deck receives SysEx messages:

1. Open Stream Deck settings
2. Create a test button with script: `[(sysex:F0 7D 00 XX F7) {text:RECEIVED}]`
3. In Shift page, press Record button (Channel 1) to toggle display mode
4. Button text should change to "RECEIVED" if messages are being received

## More Information

- Full setup instructions: See [STREAMDECK_INTEGRATION.md](../STREAMDECK_INTEGRATION.md)
- Quick reference guide: See [QUICK_REFERENCE.md](../QUICK_REFERENCE.md)
- API documentation: See [BINDING_CONFIG_REFERENCE.md](../BINDING_CONFIG_REFERENCE.md)
