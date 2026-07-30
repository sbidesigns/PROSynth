/**
 * PROSynth - Main Initialization
 * This file initializes all modules and wires up the application
 */

// ===== GLOBAL STATE =====
window.PROSynth = {
    version: '2.0.0',
    initialized: false,
    audioCtx: null,
    oscillators: new Map(),
    voiceCount: 0
};

// ===== INITIALIZATION FUNCTION =====
function initializePROSynth() {
    console.log('🎹 PROSynth Initializing...');
    
    // Initialize skin (from skin-system.js)
    if (typeof applySkin === 'function') {
        applySkin(currentSkin || 'midnight');
    }
    
    // Initialize MIDI (from midi.js)
    if (typeof initMIDI === 'function') {
        initMIDI().catch(err => console.log('MIDI init failed:', err));
    }
    
    // Initialize Creative Tools (from creative-tools.js)
    if (typeof initAllCreativeTools === 'function') {
        initAllCreativeTools();
    }
    
    window.PROSynth.initialized = true;
    console.log('✅ PROSynth Fully Initialized!');
    console.log('   📦 Modules loaded:');
    console.log('      • core.js - Knob system & UI basics');
    console.log('      • audio-engine.js - Web Audio synthesis');
    console.log('      • ui.js - Visualizers & displays');
    console.log('      • presets.js - Preset management');
    console.log('      • song-starter.js - Melody generation');
    console.log('      • skin-system.js - Theme switching');
    console.log('      • midi.js - MIDI input support');
    console.log('      • features.js - Advanced features');
    console.log('      • creative-tools.js - Revolutionary tools');
}

// ===== DOM READY INITIALIZATION =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePROSynth);
} else {
    initializePROSynth();
}

// ===== EXPORT FOR DEBUGGING =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.PROSynth;
}
