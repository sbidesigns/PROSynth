/**
 * PROSynth - Performance Features Engine
 * Voice Modes (Poly/Mono/Legato/True Mono), Portamento Glide,
 * Voice Stealing Algorithms, Aftertouch Response, CPU Optimization, Oversampling
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.PerformanceEngine = {
    initialized: false,
    voiceManager: null,
    portamento: null,
    voiceStealing: null,
    aftertouch: null,
    cpuOptimizer: null,
    oversampler: null
};

// ===== 1. VOICE MODE SWITCHING =====

const VoiceModeManager = {
    currentMode: 'poly', // poly, mono, legato, true-mono
    voiceLimit: 16,
    
    // State tracking for mono/legato modes
    activeNotes: [],      // Currently held notes (for voice management)
    lastNote: null,       // Most recently played note (for glide source)
    
    // Callbacks (set by audio engine)
    createVoiceCallback: null,
    destroyVoiceCallback: null,
    retriggerEnvelopeCallback: null,
    
    init() {
        console.log('🎹 Voice Mode Manager initialized');
    },
    
    setMode(mode) {
        const validModes = ['poly', 'mono', 'legato', 'true-mono'];
        if (!validModes.includes(mode)) {
            console.warn(`Invalid voice mode: ${mode}`);
            return;
        }
        
        this.currentMode = mode;
        
        // Reset state on mode change
        this.activeNotes = [];
        this.lastNote = null;
        
        console.log(`Voice Mode: ${mode.toUpperCase()}`);
    },
    
    setVoiceLimit(limit) {
        this.voiceLimit = Math.max(1, Math.min(128, limit));
    },
    
    // Called when note is pressed
    handleNoteOn(noteData) {
        // noteData should contain: { noteName, freq, velocity, ... }
        
        switch(this.currentMode) {
            case 'poly':
                return this.handlePolyphonic(noteData);
                
            case 'mono':
            case 'true-mono':
                return this.handleMonophonic(noteData);
                
            case 'legato':
                return this.handleLegato(noteData);
                
            default:
                return this.handlePolyphonic(noteData);
        }
    },
    
    // Called when note is released
    handleNoteOff(noteName) {
        // Remove from active notes
        const idx = this.activeNotes.findIndex(n => n.noteName === noteName);
        if (idx > -1) {
            this.activeNotes.splice(idx, 1);
        }
        
        // In mono/legato, only stop if no notes held
        if ((this.currentMode === 'mono' || this.currentMode === 'true-mono') && 
            this.activeNotes.length > 0) {
            // Don't stop - another note is holding
            return { shouldStop: false };
        }
        
        if (this.currentMode === 'legato' && this.activeNotes.length > 0) {
            // Don't stop - glide to remaining note instead
            return { 
                shouldStop: false, 
                glideTo: this.activeNotes[this.activeNotes.length - 1] 
            };
        }
        
        return { shouldStop: true, noteName };
    },
    
    handlePolyphonic(noteData) {
        // Check voice limit
        if (this.activeNotes.length >= this.voiceLimit) {
            // Request voice steal
            if (this.destroyVoiceCallback) {
                const stolenNote = VoiceStealingEngine.selectVictim();
                if (stolenNote) {
                    this.destroyVoiceCallback(stolenNote);
                    // Remove from active
                    const idx = this.activeNotes.findIndex(n => n.noteName === stolenNote);
                    if (idx > -1) this.activeNotes.splice(idx, 1);
                }
            }
        }
        
        this.activeNotes.push(noteData);
        this.lastNote = noteData;
        
        if (this.createVoiceCallback) {
            return this.createVoiceCallback(noteData);
        }
        return null;
    },
    
    handleMonophonic(noteData) {
        // Stop current voice immediately (retrigger)
        if (this.lastNote && this.destroyVoiceCallback) {
            this.destroyVoiceCallback(this.lastNote.noteName, true); // Instant cut
        }
        
        this.activeNotes = [noteData];
        this.lastNote = noteData;
        
        if (this.createVoiceCallback) {
            const newVoice = this.createVoiceCallback(noteData);
            
            // Retrigger envelope in True Mono mode
            if (this.currentMode === 'true-mono' && this.retriggerEnvelopeCallback) {
                this.retriggerEnvelopeCallback(newVoice);
            }
            
            return newVoice;
        }
        return null;
    },
    
    handleLegato(noteData) {
        if (this.activeNotes.length === 0) {
            // First note - full attack
            this.activeNotes.push(noteData);
            this.lastNote = noteData;
            
            if (this.createVoiceCallback) {
                return this.createVoiceCallback(noteData);
            }
        } else {
            // Subsequent notes - glide pitch, don't retrigger envelope
            const prevNote = this.lastNote;
            
            this.activeNotes.push(noteData);
            this.lastNote = noteData;
            
            // Initiate glide
            if (PortamentoGlide.glideToPitch && prevNote) {
                PortamentoGlide.glideToPitch(
                    noteData.freq, 
                    prevNote.noteName, 
                    PortamentoGlide.getTime()
                );
            }
            
            // Move voice to new note name so release works later
            if (window.PROSynth?.oscillators) {
                const oldVoice = window.PROSynth.oscillators.get(prevNote.noteName);
                if (oldVoice) {
                    window.PROSynth.oscillators.delete(prevNote.noteName);
                    window.PROSynth.oscillators.set(noteData.noteName, oldVoice);
                }
            }
            
            return { glided: true, from: prevNote, to: noteData };
        }
        return null;
    },
    
    getActiveVoiceCount() {
        return this.activeNotes.length;
    },
    
    getState() {
        return {
            mode: this.currentMode,
            voiceLimit: this.voiceLimit,
            activeVoices: this.activeNotes.length,
            lastNote: this.lastNote?.noteName
        };
    }
};

// ===== 2. LEGATO PORTAMENTO =====

const PortamentoGlide = {
    enabled: false,
    time: 100,          // ms (0ms-10s)
    curve: 'linear',    // linear, exponential, logarithmic, s-curve
    mode: 'always',     // always, legatoOnly, auto (auto only when within minor third)
    
    // Auto mode threshold (semitones)
    autoThreshold: 3,   // Only glide if interval < 3 semitones
    
    // Current glide state
    gliding: false,
    glidingFrom: null,
    glidingTo: null,
    
    getTime() {
        return this.time / 1000; // Convert ms to seconds
    },
    
    glideToPitch(targetFreq, voiceNoteName, glideTime) {
        if (!this.enabled) return false;
        
        const ctx = window.PROSynth?.audioCtx;
        if (!ctx) return false;
        
        // Check auto mode threshold
        if (this.mode === 'auto') {
            // Would need to calculate interval between current and target
            // For now, always allow
        }
        
        const actualTime = glideTime || this.getTime();
        const now = ctx.currentTime;
        
        // Find the oscillator(s) for this voice
        const voice = window.PROSynth?.oscillators?.get(voiceNoteName);
        if (!voice || !voice.voices) return false;
        
        this.gliding = true;
        
        voice.voices.forEach(osc => {
            if (!osc.frequency) return;
            
            const currentFreq = osc.frequency.value;
            
            // Cancel any scheduled frequency changes
            osc.frequency.cancelScheduledValues(now);
            osc.frequency.setValueAtTime(currentFreq, now);
            
            // Apply glide based on curve type
            switch(this.curve) {
                case 'exponential':
                    // Exponential requires positive values
                    osc.frequency.exponentialRampToValueAtTime(
                        Math.max(20, targetFreq), 
                        now + Math.max(0.001, actualTime)
                    );
                    break;
                    
                case 'logarithmic':
                    // Logarithmic approximation with multiple linear ramps
                    const steps = 20;
                    for (let i = 1; i <= steps; i++) {
                        const frac = i / steps;
                        const logVal = currentFreq * Math.pow(targetFreq / currentFreq, frac);
                        osc.frequency.linearRampToValueAtTime(logVal, now + actualTime * frac);
                    }
                    break;
                    
                case 's-curve':
                    // S-curve using sine interpolation
                    const scSteps = 20;
                    for (let i = 1; i <= scSteps; i++) {
                        const frac = i / scSteps;
                        const scFrac = (Math.sin((frac - 0.5) * Math.PI) / 2) + 0.5;
                        const scVal = currentFreq + (targetFreq - currentFreq) * scFrac;
                        osc.frequency.linearRampToValueAtTime(scVal, now + actualTime * frac);
                    }
                    break;
                    
                default: // linear
                    osc.frequency.linearRampToValueAtTime(targetFreq, now + actualTime);
            }
        });
        
        // Schedule end of glide
        setTimeout(() => {
            this.gliding = false;
        }, actualTime * 1000);
        
        console.log(`↔️ Gliding ${voiceNoteName} → ${targetFreq.toFixed(1)}Hz (${actualTime * 1000}ms)`);
        return true;
    },
    
    setEnabled(enabled) {
        this.enabled = enabled;
    },
    
    setTime(ms) {
        this.time = Math.max(0, Math.min(10000, ms));
    },
    
    setCurve(curve) {
        this.curve = curve;
    },
    
    setMode(mode) {
        this.mode = mode;
    },
    
    isGliding() {
        return this.gliding;
    }
};

// ===== 3. VOICE STEALING ALGORITHMS =====

const VoiceStealingEngine = {
    strategy: 'oldest', // oldest, lowestAmp, highestPriority
    fadeTime: 10,       // ms (quick fade-out to prevent click)
    
    selectVictim() {
        const oscillators = window.PROSynth?.oscillators;
        if (!oscillators || oscillators.size === 0) return null;
        
        let victimNote = null;
        let victimData = null;
        
        switch(this.strategy) {
            case 'oldest':
                // Find voice that has been sounding longest
                let oldestTime = Infinity;
                oscillators.forEach((data, note) => {
                    if (data.startTime && data.startTime < oldestTime) {
                        oldestTime = data.startTime;
                        victimNote = note;
                        victimData = data;
                    }
                });
                break;
                
            case 'lowestAmp':
                // Find quietest voice (closest to silence or in release)
                let lowestGain = Infinity;
                oscillators.forEach((data, note) => {
                    try {
                        const currentGain = data.gainNode?.gain?.value || 0;
                        if (currentGain < lowestGain) {
                            lowestGain = currentGain;
                            victimNote = note;
                            victimData = data;
                        }
                    } catch(e) {}
                });
                break;
                
            case 'highestPriority':
                // Protect recent notes, sacrifice older ones
                // Simple implementation: steal oldest (same as oldest but with awareness)
                let highestAge = -Infinity;
                oscillators.forEach((data, note) => {
                    const age = Date.now() - (data.startTime || 0);
                    if (age > highestAge) {
                        highestAge = age;
                        victimNote = note;
                        victimData = data;
                    }
                });
                break;
        }
        
        return victimNote;
    },
    
    stealVoice(noteName, instant = false) {
        const oscillators = window.PROSynth?.oscillators;
        if (!oscillators || !noteName) return false;
        
        const voice = oscillators.get(noteName);
        if (!voice) return false;
        
        const ctx = window.PROSynth?.audioCtx;
        if (!ctx) return false;
        
        const fadeMs = instant ? 2 : this.fadeTime;
        
        try {
            // Fade out quickly
            if (voice.gainNode) {
                voice.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, ctx.currentTime);
                voice.gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + fadeMs / 1000);
            }
            
            // Stop oscillators after fade
            setTimeout(() => {
                if (voice.voices) {
                    voice.voices.forEach(osc => {
                        try { osc.stop(ctx.currentTime + 0.01); } catch(e) {}
                    });
                }
                oscillators.delete(noteName);
            }, fadeMs + 5);
            
            console.log(`🗑️ Stole voice: ${noteName} (${this.strategy}, ${fadeMs}ms fade)`);
            return true;
        } catch(e) {
            console.error('Voice steal failed:', e);
            return false;
        }
    },
    
    setStrategy(strategy) {
        const validStrategies = ['oldest', 'lowestAmp', 'highestPriority'];
        if (validStrategies.includes(strategy)) {
            this.strategy = strategy;
        }
    },
    
    setFadeTime(ms) {
        this.fadeTime = Math.max(0, Math.min(50, ms));
    }
};

// ===== 4. AFTERTOUCH RESPONSE =====

const AftertouchHandler = {
    enabled: false,
    
    // Source type
    sourceType: 'channel', // channel (mono), polyphonic (MPE), both
    
    // Mapping settings
    destination: 'amplitude', // amplitude, filterCutoff, filterResonance, wavetablePos, effectMix, lfoRate
    amount: 50,              // 0-100% modulation depth
    curve: 'linear',         // linear, exponential, logarithmic
    smoothing: 50,           // 0-500ms lag (prevents jitter)
    
    // Current value
    currentValue: 0,
    smoothedValue: 0,
    
    // Per-note MPE values (when MPE enabled)
    perNotePressure: new Map(),
    
    init(audioCtx) {
        this.audioCtx = audioCtx;
        console.log('👆 Aftertouch Handler initialized');
    },
    
    processAftertouch(value) {
        // value is 0-127
        if (!this.enabled) return;
        
        this.currentValue = value;
        
        // Apply curve transformation
        const normalized = value / 127;
        let curved;
        
        switch(this.curve) {
            case 'exponential':
                curved = Math.pow(normalized, 2);
                break;
            case 'logarithmic':
                curved = Math.sqrt(normalized);
                break;
            default:
                curved = normalized;
        }
        
        // Apply smoothing (simple lowpass)
        const smoothFactor = this.smoothing / 500;
        this.smoothedValue = this.smoothedValue + (curved - this.smoothedValue) * smoothFactor;
        
        // Apply modulation
        this.applyModulation(this.smoothedValue);
    },
    
    applyModulation(normalizedValue) {
        const modAmount = normalizedValue * (this.amount / 100);
        const ctx = this.audioCtx || window.PROSynth?.audioCtx;
        if (!ctx) return;
        
        const now = ctx.currentTime;
        
        switch(this.destination) {
            case 'amplitude':
                // Scale all active voice gains
                window.PROSynth?.oscillators?.forEach(voice => {
                    if (voice.baseGain !== undefined && voice.gainNode) {
                        const targetGain = voice.baseGain * (1 + modAmount);
                        voice.gainNode.gain.setTargetAtTime(Math.max(0, targetGain), now, 0.02);
                    }
                });
                break;
                
            case 'filterCutoff':
                // Modulate filter cutoff (would need reference to filter node)
                const cutoffBoost = modAmount * 5000; // Up to ±5kHz boost
                // This would interface with filter system
                console.log(`Aftertouch → Filter Cutoff: +${(cutoffBoost).toFixed(0)}Hz`);
                break;
                
            case 'filterResonance':
                // Modulate filter resonance/Q
                console.log(`Aftertouch → Filter Resonance: ×${(1 + modAmount).toFixed(2)}`);
                break;
                
            case 'wavetablePos':
                // Modulate wavetable position
                console.log(`Aftertouch → Wavetable Position: ${(modAmount * 100).toFixed(0)}%`);
                break;
                
            case 'effectMix':
                // Modulate effect mix amount
                console.log(`Aftertouch → Effect Mix: ${(modAmount * 100).toFixed(0)}%`);
                break;
                
            case 'lfoRate':
                // Modulate LFO rate
                console.log(`Aftertouch → LFO Rate: ×${(1 + modAmount).toFixed(2)}`);
                break;
        }
    },
    
    setDestination(dest) {
        this.destination = dest;
    },
    
    setAmount(percent) {
        this.amount = Math.max(0, Math.min(100, percent));
    },
    
    setCurve(curve) {
        this.curve = curve;
    },
    
    setSmoothing(ms) {
        this.smoothing = Math.max(0, Math.min(500, ms));
    },
    
    enable(enabled) {
        this.enabled = enabled;
        console.log(`Aftertouch ${enabled ? 'ENABLED' : 'DISABLED'} (${this.destination})`);
    },
    
    getValue() {
        return this.smoothedValue;
    }
};

// ===== 5. CPU OPTIMIZATION SETTINGS =====

const CPUIptimizer = {
    qualityPreset: 'high',
    
    settings: {
        voiceLimit: 32,
        oversampling: '4x',       // off, 2x, 4x, 8x
        effectQuality: 'full',    // full, reduced, minimal, dry
        visualUpdateRate: 30,      // fps (4-60)
        polyphonyStealing: 'dropOldest' // dropNewest, dropOldest, muteAll
    },
    
    qualityPresets: {
        ultra:   { voiceLimit: 64, oversampling: '8x', effectQuality: 'full', visualUpdateRate: 60 },
        high:    { voiceLimit: 32, oversampling: '4x', effectQuality: 'full', visualUpdateRate: 30 },
        medium:  { voiceLimit: 16, oversampling: '2x', effectQuality: 'reduced', visualUpdateRate: 20 },
        low:     { voiceLimit: 8,  oversampling: 'off', effectQuality: 'minimal', visualUpdateRate: 10 },
        eco:     { voiceLimit: 4,  oversampling: 'off', effectQuality: 'dry', visualUpdateRate: 4 }
    },
    
    // Performance monitoring
    metrics: {
        cpuLoad: 0,
        droppedFrames: 0,
        avgFrameTime: 0,
        lastCheck: 0
    },
    
    init() {
        this.startMonitoring();
        console.log('⚡ CPU Optimizer initialized');
    },
    
    applyPreset(presetName) {
        const preset = this.qualityPresets[presetName];
        if (preset) {
            Object.assign(this.settings, preset);
            this.qualityPreset = presetName;
            
            // Apply settings
            VoiceModeManager.setVoiceLimit(this.settings.voiceLimit);
            
            console.log(`CPU Preset: ${presetName.toUpperCase()}`, this.settings);
            return true;
        }
        return false;
    },
    
    setSetting(setting, value) {
        if (setting in this.settings) {
            this.settings[setting] = value;
            
            // Apply specific setting changes
            if (setting === 'voiceLimit') {
                VoiceModeManager.setVoiceLimit(value);
            }
        }
    },
    
    shouldProcessVisuals() {
        if (!this._lastVisualUpdate) this._lastVisualUpdate = performance.now();
        
        const now = performance.now();
        const interval = 1000 / this.settings.visualUpdateRate;
        
        if (now - this._lastVisualUpdate >= interval) {
            this._lastVisualUpdate = now;
            return true;
        }
        return false;
    },
    
    canAllocateVoice() {
        const currentCount = VoiceModeManager.getActiveVoiceCount();
        const limit = this.settings.voiceLimit;
        
        if (currentCount >= limit) {
            // Handle overload based on policy
            switch(this.settings.polyphonyStealing) {
                case 'dropNewest':
                    return false; // Don't allow new voice
                case 'dropOldest':
                    return 'steal'; // Signal to steal oldest
                case 'muteAll':
                    return 'mute'; // Signal to mute all and start fresh
            }
        }
        return true;
    },
    
    startMonitoring() {
        // Monitor frame rate using requestAnimationFrame
        let frames = 0;
        let lastTime = performance.now();
        
        const checkPerformance = () => {
            frames++;
            const now = performance.now();
            const elapsed = now - lastTime;
            
            if (elapsed >= 1000) {
                this.metrics.avgFrameTime = elapsed / frames;
                this.metrics.cpuLoad = Math.min(100, (frames / (elapsed / 1000)) * 25); // Rough estimate
                
                // Detect dropped frames (if significantly below target)
                const targetFPS = this.settings.visualUpdateRate;
                if (frames < targetFPS * 0.8) {
                    this.metrics.droppedFrames += (targetFPS - frames);
                }
                
                frames = 0;
                lastTime = now;
                
                // Auto-suggest lower quality if struggling
                if (this.metrics.cpuLoad > 90 && this.qualityPreset !== 'eco') {
                    console.warn('⚠️ High CPU load detected, consider lowering quality');
                }
            }
            
            this._monitorRAF = requestAnimationFrame(checkPerformance);
        };
        
        checkPerformance();
    },
    
    stopMonitoring() {
        if (this._monitorRAF) {
            cancelAnimationFrame(this._monitorRAF);
        }
    },
    
    getMetrics() {
        return { ...this.metrics };
    },
    
    getInfo() {
        return {
            preset: this.qualityPreset,
            settings: { ...this.settings },
            metrics: this.getMetrics(),
            recommendations: this.getRecommendations()
        };
    },
    
    getRecommendations() {
        const recs = [];
        
        if (this.metrics.cpuLoad > 85) {
            recs.push({ type: 'warning', message: 'High CPU - consider reducing voice count or disabling effects' });
        }
        if (this.metrics.droppedFrames > 10) {
            recs.push({ type: 'warning', message: `${this.metrics.droppedFrames} dropped frames - reduce visual update rate` });
        }
        if (this.settings.voiceLimit > 32 && this.metrics.cpuLoad > 70) {
            recs.push({ type: 'info', message: 'Many voices active - reduce for better performance' });
        }
        
        return recs;
    }
};

// ===== 6. OVERSAMPLING ENGINE =====

const OversamplingEngine = {
    enabled: false,
    factor: 4,           // 1x (off), 2x, 4x, 8x
    scope: 'oscillators', // oscillatorsOnly, oscillatorsAndFilters, fullChain
    
    // Processing nodes
    upsampleBuffer: null,
    downsampleBuffer: null,
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        console.log('🔄 Oversampling Engine created');
        return this;
    },
    
    // Generate oversampled waveform buffer
    generateOversampledWaveform(baseFreq, waveType, options = {}) {
        const sampleRate = this.audioCtx?.sampleRate || 44100;
        const effectiveRate = sampleRate * this.factor;
        const periodSamples = Math.ceil(effectiveRate / baseFreq);
        
        const buffer = new Float32Array(periodSamples);
        
        for (let i = 0; i < periodSamples; i++) {
            const t = (i / periodSamples) * Math.PI * 2;
            let sample;
            
            switch(waveType.toLowerCase()) {
                case 'sawtooth':
                    // Bandlimited sawtooth (additive synthesis with proper harmonic rolloff)
                    sample = 0;
                    const maxHarmonics = Math.floor(effectiveRate / (2 * baseFreq)) - 1;
                    for (let h = 1; h <= maxHarmonics; h++) {
                        sample += (Math.sin(t * h) / h) * (options.harmonicDecay || 1);
                    }
                    sample *= 2 / Math.PI; // Normalize
                    break;
                    
                case 'square':
                    // Bandlimited square (odd harmonics only)
                    sample = 0;
                    const sqMaxH = Math.floor(effectiveRate / (2 * baseFreq) / 2);
                    for (let h = 1; h <= sqMaxH; h += 2) {
                        sample += (Math.sin(t * h) / h) * (options.harmonicDecay || 1);
                    }
                    sample *= 4 / Math.PI; // Normalize
                    break;
                    
                case 'triangle':
                    // Can be derived from integrated square
                    sample = 0;
                    const triMaxH = Math.floor(effectiveRate / (2 * baseFreq) / 2);
                    for (let h = 1; h <= triMaxH; h += 2) {
                        const sign = ((h - 1) / 2) % 2 === 0 ? 1 : -1;
                        sample += sign * (Math.cos(t * h) / (h * h));
                    }
                    sample *= 8 / (Math.PI * Math.PI); // Normalize
                    break;
                    
                case 'sine':
                default:
                    sample = Math.sin(t);
                    break;
            }
            
            buffer[i] = sample;
        }
        
        // Apply anti-aliasing lowpass at Nyquist of TARGET rate (not effective rate)
        const antiAliased = this.applyAntiAliasFilter(buffer, baseFreq, effectiveRate);
        
        // Decimate to target rate
        const outputLength = Math.ceil(periodSamples / this.factor);
        const output = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            output[i] = antiAliased[i * this.factor];
        }
        
        return output;
    },
    
    applyAntiAliasFilter(buffer, freq, sampleRate) {
        // Simple moving average FIR lowpass (not ideal but functional)
        // Real implementation would use proper IIR or FIR design
        
        const nyquist = sampleRate / 2;
        const targetNyquist = nyquist / this.factor;
        
        // Very basic lowpass: moving average
        const kernelSize = Math.max(2, Math.round(sampleRate / (targetNyquist * 2)));
        const halfKernel = Math.floor(kernelSize / 2);
        const output = new Float32Array(buffer.length);
        
        for (let i = 0; i < buffer.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = -halfKernel; j <= halfKernel; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < buffer.length) {
                    sum += buffer[idx];
                    count++;
                }
            }
            
            output[i] = sum / count;
        }
        
        return output;
    },
    
    processAudioNode(nodeType, originalFunc, context) {
        // Wrapper that applies oversampling to audio node creation
        if (!this.enabled || this.factor === 1) {
            return originalFunc.call(context);
        }
        
        console.log(`Processing ${nodeType} at ${this.factor}× oversampling`);
        
        // Would implement actual oversampled processing here
        // For Web Audio API limitations, we use pre-computed buffers
        
        return originalFunc.call(context);
    },
    
    setFactor(factor) {
        const validFactors = [1, 2, 4, 8];
        if (validFactors.includes(factor)) {
            this.factor = factor;
            this.enabled = factor > 1;
        }
    },
    
    setScope(scope) {
        this.scope = scope;
    },
    
    enable(enabled) {
        this.enabled = enabled;
        if (!enabled) this.factor = 1;
    },
    
    getEffectiveSampleRate() {
        const baseRate = this.audioCtx?.sampleRate || 44100;
        return baseRate * this.factor;
    },
    
    getInfo() {
        return {
            enabled: this.enabled,
            factor: this.factor,
            scope: this.scope,
            effectiveSampleRate: this.getEffectiveSampleRate(),
            baseSampleRate: this.audioCtx?.sampleRate || 44100
        };
    }
};

// ===== INITIALIZATION =====

function initPerformanceEngine() {
    VoiceModeManager.init();
    CPUIptimizer.init();
    
    window.PROSynth.PerformanceEngine.voiceManager = VoiceModeManager;
    window.PROSynth.PerformanceEngine.portamento = PortamentoGlide;
    window.PROSynth.PerformanceEngine.voiceStealing = VoiceStealingEngine;
    window.PROSynth.PerformanceEngine.aftertouch = AftertouchHandler;
    window.PROSynth.PerformanceEngine.cpuOptimizer = CPUIptimizer;
    window.PROSynth.PerformanceEngine.oversampler = OversamplingEngine;
    window.PROSynth.PerformanceEngine.initialized = true;
    
    console.log('⚡ Performance Engine initialized (Voice Modes, Portamento, Stealing, Aftertouch, CPU/Oversampling)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPerformanceEngine);
} else {
    initPerformanceEngine();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VoiceModeManager, PortamentoGlide, VoiceStealingEngine,
        AftertouchHandler, CPUIptimizer, OversamplingEngine
    };
}
