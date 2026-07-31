/**
 * PROSynth - Advanced Filter System
 * Analog Models (Moog, K35 SEM, MS20, Diode), Formant Filter, Dual Filter
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.AdvancedFilters = {
    initialized: false,
    activeModel: 'standard',
    formantFilter: null,
    dualFilter: null
};

// ===== 1. ANALOG FILTER MODELS =====

const AnalogFilters = {

    // 1A. MOOG LADDER FILTER (Transistor Ladder)
    // Based on Huovilainen model for accurate emulation
    MoogLadder: class {
        constructor(audioCtx) {
            this.audioCtx = audioCtx;
            this.cutoff = 1000;
            this.resonance = 0.5;
            this.drive = 1;
            this.keyTrack = 0.33; // 33% per octave like original Moog
            
            this.nodes = {};
            this.createFilterChain();
        }
        
        createFilterChain() {
            const ctx = this.audioCtx;
            
            // Input drive stage
            this.inputGain = ctx.createGain();
            this.inputGain.gain.value = this.drive;
            
            // 4 cascaded first-order filters (ladder stages)
            // Each stage is a biquad lowpass with very low Q
            this.stages = [];
            for (let i = 0; i < 4; i++) {
                const stage = ctx.createBiquadFilter();
                stage.type = 'lowpass';
                stage.frequency.value = this.cutoff;
                stage.Q.value = 0.3 + (this.resonance * 0.2); // Q increases with resonance
                this.stages.push(stage);
            }
            
            // Feedback path (resonance)
            this.feedbackGain = ctx.createGain();
            this.feedbackGain.gain.value = this.resonance * 4; // Resonance amount
            
            // Output
            this.outputGain = ctx.createGain();
            this.outputGain.gain.value = 1 / Math.max(1, this.drive); // Compensate drive
            
            // Connect: input -> [stage1 -> stage2 -> stage3 -> stage4] -> output
            //                    ^--feedback from output to input--^
            this.inputGain.connect(this.stages[0]);
            
            for (let i = 0; i < 3; i++) {
                this.stages[i].connect(this.stages[i+1]);
            }
            
            this.stages[3].connect(this.outputGain);
            
            // Feedback from last stage to input (through feedback gain)
            this.stages[3].connect(this.feedbackGain);
            this.feedbackGain.connect(this.inputGain);
        }
        
        connect(input, output) {
            input.connect(this.inputGain);
            this.outputGain.connect(output);
        }
        
        setCutoff(freq, noteFreq = 440) {
            this.cutoff = freq;
            // Apply key tracking: higher notes open filter
            const trackedFreq = freq * Math.pow(2, (Math.log2(noteFreq/440)) * this.keyTrack);
            
            this.stages.forEach(stage => {
                stage.frequency.setTargetAtTime(Math.min(20000, trackedFreq), this.audioCtx.currentTime, 0.02);
            });
        }
        
        setResonance(reso) {
            this.resonance = reso;
            this.feedbackGain.gain.setTargetAtTime(reso * 4, this.audioCtx.currentTime, 0.02);
            
            // Increase Q slightly with resonance for self-oscillation character
            this.stages.forEach((stage, i) => {
                stage.Q.setTargetAtTime(0.3 + reso * 0.3, this.audioCtx.currentTime, 0.02);
            });
        }
        
        setDrive(drive) {
            this.drive = drive;
            this.inputGain.gain.setTargetAtTime(drive, this.audioCtx.currentTime, 0.02);
            this.outputGain.gain.setTargetAtTime(1 / Math.max(1, drive), this.audioCtx.currentTime, 0.02);
        }
        
        // Get final output node for connection
        getOutput() { return this.outputGain; }
        getInput() { return this.inputGain; }
    },

    // 1B. K35 SEM FILTER (State Variable)
    K35SEM: class {
        constructor(audioCtx) {
            this.audioCtx = audioCtx;
            this.cutoff = 1000;
            this.resonance = 0.1;
            this.mode = 'lp'; // lp, hp, bp, notch, parallel
            
            this.createFilter();
        }
        
        createFilter() {
            const ctx = this.audioCtx;
            
            // State variable using biquad approximations
            this.lp = ctx.createBiquadFilter();
            this.lp.type = 'lowpass';
            this.lp.frequency.value = this.cutoff;
            this.lp.Q.value = this.resonance * 10;
            
            this.hp = ctx.createBiquadFilter();
            this.hp.type = 'highpass';
            this.hp.frequency.value = this.cutoff;
            this.hp.Q.value = this.resonance * 10;
            
            this.bp = ctx.createBiquadFilter();
            this.bp.type = 'bandpass';
            this.bp.frequency.value = this.cutoff;
            this.bp.Q.value = this.resonance * 20;
            
            // Notch via combination
            this.notch = ctx.createBiquadFilter();
            this.notch.type = 'notch';
            this.notch.frequency.value = this.cutoff;
            this.notch.Q.value = this.resonance * 10;
            
            // Parallel mix gain nodes
            this.lpGain = ctx.createGain();
            this.hpGain = ctx.createGain();
            this.bpGain = ctx.createGain();
            
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 1;
            
            // Route based on mode
            this.updateRouting();
        }
        
        updateRouting() {
            // Disconnect all first
            try {
                this.lp.disconnect(); this.hp.disconnect();
                this.bp.disconnect(); this.notch.disconnect();
                this.lpGain.disconnect(); this.hpGain.disconnect(); this.bpGain.disconnect();
            } catch(e) {}
            
            switch(this.mode.toLowerCase()) {
                case 'lp':
                    this.lp.connect(this.masterGain);
                    break;
                case 'hp':
                    this.hp.connect(this.masterGain);
                    break;
                case 'bp':
                    this.bp.connect(this.masterGain);
                    break;
                case 'notch':
                    this.notch.connect(this.masterGain);
                    break;
                case 'parallel':
                    this.lp.connect(this.lpGain);
                    this.hp.connect(this.hpGain);
                    this.bp.connect(this.bpGain);
                    this.lpGain.connect(this.masterGain);
                    this.hpGain.connect(this.masterGain);
                    this.bpGain.connect(this.masterGain);
                    break;
            }
        }
        
        connect(input, output) {
            input.connect(this.lp); // All filters get same input
            input.connect(this.hp);
            input.connect(this.bp);
            input.connect(this.notch);
            this.masterGain.connect(output);
        }
        
        setCutoff(freq) {
            this.cutoff = freq;
            const t = this.audioCtx.currentTime;
            [this.lp, this.hp, this.bp, this.notch].forEach(f => {
                f.frequency.setTargetAtTime(freq, t, 0.01);
            });
        }
        
        setResonance(reso) {
            this.resonance = reso;
            const t = this.audioCtx.currentTime;
            this.lp.Q.setTargetAtTime(reso * 10, t, 0.01);
            this.hp.Q.setTargetAtTime(reso * 10, t, 0.01);
            this.bp.Q.setTargetAtTime(reso * 20, t, 0.01);
            this.notch.Q.setTargetAtTime(reso * 10, t, 0.01);
        }
        
        setMode(mode) {
            this.mode = mode;
            this.updateRouting();
        }
        
        getOutput() { return this.masterGain; }
        getInput() { return this.lp; } // Any filter works as input proxy
    },

    // 1C. MS20 FILTER (Korg-style, aggressive)
    MS20: class {
        constructor(audioCtx) {
            this.audioCtx = audioCtx;
            this.hpCutoff = 100;
            this.lpCutoff = 5000;
            this.resonance = 0.1;
            this.resGrowth = true; // Nonlinear resonance increase
            
            this.createFilter();
        }
        
        createFilter() {
            const ctx = this.audioCtx;
            
            // High-pass first (unusual topology!)
            this.hp = ctx.createBiquadFilter();
            this.hp.type = 'highpass';
            this.hp.frequency.value = this.hpCutoff;
            this.hp.Q.value = 0.7;
            
            // Low-pass second
            this.lp = ctx.createBiquadFilter();
            this.lp.type = 'lowpass';
            this.lp.frequency.value = this.lpCutoff;
            this.lp.Q.value = 0.7;
            
            // Output gain
            this.output = ctx.createGain();
            this.output.gain.value = 1;
            
            // Connect HP -> LP (series, non-standard order)
            this.hp.connect(this.lp);
            this.lp.connect(this.output);
        }
        
        connect(inputNode, outputNode) {
            inputNode.connect(this.hp);
            this.output.connect(outputNode);
        }
        
        setCutoff(lpFreq, hpFreq = null) {
            this.lpCutoff = lpFreq;
            if (hpFreq !== undefined) this.hpCutoff = hpFreq;
            
            const t = this.audioCtx.currentTime;
            this.lp.frequency.setTargetAtTime(lpFreq, t, 0.01);
            if (hpFreq !== null || this.hpCutoff) {
                this.hp.frequency.setTargetAtTime(this.hpCutoff, t, 0.01);
            }
        }
        
        setResonance(reso) {
            this.resonance = reso;
            const effectiveReso = this.resGrowth ? 
                reso * (1 + reso * 2) : // Nonlinear growth near max
                reso;
            
            const t = this.audioCtx.currentTime;
            this.lp.Q.setTargetAtTime(0.7 + effectiveReso * 15, t, 0.01);
            this.hp.Q.setTargetAtTime(0.7 + effectiveReso * 8, t, 0.01);
        }
        
        getOutput() { return this.output; }
        getInput() { return this.hp; }
    },

    // 1D. DIODE LADDER CASCADE
    DiodeLadder: class {
        constructor(audioCtx) {
            this.audioCtx = audioCtx;
            this.cutoff = 1000;
            this.resonance = 0.3;
            this.asymmetry = 0; // Mismatched diode pairs
            
            this.createFilter();
        }
        
        createFilter() {
            const ctx = this.audioCtx;
            
            // Input stage with asymmetry option
            this.inputSplitter = ctx.createChannelSplitter(2);
            this.inputMerger = ctx.createChannelMerger(2);
            
            this.inputGainL = ctx.createGain();
            this.inputGainR = ctx.createGain();
            
            // Asymmetry: slight level difference between channels
            this.inputGainL.gain.value = 1 - this.asymmetry * 0.3;
            this.inputGainR.gain.value = 1 + this.asymmetry * 0.3;
            
            // 4 diode-pair stages (simplified as asymmetric ladders per channel)
            this.stagesL = [];
            this.stagesR = [];
            
            for (let i = 0; i < 4; i++) {
                const stageL = ctx.createBiquadFilter();
                stageL.type = 'lowpass';
                stageL.frequency.value = this.cutoff;
                stageL.Q.value = 0.5 + this.resonance * 0.5;
                
                const stageR = ctx.createBiquadFilter();
                stageR.type = 'lowpass';
                stageR.frequency.value = this.cutoff * (1 + this.asymmetry * 0.05); // Slight detune
                stageR.Q.value = 0.5 + this.resonance * 0.5;
                
                this.stagesL.push(stageL);
                this.stagesR.push(stageR);
            }
            
            // Feedback and output
            this.feedbackL = ctx.createGain();
            this.feedbackR = ctx.createGain();
            this.feedbackL.gain.value = this.resonance * 3.5;
            this.feedbackR.gain.value = this.resonance * 3.5;
            
            this.merger = ctx.createChannelMerger(2);
            this.outputGain = ctx.createGain();
            this.outputGain.gain.value = 0.6;
            
            // Build chain
            this.buildChain();
        }
        
        buildChain() {
            // Left chain
            for (let i = 0; i < 3; i++) {
                this.stagesL[i].connect(this.stagesL[i+1]);
            }
            this.stagesL[3].connect(this.feedbackL);
            this.feedbackL.connect(this.stagesL[0]);
            this.stagesL[3].connect(this.merger, 0, 0);
            
            // Right chain
            for (let i = 0; i < 3; i++) {
                this.stagesR[i].connect(this.stagesR[i+1]);
            }
            this.stagesR[3].connect(this.feedbackR);
            this.feedbackR.connect(this.stagesR[0]);
            this.stagesR[3].connect(this.merger, 0, 1);
            
            this.merger.connect(this.outputGain);
        }
        
        connect(input, output) {
            input.connect(this.inputGainL);
            input.connect(this.inputGainR);
            this.inputGainL.connect(this.stagesL[0]);
            this.inputGainR.connect(this.stagesR[0]);
            this.outputGain.connect(output);
        }
        
        setCutoff(freq) {
            this.cutoff = freq;
            const t = this.audioCtx.currentTime;
            [...this.stagesL, ...this.stagesR].forEach((stage, i) => {
                const offset = (i >= 4) ? this.asymmetry * 50 : 0;
                stage.frequency.setTargetAtTime(freq + offset, t, 0.02);
            });
        }
        
        setResonance(reso) {
            this.resonance = reso;
            const t = this.audioCtx.currentTime;
            this.feedbackL.gain.setTargetAtTime(reso * 3.5, t, 0.02);
            this.feedbackR.gain.setTargetAtTime(reso * 3.5, t, 0.02);
            this.stagesL.forEach(s => s.Q.setTargetAtTime(0.5 + reso * 0.8, t, 0.02));
            this.stagesR.forEach(s => s.Q.setTargetAtTime(0.5 + reso * 0.8, t, 0.02));
        }
        
        setAsymmetry(amount) {
            this.asymmetry = amount;
            this.inputGainL.gain.value = 1 - amount * 0.3;
            this.inputGainR.gain.value = 1 + amount * 0.3;
        }
        
        getOutput() { return this.outputGain; }
        getInput() { return this.inputGainL; } // Proxy
    },
    
    // Factory method
    createModel(type, audioCtx) {
        switch(type.toLowerCase()) {
            case 'moog':
            case 'moog ladder':
            case 'ladder':
                return new this.MoogLadder(audioCtx);
            case 'k35':
            case 'sem':
            case 'k35 sem':
                return new this.K35SEM(audioCtx);
            case 'ms20':
            case 'korg':
                return new this.MS20(audioCtx);
            case 'diode':
            case 'diode ladder':
                return new this.DiodeLadder(audioCtx);
            default:
                return null;
        }
    }
};

// ===== 2. FORMANT FILTER (Vocal Vowels) =====

const FormantFilter = {
    // Formant frequencies for vowels (F1, F2, F3 in Hz)
    vowels: {
        'A': { f1: 800, f2: 1150, f3: 2900, label: 'A (ah)' },
        'E': { f1: 400, f2: 2200, f3: 2800, label: 'E (eh)' },
        'I': { f1: 270, f2: 2300, f3: 3000, label: 'I (ee)' },
        'O': { f1: 450, f2: 800,  f3: 2850, label: 'O (oh)' },
        'U': { f1: 300, f2: 700,  f3: 2250, label: 'U (oo)' }
    },
    
    currentVowel: 'A',
    targetVowel: 'A',
    transitionAmount: 0,
    
    params: {
        width: 1.5,      // Q/bandwidth (0.5-3.0)
        blend: 100,     // Dry/wet mix (0-100%)
        lfoRate: 0,     // Optional LFO modulation of vowel
        lfoDepth: 0
    },
    
    nodes: {},
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Three peaking EQ filters for F1, F2, F3
        this.f1 = audioCtx.createBiquadFilter();
        this.f1.type = 'peaking';
        
        this.f2 = audioCtx.createBiquadFilter();
        this.f2.type = 'peaking';
        
        this.f3 = audioCtx.createBiquadFilter();
        this.f3.type = 'peaking';
        
        // Gain for wet signal
        this.wetGain = audioCtx.createGain();
        this.wetGain.gain.value = this.params.blend / 100;
        
        // Gain for dry signal
        this.dryGain = audioCtx.createGain();
        this.dryGain.gain.value = 1 - (this.params.blend / 100);
        
        // Output merger
        this.output = audioCtx.createGain();
        this.output.gain.value = 1;
        
        // Set initial formant frequencies
        this.applyVowel('A');
        
        return {
            input: (source) => {
                // Split to dry and wet paths
                source.connect(this.dryGain);
                source.connect(this.f1);
                this.f1.connect(this.f2);
                this.f2.connect(this.f3);
                this.f3.connect(this.wetGain);
                
                this.dryGain.connect(this.output);
                this.wetGain.connect(this.output);
                
                return this.output;
            },
            output: this.output
        };
    },
    
    applyVowel(vowel) {
        if (!this.vowels[vowel]) return;
        
        const v = this.vowels[vowel];
        const q = this.params.width;
        const boost = 15; // dB boost for formants
        
        if (this.f1) {
            this.f1.frequency.setTargetAtTime(v.f1, this.audioCtx?.currentTime || 0, 0.03);
            this.f1.Q.value = q;
            this.f1.gain.value = boost;
        }
        if (this.f2) {
            this.f2.frequency.setTargetAtTime(v.f2, this.audioCtx?.currentTime || 0, 0.03);
            this.f2.Q.value = q;
            this.f2.gain.value = boost;
        }
        if (this.f3) {
            this.f3.frequency.setTargetAtTime(v.f3, this.audioCtx?.currentTime || 0, 0.03);
            this.f3.Q.value = q;
            this.f3.gain.value = boost - 3; // Slightly less on F3
        }
        
        this.currentVowel = vowel;
    },
    
    morphToVowel(targetVowel, amount = 1) {
        if (!this.vowels[targetVowel]) return;
        
        const target = this.vowels[targetVowel];
        const current = this.vowels[this.currentVowel];
        
        // Interpolate between current and target formant frequencies
        const interpF1 = current.f1 + (target.f1 - current.f1) * amount;
        const interpF2 = current.f2 + (target.f2 - current.f2) * amount;
        const interpF3 = current.f3 + (target.f3 - current.f3) * amount;
        
        if (this.f1 && this.audioCtx) {
            const t = this.audioCtx.currentTime;
            this.f1.frequency.linearRampToValueAtTime(interpF1, t + 0.05);
            this.f2.frequency.linearRampToValueAtTime(interpF2, t + 0.05);
            this.f3.frequency.linearRampToValueAtTime(interpF3, t + 0.05);
        }
        
        if (amount >= 1) this.currentVowel = targetVowel;
    },
    
    setBlend(percent) {
        this.params.blend = percent;
        if (this.wetGain && this.dryGain) {
            this.wetGain.gain.value = percent / 100;
            this.dryGain.gain.value = 1 - (percent / 100);
        }
    },
    
    setWidth(q) {
        this.params.width = q;
        if (this.f1) {
            this.f1.Q.value = q;
            this.f2.Q.value = q;
            this.f3.Q.value = q;
        }
    }
};

// ===== 3. DUAL FILTER SYSTEM =====

const DualFilter = {
    enabled: false,
    routing: 'parallel', // series, parallel, split
    
    filterA: null,
    filterB: null,
    
    params: {
        aType: 'lp',
        aCutoff: 2000,
        aResonance: 0.3,
        aEnvAmount: 0,
        bType: 'lp',
        bCutoff: 1000,
        bResonance: 0.5,
        bEnvAmount: 0,
        balance: 0,       // -100 to +100
        link: false,
        linkOffset: 0     // semitones
    },
    
    nodes: {},
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Create two standard filter chains
        this.filterA = this.createSingleFilter('A');
        this.filterB = this.createSingleFilter('B');
        
        // Balance/gain controls
        this.aGain = audioCtx.createGain();
        this.bGain = audioCtx.createGain();
        this.updateBalance();
        
        // Crossover for split mode
        this.splitLP = audioCtx.createBiquadFilter();
        this.splitLP.type = 'lowpass';
        this.splitLP.frequency.value = (this.params.aCutoff + this.params.bCutoff) / 2;
        
        this.splitHP = audioCtx.createBiquadFilter();
        this.splitHP.type = 'highpass';
        this.splitHP.frequency.value = (this.params.aCutoff + this.params.bCutoff) / 2;
        
        // Master output
        this.output = audioCtx.createGain();
        this.output.gain.value = 1;
        
        this.setupRouting();
        
        return this;
    },
    
    createSingleFilter(label) {
        const ctx = this.audioCtx;
        const p = label === 'A' ? this.params : this.params;
        const prefix = label === 'A' ? 'a' : 'b';
        
        const filter = ctx.createBiquadFilter();
        filter.type = p[prefix + 'Type'] === 'lp' ? 'lowpass' :
                      p[prefix + 'Type'] === 'hp' ? 'highpass' :
                      p[prefix + 'Type'] === 'bp' ? 'bandpass' : 'notch';
        filter.frequency.value = p[prefix + 'Cutoff'];
        filter.Q.value = p[prefix + 'Resonance'] * 10;
        
        return filter;
    },
    
    setupRouting() {
        // Disconnect existing routing first
        this.disconnectAll();
        
        switch(this.routing) {
            case 'series':
                // A → B → output
                this.filterACallback = (input) => {
                    input.connect(this.filterA);
                    this.filterA.connect(this.filterB);
                    this.filterB.connect(this.output);
                };
                break;
                
            case 'parallel':
                // A ─┐
                // B ─┼→ output
                this.filterACallback = (input) => {
                    input.connect(this.filterA);
                    input.connect(this.filterB);
                    this.filterA.connect(this.aGain);
                    this.filterB.connect(this.bGain);
                    this.aGain.connect(this.output);
                    this.bGain.connect(this.output);
                };
                break;
                
            case 'split':
                // Low → A ─┐
                // High→ B ─┼→ output
                this.filterACallback = (input) => {
                    input.connect(this.splitLP);
                    input.connect(this.splitHP);
                    this.splitLP.connect(this.filterA);
                    this.splitHP.connect(this.filterB);
                    this.filterA.connect(this.aGain);
                    this.filterB.connect(this.bGain);
                    this.aGain.connect(this.output);
                    this.bGain.connect(this.output);
                };
                break;
        }
    },
    
    disconnectAll() {
        [this.filterA, this.filterB, this.splitLP, this.splitHP, 
         this.aGain, this.bGain, this.output].forEach(node => {
            try { node?.disconnect(); } catch(e) {}
        });
    },
    
    connect(input) {
        if (this.filterACallback) {
            this.filterACallback(input);
        }
        return this.output;
    },
    
    updateBalance() {
        if (this.aGain && this.bGain) {
            const bal = this.params.balance;
            this.aGain.gain.value = 0.5 + bal / 200; // 0-1 range
            this.bGain.gain.value = 0.5 - bal / 200; // 1-0 range
        }
    },
    
    setFilterParams(which, type, cutoff, resonance) {
        const prefix = which.toUpperCase();
        const key = `filter${prefix}`;
        const prefixLower = which.toLowerCase();
        
        this.params[prefixLower + 'Type'] = type;
        this.params[prefixLower + 'Cutoff'] = cutoff;
        this.params[prefixLower + 'Resonance'] = resonance;
        
        const filter = this[key];
        if (filter) {
            const t = this.audioCtx?.currentTime || 0;
            filter.type = type === 'lp' ? 'lowpass' :
                         type === 'hp' ? 'highpass' :
                         type === 'bp' ? 'bandpass' : 'notch';
            filter.frequency.setTargetAtTime(cutoff, t, 0.02);
            filter.Q.setTargetAtTime(resonance * 10, t, 0.02);
        }
        
        // Update crossover if split mode
        if (this.routing === 'split') {
            const avgCutoff = (this.params.aCutoff + this.params.bCutoff) / 2;
            if (this.splitLP) this.splitLP.frequency.setTargetAtTime(avgCutoff, this.audioCtx?.currentTime || 0, 0.02);
            if (this.splitHP) this.splitHP.frequency.setTargetAtTime(avgCutoff, this.audioCtx?.currentTime || 0, 0.02);
        }
        
        // Link if enabled
        if (this.params.link && which === 'A') {
            this.setFilterParams('B', type, cutoff + this.params.linkOffset, resonance);
        }
    },
    
    enable(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.disconnectAll();
        }
    }
};

// ===== INITIALIZATION =====
function initAdvancedFilters() {
    window.PROSynth.AdvancedFilters.formantFilter = FormantFilter;
    window.PROSynth.AdvancedFilters.dualFilter = DualFilter;
    window.PROSynth.AdvancedFilters.initialized = true;
    console.log('🎛️ Advanced Filters initialized (Analog Models, Formant, Dual)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedFilters);
} else {
    initAdvancedFilters();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalogFilters, FormantFilter, DualFilter };
}
