To build:
---------

Install required node packages:
`npm install`


Usage:
------

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for a complete guide to all pages, buttons, and faders on the Icon Platform M+.


Architecture:
--------------

The binding system uses a config-driven approach via `BindingCreator` and declarative configs in `src/config/subpages/`.
Unused surface elements are automatically bound to dummy values via `dummyBindings` in the config.
This pattern is applied to all subpages including Selected Track (SendsQC, EQ, CueSends, PreFilter) and Channel Strip effects.

Development:
------------

See [DUKTAPE_COMPATIBILITY.md](DUKTAPE_COMPATIBILITY.md) for important compatibility notes about Cubase's JavaScript engine (Duktape) and known workarounds for common issues.

See [BINDING_CONFIG_REFERENCE.md](BINDING_CONFIG_REFERENCE.md) for documentation on the binding configuration system.

See [STREAMDECK_INTEGRATION.md](STREAMDECK_INTEGRATION.md) for documentation on integrating with Elgato Stream Deck using the MIDI plugin.

TODO:
-----
- [] SD buttons show full track and value details
- [x] Release action
- [] Anything else for the Shift Page?
- [] Ch strip: Would be helpful if status lights or sd buttons displayed whether the selected strip module was loaded, active or bypassed


Known Issues:
------------
# Activate plugin doesn't work on channel strips

# Midi remote cached json file breaks update to script (as does Cubase itself)
A cached settings file exists here for midi remote configuration when surfaces are added. If things get lost this can be incorrect even if the surface is deleted and re-added with the new javascript file.

** Delete this if things get weird **
C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\User Settings\bfc_platformplussd_...json

Full clean removal/reinstall (seems to work most of the time):
1. Load Project that is impacted
2. Remove control surface and any shadow ones.
3. Save Project and Quit Cubase
4. Delete file: C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\User Settings\bfc_platformplussd_...json
5. Rename the driver script in C:\Users\<user>>\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\bfw\platformmplussd from bfw_platformmplussd.js to bfw_platformmplussd.old
6. Start Cubase
7. Load Project - there should be no Platform plus SD midi remote
8. Save Project
9. Quit Cubase
10. Add updated (or rename old) driver script to folder in 5
11. Start Cubase
12. Load Project
13. There should at this stage be NO platform plus SD midi remotes (if there are then repeat the steps)
14. Add the control surface again in Midi remote.

Why is this so? I have no idea. Cubase appears to store midi remote information in the project, in User Settings and in the Driver - and the Driver appears to be the last thing to be checked if the other things exist!

