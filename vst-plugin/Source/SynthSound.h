/*
  ==============================================================================
    SynthSound.h
    Created: 2024/1/1
    Description: Sound definition for MySynth - defines playable range and characteristics
 ==============================================================================
*/

#pragma once

#include <JuceHeader.h>

class SynthSound : public juce::SynthesiserSound
{
public:
    SynthSound() = default;
    
    // This sound applies to all MIDI notes (full keyboard range)
    bool appliesToNote (int /*midiNoteNumber*/) override
    {
        return true;  // All notes are valid for this synth
    }
    
    // This sound works on all channels
    bool appliesToChannel (int /*midiChannel*/) override
    {
        return true;  // All MIDI channels accepted
    }
    
private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SynthSound)
};
