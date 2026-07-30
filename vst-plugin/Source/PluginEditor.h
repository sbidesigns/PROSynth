/*
  ==============================================================================
    PluginEditor.h
    Created: 2024/1/1
    Description: Editor/GUI for MySynth VSTi
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

// Custom look and feel for knobs
class SynthLookAndFeel : public juce::LookAndFeel_V4
{
public:
    SynthLookAndFeel();
    
    void drawRotarySlider (juce::Graphics& g, int x, int y, int width, int height,
                           float sliderPosProportional, float rotaryStartAngle,
                           float rotaryEndAngle, juce::Slider& slider) override;
    
    void drawButtonBackground (juce::Graphics& g, juce::Button& button,
                               const juce::Colour& backgroundColour,
                               bool shouldDrawButtonAsHighlighted,
                               bool shouldDrawButtonAsDown) override;

private:
    juce::Colour accentColor = juce::Colour(0xFF00D4FF);  // Cyan accent
};

//==============================================================================
class MySynthAudioProcessorEditor  : public juce::AudioProcessorEditor
{
public:
    MySynthAudioProcessorEditor (MySynthAudioProcessor&);
    ~MySynthAudioProcessorEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    // Reference to processor
    MySynthAudioProcessor& audioProcessor;
    
    // Custom look and feel
    std::unique_ptr<SynthLookAndFeel> lookAndFeel;
    
    // OSCILLATOR SECTION
    juce::Label oscTitle {"oscTitle", "OSCILLATOR"};
    juce::ComboBox oscTypeSelector;           // Waveform type
    juce::Slider oscPitchSlider;              // Pitch offset in semitones
    juce::Slider oscDetuneSlider;             // Detune in cents
    juce::Label oscPitchLabel;
    juce::Label oscDetuneLabel;
    
    // ADSR ENVELOPE SECTION
    juce::Label adsrTitle {"adsrTitle", "ENVELOPE"};
    juce::Slider attackSlider;
    juce::Slider decaySlider;
    juce::Slider sustainSlider;
    juce::Slider releaseSlider;
    juce::Label attackLabel;
    juce::Label decayLabel;
    juce::Label sustainLabel;
    juce::Label releaseLabel;
    
    // FILTER SECTION
    juce::Label filterTitle {"filterTitle", "FILTER"};
    juce::Slider cutoffSlider;                // Filter cutoff frequency
    juce::Slider resonanceSlider;             // Resonance/Q
    juce::Slider filterEnvSlider;             // Envelope amount
    juce::ComboBox filterTypeSelector;        // LP/HP/BP
    juce::Label cutoffLabel;
    juce::Label resonanceLabel;
    juce::Label filterEnvLabel;
    
    // MASTER SECTION
    juce::Label masterTitle {"masterTitle", "MASTER"};
    juce::Slider masterGainSlider;            // Master volume
    juce::Label masterGainLabel;
    
    // Visual elements
    juce::Component keyboardArea;             // Placeholder for visual keyboard
    
    // Attachments for parameter binding (must be declared after sliders)
    using SliderAttachment = std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>;
    using ComboBoxAttachment = std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment>;
    
    SliderAttachment masterGainAttachment;
    SliderAttachment attackAttachment;
    SliderAttachment decayAttachment;
    SliderAttachment sustainAttachment;
    SliderAttachment releaseAttachment;
    SliderAttachment oscPitchAttachment;
    SliderAttachment oscDetuneAttachment;
    SliderAttachment cutoffAttachment;
    SliderAttachment resonanceAttachment;
    SliderAttachment filterEnvAttachment;
    ComboBoxAttachment oscTypeAttachment;
    ComboBoxAttachment filterTypeAttachment;
    
    // Helper methods
    void setupSlider(juce::Slider& slider, const juce::String& suffix);
    void setupLayout();
    
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MySynthAudioProcessorEditor)
};
