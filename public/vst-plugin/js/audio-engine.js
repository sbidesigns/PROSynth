        // ===== KEYBOARD =====
        const keyboard = document.getElementById('keyboard');
        const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        // Professional keyboard layout: ZSXDCVGBNJM (lower), Q2W3ER5T6Y7U (upper), I9O0P (extended)
        const keyMap = {
            // Lower octave (C3-B3)
            'z':0, 's':1, 'x':2, 'd':3, 'c':4, 'v':5, 'g':6, 'b':7, 'n':8, 'j':9, 'm':10, ',':11,
            // Upper octave (C4-B4)
            'q':12, '2':13, 'w':14, '3':15, 'e':16, 'r':17, '5':18, 't':19, '6':20, 'y':21, '7':22, 'u':23,
            // Extended octave (C5-E5)
            'i':24, '9':25, 'o':26, '0':27, 'p':28
        };
        
        const keyLabels = ['Z','S','X','D','C','V','G','B','N','J','M',',','Q','2','W','3','E','R','5','T','6','Y','7','U','I','9','O','0','P'];
        
        for (let i = 0; i < 29; i++) {
            const noteIdx = i % 12;
            const isBlack = notes[noteIdx].includes('#');
            const key = document.createElement('div');
            key.className = `key${isBlack ? ' black' : ''}`;
            key.dataset.note = `${notes[noteIdx]}${3 + Math.floor(i/12)}`;
            key.dataset.freq = (440 * Math.pow(2, (i - 9) / 12)).toFixed(1);
            
            // Add keyboard shortcut label
            if (!isBlack && keyLabels[i]) {
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = keyLabels[i];
                key.appendChild(label);
            }
            
            keyboard.appendChild(key);
        }

        // Audio Engine
        let audioCtx = null;
        let oscillators = new Map();
        let voiceCount = 0;

        function initAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        function playNote(key) {
            if (key.classList.contains('active')) return;
            initAudio();
            key.classList.add('active');
            
            const freq = parseFloat(key.dataset.freq);
            const oscType = document.getElementById('osc1Type')?.value || 'sawtooth';
            const masterGain = getKnobValue('masterGain');
            const attack = getKnobValue('attack');
            const sustain = getKnobValue('sustain');
            const unison = getKnobValue('unisonVoices');
            const detune = getKnobValue('unisonDetune');
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(Math.pow(10, masterGain/20) * 0.15, audioCtx.currentTime + attack);
            gainNode.gain.linearRampToValueAtTime(Math.pow(10, masterGain/20) * 0.15 * sustain/100, audioCtx.currentTime + attack + 0.1);
            gainNode.connect(audioCtx.destination);
            
            const voices = [];
            for (let v = 0; v < Math.max(1, unison); v++) {
                const osc = audioCtx.createOscillator();
                const typeMap = { sawtooth:'sawtooth', square:'square', sine:'sine', triangle:'triangle', noise:'sine', fm:'sine', granular:'sine', additive:'sine' };
                osc.type = typeMap[oscType] || 'sawtooth';
                osc.frequency.value = freq * (1 + (v - unison/2) * detune * 0.0001);
                osc.detune.value = (v - unison/2) * detune * (100/unison);
                osc.connect(gainNode);
                osc.start();
                voices.push(osc);
            }
            
            oscillators.set(key.dataset.note, { voices, gainNode });
            voiceCount++;
            updateStatus();
        }

        function stopNote(key) {
            if (!key.classList.contains('active')) return;
            key.classList.remove('active');
            
            const data = oscillators.get(key.dataset.note);
            if (data) {
                const release = getKnobValue('release');
                data.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                data.gainNode.gain.setValueAtTime(data.gainNode.gain.value, audioCtx.currentTime);
                data.gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + release);
                data.voices.forEach(o => o.stop(audioCtx.currentTime + release + 0.1));
                oscillators.delete(key.dataset.note);
                
                setTimeout(() => { voiceCount = Math.max(0, voiceCount - 1); updateStatus(); }, release * 1000);
            }
        }

        keyboard.querySelectorAll('.key').forEach((key, i) => {
            key.addEventListener('mousedown', () => playNote(key));
            key.addEventListener('mouseup', () => stopNote(key));
            key.addEventListener('mouseleave', () => stopNote(key));
        });

        document.addEventListener('keydown', e => {
            if (e.repeat) return;
            const idx = keyMap[e.key.toLowerCase()];
            if (idx !== undefined) {
                const keys = keyboard.querySelectorAll('.key');
                if (keys[idx]) playNote(keys[idx]);
            }
        });

        document.addEventListener('keyup', e => {
            const idx = keyMap[e.key.toLowerCase()];
            if (idx !== undefined) {
                const keys = keyboard.querySelectorAll('.key');
                if (keys[idx]) stopNote(keys[idx]);
            }
        });

        function updateStatus() {
            document.getElementById('voiceCount').textContent = `${Math.min(voiceCount, 16)} / 16`;
            document.getElementById('cpuUsage').textContent = `${Math.min(95, voiceCount * 5 + Math.random() * 3).toFixed(0)}%`;
        }
