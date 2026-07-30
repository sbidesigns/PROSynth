        // ===== REVOLUTIONARY CREATIVE TOOLS - ALL 10 FEATURES =====
        
        // Global state for all creative tools
        const CreativeTools = {
            morph: { x: 0.5, y: 0.5, corners: { tl: null, tr: null, bl: null, br: null }, presets: {} },
            tags: { currentTags: [], rating: 0, genre: '', notes: '' },
            evolution: { parentA: null, parentB: null, children: [] },
            sculptor: { points: [], tool: 'draw', harmonics: new Array(16).fill(0).map((_,i) => i===1?1:0) },
            modCanvas: { paths: {}, currentLayer: 'lfo1', currentTool: 'freehand' },
            macros: { 1: { name: 'Macro 1', assignments: [] }, 2: { name: 'Macro 2', assignments: [] }, 3: { name: 'Macro 3', assignments: [] }, 4: { name: 'Macro 4', assignments: [] } },
            performance: { scenes: {}, activeScene: 1, xyPos: {x: 0.5, y: 0.5}, recording: false },
            weather: { temp: 65, humid: 40, pressure: 50, wind: 20, animating: false },
            history: { nodes: [], currentNode: null },
            randomizer: { history: [], lockedState: null, lastState: null }
        };

        // ===== 1. PRESET MORPH GRID =====
        function initMorphGrid() {
            const canvas = document.getElementById('morphGridCanvas');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            
            function drawMorphGrid() {
                const w = canvas.width, h = canvas.height;
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-panel') || '#12121a';
                ctx.fillRect(0, 0, w, h);
                
                // Draw grid lines
                ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border') || '#2A2A3A';
                ctx.lineWidth = 0.5;
                for(let i=0; i<=10; i++) {
                    ctx.beginPath(); ctx.moveTo(i*w/10, 0); ctx.lineTo(i*w/10, h); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, i*h/10); ctx.lineTo(w, i*h/10); ctx.stroke();
                }
                
                // Draw gradient fill based on corner presets
                const corners = CreativeTools.morph.corners;
                if(corners.tl || corners.tr || corners.bl || corners.br) {
                    const gradient = ctx.createLinearGradient(0, 0, w, h);
                    gradient.addColorStop(0, 'rgba(139,92,246,0.3)');
                    gradient.addColorStop(0.5, 'rgba(0,212,255,0.2)');
                    gradient.addColorStop(1, 'rgba(255,0,110,0.3)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, w, h);
                }
                
                // Draw position indicator
                const mx = CreativeTools.morph.x * w;
                const my = CreativeTools.morph.y * h;
                ctx.beginPath();
                ctx.arc(mx, my, 12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,212,255,0.3)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(mx, my, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#00D4FF';
                ctx.fill();
                
                // Draw connection lines to corners
                [[0,0,'tl'], [w,0,'tr'], [0,h,'bl'], [w,h,'br']].forEach(([cx,cy,key]) => {
                    ctx.beginPath();
                    ctx.setLineDash([4,4]);
                    ctx.moveTo(mx, my);
                    ctx.lineTo(cx, cy);
                    ctx.strokeStyle = corners[key] ? 'rgba(0,212,255,0.5)' : 'rgba(107,114,128,0.3)';
                    ctx.stroke();
                    ctx.setLineDash([]);
                });
            }
            
            canvas.addEventListener('mousedown', (e) => {
                const rect = canvas.getBoundingClientRect();
                CreativeTools.morph.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                CreativeTools.morph.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                updateMorphPosition();
                applyMorphBlend();
            });
            
            let isDragging = false;
            canvas.addEventListener('mousemove', (e) => {
                if(!isDragging) return;
                const rect = canvas.getBoundingClientRect();
                CreativeTools.morph.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                CreativeTools.morph.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                updateMorphPosition();
                applyMorphBlend();
            });
            canvas.addEventListener('mousedown', () => isDragging = true);
            canvas.addEventListener('mouseup', () => isDragging = false);
            canvas.addEventListener('mouseleave', () => isDragging = false);
            
            function updateMorphPosition() {
                drawMorphGrid();
                const indicator = document.getElementById('morphCenterIndicator');
                const display = document.getElementById('morphPositionDisplay');
                if(indicator) indicator.style.left = `${CreativeTools.morph.x * 100}%`;
                if(display) display.textContent = `X: ${Math.round(CreativeTools.morph.x*100)}% Y: ${Math.round(CreativeTools.morph.y*100)}%`;
            }
            
            function applyMorphBlend() {
                // Interpolate between corner presets based on position
                const {x, y, corners} = CreativeTools.morph;
                // This would blend parameters between presets in a real implementation
                showNotification(`🧬 Morph Position: ${Math.round(x*100)}%, ${Math.round(y*100)}%`, false);
            }
            
            drawMorphGrid();
            updateMorphPosition();
            
            // Corner preset selectors
            ['TL','TR','BL','BR'].forEach(corner => {
                const select = document.getElementById(`morphCornerPreset_${corner}`);
                if(select) {
                    // Populate with some default "presets"
                    const defaults = ['Init Saw Lead', 'Warm Pad', 'Bass Pluck', 'Bright Bell', 'Dark Atmosphere'];
                    defaults.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p; opt.textContent = p;
                        select.appendChild(opt);
                    });
                    
                    select.addEventListener('change', () => {
                        CreativeTools.morph.corners[corner.toLowerCase()] = select.value || null;
                        drawMorphGrid();
                        showNotification(`📍 ${corner}: ${select.value || 'Empty'}`, true);
                    });
                }
            });
            
            // Capture button
            document.getElementById('morphCaptureBtn')?.addEventListener('click', () => {
                showNotification('📸 Current state captured as preset slot', true);
            });
            
            // Randomize corners
            document.getElementById('morphRandomizeCorners')?.addEventListener('click', () => {
                ['TL','TR','BL','BR'].forEach(corner => {
                    const select = document.getElementById(`morphCornerPreset_${corner}`);
                    if(select && select.options.length > 1) {
                        const idx = Math.floor(Math.random() * (select.options.length - 1)) + 1;
                        select.selectedIndex = idx;
                        CreativeTools.morph.corners[corner.toLowerCase()] = select.value;
                    }
                });
                drawMorphGrid();
                showNotification('🎲 Corners randomized!', true);
            });
        }

        // ===== 2. TAG/METADATA SYSTEM =====
        function initTagSystem() {
            const container = document.getElementById('currentTagsContainer');
            const input = document.getElementById('tagInput');
            const addBtn = document.getElementById('addTagBtn');
            
            function renderTags() {
                if(!container) return;
                container.innerHTML = CreativeTools.tags.currentTags.map(tag => 
                    `<span class="tag-item">${tag} <span class="tag-remove" data-tag="${tag}">×</span></span>`
                ).join('');
                
                container.querySelectorAll('.tag-remove').forEach(btn => {
                    btn.addEventListener('click', () => {
                        CreativeTools.tags.currentTags = CreativeTools.tags.currentTags.filter(t => t !== btn.dataset.tag);
                        renderTags();
                    });
                });
            }
            
            function addTag(tag) {
                tag = tag.trim().toLowerCase();
                if(tag && !CreativeTools.tags.currentTags.includes(tag)) {
                    CreativeTools.tags.currentTags.push(tag);
                    renderTags();
                    return true;
                }
                return false;
            }
            
            addBtn?.addEventListener('click', () => {
                if(addTag(input?.value)) {
                    input.value = '';
                    showNotification('🏷️ Tag added', true);
                }
            });
            
            input?.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') { e.preventDefault(); addBtn?.click(); }
            });
            
            // Quick tag buttons
            document.querySelectorAll('.quick-tag-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    addTag(btn.dataset.tag);
                    showNotification(`🏷️ Added: ${btn.dataset.tag}`, true);
                });
            });
            
            // Star rating
            document.querySelectorAll('#presetStarRating span').forEach(star => {
                star.addEventListener('click', () => {
                    CreativeTools.tags.rating = parseInt(star.dataset.star);
                    document.querySelectorAll('#presetStarRating span').forEach((s,i) => {
                        s.classList.toggle('active', i < CreativeTools.tags.rating);
                    });
                    showNotification(`⭐ Rating: ${CreativeTools.tags.rating}/5`, true);
                });
            });
            
            // Genre select
            document.getElementById('presetGenreTag')?.addEventListener('change', (e) => {
                CreativeTools.tags.genre = e.target.value;
            });
            
            // Notes auto-save
            document.getElementById('presetNotes')?.addEventListener('input', (e) => {
                CreativeTools.tags.notes = e.target.value;
            });
            
            renderTags();
        }

        // ===== 3. EVOLUTION ENGINE =====
        function initEvolutionEngine() {
            const breedBtn = document.getElementById('breedPresetsBtn');
            const mutationSlider = document.getElementById('evoMutationRate');
            const mutationValue = document.getElementById('evoMutationValue');
            
            mutationSlider?.addEventListener('input', () => {
                if(mutationValue) mutationValue.textContent = `${mutationSlider.value}%`;
            });
            
            breedBtn?.addEventListener('click', () => {
                const rate = parseInt(mutationSlider?.value || 15);
                const constraints = {};
                document.querySelectorAll('.evo-constraint input').forEach(cb => {
                    const label = cb.parentElement.textContent.trim();
                    constraints[label] = cb.checked;
                });
                
                // Generate 4 children by blending/mutating
                CreativeTools.evolution.children = [];
                const childrenContainer = document.getElementById('evoChildrenContainer');
                
                for(let i=0; i<4; i++) {
                    const childName = `Child ${i+1}`;
                    const mutations = Math.random() < rate/100 ? Math.floor(Math.random() * 5) : 0;
                    CreativeTools.evolution.children.push({
                        name: childName,
                        mutations,
                        params: generateEvolvedParams(rate, constraints)
                    });
                    
                    const slot = childrenContainer?.querySelector(`[data-child="${i}"]`);
                    if(slot) {
                        slot.querySelector('span').textContent = `${childName}${mutations > 0 ? ` (${mutations} mut)` : ''}`;
                        slot.style.background = mutations > 0 ? 'rgba(76,175,80,0.15)' : 'var(--bg-panel)';
                    }
                }
                
                showNotification(`🧬 Generated 4 children! Mutation: ${rate}%`, true);
            });
            
            // Load child buttons
            document.querySelectorAll('.load-child-btn').forEach((btn, idx) => {
                btn.addEventListener('click', () => {
                    if(CreativeTools.evolution.children[idx]) {
                        showNotification(`✅ Loaded: ${CreativeTools.evolution.children[idx].name}`, true);
                        // In real impl, would apply the child's parameters
                    }
                });
            });
            
            function generateEvolvedParams(mutationRate, constraints) {
                // Return mock evolved parameter set
                return { oscType: 'sawtooth', filterCutoff: 2000 + Math.random() * 4000, resonance: Math.random() * 50 };
            }
        }

        // ===== 4. WAVEFORM SCULPTOR =====
        function initWaveformSculptor() {
            const canvas = document.getElementById('waveformSculptCanvas');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            
            function drawSculptedWaveform() {
                const w = canvas.width, h = canvas.height;
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-dark') || '#0a0a0f';
                ctx.fillRect(0, 0, w, h);
                
                // Draw center line
                ctx.strokeStyle = 'rgba(107,114,128,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
                
                // Draw waveform
                if(CreativeTools.sculptor.points.length > 1) {
                    ctx.strokeStyle = '#FF9800';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#FF9800';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    CreativeTools.sculptor.points.forEach((p, i) => {
                        const x = (i / (CreativeTools.sculptor.points.length - 1)) * w;
                        const y = h/2 - (p - 0.5) * h * 0.9;
                        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                } else {
                    // Default sine wave
                    ctx.strokeStyle = 'rgba(255,152,0,0.5)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    for(let x=0; x<w; x++) {
                        const y = h/2 - Math.sin(x/w * Math.PI * 4) * h * 0.35;
                        if(x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
            }
            
            // Initialize with sine wave points
            CreativeTools.sculptor.points = [];
            for(let i=0; i<=100; i++) {
                CreativeTools.sculptor.points.push(Math.sin(i/100 * Math.PI * 4) * 0.5 + 0.5);
            }
            drawSculptedWaveform();
            
            // Tool selection
            document.querySelectorAll('.sculpt-tool').forEach(tool => {
                tool.addEventListener('click', () => {
                    document.querySelectorAll('.sculpt-tool').forEach(t => t.classList.remove('active'));
                    tool.classList.add('active');
                    CreativeTools.sculptor.tool = tool.dataset.tool;
                    
                    const harmonicEditor = document.getElementById('harmonicEditor');
                    if(harmonicEditor) harmonicEditor.style.display = tool.dataset.tool === 'harmonics' ? 'block' : 'none';
                    
                    if(tool.dataset.tool === 'harmonics') initHarmonicEditor();
                });
            });
            
            // Drawing
            canvas.addEventListener('mousedown', (e) => {
                if(CreativeTools.sculptor.tool === 'erase' || CreativeTools.sculptor.tool === 'draw') {
                    isDrawing = true;
                    sculptAtPosition(e);
                }
            });
            canvas.addEventListener('mousemove', (e) => { if(isDrawing) sculptAtPosition(e); });
            canvas.addEventListener('mouseup', () => isDrawing = false);
            canvas.addEventListener('mouseleave', () => isDrawing = false);
            
            function sculptAtPosition(e) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const idx = Math.round(x * (CreativeTools.sculptor.points.length - 1));
                
                if(idx >= 0 && idx < CreativeTools.sculptor.points.length) {
                    if(CreativeTools.sculptor.tool === 'erase') {
                        CreativeTools.sculptor.points[idx] = 0.5;
                    } else {
                        CreativeTools.sculptor.points[idx] = 1 - y;
                    }
                    drawSculptedWaveform();
                }
            }
            
            // Apply to oscillator
            document.getElementById('sculptToOsc')?.addEventListener('click', () => {
                showNotification('🎨 Waveform applied to oscillator!', true);
            });
            
            // Reset
            document.getElementById('sculptReset')?.addEventListener('click', () => {
                CreativeTools.sculptor.points = [];
                for(let i=0; i<=100; i++) {
                    CreativeTools.sculptor.points.push(Math.sin(i/100 * Math.PI * 4) * 0.5 + 0.5);
                }
                drawSculptedWaveform();
                showNotification('↺ Waveform reset', true);
            });
            
            function initHarmonicEditor() {
                const container = document.getElementById('harmonicSliders');
                if(!container) return;
                container.innerHTML = '';
                
                for(let i=1; i<=16; i++) {
                    const row = document.createElement('div');
                    row.className = 'harmonic-slider-row';
                    row.innerHTML = `
                        <label>H${i}</label>
                        <input type="range" min="0" max="100" value="${CreativeTools.sculptor.harmonics[i]*100}" data-harm="${i}">
                        <span>${Math.round(CreativeTools.sculptor.harmonics[i]*100)}%</span>
                    `;
                    row.querySelector('input').addEventListener('input', (e) => {
                        CreativeTools.sculptor.harmonics[i] = e.target.value / 100;
                        row.querySelector('span').textContent = `${e.target.value}%`;
                        regenerateFromHarmonics();
                    });
                    container.appendChild(row);
                }
            }
            
            function regenerateFromHarmonics() {
                // Rebuild waveform from harmonics
                CreativeTools.sculptor.points = [];
                for(let i=0; i<=100; i++) {
                    let val = 0;
                    for(let h=1; h<=16; h++) {
                        val += CreativeTools.sculptor.harmonics[h] * Math.sin(i/100 * Math.PI * 4 * h);
                    }
                    CreativeTools.sculptor.points.push(val * 0.5 + 0.5);
                }
                drawSculptedWaveform();
            }
        }

        // ===== 5. MODULATION CANVAS =====
        function initModulationCanvas() {
            const canvas = document.getElementById('modulationCanvas');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            let currentPath = [];
            
            function drawModCanvas() {
                const w = canvas.width, h = canvas.height;
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-dark') || '#0a0a0f';
                ctx.fillRect(0, 0, w, h);
                
                // Grid
                ctx.strokeStyle = 'rgba(107,114,128,0.15)';
                ctx.lineWidth = 0.5;
                for(let i=0; i<=10; i++) {
                    ctx.beginPath(); ctx.moveTo(i*w/10, 0); ctx.lineTo(i*w/10, h); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, i*h/10); ctx.lineTo(w, i*h/10); ctx.stroke();
                }
                
                // Center line
                ctx.strokeStyle = 'rgba(233,30,99,0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4,4]);
                ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw all layer paths
                Object.entries(CreativeTools.modCanvas.paths).forEach(([layer, path]) => {
                    if(path.length < 2) return;
                    const color = layer === 'lfo1' ? '#00D4FF' : '#FF006E';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    path.forEach((p, i) => {
                        const x = p.x * w, y = (1-p.y) * h;
                        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                });
                
                // Current drawing path
                if(currentPath.length > 1) {
                    ctx.strokeStyle = '#E91E63';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    currentPath.forEach((p, i) => {
                        const x = p.x * w, y = (1-p.y) * h;
                        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                }
            }
            
            // Tool selection
            document.querySelectorAll('.mod-canvas-tool').forEach(tool => {
                tool.addEventListener('click', () => {
                    document.querySelectorAll('.mod-canvas-tool').forEach(t => t.classList.remove('active'));
                    tool.classList.add('active');
                    CreativeTools.modCanvas.currentTool = tool.dataset.mctool;
                });
            });
            
            // Layer selection
            document.getElementById('modCanvasLayer')?.addEventListener('change', (e) => {
                CreativeTools.modCanvas.currentLayer = e.target.value;
            });
            
            // Drawing
            canvas.addEventListener('mousedown', (e) => {
                isDrawing = true;
                currentPath = [];
                addModPoint(e);
            });
            canvas.addEventListener('mousemove', (e) => { if(isDrawing) addModPoint(e); });
            canvas.addEventListener('mouseup', () => {
                if(isDrawing && currentPath.length > 1) {
                    CreativeTools.modCanvas.paths[CreativeTools.modCanvas.currentLayer] = [...currentPath];
                }
                isDrawing = false;
                currentPath = [];
            });
            
            function addModPoint(e) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = 1 - (e.clientY - rect.top) / rect.height;
                currentPath.push({x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y))});
                drawModCanvas();
            }
            
            // Clear
            document.getElementById('clearModCanvas')?.addEventListener('click', () => {
                delete CreativeTools.modCanvas.paths[CreativeTools.modCanvas.currentLayer];
                drawModCanvas();
                showNotification('🧹 Layer cleared', true);
            });
            
            // Apply
            document.getElementById('applyModCanvas')?.addEventListener('click', () => {
                const target = document.getElementById('modCanvasTarget')?.value;
                showNotification(`🌊 Modulation applied to ${target}`, true);
            });
            
            // Shape tools
            document.querySelector('[data-mctool="sine"]')?.addEventListener('click', () => {
                CreativeTools.modCanvas.paths[CreativeTools.modCanvas.currentLayer] = [];
                for(let i=0; i<=50; i++) {
                    CreativeTools.modCanvas.paths[CreativeTools.modCanvas.currentLayer].push({
                        x: i/50,
                        y: Math.sin(i/50 * Math.PI * 2) * 0.5 + 0.5
                    });
                }
                drawModCanvas();
            });
            
            document.querySelector('[data-mctool="square"]')?.addEventListener('click', () => {
                CreativeTools.modCanvas.paths[CreativeTools.modCanvas.currentLayer] = [
                    {x:0,y:0.2},{x:0.25,y:0.2},{x:0.25,y:0.8},{x:0.5,y:0.8},
                    {x:0.5,y:0.2},{x:0.75,y:0.2},{x:0.75,y:0.8},{x:1,y:0.8}
                ];
                drawModCanvas();
            });
            
            drawModCanvas();
        }

        // ===== 6. MACRO SYSTEM =====
        function initMacroSystem() {
            // Initialize macro knobs (they use existing knob system)
            document.querySelectorAll('.macro-knob').forEach(knob => {
                // They're already initialized by the main knob system
            });
            
            // Add assignment button
            document.getElementById('addMacroAssignment')?.addEventListener('click', () => {
                const macroId = document.getElementById('assignMacroSelect')?.value;
                const target = document.getElementById('assignTargetParam')?.value;
                const minVal = document.getElementById('assignMinVal')?.value || -100;
                const maxVal = document.getElementById('assignMaxVal')?.value || 100;
                
                if(target && macroId) {
                    CreativeTools.macros[macroId].assignments.push({ target, min: parseInt(minVal), max: parseInt(maxVal) });
                    renderMacroAssignments(macroId);
                    showNotification(`🎯 Macro ${macroId} → ${target}`, true);
                }
            });
            
            function renderMacroAssignments(macroId) {
                const container = document.getElementById(`macro${macroId}Assignments`);
                if(!container) return;
                container.innerHTML = CreativeTools.macros[macroId].assignments.map(a => 
                    `<div style="font-size:7px;color:var(--accent);margin:2px 0;">→ ${a.target} [${a.min}% ~ ${a.max}%]</div>`
                ).join('');
            }
            
            // Render initial assignments
            [1,2,3,4].forEach(renderMacroAssignments);
        }

        // ===== 7. PERFORMANCE MODE =====
        function initPerformanceMode() {
            const xyPad = document.getElementById('xyPadCanvas');
            const handle = document.getElementById('xyPadHandle');
            if(!xyPad || !handle) return;
            
            let isDraggingHandle = false;
            
            function updateXYPos(clientX, clientY) {
                const rect = xyPad.getBoundingClientRect();
                let x = (clientX - rect.left) / rect.width;
                let y = (clientY - rect.top) / rect.height;
                x = Math.max(0, Math.min(1, x));
                y = Math.max(0, Math.min(1, y));
                
                CreativeTools.performance.xyPos = {x, y};
                handle.style.left = `${x * (rect.width - 24)}px`;
                handle.style.top = `${y * (rect.height - 24)}px`;
                
                // Apply to assigned parameters (mock)
                const xParam = document.getElementById('xAxisAssign')?.value;
                const yParam = document.getElementById('yAxisAssign')?.value;
                // In real implementation, would map these values to actual parameters
            }
            
            handle.addEventListener('mousedown', () => isDraggingHandle = true);
            document.addEventListener('mousemove', (e) => { if(isDraggingHandle) updateXYPos(e.clientX, e.clientY); });
            document.addEventListener('mouseup', () => isDraggingHandle = false);
            
            xyPad.addEventListener('click', (e) => {
                if(e.target !== handle) updateXYPos(e.clientX, e.clientY);
            });
            
            // Scene management
            document.querySelectorAll('.scene-slot').forEach(slot => {
                slot.addEventListener('click', () => {
                    document.querySelectorAll('.scene-slot').forEach(s => s.classList.remove('active'));
                    slot.classList.add('active');
                    CreativeTools.performance.activeScene = parseInt(slot.dataset.scene);
                    showNotification(`🎪 Scene ${slot.dataset.scene} activated`, true);
                });
            });
            
            // Capture scene
            document.getElementById('captureSceneBtn')?.addEventListener('click', () => {
                const sceneNum = CreativeTools.performance.activeScene;
                CreativeTools.performance.scenes[sceneNum] = { timestamp: Date.now(), /* would store actual param snapshot */ };
                showNotification(`📷 Scene ${sceneNum} captured!`, true);
            });
            
            // Loop recorder
            let loopInterval = null;
            let loopStartTime = 0;
            const loopBars = parseInt(document.getElementById('loopBars')?.value || 4);
            const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
            const loopDurationMs = (60 / bpm) * 1000 * loopBars;
            
            document.getElementById('loopRecBtn')?.addEventListener('click', function() {
                CreativeTools.performance.recording = !CreativeTools.performance.recording;
                this.textContent = CreativeTools.performance.recording ? '⏹ Stop' : '● REC Loop';
                this.style.background = CreativeTools.performance.recording ? '#F44336' : '';
                
                if(CreativeTools.performance.recording) {
                    loopStartTime = Date.now();
                    loopInterval = setInterval(() => {
                        const elapsed = Date.now() - loopStartTime;
                        const progress = (elapsed % loopDurationMs) / loopDurationMs * 100;
                        const bar = document.getElementById('loopBar');
                        const time = document.getElementById('loopTime');
                        if(bar) bar.style.width = `${progress}%`;
                        if(time) time.textContent = `${Math.floor(elapsed/1000/60)}:${String(Math.floor(elapsed/1000%60)).padStart(2,'0')}`;
                    }, 50);
                    showNotification('🔴 Loop recording...', true);
                } else {
                    clearInterval(loopInterval);
                    showNotification('⏹ Recording stopped', true);
                }
            });
        }

        // ===== 8. WEATHER SYSTEM =====
        function initWeatherSystem() {
            const weatherPresets = {
                sunny: { temp: 90, humid: 20, pressure: 70, wind: 10, icon: '☀️', name: 'Sunny & Bright' },
                rainy: { temp: 45, humid: 90, pressure: 30, wind: 40, icon: '🌧️', name: 'Rainy & Reflective' },
                stormy: { temp: 55, humid: 85, pressure: 10, wind: 95, icon: '⛈️', name: 'Stormy & Intense' },
                snowy: { temp: 15, humid: 50, pressure: 60, wind: 25, icon: '❄️', name: 'Snowy & Crystalline' },
                foggy: { temp: 50, humid: 95, pressure: 40, wind: 5, icon: '🌫️', name: 'Foggy & Mysterious' },
                windy: { temp: 60, humid: 35, pressure: 55, wind: 90, icon: '💨', name: 'Windy & Dynamic' }
            };
            
            function applyWeather(weather) {
                const w = weatherPresets[weather];
                if(!w) return;
                
                document.getElementById('weatherTemp').value = w.temp;
                document.getElementById('weatherHumid').value = w.humid;
                document.getElementById('weatherPressure').value = w.pressure;
                document.getElementById('weatherWind').value = w.wind;
                
                CreativeTools.weather.temp = w.temp;
                CreativeTools.weather.humid = w.humid;
                CreativeTools.weather.pressure = w.pressure;
                CreativeTools.weather.wind = w.wind;
                
                document.getElementById('weatherIcon').textContent = w.icon;
                document.getElementById('weatherName').textContent = w.name;
                
                updateWeatherLabels();
                applyWeatherToSound();
                showNotification(`${w.icon} ${w.name}`, true);
            }
            
            function updateWeatherLabels() {
                const labels = {
                    temp: [['Freezing','Cold','Cool','Mild','Warm','Hot','Scorching']],
                    humid: [['Arid','Dry','Comfortable','Humid','Damp','Soggy']],
                    pressure: [['Low Depressio','Low','Stable','High','High Pressure']],
                    wind: [['Calm','Breeze','Windy','Gusty','Stormy','Hurricane']]
                };
                
                const valToLabel = (val, arr) => {
                    const idx = Math.min(arr.length-1, Math.floor(val / 100 * arr.length));
                    return arr[idx];
                };
                
                document.getElementById('weatherTempVal').textContent = valToLabel(CreativeTools.weather.temp, labels.temp[0]);
                document.getElementById('weatherHumidVal').textContent = valToLabel(CreativeTools.weather.humid, labels.humid[0]);
                document.getElementById('weatherPressureVal').textContent = valToLabel(CreativeTools.weather.pressure, labels.pressure[0]);
                document.getElementById('weatherWindVal').textContent = valToLabel(CreativeTools.weather.wind, labels.wind[0]);
            }
            
            function applyWeatherToSound() {
                // Map weather to sound parameters
                // Temperature -> brightness/warmth
                // Humidity -> reverb/wetness
                // Pressure -> compression/density
                // Wind -> modulation/LFO speed
                const {temp, humid, pressure, wind} = CreativeTools.weather;
                
                // This would actually modify synth parameters in a real implementation
                console.log(`Weather Sound Map: Temp=${temp}%, Humid=${humid}%, Press=${pressure}%, Wind=${wind}%`);
            }
            
            // Weather preset buttons
            document.querySelectorAll('.weather-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => applyWeather(btn.dataset.weather));
            });
            
            // Individual sliders
            ['Temp','Humid','Pressure','Wind'].forEach(param => {
                const slider = document.getElementById(`weather${param}`);
                slider?.addEventListener('input', () => {
                    CreativeTools.weather[param.toLowerCase()] = parseInt(slider.value);
                    updateWeatherLabels();
                    applyWeatherToSound();
                });
            });
            
            // Animate checkbox
            document.getElementById('animateWeather')?.addEventListener('change', (e) => {
                CreativeTools.weather.animating = e.target.checked;
                if(e.target.checked) {
                    startWeatherAnimation();
                    showNotification('🌀 Weather animation started', true);
                } else {
                    stopWeatherAnimation();
                }
            });
            
            let weatherAnimInterval = null;
            function startWeatherAnimation() {
                weatherAnimInterval = setInterval(() => {
                    ['Temp','Humid','Pressure','Wind'].forEach(param => {
                        const slider = document.getElementById(`weather${param}`);
                        if(slider) {
                            let val = parseInt(slider.value) + (Math.random() - 0.5) * 3;
                            val = Math.max(0, Math.min(100, val));
                            slider.value = val;
                            CreativeTools.weather[param.toLowerCase()] = val;
                        }
                    });
                    updateWeatherLabels();
                    applyWeatherToSound();
                }, 500);
            }
            
            function stopWeatherAnimation() {
                if(weatherAnimInterval) {
                    clearInterval(weatherAnimInterval);
                    weatherAnimInterval = null;
                }
            }
            
            updateWeatherLabels();
        }

        // ===== 9. PRESET HISTORY TREE =====
        function initHistoryTree() {
            const canvas = document.getElementById('historyTreeCanvas');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            
            function drawHistoryTree() {
                const w = canvas.width, h = canvas.height;
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-dark') || '#0a0a0f';
                ctx.fillRect(0, 0, w, h);
                
                const nodes = CreativeTools.history.nodes;
                if(nodes.length === 0) {
                    ctx.fillStyle = 'rgba(107,114,128,0.5)';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Take snapshots to build your preset tree', w/2, h/2);
                    return;
                }
                
                // Draw nodes and connections
                const spacing = Math.min(80, (w - 40) / Math.max(nodes.length, 1));
                nodes.forEach((node, i) => {
                    const x = 30 + i * spacing;
                    const y = h/2 + (node.branch ? 30 : -30) * (i % 2 === 0 ? 1 : -1);
                    node._x = x; node._y = y;
                    
                    // Connection to parent
                    if(node.parent !== undefined && nodes[node.parent]) {
                        const px = nodes[node.parent]._x || 30 + node.parent * spacing;
                        const py = nodes[node.parent]._y || h/2;
                        ctx.strokeStyle = 'rgba(96,125,139,0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(px+12, py); ctx.lineTo(x-12, y); ctx.stroke();
                    }
                    
                    // Node circle
                    ctx.beginPath();
                    ctx.arc(x, y, 12, 0, Math.PI * 2);
                    ctx.fillStyle = node.id === CreativeTools.history.currentNode ? '#607D8B' : 'rgba(96,125,139,0.3)';
                    ctx.fill();
                    ctx.strokeStyle = '#607D8B';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Node label
                    ctx.fillStyle = node.id === CreativeTools.history.currentNode ? '#fff' : '#9699a6';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(node.name.substring(0,6), x, y+3);
                });
            }
            
            // Snapshot button
            document.getElementById('snapshotPresetBtn')?.addEventListener('click', () => {
                const node = {
                    id: Date.now(),
                    name: `Snap ${CreativeTools.history.nodes.length + 1}`,
                    timestamp: new Date().toLocaleTimeString(),
                    parent: CreativeTools.history.currentNode,
                    branch: false,
                    /* Would contain actual parameter snapshot */
                };
                CreativeTools.history.nodes.push(node);
                CreativeTools.history.currentNode = node.id;
                renderHistoryList();
                drawHistoryTree();
                showNotification(`📸 Snapshot: ${node.name}`, true);
            });
            
            // Branch button
            document.getElementById('branchPresetBtn')?.addEventListener('click', () => {
                const node = {
                    id: Date.now(),
                    name: `Branch ${CreativeTools.history.nodes.filter(n=>n.branch).length + 1}`,
                    timestamp: new Date().toLocaleTimeString(),
                    parent: CreativeTools.history.currentNode,
                    branch: true
                };
                CreativeTools.history.nodes.push(node);
                renderHistoryList();
                drawHistoryTree();
                showNotification(`🌿 Branch created!`, true);
            });
            
            // Export branch
            document.getElementById('exportBranchBtn')?.addEventListener('click', () => {
                const branchData = JSON.stringify(CreativeTools.history.nodes, null, 2);
                showNotification('📥 Branch copied to console (would download)', true);
                console.log('Exported Branch:', branchData);
            });
            
            // Clear
            document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
                CreativeTools.history.nodes = [];
                CreativeTools.history.currentNode = null;
                renderHistoryList();
                drawHistoryTree();
                showNotification('🗑️ History cleared', true);
            });
            
            function renderHistoryList() {
                const list = document.getElementById('historyNodesList');
                if(!list) return;
                list.innerHTML = CreativeTools.history.nodes.map(n => 
                    `<span class="history-node-item${n.id === CreativeTools.history.currentNode ? ' current' : ''}" data-id="${n.id}">${n.name}</span>`
                ).join('');
                
                list.querySelectorAll('.history-node-item').forEach(item => {
                    item.addEventListener('click', () => {
                        CreativeTools.history.currentNode = parseInt(item.dataset.id);
                        renderHistoryList();
                        drawHistoryTree();
                        showNotification(`📂 Loaded: ${item.textContent}`, true);
                    });
                });
            }
            
            drawHistoryTree();
        }

        // ===== 10. CONSTRAINT RANDOMIZER =====
        function initConstraintRandomizer() {
            const rollBtn = document.getElementById('rollDiceBtn');
            const intensitySlider = document.getElementById('randomizeIntensity');
            
            // Resonance constraint display
            document.getElementById('constMaxReso')?.addEventListener('input', (e) => {
                document.getElementById('constMaxResoVal').textContent = `${e.target.value}%`;
            });
            
            rollBtn?.addEventListener('click', () => {
                const intensity = parseInt(intensitySlider?.value || 50);
                
                // Save current state for undo
                CreativeTools.randomizer.lastState = {/* would capture actual params */};
                
                // Get constraints
                const locks = {};
                document.querySelectorAll('.constraint-opt input[data-lock]').forEach(cb => {
                    locks[cb.dataset.lock] = cb.checked;
                });
                
                const maxReso = parseInt(document.getElementById('constMaxReso')?.value || 90);
                const attackRange = document.getElementById('constAttackRange')?.value || 'medium';
                const charBias = document.getElementById('constCharBias')?.value || 'neutral';
                
                // Generate randomized parameters respecting constraints
                const result = generateConstrainedRandom(intensity, locks, maxReso, attackRange, charBias);
                
                // Add to history
                addToRandomHistory(result);
                
                showNotification(`🎲 Rolled! Intensity: ${intensity}% | Bias: ${charBias}`, true);
            });
            
            function generateConstrainedRandom(intensity, locks, maxReso, attackRange, bias) {
                // Mock randomization that respects constraints
                const result = {
                    intensity,
                    timestamp: Date.now(),
                    params: {
                        oscType: locks.oscType ? 'LOCKED' : ['sawtooth','square','sine','triangle'][Math.floor(Math.random()*4)],
                        filterCutoff: 200 + Math.random() * 8000,
                        resonance: Math.random() * (maxReso/100),
                        attack: attackRange === 'fast' ? Math.random()*0.1 : 
                               attackRange === 'slow' ? Math.random()*2 : Math.random()*0.5,
                        // ... more params
                    }
                };
                return result;
            }
            
            function addToRandomHistory(result) {
                CreativeTools.randomizer.history.unshift(result);
                if(CreativeTools.randomizer.history.length > 10) CreativeTools.randomizer.history.pop();
                renderRandomHistory();
            }
            
            function renderRandomHistory() {
                const container = document.getElementById('randomHistoryItems');
                if(!container) return;
                container.innerHTML = CreativeTools.randomizer.history.map((r, i) => 
                    `<span class="random-hist-item" data-index="${i}">Roll #${CreativeTools.randomizer.history-i} (${r.intensity}%)</span>`
                ).join('');
                
                container.querySelectorAll('.random-hist-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const idx = parseInt(item.dataset.index);
                        const roll = CreativeTools.randomizer.history[idx];
                        showNotification(`🎲 Revisited Roll #${CreativeTools.randomizer.history.length-idx}`, true);
                        // Would re-apply those parameters
                    });
                });
            }
            
            // Lock current
            document.getElementById('lockCurrentBtn')?.addEventListener('click', () => {
                CreativeTools.randomizer.lockedState = {/* capture */};
                showNotification('🔒 Current state locked as base', true);
            });
            
            // Undo
            document.getElementById('undoRandomizeBtn')?.addEventListener('click', () => {
                if(CreativeTools.randomizer.lastState) {
                    showNotification('↩ Restored previous state', true);
                    // Would restore parameters
                } else {
                    showNotification('Nothing to undo', false);
                }
            });
            
            renderRandomHistory();
        }

        // ===== INITIALIZE ALL CREATIVE TOOLS =====
        function initAllCreativeTools() {
            initMorphGrid();
            initTagSystem();
            initEvolutionEngine();
            initWaveformSculptor();
            initModulationCanvas();
            initMacroSystem();
            initPerformanceMode();
            initWeatherSystem();
            initHistoryTree();
            initConstraintRandomizer();
            
            console.log('   🎨 All 10 Revolutionary Creative Tools Initialized!');
        }

        // Initialize when DOM is ready
        if(document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAllCreativeTools);
        } else {
            initAllCreativeTools();
        }