# PROSynth Modular Structure

## Overview
PROSynth has been refactored from a monolithic HTML file into a modular system for easier maintenance and future VST3 conversion.

## File Structure

```
vst-plugin/
├── index.html              # Main HTML structure (UI only)
├── css/
│   └── style.css           # All styles (1580 lines)
├── js/
│   ├── core.js             # Knob system, tab navigation, UI basics
│   ├── audio-engine.js     # Web Audio API, oscillators, synthesis
│   ├── ui.js               # Visualizers, spectrum analyzer
│   ├── presets.js          # Preset management, sound library
│   ├── song-starter.js     # Melody generator, music theory engine
│   ├── skin-system.js      # Theme/skin switching
│   ├── midi.js             # Web MIDI API support
│   ├── features.js         # Advanced features (arpeggiator, macros, etc.)
│   ├── creative-tools.js   # 10 revolutionary creative tools
│   └── main.js             # Initialization & module coordination
└── preview-pro.html        # Original monolithic (kept for reference)
```

## Module Dependencies

```
index.html
    │
    ├─→ core.js              (no dependencies)
    ├─→ audio-engine.js      (depends on: core.js)
    ├─→ ui.js                (depends on: core.js, audio-engine.js)
    ├─→ presets.js           (depends on: core.js, audio-engine.js)
    ├─→ song-starter.js      (depends on: core.js, audio-engine.js)
    ├─→ skin-system.js       (no dependencies)
    ├─→ midi.js              (no dependencies)
    ├─→ features.js          (depends on: core.js, audio-engine.js)
    ├─→ creative-tools.js    (depends on: core.js, presets.js)
    └─→ main.js              (initializes all modules)
```

## Module Descriptions

### core.js (220 lines)
- Knob/rotary control system with drag interaction
- Tab navigation between panels
- Effect toggle buttons
- Step sequencer UI
- ADSR envelope visualization
- Helper functions: `getKnobValue()`, `setKnobValue()`, etc.

### audio-engine.js (123 lines)
- Virtual keyboard creation and layout
- Web Audio Context initialization
- Note playing/stopping with voice management
- Oscillator types and unison/detune
- Gain envelopes (ADSR)

### ui.js (35 lines)
- Waveform display canvas
- Spectrum analyzer visualization
- Real-time frequency display

### presets.js (1113 lines)
- Preset save/load to localStorage
- PRO_SOUND_LIBRARY (100+ professional presets)
- Smart randomize system with categories
- Preset history (undo functionality)
- A/B comparison mode

### song-starter.js (1070 lines)
- Music theory engine (scales, chords, progressions)
- MelodyGenerator class
- Genre-specific configurations
- Intelligent note generation
- Rhythm pattern library

### skin-system.js (58 lines)
- 6 professional themes (Midnight, Vintage, Neon, Ocean, Sunset, Arctic)
- CSS variable switching
- LocalStorage persistence

### midi.js (126 lines)
- Web MIDI API integration
- Input device detection
- Note on/off handling
- Pitch bend & mod wheel support
- Visual MIDI indicator

### features.js (685 lines)
- Audio recording & WAV export
- Pitch/mod wheels
- Glide/portamento
- Chord mode & scale lock
- Macro controls & XY pad
- Visual output meters
- Built-in arpeggiator
- Multiple filter types

### creative-tools.js (1019 lines)
1. **Preset Morph Grid** - 2D morphing between presets
2. **Tag/Metadata System** - Sound classification tags
3. **Evolution Engine** - Breed presets to create children
4. **Waveform Sculptor** - Draw custom waveforms
5. **Modulation Canvas** - Draw LFO shapes
6. **Macro System** - Parameter linking
7. **Performance Mode** - Scene switching, loop recorder
8. **Weather System** - Atmospheric parameter mapping
9. **History Tree** - Preset lineage visualization
10. **Constraint Randomizer** - Smart randomization with locks

### main.js (58 lines)
- Application initialization
- Module coordination
- Global state management (window.PROSynth)
- DOM ready detection

## Development Workflow

1. Edit individual JS files in `/js/`
2. Refresh browser to test changes
3. Each module can be developed independently
4. For VST3 conversion: Replace Web Audio API calls in `audio-engine.js` with JUCE DSP code

## Building Monolithic Version (if needed)

To combine back into a single file:
```bash
# Use the extract-modules.py script in reverse, or simply concatenate:
cat css/style.css > preview-pro.html
# Add HTML wrapper around it
cat js/*.js >> preview-pro.html
```

## Notes

- All modules use global scope (intentional for browser compatibility)
- No build tools required - works with static file serving
- Ready for ES Module conversion if desired later
- Original `preview-pro.html` preserved as backup reference
