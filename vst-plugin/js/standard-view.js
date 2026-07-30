/**
 * PROSynth Standard View Controller
 * Handles preset browsing, vibe search, patch tools, and view switching
 */

(function() {
    'use strict';

    // ===== STATE =====
    let currentView = 'standard'; // 'standard' or 'advanced'
    let selectedCategory = 'all';
    let currentSearchQuery = '';
    let activePreset = null;
    let searchTimeout = null;

    // ===== DOM REFERENCES =====
    const standardView = document.getElementById('standardView');
    const advancedView = document.querySelector('.plugin-window'); // The original UI
    const presetListEl = document.getElementById('presetListContainer');
    const searchInput = document.getElementById('vibeSearchInput');
    const suggestionsEl = document.getElementById('vibeSuggestions');
    const categoryFiltersEl = document.getElementById('categoryFilters');
    const currentPresetNameEl = document.getElementById('currentPresetNameStd');
    const currentPresetMetaEl = document.getElementById('currentPresetMetaStd');

    // ===== INITIALIZATION =====
    function initStandardView() {
        if (!standardView) return;

        console.log('🎨 Initializing Standard View...');
        
        setupViewToggle();
        setupVibeSearch();
        setupCategoryFilters();
        renderPresetList(ALL_INDUSTRY_PRESETS);
        setupPatchTools();
        setupMiniVisualizers();

        // Show standard view by default
        showStandardView();
    }

    // ===== VIEW TOGGLE =====
    function setupViewToggle() {
        const stdBtn = document.getElementById('viewToggleStandard');
        const advBtn = document.getElementById('viewToggleAdvanced');
        const backBtn = document.getElementById('backToStandardBtn');

        stdBtn?.addEventListener('click', () => showStandardView());
        advBtn?.addEventListener('click', () => showAdvancedView());
        backBtn?.addEventListener('click', () => {
            console.log('◀ Back to Standard clicked');
            showStandardView();
        });
    }

    function showStandardView() {
        currentView = 'standard';
        
        // Hide advanced view (original plugin window)
        if (advancedView) {
            advancedView.style.display = 'none';
        }
        
        // Show standard view
        standardView.classList.add('active');
        
        // Update toggle buttons
        document.getElementById('viewToggleStandard')?.classList.add('active');
        document.getElementById('viewToggleAdvanced')?.classList.remove('active');

        console.log('📱 Switched to Standard View');
    }

    function showAdvancedView() {
        currentView = 'advanced';
        
        // Hide standard view
        standardView.classList.remove('active');
        
        // Show advanced view (original plugin window)
        if (advancedView) {
            advancedView.style.display = '';
        }
        
        // Update toggle buttons
        document.getElementById('viewToggleStandard')?.classList.remove('active');
        document.getElementById('viewToggleAdvanced')?.classList.add('active');

        console.log('⚙️ Switched to Advanced View');
    }

    window.toggleView = function(view) {
        if (view === 'standard') showStandardView();
        else showAdvancedView();
    };

    // ===== VIBE SEARCH =====
    function setupVibeSearch() {
        if (!searchInput) return;

        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length >= 2) {
                showSuggestions();
            }
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 200);
        });

        // Keyboard navigation for suggestions
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }

    function handleSearchInput(e) {
        const query = e.target.value;
        currentSearchQuery = query;

        // Debounce search results
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 150);

        // Update suggestions
        if (query.length >= 2) {
            updateSuggestions(query);
            showSuggestions();
        } else {
            hideSuggestions();
            renderPresetList(getFilteredPresets());
        }
    }

    function handleSearchKeydown(e) {
        const items = suggestionsEl?.querySelectorAll('.vibe-suggestion-item');
        if (!items || items.length === 0) return;

        const selected = suggestionsEl.querySelector('.selected');
        const selectedIndex = Array.from(items).indexOf(selected);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
            selectSuggestionItem(items[nextIndex]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
            selectSuggestionItem(items[prevIndex]);
        } else if (e.key === 'Enter' && selected) {
            e.preventDefault();
            selected.click();
        }
    }

    function selectSuggestionItem(item) {
        suggestionsEl.querySelectorAll('.vibe-suggestion-item').forEach(i => i.classList.remove('selected'));
        item?.classList.add('selected');
    }

    function updateSuggestions(query) {
        const suggestions = window.vibeSearchEngine?.getSuggestions(query) || [];
        
        if (suggestions.length === 0 || !suggestionsEl) {
            hideSuggestions();
            return;
        }

        suggestionsEl.innerHTML = suggestions.map(sugg => {
            const count = getFilteredPresets().filter(p => 
                p.vibe.some(v => v.toLowerCase() === sugg.toLowerCase()) ||
                p.tags.some(t => t.toLowerCase() === sugg.toLowerCase())
            ).length;
            
            return `<div class="vibe-suggestion-item" data-vibe="${sugg}">
                <span>🔍</span>
                <span>${sugg}</span>
                <span class="suggestion-count">${count}</span>
            </div>`;
        }).join('');

        // Add click handlers
        suggestionsEl.querySelectorAll('.vibe-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.dataset.vibe;
                handleSearchInput({ target: searchInput });
                hideSuggestions();
            });
        });
    }

    function showSuggestions() {
        suggestionsEl?.classList.add('active');
    }

    function hideSuggestions() {
        suggestionsEl?.classList.remove('active');
    }

    function performSearch(query) {
        const filtered = query.trim() 
            ? window.vibeSearchEngine?.search(query) || []
            : getFilteredPresets();
        
        renderPresetList(filtered);
    }

    // ===== CATEGORY FILTERS =====
    function setupCategoryFilters() {
        if (!categoryFiltersEl) return;

        const categories = [
            { id: 'all', name: 'All', icon: '🎵' },
            { id: 'leads', name: 'Leads', icon: '🎸' },
            { id: 'basses', name: 'Basses', icon: '🎵' },
            { id: 'pads', name: 'Pads', icon: '☁️' },
            { id: 'plucks', name: 'Plucks/Keys', icon: '🎹' },
            { id: 'fx', name: 'FX/Textures', icon: '✨' },
            { id: 'orchestral', name: 'Orchestral', icon: '🎻' },
            { id: 'drums', name: 'Drums/Perc', icon: '🥁' }
        ];

        categoryFiltersEl.innerHTML = categories.map(cat => `
            <button class="category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}" 
                    data-category="${cat.id}">
                <span class="cat-icon">${cat.icon}</span>${cat.name}
            </button>
        `).join('');

        categoryFiltersEl.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedCategory = btn.dataset.category;
                
                // Update active state
                categoryFiltersEl.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Re-render with filter
                performSearch(currentSearchQuery);
            });
        });
    }

    function getFilteredPresets() {
        let presets = ALL_INDUSTRY_PRESETS;
        
        if (selectedCategory !== 'all') {
            presets = INDUSTRY_PRESETS[selectedCategory] || [];
        }

        return presets;
    }

    // ===== PRESET LIST RENDERING =====
    function renderPresetList(presets) {
        if (!presetListEl) return;

        if (presets.length === 0) {
            presetListEl.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <p>No presets found for "${currentSearchQuery}"</p>
                    <p style="margin-top:8px;font-size:11px;">Try terms like "Soft Lead", "Warm Pad", "Acid Bass"</p>
                </div>
            `;
            return;
        }

        presetListEl.innerHTML = presets.map((preset, idx) => {
            const category = Object.keys(INDUSTRY_PRESETS).find(key => 
                INDUSTRY_PRESETS[key].includes(preset)
            ) || 'unknown';
            
            const isActive = activePreset && activePreset.name === preset.name;

            return `
                <div class="preset-card ${isActive ? 'active' : ''}" data-preset-idx="${idx}">
                    <div class="preset-card-header">
                        <span class="preset-name">${preset.name}</span>
                        <span class="preset-category-badge">${category}</span>
                    </div>
                    <div class="preset-artist">🎤 ${preset.artist}</div>
                    <div class="preset-song-ref">💿 "${preset.song}"</div>
                    <div class="preset-tags">
                        ${preset.tags.slice(0, 4).map(tag => `<span class="preset-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="preset-vibes">
                        ${preset.vibe.slice(0, 3).map(vibe => `<span class="preset-vibe">${vibe}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        presetListEl.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.presetIdx);
                selectPreset(presets[idx]);
            });

            // Double click to load immediately
            card.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const idx = parseInt(card.dataset.presetIdx);
                loadPresetImmediately(presets[idx]);
            });
        });
    }

    function selectPreset(preset) {
        activePreset = preset;
        
        // Update visual state
        presetListEl.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        event.currentTarget?.classList.add('active');

        // Update current display
        if (currentPresetNameEl) {
            currentPresetNameEl.textContent = preset.name;
        }
        if (currentPresetMetaEl) {
            currentPresetMetaEl.textContent = `${preset.artist} • ${Object.keys(INDUSTRY_PRESETS).find(k => INDUSTRY_PRESETS[k].includes(preset))}`;
        }

        // Show detail popup on single click after short delay
        showPresetDetail(preset);
    }

    // ===== PARAMETER MAPPING (Preset names → Actual Knob names) =====
    const PARAMETER_MAP = {
        // Oscillator
        'oscType': 'osc1Type',
        'oscPitch': 'osc1Pitch',
        'oscDetune': 'osc1Detune',
        // Filter  
        'filterCutoff': 'filter1Cutoff',
        'filterReso': 'filter1Reso',
        'filterEnv': 'filter1Env',
        // Reverb
        'reverbSize': 'revSize',
        'reverbDecay': 'revDecay',
        'reverbMix': 'revMix',
        // Unison
        'unison': 'unisonVoices'
    };

    /**
     * Map preset parameters to actual knob parameters
     * Converts friendly preset names to actual data-param names
     */
    function mapPresetParams(presetParams) {
        const mapped = {};
        Object.entries(presetParams).forEach(([key, value]) => {
            const mappedKey = PARAMETER_MAP[key] || key;
            mapped[mappedKey] = value;
        });
        
        // Ensure critical defaults for audio engine
        if (!mapped.osc1Type) mapped.osc1Type = 'sawtooth';
        if (!mapped.unisonVoices) mapped.unisonVoices = 1;
        if (!mapped.unisonDetune) mapped.unisonDetune = 10;
        if (!mapped.attack) mapped.attack = 0.01;
        if (!mapped.decay) mapped.decay = 0.2;
        if (!mapped.sustain) mapped.sustain = 70;
        if (!mapped.release) mapped.release = 0.3;
        if (!mapped.filter1Cutoff) mapped.filter1Cutoff = 8000;
        if (!mapped.filter1Reso) mapped.filter1Reso = 1;
        
        return mapped;
    }

    function loadPresetImmediately(preset) {
        activePreset = preset;
        
        // Map preset parameters to actual knob parameters
        const mappedParams = mapPresetParams(preset.params);
        
        console.log('🎵 Loading preset:', preset.name);
        console.log('   Mapped params:', mappedParams);
        
        // Apply parameters
        if (typeof setAllKnobValues === 'function') {
            setAllKnobValues(mappedParams);
        }

        // Update display
        if (currentPresetNameEl) {
            currentPresetNameEl.textContent = `▶ ${preset.name}`;
        }

        // Notification
        if (typeof showNotification === 'function') {
            showNotification(`🎹 Loaded: ${preset.name}`, true);
        }

        console.log('🎵 Loaded preset:', preset.name, '-', preset.artist);
    }

    // ===== PRESET DETAIL POPUP =====
    function showPresetDetail(preset) {
        const popup = document.getElementById('presetDetailPopup');
        const backdrop = document.getElementById('popupBackdrop');
        
        if (!popup || !backdrop) return;

        const analysis = window.PatchTools?.analyzePatch(preset.params) || {};

        popup.querySelector('.detail-title-group h3').textContent = preset.name;
        popup.querySelector('.detail-artist').textContent = preset.artist;
        popup.querySelector('.detail-song').textContent = `"${preset.song}"`;
        
        // Tags
        popup.querySelector('.detail-tags-row').innerHTML = 
            preset.tags.map(t => `<span class="preset-tag">${t}</span>`).join('');
        
        // Vibes
        popup.querySelector('.detail-vibes-row').innerHTML = 
            preset.vibe.map(v => `<span class="preset-vibe">${v}</span>`).join('');
        
        // Analysis bars
        if (analysis.brightness !== undefined) {
            popup.querySelector('[data-analysis="brightness"] .analysis-bar-value').textContent = Math.round(analysis.brightness) + '%';
            popup.querySelector('[data-analysis="brightness"] .analysis-bar-fill-inner').style.width = analysis.brightness + '%';
        }
        if (analysis.warmth !== undefined) {
            popup.querySelector('[data-analysis="warmth"] .analysis-bar-value').textContent = Math.round(analysis.warmth) + '%';
            popup.querySelector('[data-analysis="warmth"] .analysis-bar-fill-inner').style.width = analysis.warmth + '%';
        }
        if (analysis.thickness !== undefined) {
            popup.querySelector('[data-analysis="thickness"] .analysis-bar-value').textContent = Math.round(analysis.thickness) + '%';
            popup.querySelector('[data-analysis="thickness"] .analysis-bar-fill-inner').style.width = analysis.thickness + '%';
        }

        // Load button handler
        popup.querySelector('.btn-primary').onclick = () => {
            loadPresetImmediately(preset);
            closePopup();
        };

        // Close button
        popup.querySelector('.detail-close').onclick = closePopup;
        backdrop.onclick = closePopup;

        backdrop.classList.add('active');
        popup.classList.add('active');
    }

    function closePopup() {
        document.getElementById('presetDetailPopup')?.classList.remove('active');
        document.getElementById('popupBackdrop')?.classList.remove('active');
    }

    // ===== PATCH TOOLS =====
    function setupPatchTools() {
        // Morph slider
        const morphSlider = document.getElementById('morphAmountSlider');
        morphSlider?.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            document.getElementById('morphValueDisplay').textContent = Math.round(value * 100) + '%';
            
            if (activePreset && typeof getAllKnobValues === 'function') {
                const currentParams = getAllKnobValues();
                const morphed = window.PatchTools?.morph(currentParams, activePreset.params, value);
                if (morphed && typeof setAllKnobValues === 'function') {
                    setAllKnobValues(morphed);
                }
            }
        });

        // Tool cards
        document.querySelectorAll('.patch-tool-card[data-tool]').forEach(card => {
            card.addEventListener('click', () => applyPatchTool(card.dataset.tool));
        });
    }

    function applyPatchTool(toolId) {
        if (!activePreset || typeof getAllKnobValues !== 'function') {
            if (typeof showNotification === 'function') {
                showNotification('Select a preset first!', false);
            }
            return;
        }

        const currentParams = getAllKnobValues();
        const baseParams = mapPresetParams(activePreset.params);
        let newParams;

        switch (toolId) {
            case 'variation-low':
                newParams = window.PatchTools?.createVariation(baseParams, 'low');
                break;
            case 'variation-med':
                newParams = window.PatchTools?.createVariation(baseParams, 'medium');
                break;
            case 'variation-high':
                newParams = window.PatchTools?.createVariation(baseParams, 'high');
                break;
            case 'randomize':
                newParams = window.PatchTools?.smartRandomize(baseParams, { variance: 0.3 });
                break;
            case 'warmer':
                newParams = {...baseParams, filter1Cutoff: (baseParams.filter1Cutoff || 2000) * 0.7};
                break;
            case 'brighter':
                newParams = {...baseParams, filter1Cutoff: (baseParams.filter1Cutoff || 2000) * 1.3};
                break;
            case 'thicken':
                newParams = {...baseParams, unisonVoices: Math.min(16, (baseParams.unisonVoices || 1) + 2)};
                break;
            default:
                return;
        }

        if (newParams && typeof setAllKnobValues === 'function') {
            setAllKnobValues(newParams);
            if (typeof showNotification === 'function') {
                showNotification(`🛠️ Applied: ${toolId.replace('-', ' ')}`, true);
            }
        }
    }

    // ===== MINI VISUALIZERS =====
    function setupMiniVisualizers() {
        // Setup mini waveform canvas
        const waveCanvas = document.getElementById('miniWaveformCanvas');
        if (waveCanvas) {
            const ctx = waveCanvas.getContext('2d');
            
            function drawMiniWaveform() {
                const w = waveCanvas.width = waveCanvas.offsetWidth * 2;
                const h = waveCanvas.height = waveCanvas.offsetHeight * 2;
                
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-dark') || '#0a0a0f';
                ctx.fillRect(0, 0, w, h);
                
                // Draw animated waveform
                ctx.strokeStyle = '#00D4FF';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                
                const time = Date.now() / 1000;
                for (let x = 0; x < w; x++) {
                    const y = h/2 + Math.sin(x * 0.03 + time * 3) * (h * 0.25) +
                              Math.sin(x * 0.08 + time * 5) * (h * 0.12) +
                              Math.sin(x * 0.02 + time * 1.5) * (h * 0.15);
                    
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                
                ctx.stroke();
                
                requestAnimationFrame(drawMiniWaveform);
            }
            
            drawMiniWaveform();
        }

        // Setup mini spectrum canvas
        const specCanvas = document.getElementById('miniSpectrumCanvas');
        if (specCanvas) {
            const ctx = specCanvas.getContext('2d');
            
            function drawMiniSpectrum() {
                const w = specCanvas.width = specCanvas.offsetWidth * 2;
                const h = specCanvas.height = specCanvas.offsetHeight * 2;
                
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-dark') || '#0a0a0f';
                ctx.fillRect(0, 0, w, h);
                
                // Draw frequency bars
                const barCount = 16;
                const barWidth = (w / barCount) - 4;
                const time = Date.now() / 500;
                
                for (let i = 0; i < barCount; i++) {
                    const height = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * h * 0.8 + h * 0.15;
                    const hue = 180 + (i / barCount) * 60;
                    
                    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
                    ctx.fillRect(i * (barWidth + 4) + 2, h - height, barWidth, height);
                }
                
                requestAnimationFrame(drawMiniSpectrum);
            }
            
            drawMiniSpectrum();
        }
    }

    // ===== INITIALIZE ON DOM READY =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStandardView);
    } else {
        initStandardView();
    }

    // Expose public API
    window.StandardView = {
        showStandard: showStandardView,
        showAdvanced: showAdvancedView,
        getCurrentView: () => currentView,
        loadPreset: loadPresetImmediately,
        getPresetLibrary: () => ALL_INDUSTRY_PRESETS
    };

})();
