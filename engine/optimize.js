/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Time Scale Header + Stabilized Precipitation Triggers
 * Logic: Event Delegation + Neon Scale (Strictly 0-3/45 = Green)
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
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                const hour = d.getHours();
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `<span style="width: calc(100% / 12); text-align:center;">${hour % 12 || 12}${ampm}</span>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px; font-family:monospace;">
                    <div id="time-scale" style="display:flex; color:#AAA; font-size:9px; margin-bottom:5px; font-weight:bold;">
                        ${timeLabels}
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:22px; background:#000; padding:2px; border:1px solid #444;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#00FF00; cursor:pointer; transition: 0.3s; border-radius:1px;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <span style="color:#FFD700; font-weight:900; font-size:10px; letter-spacing:1px;">DEPARTURE PRECIPITATION INDEX</span>
                        <span id="opt-status" style="color:#00FF00; font-size:9px;">SYNCED</span>
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
                const level = await this.checkPrecip(samples, i * 2);
                this.applyColor(cells[i], level);
            }
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
                    
                    // STRICT PRECIPITATION MAPPING (Ignore codes 0, 1, 2, 3, 45)
                    let L = 0;
                    if (code === 65 || code === 75 || code >= 95) L = 4; // RED: Heavy
                    else if (code === 63 || code === 73) L = Math.max(L, 3); // ORANGE: Moderate
                    else if (code === 61 || code === 71 || code === 55) L = Math.max(L, 2); // YELLOW: Light
                    else if (code === 51 || code === 53) L = Math.max(L, 1); // LIME: Drizzle
                    if (L > max) max = L;
                });
            } catch (e) { return 0; }
            return max;
        },

        applyColor(el, level) {
            const neon = ["#00FF00", "#AAFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            el.style.boxShadow = level > 0 ? `0 0 8px ${neon[level]}` : 'none';
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
