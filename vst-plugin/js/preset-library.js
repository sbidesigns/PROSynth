/**
 * PROSynth Standard View - Professional Interface
 * Features: Preset Browser, Vibe Search, Visualizers, Patch Tools
 */

// ===== INDUSTRY FAMOUS PRESET LIBRARY =====
const INDUSTRY_PRESETS = {
    // === ICONIC SYNTH LEADS (Top 200 Hits) ===
    leads: [
        {
            name: "SuperSaw Trance",
            artist: "Tiësto / Armin van Buuren style",
            song: "Adagio for Traffic / Blah Blah Blah",
            tags: ["bright", "epic", "trance", "anthem", "powerful", "wide"],
            vibe: ["Epic Lead", "Trance", "Big Room", "Festival"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 16, unisonDetune: 25, attack: 0.01, decay: 0.3, sustain: 85, release: 0.8, filterCutoff: 4200, filterReso: 35, filterEnv: 60, reverbMix: 45, delayTime: 380, delayFeedback: 40 }
        },
        {
            name: "FM Bell Pad",
            artist: "Brian Eno / Tangerine Dream",
            song: "An Ending (Ascent) / Love on a Real Train",
            tags: ["ethereal", "bell", "ambient", "warm", "crystalline", "new age"],
            vibe: ["Ambient", "Bell", "Ethereal", "Cinematic"],
            params: { oscType: 'fm', oscPitch: 0, unisonVoices: 4, unisonDetune: 8, attack: 0.8, decay: 1.2, sustain: 70, release: 2.5, filterCutoff: 2800, filterReso: 15, filterEnv: 20, reverbMix: 65, delayTime: 520, delayFeedback: 50 }
        },
        {
            name: "Sawtooth Power Lead",
            artist: "Daft Punk",
            song: "One More Time / Better Faster Stronger",
            tags: ["funky", "bright", "french-house", "filtered", "groovy", "sharp"],
            vibe: ["Funk", "French House", "Bright Lead", "Filter Sweep"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 8, unisonDetune: 12, attack: 0.005, decay: 0.15, sustain: 90, release: 0.2, filterCutoff: 3500, filterReso: 28, filterEnv: 75, reverbMix: 25, delayTime: 160, delayFeedback: 30 }
        },
        {
            name: "Soft Velvet Lead",
            artist: "Pink Floyd / David Gilmour",
            song: "Shine On You Crazy Diamond / Comfortably Numb",
            tags: ["soft", "warm", "smooth", "expressive", "creamy", "sustained"],
            vibe: ["Soft Lead", "Warm", "Smooth", "Expressive", "Velvet"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 4, unisonDetune: 6, attack: 0.15, decay: 0.4, sustain: 80, release: 1.2, filterCutoff: 2200, filterReso: 18, filterEnv: 25, reverbMix: 55, delayTime: 340, delayFeedback: 35 }
        },
        {
            name: "Brass Supersaw",
            artist: "Skrillex / Diplo",
            song: "Where Are Ü Now / Bangarang",
            tags: ["brassy", "edgy", "modern", "metallic", "aggressive", "future-bass"],
            vibe: ["Brass Lead", "Edgy", "Modern", "Future Bass", "Aggressive"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 12, unisonDetune: 18, attack: 0.002, decay: 0.2, sustain: 75, release: 0.3, filterCutoff: 5200, filterReso: 42, filterEnv: 70, reverbMix: 30, delayTime: 130, delayFeedback: 25 }
        },
        {
            name: "Minimoog Style Lead",
            artist: "Yes / Rick Wakeman",
            song: "Roundabout / Owner of a Lonely Heart",
            tags: ["classic", "fat", "analog", "warm", "vintage", "progressive"],
            vibe: ["Classic Analog", "Fat Lead", "Vintage", "Progressive Rock", "Moog"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 2, unisonDetune: 4, attack: 0.02, decay: 0.25, sustain: 78, release: 0.5, filterCutoff: 2800, filterReso: 32, filterEnv: 55, reverbMix: 35, delayTime: 260, delayFeedback: 30 }
        },
        {
            name: "Glassy Digital Lead",
            artist: "Coldplay",
            song: "Clocks / Speed of Sound",
            tags: ["glassy", "bright", "digital", "clean", "pop", "anthemic"],
            vibe: ["Digital Lead", "Glassy", "Clean", "Pop", "Anthemic"],
            params: { oscType: 'sine', oscPitch: 0, unisonVoices: 3, unisonDetune: 10, attack: 0.01, decay: 0.18, sustain: 82, release: 0.6, filterCutoff: 5500, filterReso: 8, filterEnv: 15, reverbMix: 40, delayTime: 400, delayFeedback: 38 }
        },
        {
            name: "Dark Cinematic Lead",
            artist: "Hans Zimmer / Trent Reznor",
            song: "Inception Horn / The Social Network",
            tags: ["dark", "cinematic", "powerful", "dramatic", "intense", "film-score"],
            vibe: ["Dark", "Cinematic", "Dramatic", "Film Score", "Intense"],
            params: { oscType: 'sawtooth', oscPitch: -12, unisonVoices: 8, unisonDetune: 14, attack: 0.3, decay: 0.5, sustain: 72, release: 1.5, filterCutoff: 1800, filterReso: 38, filterEnv: 40, reverbMix: 58, delayTime: 600, delayFeedback: 45 }
        }
    ],
    
    // === BASS SOUNDS ===
    basses: [
        {
            name: "Reese Bass",
            artist: "Noisia / The Prodigy",
            song: "Stampede / Omen",
            tags: ["deep", "phasing", "dnb", "neurofunk", "powerful", "moving"],
            vibe: ["Deep Bass", "Reese", "DnB", "Neurofunk", "Phasing"],
            params: { oscType: 'sawtooth', oscPitch: -24, unisonVoices: 2, unisonDetune: 22, attack: 0.01, decay: 0.3, sustain: 90, release: 0.15, filterCutoff: 450, filterReso: 18, filterEnv: 35, driveAmount: 35, driveTone: 40 }
        },
        {
            name: "808 Trap Bass",
            artist: "Metro Boomin / Future",
            song: "Mask Off / Bad and Boujee",
            tags: ["trap", "sub-bass", "hip-hop", "heavy", "punchy", "modern"],
            vibe: ["Trap Bass", "808", "Sub Bass", "Hip Hop", "Heavy"],
            params: { oscType: 'sine', oscPitch: -24, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.4, sustain: 60, release: 0.5, filterCutoff: 200, filterReso: 5, filterEnv: 10, driveAmount: 25, driveTone: 30 }
        },
        {
            name: "Acid TB-303",
            artist: "Phuture / Daft Punk",
            song: "Acid Tracks / Rollin' & Scratchin'",
            tags: ["acid", "squelchy", "resonant", "electronic", "raw", "underground"],
            vibe: ["Acid", "303", "Squelchy", "Electronic", "Raw"],
            params: { oscType: 'sawtooth', oscPitch: -12, unisonVoices: 1, unisonDetune: 0, attack: 0.01, decay: 0.5, sustain: 50, release: 0.1, filterCutoff: 1200, filterReso: 85, filterEnv: 95, resonanceMod: true }
        },
        {
            name: "Funky Slap Bass",
            artist: "Stevie Wonder / Jamiroquai",
            song: "Superstition / Virtual Insanity",
            tags: ["funky", "bouncy", "groovy", "slap", "rhythmic", "fun"],
            vibe: ["Funky Bass", "Slap Bass", "Groovy", "Bouncy", "Rhythmic"],
            params: { oscType: 'square', oscPitch: -12, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.08, sustain: 70, release: 0.05, filterCutoff: 1800, filterReso: 22, filterEnv: 45, lfo1Rate: 4.5, lfo1Depth: 20, lfo1Target: 'cutoff' }
        },
        {
            name: "Deep Sub House",
            artist: "Deadmau5 / Eric Prydz",
            song: "Strobe / Pjanoo",
            tags: ["deep", "house", "warm", "rolling", "underground", "hypnotic"],
            vibe: ["Deep House", "Sub Bass", "Warm", "Rolling", "Hypnotic"],
            params: { oscType: 'sine', oscPitch: -24, unisonVoices: 1, unisonDetune: 0, attack: 0.1, decay: 0.6, sustain: 75, release: 0.8, filterCutoff: 350, filterReso: 8, filterEnv: 15, reverbMix: 30, delayTime: 440, delayFeedback: 35 }
        },
        {
            name: "Growling Dubstep",
            artist: "Skrillex / Excision",
            song: "Bangarang / Existence",
            tags: ["growl", "aggressive", "dirty", "metallic", "mid-range", "monster"],
            vibe: ["Dubstep", "Growl", "Aggressive", "Dirty", "Monster Bass"],
            params: { oscType: 'sawtooth', oscPitch: -12, unisonVoices: 3, unisonDetune: 28, attack: 0.002, decay: 0.2, sustain: 65, release: 0.15, filterCutoff: 800, filterReso: 55, filterEnv: 80, lfo1Rate: 6.2, lfo1Depth: 45, lfo1Target: 'cutoff' }
        }
    ],
    
    // === PADS & ATMOSPHERICS ===
    pads: [
        {
            name: "Heavenly Choir Pad",
            artist: "Enya / Hans Zimmer",
            song: "Only Time / Gladiator Soundtrack",
            tags: ["ethereal", "choir-like", "heavenly", "spiritual", "vast", "emotional"],
            vibe: ["Choir Pad", "Ethereal", "Heavenly", "Emotional", "Vast"],
            params: { oscType: 'sine', oscPitch: 0, unisonVoices: 8, unisonDetune: 15, attack: 1.5, decay: 2.0, sustain: 85, release: 3.0, filterCutoff: 3200, filterReso: 8, filterEnv: 10, reverbMix: 75, delayTime: 800, delayFeedback: 55, chorusDepth: 45, chorusRate: 0.8 }
        },
        {
            name: "Warm Analog Pad",
            artist: "Vangelis / Jean-Michel Jarre",
            song: "Blade Runner Theme / Oxygène Part IV",
            tags: ["warm", "analog", "lush", "dreamy", "spacey", "classic"],
            vibe: ["Warm Pad", "Analog", "Lush", "Dreamy", "Classic Synth"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 6, unisonDetune: 10, attack: 0.8, decay: 1.2, sustain: 78, release: 2.0, filterCutoff: 2400, filterReso: 12, filterEnv: 18, reverbMix: 60, delayTime: 500, delayFeedback: 40, chorusDepth: 35, chorusRate: 1.2 }
        },
        {
            name: "Dark Ambient Drone",
            artist: "Aphex Twin / Brian Eno",
            song: "Selected Ambient Works 85-92 / Music for Airports",
            tags: ["dark", "atmospheric", "drone", "textural", "mysterious", "deep"],
            vibe: ["Dark Ambient", "Drone", "Textural", "Mysterious", "Deep"],
            params: { oscType: 'noise', oscPitch: -12, unisonVoices: 4, unisonDetune: 25, attack: 2.5, decay: 3.0, sustain: 90, release: 4.0, filterCutoff: 900, filterReso: 20, filterEnv: 5, reverbMix: 80, delayTime: 1200, delayFeedback: 60, lfo1Rate: 0.15, lfo1Depth: 30, lfo1Target: 'cutoff' }
        },
        {
            name: "String Ensemble",
            artist: "Isao Tomita / Wendy Carlos",
            song: "The Planets / Switched-On Bach",
            tags: ["orchestral", "strings", "lush", "cinematic", "romantic", "rich"],
            vibe: ["Strings", "Orchestral", "Lush", "Cinematic", "Romantic"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 7, unisonDetune: 8, attack: 0.4, decay: 0.8, sustain: 80, release: 1.5, filterCutoff: 3500, filterReso: 6, filterEnv: 12, reverbMix: 55, delayTime: 180, delayFeedback: 25, chorusDepth: 50, chorusRate: 1.8 }
        }
    ],
    
    // === PLUCKS & KEYS ===
    plucks: [
        {
            name: "Electric Piano MK1",
            artist: "Stevie Wonder / Billy Joel",
            song: "Living for the City / Piano Man",
            tags: ["electric-piano", "bell-like", "warm", "vintage", "soulful", "rhodes-style"],
            vibe: ["Electric Piano", "Rhodes", "Bell Keys", "Warm", "Soulful"],
            params: { oscType: 'fm', oscPitch: 0, unisonVoices: 2, unisonDetune: 3, attack: 0.002, decay: 0.9, sustain: 35, release: 0.8, filterCutoff: 4000, filterReso: 20, filterEnv: 25, driveAmount: 15, reverbMix: 35, delayTime: 220, delayFeedback: 30 }
        },
        {
            name: "Marimba Pluck",
            artist: "Jacob Collier / Pat Metheny",
            song: "In My Room / The Way Up",
            tags: ["wooden", "percussive", "organic", "bright", "playful", "acoustic"],
            vibe: ["Marimba", "Pluck", "Organic", "Percussive", "Bright"],
            params: { oscType: 'fm', oscPitch: 0, unisonVoices: 2, unisonDetune: 2, attack: 0.001, decay: 0.4, sustain: 10, release: 0.3, filterCutoff: 5500, filterReso: 12, filterEnv: 40, reverbMix: 25, delayTime: 150, delayFeedback: 20 }
        },
        {
            name: "Glockenspiel Bell",
            artist: "Ludovico Einaudi / Yann Tiersen",
            song: "Nuvole Bianche / Comptine d'un autre été",
            tags: ["bell", "crystalline", "delicate", "magical", "sparkling", "minimalist"],
            vibe: ["Glockenspiel", "Bell", "Crystalline", "Delicate", "Magical"],
            params: { oscType: 'sine', oscPitch: 12, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.5, sustain: 5, release: 0.6, filterCutoff: 7500, filterReso: 4, filterEnv: 15, reverbMix: 50, delayTime: 300, delayFeedback: 35 }
        },
        {
            name: "Clavinet Funk",
            artist: "Stevie Wonder / Commodores",
            song: "Superstition / Brick House",
            tags: ["funky", "percussive", "bright", "rhythmic", "scratchy", "danceable"],
            vibe: ["Clavinet", "Funky", "Percussive", "Rhythmic", "Danceable"],
            params: { oscType: 'square', oscPitch: 0, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.15, sustain: 20, release: 0.08, filterCutoff: 5000, filterReso: 28, filterEnv: 60, lfo1Rate: 8, lfo1Depth: 15, lfo1Target: 'cutoff' }
        }
    ],
    
    // === SYNTH EFFECTS & TEXTURES ===
    fx: [
        {
            name: "Riser White Noise",
            artist: "Every EDM Producer Ever",
            song: "Buildups everywhere!",
            tags: ["riser", "tension", "white-noise", "building", "energy", "transition"],
            vibe: ["Riser", "Tension Builder", "White Noise", "Transition", "Energy"],
            params: { oscType: 'noise', oscPitch: 0, unisonVoices: 1, unisonDetune: 0, attack: 0.5, decay: 2.0, sustain: 100, release: 0.1, filterCutoff: 100, filterReso: 0, filterEnv: 95, lfo1Rate: 0.3, lfo1Depth: 80, lfo1Target: 'cutoff' }
        },
        {
            name: "Downlifter Impact",
            artist: "Hans Zimmer / Film Composers",
            song: "Movie trailers worldwide",
            tags: ["impact", "downlift", "dramatic", "heavy", "sub-drop", "cinematic"],
            vibe: ["Impact", "Downlifter", "Dramatic", "Sub Drop", "Cinematic"],
            params: { oscType: 'sawtooth', oscPitch: -36, unisonVoices: 4, unisonDetune: 20, attack: 0.01, decay: 1.5, sustain: 0, release: 0.1, filterCutoff: 150, filterReso: 15, filterEnv: 60, driveAmount: 50 }
        },
        {
            name: "Vocal Chop Texture",
            artist: "Flume / Cashmere Cat",
            song: "Never Be Like You / Again",
            tags: ["vocal-chop", "glitchy", "modern", "texture", "chopped", "pitched"],
            vibe: ["Vocal Chop", "Glitchy", "Modern", "Texture", "Chopped"],
            params: { oscType: 'additive', oscPitch: 0, unisonVoices: 4, unisonDetune: 12, attack: 0.01, decay: 0.15, sustain: 40, release: 0.2, filterCutoff: 3000, filterReso: 22, filterEnv: 35, lfo1Rate: 14, lfo1Depth: 25, lfo1Target: 'pitch' }
        },
        {
            name: "Arpeggiated Texture",
            artist: "Boards of Canada / Tycho",
            song: "Dayvan Honda / Awake",
            tags: ["arpeggiated", "nostalgic", "warm", "repeating", "hypnotic", "lo-fi"],
            vibe: ["Arpeggiator", "Texture", "Nostalgic", "Hypnotic", "Lo-Fi"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 3, unisonDetune: 8, attack: 0.08, decay: 0.4, sustain: 55, release: 0.6, filterCutoff: 2500, filterReso: 18, filterEnv: 30, lfo1Rate: 6, lfo1Depth: 20, lfo1Target: 'cutoff', reverbMix: 50, delayTime: 380, delayFeedback: 40 }
        }
    ],
    
    // === ORCHESTRAL & ACOUSTIC (Synthesized) ===
    orchestral: [
        {
            name: "Cello Section",
            artist: "Yo-Ya Ma / 2CELLOS",
            song: "The Swan / Smooth Criminal (cello cover)",
            tags: ["cello", "orchestral", "expressive", "warm", "emotional", "rich"],
            vibe: ["Cello", "Orchestral", "Expressive", "Emotional", "Rich"],
            params: { oscType: 'sawtooth', oscPitch: -12, unisonVoices: 5, unisonDetune: 6, attack: 0.15, decay: 0.3, sustain: 82, release: 0.4, filterCutoff: 1800, filterReso: 8, filterEnv: 15, lfo1Rate: 5.5, lfo1Depth: 8, lfo1Target: 'pitch', vibratoDepth: 12 }
        },
        {
            name: "Brass Section Stab",
            artist: "Earth Wind & Fire / Chicago",
            song: "September / Saturday in the Park",
            tags: ["brass", "stab", "punchy", "bright", "funk", "powerful"],
            vibe: ["Brass Stab", "Punchy", "Bright", "Funk", "Powerful"],
            params: { oscType: 'square', oscPitch: 0, unisonVoices: 6, unisonDetune: 4, attack: 0.01, decay: 0.2, sustain: 70, release: 0.15, filterCutoff: 3200, filterReso: 15, filterEnv: 50, driveAmount: 20, attack: 0.005 }
        },
        {
            name: "Flute Mellotron",
            artist: "Beatles / Radiohead",
            song: "Strawberry Fields Forever / Exit Music",
            tags: ["flute", "mellotron", "airy", "breathy", "vintage", "psychedelic"],
            vibe: ["Flute", "Mellotron", "Airy", "Breathy", "Vintage"],
            params: { oscType: 'triangle', oscPitch: 12, unisonVoices: 2, unisonDetune: 5, attack: 0.3, decay: 0.6, sustain: 55, release: 0.8, filterCutoff: 4500, filterReso: 10, filterEnv: 12, lfo1Rate: 6, lfo1Depth: 10, lfo1Target: 'pitch', tremoloDepth: 15 }
        },
        {
            name: "Choir Ahhh",
            artist: "Imitation / Queen",
            song: "Bohemian Rhapsody choir section",
            tags: ["choir", "vowel", "lush", "wide", "dramatic", "harmonic"],
            vibe: ["Choir", "Ahhh", "Lush", "Wide", "Dramatic"],
            params: { oscType: 'sawtooth', oscPitch: 0, unisonVoices: 10, unisonDetune: 18, attack: 0.4, decay: 0.8, sustain: 78, release: 1.2, filterCutoff: 2800, filterReso: 6, filterEnv: 8, reverbMix: 70, delayTime: 200, delayFeedback: 20, chorusDepth: 55, chorusRate: 1.5 }
        }
    ],
    
    // === DRUMS & PERCUSSION (Synthesized) ===
    drums: [
        {
            name: "Kick Drum 808",
            artist: "Every Hip Hop / Trap Producer",
            song: "The foundation of modern beats",
            tags: ["kick", "808", "punchy", "sub-heavy", "clean", "versatile"],
            vibe: ["Kick Drum", "808", "Punchy", "Sub Heavy", "Clean"],
            params: { oscType: 'sine', oscPitch: -36, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.3, sustain: 0, release: 0.1, filterCutoff: 150, filterReso: 5, pitchDecay: true }
        },
        {
            name: "Snare Punchy",
            artist: "Every genre ever",
            song: "The backbone of rhythm",
            tags: ["snare", "punchy", "crisp", "bright", "snappy", "essential"],
            vibe: ["Snare", "Punchy", "Crisp", "Bright", "Snappy"],
            params: { oscType: 'noise', oscPitch: 0, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.12, sustain: 0, release: 0.05, filterCutoff: 3500, filterReso: 25, filterEnv: 60, toneBody: 'sine', tonePitch: -5, toneMix: 60 }
        },
        {
            name: "Closed Hi-Hat",
            artist: "Every beat maker ever",
            song: "The heartbeat of groove",
            tags: ["hihat", "closed", "tight", "metallic", "short", "rhythmic"],
            vibe: ["Hi-Hat", "Closed", "Tight", "Metallic", "Short"],
            params: { oscType: 'noise', oscPitch: 24, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.04, sustain: 0, release: 0.02, filterCutoff: 9000, filterReso: 15, filterEnv: 30 }
        },
        {
            name: "Open Hi-Hat Splash",
            artist: "J Dilla / Madlib",
            song: "Donuts / Madvillain beats",
            tags: ["hihat", "open", "splashy", "loose", "jazzy", "sizzly"],
            vibe: ["Hi-Hat Open", "Splashy", "Loose", "Jazzy", "Sizzly"],
            params: { oscType: 'noise', oscPitch: 24, unisonVoices: 1, unisonDetune: 0, attack: 0.001, decay: 0.25, sustain: 0, release: 0.1, filterCutoff: 7000, filterReso: 10, filterEnv: 20, reverbMix: 20 }
        }
    ]
};

// Flatten all presets for search
const ALL_INDUSTRY_PRESETS = Object.values(INDUSTRY_PRESETS).flat();

// ===== VIBE SEARCH ENGINE =====
class VibeSearchEngine {
    constructor() {
        this.vibeCategories = this.buildVibeIndex();
    }

    buildVibeIndex() {
        const index = {};
        ALL_INDUSTRY_PRESETS.forEach(preset => {
            // Index by all vibes
            preset.vibe.forEach(vibe => {
                if (!index[vibe]) index[vibe] = [];
                index[vibe].push(preset);
            });
            // Index by all tags
            preset.tags.forEach(tag => {
                if (!index[tag]) index[tag] = [];
                index[tag].push(preset);
            });
            // Index by category (derived from array key)
            const category = Object.keys(INDUSTRY_PRESETS).find(key => 
                INDUSTRY_PRESETS[key].includes(preset)
            );
            if (category) {
                if (!index[category]) index[category] = [];
                index[category].push(preset);
            }
        });
        return index;
    }

    search(query) {
        const terms = query.toLowerCase()
            .split(/[\s,]+/)
            .filter(t => t.length > 1);
        
        if (terms.length === 0) return ALL_INDUSTRY_PRESETS;

        let results = [];
        let scores = {};

        terms.forEach(term => {
            // Direct vibe/tag matches
            Object.entries(this.vibeCategories).forEach(([key, presets]) => {
                if (key.toLowerCase().includes(term) || term.includes(key.toLowerCase())) {
                    presets.forEach(preset => {
                        const id = preset.name + preset.artist;
                        scores[id] = (scores[id] || 0) + (key.toLowerCase() === term ? 10 : 5);
                        if (!results.find(r => r.name === preset.name)) {
                            results.push(preset);
                        }
                    });
                }
            });

            // Name/artist partial match
            ALL_INDUSTRY_PRESETS.forEach(preset => {
                if (preset.name.toLowerCase().includes(term) || 
                    preset.artist.toLowerCase().includes(term) ||
                    preset.song.toLowerCase().includes(term)) {
                    const id = preset.name + preset.artist;
                    scores[id] = (scores[id] || 0) + 8;
                    if (!results.find(r => r.name === preset.name)) {
                        results.push(preset);
                    }
                }
            });

            // Tag contains term
            ALL_INDUSTRY_PRESETS.forEach(preset => {
                if (preset.tags.some(t => t.includes(term) || term.includes(t))) {
                    const id = preset.name + preset.artist;
                    scores[id] = (scores[id] || 0) + 6;
                }
            });
        });

        // Sort by relevance score
        results.sort((a, b) => {
            const scoreA = scores[a.name + a.artist] || 0;
            const scoreB = scores[b.name + b.artist] || 0;
            return scoreB - scoreA;
        });

        return results.slice(0, 20); // Return top 20 results
    }

    getSuggestions(partial) {
        if (partial.length < 2) return [];
        
        const partialLower = partial.toLowerCase();
        const suggestions = new Set();

        Object.keys(this.vibeIndex).forEach(key => {
            if (key.toLowerCase().includes(partialLower)) {
                suggestions.add(key);
            }
        });

        // Add common vibe terms
        const commonVibes = ['Soft', 'Bright', 'Dark', 'Warm', 'Cool', 'Epic', 
                           'Cinematic', 'Vintage', 'Modern', 'Clean', 'Dirty',
                           'Smooth', 'Harsh', 'Fat', 'Thin', 'Wide', 'Narrow',
                           'Ambient', 'Aggressive', 'Gentle', 'Powerful'];
        commonVibes.forEach(vibe => {
            if (vibe.toLowerCase().includes(partialLower) || partialLower.includes(vibe.toLowerCase())) {
                suggestions.add(vibe);
            }
        });

        return Array.from(suggestions).slice(0, 8);
    }
}

// Initialize vibe search globally
window.vibeSearchEngine = new VibeSearchEngine();

// ===== PATCH MANIPULATION TOOLS =====
const PatchTools = {
    // Morph between current settings and a target preset
    morph(currentParams, targetParams, amount = 0.5) {
        const result = {};
        Object.keys(targetParams).forEach(param => {
            const current = currentParams[param] ?? 0.5;
            const target = targetParams[param];
            result[param] = current + (target - current) * amount;
        });
        return result;
    },

    // Randomize within constraints
    smartRandomize(baseParams, constraints = {}) {
        const result = {...baseParams};
        Object.keys(result).forEach(param => {
            if (constraints.locked?.includes(param)) return;
            
            const variance = constraints.variance || 0.3;
            const min = constraints.ranges?.[param]?.min ?? Math.max(0, result[param] * (1 - variance));
            const max = constraints.ranges?.[param]?.max ?? result[param] * (1 + variance);
            
            result[param] = min + Math.random() * (max - min);
        });
        return result;
    },

    // Create variation of a patch
    createVariation(params, intensity = 'medium') {
        const multipliers = {
            low: 0.1,
            medium: 0.25,
            high: 0.4,
            extreme: 0.6
        };
        const mult = multipliers[intensity] || 0.25;
        
        const result = {...params};
        Object.keys(result).forEach(param => {
            if (typeof result[param] === 'number') {
                const variation = (Math.random() - 0.5) * mult * (Math.abs(result[param]) || 1);
                result[param] += variation;
            }
        });
        return result;
    },

    // Analyze patch characteristics
    analyzePatch(params) {
        const analysis = {
            brightness: ((params.filterCutoff || 2000) / 8000) * 100,
            warmth: 100 - (((params.filterCutoff || 2000) - 500) / 7500) * 100,
            thickness: ((params.unisonVoices || 1) / 16) * 100,
            movement: ((params.lfo1Depth || 0) + (params.filterEnv || 0)) / 2,
            decay: ((params.release || 0.5) + (params.decay || 0.3)) / 3 * 100,
            character: []
        };

        if (analysis.brightness > 70) analysis.character.push('Bright');
        if (analysis.warmth > 60) analysis.character.push('Warm');
        if (analysis.thickness > 50) analysis.character.push('Thick');
        if (analysis.movement > 30) analysis.character.push('Moving');
        if (params.filterReso > 30) analysis.character.push('Resonant');
        if (params.driveAmount > 20) analysis.character.push('Driven');

        return analysis;
    }
};

// Export for use in other modules
window.PatchTools = PatchTools;
window.INDUSTRY_PRESETS = INDUSTRY_PRESETS;
window.ALL_INDUSTRY_PRESETS = ALL_INDUSTRY_PRESETS;

console.log('🎵 Industry Preset Library Loaded:', ALL_INDUSTRY_PRESETS.length, 'presets');
console.log('🔍 Vibe Search Engine Ready');
console.log('🛠️ Patch Tools Available');
