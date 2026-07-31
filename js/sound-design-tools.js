/**
 * PROSynth - Sound Design Tools
 * Waveshaper Module, Harmonic Shifter, Character Control,
 * Microtonal / Alternative Tuning Support, Scale Display Overlay
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.SoundDesignTools = {
    initialized: false,
    waveshaper: null,
    harmonicShift: null,
    character: null,
    microtonal: null,
    scaleDisplay: null
};

// ===== 1. WAVESHAPER MODULE =====

const WaveshaperModule = {
    // 16 curve types
    curveTypes: [
        { id: 'hardclip', name: 'Hard Clip', description: 'Brutal digital clamp' },
        { id: 'softclip', name: 'Soft Clip', description: 'Tube-like warmth' },
        { id: 'arctan', name: 'Arc-Tangent', description: 'Gentle saturation' },
        { id: 'tanh', name: 'Hyperbolic Tan', description: 'Standard soft knee' },
        { id: 'cubic', name: 'Cubic', description: 'Mild asymmetry' },
        { id: 'sinusoidal', name: 'Sinusoidal', description: 'Smooth odd harmonics' },
        { id: 'exponential', name: 'Exponential', description: 'Aggressive growth' },
        { id: 'logistic', name: 'Logistic (Sigmoid)', description: 'S-shaped curve' },
        { id: 'arcsine', name: 'Arc-Sine', description: 'Compression effect' },
        { id: 'quadratic', name: 'Quadratic', description: 'Even-harmonic emphasis' },
        { id: 'cuberoot', name: 'Cube Root', description: 'Expansion' },
        { id: 'erf', name: 'Error Function', description: 'Gaussian integral approx' },
        { id: 'crush', name: 'Crush', description: 'Bit-like stepping' },
        { id: 'fold', name: 'Fold', description: 'West Coast reflection' },
        { id: 'squeeze', name: 'Squeeze', description: 'Mid-range compression' },
        { id: 'custom', name: 'Custom', description: 'User-drawn' }
    ],
    
    currentType: 'softclip',
    drive: 2,          // Input gain before shaping (1-20x)
    mix: 50,           // Dry/wet blend (0-100%)
    outputGain: 0,     // Makeup gain or trim (-24 to +24 dB)
    
    // Custom shape data (user-drawn)
    customCurveData: new Float32Array(256).fill(0).map((_, i) => i / 255 * 2 - 1),
    
    node: null,
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        this.node = audioCtx.createWaveShaper();
        this.updateCurve();
        
        // Pre-drive gain
        this.inputGain = audioCtx.createGain();
        this.inputGain.gain.value = this.drive;
        
        // Post-gain for output trim
        this.outputGainNode = audioCtx.createGain();
        this.outputGainNode.gain.value = Math.pow(10, this.outputGain / 20);
        
        // Dry/wet mix
        this.dryGain = audioCtx.createGain();
        this.dryGain.gain.value = 1 - (this.mix / 100);
        this.wetGain = audioCtx.createGain();
        this.wetGain.gain.value = this.mix / 100;
        
        console.log('🎨 Waveshaper Module created');
        return this;
    },
    
    generateCurve(type, drive, samples = 2048) {
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            let x = (i / (samples / 2)) * 2 - 1; // -1 to +1
            const driven = x * drive;
            
            let y;
            
            switch(type) {
                case 'hardclip':
                    y = Math.max(-1, Math.min(1, driven));
                    break;
                    
                case 'softclip':
                    y = Math.tanh(driven);
                    break;
                    
                case 'arctan':
                    y = (2 / Math.PI) * Math.atan(driven * Math.PI / 2);
                    break;
                    
                case 'tanh':
                    y = Math.tanh(driven);
                    break;
                    
                case 'cubic':
                    y = driven - driven * driven * driven / 3;
                    break;
                    
                case 'sinusoidal':
                    y = Math.sin(driven * Math.PI / 2);
                    break;
                    
                case 'exponential':
                    y = Math.sign(driven) * (Math.exp(Math.abs(driven)) - 1);
                    break;
                    
                case 'logistic':
                    y = 2 / (1 + Math.exp(-2 * driven)) - 1;
                    break;
                    
                case 'arcsine':
                    y = Math.sin(Math.max(-1, Math.min(1, driven)));
                    break;
                    
                case 'quadratic':
                    y = driven * Math.abs(driven);
                    break;
                    
                case 'cuberoot':
                    y = Math.sign(driven) * Math.pow(Math.abs(driven), 1/3);
                    break;
                    
                case 'erf':
                    // Approximation
                    const t = 1 / (1 + 0.3275911 * Math.abs(driven));
                    y = Math.sign(driven) * (1 - (((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t));
                    break;
                    
                case 'crush':
                    const steps = Math.max(2, Math.round(16 / drive));
                    y = Math.floor((driven + 1) * steps / 2) / (steps/2) - 1;
                    break;
                    
                case 'fold':
                    if (Math.abs(driven) < 1) {
                        y = driven;
                    } else {
                        let excess = Math.abs(driven) - 1;
                        y = Math.sign(driven) * (1 - (excess % 2));
                        if ((excess % 2) > 1) y = -y;
                    }
                    break;
                    
                case 'squeeze':
                    y = Math.tanh(driven * driven);
                    break;
                    
                case 'custom':
                    // Interpolate from custom data
                    const idx = ((driven + 1) / 2) * (this.customCurveData.length - 1);
                    const low = Math.floor(idx);
                    const high = Math.min(low + 1, this.customCurveData.length - 1);
                    const frac = idx - low;
                    y = this.customCurveData[low] * (1 - frac) + this.customCurveData[high] * frac;
                    break;
                    
                default:
                    y = Math.tanh(driven);
            }
            
            // Normalize by drive for consistent output levels
            if (type !== 'custom') {
                const normalizeFactor = type === 'hardclip' ? 1 : 
                    (type === 'exponential' ? (1 / (Math.exp(drive) - 1)) : 
                    (1 / Math.tanh(Math.max(0.001, drive))));
                y *= normalizeFactor || 1;
            }
            
            curve[i] = isNaN(y) || !isFinite(y) ? 0 : Math.max(-1, Math.min(1, y));
        }
        
        return curve;
    },
    
    updateCurve() {
        if (this.node) {
            this.node.curve = this.generateCurve(this.currentType, this.drive);
            this.node.oversample = '4x';
        }
    },
    
    connect(input) {
        input.connect(this.inputGain);      // Drive stage
        input.connect(this.dryGain);         // Dry path
        
        this.inputGain.connect(this.node);   // Shape
        this.node.connect(this.wetGain);     // Wet path
        
        this.dryGain.connect(this.outputGainNode);
        this.wetGain.connect(this.outputGainNode);
        
        return this.outputGainNode;
    },
    
    setType(type) {
        if (this.curveTypes.find(c => c.id === type)) {
            this.currentType = type;
            this.updateCurve();
        }
    },
    
    setDrive(drive) {
        this.drive = drive;
        if (this.inputGain) this.inputGain.gain.setTargetAtTime(drive, this.audioCtx?.currentTime || 0, 0.02);
        this.updateCurve();
    },
    
    setMix(percent) {
        this.mix = percent;
        if (this.dryGain && this.wetGain) {
            const t = this.audioCtx?.currentTime || 0;
            this.dryGain.gain.setTargetAtTime(1 - percent / 100, t, 0.02);
            this.wetGain.gain.setTargetAtTime(percent / 100, t, 0.02);
        }
    },
    
    setOutputGain(dB) {
        this.outputGain = dB;
        if (this.outputGainNode) {
            this.outputGainNode.gain.setTargetAtTime(Math.pow(10, dB / 20), this.audioCtx?.currentTime || 0, 0.02);
        }
    },
    
    setCustomPoint(index, value) {
        if (index >= 0 && index < this.customCurveData.length) {
            this.customCurveData[index] = Math.max(-1, Math.min(1, value));
            if (this.currentType === 'custom') this.updateCurve();
        }
    },
    
    getTransferFunction(points = 128) {
        const result = [];
        for (let i = 0; i < points; i++) {
            const x = (i / points) * 2 - 1;
            const curve = this.generateCurve(this.currentType, this.drive, points);
            result.push({ x, y: curve[i] });
        }
        return result;
    }
};

// ===== 2. HARMONIC SHIFTER =====

const HarmonicShifter = {
    enabled: false,
    amount: 0,           // Semitones (-12 to +12)
    mode: 'shiftUp',    // shiftUp, shiftDown, alternate, spread
    keepFundamental: true, // Keep fundamental untouched
    
    node: null,
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Frequency shifter using ring modulation approach
        // For true frequency shifting (not pitch shifting)
        this.oscillator = audioCtx.createOscillator();
        this.oscillator.type = 'sine';
        
        this.gainNode = audioCtx.createGain();
        this.gainNode.gain.value = 0; // Will be set based on amount
        
        // Create nodes for single-sideband modulation (simplified)
        this.multiplier = audioCtx.createGain();      // Signal × carrier
        this.outputGain = audioCtx.createGain();
        this.outputGain.gain.value = 1;
        
        // Mix between dry and shifted
        this.dryGain = audioCtx.createGain();
        this.dryGain.gain.value = 1;
        this.wetGain = audioCtx.createGain();
        this.wetGain.gain.value = 0;
        
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.multiplier); // Carrier goes here too
        
        this.oscillator.start();
        
        console.log('🔄 Harmonic Shifter created');
        return this;
    },
    
    calculateShiftFrequency(baseFreq, semitones) {
        // Convert semitones to frequency offset
        // This is an approximation - real SSB would be more complex
        return baseFreq * (Math.pow(2, semitones / 12) - 1);
    },
    
    connect(input) {
        input.connect(this.dryGain);
        input.connect(this.multiplier);
        this.multiplier.connect(this.wetGain);
        
        this.dryGain.connect(this.outputGain);
        this.wetGain.connect(this.outputGain);
        
        return this.outputGain;
    },
    
    setAmount(semitones) {
        this.amount = semitones;
        // Update oscillator frequency based on a reference (would need actual signal analysis)
        if (this.oscillator && this.audioCtx) {
            // Approximate: use a fixed reference frequency
            const refFreq = 440; // A4
            const shiftFreq = this.calculateShiftFrequency(refFreq, semitones);
            this.oscillator.frequency.setTargetAtTime(Math.abs(shiftFreq), this.audioCtx.currentTime, 0.02);
        }
        
        // Update wet/dry mix based on amount
        const wetAmount = Math.abs(semitones) / 12; // More shift = more wet
        if (this.wetGain && this.dryGain) {
            this.wetGain.gain.setTargetAtTime(wetAmount, this.audioCtx?.currentTime || 0, 0.02);
            this.dryGain.gain.setTargetAtTime(1 - wetAmount * 0.5, this.audioCtx?.currentTime || 0, 0.02);
        }
    },
    
    setMode(mode) {
        this.mode = mode;
    },
    
    enable(enabled) {
        this.enabled = enabled;
        if (!enabled && this.wetGain) {
            this.wetGain.gain.setTargetAtTime(0, this.audioCtx?.currentTime || 0, 0.02);
            this.dryGain.gain.setTargetAtTime(1, this.audioCtx?.currentTime || 0, 0.02);
        }
    }
};

// ===== 3. CHARACTER CONTROL =====

const CharacterControl = {
    warmth: 0,       // 0-100%
    punch: 0,        // 0-200%
    presence: 0,     // 0-100%
    air: 0,          // 0-100%
    
    nodes: {},
    
    create(audioCtx) {
        this.audioCtx = audioCtx;
        
        // Warmth: Low-shelf boost + subtle saturation
        this.warmthLP = audioCtx.createBiquadFilter();
        this.warmthLP.type = 'lowshelf';
        this.warmthLP.frequency.value = 200;
        this.warmthLP.gain.value = 0;
        
        this.warmthSaturation = audioCtx.createWaveShaper();
        this.warmthSaturation.curve = new Float32Array(256).map((_, i) => 
            Math.tanh(((i / 128) - 1) * 1.1) / Math.tanh(1.1)
        );
        
        // Punch: Transient enhancer (parallel detection + gain)
        this.punchDetector = audioCtx.createWaveShaper();
        // Simple rectifier as transient detector
        this.punchDetector.curve = new Float32Array(256).map((_, i) => 
            Math.max(0, ((i / 128) - 1))
        );
        
        this.punchGain = audioCtx.createGain();
        this.punchGain.gain.value = 1;
        
        // Presence: Peaking EQ at presence range
        this.presenceEQ = audioCtx.createBiquadFilter();
        this.presenceEQ.type = 'peaking';
        this.presenceEQ.frequency.value = 3000;
        this.presenceEQ.Q.value = 1;
        this.presenceEQ.gain.value = 0;
        
        // Air: High-shelf + exciter-style HF generation
        this.airHP = audioCtx.createBiquadFilter();
        this.airHP.type = 'highshelf';
        this.airHP.frequency.value = 12000;
        this.airHP.gain.value = 0;
        
        // Master output
        this.output = audioCtx.createGain();
        this.output.gain.value = 1;
        
        console.log('✨ Character Control created');
        return this;
    },
    
    connect(input) {
        // Serial chain: Warmth → Presence → Air → Output
        // Punch runs in parallel and gets mixed in
        
        input.connect(this.warmthLP);
        this.warmthLP.connect(this.presenceEQ);
        this.presenceEQ.connect(this.airHP);
        this.airHP.connect(this.output);
        
        // Parallel punch detection
        input.connect(this.punchDetector);
        this.punchDetector.connect(this.punchGain);
        this.punchGain.connect(this.output);
        
        return this.output;
    },
    
    setCharacter(character, amount) {
        switch(character.toLowerCase()) {
            case 'warmth':
            case 'warm':
                this.warmth = amount;
                if (this.warmthLP) {
                    this.warmthLP.gain.setTargetAtTime(amount / 25, this.audioCtx?.currentTime || 0, 0.02); // 0 to +4dB
                }
                break;
                
            case 'punch':
            case 'punchiness':
                this.punch = amount;
                if (this.punchGain) {
                    this.punchGain.gain.setTargetAtTime(1 + amount / 100, this.audioCtx?.currentTime || 0, 0.002); // Fast attack
                }
                break;
                
            case 'presence':
            case 'present':
                this.presence = amount;
                if (this.presenceEQ) {
                    this.presenceEQ.gain.setTargetAtTime(amount / 16.7, this.audioCtx?.currentTime || 0, 0.02); // 0 to +6dB
                }
                break;
                
            case 'air':
            case 'airy':
            case 'brightness':
                this.air = amount;
                if (this.airHP) {
                    this.airHP.gain.setTargetAtTime(amount / 25, this.audioCtx?.currentTime || 0, 0.02); // 0 to +4dB
                }
                break;
        }
    },
    
    getAllValues() {
        return {
            warmth: this.warmth,
            punch: this.punch,
            presence: this.presence,
            air: this.air
        };
    },
    
    reset() {
        this.setCharacter('warmth', 0);
        this.setCharacter('punch', 0);
        this.setCharacter('presence', 0);
        this.setCharacter('air', 0);
    }
};

// ===== 4. MICROTONAL / ALTERNATIVE TUNING SUPPORT =====

const MicrotonalTuning = {
    enabled: false,
    
    currentSystem: '12-TET',
    rootFrequency: 440, // Reference A (try 432Hz for alternative)
    
    // Tuning definitions (cents from root for each degree)
    tunings: {
        '12-TET': [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
        '24-TET': [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150],
        'Just Intonation (5-limit)': [0, 112, 204, 316, 386, 498, 702, 816, 884, 1018, 1088, 1202],
        'Pythagorean': [0, 114, 204, 294, 408, 498, 612, 702, 816, 906, 1020, 1110],
        'Meantone (1/4 comma)': [0, 76, 193, 310, 386, 503, 579, 697, 773, 890, 1007, 1083],
        'Werckmeister III': [0, 90, 192, 294, 390, 498, 588, 696, 792, 888, 996, 1090],
        'Young Lamé': [0, 82, 184, 286, 386, 479, 582, 684, 784, 886, 988, 1088]
    },
    
    // Current active tuning array (reference)
    activeTuning: null,
    
    // Scala file parser
    parseScalaFile(content) {
        const lines = content.split('\n').filter(l => !l.startsWith('!'));
        
        if (lines.length < 2) return null;
        
        const count = parseInt(lines[0]);
        if (isNaN(count) || count < 1) return null;
        
        const cents = [0]; // Root always 0 cents
        
        for (let i = 1; i <= count && i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('*")) continue;
            
            if (line.includes('.')) {
                // Cent value
                const centValue = parseFloat(line);
                if (!isNaN(centValue)) cents.push(centValue);
            } else if (line.includes('/')) {
                // Ratio
                const parts = line.split('/').map(s => parseFloat(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
                    const centsValue = 1200 * Math.log2(parts[0] / parts[1]);
                    cents.push(centsValue);
                }
            } else {
                // Integer ratio (implied /1)
                const num = parseFloat(line);
                if (!isNaN(num) && num > 0) {
                    const centsValue = 1200 * Math.log2(num);
                    cents.push(centsValue);
                }
            }
        }
        
        return cents;
    },
    
    init() {
        this.activeTuning = [...this.tunings['12-TET']];
        console.log('🎼 Microtonal Tuning initialized');
    },
    
    // Calculate frequency for a given note index using current tuning
    getFrequency(noteIndex) {
        if (!this.enabled) {
            // Standard 12-TET
            return this.rootFrequency * Math.pow(2, (noteIndex - 69) / 12); // MIDI note 69 = A440
        }
        
        const tuning = this.activeTuning || this.tunings['12-TET'];
        const notesPerOctave = tuning.length;
        
        const octave = Math.floor(noteIndex / notesPerOctave);
        let degree = ((noteIndex % notesPerOctave) + notesPerOctave) % notesPerOctave;
        
        // Handle negative indices
        if (noteIndex < 0) {
            degree = tuning.length - 1 - (Math.abs(noteIndex) % tuning.length);
        }
        
        const centsFromRoot = (octave * 1200) + (tuning[degree] || 0);
        
        return this.rootFrequency * Math.pow(2, centsFromRoot / 1200);
    },
    
    // Get cents deviation from 12-TET for visualization
    getCentsDeviation(noteIndex) {
        const standardFreq = this.rootFrequency * Math.pow(2, (noteIndex - 69) / 12);
        const microtonalFreq = this.getFrequency(noteIndex);
        
        return 1200 * Math.log2(microtonalFreq / standardFreq);
    },
    
    setTuning(systemName) {
        if (systemName in this.tunings) {
            this.currentSystem = systemName;
            this.activeTuning = [...this.tunings[systemName]];
            console.log(`Tuning set to ${systemName}`);
            return true;
        }
        return false;
    },
    
    loadScalaFile(fileContent, name = 'Custom Scala') {
        const tuning = this.parseScalaFile(fileContent);
        if (tuning && tuning.length > 1) {
            this.tunings[name] = tuning;
            this.currentSystem = name;
            this.activeTuning = [...tuning];
            console.log(`Scala file loaded: ${name} (${tuning.length} degrees per octave)`);
            return true;
        }
        return false;
    },
    
    setRootFrequency(hz) {
        this.rootFrequency = Math.max(20, Math.min(10000, hz)); // Reasonable range
    },
    
    enable(enabled) {
        this.enabled = enabled;
        console.log(`Microtonal tuning ${enabled ? 'ENABLED' : 'DISABLED'} (${this.currentSystem})`);
    },
    
    // Get info about current tuning for display
    getInfo() {
        const tuning = this.activeTuning || [];
        return {
            name: this.currentSystem,
            degreesPerOctave: tuning.length,
            rootFrequency: this.rootFrequency,
            intervalPattern: tuning.slice(1).map((c, i) => ({
                degree: i + 1,
                cents: c,
                ratio: Math.pow(2, c / 1200),
                name: this.getCentsToNoteName(c)
            }))
        };
    },
    
    getCentsToNoteName(cents) {
        // Approximate nearest 12-TET note name for reference
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const nearestSemitone = Math.round(cents / 100);
        const octaveOffset = Math.floor(nearestSemitone / 12);
        const noteIdx = ((nearestSemitone % 12) + 12) % 12;
        const deviation = cents - (nearestSemitone * 100);
        
        return `${noteNames[noteIdx]}${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}¢`;
    }
};

// ===== 5. SCALE DISPLAY OVERLAY =====

const ScaleDisplayOverlay = {
    enabled: false,
    
    highlightColor: '#00FF88',
    rootHighlightStyle: 'glow', // glow, pulse, border, underline
    
    // Reference to ScaleLock instance (if available)
    scaleLockRef: null,
    
    init() {
        console.log('👁️ Scale Display Overlay initialized');
    },
    
    // Update keyboard visual highlighting
    updateKeyboardDisplay() {
        if (!this.enabled) {
            this.clearHighlights();
            return;
        }
        
        const keys = document.querySelectorAll('.keyboard .key');
        
        keys.forEach(keyEl => {
            const noteStr = keyEl.dataset.note || '';
            const match = noteStr.match(/([A-G]#?)(\d)/);
            if (!match) return;
            
            const [, noteName, octave] = match;
            const noteIndices = { 'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11 };
            const midiNote = (parseInt(octave) + 1) * 12 + (noteIndices[noteName] || 0);
            
            // Check with ScaleLock if available
            let isInScale = true;
            let isRoot = false;
            
            if (this.scaleLockRef && typeof this.scaleLockRef.isNoteInScale === 'function') {
                isInScale = this.scaleLockRef.isNoteInScale(midiNote);
                isRoot = midiNote % 12 === this.scaleLockRef.root;
            }
            
            // Apply classes
            keyEl.classList.remove('in-scale', 'out-of-scale', 'is-root');
            
            if (isInScale) {
                keyEl.classList.add('in-scale');
                if (isRoot) keyEl.classList.add('is-root');
            } else if (this.scaleLockRef?.enabled) {
                keyEl.classList.add('out-of-scale');
            }
        });
    },
    
    clearHighlights() {
        document.querySelectorAll('.keyboard .key').forEach(el => {
            el.classList.remove('in-scale', 'out-of-scale', 'is-root');
        });
    },
    
    bindScaleLock(scaleLockInstance) {
        this.scaleLockRef = scaleLockInstance;
    },
    
    showTooltipForOutOfScale(keyElement, originalNote, quantizedNote) {
        // Show brief tooltip indicating quantization
        const tooltip = document.createElement('div');
        tooltip.className = 'scale-tooltip';
        tooltip.textContent = `${originalNote} → ${quantizedNote}`;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.9);
            color: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            pointer-events: none;
            z-index: 1000;
        `;
        
        keyElement.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 1500);
    },
    
    setHighlightColor(color) {
        this.highlightColor = color;
        // Update CSS variable
        document.documentElement.style.setProperty('--scale-highlight-color', color);
    },
    
    setRootStyle(style) {
        this.rootHighlightStyle = style;
        // Would update CSS class logic
    },
    
    enable(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.updateKeyboardDisplay();
        } else {
            this.clearHighlights();
        }
    }
};

// ===== INITIALIZATION =====

function initSoundDesignTools() {
    MicrotonalTuning.init();
    ScaleDisplayOverlay.init();
    
    window.PROSynth.SoundDesignTools.waveshaper = WaveshaperModule;
    window.PROSynth.SoundDesignTools.harmonicShift = HarmonicShifter;
    window.PROSynth.SoundDesignTools.character = CharacterControl;
    window.PROSynth.SoundDesignTools.microtonal = MicrotonalTuning;
    window.PROSynth.SoundDesignTools.scaleDisplay = ScaleDisplayOverlay;
    window.PROSynth.SoundDesignTools.initialized = true;
    
    console.log('🎨 Sound Design Tools initialized (Waveshaper, Harmonic Shift, Character, Microtonal, Scale Display)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSoundDesignTools);
} else {
    initSoundDesignTools();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WaveshaperModule, HarmonicShifter, CharacterControl,
        MicrotonalTuning, ScaleDisplayOverlay
    };
}
