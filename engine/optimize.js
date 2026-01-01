/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Restore Full Logic + Precipitation Hard-Lock (0.0mm = Green)
 * Status: /* NO_COMPRESSION_STRICT */
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="20"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="20"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            
            // Wait for route to load if missing
            if (!container || !route) {
                console.log("[weong] Waiting for map route...");
                return setTimeout(() => this.init(), 1000);
            }

            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            this.runScan(route);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                const day = d.toLocaleDateString('en-CA', { weekday: 'short' });
                const hr = d.getHours();
                const ampm = hr >= 12 ? 'PM' : 'AM';
                const dispHr = hr % 12 || 12;
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#444; text-transform:uppercase;">${day}</div>
                            <div style="font-size:9px; color:#888;">${dispHr}${ampm}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:10px; font-family:monospace;">
                    <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:38px; background:#111; padding:3px; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: background 0.3s;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 2px;">
                        <span id="opt-consensus" style="color:#FFD700; font-weight:900; font-size:9px; letter-spacing:1px; text-transform:uppercase;">INITIALIZING SCAN...</span>
                        <span id="opt-count" style="color:#00FF00; font-size:9px; font-weight:bold;">0/5 WAYPOINTS</span>
                    </div>
                </div>`;
            
            container.children[0].insertAdjacentHTML('afterbegin', html);
            
            document.getElementById('heat-grid').onclick = (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            };
        },

        async runScan(route) {
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const res = await this.getAmalgamatedIndex(samples, i * 2);
                this.applySensitiveColor(cells[i], res);
                
                // Update live label for the first (active) block
                if (i === 0) { 
                    document.getElementById('opt-consensus').innerText = res.precipDetected ? `PRECIP: ${res.dominantType}` : "ROUTE CLEAR";
                    document.getElementById('opt-count').innerText = `${res.activeCount}/5 WAYPOINTS ACTIVE`;
                }
            }
        },

        async getAmalgamatedIndex(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let totalL = 0;
            let totalPrecipAmount = 0;
            let snowCount = 0;
            let precipCount = 0;

            try {
                const responses = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code,precipitation&timezone=auto`).then(r => r.json())
                ));

                responses.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;

                    const code = d.hourly.weather_code[idx];
                    const mm = d.hourly.precipitation[idx] || 0;
                    
                    totalPrecipAmount += mm;

                    let L = 0;
                    // Strict Level Assignment
                    if (mm > 0) {
                        precipCount++;
                        if (code === 63 || code === 73) L = 3; // Orange
                        else if (code >= 65 || code >= 75) L = 4; // Red
                        else L = 2; // Yellow
                    } else if (code >= 51 && code <= 55) {
                        L = 1; // Lime (Drizzle)
                    }

                    totalL += L;
                    if ((code >= 71 && code <= 75) || code >= 85) snowCount++;
                });
            } catch (e) { 
                console.error("Scan Error:", e);
                return {avgL: 0, precipDetected: false}; 
            }
            
            return {
                avgL: totalL / points.length,
                totalMM: totalPrecipAmount,
                activeCount: precipCount,
                precipDetected: totalPrecipAmount > 0,
                isSnow: snowCount > 0,
                dominantType: snowCount >= (precipCount / 2) ? "SNOW" : "RAIN"
            };
        },

        applySensitiveColor(el, data) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            
            // Hard Override: If 0.0mm is detected across waypoints, force Green
            if (data.totalMM === 0) {
                el.style.backgroundColor = neon[0];
                el.innerHTML = "";
                return;
            }

            // Threshold: avg > 0.5 = Yellow, avg > 2.0 = Orange
            let colorIdx = data.avgL > 2.0 ? 3 : data.avgL > 0.5 ? 2 : data.avgL > 0.1 ? 1 : 0;
            el.style.backgroundColor = neon[colorIdx];
            
            // If precipitation is confirmed at any point, show the icon
            if (data.precipDetected) {
                el.innerHTML = data.isSnow ? this.svgs.snow : this.svgs.rain;
            } else {
                el.innerHTML = "";
            }
        },

        shiftTime(hours, target) {
            if (!hours) return;
            window.currentDepartureTime = new Date(Date.now() + parseInt(hours) * 3600000);
            if (window.WeatherEngine?.refresh) window.WeatherEngine.refresh();
            
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFF";
            
            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
            this.runScan(route);
        }
    };

    Optimizer.init();
})();
