# MySynth VSTi - A Subtractive Synthesizer Plugin

A professional-grade virtual instrument (VST3) plugin built with **JUCE 7** framework. Features dual-oscillator synthesis, resonant filtering, and full ADSR envelope control.

## 🎹 Features

### Oscillator Section
- **5 Waveforms**: Sawtooth, Square, Sine, Triangle, Noise
- **Dual Oscillators**: Detunable second voice for thickness
- **Pitch Control**: ±24 semitones range
- **Detune**: ±50 cents for subtle to extreme detuning

### Envelope (ADSR)
- **Attack**: 0.001s - 5s (logarithmic)
- **Decay**: 0.001s - 5s (logarithmic)
- **Sustain**: 0% - 100%
- **Release**: 0.01s - 10s (logarithraphic)

### Filter
- **Types**: Low Pass, High Pass, Band Pass
- **Cutoff**: 20Hz - 20kHz
- **Resonance** (Q): 0.1 - 10.0
- **Envelope Modulation**: Controls how much envelope affects filter

### Master
- **Gain**: -60dB to +6dB

## 🛠️ Building from Source

### Prerequisites

1. **JUCE 7.x** - Download from [juce.com](https://juce.com/download/)
2. **CMake 3.22+**
3. **C++17 compatible compiler**:
   - Windows: Visual Studio 2019/2022 or MinGW-w64
   - macOS: Xcode 12+ or Clang
   - Linux: GCC 9+ or Clang 10+

### Build Steps

#### Option 1: Using CMake (Recommended)

```bash
# Clone or navigate to project directory
cd vst-plugin

# Configure build (set JUCE_DIR to your JUCE installation)
cmake -B build -DJUCE_DIR=/path/to/JUCE

# Build
cmake --build build --config Release
```

#### Option 2: Using Projucer (GUI)

1. Open JUCE's Projucer application
2. Create new project → "Audio Plug-In"
3. Import source files from `Source/` directory
4. Configure settings:
   - Plugin Formats: VST3, AU (macOS), Standalone
   - Company Name: YourCompany
   - Plugin Name: MySynth
   - Plugin Version: 1.0.0
5. Export to IDE and build

### Platform-Specific Notes

#### Windows
- Output VST3 goes to: `C:\Program Files\Common Files\VST3\`
- For development: `build\MySynthVST_artefacts\Release\VST3\MySynth.vst3`

#### macOS
- Output VST3 goes to: `/Library/Audio/Plug-Ins/VST3/`
- AU component goes to: `/Library/Audio/Plug-Ins/Components/`
- Code signing required for distribution

#### Linux
- Output VST3 goes to: `~/.vst3/` or `/usr/lib/vst3/`

## 📁 Project Structure

```
vst-plugin/
├── CMakeLists.txt          # Build configuration
├── Resources/
│   └── icon.png            # Plugin icon (optional)
├── Source/
│   ├── PluginProcessor.h/cpp   # Main audio processor & parameters
│   ├── PluginEditor.h/cpp      # GUI/editor interface
│   ├── SynthVoice.h/cpp        # Per-note voice DSP engine
│   └── SynthSound.h/cpp        # Sound definition
└── README.md               # This file
```

## 🔌 Installing in DAWs

### Ableton Live
1. Go to `Preferences → Plug-ins`
2. Ensure VST3 folder is scanned
3. Restart Live; plugin appears in "Instruments" category

### FL Studio
1. Copy `.vst3` to FL Studio's VST plugins folder
2. Scan for new plugins via Channel Settings

### Logic Pro (macOS)
1. Copy `.component` to `/Library/Audio/Plug-Ins/Components/`
2. Restart Logic Pro

### Reaper
1. Options → Preferences → VST
2. Add plugin path if needed
3. Rescan plugins

### Studio One
1. `Studio One → Options → Locations → VST Plug-ins`
2. Add path and rescan

## 🎛️ Parameter Automation IDs

| Parameter | ID | Range | Default |
|-----------|-----|-------|---------|
| Master Gain | `master_gain` | -60 to +6 dB | -3 dB |
| Attack | `attack` | 0.001 - 5 s | 0.01 s |
| Decay | `decay` | 0.001 - 5 s | 0.2 s |
| Sustain | `sustain` | 0 - 100% | 70% |
| Release | `release` | 0.01 - 10 s | 0.3 s |
| Oscillator Type | `osc_type` | 0-4 (enum) | Sawtooth |
| Pitch Offset | `osc_pitch` | ±24 st | 0 |
| Detune | `osc_detune` | ±50 cents | 0 |
| Filter Cutoff | `filter_cutoff` | 20 - 20000 Hz | 8000 Hz |
| Resonance | `filter_reso` | 0.1 - 10 Q | 1.0 |
| Filter Env Amount | `filter_env_amount` | 0 - 1 | 0.5 |
| Filter Type | `filter_type` | 0-2 (enum) | Low Pass |

## 🚀 Next Steps / Future Enhancements

- [ ] Add LFO modulation (vibrato, tremolo, filter sweep)
- [ ] Implement effects section (reverb, delay, chorus)
- [ ] Add preset management system
- [ ] Support MPE (MIDI Polyphonic Expression)
- [ ] Create scalable vector GUI
- [ ] Add built-in arpeggiator
- [ ] Implement unison mode with spread
- [ ] Add wavetable oscillator support

## 📄 License

This project is provided as open-source educational material. Feel free to modify and distribute.

## 🙏 Credits

Built with [JUCE](https://juce.com/) framework.
Inspired by classic subtractive synthesizers.

---

**Happy producing! 🎵**
