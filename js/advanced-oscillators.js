/**
 * PROSynth - Advanced Oscillator Engine
 * Sample Playback, Physical Modeling, Wavefolding
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

// ===== GLOBAL STATE EXTENSION =====
window.PROSynth = window.PROSynth || {};
window.PROSynth.AdvancedOscillators = {
    sampleEngine: null,
    physicalModels: null,
    waveFolder: null,
    initialized: false
};

// ===== 1. SAMPLE PLAYBACK ENGINE =====
const SampleEngine = {
    buffer: null,
    bufferOriginal: null,
    sourceNodes: new Map(),
    sampleName: 'No Sample Loaded',
    
    // Parameters
    params: {
        sampleStart: 0,
        sampleEnd: 100,
        samplePitch: 0,
        timeStretch: 1.0,
        loopMode: 'off', // off, forward, reverse, pingpong
        loopCrossfade: 10, // ms
        reverse: false
    },
    
    async loadSample(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await window.PROSynth.audioCtx.decodeAudioData(arrayBuffer);
            this.buffer = audioBuffer;
            this.bufferOriginal = audioBuffer;
            this.sampleName = file.name;
            
            // Update UI if exists
            this.displayWaveform();
            console.log(`✅ Sample loaded: ${file.name} (${audioBuffer.duration.toFixed(2)}s)`);
            return true;
        } catch (error) {
            console.error('❌ Sample load failed:', error);
            return false;
        }
    },
    
    displayWaveform() {
        const canvas = document.getElementById('sampleWaveformCanvas');
        if (!canvas || !this.buffer) return;
        
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth * 2;
        const h = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        
        const data = this.buffer.getChannelData(0);
        const step = Math.ceil(data.length / (w / 2));
        
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, w/2, h/2);
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let i = 0; i < w/2; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            const yMin = ((1 + min) / 2) * (h/2);
            const yMax = ((1 + max) / 2) * (h/2);
            ctx.moveTo(i, yMin);
            ctx.lineTo(i, yMax);
        }
        ctx.stroke();
        
        // Draw loop points
        const startPx = (this.params.sampleStart / 100) * (w/2);
        const endPx = (this.params.sampleEnd / 100) * (w/2);
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPx, 0);
        ctx.lineTo(startPx, h/2);
        ctx.moveTo(endPx, 0);
        ctx.lineTo(endPx, h/2);
        ctx.stroke();
    },
    
    playSample(freq, velocity, duration, audioCtx) {
        if (!this.buffer || !audioCtx) return null;
        
        const source = audioCtx.createBufferSource();
        source.buffer = this.buffer;
        
        // Calculate playback rate for pitch
        const baseFreq = 440; // Assume A4 base
        const pitchShift = Math.pow(2, this.params.samplePitch / 12);
        const rate = (freq / baseFreq) * pitchShift * this.params.timeStretch;
        source.playbackRate.value = Math.max(0.25, Math.min(4, rate));
        
        // Create gain envelope
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(velocity / 127, audioCtx.currentTime + 0.005);
        
        // Loop settings
        if (this.params.loopMode !== 'off') {
            source.loop = true;
            const start = (this.params.sampleStart / 100) * this.buffer.duration;
            const end = (this.params.sampleEnd / 100) * this.buffer.duration;
            source.loopStart = start;
            source.loopEnd = end;
        }
        
        // Reverse handling
        if (this.params.reverse) {
            // Create reversed buffer clone
            const revChannels = [];
            for (let ch = 0; ch < this.buffer.numberOfChannels; ch++) {
                const orig = this.buffer.getChannelData(ch);
                const rev = new Float32Array(orig.length);
                for (let i = 0; i < orig.length; i++) {
                    rev[i] = orig[orig.length - 1 - i];
                }
                revChannels.push(rev);
            }
            const revBuffer = audioCtx.createBuffer(
                this.buffer.numberOfChannels,
                this.buffer.length,
                this.buffer.sampleRate
            );
            for (let ch = 0; ch < revChannels.length; ch++) {
                revBuffer.getChannelData(ch).set(revChannels[ch]);
            }
            source.buffer = revBuffer;
        }
        
        source.connect(gainNode);
        source.start(audioCtx.currentTime);
        
        if (duration && this.params.loopMode === 'off') {
            source.stop(audioCtx.currentTime + duration + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration + 0.1);
        }
        
        const voiceId = `sample_${Date.now()}_${Math.random()}`;
        this.sourceNodes.set(voiceId, { source, gainNode });
        
        return { node: gainNode, voiceId };
    },
    
    stopVoice(voiceId, audioCtx, releaseTime = 0.1) {
        const voice = this.sourceNodes.get(voiceId);
        if (voice) {
            voice.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, audioCtx.currentTime);
            voice.gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + releaseTime);
            voice.source.stop(audioCtx.currentTime + releaseTime + 0.05);
            this.sourceNodes.delete(voiceId);
        }
    },
    
    setParam(param, value) {
        if (param in this.params) {
            this.params[param] = value;
        }
    }
};

// ===== 2. PHYSICAL MODELING SYNTHESIS =====
const PhysicalModels = {
    
    // 2A. STRING RESONATOR (Karplus-Strong Extended)
    StringResonator: class {
        constructor(audioCtx, freq, options = {}) {
            this.audioCtx = audioCtx;
            this.freq = freq;
            this.decay = options.decay || 1.5; // seconds
            this.brightness = options.brightness || 0.5; // 0-1
            this.inharmonicity = options.inharmonicity || 0; // 0-0.01
            this.stiffness = options.stiffness || 0;
            
            this.nodes = {};
            this.delayTime = audioCtx.sampleRate / freq;
            this.createCircuit();
        }
        
        createCircuit() {
            const ctx = this.audioCtx;
            
            // Noise burst excitation
            this.excitation = ctx.createBufferSource();
            const bufferSize = ctx.sampleRate * 0.02; // 20ms noise burst
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
            }
            this.excitation.buffer = noiseBuffer;
            
            // Delay line (approximated with delay node)
            this.delay = ctx.createDelay(this.delayTime);
            this.delay.delayTime.value = this.delayTime;
            
            // Lowpass filter in feedback (brightness control)
            this.filter = ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.value = 200 + this.brightness * 7800; // 200Hz - 8000Hz
            this.filter.Q.value = 1 + this.brightness * 5;
            
            // Output gain (decay envelope)
            this.outputGain = ctx.createGain();
            this.outputGain.gain.setValueAtTime(0.8, ctx.currentTime);
            this.outputGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + this.decay);
            
            // Connect: excitation -> delay -> filter -> output
            //                                ^--feedback--|
            this.excitation.connect(this.delay);
            this.delay.connect(this.filter);
            this.filter.connect(this.outputGain);
            this.filter.connect(this.delay); // Feedback
            
            this.excitation.start(ctx.currentTime);
        }
        
        connect(destination) {
            this.outputGain.connect(destination);
        }
        
        stop(releaseTime = 0.1) {
            const ctx = this.audioCtx;
            this.outputGain.gain.cancelScheduledValues(ctx.currentTime);
            this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, ctx.currentTime);
            this.outputGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + releaseTime);
            try { this.excitation.stop(ctx.currentTime + releaseTime); } catch(e) {}
        }
        
        setFrequency(newFreq) {
            this.freq = newFreq;
            this.delayTime = this.audioCtx.sampleRate / newFreq;
            this.delay.delayTime.value = this.delayTime;
        }
    },
    
    // 2B. BRASS MODEL (Cubic Nonlinearity)
    BrassModel: class {
        constructor(audioCtx, freq, options = {}) {
            this.audioCtx = audioCtx;
            this.freq = freq;
            this.growl = options.growl || 0.3;
            this.bellStrike = options.bellStrike || 0.2;
            this.riseTime = options.riseTime || 0.1;
            
            this.nodes = {};
            this.createCircuit();
        }
        
        createCircuit() {
            const ctx = this.audioCtx;
            
            // Base oscillator
            this.osc = ctx.createOscillator();
            this.osc.type = 'sine';
            this.osc.frequency.value = this.freq;
            
            // Wave shaper for tube-like distortion (tanh nonlinearity)
            this.waveShaper = ctx.createWaveShaper();
            const curve = new Float32Array(1024);
            for (let i = 0; i < 1024; i++) {
                const x = (i / 512) * 2 - 1;
                curve[i] = Math.tanh(x * (1 + this.growl * 3)) / Math.tanh(1 + this.growl * 3);
            }
            this.waveShaper.curve = curve;
            
            // Bell strike transient (filtered noise burst)
            this.bellNoise = ctx.createBufferSource();
            const bellSize = ctx.sampleRate * 0.05;
            const bellBuf = ctx.createBuffer(1, bellSize, ctx.sampleRate);
            const bellData = bellBuf.getChannelData(0);
            for (let i = 0; i < bellSize; i++) {
                bellData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bellSize * 0.15)) * this.bellStrike;
            }
            this.bellNoise.buffer = bellBuf;
            
            this.bellFilter = ctx.createBiquadFilter();
            this.bellFilter.type = 'bandpass';
            this.bellFilter.frequency.value = this.freq * 2;
            this.bellFilter.Q.value = 5;
            
            // Envelope with rise time (brass gets brighter over time)
            this.envGain = ctx.createGain();
            this.envGain.gain.setValueAtTime(0, ctx.currentTime);
            this.envGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + this.riseTime);
            
            // Brightness filter (dynamic cutoff based on envelope)
            this.brightnessFilter = ctx.createBiquadFilter();
            this.brightnessFilter.type = 'lowpass';
            this.brightnessFilter.frequency.value = this.freq * 2;
            this.brightnessFilter.Q.value = 0.7;
            
            // Mix
            this.mixGain = ctx.createGain();
            this.mixGain.gain.value = 0.8;
            
            // Connect signal chain
            this.osc.connect(this.waveShaper);
            this.waveShaper.connect(this.brightnessFilter);
            this.brightnessFilter.connect(this.envGain);
            this.envGain.connect(this.mixGain);
            
            // Bell strike parallel path
            this.bellNoise.connect(this.bellFilter);
            this.bellFilter.connect(this.mixGain);
            
            this.osc.start(ctx.currentTime);
            this.bellNoise.start(ctx.currentTime);
        }
        
        connect(destination) {
            this.mixGain.connect(destination);
        }
        
        stop(releaseTime = 0.3) {
            const ctx = this.audioCtx;
            this.envGain.gain.cancelScheduledValues(ctx.currentTime);
            this.envGain.gain.setValueAtTime(this.envGain.gain.value, ctx.currentTime);
            this.envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + releaseTime);
            try { 
                this.osc.stop(ctx.currentTime + releaseTime); 
                this.bellNoise.stop(ctx.currentTime + 0.1); 
            } catch(e) {}
        }
        
        setFrequency(newFreq) {
            this.freq = newFreq;
            this.osc.frequency.setTargetAtTime(newFreq, this.audioCtx.currentTime, 0.02);
            this.brightnessFilter.frequency.setTargetAtTime(newFreq * 4, this.audioCtx.currentTime, this.riseTime);
        }
    },
    
    // 2C. ELECTRIC PIANO (Tine Resonator Model)
    ElectricPiano: class {
        constructor(audioCtx, freq, options = {}) {
            this.audioCtx = audioCtx;
            this.freq = freq;
            this.tineTuning = options.tineTuning || 5; // cents variation
            this.hammerHardness = options.hammerHardness || 0.5;
            this.sympatheticResonance = options.sympatheticResonance || 0.3;
            this.pickupPosition = options.pickupPosition || 0.15; // 0-1 from bridge
            
            this.tines = []; // Array of oscillator voices
            this.sympathetics = [];
            this.nodes = {};
            this.createTines();
        }
        
        createTines() {
            const ctx = this.audioCtx;
            const harmonics = [1, 2, 3, 4, 5, 6]; // Fundamental + 5 partials
            const detuneCents = this.tineTuning / 100; // Convert to ratio
            
            // Main tines (harmonic series with slight detune)
            harmonics.forEach((harm, idx) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                
                // Add slight random detune per tine (beating effect)
                const detune = (Math.random() - 0.5) * 2 * detuneCents;
                osc.frequency.value = this.freq * harm * (1 + detune);
                
                const gain = ctx.createGain();
                // Amplitude decreases for higher harmonics
                const amp = 1 / (idx + 1) * (1 - this.pickupPosition * 0.5);
                gain.gain.value = amp;
                
                // Decay: higher harmonics decay faster
                const decay = (1 + idx * 0.3) * (2 - this.hammerHardness);
                gain.gain.setValueAtTime(amp, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
                
                osc.connect(gain);
                osc.start(ctx.currentTime);
                
                this.tines.push({ osc, gain, harm });
            });
            
            // Hammer strike (noise burst filtered by hardness)
            this.hammer = ctx.createBufferSource();
            const hammerSize = ctx.sampleRate * 0.01 * (1 + this.hammerHardness * 0.03);
            const hammerBuf = ctx.createBuffer(1, hammerSize, ctx.sampleRate);
            const hammerData = hammerBuf.getChannelData(0);
            for (let i = 0; i < hammerSize; i++) {
                hammerData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hammerSize * 0.1)) * this.hammerHardness;
            }
            this.hammer.buffer = hammerBuf;
            
            this.hammerFilter = ctx.createBiquadFilter();
            this.hammerFilter.type = 'highpass';
            this.hammerFilter.frequency.value = 500 + this.hammerHardness * 4000;
            
            this.hammerGain = ctx.createGain();
            this.hammerGain.gain.value = this.hammerHardness * 0.5;
            
            this.hammer.connect(this.hammerFilter);
            this.hammerFilter.connect(this.hammerGain);
            this.hammer.start(ctx.currentTime);
            
            // Sympathetic resonances (ringing at different frequencies)
            if (this.sympatheticResonance > 0) {
                [0.5, 1.5, 2.5].forEach(offset => {
                    const sympOsc = ctx.createOscillator();
                    sympOsc.type = 'sine';
                    sympOsc.frequency.value = this.freq * (1 + offset * 0.01);
                    
                    const sympGain = ctx.createGain();
                    sympGain.gain.value = this.sympatheticResonance * 0.1;
                    sympGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
                    
                    sympOsc.connect(sympGain);
                    sympOsc.start(ctx.currentTime);
                    
                    this.sympathetics.push({ osc: sympOsc, gain: sympGain });
                });
            }
            
            // Master output
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 0.4;
            
            // Connect all tines to master
            this.tines.forEach(t => t.gain.connect(this.masterGain));
            this.hammerGain.connect(this.masterGain);
            this.sympathetics.forEach(s => s.gain.connect(this.masterGain));
        }
        
        connect(destination) {
            this.masterGain.connect(destination);
        }
        
        stop(releaseTime = 0.5) {
            const ctx = this.audioCtx;
            this.tines.forEach(t => {
                t.gain.gain.cancelScheduledValues(ctx.currentTime);
                t.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + releaseTime);
                try { t.osc.stop(ctx.currentTime + releaseTime); } catch(e) {}
            });
            this.sympathetics.forEach(s => {
                s.gain.gain.cancelScheduledValues(ctx.currentTime);
                s.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + releaseTime);
                try { s.osc.stop(ctx.currentTime + releaseTime); } catch(e) {}
            });
            try { this.hammer.stop(ctx.currentTime + 0.05); } catch(e) {}
        }
        
        setFrequency(newFreq) {
            this.freq = newFreq;
            this.tines.forEach(t => {
                t.osc.frequency.setTargetAtTime(newFreq * t.harm, this.audioCtx.currentTime, 0.01);
            });
        }
    },
    
    // Factory method
    createModel(type, audioCtx, freq, options) {
        switch(type.toLowerCase()) {
            case 'string':
            case 'string resonator':
                return new this.StringResonator(audioCtx, freq, options);
            case 'brass':
            case 'brass model':
                return new this.BrassModel(audioCtx, freq, options);
            case 'ep':
            case 'electric piano':
            case 'rhodes':
                return new this.ElectricPiano(audioCtx, freq, options);
            default:
                console.warn(`Unknown physical model: ${type}`);
                return null;
        }
    }
};

// ===== 3. WAVEFOLDING MODULE =====
const WaveFolder = {
    amount: 0,
    symmetry: 0,
    threshold: 0.5,
    curveType: 'soft',
    
    // Generate waveshaper curve for current parameters
    generateCurve(samples = 2048) {
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            // Input value from -1 to +1
            let x = (i / (samples / 2)) * 2 - 1;
            
            // Apply symmetry bias before folding
            x += this.symmetry;
            
            if (Math.abs(x) < this.threshold) {
                // Below threshold: pass through (with possible asymmetry offset)
                curve[i] = x;
            } else {
                // Above threshold: fold!
                let excess = Math.abs(x) - this.threshold;
                let folded;
                const numFolds = Math.floor(excess / (this.threshold * 2));
                const remainder = excess % (this.threshold * 2);
                
                switch(this.curveType) {
                    case 'soft': // Smooth tanh folding
                        folded = Math.sign(x) * (this.threshold - Math.tanh(remainder * this.amount) * this.threshold);
                        break;
                    case 'hard': // Sharp reflection
                        folded = Math.sign(x) * (this.threshold - remainder);
                        break;
                    case 'sinusoidal': // Sine wave folding
                        folded = Math.sign(x) * (this.threshold - Math.sin(remainder * Math.PI / this.threshold) * this.threshold * 0.5);
                        break;
                    default:
                        folded = Math.sign(x) * (this.threshold - remainder);
                }
                
                // Apply additional folds based on amount
                if (numFolds > 0 && this.amount > 1) {
                    folded *= Math.sin(numFolds * this.amount * 0.5) * 0.5 + 0.5;
                }
                
                curve[i] = folded;
            }
        }
        
        return curve;
    },
    
    createNode(audioCtx) {
        const ws = audioCtx.createWaveShaper();
        ws.curve = this.generateCurve();
        ws.oversample = '4x'; // Reduce aliasing
        return ws;
    },
    
    updateParams(params) {
        if ('amount' in params) this.amount = params.amount;
        if ('symmetry' in params) this.symmetry = params.symmetry;
        if ('threshold' in params) this.threshold = params.threshold;
        if ('curveType' in params) this.curveType = params.curveType;
    },
    
    // Visual transfer function for UI
    getTransferFunction(points = 256) {
        const result = [];
        for (let i = 0; i < points; i++) {
            const x = (i / (points / 2)) * 2 - 1;
            // Simplified fold calculation for visualization
            let y = x;
            if (Math.abs(x) > this.threshold) {
                const excess = Math.abs(x) - this.threshold;
                y = Math.sign(x) * (this.threshold - (excess % (this.threshold * 2)));
                y *= Math.min(1, this.amount);
            }
            result.push({ x, y });
        }
        return result;
    }
};

// ===== INITIALIZATION =====
function initAdvancedOscillators() {
    window.PROSynth.AdvancedOscillators.sampleEngine = SampleEngine;
    window.PROSynth.AdvancedOscillators.physicalModels = PhysicalModels;
    window.PROSynth.AdvancedOscillators.waveFolder = WaveFolder;
    window.PROSynth.AdvancedOscillators.initialized = true;
    console.log('🎸 Advanced Oscillators initialized (Sample, Physical Models, Wavefolder)');
}

// Auto-init if main synth is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedOscillators);
} else {
    initAdvancedOscillators();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SampleEngine, PhysicalModels, WaveFolder };
}
