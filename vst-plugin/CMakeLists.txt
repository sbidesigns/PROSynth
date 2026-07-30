cmake_minimum_required(VERSION 3.22)
project(MySynthVST VERSION 1.0.0 LANGUAGES CXX)

# Add JUCE as a subdirectory - this provides all JUCE functions
add_subdirectory(JUCE EXCLUDE_FROM_ALL)

# Define the plugin project using JUCE's helper function
juce_add_plugin(MySynthVST
    COMPANY_NAME "MyCompany"
    PLUGIN_NAME "MySynth"
    PLUGIN_FORMAT VST3 Standalone
    PRODUCT_NAME "MySynth"
    VERSION "1.0.0"
    # Enable AU on macOS
    PLUGIN_AU "1"
    # Disable AAX (requires separate SDK)
    PLUGIN_AAX "0"
)

# Source files for our plugin
target_sources(MySynthVST PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginProcessor.h
    Source/PluginEditor.cpp
    Source/PluginEditor.h
    Source/SynthVoice.cpp
    Source/SynthVoice.h
    Source/SynthSound.cpp
    Source/SynthSound.h
)

# Generate JUCE header
juce_generate_juce_header(MySynthVST)

# Compiler definitions to reduce binary size
target_compile_definitions(MySynthVST PRIVATE
    JUCE_WEB_BROWSER=0
    JUSE_CURL=0
    JUCE_VST3_HOST=0
    JUCE_AUHosting=0
)

# Link required JUCE libraries
target_link_libraries(MySynthVST PRIVATE
    juce::juce_audio_utils
    juce::juce_gui_extra
)
