/*
  ==============================================================================
    SynthVoice.h
    Created: 2024/1/1
    Description: Voice class for MySynth - handles per-note synthesis
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include <cmath>

class SynthVoice : public juce::SynthesiserVoice
{
public:
    // Oscillator waveform types
    enum class OscillatorType
    {
        Sawtooth = 0,
        Square,
        Sine,
        Triangle,
        Noise
    };
    
    // Filter types
    enum class FilterType
    {
        LowPass = 0,
        HighPass,
        BandPass
    };

    SynthVoice();
    
    bool canPlaySound (juce::SynthesiserSound*) override;
    
    void startNote (int midiNoteNumber, float velocity,
                    juce::SynthesiserSound* sound, int currentPitchWheelPosition) override;
    
    void stopNote (float velocity, bool allowTailOff) override;
    
    void pitchWheelMoved (int newPitchWheelValue) override;
    void controllerMoved (int controllerNumber, int controllerValue) override;
    
    void renderNextBlock (juce::AudioBuffer<float>& outputBuffer, int startSample, int numSamples) override;
    void renderNextBlock (juce::AudioBuffer<double>& outputBuffer, int startSample, int numSamples) override;
    
    // Parameter update methods (called from processor)
    void setMasterGain(float gain);
    void updateADSR(float attack, float decay, float sustain, float release);
    void updateOscillator(OscillatorType type, float pitchSemi, float detuneCents);
    void updateFilter(float cutoff, float resonance, float envAmount, FilterType type);

private:
    //==============================================================================
    // Oscillator state
    double currentAngle[2] = { 0.0, 0.0 };      // Phase angle for oscillator(s)
    double angleDelta[2] = { 0.0, 0.0 };         // Frequency increment
    double level = 0.0;                          // Current note velocity
    double masterGain = 1.0;                     // Master volume multiplier
    
    // Oscillator parameters
    OscillatorType oscType = OscillatorType::Sawtooth;
    float oscPitchOffset = 0.0f;                 // Pitch in semitones
    float oscDetune = 0.0f;                      // Detune in cents
    
    // ADSR envelope
    juce::ADSR adsr;
    
    // Filter state (simple resonant filter)
    FilterType filterType = FilterType::LowPass;
    double filterCutoff = 8000.0;
    double filterResonance = 1.0;
    double filterEnvAmount = 0.5;
    
    // Filter coefficients and state variables
    double filterQ = 0.707;
    double filterInputPrev[4] = { 0.0, 0.0, 0.0, 0.0 };   // For biquad filter
    double filterOutputPrev[4] = { 0.0, 0.0, 0.0, 0.0 };
    double filterEnvValue = 0.0;                    // Current envelope value for filter modulation
    
    // Random number generator for noise
    juce::Random random;
    
    // Helper methods
    double generateOscillatorSample(double angle, OscillatorType type);
    void calculateFilterCoefficients(double sampleRate, double baseCutoff);
    double processFilterSample(double input);
    
    // ADSR parameters storage
    float attackRate = 0.01f;
    float decayRate = 0.2f;
    float sustainLevel = 0.7f;
    float releaseRate = 0.3f;
};
