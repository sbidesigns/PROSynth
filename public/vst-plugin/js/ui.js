        // ===== VISUALIZER =====
        function drawVisualizer() {
            const canvas = document.getElementById('visualizerCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
            
            const w = canvas.offsetWidth, h = canvas.offsetHeight;
            ctx.fillStyle = '#12121a';
            ctx.fillRect(0, 0, w, h);
            
            const bars = 64;
            const barWidth = w / bars - 1;
            
            for (let i = 0; i < bars; i++) {
                const barHeight = (Math.sin(Date.now() * 0.002 + i * 0.2) * 0.5 + 0.5) * 
                                  (Math.random() * 0.3 + 0.2) * 
                                  (voiceCount > 0 ? 0.8 : 0.15) * h;
                
                const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
                gradient.addColorStop(0, '#00D4FF');
                gradient.addColorStop(1, '#8B5CF6');
                ctx.fillStyle = gradient;
                ctx.fillRect(i * (barWidth + 1), h - barHeight, barWidth, barHeight);
            }
            
            requestAnimationFrame(drawVisualizer);
        }

        // Initialize
        updateADSRVisual();
        updateWaveform();
        drawVisualizer();
