/**
 * PROSynth - Expanded Modulation System
 * 12-Slot Matrix, 4 LFOs, Multi-Stage Envelopes, MPE, Velocity Curves,
 * Random/Chaos Sources, Envelope Follower
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.ModulationSystem = {
    initialized: false,
    matrix: null,
    lfos: null,
    envelopes: null,
    mpe: null,
    velocityCurve: null,
    randomSources: null,
    envFollower: null
};

// ===== 1. TWELVE-SLOT MODULATION MATRIX =====

const ModulationMatrix = {
    slots: Array(12).fill(null).map((_, i) => ({
        id: i,
        source: 'off',
        destination: 'off',
        amount: 0,
        curve: 'linear',
        via: 'none',
        enabled: false,
        // Runtime references (set during audio routing)
        sourceNode: null,
        destinationParam: null,
        viaNode: null,
        lastValue: 0
    })),
    
    // Available sources
    sources: [
        'off', 'LFO1', 'LFO2', 'LFO3', 'LFO4',
        'Env1', 'Env2', 'Env3',
        'Velocity', 'Aftertouch', 'RandomWalk', 'SampleHold',
        'QuantizedRandom', 'LorenzX', 'LorenzY', 'LorenzZ',
        'EnvFollow', 'Macro1', 'Macro2', 'Macro3', 'Macro4'
    ],
    
    // Available destinations
    destinations: [
        'off', 'Osc1Pitch', 'Osc1Detune', 'Osc1Level', 'Osc1WavetablePos',
        'Osc2Pitch', 'Osc2Detune', 'Osc2Level',
        'FilterCutoff', 'FilterResonance', 'FilterDrive',
        'WavefoldAmount', 'NoiseLevel',
        'AmpLevel', 'PanPosition',
        'EffectMix', 'ReverbMix', 'DelayMix', 'ChorusDepth',
        'LFO1Rate', 'LFO2Rate', 'LFO3Rate', 'LFO4Rate',
        'CharacterWarmth', 'CharacterPunch', 'CharacterPresence', 'CharacterAir'
    ],
    
    // Curve types and their math functions
    curves: {
        linear: (v) => v,
        exponential: (v) => Math.pow(Math.abs(v), 1.5) * Math.sign(v),
        logarithmic: (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.67),
        sCurve: (v) => Math.sin((v * Math.PI / 2) - Math.PI/2) / 2 + 0.5,
        stepped: (v) => Math.floor(v * 8) / 8
    },
    
    setSlot(slotIndex, params) {
        if (slotIndex < 0 || slotIndex >= 12) return;
        
        const slot = this.slots[slotIndex];
        Object.assign(slot, params);
        
        console.log(`🔗 Matrix Slot ${slotIndex}: ${slot.source} → ${slot.destination} (${slot.amount}%)`);
    },
    
    enableSlot(slotIndex, enabled) {
        if (this.slots[slotIndex]) {
            this.slots[slotIndex].enabled = enabled;
            console.log(`Matrix Slot ${slotIndex}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        }
    },
    
    // Process all active slots - returns object of destination -> accumulated value
    process(time = 0) {
        const output = {};
        
        this.slots.forEach(slot => {
            if (!slot.enabled || slot.source === 'off' || slot.destination === 'off') return;
            
            // Get source value (would be fetched from actual LFO/env/etc in real implementation)
            let sourceValue = this.getSourceValue(slot.source, time);
            if (!sourceValue && sourceValue !== 0) return;
            
            // Apply curve transformation
            const curveFn = this.curves[slot.curve] || this.curves.linear;
            let processedValue = curveFn(sourceValue);
            
            // Apply via (secondary modulation of amount)
            if (slot.via !== 'none') {
                const viaValue = this.getSourceValue(slot.via, time) || 0;
                processedValue *= (0.5 + viaValue * 0.5); // Scale by via
            }
            
            // Apply amount (-100 to +100 becomes -1 to +1)
            const finalValue = processedValue * (slot.amount / 100);
            
            // Accumulate to destination
            output[slot.destination] = (output[slot.destination] || 0) + finalValue;
            slot.lastValue = finalValue;
        });
        
        return output;
    },
    
    getSourceValue(sourceName, time) {
        // This would interface with actual LFO/envelope/random objects
        // For now, return placeholder values that would come from those systems
        switch(sourceName) {
            case 'LFO1': case 'LFO2': case 'LFO3': case 'LFO4':
                return window.PROSynth.ModulationSystem.lfos?.[sourceName]?.getValue?.(time) ?? 0;
            case 'Env1': case 'Env2': case 'Env3':
                return window.PROSynth.ModulationSystem.envelopes?.[`env${sourceName.slice(-1)}`]?.getValue?.(time) ?? 0;
            default:
                return 0; // Placeholder
        }
    },
    
    clearAll() {
        this.slots.forEach((slot, i) => {
            Object.assign(slot, {
                source: 'off', destination: 'off', amount: 0,
                curve: 'linear', via: 'none', enabled: false
            });
        });
    },
    
    getState() {
        return this.slots.map(s => ({
            source: s.source, destination: s.destination,
            amount: s.amount, curve: s.curve, via: s.via, enabled: s.enabled
        }));
    },
    
    setState(state) {
        state.forEach((s, i) => { if (i < 12) Object.assign(this.slots[i], s); });
    }
};

// ===== 2. FOUR INDEPENDENT LFOS =====

const LFOSystem = {
    lfos: {},
    
    shapes: ['sine', 'triangle', 'square', 'sawUp', 'sawDown', 'random', 'chaos', 'custom'],
    
    createLFO(id, audioCtx) {
        const lfo = {
            id,
            ctx: audioCtx,
            
            // Parameters
            shape: 'sine',
            rate: 1,           // Hz or tempo-synced
            syncMode: 'free',  // free, tempo divisions
            phase: 0,          // degrees
            fadeIn: 0,         // seconds
            delay: 0,          // seconds
            depth: 1,          // 0-1
            retrigger: false,  // reset on note
            unipolar: false,   // 0-+1 vs -1->+1
            
            // Nodes
            osc: null,
            depthGain: null,
            delayGain: null,
            output: null,
            
            // Custom shape data (256 points)
            customShape: new Float32Array(256).fill(0.5).map((_, i) => Math.sin(i / 256 * Math.PI * 2)),
            
            // State
            started: false,
            startTime: 0,
            
            init() {
                this.osc = this.ctx.createOscillator();
                this.depthGain = this.ctx.createGain();
                this.depthGain.gain.value = this.depth;
                this.delayGain = this.ctx.createGain();
                this.delayGain.gain.value = 0; // Start silent during delay
                
                this.output = this.ctx.createGain();
                this.output.gain.value = this.unipolar ? 0.5 : 1;
                
                this.applyShape();
                
                this.osc.connect(this.depthGain);
                this.depthGain.connect(this.delayGain);
                this.delayGain.connect(this.output);
                
                // Offset for unipolar mode
                if (this.unipolar) {
                    const offset = this.ctx.createConstantSource();
                    offset.offset.value = 0.5;
                    offset.connect(this.output);
                    offset.start();
                    this.offsetSource = offset;
                }
            },
            
            applyShape() {
                if (!this.osc) return;
                
                switch(this.shape) {
                    case 'sine':
                        this.osc.type = 'sine';
                        break;
                    case 'triangle':
                        this.osc.type = 'triangle';
                        break;
                    case 'square':
                        this.osc.type = 'square';
                        break;
                    case 'sawUp':
                        this.osc.type = 'sawtooth';
                        break;
                    case 'sawDown':
                        this.osc.type = 'sawtooth';
                        // Invert sawtooth for down ramp
                        break;
                    case 'random':
                    case 'chaos':
                        // Would use AudioWorklet for these complex types
                        this.osc.type = 'sine'; // Fallback
                        break;
                    case 'custom':
                        // Would use WaveShaperNode with customShape data
                        this.osc.type = 'sine';
                        break;
                }
                
                this.osc.frequency.value = this.rate;
                
                // Set initial phase
                const phaseOffset = (this.phase / 360) * (Math.PI * 2);
                // Note: Web Audio doesn't directly support initial phase on oscillators
                // Would need worklet or delay trick for accurate phase
            },
            
            start(time = 0) {
                if (this.started) return;
                
                this.init();
                const t = time || this.ctx.currentTime;
                
                this.startTime = t;
                this.osc.start(t);
                this.started = true;
                
                // Handle delay (ramp up from silence)
                if (this.delay > 0) {
                    this.delayGain.gain.setValueAtTime(0, t);
                    this.delayGain.gain.linearRampToValueAtTime(1, t + this.delay);
                } else {
                    this.delayGain.gain.value = 1;
                }
                
                // Handle fade in
                if (this.fadeIn > 0) {
                    this.depthGain.gain.setValueAtTime(0.001, t);
                    this.depthGain.gain.linearRampToValueAtTime(this.depth, t + this.fadeIn);
                }
                
                console.log(`〰️ LFO${id} started (${this.shape} @ ${this.rate}Hz)`);
            },
            
            stop(time = 0) {
                if (!this.started) return;
                const t = time || this.ctx.currentTime;
                
                try {
                    this.osc.stop(t + 0.1);
                    if (this.offsetSource) this.offsetSource.stop(t + 0.1);
                } catch(e) {}
                
                this.started = false;
            },
            
            retrigger(time = 0) {
                if (!this.retrigger) return;
                this.stop(time);
                this.start(time);
            },
            
            getValue(atTime = 0) {
                if (!this.started) return 0;
                const t = atTime || this.ctx.currentTime;
                const elapsed = t - this.startTime - this.delay;
                
                if (elapsed < 0) return this.unipolar ? 0.5 : 0; // During delay
                
                // Calculate value based on shape (simplified)
                const phase = ((elapsed * this.rate) + (this.phase / 360)) % 1;
                let value;
                
                switch(this.shape) {
                    case 'sine':
                        value = Math.sin(phase * Math.PI * 2);
                        break;
                    case 'triangle':
                        value = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
                        break;
                    case 'square':
                        value = phase < 0.5 ? 1 : -1;
                        break;
                    case 'sawUp':
                        value = phase * 2 - 1;
                        break;
                    case 'sawDown':
                        value = 1 - phase * 2;
                        break;
                    default:
                        value = Math.sin(phase * Math.PI * 2);
                }
                
                // Apply fade-in
                const fadeProgress = Math.min(1, elapsed / (this.fadeIn || 0.001));
                value *= fadeProgress * this.depth;
                
                // Unipolar conversion
                if (this.unipolar) {
                    value = (value + 1) / 2;
                }
                
                return value;
            },
            
            setParam(param, value) {
                switch(param) {
                    case 'shape': this.shape = value; this.applyShape(); break;
                    case 'rate': 
                        this.rate = value; 
                        if (this.osc) this.osc.frequency.setTargetAtTime(value, this.ctx?.currentTime || 0, 0.02);
                        break;
                    case 'phase': this.phase = value; this.applyShape(); break;
                    case 'depth': 
                        this.depth = value;
                        if (this.depthGain) this.depthGain.gain.setTargetAtTime(value, this.ctx?.currentTime || 0, 0.02);
                        break;
                    case 'retrigger': this.retrigger = value; break;
                    case 'unipolar': 
                        this.unipolar = value;
                        if (this.output) this.output.gain.value = value ? 0.5 : 1;
                        break;
                    case 'delay': this.delay = value; break;
                    case 'fadeIn': this.fadeIn = value; break;
                }
            },
            
            getOutput() {
                return this.output;
            }
        };
        
        this.lfos[id] = lfo;
        return lfo;
    },
    
    getLFO(id) {
        return this.lfos[id];
    },
    
    getAllValues(time = 0) {
        const values = {};
        Object.keys(this.lfos).forEach(id => {
            values[id] = this.lfos[id].getValue(time);
        });
        return values;
    }
};

// ===== 3. MULTI-STAGE ENVELOPES =====

const MultiStageEnvelope = {
    envelopes: {},
    
    presets: {
        'ADSR': [
            { time: 0, level: 0, curve: 'exponential' },
            { time: 0.01, level: 1, curve: 'exponential' },
            { time: 0.2, level: 0.6, curve: 'exponential' },
            { time: 0.21, level: 0.6, curve: 'linear', isSustain: true },
            { time: 1.0, level: 0, curve: 'exponential' }
        ],
        'Percussive': [
            { time: 0, level: 0, curve: 'exponential' },
            { time: 0.001, level: 1, curve: 'exponential' },
            { time: 0.15, level: 0.3, curve: 'exponential' },
            { time: 0.16, level: 0.3, curve: 'linear', isSustain: true },
            { time: 0.5, level: 0, curve: 'exponential' }
        ],
        'Pad': [
            { time: 0, level: 0, curve: 'exponential' },
            { time: 1.5, level: 1, curve: 'exponential' },
            { time: 2.5, level: 0.7, curve: 'exponential' },
            { time: 2.51, level: 0.7, curve: 'linear', isSustain: true },
            { time: 4.0, level: 0, curve: 'exponential' }
        ],
        'Pluck': [
            { time: 0, level: 0, curve: 'exponential' },
            { time: 0.002, level: 0.9, curve: 'exponential' },
            { time: 0.08, level: 0.2, curve: 'exponential' },
            { time: 0.09, level: 0.2, curve: 'linear', isSustain: true },
            { time: 2.0, level: 0, curve: 'exponential' }
        ]
    },
    
    createEnvelope(id, audioCtx, options = {}) {
        const env = {
            id,
            ctx: audioCtx,
            
            // Points array (editable)
            points: options.points || JSON.parse(JSON.stringify(this.presets.ADSR)),
            
            // Parameters
            holdTime: 0,
            holdLevel: 50,
            delayTime: 0,
            velocityTracking: 100,
            loopEnabled: false,
            loopStartPoint: 0,
            loopEndPoint: 0,
            loopCount: 0, // 0 = infinite
            
            // Node
            gainNode: null,
            
            // State
            currentStage: 0,
            startTime: 0,
            isActive: false,
            currentValue: 0,
            
            init() {
                this.gainNode = this.ctx.createGain();
                this.gainNode.gain.value = 0;
            },
            
            trigger(velocity = 127, time = 0) {
                if (!this.gainNode) this.init();
                
                const t = time || this.ctx.currentTime;
                this.startTime = t;
                this.isActive = true;
                this.currentStage = 0;
                
                const velScale = velocity / 127;
                const velTrack = this.velocityTracking / 100;
                
                // Schedule all stages
                let currentTime = t + this.delayTime;
                
                // Delay stage (hold at zero)
                if (this.delayTime > 0) {
                    this.gainNode.gain.setValueAtTime(0.0001, t);
                    this.gainNode.gain.linearRampToValueAtTime(0.0001, currentTime);
                }
                
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i + 1];
                    
                    // Check for loop point
                    if (this.loopEnabled && p1.time >= this.loopStartPoint && p2.time <= this.loopEndPoint) {
                        // Looping section handled separately
                    }
                    
                    const duration = (p2.time - p1.time) * this.getGlobalScale();
                    const targetLevel = p2.level * velScale * velTrack;
                    
                    // Ensure positive for exponential
                    const safeTarget = Math.max(0.0001, targetLevel);
                    
                    switch(p1.curve) {
                        case 'exponential':
                            this.gainNode.gain.exponentialRampToValueAtTime(safeTarget, currentTime + duration);
                            break;
                        case 'logarithmic':
                            // Approximate log with multiple small linear ramps
                            const steps = 10;
                            const prevVal = this.gainNode.gain.value;
                            for (let s = 1; s <= steps; s++) {
                                const frac = s / steps;
                                const logVal = prevVal + (safeTarget - prevVal) * Math.log1p(frac * (Math.E - 1));
                                this.gainNode.gain.linearRampToValueAtTime(logVal, currentTime + duration * frac);
                            }
                            break;
                        case 's-curve':
                            // S-curve approximation
                            const scPrev = this.gainNode.gain.value;
                            for (let s = 1; s <= 20; s++) {
                                const frac = s / 20;
                                const scFrac = (Math.sin((frac - 0.5) * Math.PI) / 2) + 0.5;
                                const scVal = scPrev + (safeTarget - scPrev) * scFrac;
                                this.gainNode.gain.linearRampToValueAtTime(scVal, currentTime + duration * frac);
                            }
                            break;
                        default: // linear
                            this.gainNode.gain.linearRampToValueAtTime(targetLevel, currentTime + duration);
                    }
                    
                    currentTime += duration;
                    
                    // Hold stage handling
                    if (p2.isSustain && this.holdTime > 0) {
                        this.gainNode.gain.setValueAtTime(targetLevel, currentTime);
                        currentTime += this.holdTime;
                    }
                }
                
                console.log(`📈 Env ${id} triggered (vel=${velocity})`);
            },
            
            release(releaseTime = 0.1, time = 0) {
                if (!this.isActive) return;
                
                const t = time || this.ctx.currentTime;
                const sustainPoint = this.points.find(p => p.isSustain);
                const releaseStartLevel = sustainPoint ? sustainPoint.level : this.currentValue;
                
                // Find release segment (last point should be zero)
                const lastPoint = this.points[this.points.length - 1];
                const releaseDuration = (lastPoint.time - (sustainPoint?.time || 0)) * this.getGlobalScale();
                
                this.gainNode.gain.cancelScheduledValues(t);
                this.gainNode.gain.setValueAtTime(
                    Math.max(0.0001, releaseStartLevel), 
                    t
                );
                this.gainNode.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, releaseDuration));
                
                this.isActive = false;
            },
            
            getValue(atTime = 0) {
                if (!this.isActive) return 0;
                const t = atTime || this.ctx.currentTime;
                const elapsed = t - this.startTime;
                
                // Find current position in envelope
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i + 1];
                    
                    if (elapsed >= p1.time && elapsed <= p2.time) {
                        const progress = (elapsed - p1.time) / (p2.time - p1.time);
                        
                        // Interpolate based on curve type
                        switch(p1.curve) {
                            case 'exponential':
                                return p1.level + (p2.level - p1.level) * Math.pow(progress, 2);
                            case 'logarithmic':
                                return p1.level + (p2.level - p1.level) * (1 - Math.pow(1 - progress, 2));
                            case 's-curve':
                                const sc = (Math.sin((progress - 0.5) * Math.PI) / 2) + 0.5;
                                return p1.level + (p2.level - p1.level) * sc;
                            default:
                                return p1.level + (p2.level - p1.level) * progress;
                        }
                    }
                }
                
                return 0;
            },
            
            getGlobalScale() {
                // Could be modulated by master envelope scale knob
                return 1;
            },
            
            addPoint(afterIndex, point) {
                this.points.splice(afterIndex + 1, 0, point);
            },
            
            removePoint(index) {
                if (this.points.length > 2 && index > 0 && index < this.points.length - 1) {
                    this.points.splice(index, 1);
                }
            },
            
            getSustainPointIndex() {
                return this.points.findIndex(p => p.isSustain);
            },
            
            setSustainPoint(index) {
                this.points.forEach((p, i) => { p.isSustain = (i === index); });
            },
            
            loadPreset(name) {
                if (this.presets[name]) {
                    this.points = JSON.parse(JSON.stringify(this.presets[name]));
                    return true;
                }
                return false;
            },
            
            getOutput() {
                return this.gainNode;
            }
        };
        
        this.envelopes[id] = env;
        return env;
    },
    
    getEnvelope(id) {
        return this.envelopes[id];
    }
};

// ===== 4. MPE (MIDI POLYPHONIC EXPRESSION) ENGINE =====

const MPEEngine = {
    enabled: false,
    
    // Per-note MPE data storage
    voices: new Map(),
    
    // Settings
    settings: {
        pressureDestination: 'amplitude',   // amplitude, filterCutoff, brightness, both
        pressureAmount: 50,                 // 0-100%
        slideRange: 2,                      // ±semitones (default ±2)
        timbreDestination: 'wavetablePos',  // wavetablePos, filterReso, wavefold, character
        timbreAmount: 50                    // 0-100%
    },
    
    // Voice class for per-note expression
    MPEVoice: class {
        constructor(noteNumber) {
            this.noteNumber = noteNumber;
            this.pressure = 0;      // 0-127
            this.slide = 0;         // -8192 to +8192 (pitch bend)
            this.timbre = 0;        // 0-127 (CC74)
        }
        
        getPressureNormalized() { return this.pressure / 127; }
        getSlideSemitones() { return (this.slide / 8192) * this.slideRange; }
        getTimbreNormalized() { return this.timbre / 127; }
        
        applyToVoice(audioNodes, engineSettings) {
            // Pressure → amplitude
            if (engineSettings.pressureDestination === 'amplitude' || engineSettings.pressureDestination === 'both') {
                const pressureMod = 1 + (this.getPressureNormalized() * engineSettings.pressureAmount / 100);
                if (audioNodes.gainNode) {
                    audioNodes.gainNode.gain.targetValue = (audioNodes.baseGain || 0.5) * pressureMod;
                }
            }
            
            // Pressure → filter cutoff
            if (engineSettings.pressureDestination === 'filterCutoff' || engineSettings.pressureDestination === 'both') {
                const cutoffBoost = this.getPressureNormalized() * engineSettings.pressureAmount * 5000;
                if (audioNodes.filterNode) {
                    audioNodes.filterNode.frequency.targetValue = (audioNodes.baseCutoff || 2000) + cutoffBoost;
                }
            }
            
            // Slide → pitch
            const semitones = this.getSlideSemitones();
            if (audioNodes.oscillators) {
                audioNodes.oscillators.forEach(osc => {
                    if (osc.frequency) {
                        osc.frequency.targetValue = (osc.baseFreq || 440) * Math.pow(2, semitones / 12);
                    }
                });
            }
            
            // Timbre → various destinations
            const timbreMod = this.getTimbreNormalized() * engineSettings.timbreAmount / 100;
            // Would route to appropriate parameter based on setting
        }
    },
    
    init(audioCtx) {
        this.audioCtx = audioCtx;
        console.log('🎹 MPE Engine initialized');
    },
    
    // Called when MPE note starts
    noteOn(noteNumber) {
        const voice = new this.MPEVoice(noteNumber);
        this.voices.set(noteNumber, voice);
        return voice;
    },
    
    // Called when MPE note ends
    noteOff(noteNumber) {
        this.voices.delete(noteNumber);
    },
    
    // Process incoming MIDI message for MPE data
    processMIDIMessage(data) {
        const status = data[0] & 0xF0;
        const channel = data[0] & 0x0F;
        
        switch(status) {
            case 0xD0: // Channel Aftertouch (Pressure)
                const pressure = data[1];
                // Apply to all active voices (mono aftertouch)
                this.voices.forEach(voice => {
                    voice.pressure = pressure;
                });
                break;
                
            case 0xE0: // Pitch Bend (Slide)
                const lsb = data[1];
                const msb = data[2];
                const bendValue = (msb << 7) | lsb; // 0-16383, center=8192
                const signedBend = bendValue - 8192; // -8192 to +8192
                // Would need to know which note this applies to (MPE uses different channels)
                break;
                
            case 0xB0: // Control Change
                if (data[1] === 74) { // Timbre (CC74)
                    const timbre = data[2];
                    this.voices.forEach(voice => {
                        voice.timbre = timbre;
                    });
                }
                break;
        }
    },
    
    setSetting(setting, value) {
        if (setting in this.settings) {
            this.settings[setting] = value;
        }
    },
    
    enable(enabled) {
        this.enabled = enabled;
        console.log(`MPE ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
};
// Make slideRange accessible from voice prototype
Object.defineProperty(MPEEngine.MPEVoice.prototype, 'slideRange', {
    get: function() { return MPEEngine.settings.slideRange; }
});

// ===== 5. VELOCITY CURVE SYSTEM =====

const VelocityCurveSystem = {
    currentCurve: 'linear',
    sensitivity: 1.0,     // 0.5 - 2.0 (compression/expansion)
    floor: 0,             // Minimum output velocity (0-127)
    ceiling: 127,         // Maximum velocity
    
    // Custom curve data (128 points)
    customCurveData: new Array(128).fill(0).map((_, i) => i),
    
    curves: {
        'linear': (v) => v,
        'exponential': (v) => Math.pow(v / 127, 2) * 127,
        'logarithmic': (v) => Math.sqrt(v / 127) * 127,
        's-curve': (v) => ((Math.sin(((v / 127) - 0.5) * Math.PI) / 2) + 0.5) * 127,
        'custom': (v, data) => data[Math.round(v)] || v
    },
    
    apply(rawVelocity) {
        let v = rawVelocity;
        
        // Clamp input
        v = Math.max(0, Math.min(127, v));
        
        // Apply selected curve
        const curveFn = this.curves[this.currentCurve];
        if (this.currentCurve === 'custom') {
            v = curveFn(v, this.customCurveData);
        } else {
            v = curveFn(v);
        }
        
        // Apply sensitivity (steepness)
        v = Math.pow(v / 127, 2 / this.sensitivity) * 127;
        
        // Apply floor/ceiling
        v = this.floor + (v / 127) * (this.ceiling - this.floor);
        
        // Final clamp
        return Math.max(0, Math.min(127, Math.round(v)));
    },
    
    setCurve(curveName) {
        if (curveName in this.curves) {
            this.currentCurve = curveName;
        }
    },
    
    setCustomPoint(inputVelocity, outputVelocity) {
        const idx = Math.max(0, Math.min(127, Math.round(inputVelocity)));
        this.customCurveData[idx] = Math.max(0, Math.min(127, outputVelocity));
    },
    
    generateCustomCurveFromPoints(points) {
        // Interpolate between user-defined points
        // points is array of {x, y}
        if (points.length < 2) return;
        
        points.sort((a, b) => a.x - b.x);
        
        for (let i = 0; i < 128; i++) {
            // Find surrounding points
            let lower = points[0], upper = points[points.length - 1];
            for (let j = 0; j < points.length - 1; j++) {
                if (i >= points[j].x && i <= points[j + 1].x) {
                    lower = points[j];
                    upper = points[j + 1];
                    break;
                }
            }
            
            // Linear interpolation
            const range = upper.x - lower.x || 1;
            const fraction = (i - lower.x) / range;
            this.customCurveData[i] = lower.y + (upper.y - lower.y) * fraction;
        }
    }
};

// ===== 6. RANDOM AND CHAOS SOURCES =====

const RandomChaosSources = {
    // 6A. Smooth Random Walk
    RandomWalk: class {
        constructor(options = {}) {
            this.speed = options.speed || 1;       // Hz (how fast it wanders)
            this.range = options.range || 1;       // Min/max bounds (±range)
            this.currentValue = 0;
            this.targetValue = 0;
            this.lastUpdate = Date.now();
        }
        
        update() {
            const now = Date.now();
            const dt = (now - this.lastUpdate) / 1000; // seconds
            
            // Occasionally pick new target
            if (Math.random() < this.speed * dt) {
                this.targetValue = (Math.random() * 2 - 1) * this.range;
            }
            
            // Smooth toward target
            const smoothing = 1 - Math.exp(-this.speed * dt * 3);
            this.currentValue += (this.targetValue - this.currentValue) * smoothing;
            
            this.lastUpdate = now;
            return this.currentValue;
        }
        
        getValue() { return this.update(); }
        reset() { this.currentValue = 0; this.targetValue = 0; }
    },
    
    // 6B. Sample & Hold
    SampleHold: class {
        constructor(options = {}) {
            this.clockRate = options.clockRate || 2;    // Hz
            this.smooth = options.smooth || 0;         // 0-1 glide
            this.syncMode = options.syncMode || 'free';
            this.currentValue = Math.random();
            this.targetValue = this.currentValue;
            this.lastClock = Date.now();
            this.interval = 1000 / this.clockRate;
        }
        
        update() {
            const now = Date.now();
            
            if (now - this.lastClock >= this.interval) {
                this.lastClock = now;
                this.targetValue = Math.random();
                this.interval = 1000 / this.clockRate;
            }
            
            // Glide toward target
            if (this.smooth > 0) {
                this.currentValue += (this.targetValue - this.currentValue) * this.smooth * 0.1;
            } else {
                this.currentValue = this.targetValue;
            }
            
            return this.currentValue * 2 - 1; // Map to -1 to +1
        }
        
        getValue() { return this.update(); }
        trigger() { this.targetValue = Math.random(); this.lastClock = Date.now(); }
    },
    
    // 6C. Quantized Random
    QuantizedRandom: class {
        constructor(options = {}) {
            this.scale = options.scale || 'chromatic';
            this.octaves = options.octaves || 2;
            this.currentValue = 0;
            
            // Scale definitions (semitones from root)
            this.scales = {
                'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                'major': [0, 2, 4, 5, 7, 9, 11],
                'minor': [0, 2, 3, 5, 7, 8, 10],
                'pentatonic': [0, 2, 4, 7, 9],
                'blues': [0, 3, 5, 6, 7, 10]
            };
        }
        
        generate() {
            const intervals = this.scales[this.scale] || this.scales.chromatic;
            const octave = Math.floor(Math.random() * this.octaves) - Math.floor(this.octaves / 2);
            const degree = intervals[Math.floor(Math.random() * intervals.length)];
            
            this.currentValue = (octave * 12 + degree) / (this.octaves * 6); // Normalize to ~0-1
            return this.currentValue;
        }
        
        getValue() { return this.generate(); }
    },
    
    // 6D. Lorenz Attractor (Deterministic Chaos)
    LorenzAttractor: class {
        constructor(options = {}) {
            this.speed = options.speed || 1;
            // Lorenz parameters (default: classic chaotic values)
            this.sigma = options.sigma || 10;
            this.rho = options.rho || 28;
            this.beta = options.beta || 8/3;
            
            // State variables
            this.x = 1;
            this.y = 1;
            this.z = 1;
            this.dt = 0.005; // Integration step size
        }
        
        iterate() {
            // Lorenz equations
            const dx_dt = this.sigma * (this.y - this.x);
            const dy_dt = this.x * (this.rho - this.z) - this.y;
            const dz_dt = this.x * this.y - this.beta * this.z;
            
            // Euler integration
            this.x += dx_dt * this.dt * this.speed;
            this.y += dy_dt * this.dt * this.speed;
            this.z += dz_dt * this.dt * this.speed;
            
            // Normalize outputs to reasonable ranges
            // x typically swings ±20, y ±25, z 0-50
            return {
                x: this.x / 20,   // Normalized approx -1 to +1
                y: this.y / 25,
                z: (this.z - 25) / 25  // Center around 0
            };
        }
        
        getX() { return this.iterate().x; }
        getY() { return this.iterate().y; }
        getZ() { return this.iterate().z; }
        
        reset(x = 1, y = 1, z = 1) {
            this.x = x; this.y = y; this.z = z;
        }
    },
    
    // Active instances
    instances: {},
    
    create(type, options = {}) {
        switch(type.toLowerCase()) {
            case 'randomwalk':
            case 'walk':
                this.instances[type] = new this.RandomWalk(options);
                break;
            case 'samplehold':
            case 'sh':
            case 's&h':
                this.instances[type] = new this.SampleHold(options);
                break;
            case 'quantized':
            case 'quantizedrandom':
                this.instances[type] = new this.QuantizedRandom(options);
                break;
            case 'lorenz':
            case 'chaos':
                this.instances[type] = new this.LorenzAttractor(options);
                break;
            default:
                console.warn(`Unknown random source type: ${type}`);
                return null;
        }
        return this.instances[type];
    },
    
    getValue(type) {
        const instance = this.instances[type];
        return instance ? instance.getValue() : 0;
    },
    
    getAllValues() {
        const values = {};
        Object.keys(this.instances).forEach(key => {
            values[key] = this.instances[key].getValue();
        });
        return values;
    }
};

// ===== 7. ENVELOPE FOLLOWER =====

const EnvelopeFollower = {
    audioCtx: null,
    analyser: null,
    processor: null,
    
    // Parameters
    params: {
        source: 'self',        // self, external, sidechain
        attack: 0.01,          // seconds (fast response to increases)
        release: 0.2,          // seconds (slow decay)
        preFilter: 'fullband'  // fullband, highpass, lowpass
    },
    
    // Current envelope value (updated each processing cycle)
    currentValue: 0,
    smoothedValue: 0,
    
    init(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Create analyser for FFT-based detection
        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.3;
        
        // Pre-filter
        this.preFilterNode = audioCtx.createBiquadFilter();
        this.updatePreFilter();
        
        console.log('📊 Envelope Follower initialized');
    },
    
    updatePreFilter() {
        if (!this.preFilterNode) return;
        
        switch(this.params.preFilter) {
            case 'highpass':
                this.preFilterNode.type = 'highpass';
                this.preFilterNode.frequency.value = 100;
                break;
            case 'lowpass':
                this.preFilterNode.type = 'lowpass';
                this.preFilterNode.frequency.value = 5000;
                break;
            default:
                this.preFilterNode.type = 'allpass'; // Pass through
                this.preFilterNode.frequency.value = 1000;
        }
    },
    
    connectSource(sourceNode) {
        if (!this.audioCtx) this.init(sourceNode.context);
        sourceNode.connect(this.preFilterNode);
        this.preFilterNode.connect(this.analyser);
    },
    
    // Get current envelope value (call repeatedly for real-time tracking)
    getValue() {
        if (!this.analyser) return 0;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS-like value
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length) / 255;
        
        // Apply attack/release smoothing
        const now = performance.now() / 1000;
        const dt = now - (this._lastTime || now);
        this._lastTime = now;
        
        if (rms > this.smoothedValue) {
            // Attack (fast follow upward)
            const coeff = Math.exp(-dt / this.params.attack);
            this.smoothedValue = rms + (this.smoothedValue - rms) * coeff;
        } else {
            // Release (slow decay downward)
            const coeff = Math.exp(-dt / this.params.release);
            this.smoothedValue = rms + (this.smoothedValue - rms) * coeff;
        }
        
        this.currentValue = this.smoothedValue;
        return this.smoothedValue;
    },
    
    setParam(param, value) {
        if (param in this.params) {
            this.params[param] = value;
            if (param === 'preFilter') this.updatePreFilter();
        }
    }
};

// ===== INITIALIZATION =====

function initModulationSystem() {
    window.PROSynth.ModulationSystem.matrix = ModulationMatrix;
    window.PROSynth.ModulationSystem.lfos = LFOSystem;
    window.PROSynth.ModulationSystem.envelopes = MultiStageEnvelope;
    window.PROSynth.ModulationSystem.mpe = MPEEngine;
    window.PROSynth.ModulationSystem.velocityCurve = VelocityCurveSystem;
    window.PROSynth.ModulationSystem.randomSources = RandomChaosSources;
    window.PROSynth.ModulationSystem.envFollower = EnvelopeFollower;
    window.PROSynth.ModulationSystem.initialized = true;
    
    console.log('🌀 Modulation System initialized (12-slot Matrix, 4 LFOs, Multi-stage Envs, MPE, Random Sources)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModulationSystem);
} else {
    initModulationSystem();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModulationMatrix, LFOSystem, MultiStageEnvelope, MPEEngine,
        VelocityCurveSystem, RandomChaosSources, EnvelopeFollower
    };
}
