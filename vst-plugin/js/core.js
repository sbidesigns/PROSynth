        // ===== KNOB SYSTEM =====
        const knobs = document.querySelectorAll('.knob');
        
        knobs.forEach(knob => {
            let isDragging = false;
            let startY, startValue;
            
            const param = knob.dataset.param;
            const min = parseFloat(knob.dataset.min);
            const max = parseFloat(knob.dataset.max);
            const defaultVal = parseFloat(knob.dataset.default);
            const unit = knob.dataset.unit || '';
            const scale = knob.dataset.scale || 'linear';
            
            let currentValue = defaultVal;
            updateKnobVisual(knob, currentValue);
            
            function updateKnobVisual(knob, value) {
                let normalized;
                if (scale === 'log') {
                    normalized = (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min));
                } else if (scale === 'exp') {
                    normalized = Math.log(value/min) / Math.log(max/min);
                } else {
                    normalized = (value - min) / (max - min);
                }
                normalized = Math.max(0, Math.min(1, normalized));
                
                knob.style.setProperty('--value', normalized);
                
                const angle = -135 + normalized * 270;
                const indicator = knob.querySelector('.knob-indicator');
                if (indicator) indicator.style.transform = `translate(0, -50%) rotate(${angle}deg)`;
                
                const container = knob.closest('.knob-item') || knob.parentElement;
                const valueDisplay = container.querySelector('.knob-value');
                if (valueDisplay) {
                    let displayValue;
                    if (unit === '%') displayValue = `${Math.round(value)} ${unit}`;
                    else if (unit === 'Hz') displayValue = value >= 1000 ? `${(value/1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
                    else if (unit === 'dB') displayValue = `${value.toFixed(1)} ${unit}`;
                    else if (unit === 's' || unit === 'ms') displayValue = `${value.toFixed(value<1?2:0)} ${unit}`;
                    else if (unit === ':1') displayValue = `${value}:1`;
                    else if (unit === '°') displayValue = `${Math.round(value)}°`;
                    else if (unit === '¢') displayValue = `${Math.round(value)} ¢`;
                    else if (unit === 'st') displayValue = `${Math.round(value)} st`;
                    else if (param === 'formantVowel') displayValue = ['A','E','I','O','U'][Math.round(value)];
                    else if (Number.isInteger(value)) displayValue = String(value);
                    else displayValue = value.toFixed(2);
                    
                    valueDisplay.textContent = displayValue;
                }
                
                updateADSRVisual();
                updateWaveform();
            }
            
            knob.addEventListener('mousedown', (e) => {
                isDragging = true;
                startY = e.clientY;
                startValue = currentValue;
                document.body.style.cursor = 'ns-resize';
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const delta = (startY - e.clientY) * 0.5;
                const range = max - min;
                let newValue = startValue + (delta / 150) * range;
                newValue = Math.max(min, Math.min(max, newValue));
                currentValue = newValue;
                updateKnobVisual(knob, currentValue);
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    document.body.style.cursor = '';
                }
            });
            
            knob.addEventListener('dblclick', () => {
                currentValue = defaultVal;
                updateKnobVisual(knob, currentValue);
            });
        });

        // ===== TAB NAVIGATION =====
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });

        // ===== EFFECT TOGGLES =====
        document.querySelectorAll('.effect-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('on');
                toggle.closest('.effect-unit').classList.toggle('active');
            });
        });

        // ===== STEP SEQUENCER =====
        const stepSequencer = document.getElementById('stepSequencer');
        for (let i = 0; i < 16; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.step = i;
            step.textContent = (i % 4 === 0) ? i/4 + 1 : '';
            step.addEventListener('click', () => step.classList.toggle('on'));
            stepSequencer.appendChild(step);
        }

        // Animate steps
        let currentStep = 0;
        setInterval(() => {
            document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('current', i === currentStep));
            currentStep = (currentStep + 1) % 16;
        }, 125);

        // ===== ADSR VISUALIZATION =====
        function updateADSRVisual() {
            const attack = getKnobValue('attack');
            const decay = getKnobValue('decay');
            const sustain = getKnobValue('sustain');
            const release = getKnobValue('release');
            
            const path = document.getElementById('adsrPath');
            if (!path) return;
            
            const w = 300, h = 100, pad = 5;
            const total = attack + decay + release + 0.5;
            
            const sx = t => pad + (t / total) * (w - 2*pad) * 0.85;
            const sy = v => pad + (1 - v/100) * (h - 2*pad);
            
            path.setAttribute('d', `
                M${pad},${h-pad}
                L${sx(0)},${sy(100)}
                L${sx(attack)},${pad}
                L${sx(attack+decay)},${sy(sustain)}
                L${sx(attack+decay+3)},${sy(sustain)}
                L${sx(attack+decay+3+release)},${h-pad}
            `);
        }

        function getKnobValue(paramName) {
            const knob = document.querySelector(`[data-param="${paramName}"]`);
            if (!knob) return 0.5;
            const container = knob.closest('.knob-item') || knob.parentElement;
            const valEl = container?.querySelector('.knob-value');
            if (valEl) {
                const num = parseFloat(valEl.textContent);
                return isNaN(num) ? parseFloat(knob.dataset.default) : num;
            }
            return parseFloat(knob.dataset.default);
        }

        // ===== WAVEFORM DISPLAY =====
        function updateWaveform() {
            const canvas = document.getElementById('waveformCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
            
            const w = canvas.offsetWidth, h = canvas.offsetHeight;
            const oscType = document.getElementById('osc1Type')?.value || 'sawtooth';
            const unison = getKnobValue('unisonVoices');
            const spread = getKnobValue('unisonSpread');
            
            ctx.fillStyle = '#12121a';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#00D4FF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            
            for (let x = 0; x < w; x++) {
                const t = (x / w) * Math.PI * 4;
                let y;
                
                switch(oscType) {
                    case 'sawtooth':
                        y = ((t % (Math.PI*2)) / (Math.PI*2)) * 2 - 1;
                        break;
                    case 'square':
                        y = Math.sin(t) > 0 ? 1 : -1;
                        break;
                    case 'sine':
                        y = Math.sin(t);
                        break;
                    case 'triangle':
                        y = Math.asin(Math.sin(t)) * 2 / Math.PI;
                        break;
                    case 'fm':
                        y = Math.sin(t + Math.sin(t * 2.5) * 3);
                        break;
                    case 'granular':
                        y = Math.sin(t) * (Math.random() * 0.3 + 0.7);
                        break;
                    default:
                        y = Math.sin(t);
                }
                
                // Add unison thickness
                if (unison > 1) {
                    y += Math.sin(t * 1.02 + spread * 0.01) * (spread * 0.002);
                    y += Math.sin(t * 0.98 - spread * 0.01) * (spread * 0.002);
                }
                
                const py = h/2 - y * (h/2 - 5);
                x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
            }
            ctx.stroke();
        }
