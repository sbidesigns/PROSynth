/*
  ==============================================================================
    PluginProcessor.cpp
    Created: 2024/1/1
    Description: Implementation of MySynth VSTi audio processor
 ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
MySynthAudioProcessor::MySynthAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
       apvts (*this, nullptr, "Parameters", createParameterLayout())
#endif
{
    // Initialize synthesizer with voices
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    synth.addVoice (new SynthVoice());
    
    // Add sound to synthesizer
    synth.addSound (new SynthSound());
}

MySynthAudioProcessor::~MySynthAudioProcessor()
{
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout 
MySynthAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
    
    // Master Gain: -60dB to +6dB, default -3dB
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::MASTER_GAIN,
        "Master Gain",
        juce::NormalisableRange<float> (-60.0f, 6.0f, 0.1f),
        -3.0f,
        "dB",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String(value, 1) + " dB"; },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));
    
    // ADSR Envelope parameters
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::ATTACK,
        "Attack",
        juce::NormalisableRange<float> (0.001f, 5.0f, 0.001f, 0.4f),
        0.01f,
        "s",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String(value, 3) + " s"; },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::DECAY,
        "Decay",
        juce::NormalisableRange<float> (0.001f, 5.0f, 0.001f, 0.4f),
        0.2f,
        "s",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String(value, 3) + " s"; },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::SUSTAIN,
        "Sustain",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.7f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String(value * 100, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::RELEASE,
        "Release",
        juce::NormalisableRange<float> (0.01f, 10.0f, 0.01f, 0.4f),
        0.3f,
        "s",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String(value, 2) + " s"; },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));
    
    // Oscillator parameters
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        Params::OSC_TYPE,
        "Oscillator Type",
        {"Sawtooth", "Square", "Sine", "Triangle", "Noise"},
        0
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::OSC_PITCH,
        "Osc Pitch",
        juce::NormalisableRange<float> (-24.0f, 24.0f, 1.0f),
        0.0f,
        "semi",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String((int)value) + " st"; },
        [](const juce::String& text) { return (float)text.getIntValue(); }
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::OSC_DETUNE,
        "Detune",
        juce::NormalisableRange<float> (-50.0f, 50.0f, 1.0f),
        0.0f,
        "cents"
    ));
    
    // Filter parameters
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::FILTER_CUTOFF,
        "Filter Cutoff",
        juce::NormalisableRange<float> (20.0f, 20000.0f, 1.0f, 0.35f),
        8000.0f,
        "Hz",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int)
        {
            if (value < 1000.0f)
                return juce::String((int)value) + " Hz";
            else if (value < 10000.0f)
                return juce::String(value / 1000.0f, 1) + " kHz";
            else
                return juce::String(value / 1000.0f, 1) + " kHz";
        },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::FILTER_RESO,
        "Resonance",
        juce::NormalisableRange<float> (0.1f, 10.0f, 0.01f),
        1.0f,
        "Q"
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        Params::FILTER_ENV,
        "Filter Env Amount",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.5f
    ));
    
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        Params::FILTER_TYPE,
        "Filter Type",
        {"Low Pass", "High Pass", "Band Pass"},
        0
    ));
    
    return { params.begin(), params.end() };
}

//==============================================================================
void MySynthAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    // Prepare the synthesizer
    synth.setCurrentPlaybackSampleRate (sampleRate);
    
    // Prepare any additional processing here (reverb, delay, etc.)
}

void MySynthAudioProcessor::releaseResources()
{
    // Free any resources when playback stops
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool MySynthAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    #if JucePlugin_IsMidiEffect
    juce::ignoreUnused (layouts);
    return true;
    #else
    // This is a synth, so we only support output buses
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

   #if ! JucePlugin_IsSynth
    // For effects, check input configuration
    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    // Don't allow input/output channel count mismatch
    if (layouts.getMainInputChannelSet() != layouts.getMainOutputChannelSet())
        return false;
   #endif

    return true;
    #endif
}
#endif

void MySynthAudioProcessor::updateParameters()
{
    // Get current parameter values
    float masterGain = apvts.getRawParameterValue(Params::MASTER_GAIN)->load();
    float attack = apvts.getRawParameterValue(Params::ATTACK)->load();
    float decay = apvts.getRawParameterValue(Params::DECAY)->load();
    float sustain = apvts.getRawParameterValue(Params::SUSTAIN)->load();
    float release = apvts.getRawParameterValue(Params::RELEASE)->load();
    int oscType = static_cast<int>(apvts.getRawParameterValue(Params::OSC_TYPE)->load());
    float oscPitch = apvts.getRawParameterValue(Params::OSC_PITCH)->load();
    float oscDetune = apvts.getRawParameterValue(Params::OSC_DETUNE)->load();
    float filterCutoff = apvts.getRawParameterValue(Params::FILTER_CUTOFF)->load();
    float filterReso = apvts.getRawParameterValue(Params::FILTER_RESO)->load();
    float filterEnvAmount = apvts.getRawParameterValue(Params::FILTER_ENV)->load();
    int filterType = static_cast<int>(apvts.getRawParameterValue(Params::FILTER_TYPE)->load());
    
    // Update each voice's parameters only when they change
    for (int i = 0; i < synth.getNumVoices(); ++i)
    {
        if (auto* voice = dynamic_cast<SynthVoice*>(synth.getVoice(i)))
        {
            voice->setMasterGain(juce::Decibels::decibelsToGain(masterGain));
            
            // Only update ADSR if values changed
            if (std::abs(attack - lastAttack) > 0.0001f ||
                std::abs(decay - lastDecay) > 0.0001f ||
                std::abs(sustain - lastSustain) > 0.0001f ||
                std::abs(release - lastRelease) > 0.0001f)
            {
                voice->updateADSR(attack, decay, sustain, release);
            }
            
            // Update oscillator settings
            if (oscType != lastOscType || 
                std::abs(oscPitch - 0.0f) > 0.001f ||
                std::abs(oscDetune - 0.0f) > 0.001f)
            {
                voice->updateOscillator(static_cast<SynthVoice::OscillatorType>(oscType), oscPitch, oscDetune);
            }
            
            // Update filter settings
            if (std::abs(filterCutoff - lastFilterCutoff) > 1.0f ||
                std::abs(filterReso - lastFilterReso) > 0.01f ||
                std::abs(filterEnvAmount - lastFilterEnvAmount) > 0.001f ||
                filterType != lastFilterType)
            {
                voice->updateFilter(filterCutoff, filterReso, filterEnvAmount, 
                                   static_cast<SynthVoice::FilterType>(filterType));
            }
        }
    }
    
    // Store current values for comparison
    lastMasterGain = masterGain;
    lastAttack = attack;
    lastDecay = decay;
    lastSustain = sustain;
    lastRelease = release;
    lastOscType = oscType;
    lastFilterCutoff = filterCutoff;
    lastFilterReso = filterReso;
    lastFilterEnvAmount = filterEnvAmount;
    lastFilterType = filterType;
}

void MySynthAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear output channels that don't contain input data
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Update parameters from APVTS
    updateParameters();
    
    // Render synthesizer output
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());
    
    // Apply master gain limiting/clipping to prevent distortion
    buffer.applyGain(1.0f);
}

void MySynthAudioProcessor::processBlock (juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    updateParameters();
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());
}

//==============================================================================
juce::AudioProcessorEditor* MySynthAudioProcessor::createEditor()
{
    return new MySynthAudioProcessorEditor (*this);
}

//==============================================================================
void MySynthAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // Save state to XML
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void MySynthAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // Restore state from XML
    std::unique_ptr<juce::XmlElement> xml (getXmlFromBinary (data, sizeInBytes));
    
    if (xml.get() != nullptr && xml->hasTagName (apvts.state.getType()))
    {
        apvts.replaceState (juce::ValueTree::fromXml (*xml));
    }
}

//==============================================================================
// This creates new instances of the plugin..
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MySynthAudioProcessor();
}
