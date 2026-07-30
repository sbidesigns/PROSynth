        // ===== SKIN SWITCHING SYSTEM =====
        
        const SKIN_NAMES = {
            midnight: { name: 'Midnight Studio', icon: '🌙', desc: 'Dark cyan/purple professional' },
            vintage: { name: 'Vintage Analog', icon: '🎛️', desc: 'Classic hardware warmth' },
            neon: { name: 'Neon Cyberpunk', icon: '💚', desc: 'Futuristic high-tech' },
            ocean: { name: 'Ocean DAW', icon: '🌊', desc: 'Professional studio blue' },
            sunset: { name: 'Sunset Creative', icon: '🌅', desc: 'Warm orange ambience' },
            arctic: { name: 'Arctic Minimal', icon: '❄️', desc: 'Clean modern light' }
        };
        
        let currentSkin = localStorage.getItem('mysynth_skin') || 'midnight';
        
        function applySkin(skinName) {
            const body = document.body;
            
            // Remove all skin data attributes
            Object.keys(SKIN_NAMES).forEach(s => body.removeAttribute('data-skin'));
            
            // Apply new skin (midnight is default, no attribute needed)
            if(skinName !== 'midnight') {
                body.setAttribute('data-skin', skinName);
            }
            
            // Update selector
            const selector = document.getElementById('skinSelector');
            if(selector) selector.value = skinName;
            
            // Save preference
            localStorage.setItem('mysynth_skin', skinName);
            currentSkin = skinName;
            
            // Show notification
            const skinInfo = SKIN_NAMES[skinName];
            showNotification(`${skinInfo.icon} ${skinInfo.name}`, true);
            
            // Special handling for arctic skin - adjust plugin window shadow for light theme
            const pluginWindow = document.querySelector('.plugin-window');
            if(pluginWindow) {
                if(skinName === 'arctic') {
                    pluginWindow.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15), 0 0 40px var(--glow), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px var(--border)';
                    pluginWindow.style.background = 'linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)';
                } else {
                    pluginWindow.style.boxShadow = '';
                    pluginWindow.style.background = '';
                }
            }
        }
        
        // Initialize skin on load
        applySkin(currentSkin);
        
        // Skin change handler
        document.getElementById('skinSelector')?.addEventListener('change', (e) => {
            applySkin(e.target.value);
        });

        // ===== NEW: ALL MVP FEATURES =====
        