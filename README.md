To build:
---------

Install required node packages:
`npm install`


Architecture:
--------------

The binding system uses a config-driven approach via `BindingCreator` and declarative configs in `src/config/subpages/`.
Unused surface elements are automatically bound to dummy values via `dummyBindings` in the config.
This pattern is applied to all subpages including Selected Track (SendsQC, EQ, CueSends, PreFilter) and Channel Strip effects.

TODO:
-----
- [] Ch strip: Would be helpful if status lights or sd buttons displayed whether the selected strip module was loaded, active or bypassed


Known Issues:
------------

# Activate plugin doesn't work on channel strips



A cached settings file exists here for midi remote configuration when surfaces are added. If things get lost this can be incorrect even if the surface is deleted and re-added with the new javascript file.

** Delete this if things get weird **

C:\Users\woodc\OneDrive\Documents\Steinberg\Cubase\MIDI Remote\User Settings\bfc_platformplussd_...json
