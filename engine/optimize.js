/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Amalgamated Consensus Logic
 * Logic: Average intensity across 5 waypoints determines final color/icon.
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="20"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="20"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },
        milestones: ["Way-0", "Way-25", "Way-50", "Way-75", "Way-100"],

        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            if (!document.getElementById('opt-heat-map')) this.injectUI(container);
            this.runScan(route);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                const day = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                const hr = d.getHours();
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#444;">${day}</div>
                            <div style="font-size:9px; color:#888;">${hr % 12 || 12}${hr >= 12 ? 'PM' : 'AM'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:10px; font-family:monospace;">
                    <div style="display:flex; margin-bottom:4px; background:#000;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:36px; background:#111; padding:3px; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; display:flex; align-items:center; justify-content:center;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <span id="opt-consensus" style="color:#FFD700; font-weight:900; font-size:9px; letter-spacing:1px;">CALCULATING AMALGAMATED...</span>
                        <span id="opt-status" style="color:#00FF00; font-size:9px;">CONSENSUS SYNC</span>
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
                this.applyConsensusColor(cells[i], res.avgLevel, res.isSnow);
                if (i === 0) { 
                    document.getElementById('opt-consensus').innerText = res.avgLevel > 0 ? `AMALGAMATED HAZARD: ${res.trend}` : "ROUTE CONSENSUS: CLEAR";
                }
            }
        },

        async getAmalgamatedIndex(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let totalLevel = 0, snowCount = 0, precipPoints = 0;
            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));
                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    let L = 0;
                    if (code === 63 || code === 73) L = 3; 
                    else if (code === 61 || code === 71) L = 2;
                    else if (code >= 51 && code <= 55) L = 1;

                    if (L > 0) precipPoints++;
                    totalLevel += L;
                    if ((code >= 71 && code <= 75) || code >= 85) snowCount++;
                });
            } catch (e) { return {avgLevel: 0, isSnow: false, trend: "ERROR"}; }
            
            // Calculate Arithmetic Mean
            const avg = Math.round(totalLevel / points.length);
            return {
                avgLevel: avg,
                isSnow: snowCount > (points.length / 2),
                trend: precipPoints > 2 ? "CONSISTENT PRECIP" : "LOCALIZED PATCHES"
            };
        },

        applyConsensusColor(el, level, isSnow) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            // Only show icon if the amalgamated hazard is significant
            if (level >= 2) {
                el.innerHTML = isSnow ? this.svgs.snow : this.svgs.rain;
            } else {
                el.innerHTML = "";
            }
        },

        shiftTime(hours, target) {
            window.currentDepartureTime = new Date(Date.now() + parseInt(hours) * 3600000);
            if (window.WeatherEngine?.refresh) window.WeatherEngine.refresh();
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFF";
            this.runScan(Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20));
        }
    };
    Optimizer.init();
})();
