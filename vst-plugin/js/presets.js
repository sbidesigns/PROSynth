        // ===== PRESET MANAGEMENT =====
        let currentPresetName = 'Init Patch';
        let presetHistory = [];
        let historyIndex = -1;
        
        function getAllKnobValues() {
            const values = {};
            knobs.forEach(knob => {
                values[knob.dataset.param] = getKnobValue(knob.dataset.param);
            });
            // Also capture select values
            document.querySelectorAll('.select-styled').forEach(select => {
                if(select.id) values[select.id] = select.value;
            });
            return values;
        }
        
        function setAllKnobValues(values) {
            Object.entries(values).forEach(([param, value]) => {
                const knob = document.querySelector(`[data-param="${param}"]`);
                if (knob) {
                    setKnobValue(knob, parseFloat(value));
                } else {
                    const select = document.getElementById(param);
                    if(select) select.value = value;
                }
            });
            updateADSRVisual();
            updateWaveform();
        }
        
        function setKnobValue(knob, value) {
            const min = parseFloat(knob.dataset.min);
            const max = parseFloat(knob.dataset.max);
            const container = knob.closest('.knob-item') || knob.parentElement;
            const indicator = knob.querySelector('.knob-indicator');
            const normalized = (value - min) / (max - min);
            const angle = -135 + normalized * 270;
            knob.style.setProperty('--value', normalized);
            if (indicator) indicator.style.transform = `translate(0, -50%) rotate(${angle}deg)`;
            
            const valueDisplay = container.querySelector('.knob-value');
            if (valueDisplay) {
                const unit = knob.dataset.unit || '';
                if (unit === '%') valueDisplay.textContent = `${Math.round(value)}%`;
                else if (unit === 'Hz') valueDisplay.textContent = value >= 1000 ? `${(value/1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
                else if (unit === 'dB') valueDisplay.textContent = `${value.toFixed(1)} dB`;
                else if (unit === 'st') valueDisplay.textContent = `${value} st`;
                else if (unit === '¢') valueDisplay.textContent = `${value} ¢`;
                else valueDisplay.textContent = Number.isInteger(value) ? value : value.toFixed(2);
            }
        }
        
        function saveToHistory() {
            presetHistory = presetHistory.slice(0, historyIndex + 1);
            presetHistory.push({ name: currentPresetName, values: getAllKnobValues(), timestamp: Date.now() });
            historyIndex++;
            if (presetHistory.length > 50) { presetHistory.shift(); historyIndex--; }
        }
        
        // Save Preset
        document.getElementById('savePresetBtn')?.addEventListener('click', () => {
            const name = prompt('Enter preset name:', currentPresetName);
            if (!name) return;
            
            const presets = JSON.parse(localStorage.getItem('mysynth_presets') || '{}');
            presets[name] = {
                values: getAllKnobValues(),
                created: new Date().toISOString()
            };
            localStorage.setItem('mysynth_presets', JSON.stringify(presets));
            currentPresetName = name;
            document.getElementById('presetDisplay').textContent = name + ' ▾';
            showNotification(`Preset "${name}" saved!`);
        });
        
        // Load Preset
        document.getElementById('loadPresetBtn')?.addEventListener('click', () => {
            const presets = JSON.parse(localStorage.getItem('mysynth_presets') || '{}');
            const names = Object.keys(presets);
            if (names.length === 0) {
                showNotification('No saved presets found. Save a preset first!');
                return;
            }
            
            // Create custom dropdown
            const select = document.createElement('div');
            select.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;">
                <div style="background:var(--bg-panel);border-radius:12px;padding:20px;min-width:300px;border:1px solid var(--border);max-height:80vh;overflow-y:auto;">
                    <h3 style="color:var(--accent);margin-bottom:15px;font-size:14px;">📂 Load Preset</h3>
                    ${names.map(n => `<button style="display:block;width:100%;padding:10px;margin-bottom:5px;background:var(--bg-section);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;text-align:left;font-size:11px;" data-preset="${n}">${n}<br><small style="color:var(--text-dim);">${new Date(presets[n].created).toLocaleDateString()}</small></button>`).join('')}
                    <button style="margin-top:10px;width:100%;padding:8px;background:transparent;border:1px solid var(--accent);color:var(--accent);border-radius:6px;cursor:pointer;" id="cancelLoad">Cancel</button>
                </div></div>`;
            document.body.appendChild(select);
            
            select.querySelectorAll('[data-preset]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const n = btn.dataset.preset;
                    setAllKnobValues(presets[n].values);
                    currentPresetName = n;
                    document.getElementById('presetDisplay').textContent = n + ' ▾';
                    select.remove();
                    showNotification(`Loaded "${n}"`);
                });
            });
            
            select.querySelector('#cancelLoad').addEventListener('click', () => select.remove());
            select.addEventListener('click', e => { if(e.target === select.firstChild) select.remove(); });
        });
        
        // Undo
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                setAllKnobValues(presetHistory[historyIndex].values);
                showNotification('Undo: ' + presetHistory[historyIndex].name);
            }
        });
        
        // Notification helper - SMALL and non-intrusive
        function showNotification(message, small = false) {
            // Remove existing notification first
            const existing = document.querySelector('.synth-notification');
            if(existing) existing.remove();
            
            const notif = document.createElement('div');
            notif.className = 'synth-notification';
            notif.style.cssText = small 
                ? `position:fixed;bottom:15px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--accent),var(--accent3));color:#000;padding:6px 14px;border-radius:20px;font-size:10px;font-weight:600;z-index:99999;animation:fadeIn 0.2s ease;box-shadow:0 4px 15px rgba(0,0,0,0.4);white-space:nowrap;`
                : `position:fixed;top:15px;right:15px;background:linear-gradient(135deg,var(--accent),var(--accent3));color:#000;padding:8px 16px;border-radius:8px;font-size:11px;font-weight:600;z-index:99999;animation:fadeIn 0.2s ease;box-shadow:0 8px 25px rgba(0,0,0,0.4);max-width:250px;`;
            notif.textContent = message;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), small ? 1800 : 2200);
        }
        
        // ===== WORLD-CLASS RANDOMIZE SYSTEM =====
        // Based on parameters from industry-leading instruments:
        // Serum, Massive X, Omnisphere, Minimoog Model D, Prophet-5,
        // Jupiter-8, DX7, Access Virus, Arturia Pigments, Korg MS-20
        
        const PRO_SOUND_LIBRARY = [
            // ===== ICONIC LEADS (Serum/Massive style) =====
            {
                name: '🎸 Supersaw Anthem',
                inspiration: 'Sawtooth Legend / Serum Lead A',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 16, unisonDetune: 12,
                    attack: 0.008, decay: 0.35, sustain: 78, release: 0.6,
                    filterCutoff: 3800, filterReso: 28, filterEnv: 45,
                    reverbSize: 55, reverbMix: 32,
                    delayTime: 340, delayFeedback: 38, delayMix: 22,
                    chorusDepth: 48, chorusRate: 1.8,
                    driveAmount: 18, driveTone: 65,
                    eqLow: 3, eqMid: 2, eqHigh: 4,
                    lfo1Rate: 0.14, lfo1Depth: 15, lfo1Target: 'cutoff',
                    compRatio: 4, compMakeup: 3
                }
            },
            {
                name: '⚡ Trance Gate Lead',
                inspiration: 'Access Virus TI / Gate Lead',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 8, unisonDetune: 18,
                    attack: 0.002, decay: 0.18, sustain: 85, release: 0.25,
                    filterCutoff: 4200, filterReso: 35, filterEnv: 65,
                    reverbSize: 45, reverbMix: 28,
                    delayTime: 150, delayFeedback: 42, delayMix: 35,
                    chorusDepth: 55, chorusRate: 2.4,
                    driveAmount: 25, driveTone: 72,
                    eqLow: 4, eqMid: 5, eqHigh: 6,
                    lfo1Rate: 0.08, lfo1Depth: 22, lfo1Target: 'cutoff',
                    lfo2Rate: 6.2, lfo2Depth: 8, lfo2Target: 'volume'
                }
            },
            {
                name: '🔥 Aggressive Reese',
                inspiration: 'Massive Reese Bass / Neurofunk',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 7,
                    unison: 4, unisonDetune: 35,
                    attack: 0.001, decay: 0.12, sustain: 70, release: 0.15,
                    filterCutoff: 2200, filterReso: 58, filterEnv: 75,
                    reverbSize: 25, reverbMix: 15,
                    delayTime: 80, delayFeedback: 18, delayMix: 10,
                    driveAmount: 62, driveTone: 45,
                    eqLow: 8, eqMid: 4, eqHigh: -2,
                    lfo1Rate: 0.06, lfo1Depth: 45, lfo1Target: 'cutoff',
                    lfo2Rate: 0.15, lfo2Depth: 30, lfo2Target: 'detune'
                }
            },
            {
                name: '✨ Glassy FM Lead',
                inspiration: 'DX7 E. Piano 1 / FM Bell Lead',
                category: 'Lead',
                params: {
                    oscType: 'sine', oscPitch: 0, oscDetune: 0,
                    unison: 4, unisonDetune: 6,
                    attack: 0.015, decay: 0.45, sustain: 55, release: 0.8,
                    filterCutoff: 7200, filterReso: 22, filterEnv: 20,
                    reverbSize: 68, reverbMix: 42,
                    delayTime: 280, delayFeedback: 32, delayMix: 25,
                    chorusDepth: 65, chorusRate: 3.8,
                    eqLow: -2, eqMid: 4, eqHigh: 8,
                    lfo1Rate: 5.2, lfo1Depth: 6, lfo1Target: 'pitch'
                }
            },
            
            // ===== PROFESSIONAL BASSES (Minimoog/MS-20 style) =====
            {
                name: '🎵 Moog Sub Bass',
                inspiration: 'Minimoog Model D / Classic Sub',
                category: 'Bass',
                params: {
                    oscType: 'sine', oscPitch: -24, oscDetune: 0,
                    unison: 2, unisonDetune: 4,
                    attack: 0.012, decay: 0.35, sustain: 82, release: 0.35,
                    filterCutoff: 320, filterReso: 28, filterEnv: 55,
                    reverbSize: 18, reverbMix: 12,
                    delayTime: 60, delayFeedback: 15, delayMix: 8,
                    driveAmount: 22, driveTone: 55,
                    eqLow: 6, eqMid: 2, eqHigh: -4,
                    compRatio: 6, compMakeup: 5
                }
            },
            {
                name: '💣 Acid 303 Squelch',
                inspiration: 'TB-303 Acid Line / Resonant Bass',
                category: 'Bass',
                params: {
                    oscType: 'square', oscPitch: -12, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.002, decay: 0.45, sustain: 35, release: 0.15,
                    filterCutoff: 850, filterReso: 88, filterEnv: 95,
                    reverbSize: 15, reverbMix: 10,
                    delayTime: 200, delayFeedback: 45, delayMix: 30,
                    driveAmount: 35, driveTone: 40,
                    eqLow: 5, eqMid: -2, eqHigh: 3,
                    lfo1Rate: 4.8, lfo1Depth: 55, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🔊 Future Bass Wobble',
                inspiration: 'Future House / Flume Style',
                category: 'Bass',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 0,
                    unison: 4, unisonDetune: 14,
                    attack: 0.008, decay: 0.28, sustain: 72, release: 0.4,
                    filterCutoff: 1800, filterReso: 52, filterEnv: 68,
                    reverbSize: 32, reverbMix: 22,
                    delayTime: 140, delayFeedback: 38, delayMix: 28,
                    chorusDepth: 42, chorusRate: 0.9,
                    driveAmount: 40, driveTone: 58,
                    eqLow: 7, eqMid: 3, eqHigh: 2,
                    lfo1Rate: 0.11, lfo1Depth: 62, lfo1Target: 'cutoff',
                    lfo2Rate: 0.07, lfo2Depth: 18, lfo2Target: 'pitch'
                }
            },
            {
                name: '🎹 Vintage Analog Kick',
                inspiration: 'TR-808 Kick / Synth Percussion',
                category: 'Bass',
                params: {
                    oscType: 'sine', oscPitch: -36, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.001, decay: 0.18, sustain: 0, release: 0.12,
                    filterCutoff: 450, filterReso: 18, filterEnv: 80,
                    reverbSize: 8, reverbMix: 5,
                    delayTime: 0, delayFeedback: 0, delayMix: 0,
                    driveAmount: 15, driveTone: 50,
                    eqLow: 10, eqMid: -4, eqHigh: -8
                }
            },
            
            // ===== CINEMATIC PADS (Omnisphere/Prophet style) =====
            {
                name: '🌌 Ambient Dreamscape',
                inspiration: 'Omnisphere Atmosphere / Deep Space Pad',
                category: 'Pad',
                params: {
                    oscType: 'sine', oscPitch: 0, oscDetune: 0,
                    unison: 8, unisonDetune: 24,
                    attack: 2.8, decay: 1.2, sustain: 95, release: 4.5,
                    filterCutoff: 1400, filterReso: 6, filterEnv: 15,
                    reverbSize: 92, reverbMix: 72,
                    delayTime: 890, delayFeedback: 58, delayMix: 42,
                    stereoWidth: 175,
                    eqLow: 2, eqMid: 0, eqHigh: 4,
                    lfo1Rate: 0.04, lfo1Depth: 12, lfo1Target: 'cutoff',
                    lfo2Rate: 0.08, lfo2Depth: 8, lfo2Target: 'pan'
                }
            },
            {
                name: '🎻 Cinematic Strings',
                inspiration: 'Spitfire Symphony / Prophet-5 Strings',
                category: 'Pad',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 12, unisonDetune: 8,
                    attack: 1.6, decay: 0.6, sustain: 88, release: 2.8,
                    filterCutoff: 2600, filterReso: 12, filterEnv: 25,
                    reverbSize: 78, reverbMix: 58,
                    delayTime: 420, delayFeedback: 35, delayMix: 28,
                    chorusDepth: 58, chorusRate: 1.4,
                    stereoWidth: 155,
                    eqLow: 3, eqMid: 4, eqHigh: 5,
                    lfo1Rate: 0.06, lfo1Depth: 8, lfo1Target: 'volume'
                }
            },
            {
                name: '☁️ Warm Retro Pad',
                inspiration: 'Jupiter-8 String Ensemble / Vintage Pad',
                category: 'Pad',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 6, unisonDetune: 10,
                    attack: 0.95, decay: 0.4, sustain: 84, release: 1.8,
                    filterCutoff: 2200, filterReso: 18, filterEnv: 30,
                    reverbSize: 62, reverbMix: 45,
                    delayTime: 350, delayFeedback: 38, delayMix: 25,
                    chorusDepth: 68, chorusRate: 2.2,
                    eqLow: -2, eqMid: 3, eqHigh: 6,
                    lfo1Rate: 0.09, lfo1Depth: 10, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🎹 Electric Piano',
                inspiration: 'Rhodes Mark I / DX7 E. Piano',
                category: 'Pad',
                params: {
                    oscType: 'triangle', oscPitch: 0, oscDetune: 0,
                    unison: 3, unisonDetune: 4,
                    attack: 0.005, decay: 0.38, sustain: 45, release: 1.2,
                    filterCutoff: 5200, filterReso: 15, filterEnv: 35,
                    reverbSize: 48, reverbMix: 38,
                    delayTime: 260, delayFeedback: 28, delayMix: 20,
                    chorusDepth: 45, chorusRate: 2.8,
                    driveAmount: 12, driveTone: 70,
                    eqLow: 2, eqMid: 5, eqHigh: 4,
                    lfo1Rate: 4.6, lfo1Depth: 5, lfo1Target: 'volume',
                    lfo2Rate: 0.18, lfo2Depth: 6, lfo2Target: 'cutoff'
                }
            },
            
            // ===== PLUCKS & PERCUSSIVE (Virus/Pigments style) =====
            {
                name: '🎵 Tropical Pluck',
                inspiration: 'Serum Pluck / Tropical House Lead',
                category: 'Pluck',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 4, unisonDetune: 8,
                    attack: 0.002, decay: 0.12, sustain: 18, release: 0.18,
                    filterCutoff: 4800, filterReso: 42, filterEnv: 72,
                    reverbSize: 42, reverbMix: 32,
                    delayTime: 180, delayFeedback: 35, delayMix: 28,
                    eqLow: 4, eqMid: 2, eqHigh: 6,
                    lfo1Rate: 0.12, lfo1Depth: 8, lfo1Target: 'pitch'
                }
            },
            {
                name: '🔔 Crystal Glock',
                inspiration: 'FM8 Metallic / Asian Bell',
                category: 'Pluck',
                params: {
                    oscType: 'sine', oscPitch: 12, oscDetune: 0,
                    unison: 3, unisonDetune: 3,
                    attack: 0.001, decay: 1.4, sustain: 8, release: 2.2,
                    filterCutoff: 8500, filterReso: 55, filterEnv: 15,
                    reverbSize: 75, reverbMix: 55,
                    delayTime: 420, delayFeedback: 28, delayMix: 18,
                    eqLow: -6, eqMid: 2, eqHigh: 8,
                    lfo1Rate: 3.2, lfo1Depth: 4, lfo1Target: 'pitch'
                }
            },
            {
                name: '🥁 Industrial Impact',
                inspiration: 'Kong / Metal Hit / Cinematic Perc',
                category: 'Pluck',
                params: {
                    oscType: 'noise', oscPitch: 0, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.001, decay: 0.08, sustain: 0, release: 0.05,
                    filterCutoff: 3800, filterReso: 48, filterEnv: 85,
                    reverbSize: 55, reverbMix: 35,
                    delayTime: 120, delayFeedback: 15, delayMix: 8,
                    driveAmount: 55, driveTone: 35,
                    eqLow: 8, eqMid: 0, eqHigh: -4
                }
            },
            
            // ===== SPECIALTY SOUNDS (Unique textures) =====
            {
                name: '🎺 Brass Section',
                inspiration: 'M1 Brass / Real Brass Emulation',
                category: 'Brass',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 6, unisonDetune: 10,
                    attack: 0.18, decay: 0.28, sustain: 82, release: 0.45,
                    filterCutoff: 3200, filterReso: 26, filterEnv: 55,
                    reverbSize: 48, reverbMix: 35,
                    delayTime: 100, delayFeedback: 20, delayMix: 12,
                    driveAmount: 28, driveTone: 62,
                    eqLow: 5, eqMid: 4, eqHigh: 3,
                    lfo1Rate: 0.15, lfo1Depth: 12, lfo1Target: 'volume',
                    compRatio: 5, compMakeup: 4
                }
            },
            {
                name: '🎷 Smooth Sax',
                inspiration: 'Saxophone Emulation / Wind Instrument',
                category: 'Brass',
                params: {
                    oscType: 'triangle', oscPitch: 0, oscDetune: 0,
                    unison: 2, unisonDetune: 5,
                    attack: 0.08, decay: 0.22, sustain: 72, release: 0.35,
                    filterCutoff: 4000, filterReso: 22, filterEnv: 42,
                    reverbSize: 52, reverbMix: 40,
                    delayTime: 180, delayFeedback: 25, delayMix: 18,
                    chorusDepth: 55, chorusRate: 1.8,
                    driveAmount: 18, driveTone: 68,
                    eqLow: 2, eqMid: 5, eqHigh: 4,
                    lfo1Rate: 4.8, lfo1Depth: 8, lfo1Target: 'volume',
                    lfo2Rate: 2.2, lfo2Depth: 5, lfo2Target: 'pitch'
                }
            },
            {
                name: '🎤 Vocal Synth',
                inspiration: 'Vocoder-style / Formant Pad',
                category: 'Special',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 5, unisonDetune: 15,
                    attack: 0.15, decay: 0.35, sustain: 68, release: 0.5,
                    filterCutoff: 2800, filterReso: 45, filterEnv: 55,
                    formantVowel: 2, // 'I' vowel
                    reverbSize: 58, reverbMix: 42,
                    delayTime: 220, delayFeedback: 32, delayMix: 22,
                    chorusDepth: 62, chorusRate: 3.2,
                    eqLow: -4, eqMid: 6, eqHigh: 5,
                    lfo1Rate: 4.2, lfo1Depth: 10, lfo1Target: 'formant',
                    lfo2Rate: 0.09, lfo2Depth: 15, lfo2Target: 'cutoff'
                }
            },
            {
                name: '🌀 Psychedelic Organ',
                inspiration: 'Hammond B3 / Leslie Tones',
                category: 'Special',
                params: {
                    oscType: 'square', oscPitch: 0, oscDetune: 0,
                    unison: 3, unisonDetune: 3,
                    attack: 0.005, decay: 0.08, sustain: 92, release: 0.15,
                    filterCutoff: 6200, filterReso: 8, filterEnv: 12,
                    reverbSize: 35, reverbMix: 25,
                    delayTime: 90, delayFeedback: 18, delayMix: 12,
                    chorusDepth: 72, chorusRate: 4.8, // Fast Leslie!
                    eqLow: 4, eqMid: 3, eqHigh: 2,
                    lfo1Rate: 6.0, lfo1Depth: 18, lfo1Target: 'modulation'
                }
            },
            
            // ===== EXPANDED: MORE ICONIC LEADS =====
            {
                name: '🎺 Prophet-5 Lead',
                inspiration: 'Sequential Prophet-5 / Classic Polyphonic',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 4, unisonDetune: 8,
                    attack: 0.02, decay: 0.25, sustain: 72, release: 0.4,
                    filterCutoff: 3200, filterReso: 22, filterEnv: 50,
                    reverbSize: 38, reverbMix: 25,
                    delayTime: 220, delayFeedback: 32, delayMix: 18,
                    chorusDepth: 52, chorusRate: 1.6,
                    driveAmount: 12, driveTone: 68,
                    eqLow: 2, eqMid: 3, eqHigh: 5,
                    lfo1Rate: 0.11, lfo1Depth: 10, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🌟 Jupiter-8 Brassy',
                inspiration: 'Roland Jupiter-8 / Brass Lead',
                category: 'Lead',
                params: {
                    oscType: 'square', oscPitch: 0, oscDetune: 0,
                    unison: 2, unisonDetune: 5,
                    attack: 0.04, decay: 0.18, sustain: 78, release: 0.35,
                    filterCutoff: 2800, filterReso: 18, filterEnv: 42,
                    reverbSize: 42, reverbMix: 28,
                    delayTime: 180, delayFeedback: 28, delayMix: 15,
                    chorusDepth: 65, chorusRate: 2.0,
                    driveAmount: 20, driveTone: 62,
                    eqLow: 4, eqMid: 2, eqHigh: 6,
                    lfo1Rate: 0.09, lfo1Depth: 14, lfo1Target: 'volume'
                }
            },
            {
                name: '💫 OB-Xa Soft Lead',
                inspiration: 'Oberheim OB-Xa / Soft Analog',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 6,
                    attack: 0.06, decay: 0.3, sustain: 75, release: 0.5,
                    filterCutoff: 2400, filterReso: 15, filterEnv: 38,
                    reverbSize: 48, reverbMix: 32,
                    delayTime: 300, delayFeedback: 25, delayMix: 20,
                    chorusDepth: 58, chorusRate: 1.4,
                    eqLow: 1, eqMid: 4, eqHigh: 3,
                    lfo1Rate: 0.07, lfo1Depth: 8, lfo1Target: 'pitch'
                }
            },
            {
                name: '🔮 Virus TI Evolving',
                inspiration: 'Access Virus TI / Modulating Lead',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 6, unisonDetune: 16,
                    attack: 0.015, decay: 0.4, sustain: 80, release: 0.6,
                    filterCutoff: 3600, filterReso: 32, filterEnv: 55,
                    reverbSize: 45, reverbMix: 30,
                    delayTime: 250, delayFeedback: 40, delayMix: 25,
                    chorusDepth: 48, chorusRate: 1.9,
                    driveAmount: 28, driveTone: 58,
                    eqLow: 3, eqMid: 4, eqHigh: 5,
                    lfo1Rate: 0.05, lfo1Depth: 28, lfo1Target: 'cutoff',
                    lfo2Rate: 0.13, lfo2Depth: 12, lfo2Target: 'filterEnv'
                }
            },
            {
                name: '🎤 Vocal Formant Lead',
                inspiration: 'Arturia Pigments / Vocoder-style',
                category: 'Lead',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 5, unisonDetune: 10,
                    attack: 0.03, decay: 0.22, sustain: 68, release: 0.4,
                    filterCutoff: 2600, filterReso: 48, filterEnv: 55,
                    reverbSize: 52, reverbMix: 35,
                    delayTime: 180, delayFeedback: 30, delayMix: 22,
                    chorusDepth: 62, chorusRate: 2.8,
                    eqLow: -3, eqMid: 7, eqHigh: 4,
                    lfo1Rate: 4.5, lfo1Depth: 15, lfo1Target: 'formant'
                }
            },
            
            // ===== EXPANDED: PROFESSIONAL BASSES =====
            {
                name: '⚡ MiniMoog Punchy Bass',
                inspiration: 'Minimoog Model D / Iconic Bass',
                category: 'Bass',
                params: {
                    oscType: 'sawtooth', oscPitch: -24, oscDetune: 0,
                    unison: 2, unisonDetune: 6,
                    attack: 0.005, decay: 0.28, sustain: 68, release: 0.25,
                    filterCutoff: 650, filterReso: 35, filterEnv: 65,
                    reverbSize: 12, reverbMix: 8,
                    delayTime: 80, delayFeedback: 20, delayMix: 12,
                    driveAmount: 32, driveTone: 52,
                    eqLow: 8, eqMid: 2, eqHigh: -2,
                    compRatio: 8, compMakeup: 6
                }
            },
            {
                name: '🔥 MS-20 Aggressive',
                inspiration: 'Korg MS-20 / Semi-Modular Bass',
                category: 'Bass',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 18,
                    attack: 0.002, decay: 0.15, sustain: 55, release: 0.12,
                    filterCutoff: 1200, filterReso: 65, filterEnv: 75,
                    reverbSize: 8, reverbMix: 5,
                    delayTime: 60, delayFeedback: 15, delayMix: 8,
                    driveAmount: 48, driveTone: 42,
                    eqLow: 6, eqMid: 0, eqHigh: -4,
                    lfo1Rate: 0.08, lfo1Depth: 35, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🌊 Deep Submarine',
                inspiration: 'Serum Sub Bass / Deep House',
                category: 'Bass',
                params: {
                    oscType: 'sine', oscPitch: -36, oscDetune: 0,
                    unison: 3, unisonDetune: 8,
                    attack: 0.018, decay: 0.45, sustain: 85, release: 0.8,
                    filterCutoff: 280, filterReso: 12, filterEnv: 25,
                    reverbSize: 25, reverbMix: 18,
                    delayTime: 200, delayFeedback: 35, delayMix: 22,
                    eqLow: 10, eqMid: -2, eqHigh: -6,
                    compRatio: 5, compMakeup: 4
                }
            },
            {
                name: '💀 Monosynth Growl',
                inspiration: 'Sequential Pro-1 / Monophonic Bass',
                category: 'Bass',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.003, decay: 0.2, sustain: 62, release: 0.18,
                    filterCutoff: 1500, filterReso: 42, filterEnv: 70,
                    reverbSize: 10, reverbMix: 6,
                    delayTime: 90, delayFeedback: 22, delayMix: 14,
                    driveAmount: 45, driveTone: 48,
                    eqLow: 7, eqMid: 3, eqHigh: 0,
                    lfo1Rate: 0.15, lfo1Depth: 28, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🎸 Funky Slap Bass',
                inspiration: 'Bass Guitar Emulation / Funk Style',
                category: 'Bass',
                params: {
                    oscType: 'triangle', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 4,
                    attack: 0.001, decay: 0.12, sustain: 45, release: 0.08,
                    filterCutoff: 2200, filterReso: 28, filterEnv: 55,
                    reverbSize: 15, reverbMix: 10,
                    delayTime: 50, delayFeedback: 12, delayMix: 6,
                    driveAmount: 25, driveTone: 65,
                    eqLow: 5, eqMid: 4, eqHigh: 3,
                    lfo1Rate: 6.5, lfo1Depth: 8, lfo1Target: 'filterEnv'
                }
            },
            
            // ===== EXPANDED: CINEMATIC PADS & STRINGS =====
            {
                name: '🎻 Prophet Strings',
                inspiration: 'Prophet-5 String Ensemble / Vintage Pad',
                category: 'Pad',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 8, unisonDetune: 10,
                    attack: 1.2, decay: 0.5, sustain: 88, release: 2.2,
                    filterCutoff: 2400, filterReso: 12, filterEnv: 22,
                    reverbSize: 82, reverbMix: 58,
                    delayTime: 380, delayFeedback: 32, delayMix: 25,
                    chorusDepth: 70, chorusRate: 1.8,
                    stereoWidth: 145,
                    eqLow: 2, eqMid: 3, eqHigh: 5,
                    lfo1Rate: 0.05, lfo1Depth: 6, lfo1Target: 'volume'
                }
            },
            {
                name: '☁️ Juno-60 Warm Pad',
                inspiration: 'Roland Juno-60 / Chorus Pad',
                category: 'Pad',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 4, unisonDetune: 8,
                    attack: 0.6, decay: 0.3, sustain: 82, release: 1.5,
                    filterCutoff: 2000, filterReso: 15, filterEnv: 28,
                    reverbSize: 58, reverbMix: 42,
                    delayTime: 280, delayFeedback: 28, delayMix: 18,
                    chorusDepth: 75, chorusRate: 0.6, // Famous Juno chorus!
                    eqLow: -1, eqMid: 4, eqHigh: 6,
                    lfo1Rate: 0.08, lfo1Depth: 8, lfo1Target: 'cutoff'
                }
            },
            {
                name: '🌈 Omnisphere Ethereal',
                inspiration: 'Spectrasonics Omnisphere / Ambient Texture',
                category: 'Pad',
                params: {
                    oscType: 'sine', oscPitch: 0, oscDetune: 0,
                    unison: 10, unisonDetune: 28,
                    attack: 3.5, decay: 1.8, sustain: 92, release: 5.5,
                    filterCutoff: 1200, filterReso: 4, filterEnv: 12,
                    reverbSize: 95, reverbMix: 78,
                    delayTime: 1100, delayFeedback: 62, delayMix: 48,
                    stereoWidth: 190,
                    eqLow: 0, eqMid: 2, eqHigh: 6,
                    lfo1Rate: 0.03, lfo1Depth: 10, lfo1Target: 'cutoff',
                    lfo2Rate: 0.06, lfo2Depth: 6, lfo2Target: 'pan'
                }
            },
            {
                name: '✝️ Choir Aahs',
                inspiration: 'Emulator II Choir / Vocal Pad',
                category: 'Pad',
                params: {
                    oscType: 'triangle', oscPitch: 0, oscDetune: 0,
                    unison: 6, unisonDetune: 12,
                    attack: 0.8, decay: 0.4, sustain: 78, release: 1.8,
                    filterCutoff: 3200, filterReso: 18, filterEnv: 32,
                    reverbSize: 88, reverbMix: 65,
                    delayTime: 450, delayFeedback: 35, delayMix: 28,
                    chorusDepth: 68, chorusRate: 2.2,
                    eqLow: -2, eqMid: 5, eqHigh: 4,
                    lfo1Rate: 3.2, lfo1Depth: 8, lfo1Target: 'volume',
                    lfo2Rate: 0.12, lfo2Depth: 5, lfo1Target: 'formant'
                }
            },
            {
                name: '🎹 DX7 Electric Piano',
                inspiration: 'Yamaha DX7 E.Piano 1 / FM Keys',
                category: 'Keys',
                params: {
                    oscType: 'triangle', oscPitch: 0, oscDetune: 0,
                    unison: 3, unisonDetune: 4,
                    attack: 0.002, decay: 0.45, sustain: 42, release: 1.0,
                    filterCutoff: 5500, filterReso: 18, filterEnv: 35,
                    reverbSize: 45, reverbMix: 35,
                    delayTime: 250, delayFeedback: 28, delayMix: 20,
                    chorusDepth: 48, chorusRate: 3.0,
                    driveAmount: 15, driveTone: 72,
                    eqLow: 1, eqMid: 5, eqHigh: 4,
                    lfo1Rate: 4.8, lfo1Depth: 5, lfo1Target: 'volume',
                    lfo2Rate: 0.2, lfo2Depth: 6, lfo2Target: 'pitch'
                }
            },
            {
                name: '🎹 Rhodes Mark I',
                inspiration: 'Fender Rhodes / Tine Piano',
                category: 'Keys',
                params: {
                    oscType: 'triangle', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 3,
                    attack: 0.003, decay: 0.5, sustain: 38, release: 1.2,
                    filterCutoff: 4800, filterReso: 22, filterEnv: 40,
                    reverbSize: 52, reverbMix: 40,
                    delayTime: 320, delayFeedback: 30, delayMix: 22,
                    chorusDepth: 55, chorusRate: 2.5,
                    driveAmount: 18, driveTone: 68,
                    eqLow: 3, eqMid: 4, eqHigh: 5,
                    lfo1Rate: 5.5, lfo1Depth: 6, lfo1Target: 'volume'
                }
            },
            {
                name: '🎹 Wurlitzer EP200',
                inspiration: 'Wurlitzer 200A / Reedy EP',
                category: 'Keys',
                params: {
                    oscType: 'sawtooth', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 5,
                    attack: 0.002, decay: 0.4, sustain: 35, release: 0.8,
                    filterCutoff: 4200, filterReso: 26, filterEnv: 45,
                    reverbSize: 40, reverbMix: 30,
                    delayTime: 220, delayFeedback: 25, delayMix: 18,
                    driveAmount: 22, driveTone: 58,
                    eqLow: 2, eqMid: 6, eqHigh: 3,
                    lfo1Rate: 6.2, lfo1Depth: 4, lfo1Target: 'pitch'
                }
            },
            {
                name: '🎹 B3 Organ Swell',
                inspiration: 'Hammond B3 / Drawbar Organ',
                category: 'Keys',
                params: {
                    oscType: 'square', oscPitch: 0, oscDetune: 0,
                    unison: 3, unisonDetune: 3,
                    attack: 0.008, decay: 0.1, sustain: 95, release: 0.15,
                    filterCutoff: 6000, filterReso: 8, filterEnv: 10,
                    reverbSize: 35, reverbMix: 25,
                    delayTime: 100, delayFeedback: 18, delayMix: 12,
                    chorusDepth: 78, chorusRate: 5.5, // Leslie speed!
                    eqLow: 4, eqMid: 2, eqHigh: 3,
                    driveAmount: 28, driveTone: 55,
                    lfo1Rate: 7.0, lfo1Depth: 20, lfo1Target: 'modulation'
                }
            },
            {
                name: '🎹 Clavinet D6',
                inspiration: 'Hohner Clavinet / Funk Keys',
                category: 'Keys',
                params: {
                    oscType: 'square', oscPitch: 0, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.001, decay: 0.15, sustain: 25, release: 0.1,
                    filterCutoff: 3500, filterReso: 35, filterEnv: 55,
                    reverbSize: 18, reverbMix: 12,
                    delayTime: 80, delayFeedback: 20, delayMix: 14,
                    driveAmount: 35, driveTone: 48,
                    eqLow: 5, eqMid: 3, eqHigh: 2,
                    compRatio: 6, compMakeup: 4
                }
            },
            
            // ===== PLUCKS & PERCUSSIVE SOUNDS =====
            {
                name: '🎵 Tropical House Pluck',
                inspiration: 'Serum Pluck / Tropical House',
                category: 'Pluck',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 4, unisonDetune: 8,
                    attack: 0.001, decay: 0.1, sustain: 15, release: 0.15,
                    filterCutoff: 4500, filterReso: 38, filterEnv: 68,
                    reverbSize: 45, reverbMix: 32,
                    delayTime: 170, delayFeedback: 35, delayMix: 28,
                    eqLow: 3, eqMid: 2, eqHigh: 6,
                    lfo1Rate: 0.1, lfo1Depth: 6, lfo1Target: 'pitch'
                }
            },
            {
                name: '🔔 FM Bell Crystal',
                inspiration: 'DX7 Bell / FM Metallic',
                category: 'Pluck',
                params: {
                    oscType: 'sine', oscPitch: 12, oscDetune: 0,
                    unison: 2, unisonDetune: 3,
                    attack: 0.001, decay: 1.2, sustain: 8, release: 2.0,
                    filterCutoff: 9000, filterReso: 52, filterEnv: 12,
                    reverbSize: 78, reverbMix: 55,
                    delayTime: 400, delayFeedback: 28, delayMix: 18,
                    eqLow: -6, eqMid: 2, eqHigh: 8,
                    lfo1Rate: 3.0, lfo1Depth: 4, lfo1Target: 'pitch'
                }
            },
            {
                name: '🪕 Kalimba Thumb Piano',
                inspiration: 'African Kalimba / Tine Percussion',
                category: 'Pluck',
                params: {
                    oscType: 'triangle', oscPitch: 24, oscDetune: 0,
                    unison: 1, unisonDetune: 0,
                    attack: 0.0005, decay: 0.8, sustain: 5, release: 1.5,
                    filterCutoff: 5000, filterReso: 28, filterEnv: 18,
                    reverbSize: 65, reverbMix: 48,
                    delayTime: 350, delayFeedback: 22, delayMix: 15,
                    eqLow: -2, eqMid: 4, eqHigh: 6
                }
            },
            {
                name: '🥁 Steel Drum',
                inspiration: 'Caribbean Steel Pan / Percussive Metal',
                category: 'Pluck',
                params: {
                    oscType: 'sine', oscPitch: 0, oscDetune: 0,
                    unison: 2, unisonDetune: 8,
                    attack: 0.001, decay: 0.6, sustain: 12, release: 1.0,
                    filterCutoff: 7500, filterReso: 45, filterEnv: 20,
                    reverbSize: 55, reverbMix: 38,
                    delayTime: 280, delayFeedback: 25, delayMix: 16,
                    eqLow: -4, eqMid: 3, eqHigh: 8
                }
            },
            {
                name: '🎸 Muted Guitar Chop',
                inspiration: 'Funk Rhythm Guitar / Chord Stab',
                category: 'Pluck',
                params: {
                    oscType: 'triangle', oscPitch: -12, oscDetune: 0,
                    unison: 2, unisonDetune: 6,
                    attack: 0.002, decay: 0.08, sustain: 18, release: 0.06,
                    filterCutoff: 2800, filterReso: 42, filterEnv: 62,
                    reverbSize: 22, reverbMix: 15,
                    delayTime: 60, delayFeedback: 18, delayMix: 10,
                    driveAmount: 32, driveTone: 55,
                    eqLow: 4, eqMid: 5, eqHigh: 2
                }
            },
            
            // ===== BRASS & WOODWIND EMULATIONS =====
            {
                name: '🎺 Section Brass',
                inspiration: 'M1 Brass Section / Real Brass',
                category: 'Brass',
                params: {
                    oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                    unison: 6, unisonDetune: 10,
                    attack: 0.15, decay: 0.25, sustain: 82, release: 0.4,
                    filterCutoff: 3000, filterReso: 24, filterEnv: 52,
                    reverbSize: 48, reverbMix: 35,
                    delayTime: 100, delayFeedback: 20, delayMix: 12,
                    driveAmount: 28, driveTone: 62,
                    eqLow: 5, eqMid: 4, eqHigh: 3,
                    lfo1Rate: 0.14, lfo1Depth: 12, lfo1Target: 'volume',
                    compRatio: 5, compMakeup: 4
                }
            },
            {
                name: '🎷 Smooth Alto Sax',
                    inspiration: 'Saxophone Emulation / Wind Instrument',
                    category: 'Brass',
                    params: {
                        oscType: 'triangle', oscPitch: 0, oscDetune: 0,
                        unison: 2, unisonDetune: 5,
                        attack: 0.08, decay: 0.2, sustain: 72, release: 0.3,
                        filterCutoff: 3800, filterReso: 20, filterEnv: 40,
                        reverbSize: 52, reverbMix: 40,
                        delayTime: 180, delayFeedback: 25, delayMix: 18,
                        chorusDepth: 55, chorusRate: 1.8,
                        driveAmount: 18, driveTone: 68,
                        eqLow: 2, eqMid: 5, eqHigh: 4,
                        lfo1Rate: 4.8, lfo1Depth: 8, lfo1Target: 'volume',
                        lfo2Rate: 2.2, lfo2Depth: 5, lfo2Target: 'pitch'
                    }
                },
                {
                    name: '🎻 Solo Violin',
                    inspiration: 'String Solo / Expressive Bow',
                    category: 'Brass',
                    params: {
                        oscType: 'sawtooth', oscPitch: 0, oscDetune: 0,
                        unison: 2, unisonDetune: 4,
                        attack: 0.12, decay: 0.15, sustain: 78, release: 0.5,
                        filterCutoff: 3400, filterReso: 16, filterEnv: 35,
                        reverbSize: 62, reverbMix: 45,
                        delayTime: 200, delayFeedback: 22, delayMix: 15,
                        eqLow: 2, eqMid: 4, eqHigh: 5,
                        lfo1Rate: 5.5, lfo1Depth: 6, lfo1Target: 'volume',
                        lfo2Rate: 0.18, lfo2Depth: 4, lfo2Target: 'vibrato'
                    }
                },
                
                // ===== SPECIAL EFFECTS & TEXTURES =====
                {
                    name: '💥 Cinematic Impact',
                    inspiration: 'Trailers / Hit / Boom',
                    category: 'FX',
                    params: {
                        oscType: 'noise', oscPitch: 0, oscDetune: 0,
                        unison: 1, unisonDetune: 0,
                        attack: 0.001, decay: 0.6, sustain: 0, release: 0.3,
                        filterCutoff: 2800, filterReso: 42, filterEnv: 80,
                        reverbSize: 65, reverbMix: 45,
                        delayTime: 100, delayFeedback: 15, delayMix: 8,
                        driveAmount: 55, driveTone: 38,
                        eqLow: 8, eqMid: 2, eqHigh: -4,
                        compRatio: 10, compMakeup: 8
                    }
                },
                {
                    name: '📈 Riser Sweep',
                    inspiration: 'Build-up / Tension / White Noise',
                    category: 'FX',
                    params: {
                        oscType: 'noise', oscPitch: 0, oscDetune: 0,
                        unison: 2, unisonDetune: 20,
                        attack: 2.0, decay: 0.5, sustain: 0, release: 0.1,
                        filterCutoff: 800, filterReso: 15, filterEnv: 95,
                        reverbSize: 40, reverbMix: 25,
                        delayTime: 60, delayFeedback: 10, delayMix: 5,
                        driveAmount: 35, driveTone: 45,
                        eqLow: 4, eqMid: 0, eqHigh: 6,
                        lfo1Rate: 0.02, lfo1Depth: 50, lfo1Target: 'cutoff'
                    }
                },
                {
                    name: '🌀 Glitchy Digital',
                    inspiration: 'IDM / Glitch / Artifacts',
                    category: 'FX',
                    params: {
                        oscType: 'square', oscPitch: 0, oscDetune: 0,
                        unison: 3, unisonDetune: 25,
                        attack: 0.001, decay: 0.05, sustain: 30, release: 0.08,
                        filterCutoff: 5200, filterReso: 48, filterEnv: 72,
                        reverbSize: 20, reverbMix: 12,
                        delayTime: 80, delayFeedback: 65, delayMix: 45,
                        driveAmount: 42, driveTone: 55,
                        eqLow: -2, eqMid: 6, eqHigh: 2,
                        lfo1Rate: 12.0, lfo1Depth: 35, lfo1Target: 'cutoff',
                        lfo2Rate: 0.03, lfo2Depth: 50, lfo2Target: 'pitch'
                    }
                },
                {
                    name: '🌊 Sub Drop',
                    inspiration: 'Dubstep Drop / Frequency Sweep',
                    category: 'FX',
                    params: {
                        oscType: 'sine', oscPitch: -36, oscDetune: 0,
                        unison: 2, unisonDetune: 8,
                        attack: 0.5, decay: 1.5, sustain: 0, release: 1.0,
                        filterCutoff: 200, filterReso: 22, filterEnv: 85,
                        reverbSize: 35, reverbMix: 22,
                        delayTime: 120, delayFeedback: 30, delayMix: 18,
                        eqLow: 12, eqMid: -4, eqHigh: -8,
                        compRatio: 6, compMakeup: 6
                    }
                },
                {
                    name: '✨ Sparkle Shimmer',
                    inspiration: 'Ambient Texture / High-Frequency Sparkle',
                    category: 'FX',
                    params: {
                        oscType: 'sine', oscPitch: 24, oscDetune: 0,
                        unison: 4, unisonDetune: 12,
                        attack: 0.3, decay: 0.8, sustain: 45, release: 1.5,
                        filterCutoff: 8500, filterReso: 35, filterEnv: 18,
                        reverbSize: 88, reverbMix: 62,
                        delayTime: 500, delayFeedback: 42, delayMix: 35,
                        stereoWidth: 160,
                        eqLow: -8, eqMid: 0, eqHigh: 8,
                        lfo1Rate: 0.1, lfo1Depth: 8, lfo1Target: 'filterEnv',
                        lfo2Rate: 6.5, lfo2Depth: 4, lfo2Target: 'pitch'
                    }
                }
        ];
        
        let lastRandomProfile = null;
        let randomizeCount = 0;
        
        document.getElementById('randomizeBtn')?.addEventListener('click', () => {
            saveToHistory();
            randomizeCount++;
            
            // Get selected category filter
            const categoryFilter = document.getElementById('randomCategory')?.value || 'All';
            
            // Filter profiles by category if not "All"
            let filteredProfiles = categoryFilter === 'All' 
                ? PRO_SOUND_LIBRARY 
                : PRO_SOUND_LIBRARY.filter(p => p.category === categoryFilter);
            
            // Pick a profile different from last (cycle through available)
            let availableProfiles = filteredProfiles.filter(p => p !== lastRandomProfile);
            
            // If we've used all in this category, reset
            if(availableProfiles.length === 0) {
                availableProfiles = filteredProfiles;
                lastRandomProfile = null;
            }
            
            const profile = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
            lastRandomProfile = profile;
            
            // Micro-variations for uniqueness (±3% max) - keeps it PROFESSIONAL
            const microVar = () => (Math.random() - 0.5) * 0.06; // Only ±3%!
            
            const p = profile.params; // Shorthand
            
            // Build target values with PERFECT tuning guaranteed
            const targetValues = {
                // Oscillator - always in tune!
                osc1Pitch: p.oscPitch || 0,
                osc1Detune: 0, // ZERO detune = perfect pitch
                
                // Voice architecture - professional unison
                unisonVoices: p.unison || 4,
                unisonDetune: Math.min(12, Math.max(2, Math.round((p.unisonDetune || 8) * 0.6))), // Max 12 cents = subtle warmth only
                
                // Envelope - production-ready shapes
                attack: Math.max(0.001, p.attack * (1 + microVar())),
                decay: Math.max(0.01, p.decay * (1 + microVar())),
                sustain: Math.max(0, Math.min(100, p.sustain * (1 + microVar()))),
                release: Math.max(0.01, p.release * (1 + microVar())),
                
                // Filter - musical, not harsh
                filter1Cutoff: Math.round(p.filterCutoff * (1 + microVar())),
                filter1Resonance: Math.min(55, Math.round(p.filterReso * (1 + microVar()))), // Cap at 55% to avoid harshness
                filter2Env: p.filterEnv || 30,
                
                // Effects chain - studio-quality levels
                reverbSize: p.reverbSize || 40,
                reverbMix: Math.min(55, Math.round((p.reverbMix || 30) * 0.85)), // Keep reverb tasteful
                delayTime: Math.round(p.delayTime || 200),
                delayFeedback: Math.min(42, Math.round((p.delayFeedback || 25) * 0.8)),
                delayMix: p.delayMix || 20,
                
                // Modulation
                chorusDepth: p.chorusDepth || 30,
                chorusRate: p.chorusRate || 2.0,
                
                // Saturation - subtle warmth, never distortion
                driveAmount: Math.min(45, p.driveAmount || 0), // Cap drive for clean output
                driveTone: p.driveTone || 50,
                
                // EQ - balanced frequency response
                eqLow: p.eqLow || 0,
                eqMid: p.eqMid || 0,
                eqHigh: p.eqHigh || 0,
                
                // Dynamics
                compRatio: p.compRatio || 4,
                compMakeup: p.compMakeup || 2,
                
                // Stereo
                stereoWidth: p.stereoWidth || 100,
                
                // Master - conservative level
                masterGain: Math.round(-2 + Math.random() * 2) // -2 to 0 dB range
            };
            
            // Set oscillator type from profile
            const oscSelect = document.getElementById('osc1Type');
            if(oscSelect && p.oscType) oscSelect.value = p.oscType;
            
            // Apply all main values
            Object.entries(targetValues).forEach(([param, value]) => {
                const knob = document.querySelector(`[data-param="${param}"]`);
                if (knob) setKnobValue(knob, value);
            });
            
            // Apply LFO settings if defined in profile
            if(p.lfo1Rate) {
                const lfo1RateKnob = document.querySelector('[data-param="lfo1Rate"]');
                const lfo1DepthKnob = document.querySelector('[data-param="lfo1Depth"]');
                if(lfo1RateKnob) setKnobValue(lfo1RateKnob, p.lfo1Rate);
                if(lfo1DepthKnob) setKnobValue(lfo1DepthKnob, p.lfo1Depth);
            }
            if(p.lfo2Rate) {
                const lfo2RateKnob = document.querySelector('[data-param="lfo2Rate"]');
                const lfo2DepthKnob = document.querySelector('[data-param="lfo2Depth"]');
                if(lfo2RateKnob) setKnobValue(lfo2RateKnob, p.lfo2Rate);
                if(lfo2DepthKnob) setKnobValue(lfo2DepthKnob, p.lfo2Depth);
            }
            
            currentPresetName = `${profile.name} #${randomizeCount}`;
            document.getElementById('presetDisplay').textContent = currentPresetName + ' ▾';
            updateADSRVisual();
            updateWaveform();
            showNotification(`🎧 ${profile.name} [${profile.category}]`, true); // Small notification with category
        });
        