/**
 * PROSynth - Advanced Arpeggiator & Sequencer
 * Probability, Ratcheting, Scale Lock, Phrase Recorder
 * Part of THE COMPLETE DREAM FEATURE LIST
 */

window.PROSynth = window.PROSynth || {};
window.PROSynth.AdvancedArpSeq = {
    initialized: false,
    arp: null,
    seq: null,
    recorder: null
};

// ===== 1. STEP PROBABILITY SYSTEM =====

const StepProbability = {
    // Per-step probability (0-100%)
    stepProbabilities: Array(64).fill(100), // Support up to 64 steps
    
    // Global probability multiplier (scales all steps)
    globalProbability: 100, // %
    
    // Random seed for deterministic mode
    seed: Date.now(),
    
    // Mode: 'deterministic' (repeats same pattern) or 'random' (different each pass)
    mode: 'deterministic',
    
    // Seeded random number generator (for deterministic mode)
    seededRandom: {
        state: 0,
        setSeed(seed) { this.state = seed; },
        next() {
            this.state = (this.state * 1664525 + 1013904223) % 4294967296;
            return this.state / 4294967296;
        }
    },
    
    // Pass counter (for seeded variation)
    passCount: 0,
    
    init() {
        this.seededRandom.setSeed(this.seed);
        console.log('🎲 Step Probability initialized');
    },
    
    shouldTriggerStep(stepIndex) {
        const stepProb = (this.stepProbabilities[stepIndex] !== undefined) ? 
            this.stepProbabilities[stepIndex] : 100;
        const globalProb = this.globalProbability / 100;
        const combinedProb = stepProb * globalProb;
        
        if (combinedProb >= 100) return true; // Always trigger
        if (combinedProb <= 0) return false;   // Never trigger
        
        if (this.mode === 'deterministic') {
            // Use seeded random for reproducibility
            this.seededRandom.setSeed(this.seed + stepIndex + (this.passCount * 1000));
            return this.seededRandom.next() < combinedProb / 100;
        } else {
            // True random
            return Math.random() < combinedProb / 100;
        }
    },
    
    setStepProbability(stepIndex, probability) {
        if (stepIndex >= 0 && stepIndex < this.stepProbabilities.length) {
            this.stepProbabilities[stepIndex] = Math.max(0, Math.min(100, probability));
        }
    },
    
    setGlobalProbability(probability) {
        this.globalProbability = Math.max(0, Math.min(100, probability));
    },
    
    setMode(mode) {
        this.mode = mode;
    },
    
    setSeed(newSeed) {
        this.seed = newSeed;
        this.seededRandom.setSeed(newSeed);
    },
    
    incrementPass() {
        this.passCount++;
    },
    
    reset() {
        this.passCount = 0;
        this.seededRandom.setSeed(this.seed);
    },
    
    // Get visual opacity value for a step (for UI display)
    getStepOpacity(stepIndex) {
        const prob = this.stepProbabilities[stepIndex] || 100;
        return 0.2 + (prob / 100) * 0.8; // Range from 20% to 100% opacity
    }
};

// ===== 2. RATCHETING SYSTEM =====

const RatchetingSystem = {
    // Per-step ratchet count (0 = no ratchet, 1-8 subdivisions)
    stepRatchets: Array(64).fill(0),
    
    // Ratchet speed (subdivision type)
    speed: '2x', // 2x (eighths), 3x (triplets), 4x (sixteenths), 5x (quintuplets)
    
    // Velocity decay per sub-note (each subsequent sub-note quieter)
    velocityDecay: 30, // % (0=no decay, 100=complete silence by last)
    
    // Pitch decay per sub-note (falling effect)
    pitchDecay: 0, // semitones (0=none, ±12=octave)
    
    // Gate length (how long each sub-note sounds)
    gate: 50, // % of sub-step duration (0=staccato, 100=legato overlap)
    
    getSubdivisionMultiplier() {
        switch(this.speed) {
            case '2x': return 2;
            case '3x': return 3;
            case '4x': return 4;
            case '5x': return 5;
            default: return 2;
        }
    },
    
    getRatchedStep(stepIndex, baseNote, baseVelocity, stepDuration, playNoteFn, stopNoteFn) {
        const ratchetCount = this.stepRatchets[stepIndex] || 0;
        
        if (ratchetCount <= 1) {
            // Normal note (no ratcheting)
            playNoteFn(baseNote, baseVelocity);
            return { duration: stepDuration, notesPlayed: 1 };
        }
        
        const subdiv = this.getSubdivisionMultiplier();
        const subDuration = stepDuration / subdiv;
        const notesToPlay = Math.min(ratchetCount, subdiv);
        
        for (let r = 0; r < notesToPlay; r++) {
            setTimeout(() => {
                // Calculate decaying velocity
                const velDecayFactor = 1 - (r / notesToPlay) * (this.velocityDecay / 100);
                const vel = Math.max(1, baseVelocity * velDecayFactor);
                
                // Calculate pitch shift (downward)
                const pitchShift = -Math.round(r * this.pitchDecay / notesToPlay);
                
                // Play sub-note
                playNoteFn(baseNote + pitchShift, vel);
                
                // Gate off before next sub-note if gate < 100%
                if (this.gate < 100 && r < notesToPlay - 1) {
                    const gateTime = subDuration * (this.gate / 100);
                    setTimeout(() => stopNoteFn(), gateTime);
                }
            }, r * subDuration);
        }
        
        return { 
            duration: stepDuration, 
            notesPlayed: notesToPlay,
            isRatched: true
        };
    },
    
    setStepRatchet(stepIndex, count) {
        if (stepIndex >= 0 && stepIndex < this.stepRatchets.length) {
            this.stepRatchets[stepIndex] = Math.max(0, Math.min(8, count));
        }
    },
    
    setSpeed(speed) {
        this.speed = speed;
    }
};

// ===== 3. SCALE LOCK SYSTEM =====

const ScaleLock = {
    enabled: false,
    
    root: 0, // C = 0, C# = 1, ..., B = 11
    currentScale: 'major',
    
    quantizeMode: 'snap', // snap (nearest), alwaysUp, alwaysDown
    
    // Scale definitions (semitones from root)
    scales: {
        'chromatic':       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        'major':           [0, 2, 4, 5, 7, 9, 11],
        'minor':           [0, 2, 3, 5, 7, 8, 10],
        'dorian':          [0, 2, 3, 5, 7, 9, 10],
        'phrygian':        [0, 1, 3, 5, 7, 8, 10],
        'lydian':          [0, 2, 4, 6, 7, 9, 11],
        'mixolydian':      [0, 2, 4, 5, 7, 9, 10],
        'locrian':         [0, 1, 3, 5, 6, 8, 10],
        'harmonicMinor':   [0, 2, 3, 5, 7, 8, 11],
        'melodicMinorAsc':[0, 2, 3, 5, 7, 9, 11],
        'pentatonicMajor': [0, 2, 4, 7, 9],
        'pentatonicMinor': [0, 3, 5, 7, 10],
        'blues':           [0, 3, 5, 6, 7, 10],
        'wholeTone':      [0, 2, 4, 6, 8, 10],
        'diminished':      [0, 2, 3, 5, 6, 8, 9, 11]
    },
    
    scaleNames: {
        'chromatic': 'Chromatic',
        'major': 'Major (Ionian)',
        'minor': 'Minor (Aeolian)',
        'dorian': 'Dorian',
        'phrygian': 'Phrygian',
        'lydian': 'Lydian',
        'mixolydian': 'Mixolydian',
        'locrian': 'Locrian',
        'harmonicMinor': 'Harmonic Minor',
        'melodicMinorAsc': 'Melodic Minor (Ascending)',
        'pentatonicMajor': 'Pentatonic Major',
        'pentatonicMinor': 'Pentatonic Minor',
        'blues': 'Blues',
        'wholeTone': 'Whole Tone',
        'diminished': 'Diminished'
    },
    
    init() {
        console.log('🎵 Scale Lock initialized');
    },
    
    // Quantize a MIDI note number to the current scale
    quantize(midiNoteNumber) {
        if (!this.enabled) return midiNoteNumber;
        
        const intervals = this.scales[this.currentScale];
        if (!intervals) return midiNoteNumber;
        
        // Find octave and position within octave
        const octave = Math.floor(midiNoteNumber / 12);
        let semitone = ((midiNoteNumber % 12) + 12) % 12; // Ensure positive
        
        // Find nearest scale degree based on quantize mode
        let closestInterval = intervals[0];
        let minDistance = 12;
        
        intervals.forEach(interval => {
            let distance;
            
            switch(this.quantizeMode) {
                case 'alwaysUp':
                    distance = (interval >= semitone) ? (interval - semitone) : (12 - semitone + interval);
                    break;
                case 'alwaysDown':
                    distance = (interval <= semitone) ? (semitone - interval) : (semitone + 12 - interval);
                    break;
                case 'snap':
                default:
                    distance = Math.abs(semitone - interval);
                    break;
            }
            
            if (distance < minDistance) {
                minDistance = distance;
                closestInterval = interval;
            }
        });
        
        // Handle wrap-around for alwaysUp/alwaysDown
        if (this.quantizeMode === 'alwaysUp' && closestInterval < semitone) {
            octave += 1;
        } else if (this.quantizeMode === 'alwaysDown' && closestInterval > semitone) {
            octave -= 1;
        }
        
        return (octave * 12) + closestInterval + this.root;
    },
    
    // Check if a note is in the current scale
    isNoteInScale(midiNoteNumber) {
        const intervals = this.scales[this.currentScale];
        if (!intervals) return true;
        
        const semitone = ((midiNoteNumber % 12) + 12) % 12;
        return intervals.includes(semitone);
    },
    
    // Get all valid note numbers in scale for a range
    getScaleNotesInRange(startMidi, endMidi) {
        const notes = [];
        for (let note = startMidi; note <= endMidi; note++) {
            if (this.isNoteInScale(note)) {
                notes.push(note);
            }
        }
        return notes;
    },
    
    setRoot(rootSemitone) {
        this.root = Math.max(0, Math.min(11, rootSemitone));
    },
    
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
        }
    },
    
    enable(enabled) {
        this.enabled = enabled;
        console.log(`Scale Lock ${enabled ? 'ENABLED' : 'DISABLED'} (${this.scaleNames[this.currentScale]}, root: ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][this.root]})`);
    },
    
    // Visual helper: get highlight info for keyboard display
    getKeyboardHighlightMap(startOctave = 2, endOctave = 6) {
        const map = {};
        for (let oct = startOctave; oct <= endOctave; oct++) {
            for (let semi = 0; semi < 12; semi++) {
                const midiNote = (oct + 1) * 12 + semi;
                const keyName = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][semi] + oct;
                map[keyName] = {
                    inScale: this.isNoteInScale(midiNote),
                    isRoot: semi === this.root,
                    noteClass: this.isNoteInScale(midiNote) ? 
                        (semi === this.root ? 'root' : 'in-scale') : 'out-of-scale'
                };
            }
        }
        return map;
    }
};

// ===== 4. PHRASE RECORDER =====

const PhraseRecorder = {
    recording: false,
    playing: false,
    looping: false,
    
    // Recorded data
    phrases: [],
    currentPhrase: null,
    
    // Current recording buffer
    recordBuffer: {
        notes: [],
        startTime: 0,
        tempo: 120
    },
    
    // Settings
    settings: {
        quantize: 'off',     // off, 1/16, 1/8, 1/4
        velocity: 'original', // original, fixed, humanize
        fixedVelocity: 100,
        humanizeAmount: 10,   // ± randomness percent
        overdub: false        // Record over existing playback
    },
    
    // Playback state
    playbackState: {
        currentNoteIndex: 0,
        loopStart: 0,
        loopEnd: 0,
        startTime: 0,
        scheduledEvents: []
    },
    
    init(audioCtx) {
        this.audioCtx = audioCtx;
        console.log('🎙️ Phrase Recorder initialized');
    },
    
    startRecording(tempo = 120) {
        this.recording = true;
        this.recordBuffer = {
            notes: [],
            startTime: this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000,
            tempo: tempo
        };
        console.log('⏺️ Phrase recording started');
    },
    
    stopRecording() {
        if (!this.recording) return null;
        
        this.recording = false;
        
        // Process recorded notes (quantization, etc.)
        const processedPhrase = this.processRecording(this.recordBuffer);
        
        this.phrases.push(processedPhrase);
        this.currentPhrase = processedPhrase;
        
        console.log(`⏹️ Recording stopped (${processedPhrase.notes.length} notes)`);
        return processedPhrase;
    },
    
    // Called when a note is played during recording
    recordNoteOn(midiNote, velocity) {
        if (!this.recording) return;
        
        const time = (this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000) - this.recordBuffer.startTime;
        
        this.recordBuffer.notes.push({
            midiNote,
            velocity,
            startTime: time,
            duration: null, // Will be set on noteOff
            noteId: `${midiNote}_${Date.now()}_${Math.random()}`
        });
    },
    
    // Called when a note is released during recording
    recordNoteOff(midiNote) {
        if (!this.recording) return;
        
        const time = (this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000) - this.recordBuffer.startTime;
        
        // Find the matching open note (most recent with matching midiNote and no duration)
        for (let i = this.recordBuffer.notes.length - 1; i >= 0; i--) {
            const note = this.recordBuffer.notes[i];
            if (note.midiNote === midiNote && note.duration === null) {
                note.duration = time - note.startTime;
                break;
            }
        }
    },
    
    processRecording(buffer) {
        let notes = [...buffer.notes];
        
        // Apply quantization
        if (this.settings.quantize !== 'off') {
            const gridDivision = this.getQuantizeGridSize();
            notes = notes.map(note => ({
                ...note,
                startTime: Math.round(note.startTime / gridDivision) * gridDivision
            }));
        }
        
        // Apply velocity processing
        switch(this.settings.velocity) {
            case 'fixed':
                notes = notes.map(n => ({ ...n, velocity: this.settings.fixedVelocity }));
                break;
            case 'humanize':
                notes = notes.map(n => ({
                    ...n,
                    velocity: Math.max(1, Math.min(127, n.velocity + (Math.random() - 0.5) * 2 * this.settings.humanizeAmount))
                }));
                break;
            // 'original': no change
        }
        
        // Sort by start time
        notes.sort((a, b) => a.startTime - b.startTime);
        
        // Calculate loop points
        const lastEndTime = notes.reduce((max, n) => Math.max(max, (n.startTime + (n.duration || 0.5))), 0);
        
        return {
            id: `phrase_${Date.now()}`,
            notes,
            tempo: buffer.tempo,
            loopStart: 0,
            loopEnd: lastEndTime,
            duration: lastEndTime,
            createdAt: Date.now()
        };
    },
    
    getQuantizeGridSize() {
        const beatDuration = 60 / this.recordBuffer.tempo; // seconds per quarter note
        const divisors = { '1/16': 0.25, '1/8': 0.5, '1/4': 1 };
        const divisor = divisors[this.settings.quantize] || 0.25;
        return beatDuration * divisor;
    },
    
    startPlayback(playNoteFn, stopNoteFn) {
        if (!this.currentPhrase || this.currentPhrase.notes.length === 0) return;
        
        this.playing = true;
        this.playbackState.startTime = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;
        this.playbackState.currentNoteIndex = 0;
        
        const phrase = this.currentPhrase;
        const loopDuration = phrase.loopEnd - phrase.loopStart;
        
        const scheduleNextBatch = () => {
            if (!this.playing) return;
            
            const now = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;
            const elapsed = now - this.playbackState.startTime;
            const loopPosition = ((elapsed - phrase.loopStart) % loopDuration + loopDuration) % loopDuration + phrase.loopStart;
            
            // Find and play notes that should be sounding at current position
            phrase.notes.forEach((note, idx) => {
                const noteStart = note.startTime;
                const noteEnd = noteStart + (note.duration || 0.5);
                
                // Check if current position falls within this note
                if (loopPosition >= noteStart && loopPosition < noteEnd) {
                    // Note should be sounding - check if we already triggered it
                    const alreadyTriggered = this.playbackState.scheduledEvents.includes(idx);
                    
                    if (!alreadyTriggered) {
                        playNoteFn(note.midiNote, note.velocity);
                        this.playbackState.scheduledEvents.push(idx);
                        
                        // Schedule note off
                        const remainingDuration = noteEnd - loopPosition;
                        setTimeout(() => {
                            if (this.playing) stopNoteFn(note.midiNote);
                        }, remainingDuration * 1000);
                    }
                } else if (loopPosition < noteStart) {
                    // Future note - remove from triggered if we passed it
                    const eventIdx = this.playbackState.scheduledEvents.indexOf(idx);
                    if (eventIdx > -1) {
                        this.playbackState.scheduledEvents.splice(eventIdx, 1);
                    }
                }
            });
            
            // Clean up old events that are definitely past
            this.playbackState.scheduledEvents = this.playbackState.scheduledEvents.filter(idx => {
                const note = phrase.notes[idx];
                return loopPosition < (note.startTime + (note.duration || 0.5) + 0.1);
            });
            
            if (this.playing) {
                // Schedule next check (every 10ms for accuracy)
                this._playbackTimer = setTimeout(scheduleNextBatch, 10);
            }
        };
        
        scheduleNextBatch();
        console.log('▶️ Phrase playback started');
    },
    
    stopPlayback(stopNoteFn) {
        this.playing = false;
        
        if (this._playbackTimer) {
            clearTimeout(this._playbackTimer);
        }
        
        // Stop any sounding notes
        if (stopNoteFn && this.currentPhrase) {
            this.currentPhrase.notes.forEach(note => {
                try { stopNoteFn(note.midiNote); } catch(e) {}
            });
        }
        
        this.playbackState.scheduledEvents = [];
        console.log('⏹️ Phrase playback stopped');
    },
    
    clearPhrase() {
        this.stopPlayback(() => {});
        this.phrases = [];
        this.currentPhrase = null;
    },
    
    loadPhrase(phraseId) {
        const phrase = this.phrases.find(p => p.id === phraseId);
        if (phrase) {
            this.currentPhrase = phrase;
            return true;
        }
        return false;
    },
    
    toggleLoop(enable) {
        this.looping = enable;
    },
    
    setSetting(setting, value) {
        if (setting in this.settings) {
            this.settings[setting] = value;
        }
    },
    
    // Export phrase as MIDI-like data structure
    exportPhrase(phraseId) {
        const phrase = this.phrases.find(p => p.id === phraseId) || this.currentPhrase;
        if (!phrase) return null;
        
        return JSON.stringify({
            version: '1.0',
            tempo: phrase.tempo,
            notes: phrase.notes.map(n => ({
                pitch: n.midiNote,
                velocity: n.velocity,
                time: n.startTime,
                duration: n.duration
            })),
            loopStart: phrase.loopStart,
            loopEnd: phrase.loopEnd
        });
    },
    
    // Import phrase from exported data
    importPhrase(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            const phrase = {
                id: `phrase_imported_${Date.now()}`,
                notes: data.notes.map(n => ({
                    midiNote: n.pitch,
                    velocity: n.velocity,
                    startTime: n.time,
                    duration: n.duration,
                    noteId: `${n.pitch}_${Date.now()}_${Math.random()}`
                })),
                tempo: data.tempo || 120,
                loopStart: data.loopStart || 0,
                loopEnd: data.loopEnd || data.notes.reduce((max, n) => Math.max(max, n.time + (n.duration || 0.5)), 0),
                duration: 0,
                createdAt: Date.now()
            };
            phrase.duration = phrase.loopEnd;
            
            this.phrases.push(phrase);
            this.currentPhrase = phrase;
            return true;
        } catch(e) {
            console.error('Failed to import phrase:', e);
            return false;
        }
    }
};

// ===== INITIALIZATION =====

function initAdvancedArpSeq() {
    StepProbability.init();
    ScaleLock.init();
    
    window.PROSynth.AdvancedArpSeq.probability = StepProbability;
    window.PROSynth.AdvancedArpSeq.ratcheting = RatchetingSystem;
    window.PROSynth.AdvancedArpSeq.scaleLock = ScaleLock;
    window.PROSynth.AdvancedArpSeq.recorder = PhraseRecorder;
    window.PROSynth.AdvancedArpSeq.initialized = true;
    
    console.log('🎼 Advanced Arp/Seq initialized (Probability, Ratcheting, Scale Lock, Phrase Recorder)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedArpSeq);
} else {
    initAdvancedArpSeq();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StepProbability, RatchetingSystem, ScaleLock, PhraseRecorder };
}
