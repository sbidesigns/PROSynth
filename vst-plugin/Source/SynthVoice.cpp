/*
  ==============================================================================
    SynthVoice.cpp - MySynth PRO Ultimate Voice Engine
    Created: 2024/1/1
    Description: Advanced DSP implementation with all features
 ==============================================================================
*/

#include "SynthVoice.h"
#include <algorithm>
#include <numeric>

//==============================================================================
SynthVoice::SynthVoice()
{
    adsr.setSampleRate(getSampleRate());
    adsr.setParameters({0.01f, 0.2f, 0.7f, 0.3f});
    
    // Initialize unison phase offsets
    initializeUnison();
}

bool SynthVoice::canPlaySound(juce::SynthesiserSound* sound)
{
    return dynamic_cast<SynthSound*>(sound) != nullptr;
}

void SynthVoice::startNote(int midiNoteNumber, float velocity,
                           juce::SynthesiserSound* /*sound*/, int /*currentPitchWheelPosition*/)
{
    baseFrequency = juce::MidiMessage::getMidiNoteInHertz(midiNoteNumber);
    
    // Calculate oscillator 1 frequency with pitch offset
    double freq1 = baseFrequency * std::pow(2.0, osc1.pitchOffset / 12.0);
    auto samplesPerCycle = getSampleRate() / freq1;
    osc1.angleDelta[0] = (2.0 * juce::MathConstants<double>::pi) / samplesPerCycle;
    
    // Oscillator 1 detuned voice
    double detune1Mult = std::pow(2.0, osc1.detuneCents / 1200.0);
    osc1.angleDelta[1] = (2.0 * juce::MathConstants<double>::pi) / (samplesPerCycle / detune1Mult);
    
    // Calculate oscillator 2 frequency
    double freq2 = baseFrequency * std::pow(2.0, (osc1.pitchOffset + osc2.pitchOffset) / 12.0);
    samplesPerCycle = getSampleRate() / freq2;
    osc2.angleDelta[0] = (2.0 * juce::MathConstants<double>::pi) / samplesPerCycle;
    
    double detune2Mult = std::pow(2.0, osc2.detuneCents / 1200.0);
    osc2.angleDelta[1] = (2.0 * juce::MathConstants<double>::pi) / (samplesPerCycle / detune2Mult);
    
    // Ring mod carrier frequency
    ringMod.carrierDelta = (2.0 * juce::MathConstants<double>::pi) / (getSampleRate() / ringMod.carrierDelta);
    
    // Reset phases
    osc1.angle[0] = osc1.angle[1] = 0.0;
    osc2.angle[0] = osc2.angle[1] = 0.0;
    ringMod.carrierAngle = 0.0;
    
    // Initialize unison for this note
    initializeUnison();
    
    // Set level from velocity (with curve)
    level = velocity * velocity;
    
    // Start envelope
    adsr.noteOn();
    
    // Reset filter states
    filter1.s1 = filter1.s2 = filter1.s3 = filter1.s4 = 0.0;
    filter2.s1 = filter2.s2 = filter2.s3 = filter2.s4 = 0.0;
}

void SynthVoice::stopNote(float /*velocity*/, bool allowTailOff)
{
    if (allowTailOff)
        adsr.noteOff();
    else {
        clearCurrentNote();
        osc1.angleDelta[0] = osc1.angleDelta[1] = 0.0;
        osc2.angleDelta[0] = osc2.angleDelta[1] = 0.0;
        adsr.reset();
    }
}

void SynthVoice::pitchWheelMoved(int /*newPitchWheelValue*/) {}
void SynthVoice::controllerMoved(int /*controllerNumber*/, int /*controllerValue*/) {}

//==============================================================================
// OSCILLATOR GENERATION
double SynthVoice::generateOscSample(OscillatorState& osc, double freq)
{
    double sample = 0.0;
    
    switch (osc.type)
    {
        case OscillatorType::Sawtooth:
            sample = 2.0 * (fmod(osc.angle[0] / (2.0 * juce::MathConstants<double>::pi), 1.0)) - 1.0;
            break;
            
        case OscillatorType::Square:
            sample = fmod(osc.angle[0], 2.0 * juce::MathConstants<double>::pi) > 
                     juce::MathConstants<double>::pi ? 1.0 : -1.0;
            break;
            
        case OscillatorType::Sine:
            sample = sin(osc.angle[0]);
            break;
            
        case OscillatorType::Triangle:
            sample = asin(sin(osc.angle[0])) * 2.0 / juce::MathConstants<double>::pi;
            break;
            
        case OscillatorType::Noise:
            sample = random.nextDouble() * 2.0 - 1.0;
            break;
            
        case OscillatorType::FMOperator:
            // FM synthesis: carrier modulated by operator at ratio
            {
                double modulator = sin(osc.angle[0] * osc.fmRatio) * osc.fmIndex;
                sample = sin(osc.angle[0] + modulator);
            }
            break;
            
        case OscillatorType::Granular:
            // Granular-style texture
            {
                double grainEnv = sin(osc.grainPos * juce::MathConstants<double>::pi / osc.grainSize);
                grainPos += 1.0 / getSampleRate();
                if (grainPos > osc.grainSize) grainPos = 0.0;
                sample = sin(osc.angle[0]) * grainEnv + 
                         (random.nextDouble() * 2.0 - 1.0) * 0.3 * grainEnv;
            }
            break;
            
        case OscillatorType::Additive:
            // Simple additive with harmonics
            sample = 0.0;
            for (int h = 1; h <= 8; ++h) {
                sample += sin(osc.angle[0] * h) / (double)h;
            }
            sample *= 0.5; // Normalize
            break;
            
        case OscillatorType::Wavetable:
        default:
            // Default to sawtooth-like wavetable morphing
            {
                double t = fmod(osc.angle[0] / (2.0 * juce::MathConstants<double>::pi), 1.0);
                // Interpolate between saw and square based on position
                double saw = 2.0 * t - 1.0;
                double square = t < 0.5 ? 1.0 : -1.0;
                sample = saw * 0.6 + square * 0.4;
            }
            break;
    }
    
    return sample;
}

// NOISE GENERATION
double SynthVoice::generateNoiseSample()
{
    if (noise.level <= 0.001) return 0.0;
    
    double sample = 0.0;
    
    switch (noise.type)
    {
        case NoiseType::White:
            sample = random.nextDouble() * 2.0 - 1.0;
            break;
            
        case NoiseType::Pink:
            // Pink noise using filtered white noise
            {
                double white = random.nextDouble() * 2.0 - 1.0;
                noise.pinkBuffer[0] = 0.99886 * noise.pinkBuffer[0] + white * 0.0555179;
                noise.pinkBuffer[1] = 0.99332 * noise.pinkBuffer[1] + white * 0.0750759;
                noise.pinkBuffer[2] = 0.96900 * noise.pinkBuffer[2] + white * 0.1538520;
                sample = noise.pinkBuffer[0] + noise.pinkBuffer[1] + noise.pinkBuffer[2] +
                       white * 0.5352 + noise.brownNoise * 0.33;
                noise.brownNoise = white * 0.02;
            }
            break;
            
        case NoiseType::Brown:
            // Brown/red noise (integrated white noise)
            {
                double white = random.nextDouble() * 2.0 - 1.0;
                noise.brownNoise = (-noise.brownNoise + white) * 0.02;
                sample = noise.brownNoise * 30.0; // Boost amplitude
            }
            break;
            
        case NoiseType::Digital:
            // Stepped digital noise
            sample = floor(random.nextDouble() * 8) / 7.0 * 2.0 - 1.0;
            break;
            
        case NoiseType::Crackles:
            // Occasional crackles/pops
            sample = random.nextFloat() > 0.95 ? random.nextDouble() * 2.0 - 1.0 : 0.0;
            break;
    }
    
    return sample * noise.level;
}

// FORMANT FILTER COEFFICIENTS
void SynthVoice::calculateFormantCoefficients(int vowel, double sampleRate)
{
    // Formant frequencies and bandwidths for vowels A, E, I, O, U
    static const struct { double f1, b1, f2, b2, f3, b3; } formants[] = {
        {800, 80, 1150, 90, 2900, 170},  // A
        {400, 70, 2200, 100, 2800, 150},  // E
        {350, 70, 2000, 100, 2800, 150},   // I
        {500, 80, 850, 90, 2500, 160},     // O
        {350, 70, 650, 60, 2400, 160}      // U
    };
    
    int idx = juce::jlimit(0, 4, vowel);
    const auto& f = formants[idx];
    
    filter1.formant.f1 = f.f1; filter1.formant.b1 = f.b1;
    filter1.formant.f2 = f.f2; filter1.formant.b2 = f.b2;
    filter1.formant.f3 = f.f3; filter1.formant.b3 = f.b3;
}

// FILTER PROCESSING
double SynthVoice::processFilter(FilterState& filt, double input, double sampleRate, double envValue)
{
    if (filt.type == FilterType::Off || sampleRate <= 0) return input;
    
    // Calculate effective cutoff with envelope modulation and key tracking
    double keyTrackOffset = log2(baseFrequency / 440.0) * filt.keyTrack * 10000.0;
    double effectiveCutoff = juce::jlimit(20.0, 20000.0, 
        filt.cutoff + envValue * filt.envAmount * (20000.0 - filt.cutoff) + keyTrackOffset);
    
    // Normalize frequency
    double omega = 2.0 * juce::MathConstants<double>::pi * effectiveCutoff / sampleRate;
    omega = juce::jlimit(0.0001, juce::MathConstants<double>::pi * 0.99, omega);
    
    double output = input;
    double q = juce::jlimit(0.5, 20.0, filt.resonance);
    
    switch (filt.type)
    {
        case FilterType::LP24:
        case FilterType::LP12:
        case FilterType::MoogLadder:
        case FilterType::DiodeLadder:
        {
            // 4-pole ladder filter approximation (Moog-style)
            double k = q * 0.8; // Feedback/resonance amount
            k = juce::jlimit(0.0, 4.0, k);
            
            double g = omega * 0.99; // Gain per stage
            
            // Cascade of 4 one-pole filters
            double x = input - k * filt.s4;
            x = x - softClip(k * x); // Soft limiting on feedback
            
            filt.s1 = filt.s1 + g * (tanh(x) - tanh(filt.s1));
            filt.s2 = filt.s2 + g * (tanh(filt.s1) - tanh(filt.s2));
            filt.s3 = filt.s3 + g * (tanh(filt.s2) - tanh(filt.s3));
            filt.s4 = filt.s4 + g * (tanh(filt.s3) - tanh(filt.s4));
            
            output = filt.s4;
            
            // For 12dB, use only 2 stages
            if (filt.type == FilterType::LP12) output = filt.s2;
            
            break;
        }
        
        case FilterType::HP24:
        case FilterType::HP12:
        {
            // High-pass using complementary low-pass
            double g = omega * 0.99;
            double hpInput = input;
            
            filt.s1 = filt.s1 + g * (hpInput - filt.s1);
            filt.s2 = filt.s2 + g * (filt.s1 - filt.s2);
            filt.s3 = filt.s3 + g * (filt.s2 - filt.s3);
            filt.s4 = filt.s4 + g * (filt.s3 - filt.s4);
            
            // HP = input - LP
            output = input - (filt.type == FilterType::HP12 ? filt.s2 : filt.s4);
            break;
        }
        
        case FilterType::BP:
        {
            // Band-pass state variable
            double g = tan(omega * 0.5);
            double r = 1.0 / (2.0 * q);
            
            double hp = (input - (2.0 * r + g) * filt.s1 - filt.s2) / (1.0 + g);
            double bp = filt.s1 + g * hp;
            filt.s1 = bp;
            filt.s2 = filt.s2 + g * bp;
            
            output = bp * 2.0 * r;
            break;
        }
        
        case FilterType::Notch:
        {
            // Notch = LP + HP - original (simplified)
            double g = omega * 0.99;
            filt.s1 = filt.s1 + g * (input - filt.s1);
            output = input - filt.s1 * (1.0 + q * 0.1); // Q controls notch depth
            break;
        }
        
        case FilterType::Comb:
        {
            // Comb filter (simple delay-based)
            static double combBuffer[512] = {0};
            static int combPos = 0;
            int delaySamples = juce::jlimit(1, 511, (int)(sampleRate / effectiveCutoff));
            
            double delayed = combBuffer[(combPos - delaySamples + 512) % 512];
            combBuffer[combPos] = input + delayed * (q * 0.09);
            output = combBuffer[combPos];
            combPos = (combPos + 1) % 512;
            break;
        }
        
        case FilterType::Formant:
        {
            // Formant filter using parallel resonators
            calculateFormantCoefficients(formantVowel, sampleRate);
            
            // Three band-pass filters at formant frequencies
            auto formantBP = [&](double freq, double bw, double& state) -> double {
                double w = 2.0 * juce::MathConstants<double>::pi * freq / sampleRate;
                double r = exp(-juce::MathConstants<double>::pi * bw / sampleRate);
                double cosW = cos(w);
                
                double output = input * (1.0 - r * r);
                output -= r * cosW * state;
                double newState = r * cosW * output + r * state;
                state = newState;
                return output;
            };
            
            double f1out = formantBP(filter1.formant.f1, filter1.formant.b1, filt.s1);
            double f2out = formantBP(filter1.formant.f2, filter1.formant.b2, filt.s2);
            double f3out = formantBP(filter1.formant.f3, filter1.formant.b3, filt.s3);
            
            output = (f1out + f2out + f3out) * 0.33;
            break;
        }
        
        case FilterType::K35SEM:
        {
            // K35 SEM-style filter (state variable with different topology)
            double f = omega * 0.5;
            double damp = juce::jlimit(0.0, 1.0, 1.0 / (q * 0.5));
            
            filt.s1 = filt.s1 + f * (input - damp * filt.s1 - filt.s2);
            filt.s2 = filt.s2 + f * filt.s1;
            filt.s3 = filt.s3 + f * filt.s2;
            
            // Mix outputs (LP, BP, HP)
            output = filt.s3 * 0.5 + filt.s1 * 0.25 - (input - filt.s1) * 0.15;
            break;
        }
        
        default:
            output = input;
            break;
    }
    
    return output;
}

// UNISON INITIALIZATION
void SynthVoice::initializeUnison()
{
    unison.phaseOffsets.resize(unison.voices);
    unison.detuneValues.resize(unison.voices);
    
    for (int i = 0; i < unison.voices; ++i)
    {
        unison.phaseOffsets[i] = random.nextDouble() * 2.0 * juce::MathConstants<double>::pi;
        // Spread detune values across range
        double position = (unison.voices > 1) ? (double)i / (unison.voices - 1) : 0.5;
        unison.detuneValues[i] = (position - 0.5) * 2.0 * unison.spread * unison.detune * 0.01;
    }
}

//==============================================================================
// PARAMETER UPDATE METHODS

void SynthVoice::setMasterGain(float gain) { masterGain = gain; }

void SynthVoice::updateADSR(float attack, float decay, float sustain, float release)
{
    attackRate = attack; decayRate = decay; sustainLevel = sustain; releaseRate = release;
    adsr.setParameters({attack, decay, sustain, release});
}

void SynthVoice::updateOscillators(OscillatorType type1, float pitch1, float detune1,
                                   OscillatorType type2, float pitch2, float detune2, float level2)
{
    osc1.type = type1; osc1.pitchOffset = pitch1; osc1.detuneCents = detune1;
    osc2.type = type2; osc2.pitchOffset = pitch2; osc2.detuneCents = detune2; osc2.level = level2;
}

void SynthVoice::updateUnison(int voices, float spread, float detune)
{
    unison.voices = voices; unison.spread = spread; unison.detune = detune;
    initializeUnison();
}

void SynthVoice::updateNoiseAndRing(int noiseTypeVal, float level, float ringModAmount, float ringModFreq)
{
    noise.type = static_cast<NoiseType>(noiseTypeVal);
    noise.level = level;
    ringMod.amount = ringModAmount;
    ringMod.carrierDelta = 2.0 * juce::MathConstants<double>::pi * ringModFreq;
}

void SynthVoice::updateFilters(int type1, float cutoff1, float reso1, float env1, float keyTrack1,
                               int type2, float cutoff2, float reso2, float env2,
                               int routingVal, float mix, int vowel)
{
    filter1.type = static_cast<FilterType>(type1);
    filter1.cutoff = cutoff1; filter1.resonance = reso1;
    filter1.envAmount = env1; filter1.keyTrack = keyTrack1;
    
    filter2.type = static_cast<FilterType>(type2);
    filter2.cutoff = cutoff2; filter2.resonance = reso2;
    filter2.envAmount = env2;
    
    filterRouting = static_cast<FilterRouting>(routingVal);
    filterMix = mix;
    formantVowel = vowel;
}

//==============================================================================
// RENDER METHOD (Float)

void SynthVoice::renderNextBlock(juce::AudioBuffer<float>& outputBuffer, int startSample, int numSamples)
{
    if (osc1.angleDelta[0] == 0.0 && osc2.angleDelta[0] == 0.0) return;
    
    int numChannels = outputBuffer.getNumChannels();
    double sampleRate = getSampleRate();
    
    while (--numSamples >= 0)
    {
        // Generate raw oscillator mix
        double oscOutput = 0.0;
        
        if (unison.voices <= 1)
        {
            // Single voice mode - simple stereo mix of oscillators
            double osc1Sample = generateOscSample(osc1, baseFrequency);
            double osc1DetuneSample = generateOscSample(osc1, baseFrequency * 1.002);
            
            double osc2Sample = generateOscSample(osc2, baseFrequency) * osc2.level;
            
            // Mix oscillators
            oscOutput = (osc1Sample * 0.55 + osc1DetuneSample * 0.25 + osc2Sample * 0.2);
        }
        else
        {
            // Unison mode - multiple detuned voices
            for (int v = 0; v < unison.voices; ++v)
            {
                double detuneMult = pow(2.0, unison.detuneValues[v] / 1200.0);
                double voiceFreq = baseFrequency * detuneMult;
                
                // Generate sample with phase offset for width
                double angleOffset = unison.phaseOffsets[v];
                double sample = sin(osc1.angle[0] + angleOffset) * 0.6 + 
                                 generateOscSample(osc1, voiceFreq) * 0.4;
                
                oscOutput += sample / unison.voices;
            }
        }
        
        // Add noise
        oscOutput += generateNoiseSample();
        
        // Apply ring modulation
        if (ringMod.amount > 0.001)
        {
            double carrier = sin(ringMod.carrierAngle);
            oscOutput = oscOutput * (1.0 - ringMod.amount) + (oscOutput * carrier) * ringMod.amount;
            ringMod.carrierAngle += ringMod.carrierDelta;
        }
        
        // Get envelope value for this sample
        double envValue = adsr.getNextSample();
        
        // Process filter(s)
        double filteredOutput;
        double filter1Out = processFilter(filter1, oscOutput, sampleRate, envValue);
        double filter2Out = processFilter(filter2, oscOutput, sampleRate, envValue);
        
        switch (filterRouting)
        {
            case FilterRouting::Serial:
                filteredOutput = processFilter(filter2, filter1Out, sampleRate, envValue);
                break;
            case FilterRouting::Parallel:
                filteredOutput = filter1Out * 0.5 + filter2Out * 0.5;
                break;
            case FilterRouting::Split:
                // Low frequencies through filter1, high through filter2
                filteredOutput = filter1Out * 0.6 + filter2Out * 0.4;
                break;
        }
        
        // Apply filter mix (dry/wet)
        filteredOutput = oscOutput * (1.0 - filterMix) + filteredOutput * filterMix;
        
        // Apply envelope and gain
        double finalSample = filteredOutput * envValue * level * masterGain;
        
        // Soft saturation for warmth
        finalSample = softClip(finalSample);
        
        // Output to all channels
        for (int ch = 0; ch < numChannels; ++ch)
            outputBuffer.addSample(ch, startSample, static_cast<float>(finalSample));
        
        // Advance oscillator phases
        osc1.angle[0] += osc1.angleDelta[0];
        osc1.angle[1] += osc1.angleDelta[1];
        osc2.angle[0] += osc2.angleDelta[0];
        osc2.angle[1] += osc2.angleDelta[1];
        
        ++startSample;
    }
    
    // Clear voice if envelope finished
    if (!adsr.isActive())
        clearCurrentNote();
}

void SynthVoice::renderNextBlock(juce::AudioBuffer<double>& outputBuffer, int startSample, int numSamples)
{
    // Double precision version - same logic
    if (osc1.angleDelta[0] == 0.0) return;
    
    int numChannels = outputBuffer.getNumChannels();
    double sampleRate = getSampleRate();
    
    while (--numSamples >= 0)
    {
        double oscOutput = generateOscSample(osc1, baseFrequency) * 0.6 +
                          generateOscSample(osc2, baseFrequency) * 0.4 * osc2.level;
        oscOutput += generateNoiseSample();
        
        double envValue = adsr.getNextSample();
        double filteredOutput = processFilter(filter1, oscOutput, sampleRate, envValue);
        if (filter2.type != FilterType::Off)
            filteredOutput = processFilter(filter2, filteredOutput, sampleRate, envValue);
        
        double finalSample = softClip(filteredOutput * envValue * level * masterGain);
        
        for (int ch = 0; ch < numChannels; ++ch)
            outputBuffer.addSample(ch, startSample, finalSample);
        
        osc1.angle[0] += osc1.angleDelta[0];
        osc2.angle[0] += osc2.angleDelta[0];
        ++startSample;
    }
    
    if (!adsr.isActive()) clearCurrentNote();
}
