/*
  ==============================================================================
    SynthVoice.h - MySynth PRO Ultimate Voice Engine
    Created: 2024/1/1
    Description: Advanced voice with dual oscillators, unison, filters, etc.
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include <vector>
#include <cmath>

class SynthVoice : public juce::SynthesiserVoice
{
public:
    // Oscillator types
    enum class OscillatorType
    {
        Wavetable = 0,
        Sawtooth,
        Square,
        Sine,
        Triangle,
        Noise,
        FMOperator,
        Granular,
        Additive
    };
    
    // Filter types (extended)
    enum class FilterType
    {
        LP24 = 0, LP12, HP24, HP12, BP, Notch, Comb, Formant,
        MoogLadder, K35SEM, DiodeLadder, Off
    };
    
    // Noise types
    enum class NoiseType { White = 0, Pink, Brown, Digital, Crackles };
    
    // Filter routing modes
    enum class FilterRouting { Serial = 0, Parallel, Split };

    SynthVoice();
    
    bool canPlaySound(juce::SynthesiserSound* sound) override;
    
    void startNote(int midiNoteNumber, float velocity,
                    juce::SynthesiserSound* sound, int currentPitchWheelPosition) override;
    
    void stopNote(float velocity, bool allowTailOff) override;
    
    void pitchWheelMoved(int newPitchWheelValue) override;
    void controllerMoved(int controllerNumber, int controllerValue) override;
    
    void renderNextBlock(juce::AudioBuffer<float>& outputBuffer, int startSample, int numSamples) override;
    void renderNextBlock(juce::AudioBuffer<double>& outputBuffer, int startSample, int numSamples) override;
    
    // Parameter update methods
    void setMasterGain(float gain);
    void updateADSR(float attack, float decay, float sustain, float release);
    void updateOscillators(OscillatorType type1, float pitch1, float detune1,
                           OscillatorType type2, float pitch2, float detune2, float level2);
    void updateUnison(int voices, float spread, float detune);
    void updateNoiseAndRing(int noiseType, float level, float ringModAmount, float ringModFreq);
    void updateFilters(int type1, float cutoff1, float reso1, float env1, float keyTrack1,
                       int type2, float cutoff2, float reso2, float env2,
                       int routing, float mix, int formantVowel);

private:
    //==============================================================================
    // OSCILLATOR STATE
    struct OscillatorState {
        double angle[2] = {0.0, 0.0};      // Phase for main + detuned
        double angleDelta[2] = {0.0, 0.0}; // Frequency increment
        double level = 1.0f;                // Volume
        OscillatorType type = OscillatorType::Sawtooth;
        float pitchOffset = 0.0f;
        float detuneCents = 0.0f;
        
        // FM operator state
        double fmRatio = 2.0f;
        double fmIndex = 1.0f;
        
        // Granular state
        double grainPos = 0.0f;
        double grainSize = 0.05f;
        double grainDensity = 10.0f;
    } osc1, osc2;
    
    // UNISON STATE
    struct UnisonState {
        int voices = 1;
        float spread = 20.0f;
        float detune = 10.0f;
        std::vector<double> phaseOffsets;
        std::vector<float> detuneValues;
    } unison;
    
    // NOISE & RING MOD
    struct NoiseState {
        NoiseType type = NoiseType::White;
        float level = 0.0f;
        double pinkBuffer[3] = {0, 0, 0};
        double brownNoise = 0.0f;
    } noise;
    
    struct RingModState {
        float amount = 0.0f;
        double carrierAngle = 0.0f;
        double carrierDelta = 0.0f;
    } ringMod;
    
    // ENVELOPE
    juce::ADSR adsr;
    float attackRate = 0.01f, decayRate = 0.2f;
    float sustainLevel = 0.7f, releaseRate = 0.3f;
    
    // FILTER STATE
    struct FilterState {
        FilterType type = FilterType::LP24;
        double cutoff = 8000.0;
        double resonance = 1.0;
        double envAmount = 0.5;
        double keyTrack = 0.33;
        
        // State variable filter state
        double s1 = 0.0, s2 = 0.0, s3 = 0.0, s4 = 0.0;
        
        // Formant filter coefficients
        struct FormantCoeffs { double f1, f2, f3, b1, b2, b3; };
        FormantCoeffs formant;
    } filter1, filter2;
    
    FilterRouting filterRouting = FilterRouting::Serial;
    float filterMix = 1.0f;
    int formantVowel = 0;
    
    // MASTER
    double currentAngle = 0.0;
    double level = 0.0;
    double masterGain = 1.0;
    
    // Random number generator
    juce::Random random;
    
    // Base frequency for this note
    double baseFrequency = 440.0;
    
    //==============================================================================
    // DSP HELPER METHODS
    
    // Generate oscillator sample
    double generateOscSample(OscillatorState& osc, double freq);
    
    // Generate noise sample
    double generateNoiseSample();
    
    // Process filters
    void calculateFormantCoefficients(int vowel, double sampleRate);
    double processFilter(FilterState& filt, double input, double sampleRate, double envValue);
    
    // Soft clipping / saturation
    inline double softClip(double x) {
        return std::tanh(x * 0.8) * 1.25;
    }
    
    // Initialize unison voice parameters
    void initializeUnison();
};
