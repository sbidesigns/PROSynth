        // ===== 1. MIDI INPUT SUPPORT (Web MIDI API) =====
        let midiAccess = null;
        let midiInput = null;
        let midiIndicator = document.getElementById('midiIndicator');
        let midiStatusText = document.getElementById('midiStatusText');

        async function initMIDI() {
            if (!navigator.requestMIDIAccess) {
                console.log('Web MIDI API not supported');
                return;
            }

            try {
                midiAccess = await navigator.requestMIDIAccess({ sysex: false });

                midiAccess.inputs.forEach(function(input) {
                    input.onmidimessage = handleMIDIMessage;
                    midiInput = input;
                    updateMIDIStatus(true, input.name);
                });

                midiAccess.onstatechange = function(e) {
                    if (e.port.type === 'input') {
                        if (e.port.state === 'connected' && !midiInput) {
                            e.port.onmidimessage = handleMIDIMessage;
                            midiInput = e.port;
                            updateMIDIStatus(true, e.port.name);
                        } else if (e.port.state === 'disconnected' && midiInput === e.port) {
                            midiInput = null;
                            updateMIDIStatus(false);
                        }
                    }
                };

                if (!midiInput && midiAccess.inputs.size > 0) {
                    var firstInput = midiAccess.inputs.values().next().value;
                    firstInput.onmidimessage = handleMIDIMessage;
                    midiInput = firstInput;
                    updateMIDIStatus(true, firstInput.name);
                }

            } catch (err) {
                console.log('MIDI access denied:', err);
            }
        }
        
        function updateMIDIStatus(connected, name = '') {
            if(midiIndicator) {
                midiIndicator.classList.toggle('connected', connected);
            }
            if(midiStatusText) {
                midiStatusText.textContent = connected ? (name || 'Connected') : 'No MIDI';
            }
        }
        
        function handleMIDIMessage(event) {
            const [status, data1, data2] = event.data;
            const command = status & 0xf0;
            
            // Visual feedback
            if(midiIndicator) {
                midiIndicator.classList.add('activity');
                setTimeout(() => midiIndicator.classList.remove('activity'), 100);
            }
            
            switch(command) {
                case 0x90: // Note On
                    if (data2 > 0) {
                        playMIDINote(data1, data2);
                    } else {
                        stopMIDINote(data1);
                    }
                    break;
                    
                case 0x80: // Note Off
                    stopMIDINote(data1);
                    break;
                    
                case 0xE0: // Pitch Bend
                    const pitchValue = ((data2 << 7) | data1) - 8192;
                    const pitchNormalized = pitchValue / 8192;
                    updatePitchWheel(pitchNormalized);
                    break;
                    
                case 0xB0: // Control Change
                    if (data1 === 1) { // Mod wheel
                        updateModWheel(data2 / 127);
                    }
                    break;
            }
        }
        
        function playMIDINote(noteNumber, velocity) {
            initAudio();
            const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
            
            const tempKey = document.createElement('div');
            tempKey.dataset.note = `MIDI${noteNumber}`;
            tempKey.dataset.freq = freq.toFixed(1);
            tempKey.midiNote = noteNumber;
            tempKey.midiVelocity = velocity || 100;
            
            // Use the existing playNote function
            const keys = keyboard.querySelectorAll('.key');
            // Find or create a key-like element for MIDI
            let midiKeyEl = document.querySelector(`[data-note="MIDI${noteNumber}"]`);
            if(!midiKeyEl) {
                midiKeyEl = document.createElement('div');
                midiKeyEl.className = 'key active';
                midiKeyEl.dataset.note = `MIDI${noteNumber}`;
                midiKeyEl.dataset.freq = freq.toFixed(1);
            }
            playNote(midiKeyEl);
        }
        
        function stopMIDINote(noteNumber) {
            oscillators.forEach((data, noteName) => {
                if (noteName.includes(`MIDI${noteNumber}`)) {
                    const fakeKey = { classList: { contains: () => true }, dataset: { note: noteName } };
                    stopNote(fakeKey);
                }
            });
        }
        
        // Initialize MIDI on page interaction
        document.addEventListener('click', initMIDI, { once: true });
        