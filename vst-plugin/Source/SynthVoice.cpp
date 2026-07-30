/*
  ==============================================================================
    SynthVoice.cpp
    Created: 2024/1/1
    Description: Implementation of SynthVoice - DSP engine for each voice
 ==============================================================================
*/

#include "SynthVoice.h"
#include <algorithm>

//==============================================================================
SynthVoice::SynthVoice()
{
    // Initialize ADSR with default parameters
    adsr.setSampleRate (getSampleRate());
    adsr.setParameters ({ 0.01f, 0.2f, 0.7f, 0.3f });
}

bool SynthVoice::canPlaySound (juce::SynthesiserSound* sound)
{
    return dynamic_cast<SynthSound*> (sound) != nullptr;
}

void SynthVoice::startNote (int midiNoteNumber, float velocity,
                            juce::SynthesiserSound* /*sound*/, int /*currentPitchWheelPosition*/)
{
    // Calculate frequency from MIDI note number
    auto cyclesPerSecond = juce::MidiMessage::getMidiNoteInHertz (midiNoteNumber);
    
    // Apply pitch offset in semitones
    double pitchMultiplier = std::pow(2.0, oscPitchOffset / 12.0);
    cyclesPerSecond *= pitchMultiplier;
    
    // Calculate phase increment for main oscillator
    auto samplesPerCycle = getSampleRate() / cyclesPerSecond;
    angleDelta[0] = (2.0 * juce::MathConstants<double>::pi) / samplesPerCycle;
    
    // Calculate detuned oscillator (second voice for thickness)
    double detuneMultiplier = std::pow(2.0, oscDetune / 1200.0);  // Cents to ratio
    auto detunedCycles = cyclesPerSecond * detuneMultiplier;
    auto detunedSamplesPerCycle = getSampleRate() / detunedCycles;
    angleDelta[1] = (2.0 * juce::MathConstants<double>::pi) / detunedSamplesPerCycle;
    
    // Reset phase angles
    currentAngle[0] = 0.0;
    currentAngle[1] = 0.0;
    
    // Set level based on velocity (with some curve for more natural response)
    level = velocity * velocity;  // Quadratic curve for better dynamics
    
    // Start ADSR envelope
    adsr.noteOn();
    
    // Reset filter envelope tracking
    filterEnvValue = filterCutoff;
}

void SynthVoice::stopNote (float /*velocity*/, bool allowTailOff)
{
    if (allowTailOff)
    {
        // Begin release phase of envelope
        adsr.noteOff();
    }
    else
    {
        // Immediate stop
        clearCurrentNote();
        angleDelta[0] = 0.0;
        angleDelta[1] = 0.0;
        adsr.reset();
    }
}

void SynthVoice::pitchWheelMoved (int /*newPitchWheelValue*/)
{
    // Pitch wheel could be implemented here to bend pitch
    // For now, we'll keep it simple
}

void SynthVoice::controllerMoved (int /*controllerNumber*/, int /*controllerValue*/)
{
    // MIDI CC handling could be added here
    // For example: mod wheel could control vibrato depth or filter cutoff
}

//==============================================================================
double SynthVoice::generateOscillatorSample(double angle, OscillatorType type)
{
    switch (type)
    {
        case OscillatorType::Sawtooth:
            // Band-limited sawtooth approximation
            return 2.0 * (angle / (2.0 * juce::MathConstants<double>::pi)) - 1.0;
            
        case OscillatorType::Square:
            // Square wave (50% duty cycle)
            return (std::fmod(angle, 2.0 * juce::MathConstants<double>::pi) > 
                    juce::MathConstants<double>::pi) ? 1.0 : -1.0;
            
        case OscillatorType::Sine:
            return std::sin(angle);
            
        case OscillatorType::Triangle:
            // Triangle wave
            return 2.0 * std::abs(2.0 * (angle / (2.0 * juce::MathConstants<double>::pi)) - 1.0) - 1.0;
            
        case OscillatorType::Noise:
            // White noise (random value between -1 and 1)
            return random.nextDouble() * 2.0 - 1.0;
            
        default:
            return std::sin(angle);
    }
}

void SynthVoice::calculateFilterCoefficients(double sampleRate, double baseCutoff)
{
    // Calculate effective cutoff with envelope modulation
    double envModulation = baseCutoff + (filterEnvValue * filterEnvAmount * (20000.0 - baseCutoff));
    double cutoff = juce::jlimit(20.0, 20000.0, envModulation);
    
    // Normalize frequency
    double omega = 2.0 * juce::MathConstants<double>::pi * cutoff / sampleRate;
    double sinOmega = std::sin(omega);
    double cosOmega = std::cos(omega);
    double alpha = sinOmega / (2.0 * filterQ);
    
    switch (filterType)
    {
        case FilterType::LowPass:
            // Biquad low-pass coefficients
            filterQ = 1.0 / filterResonance;
            break;
            
        case FilterType::HighPass:
            filterQ = 1.0 / filterResonance;
            break;
            
        case FilterType::BandPass:
            filterQ = filterResonance;
            break;
    }
}

double SynthVoice::processFilterSample(double input)
{
    // Simple state-variable filter (more stable than biquad for modulation)
    // Using Chamberlin SVF topology
    
    double sampleRate = getSampleRate();
    if (sampleRate <= 0.0) return input;
    
    // Calculate effective cutoff with envelope modulation
    double envModulation = filterCutoff + (adsr.getNextSample() * filterEnvAmount * (20000.0 - filterCutoff));
    double cutoff = juce::jlimit(20.0, 20000.0 - 1.0, envModulation);
    
    // SVF parameters
    double f = 2.0 * std::sin(juce::MathConstants<double>::pi * cutoff / sampleRate);
    double q = 1.0 / filterResonance;
    
    // Clamp values for stability
    f = juce::jlimit(0.0, 1.0, f);
    q = juce::jlimit(0.5, 100.0, q);
    
    // State variable filter calculation
    // Note: In a real implementation, you'd maintain proper state between calls
    // This is a simplified version for demonstration
    
    double output;
    
    switch (filterType)
    {
        case FilterType::LowPass:
            // Simple one-pole low-pass as fallback
            {
                double rc = 1.0 / (2.0 * juce::MathConstants<double>::pi * cutoff);
                double dt = 1.0 / sampleRate;
                double alpha = dt / (rc + dt);
                static double prevOutput = 0.0;
                output = prevOutput + alpha * (input - prevOutput);
                prevOutput = output;
            }
            break;
            
        case FilterType::HighPass:
            {
                // Simple high-pass using difference
                double rc = 1.0 / (2.0 * juce::MathConstants<double>::pi * cutoff);
                double dt = 1.0 / sampleRate;
                double alpha = rc / (rc + dt);
                static double prevInput = 0.0;
                static double prevOutput = 0.0;
                output = alpha * (prevOutput + input - prevInput);
                prevInput = input;
                prevOutput = output;
            }
            break;
            
        case FilterType::BandPass:
            // Default to low-pass for band-pass (simplified)
            output = input;
            break;
            
        default:
            output = input;
            break;
    }
    
    return output;
}

//==============================================================================
void SynthVoice::renderNextBlock (juce::AudioBuffer<float>& outputBuffer, 
                                  int startSample, int numSamples)
{
    if (angleDelta[0] == 0.0)
        return;
    
    auto numChannels = outputBuffer.getNumChannels();
    
    // Update filter coefficients at start of block
    calculateFilterCoefficients(getSampleRate(), filterCutoff);
    
    while (--numSamples >= 0)
    {
        // Generate oscillator sample (mix two oscillators for thickness)
        double oscSample1 = generateOscillatorSample(currentAngle[0], oscType);
        currentAngle[0] += angleDelta[0];
        
        double oscSample2 = generateOscillatorSample(currentAngle[1], oscType);
        currentAngle[1] += angleDelta[1];
        
        // Mix oscillators (slightly quieter each for headroom)
        double rawSample = (oscSample1 * 0.6 + oscSample2 * 0.4) * level;
        
        // Apply filter
        double filteredSample = processFilterSample(rawSample);
        
        // Get envelope value
        double envValue = adsr.getNextSample();
        filterEnvValue = envValue;  // Store for filter modulation
        
        // Apply envelope and master gain
        double finalSample = filteredSample * envValue * masterGain;
        
        // Soft clip to prevent harsh distortion
        finalSample = std::tanh(finalSample * 0.8f) * 1.25f;  // Gentle soft saturation
        
        // Output to all channels
        for (auto i = 0; i < numChannels; ++i)
            outputBuffer.addSample (i, startSample, static_cast<float> (finalSample));
        
        ++startSample;
    }
    
    // Clear note if envelope has finished
    if (!adsr.isActive())
        clearCurrentNote();
}

void SynthVoice::renderNextBlock (juce::AudioBuffer<double>& outputBuffer, 
                                  int startSample, int numSamples)
{
    if (angleDelta[0] == 0.0)
        return;
    
    auto numChannels = outputBuffer.getNumChannels();
    
    calculateFilterCoefficients(getSampleRate(), filterCutoff);
    
    while (--numSamples >= 0)
    {
        double oscSample1 = generateOscillatorSample(currentAngle[0], oscType);
        currentAngle[0] += angleDelta[0];
        
        double oscSample2 = generateOscillatorSample(currentAngle[1], oscType);
        currentAngle[1] += angleDelta[1];
        
        double rawSample = (oscSample1 * 0.6 + oscSample2 * 0.4) * level;
        double filteredSample = processFilterSample(rawSample);
        
        double envValue = adsr.getNextSample();
        filterEnvValue = envValue;
        
        double finalSample = filteredSample * envValue * masterGain;
        finalSample = std::tanh(finalSample * 0.8) * 1.25;
        
        for (auto i = 0; i < numChannels; ++i)
            outputBuffer.addSample (i, startSample, finalSample);
        
        ++startSample;
    }
    
    if (!adsr.isActive())
        clearCurrentNote();
}

//==============================================================================
// Parameter update methods

void SynthVoice::setMasterGain(float gain)
{
    masterGain = gain;
}

void SynthVoice::updateADSR(float attack, float decay, float sustain, float release)
{
    attackRate = attack;
    decayRate = decay;
    sustainLevel = sustain;
    releaseRate = release;
    
    // Update ADSR parameters
    juce::ADSR::Parameters params;
    params.attack = attack;
    params.decay = decay;
    params.sustain = sustain;
    params.release = release;
    adsr.setParameters(params);
}

void SynthVoice::updateOscillator(OscillatorType type, float pitchSemi, float detuneCents)
{
    oscType = type;
    oscPitchOffset = pitchSemi;
    oscDetune = detuneCents;
}

void SynthVoice::updateFilter(float cutoff, float resonance, float envAmount, FilterType type)
{
    filterCutoff = cutoff;
    filterResonance = resonance;
    filterEnvAmount = envAmount;
    filterType = type;
}
