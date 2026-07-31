/**
 * PROSynth - Expanded Effects Rack
 * Convolution Reverb, Multiband Compressor, Parametric EQ, Stereo Widener,
 * Gater/Trance Gate, Expanded Distortion Types (Tube, Tape, Bitcrush, Fuzz, Ring Mod)
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.ExpandedEffects = {
    initialized: false,
    reverb: null,
    multibandComp: null,
    eq: null,
    stereoWidener: null,
    gater: null,
    distortion: null
};

// ===== 1. CONVOLUTION REVERB WITH IR LOADER =====

const ConvolutionReverb = {
    convolverNode: null,
    preDelayNode: null,
    outputGain: null,
    
    // Built-in IR library (procedurally generated)
    builtInIRs: {
        'smallRoom': { decay: 0.5, preDelay: 0.005, damping: 0.4, width: 50 },
        'largeHall': { decay: 3.0, preDelay: 0.03, damping: 0.3, width: 90 },
        'cathedral': { decay: 6.0, preDelay: 0.05, damping: 0.2, width: 100 },
        'bathroom': { decay: 0.2, preDelay: 0.001, damping: 0.7, width: 30 },
        'plate140': { decay: 1.2, preDelay: 0.0, damping: 0.35, width: 80 },
        'emt240': { decay: 0.8, preDelay: 0.0, damping: 0.45, width: 70 },
        'springReverb': { decay: 1.5, preDelay: 0.01, damping: 0.25, width: 60 },
        'shimmerHall': { decay: 4.0, preDelay: 0.04, damping: 0.15, width: 100 }
    },
    
    params: {
        type: 'algorithmic',   // algorithmic or convolution (custom)
        irPreset: 'largeHall',
        customIRBuffer: null,
        preDelay: 30,         // ms
        decay: 2000,          // ms
        size: 100,            // % (time-stretch)
        width: 80,            // % stereo width
        damping: 30,          // % high-freq absorption
        modulation: 10,       // % subtle pitch modulation
        dryWet: 30            // %
    },
    
    async create(audioCtx) {
        this.audioCtx = audioCtx;
        
        this.convolverNode = audioCtx.createConvolver();
        this.preDelayNode = audioCtx.createDelay(0.2);
        this.preDelayNode.delayTime.value = this.params.preDelay / 1000;
        
        this.outputGain = audioCtx.createGain();
        this.outputGain.gain.value = this.params.dryWet / 100;
        
        this.dryGain = audioCtx.createGain();
        this.dryGain.gain.value = 1 - (this.params.dryWet / 100);
        
        // Load default IR preset
        await this.loadIRPreset(this.params.irPreset);
        
        console.log('🔊 Convolution Reverb created');
        return this;
    },
    
    async loadIRPreset(presetName) {
        const preset = this.builtInIRs[presetName];
        if (!preset || !this.audioCtx) return false;
        
        // Generate procedural impulse response based on preset parameters
        const sampleRate = this.audioCtx.sampleRate;
        const duration = preset.decay; // seconds
        const length = Math.ceil(sampleRate * duration);
        const irBuffer = this.audioCtx.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = irBuffer.getChannelData(channel);
            
            // Generate exponentially decaying noise
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                
                // Exponential decay envelope
                let envelope = Math.exp(-t / preset.decay);
                
                // High-frequency damping over time
                const dampingFactor = Math.exp(-t * preset.damping);
                
                // Noise with filtering simulation
                const noise = (Math.random() * 2 - 1) * envelope * dampingFactor;
                
                // Stereo width variation between channels
                const stereoOffset = channel === 0 ? 
                    (Math.random() - 0.5) * (preset.width / 100) * 0.3 :
                    (Math.random() - 0.5) * (preset.width / 100) * 0.3;
                
                data[i] = noise + stereoOffset * envelope * 0.2;
            }
        }
        
        this.convolverNode.buffer = irBuffer;
        this.params.irPreset = presetName;
        console.log(`📁 IR Preset loaded: ${presetName}`);
        return true;
    },
    
    async loadCustomIR(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            
            // Apply processing if needed
            if (this.params.size !== 100 || this.params.damping > 0) {
                this.processIR(audioBuffer);
            }
            
            this.convolverNode.buffer = audioBuffer;
            this.params.customIRBuffer = audioBuffer;
            this.params.type = 'convolution';
            return true;
        } catch (error) {
            console.error('❌ Failed to load custom IR:', error);
            return false;
        }
    },
    
    processIR(buffer) {
        // Time-stretch if size != 100%
        // Apply damping filter
        // This would require buffer manipulation
    },
    
    connect(input) {
        input.connect(this.dryGain);      // Dry path
        input.connect(this.preDelayNode);  // Wet path through delay
        this.preDelayNode.connect(this.convolverNode);
        this.convolverNode.connect(this.outputGain);
        
        // Return merger node (would be created externally)
        return { dry: this.dryGain, wet: this.outputGain };
    },
    
    setParam(param, value) {
        switch(param) {
            case 'preDelay':
                this.params.preDelay = value;
                if (this.preDelayNode) this.preDelayNode.delayTime.setTargetAtTime(value / 1000, this.audioCtx?.currentTime || 0, 0.02);
                break;
            case 'dryWet':
                this.params.dryWet = value;
                if (this.outputGain) this.outputGain.gain.setTargetAtTime(value / 100, this.audioCtx?.currentTime || 0, 0.02);
                if (this.dryGain) this.dryGain.gain.setTargetAtTime(1 - value / 100, this.audioCtx?.currentTime || 0, 0.02);
                break;
            default:
                this.params[param] = value;
        }
    }
};

// ===== 2. MULTIBAND COMPRESSOR =====

const MultibandCompressor = {
    enabled: false,
    
    // Crossover frequencies
    crossLow: 200,     // Low/Mid boundary (Hz)
    crossHigh: 4000,   // Mid/High boundary (Hz)
    
    // Per-band compressors
    bands: {
        low: {
            threshold: -20, ratio: 4, attack: 20, release: 100, makeup: 0, enable: true, currentGR: 0
        },
        mid: {
            threshold: -18, ratio: 3, attack: 15, release: 80, makeup: 0, enable: true, currentGR: 0
        },
        high: {
            threshold: -16, ratio: 2.5, attack: 10, release: 60, makeup: 0, enable: true, currentGR: 0
        }
    },
    
    linkMode: false,  // Link gain reduction across bands
    
    nodes: {},
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Create crossover filters (Linkwitz-Riley 4th order approximation using biquads)
        this.crossLP1 = audioCtx.createBiquadFilter(); // Lowpass for low band
        this.crossLP1.type = 'lowpass';
        this.crossLP1.frequency.value = this.crossLow;
        this.crossLP1.Q.value = 0.5;
        
        this.crossLP2 = audioCtx.createBiquadFilter(); // Additional stage for steeper slope
        this.crossLP2.type = 'lowpass';
        this.crossLP2.frequency.value = this.crossLow;
        this.crossLP2.Q.value = 0.5;
        
        this.crossHP1 = audioCtx.createBiquadFilter(); // Highpass for mid/high split
        this.crossHP1.type = 'highpass';
        this.crossHP1.frequency.value = this.crossLow;
        this.crossHP1.Q.value = 0.5;
        
        this.crossBP1 = audioCtx.createBiquadFilter(); // Bandpass for mid band
        this.crossBP1.type = 'bandpass';
        this.crossBP1.frequency.value = this.crossHigh;
        this.crossBP1.Q.value = 0.7;
        
        this.crossHP2 = audioCtx.createBiquadFilter(); // Highpass for high band
        this.crossHP2.type = 'highpass';
        this.crossHP2.frequency.value = this.crossHigh;
        this.crossHP2.Q.value = 0.5;
        
        // Create per-band dynamics processors
        this.compLow = audioCtx.createDynamicsCompressor();
        this.setupBandCompressor(this.compLow, this.bands.low);
        
        this.compMid = audioCtx.createDynamicsCompressor();
        this.setupBandCompressor(this.compMid, this.bands.mid);
        
        this.compHigh = audioCtx.createDynamicsCompressor();
        this.setupBandCompressor(this.compHigh, this.bands.high);
        
        // Makeup gains
        this.makeupLow = audioCtx.createGain();
        this.makeupMid = audioCtx.createGain();
        this.makeupHigh = audioCtx.createGain();
        
        // Output mixer
        this.output = audioCtx.createGain();
        this.output.gain.value = 1;
        
        console.log('🎚️ Multiband Compressor created');
        return this;
    },
    
    setupBandCompressor(compNode, bandParams) {
        compNode.threshold.value = bandParams.threshold;
        compNode.ratio.value = bandParams.ratio;
        compNode.attack.value = bandParams.attack / 1000;
        compNode.release.value = bandParams.release / 1000;
        compNode.knee.value = 6; // Soft knee
    },
    
    connect(input) {
        // Route through crossovers and compressors
        
        // LOW BAND: Input -> LP -> LP -> Comp -> Makeup -> Output
        input.connect(this.crossLP1);
        this.crossLP1.connect(this.crossLP2);
        this.crossLP2.connect(this.compLow);
        this.compLow.connect(this.makeupLow);
        this.makeupLow.connect(this.output);
        
        // MID BAND: Input -> HP -> BP -> Comp -> Makeup -> Output
        input.connect(this.crossHP1);
        this.crossHP1.connect(this.crossBP1);
        this.crossBP1.connect(this.compMid);
        this.compMid.connect(this.makeupMid);
        this.makeupMid.connect(this.output);
        
        // HIGH BAND: Input -> HP -> HP -> Comp -> Makeup -> Output  
        input.connect(this.crossHP2);
        // Need additional HP at crossLow first... simplified routing:
        this.crossHP2.connect(this.compHigh);
        this.compHigh.connect(this.makeupHigh);
        this.makeupHigh.connect(this.output);
        
        return this.output;
    },
    
    setBandParams(band, params) {
        if (!this.bands[band]) return;
        Object.assign(this.bands[band], params);
        
        const comp = this[`comp${band.charAt(0).toUpperCase() + band.slice(1)}`];
        const makeup = this[`makeup${band.charAt(0).toUpperCase() + band.slice(1)}`];
        
        if (comp && params.threshold !== undefined) comp.threshold.setTargetAtTime(params.threshold, this.audioCtx?.currentTime || 0, 0.02);
        if (comp && params.ratio !== undefined) comp.ratio.setTargetAtTime(params.ratio, this.audioCtx?.currentTime || 0, 0.02);
        if (comp && params.attack !== undefined) comp.attack.setTargetAtTime(params.attack / 1000, this.audioCtx?.currentTime || 0, 0.02);
        if (comp && params.release !== undefined) comp.release.setTargetAtTime(params.release / 1000, this.audioCtx?.currentTime || 0, 0.02);
        if (makeup && params.makeup !== undefined) makeup.gain.setTargetAtTime(Math.pow(10, params.makeup / 20), this.audioCtx?.currentTime || 0, 0.02);
    },
    
    setCrossovers(lowFreq, highFreq) {
        this.crossLow = lowFreq;
        this.crossHigh = highFreq;
        
        const t = this.audioCtx?.currentTime || 0;
        if (this.crossLP1) this.crossLP1.frequency.setTargetAtTime(lowFreq, t, 0.02);
        if (this.crossLP2) this.crossLP2.frequency.setTargetAtTime(lowFreq, t, 0.02);
        if (this.crossHP1) this.crossHP1.frequency.setTargetAtTime(lowFreq, t, 0.02);
        if (this.crossBP1) this.crossBP1.frequency.setTargetAtTime(highFreq, t, 0.02);
        if (this.crossHP2) this.crossHP2.frequency.setTargetAtTime(highFreq, t, 0.02);
    },
    
    getGainReduction() {
        return {
            low: this.compLow?.reduction || 0,
            mid: this.compMid?.reduction || 0,
            high: this.compHigh?.reduction || 0
        };
    }
};

// ===== 3. FOUR-BAND PARAMETRIC EQ WITH SPECTRUM OVERLAY =====

const ParametricEQ = {
    bands: [
        { freq: 80, gain: 0, q: 1, type: 'lowshelf', enabled: true },   // Band 1: Sub/Lows
        { freq: 500, gain: 0, q: 1.4, type: 'peaking', enabled: true },  // Band 2: Low Mids
        { freq: 2000, gain: 0, q: 1.4, type: 'peaking', enabled: true }, // Band 3: High Mids
        { freq: 8000, gain: 0, q: 1, type: 'highshelf', enabled: true }  // Band 4: Air
    ],
    
    globalGain: 0, // dB
    analyserForDisplay: null,
    
    nodes: [],
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        this.nodes = [];
        
        // Create 4 biquad filters in series
        for (let i = 0; i < 4; i++) {
            const filter = audioCtx.createBiquadFilter();
            this.applyBandToFilter(filter, this.bands[i]);
            this.nodes.push(filter);
            
            // Connect in series
            if (i > 0) {
                this.nodes[i-1].connect(filter);
            }
        }
        
        // Global trim gain
        this.globalTrim = audioCtx.createGain();
        this.globalTrim.gain.value = Math.pow(10, this.globalGain / 20);
        this.nodes[3].connect(this.globalTrim);
        
        // Analyser for spectrum overlay display
        this.analyserForDisplay = audioCtx.createAnalyser();
        this.analyserForDisplay.fftSize = 2048;
        this.globalTrim.connect(this.analyserForDisplay);
        
        console.log('🎛️ Parametric EQ created (4-band)');
        return this;
    },
    
    applyBandToFilter(filter, band) {
        filter.type = band.type;
        filter.frequency.value = band.freq;
        filter.gain.value = band.gain;
        filter.Q.value = band.q;
    },
    
    connect(input) {
        input.connect(this.nodes[0]);
        return { output: this.globalTrim, analyser: this.analyserForDisplay };
    },
    
    setBand(bandIndex, params) {
        if (bandIndex < 0 || bandIndex >= 4 || !this.bands[bandIndex]) return;
        
        Object.assign(this.bands[bandIndex], params);
        const filter = this.nodes[bandIndex];
        
        if (filter && this.audioCtx) {
            const t = this.audioCtx.currentTime;
            if (params.freq !== undefined) filter.frequency.setTargetAtTime(params.freq, t, 0.02);
            if (params.gain !== undefined) filter.gain.setTargetAtTime(params.gain, t, 0.02);
            if (params.q !== undefined) filter.Q.setTargetAtTime(params.q, t, 0.02);
            if (params.type) filter.type = params.type;
        }
    },
    
    setGlobalGain(dB) {
        this.globalGain = dB;
        if (this.globalTrim) {
            this.globalTrim.gain.setTargetAtTime(Math.pow(10, dB / 20), this.audioCtx?.currentTime || 0, 0.02);
        }
    },
    
    getSpectrumData() {
        if (!this.analyserForDisplay) return new Uint8Array(1024);
        const data = new Uint8Array(this.analyserForDisplay.frequencyBinCount);
        this.analyserForDisplay.getByteFrequencyData(data);
        return data;
    },
    
    getEQCurvePoints(numPoints = 256) {
        // Calculate frequency response curve for visualization
        const points = [];
        const minFreq = 20, maxFreq = 20000;
        
        for (let i = 0; i < numPoints; i++) {
            const freq = minFreq * Math.pow(maxFreq / minFreq, i / numPoints);
            let totalGain = this.globalGain;
            
            // Sum contribution from each band
            this.bands.forEach((band, idx) => {
                if (!band.enabled) return;
                
                const { freq: centerFreq, gain, q, type } = band;
                
                // Simplified magnitude response calculation
                const octaves = Math.log2(freq / centerFreq);
                let response;
                
                switch(type) {
                    case 'peaking':
                        response = gain / (1 + Math.pow(octaves * q * 2, 2));
                        break;
                    case 'lowshelf':
                        response = gain * (freq < centerFreq ? 1 : 1 / (1 + Math.pow(octaves, 2)));
                        break;
                    case 'highshelf':
                        response = gain * (freq > centerFreq ? 1 : 1 / (1 + Math.pow(octaves, 2)));
                        break;
                    default:
                        response = 0;
                }
                
                totalGain += response;
            });
            
            points.push({ freq, gain: totalGain });
        }
        
        return points;
    },
    
    loadPreset(presetName) {
        const presets = {
            'flat': [{gain:0},{gain:0},{gain:0},{gain:0}],
            'vocalPresence': [{gain:2},{gain:-1},{gain:3},{gain:1}],
            'bassBoost': [{gain:6},{gain:2},{gain:0},{gain:-1}],
            'hiFiSmile': [{gain:3},{gain:-1},{gain:-1},{gain:3}],
            'loFiCut': [{gain:-6},{gain:-3},{gain:-2},{gain:-8}],
            'phone': [{gain:-20},{gain:4},{gain:4},{gain:-12}],
            'dubStep': [{gain:8},{gain:-4},{gain:-2},{gain:2}]
        };
        
        if (presets[presetName]) {
            presets[presetName].forEach((p, i) => {
                this.bands[i].gain = p.gain;
                if (this.nodes[i]) this.nodes[i].gain.setTargetAtTime(p.gain, this.audioCtx?.currentTime || 0, 0.02);
            });
            return true;
        }
        return false;
    }
};

// ===== 4. STEREO WIDENER =====

const StereoWidener = {
    enabled: false,
    mode: 'haas', // haas, midside, comb
    
    params: {
        // Haas mode
        haasDelay: 0.02,      // ms (0-50ms)
        haasCrosstalk: 30,    // % inverted leak
        
        // Mid/Side mode
        msMidGain: 0,         // dB (-12 to +12)
        msSideGain: 6,        // dB (-12 to +12)
        msSideEqFreq: 3000,   // Hz focus frequency
        msSideEqBoost: 3,     // dB
        
        // Comb mode
        combDelay: 2,         // ms (0.1-10ms)
        combFeedback: 40,     // % (0-90%)
        combDetune: 10        // cents (pitch shift between channels)
    },
    
    nodes: {},
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Common nodes needed by all modes
        this.inputSplitter = audioCtx.createChannelSplitter(2);
        this.inputMerger = audioCtx.createChannelMerger(2);
        this.outputMerger = audioCtx.createChannelMerger(2);
        
        // Haas mode nodes
        this.haasDelayL = audioCtx.createDelay(0.05);
        this.haasDelayR = audioCtx.createDelay(0.05);
        this.haasCrosstalkL = audioCtx.createGain();
        this.haasCrosstalkR = audioCtx.createGain();
        
        // Mid/Side mode nodes
        this.msMidGain = audioCtx.createGain();
        this.msSideGain = audioCtx.createGain();
        this.msSideEq = audioCtx.createBiquadFilter();
        this.msEncoderL = audioCtx.createGain(); // L+R
        this.msEncoderR = audioCtx.createGain(); // L-R
        
        // Comb mode nodes
        this.combDelayL = audioCtx.createDelay(0.01);
        this.combDelayR = audioCtx.createDelay(0.01);
        this.combFeedbackL = audioCtx.createGain();
        this.combFeedbackR = audioCtx.createGain();
        
        // Output gain
        this.output = audioCtx.createGain();
        this.output.gain.value = 1;
        
        this.updateRouting();
        console.log('🔊 Stereo Widener created');
        return this;
    },
    
    updateRouting() {
        // Disconnect all existing connections
        Object.values(this.nodes).forEach(node => {
            try { node.disconnect(); } catch(e) {}
        });
        
        switch(this.mode.toLowerCase()) {
            case 'haas':
                this.setupHaasRouting();
                break;
            case 'midside':
            case 'm/s':
            case 'mid-side':
                this.setupMSRouting();
                break;
            case 'comb':
                this.setupCombRouting();
                break;
        }
    },
    
    setupHaasRouting() {
        // Left channel: direct + delayed right (inverted crosstalk)
        // Right channel: direct + delayed left (inverted crosstalk)
        
        const ctx = this.audioCtx;
        
        // Set delays
        this.haasDelayL.delayTime.value = 0; // Left is reference (no delay)
        this.haasDelayR.delayTime.value = this.params.haasDelay / 1000;
        
        // Crosstalk amounts (inverted polarity)
        const ct = this.params.haasCrosstalk / 100;
        this.haasCrosstalkL.gain.value = ct;
        this.haasCrosstalkR.gain.value = -ct;
        
        // Routing would go here in full implementation
    },
    
    setupMSRouting() {
        const ctx = this.audioCtx;
        
        // Encode: Mid = (L+R)/2, Side = (L-R)/2
        this.msEncoderL.gain.value = 0.5;
        this.msEncoderR.gain.value = 0.5;
        
        // Process gains
        this.msMidGain.gain.value = Math.pow(10, this.params.msMidGain / 20);
        this.msSideGain.gain.value = Math.pow(10, this.params.msSideGain / 20);
        
        // Side EQ
        this.msSideEq.type = 'peaking';
        this.msSideEq.frequency.value = this.params.msSideEqFreq;
        this.msSideEq.gain.value = this.params.msSideEqBoost;
        this.msSideEq.Q.value = 1;
    },
    
    setupCombRouting() {
        const ctx = this.audioCtx;
        
        this.combDelayL.delayTime.value = this.params.combDelay / 1000;
        this.combDelayR.delayTime.value = (this.params.combDelay / 1000) * 1.001; // Slightly different for detune
        
        this.combFeedbackL.gain.value = this.params.combFeedback / 100;
        this.combFeedbackR.gain.value = this.params.combFeedback / 100;
    },
    
    connect(stereoInput) {
        stereoInput.connect(this.inputSplitter);
        this.outputMerger.connect(this.output);
        return this.output;
    },
    
    setMode(mode) {
        this.mode = mode;
        this.updateRouting();
    },
    
    setParam(param, value) {
        if (param in this.params) {
            this.params[param] = value;
            this.updateRouting(); // Reconfigure with new values
        }
    },
    
    // Check mono compatibility (sum to mono)
    checkMonoCompatibility() {
        // Would analyze phase correlation between L/R
        // Return correlation value from -1 (out of phase) to +1 (mono compatible)
        return 0.9; // Placeholder
    }
};

// ===== 5. GATER / TRANCE GATE =====

const TranceGater = {
    enabled: false,
    
    pattern: Array(16).fill(true), // 16-step pattern (true=gate open, false=closed)
    resolution: '1/16',           // Step resolution
    depth: 70,                     // % attenuation when closed (0=subtle, 100=mute)
    attack: 5,                     // ms fade in
    release: 5,                    // ms fade out
    stereoAlternate: false,        // Ping-pong left/right
    velocity: 100,                 // Probability (some steps randomly skipped)
    
    // Pattern presets
    presets: {
        'fourOnFloor': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        'halfTime': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        'doubleTime': [true, true, false, false, true, true, false, false, true, true, false, false, true, true, false, false],
        'random': Array(16).fill(false).map(() => Math.random() > 0.4),
        'reverse': Array(16).fill(true).map((_, i, arr) => arr[arr.length - 1 - i])
    },
    
    nodes: {},
    currentStep: 0,
    schedulerInterval: null,
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Main gain node that does the gating
        this.gateGain = audioCtx.createGain();
        this.gateGain.gain.value = 1;
        
        // Stereo splitter/merger for ping-pong mode
        this.splitter = audioCtx.createChannelSplitter(2);
        this.merger = audioCtx.createChannelMerger(2);
        
        // Individual channel gains for stereo alternate
        this.leftGain = audioCtx.createGain();
        this.rightGain = audioCtx.createGain();
        this.leftGain.gain.value = 1;
        this.rightGain.gain.value = 1;
        
        console.log('🎵 Trance Gater created');
        return this;
    },
    
    connect(input) {
        if (this.stereoAlternate) {
            input.connect(this.splitter);
            this.splitter.connect(this.leftGain, 0);
            this.splitter.connect(this.rightGain, 1);
            this.leftGain.connect(this.merger, 0, 0);
            this.rightGain.connect(this.merger, 0, 1);
            this.merger.connect(this.gateGain);
        } else {
            input.connect(this.gateGain);
        }
        
        return this.gateGain;
    },
    
    start(tempo = 120) {
        if (this.schedulerInterval) clearInterval(this.schedulerInterval);
        
        const stepDurationMs = this.getStepDurationMs(tempo);
        this.currentStep = 0;
        
        this.schedulerInterval = setInterval(() => {
            this.advanceStep();
        }, stepDurationMs);
        
        console.log(`⏱️ Gater started (${this.resolution} @ ${tempo} BPM)`);
    },
    
    stop() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.gateGain.gain.setTargetAtTime(1, this.audioCtx?.currentTime || 0, 0.01);
    },
    
    advanceStep() {
        const step = this.currentStep;
        const shouldOpen = this.pattern[step] && (Math.random() * 100 < this.velocity);
        const targetGain = shouldOpen ? 1 : (1 - this.depth / 100);
        const now = this.audioCtx?.currentTime || 0;
        
        if (shouldOpen) {
            // Attack (fade in)
            this.gateGain.gain.cancelScheduledValues(now);
            this.gateGain.gain.setValueAtTime(this.gateGain.gain.value, now);
            this.gateGain.gain.linearRampToValueAtTime(targetGain, now + this.attack / 1000);
        } else {
            // Release (fade out)
            this.gateGain.gain.cancelScheduledValues(now);
            this.gateGain.gain.setValueAtTime(this.gateGain.gain.value, now);
            this.gateGain.gain.linearRampToValueAtTime(targetGain, now + this.release / 1000);
        }
        
        // Stereo alternate: flip channels on each step
        if (this.stereoAlternate) {
            const lVal = step % 2 === 0 ? targetGain : (1 - this.depth / 100);
            const rVal = step % 2 === 0 ? (1 - this.depth / 100) : targetGain;
            this.leftGain.gain.setTargetAtTime(lVal, now, this.attack / 1000);
            this.rightGain.gain.setTargetAtTime(rVal, now, this.attack / 1000);
        }
        
        this.currentStep = (this.currentStep + 1) % this.pattern.length;
    },
    
    getStepDurationMs(tempo) {
        const beatDuration = 60000 / tempo; // ms per beat (quarter note)
        const divisors = { '1/16': 4, '1/8': 2, '1/4': 1, '1/2': 0.5 };
        const divisor = divisors[this.resolution] || 4;
        return beatDuration / divisor;
    },
    
    setPattern(newPattern) {
        this.pattern = newPattern;
    },
    
    loadPreset(presetName) {
        if (this.presets[presetName]) {
            this.pattern = [...this.presets[presetName]];
            return true;
        }
        return false;
    },
    
    toggleStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.pattern.length) {
            this.pattern[stepIndex] = !this.pattern[stepIndex];
        }
    }
};

// ===== 6. EXPANDED DISTORTION TYPES =====

const DistortionEngine = {
    currentType: 'softclip',
    
    types: {
        softclip: { name: 'Soft Clip', driveRange: [1, 10] },
        hardclip: { name: 'Hard Clip', driveRange: [1, 20] },
        arctan: { name: 'Arc-Tangent', driveRange: [1, 10] },
        tanh: { name: 'Hyperbolic Tan', driveRange: [1, 10] },
        cubic: { name: 'Cubic', driveRange: [1, 5] },
        sinusoidal: { name: 'Sinusoidal', driveRange: [1, 10] },
        exponential: { name: 'Exponential', driveRange: [1, 8] },
        logistic: { name: 'Logistic (Sigmoid)', driveRange: [1, 8] },
        arcsine: { name: 'Arc-Sine', driveRange: [1, 5] },
        quadratic: { name: 'Quadratic', driveRange: [1, 6] },
        cuberoot: { name: 'Cube Root', driveRange: [1, 4] },
        erf: { name: 'Error Function', driveRange: [1, 8] },
        crush: { name: 'Bit Crush', driveRange: [1, 20] },
        fold: { name: 'Wave Fold', driveRange: [1, 10] },
        squeeze: { name: 'Squeeze', driveRange: [1, 8] },
        custom: { name: 'Custom', driveRange: [1, 10] }
    },
    
    // Type-specific parameters
    typeParams: {
        tube: { drive: 2, warmth: 50, bias: 0 },
        tape: { drive: 3, compression: 30, flutter: 5, wow: 2, age: 10 },
        bitcrush: { bitDepth: 8, rateReduction: 0.5, aliasing: true },
        fuzz: { gain: 150, tone: 5000, gate: 10, rectify: false },
        ringmod: { freq: 100, sync: 'free', waveform: 'sine', mix: 50 }
    },
    
    node: null,
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        this.node = audioCtx.createWaveShaper();
        this.updateCurve();
        console.log(`🔥 Distortion Engine created (${this.currentType})`);
        return this;
    },
    
    generateCurve(type, drive, samples = 2048) {
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            // Map index to -drive..+drive range
            let x = (i / (samples / 2)) * 2 - 1;
            const driven = x * drive;
            
            let y;
            
            switch(type.toLowerCase()) {
                case 'softclip':
                    y = Math.tanh(driven) / Math.tanh(drive > 0 ? drive : 1);
                    break;
                    
                case 'hardclip':
                    y = Math.max(-1, Math.min(1, driven)) / drive;
                    break;
                    
                case 'arctan':
                    y = (2 / Math.PI) * Math.atan(driven * Math.PI / 2);
                    break;
                    
                case 'tanh':
                    y = Math.tanh(driven) / Math.tanh(Math.max(0.01, drive));
                    break;
                    
                case 'cubic':
                    y = driven - (driven * driven * driven) / 3;
                    y /= drive; // Normalize
                    break;
                    
                case 'sinusoidal':
                    y = Math.sin(driven * Math.PI / 2);
                    break;
                    
                case 'exponential':
                    y = Math.sign(driven) * (Math.exp(Math.abs(driven)) - 1) / (Math.exp(drive) - 1);
                    break;
                    
                case 'logistic':
                    y = 2 / (1 + Math.exp(-2 * driven)) - 1;
                    break;
                    
                case 'arcsine':
                    y = Math.sin(Math.max(-1, Math.min(1, driven)) * Math.PI / 2);
                    break;
                    
                case 'quadratic':
                    y = driven * Math.abs(driven) / (drive * drive);
                    break;
                    
                case 'cuberoot':
                    y = Math.sign(driven) * Math.pow(Math.abs(driven), 1/3) / Math.pow(drive, 1/3);
                    break;
                    
                case 'erf':
                    // Approximation of error function
                    const t = 1 / (1 + 0.3275911 * Math.abs(driven));
                    y = Math.sign(driven) * (1 - (((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t));
                    break;
                    
                case 'crush':
                    // Bit crushing quantization
                    const levels = Math.round(drive); // Drive controls bit depth effect
                    const steps = Math.max(2, Math.round(Math.pow(2, 12 - drive/2)));
                    y = Math.floor((driven + 1) * steps / 2) / (steps/2) - 1;
                    y /= drive;
                    break;
                    
                case 'fold':
                    // Wavefolding
                    if (Math.abs(driven) < 1) {
                        y = driven / drive;
                    } else {
                        const excess = Math.abs(driven) - 1;
                        y = (Math.sign(driven) * (1 - (excess % 2))) / drive;
                        if ((excess % 2) > 1) y = -y;
                    }
                    break;
                    
                case 'squeeze':
                    y = Math.tanh(driven * driven * driven) / Math.tanh(drive * drive * drive);
                    break;
                    
                default:
                    y = Math.tanh(driven) / Math.tanh(Math.max(0.01, drive));
            }
            
            // Clamp to prevent NaN/Infinity propagation
            curve[i] = isNaN(y) || !isFinite(y) ? 0 : Math.max(-1, Math.min(1, y));
        }
        
        return curve;
    },
    
    updateCurve() {
        if (this.node) {
            const drive = this.typeParams[this.currentType]?.drive || 2;
            this.node.curve = this.generateCurve(this.currentType, drive);
            this.node.oversample = '4x'; // Anti-aliasing
        }
    },
    
    setType(type) {
        if (this.types[type]) {
            this.currentType = type;
            this.updateCurve();
        }
    },
    
    setDrive(drive) {
        if (this.currentType in this.typeParams) {
            this.typeParams[this.currentType].drive = drive;
        }
        this.updateCurve();
    },
    
    setInputGain(gainNode, amount) {
        // Pre-distortion drive
        if (gainNode) {
            gainNode.gain.value = amount;
        }
    },
    
    connect(input) {
        input.connect(this.node);
        return this.node;
    },
    
    // Specialized distortion methods for complex types
    
    processTube(inputSample, params) {
        // Asymmetric tube saturation
        const { drive, warmth, bias } = params;
        const biased = inputSample + bias;
        const saturated = Math.tanh(biased * drive);
        // Add even harmonics via asymmetry
        const warmthColor = saturated * (1 - Math.abs(saturated)) * warmth / 100;
        return saturated + warmthColor * 0.2;
    },
    
    processTape(inputSample, params, time) {
        const { drive, compression, flutter, wow, age } = params;
        
        // Saturation
        let sample = Math.tanh(inputSample * drive);
        
        // Compression (dynamic range reduction)
        sample *= (1 - compression / 200);
        
        // Flutter (fast pitch modulation ~6-50Hz)
        const flutterMod = Math.sin(time * 200 * flutter / 100) * flutter / 1000;
        sample *= (1 + flutterMod);
        
        // Wow (slow drift ~0.5-6Hz)
        const wowMod = Math.sin(time * 5 * wow / 100) * wow / 500;
        sample *= (1 + wowMod);
        
        // Age (high-frequency loss)
        // Would need multi-sample processing for actual filtering
        
        return sample;
    },
    
    processBitcrush(inputSample, params) {
        const { bitDepth, rateReduction, aliasing } = params;
        
        // Reduce bit depth (quantization)
        const maxVal = Math.pow(2, bitDepth - 1);
        let crushed = Math.round(inputSample * maxVal) / maxVal;
        
        // Sample rate reduction (sample & hold)
        if (rateReduction < 1) {
            // Would need stateful processing
        }
        
        return crushed;
    },
    
    processFuzz(inputSample, params) {
        const { gain, tone, gate, rectify } = params;
        
        let sample = inputSample * (gain / 100);
        
        // Optional rectification (octave up effect)
        if (rectify) {
            sample = Math.abs(sample);
        }
        
        // Hard clip
        sample = Math.max(-1, Math.min(1, sample));
        
        // Tone control (simple lowpass emulation)
        // Would need filter implementation
        
        // Noise gate
        if (Math.abs(sample) < gate / 1000) {
            sample = 0;
        }
        
        return sample;
    },
    
    processRingMod(carrierSample, modulatorValue, params) {
        const { mix } = params;
        const modulated = carrierSample * modulatorValue;
        return carrierSample * (1 - mix / 100) + modulated * (mix / 100);
    }
};

// ===== INITIALIZATION =====

function initExpandedEffects() {
    window.PROSynth.ExpandedEffects.reverb = ConvolutionReverb;
    window.PROSynth.ExpandedEffects.multibandComp = MultibandCompressor;
    window.PROSynth.ExpandedEffects.eq = ParametricEQ;
    window.PROSynth.ExpandedEffects.stereoWidener = StereoWidener;
    window.PROSynth.ExpandedEffects.gater = TranceGater;
    window.PROSynth.ExpandedEffects.distortion = DistortionEngine;
    window.PROSynth.ExpandedEffects.initialized = true;
    
    console.log('✨ Expanded Effects initialized (Convolution Reverb, MB Comp, EQ, Stereo, Gater, Distortion)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExpandedEffects);
} else {
    initExpandedEffects();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConvolutionReverb, MultibandCompressor, ParametricEQ,
        StereoWidener, TranceGater, DistortionEngine
    };
}
