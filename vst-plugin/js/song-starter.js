        // ===== SONG STARTER SYSTEM - PROFESSIONAL MELODY ENGINE =====
        
        // Music Theory Engine
        const SCALES = {
            'Major': [0, 2, 4, 5, 7, 9, 11],
            'Minor': [0, 2, 3, 5, 7, 8, 10],
            'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
            'Dorian': [0, 2, 3, 5, 7, 9, 10],
            'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'Pentatonic Major': [0, 2, 4, 7, 9],
            'Pentatonic Minor': [0, 3, 5, 7, 10],
            'Blues': [0, 3, 5, 6, 7, 10],
            'Phrygian': [0, 1, 3, 5, 7, 8, 10],
            'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };
        
        // TIME-TESTED MELODY PATTERNS - Used by professional producers worldwide
        const MELODY_PATTERNS = {
            // Arpeggio patterns (most common in electronic music)
            arpeggios: {
                'Up Arp': (deg, scale, root) => [deg, deg+2, deg+4, deg+7].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Down Arp': (deg, scale, root) => [deg+7, deg+4, deg+2, deg].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Up-Down Arp': (deg, scale, root) => [deg, deg+2, deg+4, deg+7, deg+4, deg+2].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Triad Bounce': (deg, scale, root) => [deg, deg+4, deg+2, deg+7, deg+4, deg].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Extended 7th': (deg, scale, root) => [deg, deg+2, deg+4, deg+7, deg+9, deg+11].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12).slice(0,6),
                'Guitar Roll': (deg, scale, root) => [deg, deg, deg+4, deg, deg+7, deg, deg+4, deg].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Piano Cascade': (deg, scale, root) => [deg, deg+2, deg, deg+4, deg+2, deg+7, deg+4, deg+9].map(d => root + scale[d % scale.length] + Math.floor(d/scale.length)*12),
                'Randomized Arp': (deg, scale, root) => {
                    const base = [deg, deg+2, deg+4, deg+7];
                    return base.sort(() => Math.random() - 0.5).slice(0,4).map(d => root + scale[d % scale.length]);
                }
            },
            // Scale run patterns (used in solos and fills)
            scaleRuns: {
                'Ascending Run': (scale, root, startOctave) => {
                    const notes = [];
                    for(let o=0; o<2; o++) for(let i=0; i<scale.length; i++) notes.push(root + scale[i] + (startOctave+o)*12);
                    return notes.slice(0, 16);
                },
                'Descending Run': (scale, root, startOctave) => {
                    const notes = [];
                    for(let o=1; o>=0; o--) for(let i=scale.length-1; i>=0; i--) notes.push(root + scale[i] + (startOctave+o)*12);
                    return notes.slice(0, 16);
                },
                'Pentatonic Blaster': (scale, root, oct) => {
                    const penta = [0, 2, 4, 7, 9]; // Relative positions
                    const notes = [];
                    for(let o=0; o<=1; o++) penta.forEach(p => notes.push(root + p + (oct+o)*12));
                    for(let o=1; o>=0; o--) penta.reverse().forEach((p,i) => { if(o===1||i>0) notes.push(root + p + (oct+o)*12); });
                    return notes.slice(0, 16);
                },
                'Thirds Intervals': (scale, root, oct) => {
                    const notes = [];
                    for(let i=0; i<scale.length-2; i++) {
                        notes.push(root + scale[i] + oct*12);
                        notes.push(root + scale[(i+2)%scale.length] + oct*12);
                    }
                    return notes.slice(0, 16);
                },
                'Scale Zigzag': (scale, root, oct) => {
                    const allNotes = [];
                    for(let o=0; o<2; o++) for(let i=0; i<scale.length; i++) allNotes.push(root + scale[i] + (oct+o)*12);
                    const notes = [];
                    let dir = 1, idx = 0;
                    for(let i=0; i<16 && idx < allNotes.length; i++) {
                        notes.push(allNotes[idx]);
                        if(idx === 0) dir = 1;
                        if(idx >= allNotes.length - 1) dir = -1;
                        idx += dir;
                    }
                    return notes;
                }
            },
            // Chord-based patterns (for pads and harmonic content)
            chordPatterns: {
                'I-V-vi-IV Progression': (root, scale) => [
                    [root, root+scale[4]%12, root+scale[7]%12],
                    [root+scale[7]%12, root+scale[11]%12, root+scale[14]%12],
                    [root+scale[9]%12, root+scale[12]%12, root+scale[16]%12],
                    [root+scale[5]%12, root+scale[9]%12, root+scale[12]%12]
                ],
                'Jazz ii-V-I-vi': (root, scale) => [
                    [root+scale[2]%12, root+scale[5]%12, root+scale[9]%12],
                    [root+scale[7]%12, root+scale[11]%12, root+scale[14]%12],
                    [root, root+scale[4]%12, root+scale[7]%12],
                    [root+scale[9]%12, root+scale[12]%12, root+scale[16]%12]
                ],
                'Power Chord Stabs': (root, scale) => [
                    [root, root+7], [root+5, root+12], [root+7, root+14], [root, root+7]
                ],
                'Suspended Flow': (root, scale) => [
                    [root, root+2, root+7], [root+5, root+7, root+12], [root+7, root+9, root+14], [root, root+2, root+7]
                ]
            },
            // Rhythmic patterns (note durations as gate percentages)
            rhythmicPatterns: {
                'Four-on-Floor': () => [95, 30, 30, 30, 95, 30, 30, 30, 95, 30, 30, 30, 95, 30, 30, 30],
                'Eighth Pulse': () => [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
                'Syncopated': () => [90, 20, 40, 70, 25, 85, 15, 60, 75, 20, 45, 80, 30, 55, 20, 90],
                'Trap Hi-Hat Style': () => [60, 15, 85, 15, 50, 15, 90, 15, 65, 15, 80, 15, 45, 15, 95, 15],
                'Bounce Groove': () => [88, 35, 22, 42, 78, 28, 18, 52, 82, 38, 25, 48, 72, 32, 20, 58],
                'Staccato Burst': () => [45, 10, 48, 12, 52, 10, 45, 15, 48, 10, 52, 12, 45, 10, 48, 15],
                'Legato Flow': () => [100, 100, 98, 100, 100, 98, 100, 100, 98, 100, 100, 98, 100, 100, 98, 100],
                'Swing Feel': () => [85, 40, 75, 35, 88, 42, 72, 38, 82, 40, 78, 36, 86, 44, 74, 34]
            }
        };
        
        const CHORDS = {
            // chord type: [intervals from root]
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'maj7': [0, 4, 7, 11],
            'min7': [0, 3, 7, 10],
            'dom7': [0, 4, 7, 10],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            'power': [0, 7]
        };
        
        // Melodic contour patterns
        const CONTOURS = {
            ascending: (pos) => pos,
            descending: (pos) => 1 - pos,
            arch: (pos) => pos < 0.5 ? pos * 2 : 2 - pos * 2,
            valley: (pos) => pos < 0.5 ? 1 - pos * 2 : (pos - 0.5) * 2,
            wave: (pos) => Math.sin(pos * Math.PI * 2) * 0.5 + 0.5,
            random: () => Math.random()
        };
        
        // Intelligent melody generator
        class MelodyGenerator {
            constructor(scale, rootNote, genreConfig) {
                this.scale = scale;
                this.root = rootNote; // MIDI note number
                this.config = genreConfig;
                this.scaleNotes = SCALES[scale].map(i => root + i);
                this.currentStep = 0;
                this.pattern = [];
                this.chordProgression = [];
            }
            
            getScaleDegree(degree) {
                const octaveOffset = Math.floor(degree / this.scaleNotes.length);
                const idx = ((degree % this.scaleNotes.length) + this.scaleNotes.length) % this.scaleNotes.length;
                return this.scaleNotes[idx] + (octaveOffset * 12);
            }
            
            getChordTones(rootDegree, chordType = 'major') {
                const root = this.getScaleDegree(rootDegree);
                return CHORDS[chordType].map(interval => root + interval);
            }
            
            isChordTone(note, chordRoot, chordType = 'major') {
                const tones = this.getChordTones(chordRoot, chordType).map(t => t % 12);
                return tones.includes(note % 12);
            }
            
            isScaleTone(note) {
                return this.scaleNotes.map(n => n % 12).includes(note % 12);
            }
            
            getPassingTone(fromNote, toNote) {
                const diff = toNote - fromNote;
                if (Math.abs(diff) === 1 || Math.abs(diff) === 2) return null;
                const mid = fromNote + Math.sign(diff);
                // Prefer scale tone, accept chromatic
                if (this.isScaleTone(mid)) return mid;
                return fromNote + Math.sign(diff) * 2;
            }
            
            getApproachTone(targetNote, fromAbove = true) {
                const approach = targetNote + (fromAbove ? 1 : -1);
                if (this.isScaleTone(approach)) return approach;
                return targetNote + (fromAbove ? 2 : -2);
            }
            
            generatePattern(length = 16) {
                const pattern = [];
                let currentPos = 0.5;
                const contourFn = CONTOURS[this.config.contour || 'wave'];
                const useChords = this.config.useChords || false;
                
                // Generate chord progression if needed
                if (useChords && this.config.chordProgression) {
                    this.chordProgression = this.generateChordProgression();
                }
                
                for (let i = 0; i < length; i++) {
                    currentPos = (i / length);
                    const contourValue = typeof contourFn === 'function' ? contourFn(currentPos) : contourFn();
                    
                    // Determine which chord we're on (if using chords)
                    const chordIdx = useChords ? Math.floor((i / length) * this.chordProgression.length) % this.chordProgression.length : 0;
                    const currentChord = useChords ? this.chordProgression[chordIdx] : null;
                    
                    // Generate note(s) based on genre intelligence
                    const notes = this.generateIntelligentNote(i, contourValue, currentChord, length);
                    
                    pattern.push({
                        notes: notes,
                        velocity: this.generateVelocity(i, length),
                        duration: this.generateDuration(i, length),
                        probability: this.config.probabilityVariation ? (85 + Math.random() * 15) : 100,
                        step: i
                    });
                }
                
                this.pattern = pattern;
                return pattern;
            }
            
            generateIntelligentNote(stepIndex, contourValue, currentChord, totalSteps) {
                const config = this.config;
                const notes = [];
                
                // Map contour to pitch range
                const range = (config.pitchRange || 12); // semitones
                const basePitch = this.root + (config.octaveCenter || 4) * 12;
                const targetPitch = basePitch + (contourValue - 0.5) * range;
                
                // Snap to nearest scale tone
                const snappedPitch = this.snapToScale(targetPitch);
                
                if (currentChord && Math.random() < (config.chordToneWeight || 0.7)) {
                    // Emphasize chord tones
                    const chordTones = this.getChordTones(currentChord.degree, currentChord.type);
                    const closestChordTone = chordTones.reduce((prev, curr) => 
                        Math.abs(curr - snappedPitch) < Math.abs(prev - snappedPitch) ? curr : prev
                    );
                    notes.push(closestChordTone);
                    
                    // Add harmony sometimes
                    if (config.harmony && Math.random() < config.harmonyChance || 0.15) {
                        const third = chordTones.find(t => t === closestChordTone + 4 || t === closestChordTone + 3);
                        const fifth = chordTones.find(t => t === closestChordTone + 7);
                        if (fifth && Math.random() < 0.5) notes.push(fifth);
                        else if (third) notes.push(third);
                    }
                } else {
                    notes.push(snappedPitch);
                    
                    // Add passing/approach tones for melodic interest
                    if (stepIndex > 0 && this.pattern.length > 0) {
                        const prevNote = this.pattern[this.pattern.length - 1].notes[0];
                        if (Math.random() < (config.passingToneChance || 0.2)) {
                            const passing = this.getPassingTone(prevNote, snappedPitch);
                            if (passing && Math.abs(passing - prevNote) <= 5) {
                                notes[0] = passing; // Replace with passing tone
                            }
                        }
                    }
                }
                
                // Add octave jumps for energy (genre-dependent)
                if (config.octaveJumps && Math.random() < (config.octaveJumpChance || 0.1)) {
                    const octaveShift = Math.random() < 0.5 ? 12 : -12;
                    notes[0] += octaveShift;
                }
                
                // Rests for rhythmic variety
                if (config.restChance && Math.random() < config.restChance) {
                    return []; // Rest
                }
                
                return notes.filter(n => n >= 21 && n <= 108); // Valid MIDI range
            }
            
            snapToScale(pitch) {
                const normalized = ((pitch - this.root) % 12 + 12) % 12;
                let closest = this.scaleNotes[0];
                let minDiff = 12;
                
                for (const scaleNote of this.scaleNotes) {
                    const diff = Math.abs((scaleNote % 12) - normalized);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = scaleNote;
                    }
                }
                
                // Find correct octave
                const octave = Math.floor((pitch - this.root) / 12);
                return this.root + (closest - this.root % 12 + 12) % 12 + octave * 12;
            }
            
            generateVelocity(step, total) {
                const config = this.config;
                const baseVel = config.baseVelocity || 100;
                
                // Accent on beats
                const beatStrength = [1.1, 0.9, 1.05, 0.95, 1.1, 0.9, 1.05, 0.95][step % 8];
                
                // Crescendo/decrescendo
                const dynamicShape = config.dynamicShape || 'flat';
                let dynamicMultiplier = 1;
                if (dynamicShape === 'crescendo') dynamicMultiplier = 0.7 + (step / total) * 0.5;
                else if (dynamicShape === 'decrescendo') dynamicMultiplier = 1.2 - (step / total) * 0.5;
                else if (dynamicShape === 'arch') dynamicMultiplier = step < total/2 ? 0.8 + (step/(total/2))*0.4 : 1.2 - ((step-total/2)/(total/2))*0.4;
                
                const variation = 1 + (Math.random() - 0.5) * (config.velocityVariation || 0.1);
                
                return Math.round(Math.min(127, Math.max(40, baseVel * beatStrength * dynamicMultiplier * variation)));
            }
            
            generateDuration(step, total) {
                const config = this.config;
                const baseGate = config.gate || 80;
                
                // Shorter notes at end of phrases
                const phraseLength = config.phraseLength || 8;
                const positionInPhrase = step % phraseLength;
                const isPhraseEnd = positionInPhrase === phraseLength - 1;
                
                if (isPhraseEnd && config.phraseEndShorten) return baseGate * 0.5;
                
                // Staccato/legato variation
                if (config.staccatoChance && Math.random() < config.staccatoChance) return baseGate * 0.4;
                if (config.legatoChance && Math.random() < config.legatoChance) return Math.min(120, baseGate * 1.2);
                
                return baseGate + (Math.random() - 0.5) * 20;
            }
            
            generateChordProgression() {
                const progConfig = this.config.chordProgression;
                if (!progConfig) return [{degree: 0, type: 'major'}];
                
                if (typeof progConfig === 'string') {
                    // Named progressions
                    const progressions = {
                        'pop': [
                            {degree: 0, type: 'maj7'}, {degree: 3, type: 'min7'}, 
                            {degree: 4, type: 'dom7'}, {degree: 0, type: 'maj7'}
                        ],
                        'jazz': [
                            {degree: 0, type: 'maj7'}, {degree: 5, type: 'min7'},
                            {degree: 2, type: 'min7'}, {degree: 6, type: 'dom7'},
                            {degree: 3, type: 'maj7'}, {degree: 6, type: 'min7'},
                            {degree: 2, type: 'dom7'}, {degree: 5, type: 'maj7'}
                        ],
                        'classical': [
                            {degree: 0, type: 'major'}, {degree: 5, type: 'major'},
                            {degree: 3, type: 'minor'}, {degree: 0, type: 'major'}
                        ],
                        'edm': [
                            {degree: 0, type: 'power'}, {degree: 0, type: 'power'},
                            {degree: 5, type: 'power'}, {degree: 3, type: 'minor'}
                        ]
                    };
                    return progressions[progConfig] || progressions['pop'];
                }
                
                return progConfig;
            }
        }
        
        // Genre-specific configurations with PROFESSIONAL MELODY parameters
        const songStarters = [
            {
                genre: 'EDM / Festival', icon: '🎆', color: '#FF006E',
                description: 'Euphoric festival drops with soaring leads, massive builds, and energetic arpeggios that fill the arena.',
                soundProfile: { osc1Type:'sawtooth', unisonVoices:8, unisonDetune:18, attack:0.02, decay:0.3, sustain:75, release:0.5, filter1Cutoff:3200, filter1Resonance:30, reverbMix:30, delayTime:350, delayFeedback:40 },
                melodyConfig: {
                    scale: 'Minor', rootNote: 48, // C3
                    contour: 'wave', pitchRange: 16, octaveCenter: 4,
                    useChords: true, chordProgression: 'edm', chordToneWeight: 0.8,
                    baseVelocity: 115, velocityVariation: 0.08,
                    gate: 90, dynamicShape: 'crescendo',
                    octaveJumps: true, octaveJumpChance: 0.15,
                    restChance: 0.02, staccatoChance: 0.1,
                    phraseLength: 8, phraseEndShorten: true,
                    harmony: true, harmonyChance: 0.25,
                    bpm: 128, timeSignature: '4/4'
                }
            },
            {
                genre: 'Hip Hop / Trap', icon: '🎤', color: '#8B5CF6',
                description: 'Dark trap melodies with minor key tension, quick rhythmic patterns, and space between notes.',
                soundProfile: { osc1Type:'sine', unisonVoices:2, unisonDetune:4, attack:0.005, decay:0.4, sustain:60, release:0.3, filter1Cutoff:2500, filter1Resonance:35, reverbMix:40, delayTime:260, delayFeedback:28, driveAmount:25 },
                melodyConfig: {
                    scale: 'Harmonic Minor', rootNote: 45, // A2
                    contour: 'valley', pitchRange: 10, octaveCenter: 4,
                    useChords: false, chordToneWeight: 0.6,
                    baseVelocity: 105, velocityVariation: 0.15,
                    gate: 55, dynamicShape: 'flat',
                    octaveJumps: true, octaveJumpChance: 0.08,
                    restChance: 0.25, staccatoChance: 0.35,
                    phraseLength: 4, phraseEndShorten: false,
                    harmony: false, passingToneChance: 0.3,
                    bpm: 140, timeSignature: '4/4'
                }
            },
            {
                genre: 'Lo-Fi / Chill', icon: '☕', color: '#F59E0B',
                description: 'Nostalgic jazz-influenced melodies with warm tones, laid-back rhythms, and gentle harmonic movement.',
                soundProfile: { osc1Type:'triangle', unisonVoices:3, unisonDetune:6, attack:0.08, decay:0.4, sustain:70, release:1.5, filter1Cutoff:2800, filter1Resonance:12, reverbMix:50, delayTime:380, delayFeedback:32, eqHigh:-6 },
                melodyConfig: {
                    scale: 'Major', rootNote: 52, // E3
                    contour: 'arch', pitchRange: 8, octaveCenter: 4,
                    useChords: true, chordProgression: 'jazz', chordToneWeight: 0.75,
                    baseVelocity: 85, velocityVariation: 0.2,
                    gate: 72, dynamicShape: 'arch',
                    octaveJumps: false,
                    restChance: 0.15, legatoChance: 0.3,
                    phraseLength: 8, phraseEndShorten: true,
                    harmony: true, harmonyChance: 0.3,
                    bpm: 85, timeSignature: '4/4'
                }
            },
            {
                genre: 'Synthwave / Retro', icon: '🌴', color: '#EC4899',
                description: '80s-inspired nostalgic melodies with bright neon leads and driving rhythmic energy.',
                soundProfile: { osc1Type:'sawtooth', unisonVoices:6, unisonDetune:10, attack:0.01, decay:0.25, sustain:70, release:0.4, filter1Cutoff:4000, filter1Resonance:24, reverbMix:42, delayTime:300, delayFeedback:45, chorusDepth:55, chorusRate:3 },
                melodyConfig: {
                    scale: 'Pentatonic Minor', rootNote: 50, // D3
                    contour: 'ascending', pitchRange: 14, octaveCenter: 4,
                    useChords: true, chordProgression: 'pop', chordToneWeight: 0.65,
                    baseVelocity: 110, velocityVariation: 0.06,
                    gate: 82, dynamicShape: 'crescendo',
                    octaveJumps: true, octaveJumpChance: 0.2,
                    restChance: 0.03, staccatoChance: 0.15,
                    phraseLength: 16, phraseEndShorten: false,
                    harmony: false,
                    bpm: 118, timeSignature: '4/4'
                }
            },
            {
                genre: 'Ambient / Cinematic', icon: '🎬', color: '#06B6D4',
                description: 'Evolving atmospheric textures with slow harmonic movement and emotional depth.',
                soundProfile: { osc1Type:'sine', unisonVoices:6, unisonDetune:22, attack:2.0, decay:1.5, sustain:90, release:4.0, filter1Cutoff:1500, filter1Resonance:6, reverbMix:68, delayTime:800, delayFeedback:50, stereoWidth:170 },
                melodyConfig: {
                    scale: 'Dorian', rootNote: 43, // G2
                    contour: 'wave', pitchRange: 6, octaveCenter: 3,
                    useChords: true, chordProgression: 'classical', chordToneWeight: 0.85,
                    baseVelocity: 75, velocityVariation: 0.25,
                    gate: 95, dynamicShape: 'flat',
                    octaveJumps: false,
                    restChance: 0.1, legatoChance: 0.5,
                    phraseLength: 16, phraseEndShorten: false,
                    harmony: true, harmonyChance: 0.4,
                    bpm: 68, timeSignature: '4/4'
                }
            },
            {
                genre: 'House / Tech', icon: '🏠', color: '#10B981',
                description: 'Groovy dancefloor energy with repetitive hypnotic motifs and building momentum.',
                soundProfile: { osc1Type:'square', unisonVoices:3, unisonDetune:5, attack:0.005, decay:0.15, sustain:65, release:0.2, filter1Cutoff:2400, filter1Resonance:28, reverbMix:22, delayTime:170, delayFeedback:25, driveAmount:15 },
                melodyConfig: {
                    scale: 'Mixolydian', rootNote: 47, // B2
                    contour: 'ascending', pitchRange: 7, octaveCenter: 4,
                    useChords: true, chordProgression: 'pop', chordToneWeight: 0.9,
                    baseVelocity: 108, velocityVariation: 0.04,
                    gate: 88, dynamicShape: 'crescendo',
                    octaveJumps: false,
                    restChance: 0.05, staccatoChance: 0.2,
                    phraseLength: 4, phraseEndShorten: false,
                    harmony: false,
                    bpm: 126, timeSignature: '4/4'
                }
            },
            {
                genre: 'Dubstep / Riddim', icon: '💥', color: '#EF4444',
                description: 'Aggressive half-time riddim patterns with wide interval jumps and heavy syncopation.',
                soundProfile: { osc1Type:'sawtooth', unisonVoices:5, unisonDetune:28, attack:0.003, decay:0.12, sustain:55, release:0.15, filter1Cutoff:1800, filter1Resonance:58, reverbMix:15, delayTime:130, delayFeedback:18, driveAmount:55 },
                melodyConfig: {
                    scale: 'Phrygian', rootNote: 43, // G2 (use Blues as fallback)
                    contour: 'random', pitchRange: 18, octaveCenter: 3,
                    useChords: false, chordToneWeight: 0.4,
                    baseVelocity: 120, velocityVariation: 0.12,
                    gate: 50, dynamicShape: 'decrescendo',
                    octaveJumps: true, octaveJumpChance: 0.35,
                    restChance: 0.3, staccatoChance: 0.45,
                    phraseLength: 2, phraseEndShorten: false,
                    harmony: false, passingToneChance: 0.4,
                    bpm: 150, timeSignature: '4/4'
                }
            },
            {
                genre: 'Jazz / Neo-Soul', icon: '🎷', color: '#F97316',
                description: 'Sophisticated harmonies with extended chords, voice leading, and expressive phrasing.',
                soundProfile: { osc1Type:'triangle', unisonVoices:3, unisonDetune:3, attack:0.008, decay:0.35, sustain:55, release:1.0, filter1Cutoff:5000, filter1Resonance:15, reverbMix:40, delayTime:270, delayFeedback:22, chorusDepth:35, chorusRate:2.5, eqMid:3 },
                melodyConfig: {
                    scale: 'Major', rootNote: 53, // F3
                    contour: 'valley', pitchRange: 10, octaveCenter: 4,
                    useChords: true, chordProgression: 'jazz', chordToneWeight: 0.8,
                    baseVelocity: 88, velocityVariation: 0.22,
                    gate: 78, dynamicShape: 'arch',
                    octaveJumps: false,
                    restChance: 0.12, legatoChance: 0.4,
                    phraseLength: 8, phraseEndShorten: true,
                    harmony: true, harmonyChance: 0.35,
                    bpm: 95, timeSignature: '4/4'
                }
            },
            {
                genre: 'Rock / Metal', icon: '🎸', color: '#DC2626',
                description: 'Powerful anthemic riffs with strong rhythmic drive and pentatonic intensity.',
                soundProfile: { osc1Type:'square', unisonVoices:4, unisonDetune:8, attack:0.001, decay:0.2, sustain:68, release:0.2, filter1Cutoff:3600, filter1Resonance:38, reverbMix:18, delayTime:110, delayFeedback:15, driveAmount:70, compRatio:10, compMakeup:6 },
                melodyConfig: {
                    scale: 'Pentatonic Minor', rootNote: 46, // Bb2
                    contour: 'descending', pitchRange: 14, octaveCenter: 4,
                    useChords: true, chordProgression: 'classical', chordToneWeight: 0.7,
                    baseVelocity: 118, velocityVariation: 0.06,
                    gate: 85, dynamicShape: 'decrescendo',
                    octaveJumps: true, octaveJumpChance: 0.18,
                    restChance: 0.08, staccatoChance: 0.25,
                    phraseLength: 4, phraseEndShorten: false,
                    harmony: false,
                    bpm: 135, timeSignature: '4/4'
                }
            },
            {
                genre: 'Classical / Orchestral', icon: '🎻', color: '#7C3AED',
                description: 'Elegant orchestral melodies with proper voice leading and classical phrasing.',
                soundProfile: { osc1Type:'sawtooth', unisonVoices:10, unisonDetune:5, attack:1.5, decay:0.5, sustain:85, release:2.8, filter1Cutoff:2800, filter1Resonance:8, reverbMix:65, delayTime:420, delayFeedback:35, stereoWidth:150, eqLow:2, eqHigh:4 },
                melodyConfig: {
                    scale: 'Major', rootNote: 50, // D3
                    contour: 'arch', pitchRange: 12, octaveCenter: 4,
                    useChords: true, chordProgression: 'classical', chordToneWeight: 0.88,
                    baseVelocity: 92, velocityVariation: 0.18,
                    gate: 88, dynamicShape: 'arch',
                    octaveJumps: false,
                    restChance: 0.08, legatoChance: 0.35,
                    phraseLength: 8, phraseEndShorten: true,
                    harmony: true, harmonyChance: 0.28,
                    bpm: 78, timeSignature: '4/4'
                }
            },
            {
                genre: 'Pop / Top 40', icon: '⭐', color: '#EAB308',
                description: 'Catchy memorable hooks with singable melodies and radio-friendly production.',
                soundProfile: { osc1Type:'sawtooth', unisonVoices:4, unisonDetune:6, attack:0.015, decay:0.22, sustain:65, release:0.35, filter1Cutoff:4500, filter1Resonance:18, reverbMix:28, delayTime:230, delayFeedback:30, chorusDepth:30, chorusRate:2, eqHigh:4 },
                melodyConfig: {
                    scale: 'Major', rootNote: 52, // E3
                    contour: 'wave', pitchRange: 9, octaveCenter: 4,
                    useChords: true, chordProgression: 'pop', chordToneWeight: 0.82,
                    baseVelocity: 102, velocityVariation: 0.1,
                    gate: 82, dynamicShape: 'crescendo',
                    octaveJumps: false,
                    restChance: 0.05, staccatoChance: 0.1,
                    phraseLength: 8, phraseEndShorten: true,
                    harmony: true, harmonyChance: 0.2,
                    bpm: 110, timeSignature: '4/4'
                }
            },
            {
                genre: 'Drill / Phonk', icon: '🔥', color: '#991B1B',
                description: 'Dark atmospheric melodies with chromatic tension and trap-influenced rhythms.',
                soundProfile: { osc1Type:'sine', unisonVoices:2, unisonDetune:10, attack:0.006, decay:0.5, sustain:45, release:0.8, filter1Cutoff:3000, filter1Resonance:45, reverbMix:45, delayTime:320, delayFeedback:38, driveAmount:30 },
                melodyConfig: {
                    scale: 'Harmonic Minor', rootNote: 44, // Ab2
                    contour: 'valley', pitchRange: 11, octaveCenter: 4,
                    useChords: false, chordToneWeight: 0.5,
                    baseVelocity: 112, velocityVariation: 0.14,
                    gate: 58, dynamicShape: 'flat',
                    octaveJumps: true, octaveJumpChance: 0.12,
                    restChance: 0.2, staccatoChance: 0.3,
                    phraseLength: 4, phraseEndShorten: false,
                    harmony: false, passingToneChance: 0.35,
                    bpm: 145, timeSignature: '4/4'
                }
            }
        ];
        
        // Populate genre grid
        const genreGrid = document.getElementById('genreGrid');
        if(genreGrid) {
            songStarters.forEach(starter => {
                const btn = document.createElement('button');
                btn.className = 'genre-btn';
                btn.style.cssText = `padding:12px 8px;background:var(--bg-section);border:1px solid ${starter.color}40;border-radius:8px;color:var(--text);cursor:pointer;text-align:center;transition:all 0.2s;font-size:10px;`;
                btn.innerHTML = `<div style="font-size:20px;margin-bottom:4px;">${starter.icon}</div><div style="font-weight:600;">${starter.genre}</div>`;
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = `${starter.color}20`;
                    btn.style.borderColor = starter.color;
                    btn.style.transform = 'translateY(-2px)';
                    showSongStarterInfo(starter);
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'var(--bg-section)';
                    btn.style.borderColor = `${starter.color}40`;
                    btn.style.transform = 'none';
                });
                btn.addEventListener('click', () => applySongStarter(starter));
                genreGrid.appendChild(btn);
            });
        }
        
        // Pattern type selector handler
        document.getElementById('patternTypeSelect')?.addEventListener('change', (e) => {
            currentPatternType = e.target.value;
        });
        
        // Randomize pattern button (re-generate with same genre)
        document.getElementById('randomizePatternBtn')?.addEventListener('click', () => {
            if(window.currentMelodyState && window.currentMelodyState.getStarter) {
                const starter = window.currentMelodyState.getStarter();
                applySongStarter(starter);
            } else {
                showNotification('🎵 Select a genre first!', true);
            }
        });
        
        // Play melody button (manual trigger - no auto-play!)
        document.getElementById('playMelodyBtn')?.addEventListener('click', () => {
            if(window.currentSongStarterPattern && window.currentSongStarterConfig && window.currentSongStarterData) {
                startMelodyPlayback(
                    window.currentSongStarterPattern, 
                    window.currentSongStarterConfig, 
                    window.currentSongStarterData
                );
                showNotification(`▶ Playing: ${window.currentSongStarterPatternInfo?.name || 'Pattern'}`, true);
            } else {
                showNotification('🎵 Select a genre first!', true);
            }
        });
        
        // Stop melody button
        document.getElementById('stopMelodyBtn')?.addEventListener('click', () => {
            stopMelodyPlayback();
            showNotification('⏹ Playback stopped', true);
        });
        
        // Active melody player state
        let activeMelodyPlayer = null;
        let melodyTimeoutId = null;
        
        function showSongStarterInfo(starter) {
            const info = document.getElementById('songStarterInfo');
            const title = document.getElementById('starterTitle');
            const desc = document.getElementById('starterDescription');
            const params = document.getElementById('starterParams');
            if(!info || !title || !desc || !params) return;
            
            info.style.display = 'block';
            title.textContent = `${starter.icon} ${starter.genre}`;
            desc.textContent = starter.description;
            
            const mc = starter.melodyConfig;
            params.innerHTML = `
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">🎵 Scale: ${mc.scale}</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">🎼 Contour: ${mc.contour}</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">⏱️ BPM: ${mc.bpm}</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">🎹 Range: ${mc.pitchRange}st</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">🔊 Vel: ${mc.baseVelocity}</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">🎵 Chords: ${mc.useChords ? 'Yes' : 'No'}</span>
                <span style="background:${starter.color}20;color:${starter.color};padding:3px 8px;border-radius:4px;font-size:8px;">📐 Time: ${mc.timeSignature}</span>
            `;
        }
        
        // Pattern randomizer state
        let currentPatternType = 'auto'; // auto, arpeggio, scaleRun, chord, custom
        let lastUsedPatterns = [];
        
        function getRandomTimeTestedPattern(scale, rootNote, config) {
            // Pick from time-tested patterns based on genre characteristics
            const patternTypes = Object.keys(MELODY_PATTERNS);
            const availableTypes = patternTypes.filter(t => !lastUsedPatterns.includes(t) || lastUsedPatterns.length >= patternTypes.length);
            
            // Weight by genre appropriateness
            const weights = {
                arpeggios: ['EDM', 'Festival', 'House', 'Tech', 'Synthwave', 'Trance'].some(g => config.genreName?.includes(g)) ? 0.4 : 0.2,
                scaleRuns: ['Jazz', 'Classical', 'Rock', 'Metal', 'Neo-Soul'].some(g => config.genreName?.includes(g)) ? 0.35 : 0.15,
                chordPatterns: ['Ambient', 'Cinematic', 'Lo-Fi', 'Chill', 'Pop'].some(g => config.genreName?.includes(g)) ? 0.3 : 0.15,
                rhythmicPatterns: ['Hip Hop', 'Trap', 'Drill', 'Phonk', 'Dubstep', 'Riddim'].some(g => config.genreName?.includes(g)) ? 0.35 : 0.2
            };
            
            // Select pattern type
            let selectedType;
            if(currentPatternType !== 'auto') {
                selectedType = currentPatternType;
            } else {
                const rand = Math.random();
                let cumulative = 0;
                selectedType = 'arpeggios'; // default
                for(const [type, weight] of Object.entries(weights)) {
                    cumulative += weight;
                    if(rand < cumulative) {
                        selectedType = type;
                        break;
                    }
                }
            }
            
            // Get specific patterns of this type
            const patterns = MELODY_PATTERNS[selectedType];
            const patternNames = Object.keys(patterns);
            const patternName = patternNames[Math.floor(Math.random() * patternNames.length)];
            
            // Track used patterns for variety
            lastUsedPatterns.push(patternName);
            if(lastUsedPatterns.length > 6) lastUsedPatterns.shift();
            
            return { type: selectedType, name: patternName, fn: patterns[patternName] };
        }
        
        function applySongStarter(starter) {
            // DO NOT change any instrument settings - only generate melody!
            
            const mc = starter.melodyConfig;
            const scale = SCALES[mc.scale];
            const rootNote = mc.rootNote;
            
            // Get a time-tested professional pattern
            const patternInfo = getRandomTimeTestedPattern(scale, rootNote, {...mc, genreName: starter.genre});
            
            // Generate the 16-step pattern using the selected algorithm
            const pattern = generateProfessionalPattern(patternInfo, scale, rootNote, mc, starter);
            
            // Store for later playback (DO NOT auto-play!)
            window.currentSongStarterPattern = pattern;
            window.currentSongStarterConfig = mc;
            window.currentSongStarterData = starter;
            window.currentSongStarterPatternInfo = patternInfo;
            
            // Display the generated pattern in the sequencer UI
            displayGeneratedPattern(pattern, starter, patternInfo.name);
            
            showNotification(`${starter.icon} ${patternInfo.name} ready | Press ▶ to preview`, true);
        }
        
        function generateProfessionalPattern(patternInfo, scale, rootNote, config, starter) {
            const pattern = [];
            const octaveCenter = config.octaveCenter || 4;
            const baseVelocity = config.baseVelocity || 100;
            const velVariation = config.velocityVariation || 0.1;
            
            // Generate based on pattern type
            if(patternInfo.type === 'arpeggios') {
                // Arpeggio pattern - cycle through chord degrees
                const chordDegrees = [0, 2, 4, 7]; // Root, 3rd, 5th, octave
                for(let step = 0; step < 16; step++) {
                    const degreeIndex = step % 4;
                    const octaveOffset = Math.floor(step / 4) % 2;
                    const degree = chordDegrees[degreeIndex] + (config.pitchRange > 12 && octaveOffset ? 12 : 0);
                    
                    try {
                        const notes = patternInfo.fn(degree, scale, rootNote + (octaveCenter-4)*12);
                        const note = notes[Math.min(degreeIndex, notes.length-1)] || rootNote;
                        
                        pattern.push({
                            notes: [Math.round(note)],
                            velocity: Math.round(baseVelocity * (1 + (Math.random()-0.5) * velVariation)),
                            duration: config.gate || 85,
                            probability: 100,
                            step: step
                        });
                    } catch(e) {
                        pattern.push({
                            notes: [rootNote + scale[degree % scale.length]],
                            velocity: baseVelocity,
                            duration: config.gate || 85,
                            probability: 100,
                            step: step
                        });
                    }
                }
            } else if(patternInfo.type === 'scaleRuns') {
                // Scale run pattern
                try {
                    const notes = patternInfo.fn(scale, rootNote, octaveCenter);
                    for(let step = 0; step < 16; step++) {
                        const note = notes[step % notes.length];
                        pattern.push({
                            notes: [typeof note === 'number' ? Math.round(note) : rootNote],
                            velocity: Math.round(baseVelocity * (1 + (Math.random()-0.5) * velVariation)),
                            duration: config.gate || 80,
                            probability: 100,
                            step: step
                        });
                    }
                } catch(e) {
                    // Fallback to simple ascending
                    for(let step = 0; step < 16; step++) {
                        const degree = step % scale.length;
                        const octave = Math.floor(step / scale.length);
                        pattern.push({
                            notes: [rootNote + scale[degree] + octave*12],
                            velocity: baseVelocity,
                            duration: config.gate || 80,
                            probability: 100,
                            step: step
                        });
                    }
                }
            } else if(patternInfo.type === 'chordPatterns') {
                // Chord pattern - play chords on each beat
                try {
                    const chords = patternInfo.fn(rootNote, scale);
                    for(let step = 0; step < 16; step++) {
                        const chordIdx = Math.floor(step / 4) % chords.length;
                        const chord = chords[chordIdx];
                        pattern.push({
                            notes: chord.map(n => typeof n === 'number' ? Math.round(rootNote + n) : rootNote).filter(n => n >= 21 && n <= 108),
                            velocity: Math.round(baseVelocity * (step % 4 === 0 ? 1.1 : 0.95)),
                            duration: config.gate || 90,
                            probability: 100,
                            step: step
                        });
                    }
                } catch(e) {
                    // Fallback to simple triads
                    for(let step = 0; step < 16; step++) {
                        pattern.push({
                            notes: [rootNote, rootNote + 4, rootNote + 7],
                            velocity: baseVelocity * 0.7,
                            duration: config.gate || 90,
                            probability: 100,
                            step: step
                        });
                    }
                }
            } else if(patternInfo.type === 'rhythmicPatterns') {
                // Rhythmic pattern with melodic contour
                const rhythmGates = patternInfo.fn();
                const contourFn = CONTOURS[config.contour || 'wave'];
                
                for(let step = 0; step < 16; step++) {
                    const pos = step / 16;
                    const contourValue = typeof contourFn === 'function' ? contourFn(pos) : contourFn();
                    const range = config.pitchRange || 12;
                    const targetPitch = rootNote + (octaveCenter - 4) * 12 + (contourValue - 0.5) * range;
                    
                    // Snap to scale
                    const normalized = ((targetPitch - rootNote) % 12 + 12) % 12;
                    let closest = scale[0];
                    let minDiff = 12;
                    for(const s of scale) {
                        const diff = Math.abs(s - normalized);
                        if(diff < minDiff) { minDiff = diff; closest = s; }
                    }
                    const snappedPitch = rootNote + closest + Math.round((targetPitch - rootNote - closest) / 12) * 12;
                    
                    // Apply rest chance
                    const isRest = config.restChance && Math.random() < config.restChance;
                    const gate = rhythmGates[step % rhythmGates.length];
                    
                    pattern.push({
                        notes: isRest || gate < 15 ? [] : [Math.round(snappedPitch)],
                        velocity: Math.round(baseVelocity * (gate / 100) * (1 + (Math.random()-0.5) * velVariation)),
                        duration: gate,
                        probability: 100,
                        step: step
                    });
                }
            }
            
            return pattern;
        }
        
        function displayGeneratedPattern(pattern, starter, patternName) {
            const seqContainer = document.getElementById('stepSequencer');
            if(!seqContainer) return;
            
            // Clear existing steps
            seqContainer.innerHTML = '';
            
            // Add pattern name label if provided
            if(patternName) {
                const label = document.createElement('div');
                label.style.cssText = `grid-column: span 16; font-size:9px;color:${starter.color};margin-bottom:6px;text-align:center;font-weight:600;`;
                label.textContent = `🎼 Pattern: ${patternName}`;
                seqContainer.appendChild(label);
            }
            
            // Create visual representation of the melody
            pattern.forEach((step, i) => {
                const stepEl = document.createElement('div');
                stepEl.className = 'step';
                
                // Height based on pitch (higher = taller)
                const hasNotes = step.notes.length > 0;
                const baseHeight = 44;
                const heightVar = hasNotes ? Math.min(20, Math.max(-10, (step.notes[0] || 60) - 60)) : 0;
                
                stepEl.style.cssText = `
                    width: 34px; height: ${baseHeight + heightVar}px;
                    background: ${hasNotes ? starter.color + '45' : 'var(--bg-section)'};
                    border: 2px solid ${hasNotes ? starter.color + '80' : 'var(--border)'};
                    border-radius: 6px;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    font-size: 8px; cursor: pointer;
                    transition: all 0.12s ease;
                    opacity: ${hasNotes ? 1 : 0.5};
                `;
                
                if(hasNotes) {
                    const noteNames = step.notes.map(midiToNoteName).join(step.notes.length > 1 ? '+' : '');
                    const velColor = step.velocity > 110 ? '#FF6B6B' : step.velocity > 90 ? '#FFE66D' : 'var(--text-dim)';
                    stepEl.innerHTML = `<div style="color:${starter.color};font-weight:700;font-size:8px;">${noteNames}</div><div style="color:${velColor};font-size:7px;">${step.velocity}</div>`;
                    stepEl.dataset.midiNotes = step.notes.join(',');
                    stepEl.dataset.velocity = step.velocity;
                } else {
                    stepEl.innerHTML = `<div style="color:var(--text-dim);font-size:10px;">·</div>`;
                    stepEl.dataset.rest = 'true';
                }
                
                stepEl.dataset.step = i;
                seqContainer.appendChild(stepEl);
            });
            
            // Update info panel with pattern details
            const paramsEl = document.getElementById('starterParams');
            if(paramsEl && patternName) {
                const existingPatternTag = paramsEl.querySelector('[data-pattern-tag]');
                if(!existingPatternTag) {
                    const tag = document.createElement('span');
                    tag.dataset.patternTag = 'true';
                    tag.style.cssText = `background:linear-gradient(90deg,${starter.color},${starter.color}80);color:#fff;padding:3px 10px;border-radius:12px;font-size:8px;font-weight:700;text-transform:uppercase;`;
                    tag.textContent = `🎵 ${patternName}`;
                    paramsEl.insertBefore(tag, paramsEl.firstChild);
                } else {
                    existingPatternTag.textContent = `🎵 ${patternName}`;
                }
            }
        }
        
        function midiToNoteName(midi) {
            const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            const octave = Math.floor(midi / 12) - 1;
            const note = notes[midi % 12];
            return `${note}${octave}`;
        }
        
        function startMelodyPlayback(pattern, config, starter) {
            // Stop any existing playback
            stopMelodyPlayback();
            
            initAudio();
            
            // Resume audio context if suspended (browser autoplay policy)
            if(audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    startPlayingLoop(pattern, config, starter);
                });
            } else {
                startPlayingLoop(pattern, config, starter);
            }
        }
        
        function startPlayingLoop(pattern, config, starter) {
            // Get BPM from test input or config (syncs to project tempo when available)
            const testBpm = parseInt(document.getElementById('bpmInput')?.value) || 120;
            const bpm = testBpm;
            // Use proper musical timing: 16th notes at given BPM
            const secondsPerBeat = 60 / bpm;
            const stepDurationSeconds = secondsPerBeat / 4; // 16th note
            const stepDurationMs = stepDurationSeconds * 1000;
            
            let currentStep = 0;
            let isPlaying = true;
            let lastPlayTime = 0;
            let playbackStartTime = audioCtx.currentTime;
            
            window.currentMelodyState = { 
                stop: () => { isPlaying = false; },
                getIsPlaying: () => isPlaying,
                getCurrentStep: () => currentStep,
                getBpm: () => bpm
            };
            
            // More precise timing using AudioContext scheduling
            function scheduleSteps() {
                if(!isPlaying || !audioCtx) return;
                
                const now = audioCtx.currentTime;
                const elapsedTime = now - playbackStartTime;
                const expectedStep = Math.floor(elapsedTime / stepDurationSeconds);
                
                // Catch up if we fell behind (prevents backlog)
                if(expectedStep > currentStep) {
                    currentStep = expectedStep;
                }
                
                // Highlight current step in UI
                const steps = document.querySelectorAll('#stepSequencer .step');
                const patternStep = currentStep % pattern.length;
                
                steps.forEach((s, i) => {
                    const isActive = i === patternStep;
                    s.style.transform = isActive ? 'scale(1.18) translateY(-2px)' : 'scale(1)';
                    s.style.boxShadow = isActive ? `0 0 15px ${starter.color}, 0 0 30px ${starter.color}40` : 'none';
                    s.style.borderColor = isActive ? starter.color : (s.dataset.rest ? 'var(--border)' : starter.color + '50');
                    s.style.background = isActive ? starter.color + '60' : (s.dataset.rest ? 'var(--bg-section)' : starter.color + '30');
                    s.style.zIndex = isActive ? '10' : '1';
                });
                
                // Play the current step's notes
                const step = pattern[patternStep];
                if(step && step.notes.length > 0 && (!step.probability || Math.random() * 100 < step.probability)) {
                    // Calculate precise duration based on gate
                    const noteDurationMs = (step.duration || 80) / 100 * stepDurationMs;
                    step.notes.forEach(midiNote => {
                        playMidiNote(midiNote, step.velocity, noteDurationMs);
                    });
                }
                
                currentStep++;
                
                // Schedule next step using setTimeout (with slight lookahead)
                if(isPlaying) {
                    const nextStepDelay = Math.max(1, stepDurationMs - 5); // Small buffer for accuracy
                    melodyTimeoutId = setTimeout(scheduleSteps, nextStepDelay);
                }
            }
            
            activeMelodyPlayer = { 
                stop: () => { 
                    isPlaying = false; 
                    if(melodyTimeoutId) clearTimeout(melodyTimeoutId); 
                },
                getPattern: () => pattern,
                getConfig: () => config,
                getStarter: () => starter
            };
            
            // Start the loop
            playbackStartTime = audioCtx.currentTime;
            scheduleSteps();
        }
        
        function playMidiNote(midiNote, velocity, durationMs) {
            if(!audioCtx) return;
            
            const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
            const oscType = document.getElementById('osc1Type')?.value || 'sawtooth';
            const masterGain = getKnobValue('masterGain');
            const unison = getKnobValue('unisonVoices');
            const detune = getKnobValue('unisonDetune');
            
            const gainNode = audioCtx.createGain();
            const velGain = velocity / 127;
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(Math.pow(10, masterGain/20) * 0.2 * velGain, audioCtx.currentTime + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
            gainNode.connect(audioCtx.destination);
            
            const voices = [];
            for(let v = 0; v < Math.max(1, unison); v++) {
                const osc = audioCtx.createOscillator();
                const typeMap = { sawtooth:'sawtooth', square:'square', sine:'sine', triangle:'triangle' };
                osc.type = typeMap[oscType] || 'sawtooth';
                osc.frequency.value = freq * (1 + (v - unison/2) * detune * 0.0001);
                osc.detune.value = (v - unison/2) * detune * (100/unison);
                osc.connect(gainNode);
                osc.start();
                osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.05);
                voices.push(osc);
            }
        }
        
        function stopMelodyPlayback() {
            if(activeMelodyPlayer) {
                activeMelodyPlayer.stop();
                activeMelodyPlayer = null;
            }
            if(melodyTimeoutId) {
                clearTimeout(melodyTimeoutId);
                melodyTimeoutId = null;
            }
            
            // Remove highlights from steps
            const steps = document.querySelectorAll('#stepSequencer .step');
            steps.forEach(s => {
                s.style.transform = 'scale(1)';
                s.style.boxShadow = 'none';
            });
        }
        