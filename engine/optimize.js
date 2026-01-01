/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: High-Brightness Gradient + Click Stability
 * Logic: Event Delegation + Neon HEX Scale (Precip-Only)
 */

(function() {
    const Optimizer = {
        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            this.runScan(route);
        },

        injectUI(container) {
            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:11px; letter-spacing:2px;">48H PRECIPITATION INDEX</span>
                        <span id="opt-status" style="color:#FFF; font-size:10px; font-family:monospace; text-shadow: 0 0 5px #000;">STABILIZING...</span>
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:20px; background:#000; padding:2px; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#00FF00; cursor:pointer; transition: background 0.3s; border-radius:1px;"></div>`).join('')}
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', html);
            
            // Event Delegation: Fixes the 'broken' click issue
            const grid = document.getElementById('heat-grid');
            grid.onclick = (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            };
        },

        async runScan(route) {
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const hourOffset = i * 2;
                const level = await this.checkPrecip(samples, hourOffset);
                this.applyColor(cells[i], level);
            }
            document.getElementById('opt-status').innerText = "SCAN COMPLETE";
        },

        async checkPrecip(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let max = 0;
            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));
                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    let L = 0;
                    if (code === 65 || code === 75 || code >= 95) L = 4; // RED
                    else if (code === 63 || code === 73) L = Math.max(L, 3); // ORANGE
                    else if (code === 61 || code === 71 || code === 55) L = Math.max(L, 2); // YELLOW
                    else if (code === 51 || code === 53) L = Math.max(L, 1); // LIME
                    if (L > max) max = L;
                });
            } catch (e) { return 0; }
            return max;
        },

        applyColor(el, level) {
            // HIGH BRIGHTNESS NEON SCALE
            const neonColors = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neonColors[level];
            el.style.boxShadow = `0 0 5px ${neonColors[level]}`; // Adds glow
        },

        shiftTime(hours, target) {
            window.currentDepartureTime = new Date(Date.now() + parseInt(hours) * 3600000);
            if (window.WeatherEngine) window.WeatherEngine.refresh();
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFF";
        }
    };
    Optimizer.init();
})();
