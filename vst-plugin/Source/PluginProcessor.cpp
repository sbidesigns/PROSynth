/*
  ==============================================================================
    PluginProcessor.cpp - MySynth PRO Ultimate VSTi
    Created: 2024/1/1
    Description: Implementation with full feature set
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
    // Initialize with 16 voices for polyphony
    for (int i = 0; i < 16; ++i)
        synth.addVoice (new SynthVoice());
    
    synth.addSound (new SynthSound());
    
    initializePresets();
    
    lastCpuUpdateTime = juce::Time::getCurrentTime();
}

MySynthAudioProcessor::~MySynthAudioProcessor()
{
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout 
MySynthAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
    
    auto addFloatParam = [&](const char* id, const char* name, float min, float max, 
                             float def, const char* unit = "", auto valueToString = [](float v, int){ return juce::String(v); },
                             auto stringToValue = [](const juce::String& s){ return s.getFloatValue(); }) {
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            id, name, juce::NormalisableRange<float>(min, max), def, unit,
            juce::AudioProcessorParameter::genericParameter, valueToString, stringToValue));
    };
    
    auto addChoiceParam = [&](const char* id, const char* name, const std::vector<const char*>& choices, int def) {
        auto* p = new juce::AudioParameterChoice(id, name, juce::StringArray(choices.data(), (int)choices.size()), def);
        params.push_back(std::unique_ptr<juce::AudioParameterChoice>(p));
    };
    
    // ===== MASTER SECTION =====
    addFloatParam(Params::MASTER_GAIN, "Master Gain", -60.0f, 6.0f, -3.0f, "dB",
        [](float v, int) { return juce::String(v, 1) + " dB"; });
    addFloatParam(Params::PAN, "Pan", -100.0f, 100.0f, 0.0f, "%",
        [](float v, int) { return v == 0 ? "C" : (v < 0 ? "L" + juce::String(-v/100 * 100, 0) + "%" : "R" + juce::String(v/100 * 100, 0) + "%"); });
    addFloatParam(Params::VOICE_LIMIT, "Voice Limit", 1.0f, 32.0f, 16.0f, "",
        [](float v, int) { return juce::String((int)v); });
    
    // ===== OSCILLATOR 1 =====
    addChoiceParam(Params::OSC1_TYPE, "Oscillator 1 Type", {"Wavetable","Sawtooth","Square/PWM","Sine","Triangle","Noise","FM Operator","Granular","Additive"}, 0);
    addFloatParam(Params::OSC1_PITCH, "Osc 1 Pitch", -24.0f, 24.0f, 0.0f, "st",
        [](float v, int) { return juce::String((int)v) + " st"; });
    addFloatParam(Params::OSC1_DETUNE, "Osc 1 Detune", -50.0f, 50.0f, 0.0f, "¢");
    addFloatParam(Params::OSC1_POS, "Wavetable Position", 0.0f, 100.0f, 0.0f, "%");
    
    // ===== OSCILLATOR 2 =====
    addChoiceParam(Params::OSC2_TYPE, "Oscillator 2 Type", {"Sawtooth","Square/PWM","Sine","Triangle","Noise","FM Operator"}, 0);
    addFloatParam(Params::OSC2_PITCH, "Osc 2 Pitch", -24.0f, 24.0f, -7.0f, "st",
        [](float v, int) { return juce::String((int)v) + " st"; });
    addFloatParam(Params::OSC2_DETUNE, "Osc 2 Detune", -50.0f, 50.0f, 7.0f, "¢");
    addFloatParam(Params::OSC2_LEVEL, "Osc 2 Level", 0.0f, 100.0f, 75.0f, "%");
    
    // ===== UNISON / SUPERSAW =====
    addFloatParam(Params::UNISON_VOICES, "Unison Voices", 1.0f, 16.0f, 1.0f, "",
        [](float v, int) { return juce::String((int)v); });
    addFloatParam(Params::UNISON_SPREAD, "Unison Spread", 0.0f, 100.0f, 20.0f, "");
    addFloatParam(Params::UNISON_DETUNE, "Unison Detune", 0.0f, 50.0f, 10.0f, "¢");
    
    // ===== NOISE & RING MOD =====
    addChoiceParam(Params::NOISE_TYPE, "Noise Type", {"White","Pink","Brown","Digital","Crackles"}, 0);
    addFloatParam(Params::NOISE_LEVEL, "Noise Level", 0.0f, 100.0f, 0.0f, "%");
    addFloatParam(Params::RING_MOD, "Ring Modulation", 0.0f, 100.0f, 0.0f, "%");
    addFloatParam(Params::RING_MOD_FREQ, "Ring Mod Frequency", 0.1f, 100.0f, 1.0f, "Hz");
    
    // ===== ADSR ENVELOPE =====
    addFloatParam(Params::ATTACK, "Attack", 0.001f, 5.0f, 0.01f, "s",
        [](float v, int) { return juce::String(v, (v < 0.01 ? 3 : 2)) + " s"; }, {}, true);
    addFloatParam(Params::DECAY, "Decay", 0.001f, 5.0f, 0.2f, "s",
        [](float v, int) { return juce::String(v, (v < 0.01 ? 3 : 2)) + " s"; }, {}, true);
    addFloatParam(Params::SUSTAIN, "Sustain", 0.0f, 100.0f, 70.0f, "%",
        [](float v, int) { return juce::String((int)v) + "%"; });
    addFloatParam(Params::RELEASE, "Release", 0.01f, 10.0f, 0.3f, "s",
        [](float v, int) { return juce::String(v, 2) + " s"; }, {}, true);
    
    // ===== FILTER 1 =====
    addChoiceParam(Params::FILTER1_TYPE, "Filter 1 Type", {"LP24","LP12","HP24","HP12","BP","Notch","Comb","Formant","Moog Ladder","K35 SEM","Diode Ladder"}, 0);
    addFloatParam(Params::FILTER1_CUTOFF, "Filter 1 Cutoff", 20.0f, 20000.0f, 8000.0f, "Hz",
        [](float v, int) { return v >= 1000 ? juce::String(v / 1000.0f, 1) + " kHz" : juce::String((int)v) + " Hz"; }, {}, true);
    addFloatParam(Params::FILTER1_RESO, "Filter 1 Resonance", 0.1f, 20.0f, 1.0f, "Q");
    addFloatParam(Params::FILTER1_DRIVE, "Filter 1 Drive", 0.0f, 100.0f, 0.0f, "%");
    addFloatParam(Params::FILTER1_ENV, "Filter 1 Env Amount", 0.0f, 100.0f, 50.0f, "%");
    addFloatParam(Params::FILTER1_KEYTRACK, "Filter 1 Key Track", 0.0f, 100.0f, 33.0f, "%");
    
    // ===== FILTER 2 =====
    addChoiceParam(Params::FILTER2_TYPE, "Filter 2 Type", {"Off","LP24","HP24","BP","Notch"}, 0);
    addFloatParam(Params::FILTER2_CUTOFF, "Filter 2 Cutoff", 20.0f, 20000.0f, 4000.0f, "Hz",
        [](float v, int) { return v >= 1000 ? juce::String(v / 1000.0f, 1) + " kHz" : juce::String((int)v) + " Hz"; }, {}, true);
    addFloatParam(Params::FILTER2_RESO, "Filter 2 Resonance", 0.1f, 20.0f, 1.0f, "Q");
    addFloatParam(Params::FILTER2_ENV, "Filter 2 Env Amount", 0.0f, 100.0f, 25.0f, "%");
    
    // ===== FILTER ROUTING =====
    addChoiceParam(Params::FILTER_ROUTING, "Filter Routing", {"Serial","Parallel","Split"}, 0);
    addFloatParam(Params::FILTER_MIX, "Filter Mix", 0.0f, 100.0f, 100.0f, "%");
    addFloatParam(Params::FORMANT_VOWEL, "Formant Vowel", 0.0f, 4.0f, 0.0f, "",
        [](float v, int) { const char* vowels[] = {"A","E","I","O","U"}; return vowels[juce::jlimit(0,4,(int)v)]; });
    
    // ===== LFOS =====
    addChoiceParam(Params::LFO1_SHAPE, "LFO 1 Shape", {"Sine","Triangle","Square","Saw Up","Saw Down","Random S&H","Smooth Random"}, 0);
    addFloatParam(Params::LFO1_RATE, "LFO 1 Rate", 0.01f, 30.0f, 1.0f, "Hz");
    addFloatParam(Params::LFO1_DEPTH, "LFO 1 Depth", 0.0f, 100.0f, 50.0f, "%");
    addFloatParam(Params::LFO1_PHASE, "LFO 1 Phase", 0.0f, 360.0f, 0.0f, "°",
        [](float v, int) { return juce::String((int)v) + "°"; });
    
    addChoiceParam(Params::LFO2_SHAPE, "LFO 2 Shape", {"Triangle","Sine","Square","Random S&H"}, 0);
    addFloatParam(Params::LFO2_RATE, "LFO 2 Rate", 0.01f, 30.0f, 2.0f, "Hz");
    addFloatParam(Params::LFO2_DEPTH, "LFO 2 Depth", 0.0f, 100.0f, 30.0f, "%");
    
    // ===== MACROS =====
    for (int i = 1; i <= 8; ++i) {
        std::string id = "macro_" + std::to_string(i);
        std::string name = "Macro " + std::to_string(i);
        addFloatParam(id.c_str(), name.c_str(), 0.0f, 100.0f, 50.0f, "",
            [](float v, int) { return juce::String((int)v); });
    }
    
    // ===== EFFECTS: REVERB =====
    addFloatParam(Params::REV_SIZE, "Reverb Size", 0.0f, 100.0f, 50.0f, "%");
    addFloatParam(Params::REV_DECAY, "Reverb Decay", 0.1f, 10.0f, 2.0f, "s");
    addFloatParam(Params::REV_MIX, "Reverb Mix", 0.0f, 100.0f, 30.0f, "%");
    
    // ===== EFFECTS: DELAY =====
    addFloatParam(Params::DELAY_TIME, "Delay Time", 0.0f, 2000.0f, 250.0f, "ms",
        [](float v, int) { return juce::String((int)v) + " ms"; });
    addFloatParam(Params::DELAY_FEEDBACK, "Delay Feedback", 0.0f, 95.0f, 40.0f, "%");
    addFloatParam(Params::DELAY_MIX, "Delay Mix", 0.0f, 100.0f, 25.0f, "%");
    
    // ===== EFFECTS: CHORUS =====
    addFloatParam(Params::CHORUS_RATE, "Chorus Rate", 0.1f, 10.0f, 1.5f, "Hz");
    addFloatParam(Params::CHORUS_DEPTH, "Chorus Depth", 0.0f, 100.0f, 50.0f, "%");
    addFloatParam(Params::CHORUS_MIX, "Chorus Mix", 0.0f, 100.0f, 35.0f, "%");
    
    // ===== EFFECTS: DRIVE/DISTORTION =====
    addFloatParam(Params::DRIVE_AMOUNT, "Drive Amount", 0.0f, 100.0f, 0.0f, "%");
    addFloatParam(Params::DRIVE_TONE, "Drive Tone", 0.0f, 100.0f, 50.0f, "%");
    
    // ===== EFFECTS: EQ =====
    addFloatParam(Params::EQ_LOW, "EQ Low", -12.0f, 12.0f, 0.0f, "dB",
        [](float v, int) { return (v >= 0 ? "+" : "") + juce::String(v, 1) + " dB"; });
    addFloatParam(Params::EQ_MID, "EQ Mid", -12.0f, 12.0f, 0.0f, "dB",
        [](float v, int) { return (v >= 0 ? "+" : "") + juce::String(v, 1) + " dB"; });
    addFloatParam(Params::EQ_HIGH, "EQ High", -12.0f, 12.0f, 0.0f, "dB",
        [](float v, int) { return (v >= 0 ? "+" : "") + juce::String(v, 1) + " dB"; });
    
    // ===== EFFECTS: COMPRESSOR =====
    addFloatParam(Params::COMP_THRESHOLD, "Compressor Threshold", -60.0f, 0.0f, -18.0f, "dB",
        [](float v, int) { return juce::String((int)v) + " dB"; });
    addFloatParam(Params::COMP_RATIO, "Compressor Ratio", 1.0f, 20.0f, 4.0f, ":1",
        [](float v, int) { return juce::String((int)v) + ":1"; });
    addFloatParam(Params::COMP_MAKEUP, "Compressor Makeup", 0.0f, 24.0f, 0.0f, "dB",
        [](float v, int) { return juce::String((int)v) + " dB"; });
    
    // ===== EFFECTS: STEREO =====
    addFloatParam(Params::STEREO_WIDTH, "Stereo Width", 0.0f, 200.0f, 100.0f, "%");
    
    // ===== EFFECTS: LIMITER =====
    addFloatParam(Params::LIMITER_CEILING, "Limiter Ceiling", -6.0f, 0.0f, -0.3f, "dB",
        [](float v, int) { return juce::String(v, 1) + " dB"; });
    
    // ===== VOICE MODE =====
    addChoiceParam(Params::VOICE_MODE, "Voice Mode", {"Polyphonic","Mono","Legato","True Mono"}, 0);
    addFloatParam(Params::PORTAMENTO, "Portamento", 0.0f, 5000.0f, 0.0f, "ms",
        [](float v, int) { return juce::String((int)v) + " ms"; });
    addFloatParam(Params::GLIDE_CURVE, "Glide Curve", 0.0f, 100.0f, 50.0f, "%");
    
    // ===== QUALITY =====
    addChoiceParam(Params::OVERSAMPLING, "Oversampling", {"None","2x","4x","8x"}, 2);
    addFloatParam(Params::ANTI_ALIAS, "Anti-Aliasing", 0.0f, 100.0f, 80.0f, "%");

    return { params.begin(), params.end() };
}

//==============================================================================
void MySynthAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    synth.setCurrentPlaybackSampleRate (sampleRate);
    initializeEffects(sampleRate, samplesPerBlock);
}

void MySynthAudioProcessor::releaseResources()
{
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool MySynthAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
   #if JucePlugin_IsMidiEffect
    juce::ignoreUnused (layouts);
    return true;
   #else
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

   #if ! JucePlugin_IsSynth
    if (layouts.getMainInputChannelSet() != layouts.getMainOutputChannelSet())
        return false;
   #endif

    return true;
   #endif
}
#endif

void MySynthAudioProcessor::updateAllParameters()
{
    // Update voice limit
    int voiceLimit = static_cast<int>(apvts.getRawParameterValue(Params::VOICE_LIMIT)->load());
    while (synth.getNumVoices() > voiceLimit)
        synth.removeVoice(synth.getNumVoices() - 1);
    while (synth.getNumVoices() < voiceLimit)
        synth.addVoice(new SynthVoice());
    
    // Update each voice's parameters
    for (int i = 0; i < synth.getNumVoices(); ++i)
    {
        if (auto* voice = dynamic_cast<SynthVoice*>(synth.getVoice(i)))
        {
            // Master gain
            float masterGainDB = apvts.getRawParameterValue(Params::MASTER_GAIN)->load();
            voice->setMasterGain(juce::Decibels::decibelsToGain(masterGainDB));
            
            // ADSR
            float attack = apvts.getRawParameterValue(Params::ATTACK)->load();
            float decay = apvts.getRawParameterValue(Params::DECAY)->load();
            float sustain = apvts.getRawParameterValue(Params::SUSTAIN)->load();
            float release = apvts.getRawParameterValue(Params::RELEASE)->load();
            voice->updateADSR(attack, decay, sustain / 100.0f, release);
            
            // Oscillators
            int osc1Type = static_cast<int>(apvts.getRawParameterValue(Params::OSC1_TYPE)->load());
            float osc1Pitch = apvts.getRawParameterValue(Params::OSC1_PITCH)->load();
            float osc1Detune = apvts.getRawParameterValue(Params::OSC1_DETUNE)->load();
            
            int osc2Type = static_cast<int>(apvts.getRawParameterValue(Params::OSC2_TYPE)->load());
            float osc2Pitch = apvts.getRawParameterValue(Params::OSC2_PITCH)->load();
            float osc2Detune = apvts.getRawParameterValue(Params::OSC2_DETUNE)->load();
            float osc2Level = apvts.getRawParameterValue(Params::OSC2_LEVEL)->load() / 100.0f;
            
            voice->updateOscillators(
                static_cast<SynthVoice::OscillatorType>(osc1Type), osc1Pitch, osc1Detune,
                static_cast<SynthVoice::OscillatorType>(osc2Type), osc2Pitch, osc2Detune, osc2Level
            );
            
            // Unison
            int unisonVoices = static_cast<int>(apvts.getRawParameterValue(Params::UNISON_VOICES)->load());
            float unisonSpread = apvts.getRawParameterValue(Params::UNISON_SPREAD)->load();
            float unisonDetune = apvts.getRawParameterValue(Params::UNISON_DETUNE)->load();
            voice->updateUnison(unisonVoices, unisonSpread, unisonDetune);
            
            // Noise & Ring Mod
            int noiseType = static_cast<int>(apvts.getRawParameterValue(Params::NOISE_TYPE)->load());
            float noiseLevel = apvts.getRawParameterValue(Params::NOISE_LEVEL)->load() / 100.0f;
            float ringMod = apvts.getRawParameterValue(Params::RING_MOD)->load() / 100.0f;
            float ringModFreq = apvts.getRawParameterValue(Params::RING_MOD_FREQ)->load();
            voice->updateNoiseAndRing(noiseType, noiseLevel, ringMod, ringModFreq);
            
            // Filters
            int filter1Type = static_cast<int>(apvts.getRawParameterValue(Params::FILTER1_TYPE)->load());
            float filter1Cutoff = apvts.getRawParameterValue(Params::FILTER1_CUTOFF)->load();
            float filter1Reso = apvts.getRawParameterValue(Params::FILTER1_RESO)->load();
            float filter1Env = apvts.getRawParameterValue(Params::FILTER1_ENV)->load() / 100.0f;
            float filter1KeyTrack = apvts.getRawParameterValue(Params::FILTER1_KEYTRACK)->load() / 100.0f;
            
            int filter2Type = static_cast<int>(apvts.getRawParameterValue(Params::FILTER2_TYPE)->load());
            float filter2Cutoff = apvts.getRawParameterValue(Params::FILTER2_CUTOFF)->load();
            float filter2Reso = apvts.getRawParameterValue(Params::FILTER2_RESO)->load();
            float filter2Env = apvts.getRawParameterValue(Params::FILTER2_ENV)->load() / 100.0f;
            
            int routing = static_cast<int>(apvts.getRawParameterValue(Params::FILTER_ROUTING)->load());
            float filterMix = apvts.getRawParameterValue(Params::FILTER_MIX)->load() / 100.0f;
            int formantVowel = static_cast<int>(apvts.getRawParameterValue(Params::FORMANT_VOWEL)->load());
            
            voice->updateFilters(
                filter1Type, filter1Cutoff, filter1Reso, filter1Env, filter1KeyTrack,
                filter2Type, filter2Cutoff, filter2Reso, filter2Env,
                routing, filterMix, formantVowel
            );
        }
    }
    
    // Update reverb parameters
    effects.reverbParams.roomSize = apvts.getRawParameterValue(Params::REV_SIZE)->load() / 100.0f;
    effects.reverbParams.decayTime = apvts.getRawParameterValue(Params::REV_DECAY)->load();
    effects.reverbParams.wetLevel = apvts.getRawParameterValue(Params::REV_MIX)->load() / 100.0f * 0.5f;
    effects.reverbParams.dryLevel = 1.0f - (apvts.getRawParameterValue(Params::REV_MIX)->load() / 100.0f * 0.5f);
    effects.reverb.setParameters(effects.reverbParams);
}

void MySynthAudioProcessor::applyEffects(juce::AudioBuffer<float>& buffer)
{
    const int numSamples = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();
    
    // Apply reverb
    juce::AudioBuffer<float> reverbBuffer(numChannels, numSamples);
    reverbBuffer.makeCopyOf(buffer);
    effects.reverb.processStereo(reverbBuffer.getWritePointer(0), reverbBuffer.getWritePointer(1), numSamples);
    
    float revMix = apvts.getRawParameterValue(Params::REV_MIX)->load() / 100.0f;
    for (int ch = 0; ch < numChannels; ++ch)
        buffer.addFrom(ch, 0, reverbBuffer, ch, 0, numSamples, revMix * 0.8f);
    
    // Apply simple delay
    float delayTime = apvts.getRawParameterValue(Params::DELAY_TIME)->load() / 1000.0f;
    float delayFeedback = apvts.getRawParameterValue(Params::DELAY_FEEDBACK)->load() / 100.0f;
    float delayMix = apvts.getRawParameterValue(Params::DELAY_MIX)->load() / 100.0f;
    
    if (delayMix > 0.01f && delayTime > 0.0001f)
    {
        int delayInSamples = static_cast<int>(delayTime * getSampleRate());
        
        for (int ch = 0; ch < numChannels; ++ch)
        {
            if ((int)effects.delayBuffer.size() <= ch)
                effects.delayBuffer.push_back(std::vector<float>(delayInSamples, 0.0f));
            
            if ((int)effects.delayBuffer[ch].size() != delayInSamples)
                effects.delayBuffer[ch].resize(delayInSamples, 0.0f);
            
            auto* channelData = buffer.getWritePointer(ch);
            auto* delayData = effects.delayBuffer[ch].data();
            
            for (int sample = 0; sample < numSamples; ++sample)
            {
                float delayedSample = delayData[effects.delayPosition];
                delayData[effects.delayPosition] = channelData[sample] + delayedSample * delayFeedback;
                
                channelData[sample] += delayedSample * delayMix;
                
                effects.delayPosition = (effects.delayPosition + 1) % delayInSamples;
            }
        }
    }
    
    // Apply drive/saturation
    float driveAmount = apvts.getRawParameterValue(Params::DRIVE_AMOUNT)->load() / 100.0f;
    if (driveAmount > 0.01f)
    {
        float driveTone = apvts.getRawParameterValue(Params::DRIVE_TONE)->load() / 100.0f;
        
        for (int ch = 0; ch < numChannels; ++ch)
        {
            auto* channelData = buffer.getWritePointer(ch);
            for (int sample = 0; sample < numSamples; ++sample)
            {
                // Soft clipping with variable intensity
                float input = channelData[sample];
                float driven = input * (1.0f + driveAmount * 3.0f);
                float saturated = std::tanh(driven) * (1.0f + driveAmount * 0.5f);
                
                // Mix dry/wet based on tone control
                channelData[sample] = input * (1.0f - driveAmount) + saturated * driveAmount;
            }
        }
    }
    
    // Apply limiter
    float limiterCeiling = juce::Decibels::decibelsToGain(apvts.getRawParameterValue(Params::LIMITER_CEILING)->load());
    for (int sample = 0; sample < numSamples; ++sample)
    {
        for (int ch = 0; ch < numChannels; ++ch)
        {
            float absVal = std::abs(buffer.getSample(ch, sample));
            if (absVal > limiterCeiling)
            {
                buffer.setSample(ch, sample, buffer.getSample(ch, sample) * (limiterCeiling / absVal));
            }
        }
    }
}

void MySynthAudioProcessor::initializeEffects(double sampleRate, int samplesPerBlock)
{
    effects.reverb.prepare({sampleRate, (juce::uint32)samplesPerSamples, 2});
    effects.reverbParams.roomSize = 0.5f;
    effects.reverbParams.decayTime = 2.0f;
    effects.reverbParams.wetLevel = 0.15f;
    effects.reverbParams.dryLevel = 0.85f;
    effects.reverb.setParameters(effects.reverbParams);
    
    effects.delayBuffer.clear();
    effects.delayPosition = 0;
}

void MySynthAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Update all parameters
    updateAllParameters();
    
    // Render synthesizer
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());
    
    // Apply master gain
    float masterGainDB = apvts.getRawParameterValue(Params::MASTER_GAIN)->load();
    float masterGain = juce::Decibels::decibelsToGain(masterGainDB);
    buffer.applyGain(masterGain);
    
    // Apply pan
    float pan = apvts.getRawParameterValue(Params::PAN)->load() / 100.0f;
    if (totalNumOutputChannels >= 2 && std::abs(pan) > 0.01f)
    {
        float leftGain = std::sqrt(0.5f * (1.0f - pan));
        float rightGain = std::sqrt(0.5f * (1.0f + pan));
        buffer.applyGain(0, 0, buffer.getNumSamples(), leftGain);
        buffer.applyGain(1, 0, buffer.getNumSamples(), rightGain);
    }
    
    // Apply effects chain
    applyEffects(buffer);
    
    // CPU usage tracking
    processCounter++;
    auto now = juce::Time::getCurrentTime();
    if ((now - lastCpuUpdateTime).inMilliseconds() > 500)
    {
        cpuUsage.store(getCpuUsage() * 0.9f + (processCounter / (getSampleRate() / getBlockSize())) * 0.1f);
        processCounter = 0;
        lastCpuUpdateTime = now;
    }
}

void MySynthAudioProcessor::processBlock (juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    updateAllParameters();
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
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void MySynthAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    
    if (xml.get() != nullptr && xml->hasTagName(apvts.state.getType()))
    {
        apvts.replaceState(juce::ValueTree::fromXml(*xml));
    }
}

// ===== PRESET MANAGEMENT =====
void MySynthAudioProcessor::initializePresets()
{
    presetNames[0] = "Init Patch";
    presetNames[1] = "Fat Lead";
    presetNames[2] = "Warm Pad";
    presetNames[3] = "Pluck Bass";
    presetNames[4] = "Epic Strings";
    presetNames[5] = "Dirty Bass";
    presetNames[6] = "Crystal Bell";
    presetNames[7] = "Soft Piano";
    presetNames[8] = "Aggressive Synth";
    presetNames[9] = "Ambient Drone";
    presetNames[10] = "Vintage Organ";
    presetNames[11] = "Brass Section";
    presetNames[12] = "Digital Lead";
    presetNames[13] = "Deep Sub";
    presetNames[14] = "Bright Arp";
    presetNames[15] = "Dark Atmosphere";
}

void MySynthAudioProcessor::setCurrentProgram(int index)
{
    if (index >= 0 && index < 128)
    {
        currentProgram = index;
        loadPreset(index);
    }
}

const juce::String MySynthAudioProcessor::getProgramName(int index)
{
    if (index >= 0 && index < 128)
        return presetNames[index];
    return {};
}

void MySynthAudioProcessor::changeProgramName(int index, const juce::String& newName)
{
    if (index >= 0 && index < 128)
        presetNames[index] = newName;
}

void MySynthAudioProcessor::loadPreset(int index)
{
    // In a real implementation, this would load from stored presets
    // For now, we just set the program number
    currentProgram = index;
}

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MySynthAudioProcessor();
}
