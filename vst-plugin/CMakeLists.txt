cmake_minimum_required(VERSION 3.22)
project(MySynthVST VERSION 1.0.0 LANGUAGES CXX)

# JUCE module path - adjust if JUCE is installed elsewhere
set(JUCE_DIR "" CACHE PATH "Path to JUCE directory")
set(JUCE_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/JUCE/modules")

# Find JUCE or download it
if(EXISTS "${JUCE_DIR}")
    set(JUCE_MODULES "${JUCE_DIR}/modules")
elseif(NOT EXISTS "${JUCE_MODULES}")
    message(STATUS "JUCE not found. Please set JUCE_DIR to your JUCE installation path.")
    message(STATUS "You can download JUCE from: https://juce.com/download/")
endif()

add_subdirectory("${JUCE_MODULES}" JUCE_MODULES)

# Define the plugin project
juce_add_plugin(MySynthVST
    COMPANY_NAME "MyCompany"
    PLUGIN_NAME "MySynth"
    PLUGIN_FORMAT VST3 Standalone
    PRODUCT_NAME "MySynth"
    VERSION "1.0.0"
    ICON_BIG "Resources/icon.png"
    ICON_SMALL "Resources/icon.png"
    # Enable AU on macOS
    PLUGIN_AU "1"
    # Enable AAX (requires AAX SDK)
    PLUGIN_AAX "0"
    # Code signing for macOS
    CODE_SIGNING_IDENTITY "" CACHE STRING "Code signing identity"
)

# Source files
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

# JUCE configuration
juce_generate_juce_header(MySynthVST)

target_compile_definitions(MySynthVST PRIVATE
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_HOST=0
    JUCE_AUHosting=0
)

# Link libraries
target_link_libraries(MySynthVST PRIVATE
    juce::juce_audio_utils
    juce::juce_gui_extra
)
