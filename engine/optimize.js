(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="20"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="20"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            
            // Fix: Check for existence to prevent UI collapse/re-injection
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            this.runScan(route);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#444; text-transform:uppercase;">${d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                            <div style="font-size:9px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #00FFFF; padding-bottom:10px; font-family:monospace;">
                    <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:38px; background:#111; padding:3px; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; display:flex; align-items:center; justify-content:center;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 2px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:9px; letter-spacing:1px;">METRo ROAD SCAN...</span>
                        <span id="opt-count" style="color:#00FF00; font-size:9px; font-weight:bold;">SURFACE: STABLE</span>
                    </div>
                </div>`;
            // Ensure we insert into the top of the matrix container without overwriting
            container.insertAdjacentHTML('afterbegin', html);
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
                const res = await this.getMetroHazardIndex(samples, i * 2);
                this.applyMetroColor(cells[i], res);
                if (i === 0) { 
                    document.getElementById('opt-consensus').innerText = `ROAD STATE: ${res.roadState}`;
                    document.getElementById('opt-count').innerText = `AVG RST: ${res.avgRST.toFixed(1)}°C`;
                }
            }
        },

        async getMetroHazardIndex(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let totalRST = 0, totalMM = 0, snowC = 0, iceRiskC = 0, wetC = 0;
            
            try {
                const responses = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code,precipitation,temperature_2m&timezone=auto`).then(r => r.json())
                ));

                responses.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    const airTemp = d.hourly.temperature_2m[idx];
                    const mm = d.hourly.precipitation[idx] || 0;
                    const code = d.hourly.weather_code[idx];

                    let simulatedRST = airTemp - 1.5; 
                    totalRST += simulatedRST;
                    totalMM += mm;

                    if (mm > 0) {
                        if (simulatedRST < -1.0) iceRiskC++;
                        else if (simulatedRST <= 0.5) snowC++;
                        else wetC++;
                    }
                    if ((code >= 71 && code <= 75) || code >= 85) snowC++;
                });
            } catch (e) { return {roadState: "ERROR", avgRST: 0}; }

            let state = "DRY";
            let severity = 0;
            if (totalMM > 0) {
                if (iceRiskC > 0) { state = "ICE"; severity = 4; }
                else if (snowC > 0) { state = "SLUSH"; severity = 3; }
                else { state = "WET"; severity = 2; }
            }

            return {
                severity: severity, roadState: state,
                avgRST: totalRST / points.length,
                precipDetected: totalMM > 0,
                isSnow: snowC > 0, totalMM: totalMM
            };
        },

        applyMetroColor(el, data) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[data.severity];
            el.innerHTML = data.precipDetected ? (data.isSnow ? this.svgs.snow : this.svgs.rain) : "";
        },

        shiftTime(hours, target) {
            if (hours === undefined) return;
            const offset = parseInt(hours);

            // 1. Sync Map Time for main Weather Engine
            window.currentDepartureTime = new Date(Date.now() + offset * 3600000);
            if (window.WeatherEngine?.refresh) window.WeatherEngine.refresh();

            // 2. UI Highlight
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #00FFFF";

            // 3. Sync RWIS Icons (Forecasted Pills)
            if (window.RWIS && typeof RWIS.updatePills === 'function') {
                RWIS.updatePills(offset);
            }

            // 4. Sync METRo Table
            if (window.MetroTable && typeof MetroTable.updateTable === 'function') {
                MetroTable.updateTable(offset);
            }

            // 5. Refresh Route Analysis (Icons on Map)
            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
            if (route) this.runScan(route);
        }
    };
    Optimizer.init();
    window.Optimizer = Optimizer; // Expose to global scope for module sync
})();
