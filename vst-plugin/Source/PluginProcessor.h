/*
  ==============================================================================
    PluginProcessor.h - MySynth PRO Ultimate VSTi
    Created: 2024/1/1
    Description: Complete audio processor with all professional features
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include "SynthVoice.h"
#include "SynthSound.h"

// Parameter IDs - Comprehensive parameter list for ultimate synth
namespace Params
{
    // Master
    constexpr const char* MASTER_GAIN   = "master_gain";
    constexpr const char* PAN           = "pan";
    constexpr const char* VOICE_LIMIT   = "voice_limit";
    
    // Oscillator 1
    constexpr const char* OSC1_TYPE     = "osc1_type";
    constexpr const char* OSC1_PITCH    = "osc1_pitch";
    constexpr const char* OSC1_DETUNE   = "osc1_detune";
    constexpr const char* OSC1_POS      = "osc1_position";
    
    // Oscillator 2
    constexpr const char* OSC2_TYPE     = "osc2_type";
    constexpr const char* OSC2_PITCH    = "osc2_pitch";
    constexpr const char* OSC2_DETUNE   = "osc2_detune";
    constexpr const char* OSC2_LEVEL    = "osc2_level";
    
    // Unison / Supersaw
    constexpr const char* UNISON_VOICES = "unison_voices";
    constexpr const char* UNISON_SPREAD = "unison_spread";
    constexpr const char* UNISON_DETUNE = "unison_detune";
    
    // Noise & Ring Mod
    constexpr const char* NOISE_TYPE    = "noise_type";
    constexpr const char* NOISE_LEVEL   = "noise_level";
    constexpr const char* RING_MOD      = "ring_mod";
    constexpr const char* RING_MOD_FREQ = "ring_mod_freq";
    
    // ADSR Envelope
    constexpr const char* ATTACK        = "attack";
    constexpr const char* DECAY         = "decay";
    constexpr const char* SUSTAIN       = "sustain";
    constexpr const char* RELEASE       = "release";
    
    // Filter 1
    constexpr const char* FILTER1_TYPE      = "filter1_type";
    constexpr const char* FILTER1_CUTOFF    = "filter1_cutoff";
    constexpr const char* FILTER1_RESO      = "filter1_reso";
    constexpr const char* FILTER1_DRIVE     = "filter1_drive";
    constexpr const char* FILTER1_ENV       = "filter1_env_amount";
    constexpr const char* FILTER1_KEYTRACK  = "filter1_keytrack";
    
    // Filter 2
    constexpr const char* FILTER2_TYPE      = "filter2_type";
    constexpr const char* FILTER2_CUTOFF    = "filter2_cutoff";
    constexpr const char* FILTER2_RESO      = "filter2_reso";
    constexpr const char* FILTER2_ENV       = "filter2_env_amount";
    
    // Filter Routing
    constexpr const char* FILTER_ROUTING  = "filter_routing";
    constexpr const char* FILTER_MIX      = "filter_mix";
    constexpr const char* FORMANT_VOWEL   = "formant_vowel";
    
    // LFOs
    constexpr const char* LFO1_SHAPE     = "lfo1_shape";
    constexpr const char* LFO1_RATE      = "lfo1_rate";
    constexpr const char* LFO1_DEPTH     = "lfo1_depth";
    constexpr const char* LFO1_PHASE     = "lfo1_phase";
    constexpr const char* LFO2_SHAPE     = "lfo2_shape";
    constexpr const char* LFO2_RATE      = "lfo2_rate";
    constexpr const char* LFO2_DEPTH     = "lfo2_depth";
    
    // Macros
    constexpr const char* MACRO_1        = "macro_1";
    constexpr const char* MACRO_2        = "macro_2";
    constexpr const char* MACRO_3        = "macro_3";
    constexpr const char* MACRO_4        = "macro_4";
    constexpr const char* MACRO_5        = "macro_5";
    constexpr const char* MACRO_6        = "macro_6";
    constexpr const char* MACRO_7        = "macro_7";
    constexpr const char* MACRO_8        = "macro_8";
    
    // Effects - Reverb
    constexpr const char* REV_SIZE       = "rev_size";
    constexpr const char* REV_DECAY      = "rev_decay";
    constexpr const char* REV_MIX        = "rev_mix";
    
    // Effects - Delay
    constexpr const char* DELAY_TIME     = "delay_time";
    constexpr const char* DELAY_FEEDBACK = "delay_feedback";
    constexpr const char* DELAY_MIX      = "delay_mix";
    
    // Effects - Chorus
    constexpr const char* CHORUS_RATE    = "chorus_rate";
    constexpr const char* CHORUS_DEPTH   = "chorus_depth";
    constexpr const char* CHORUS_MIX     = "chorus_mix";
    
    // Effects - Drive/Distortion
    constexpr const char* DRIVE_AMOUNT   = "drive_amount";
    constexpr const char* DRIVE_TONE     = "drive_tone";
    
    // Effects - EQ
    constexpr const char* EQ_LOW         = "eq_low";
    constexpr const char* EQ_MID         = "eq_mid";
    constexpr const char* EQ_HIGH        = "eq_high";
    
    // Effects - Compressor
    constexpr const char* COMP_THRESHOLD = "comp_threshold";
    constexpr const char* COMP_RATIO     = "comp_ratio";
    constexpr const char* COMP_MAKEUP    = "comp_makeup";
    
    // Effects - Stereo
    constexpr const char* STEREO_WIDTH   = "stereo_width";
    
    // Effects - Limiter
    constexpr const char* LIMITER_CEILING = "limiter_ceiling";
    
    // Voice Mode
    constexpr const char* VOICE_MODE     = "voice_mode";
    constexpr const char* PORTAMENTO     = "portamento";
    constexpr const char* GLIDE_CURVE    = "glide_curve";
    
    // Quality
    constexpr const char* OVERSAMPLING   = "oversampling";
    constexpr const char* ANTI_ALIAS     = "anti_alias";
}

class MySynthAudioProcessor  : public juce::AudioProcessor
#if JucePlugin_Enable_ARA
                             , public juce::AudioProcessorARAExtension
#endif
{
public:
    //==============================================================================
    MySynthAudioProcessor();
    ~MySynthAudioProcessor() override;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
#endif

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;
    void processBlock (juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==============================================================================
    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==============================================================================
    int getNumPrograms() override { return 128; }
    int getCurrentProgram() override { return currentProgram; }
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int index, const juce::String& newName) override;

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    // Access to APVTS for editor binding
    juce::AudioProcessorValueTreeState& getAPVTS() { return apvts; }
    
    // Get current CPU usage for display
    float getCpuUsage() const { return cpuUsage.load(); }

private:
    //==============================================================================
    // Synthesizer with extended voice count
    juce::Synthesizer synth;
    
    // Parameter tree
    juce::AudioProcessorValueTreeState apvts;
    
    // Create comprehensive parameter layout
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
    
    // Update all parameters from APVTS
    void updateAllParameters();
    
    // Apply effects chain
    void applyEffects(juce::AudioBuffer<float>& buffer);
    
    // Effect processors
    struct EffectsChain {
        // Reverb
        juce::Reverb reverb;
        juce::Reverb::Parameters reverbParams;
        
        // Delay line (simple implementation)
        std::vector<std::vector<float>> delayBuffer;
        int delayPosition = 0;
        
        // Compressor state
        float compEnvelope = 0.0f;
        
        // Limiter state
        float limiterGain = 1.0f;
    } effects;
    
    // Initialize effects
    void initializeEffects(double sampleRate, int samplesPerBlock);
    
    // Preset management
    int currentProgram = 0;
    std::array<juce::String, 128> presetNames;
    void initializePresets();
    void loadPreset(int index);
    
    // Performance tracking
    std::atomic<float> cpuUsage{0.0f};
    juce::Time lastCpuUpdateTime;
    int processCounter = 0;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MySynthAudioProcessor)
};
