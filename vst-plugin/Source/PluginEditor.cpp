/*
  ==============================================================================
    PluginEditor.cpp
    Created: 2024/1/1
    Description: Implementation of MySynth GUI editor
 ==============================================================================
*/

#include "PluginEditor.h"
#include <cmath>

//==============================================================================
// Custom Look and Feel Implementation
SynthLookAndFeel::SynthLookAndFeel()
{
    // Set color scheme
    setColourScheme (juce::LookAndFeel_V4::ColourScheme {
        juce::Colours::black,                    // windowBg
        juce::Colour(0xFF1E1E2E),               // widgetBackground
        accentColor,                             // menuBackground
        juce::Colour(0xFFCDD6F4),               // menuText
        juce::Colour(0xFFCDD6F4),               // text
        juce::Colour(0xFFCDD6F4),               // widgetText
        juce::Colour(0xFF313244),               // outline
        juce::Colour(0xFF45475A),               // focusedOutline
        juce::Colour(0xFF45475A),               // buttonText
        juce::Colour(0xFF45475A),               // buttonBackground
        juce::Colour(0xFF45475A),               // buttonHovered
        juce::Colour(0xFF585B70),               // buttonPressed
        juce::Colour(0xFF00D4FF),               // textButtonTextColor
        juce::Colour(0xFF313244),               // textButtonTextBackground
        juce::Colour(0xFF45475A),               // toggleButtonText
        juce::Colour(0xFF313244),               // toggleButtonFill
        juce::Colour(0xFF00D4FF),               // tickedTickColour
        juce::Colour(0xFF313244),               // untickedTickColour
        juce::Colour(0xFF00D4FF)                // tickBoxFill
    });
}

void SynthLookAndFeel::drawRotarySlider (juce::Graphics& g, int x, int y, int width, int height,
                                          float sliderPosProportional, float rotaryStartAngle,
                                          float rotaryEndAngle, juce::Slider& slider)
{
    auto radius = (juce::jmin(width, height) / 2.0f) * 0.85f;
    auto centerX = x + width * 0.5f;
    auto centerY = y + height * 0.5f;
    auto rx = centerX - radius;
    auto ry = centerY - radius;
    auto rw = radius * 2.0f;
    
    // Background arc
    juce::Path backgroundArc;
    backgroundArc.addPieSegment(rx, ry, rw, rw, rotaryStartAngle, rotaryEndAngle, 0.65);
    g.setColour(juce::Colour(0xFF313244));
    g.fillPath(backgroundArc);
    
    // Value arc
    auto angle = rotaryStartAngle + sliderPosProportional * (rotaryEndAngle - rotaryStartAngle);
    juce::Path valueArc;
    valueArc.addPieSegment(rx, ry, rw, rw, rotaryStartAngle, angle, 0.65);
    g.setColour(accentColor);
    g.fillPath(valueArc);
    
    // Center dot
    g.setColour(juce::Colour(0xFFCDD6F4));
    g.fillEllipse(centerX - 5, centerY - 5, 10, 10);
    
    // Indicator line
    auto lineLength = radius * 0.7f;
    auto lineX = centerX + std::sin(angle) * lineLength;
    auto lineY = centerY - std::cos(angle) * lineLength;
    g.drawLine(centerX, centerY, lineX, lineY, 2.0f);
}

void SynthLookAndFeel::drawButtonBackground (juce::Graphics& g, juce::Button& button,
                                              const juce::Colour& /*backgroundColour*/,
                                              bool shouldDrawButtonAsHighlighted,
                                              bool shouldDrawButtonAsDown)
{
    auto bounds = button.getLocalBounds().toFloat().reduced(2.0f);
    
    if (shouldDrawButtonAsDown || shouldDrawButtonAsHighlighted)
    {
        g.setColour(accentColor.withAlpha(0.3f));
        g.fillRoundedRectangle(bounds, 5.0f);
        g.setColour(accentColor);
    }
    else
    {
        g.setColour(juce::Colour(0xFF45475A));
        g.fillRoundedRectangle(bounds, 5.0f);
        g.setColour(juce::Colour(0xFFCDD6F4));
    }
    
    g.drawRoundedRectangle(bounds, 5.0f, 1.0f);
}

//==============================================================================
// Editor Implementation

MySynthAudioProcessorEditor::MySynthAudioProcessorEditor (MySynthAudioProcessor& p)
    : AudioProcessorEditor (&p)
    , audioProcessor (p)
{
    // Initialize custom look and feel
    lookAndFeel = std::make_unique<SynthLookAndFeel>();
    setLookAndFeel(lookAndFeel.get());
    
    // Set editor size
    setSize (700, 500);
    
    // Make all components visible and add them to the editor
    
    // Title labels
    oscTitle.setFont(juce::Font(16.0f, juce::Font::bold));
    oscTitle.setJustificationType(juce::Justification::centred);
    oscTitle.setColour(juce::Label::textColourId, accentColor);
    addAndMakeVisible(oscTitle);
    
    adsrTitle.setFont(juce::Font(16.0f, juce::Font::bold));
    adsrTitle.setJustificationType(juce::Justification::centred);
    adsrTitle.setColour(juce::Label::textColourId, accentColor);
    addAndMakeVisible(adsrTitle);
    
    filterTitle.setFont(juce::Font(16.0f, juce::Font::bold));
    filterTitle.setJustificationType(juce::Justification::centred);
    filterTitle.setColour(juce::Label::textColourId, accentColor);
    addAndMakeVisible(filterTitle);
    
    masterTitle.setFont(juce::Font(16.0f, juce::Font::bold));
    masterTitle.setJustificationType(juce::Justification::centred);
    masterTitle.setColour(juce::Label::textColourId, accentColor);
    addAndMakeVisible(masterTitle);
    
    // Oscillator controls
    setupSlider(oscPitchSlider, "st");
    setupSlider(oscDetuneSlider, "¢");
    addAndMakeVisible(oscPitchSlider);
    addAndMakeVisible(oscDetuneSlider);
    
    oscTypeSelector.addItemList({"Sawtooth", "Square", "Sine", "Triangle", "Noise"}, 1);
    addAndMakeVisible(oscTypeSelector);
    
    oscPitchLabel.setText("PITCH", juce::dontSendNotification);
    oscPitchLabel.setFont(juce::Font(10.0f));
    oscPitchLabel.setJustificationType(juce::Justification::centred);
    oscPitchLabel.attachToComponent(&oscPitchSlider, false);
    addAndMakeVisible(oscPitchLabel);
    
    oscDetuneLabel.setText("DETUNE", juce::dontSendNotification);
    oscDetuneLabel.setFont(juce::Font(10.0f));
    oscDetuneLabel.setJustificationType(juce::Justification::centred);
    oscDetuneLabel.attachToComponent(&oscDetuneSlider, false);
    addAndMakeVisible(oscDetuneLabel);
    
    // ADSR controls
    setupSlider(attackSlider, "s");
    setupSlider(decaySlider, "s");
    setupSlider(sustainSlider, "%");
    setupSlider(releaseSlider, "s");
    attackSlider.setTextValueSuffix(" s");
    decaySlider.setTextValueSuffix(" s");
    releaseSlider.setTextValueSuffix(" s");
    addAndMakeVisible(attackSlider);
    addAndMakeVisible(decaySlider);
    addAndMakeVisible(sustainSlider);
    addAndMakeVisible(releaseSlider);
    
    attackLabel.setText("A", juce::dontSendNotification);
    attackLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    attackLabel.setJustificationType(juce::Justification::centred);
    attackLabel.attachToComponent(&attackSlider, false);
    addAndMakeVisible(attackLabel);
    
    decayLabel.setText("D", juce::dontSendNotification);
    decayLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    decayLabel.setJustificationType(juce::Justification::centred);
    decayLabel.attachToComponent(&decaySlider, false);
    addAndMakeVisible(decayLabel);
    
    sustainLabel.setText("S", juce::dontSendNotification);
    sustainLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    sustainLabel.setJustificationType(juce::Justification::centred);
    sustainLabel.attachToComponent(&sustainSlider, false);
    addAndMakeVisible(sustainLabel);
    
    releaseLabel.setText("R", juce::dontSendNotification);
    releaseLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    releaseLabel.setJustificationType(juce::Justification::centred);
    releaseLabel.attachToComponent(&releaseSlider, false);
    addAndMakeVisible(releaseLabel);
    
    // Filter controls
    setupSlider(cutoffSlider, "Hz");
    setupSlider(resonanceSlider, "Q");
    setupSlider(filterEnvSlider, "");
    addAndMakeVisible(cutoffSlider);
    addAndMakeVisible(resonanceSlider);
    addAndMakeVisible(filterEnvSlider);
    
    filterTypeSelector.addItemList({"Low Pass", "High Pass", "Band Pass"}, 1);
    addAndMakeVisible(filterTypeSelector);
    
    cutoffLabel.setText("CUTOFF", juce::dontSendNotification);
    cutoffLabel.setFont(juce::Font(10.0f));
    cutoffLabel.setJustificationType(juce::Justification::centred);
    cutoffLabel.attachToComponent(&cutoffSlider, false);
    addAndMakeVisible(cutoffLabel);
    
    resonanceLabel.setText("RESO", juce::dontSendNotification);
    resonanceLabel.setFont(juce::Font(10.0f));
    resonanceLabel.setJustificationType(juce::Justification::centred);
    resonanceLabel.attachToComponent(&resonanceSlider, false);
    addAndMakeVisible(resonanceLabel);
    
    filterEnvLabel.setText("ENV>", juce::dontSendNotification);
    filterEnvLabel.setFont(juce::Font(10.0f));
    filterEnvLabel.setJustificationType(juce::Justification::centred);
    filterEnvLabel.attachToComponent(&filterEnvSlider, false);
    addAndMakeVisible(filterEnvLabel);
    
    // Master control
    setupSlider(masterGainSlider, "dB");
    masterGainSlider.setTextValueSuffix(" dB");
    addAndMakeVisible(masterGainSlider);
    
    masterGainLabel.setText("GAIN", juce::dontSendNotification);
    masterGainLabel.setFont(juce::Font(10.0f));
    masterGainLabel.setJustificationType(juce::Justification::centred);
    masterGainLabel.attachToComponent(&masterGainSlider, false);
    addAndMakeVisible(masterGainLabel);
    
    // Bind parameters to UI components (must be done after adding components)
    masterGainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::MASTER_GAIN, masterGainSlider);
    
    attackAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::ATTACK, attackSlider);
    
    decayAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::DECAY, decaySlider);
    
    sustainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::SUSTAIN, sustainSlider);
    
    releaseAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::RELEASE, releaseSlider);
    
    oscPitchAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::OSC_PITCH, oscPitchSlider);
    
    oscDetuneAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::OSC_DETUNE, oscDetuneSlider);
    
    cutoffAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::FILTER_CUTOFF, cutoffSlider);
    
    resonanceAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::FILTER_RESO, resonanceSlider);
    
    filterEnvAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), Params::FILTER_ENV, filterEnvSlider);
    
    oscTypeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
        audioProcessor.getAPVTS(), Params::OSC_TYPE, oscTypeSelector);
    
    filterTypeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
        audioProcessor.getAPVTS(), Params::FILTER_TYPE, filterTypeSelector);
}

MySynthAudioProcessorEditor::~MySynthAudioProcessorEditor()
{
    setLookAndFeel(nullptr);  // Reset look and feel before destruction
}

void MySynthAudioProcessorEditor::setupSlider(juce::Slider& slider, const juce::String& /*suffix*/)
{
    slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    slider.setTextBoxStyle(juce::TextBoxBelow, false, 60, 18);
    slider.setColour(juce::Slider::rotarySliderFillColourId, juce::Colour(0xFF00D4FF));
    slider.setColour(juce::Slider::thumbColourId, juce::Colour(0xFFCDD6F4));
    slider.setColour(juce::Slider::textBoxTextColourId, juce::Colour(0xFFCDD6F4));
    slider.setColour(juce::Slider::textBoxBackgroundColourId, juce::Colour(0xFF313244));
    slider.setColour(juce::Slider::textBoxOutlineColourId, juce::Colour(0xFF45475A));
}

void MySynthAudioProcessorEditor::paint (juce::Graphics& g)
{
    // Background gradient
    auto bounds = getLocalBounds().toFloat();
    
    // Dark gradient background
    juce::ColourGradient gradient(
        juce::Colour(0xFF1E1E2E),
        0, 0,
        juce::Colour(0xFF11111B),
        0, getHeight()
    );
    g.setGradientFill(gradient);
    g.fillRect(bounds);
    
    // Border
    g.setColour(juce::Colour(0xFF45475A));
    g.drawRect(bounds.reduced(1), 2);
    
    // Plugin name header
    g.setColour(juce::Colour(0xFFCDD6F4));
    g.setFont(juce::Font(28.0f, juce::Font::bold));
    g.drawText("MY SYNTH", 20, 15, 200, 40, juce::Justification::left);
    
    // Version info
    g.setFont(juce::Font(12.0f));
    g.setColour(juce::Colour(0xFF6C7086));
    g.drawText("v1.0.0", getWidth() - 80, 20, 60, 20, juce::Justification::right);
    
    // Decorative line under header
    g.setColour(accentColor);
    g.drawHorizontalLine(60, 20, getWidth() - 20);
    
    // Section backgrounds (subtle panels)
    auto panelColour = juce::Colour(0x20FFFFFF);
    
    // Oscillator panel area
    g.setColour(panelColour);
    g.fillRoundedRectangle(15, 75, 200, 200, 8);
    
    // ADSR panel area
    g.fillRoundedRectangle(230, 75, 240, 200, 8);
    
    // Filter panel area  
    g.fillRoundedRectangle(485, 75, 200, 200, 8);
    
    // Master section at bottom
    g.fillRoundedRectangle(280, 295, 140, 180, 8);
}

void MySynthAudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds();
    
    // Header area (title is painted in paint())
    
    // OSCILLATOR SECTION (left)
    oscTitle.setBounds(25, 85, 180, 25);
    oscTypeSelector.setBounds(30, 115, 170, 30);
    oscPitchSlider.setBounds(35, 160, 75, 90);
    oscDetuneSlider.setBounds(120, 160, 75, 90);
    
    // ADSR SECTION (center-left)
    adsrTitle.setBounds(250, 85, 200, 25);
    auto adsrY = 120;
    auto adsrWidth = 50;
    auto adsrSpacing = 10;
    auto adsrStartX = 260;
    
    attackSlider.setBounds(adsrStartX, adsrY, adsrWidth, 100);
    decaySlider.setBounds(adsrStartX + adsrWidth + adsrSpacing, adsrY, adsrWidth, 100);
    sustainSlider.setBounds(adsrStartX + (adsrWidth + adsrSpacing) * 2, adsrY, adsrWidth, 100);
    releaseSlider.setBounds(adsrStartX + (adsrWidth + adsrSpacing) * 3, adsrY, adsrWidth, 100);
    
    // FILTER SECTION (right)
    filterTitle.setBounds(505, 85, 160, 25);
    filterTypeSelector.setBounds(510, 115, 150, 30);
    cutoffSlider.setBounds(520, 160, 65, 90);
    resonanceSlider.setBounds(600, 160, 65, 90);
    filterEnvSlider.setBounds(560, 260, 65, 50);
    
    // MASTER SECTION (bottom center)
    masterTitle.setBounds(310, 305, 80, 25);
    masterGainSlider.setBounds(315, 340, 70, 110);
}
