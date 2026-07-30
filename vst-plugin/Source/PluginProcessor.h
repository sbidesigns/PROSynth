/*
  ==============================================================================
    PluginProcessor.h
    Created: 2024/1/1
    Description: Main audio processor for MySynth VSTi - A subtractive synthesizer
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include "SynthVoice.h"
#include "SynthSound.h"

// Parameter IDs - used for automation and state saving
namespace Params
{
    constexpr const char* MASTER_GAIN   = "master_gain";
    constexpr const char* ATTACK        = "attack";
    constexpr const char* DECAY         = "decay";
    constexpr const char* SUSTAIN       = "sustain";
    constexpr const char* RELEASE       = "release";
    constexpr const char* OSC_TYPE      = "osc_type";
    constexpr const char* OSC_PITCH     = "osc_pitch";
    constexpr const char* OSC_DETUNE    = "osc_detune";
    constexpr const char* FILTER_CUTOFF = "filter_cutoff";
    constexpr const char* FILTER_RESO   = "filter_reso";
    constexpr const char* FILTER_ENV    = "filter_env_amount";
    constexpr const char* FILTER_TYPE   = "filter_type";
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
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int index) override {}
    const juce::String getProgramName (int index) override { return {}; }
    void changeProgramName (int index, const juce::String& newName) override {}

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    // Access to APVTS for editor binding
    juce::AudioProcessorValueTreeState& getAPVTS() { return apvts; }

private:
    //==============================================================================
    // Synthesizer voice management
    juce::Synthesizer synth;
    
    // Parameter tree for host integration
    juce::AudioProcessorValueTreeState apvts;
    
    // Create parameter layout
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
    
    // Update synth parameters from APVTS values
    void updateParameters();
    
    // Last known parameter values (for detecting changes)
    float lastMasterGain = 0.0f;
    float lastAttack = 0.0f;
    float lastDecay = 0.0f;
    float lastSustain = 0.0f;
    float lastRelease = 0.0f;
    float lastFilterCutoff = 0.0f;
    float lastFilterReso = 0.0f;
    float lastFilterEnvAmount = 0.0f;
    int lastOscType = 0;
    int lastFilterType = 0;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MySynthAudioProcessor)
};
