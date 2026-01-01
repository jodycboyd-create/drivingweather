/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Fixed Hazard Gradient - Precipitation & Visibility ONLY.
 * Logic: Temperature is ignored. 0-3 Codes + 10km Vis = Pure Green.
 */

(function() {
    const Optimizer = {
        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            if (!document.getElementById('opt-heat-map')) this.injectUI(container);
            this.runScan(route);
        },

        injectUI(container) {
            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:11px; letter-spacing:2px;">48H DEPARTURE HAZARD INDEX</span>
                        <span id="opt-status" style="color:#666; font-size:10px; font-family:monospace;">PRECIP/VIS ONLY</span>
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:16px;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#111; border:1px solid #333; cursor:pointer; transition: background 0.4s;"></div>`).join('')}
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', html);
            document.querySelectorAll('.heat-cell').forEach(cell => {
                cell.onclick = (e) => this.shiftTime(cell.dataset.h, e.target);
            });
        },

        async runScan(route) {
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const hourOffset = i * 2;
                const hazard = await this.checkHazard(samples, hourOffset);
                this.applyColor(cells[i], hazard);
            }
            document.getElementById('opt-status').innerText = "ISLAND SCAN COMPLETE";
        },

        async checkHazard(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let maxLevel = 0;

            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code,visibility&timezone=auto`).then(r => r.json())
                ));

                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    const vis = (d.hourly.visibility[idx] || 10000) / 1000; // km

                    let ptLevel = 0;
                    if (code >= 75 || code === 65 || code >= 95 || vis < 0.5) ptLevel = 4;
                    else if (code >= 73 || code === 63 || vis < 2) ptLevel = Math.max(ptLevel, 3);
                    else if (code >= 71 || code === 61 || code === 55 || vis < 5) ptLevel = Math.max(ptLevel, 2);
                    else if (code >= 51 || (code >= 1 && code <= 3 && vis < 10)) ptLevel = Math.max(ptLevel, 1);
                    
                    if (ptLevel > maxLevel) maxLevel = ptLevel;
                });
            } catch (e) { return 0; }
            return maxLevel;
        },

        applyColor(el, level) {
            const colors = { 0: "#1a4422", 1: "#6b8e23", 2: "#d4af37", 3: "#b8860b", 4: "#8b0000" };
            el.style.backgroundColor = colors[level];
        },

        shiftTime(hours, target) {
            window.currentDepartureTime = new Date(Date.now() + parseInt(hours) * 3600000);
            if (window.WeatherEngine && typeof window.WeatherEngine.refresh === 'function') {
                window.WeatherEngine.refresh();
            }
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFD700";
        }
    };
    Optimizer.init();
})();
