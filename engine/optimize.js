/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: 1:1 Icon Parity (Engine Integration)
 * Logic: Pulls exact icon mapping from WeatherEngine.getIcon(code)
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
                const dayStr = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                const hour = d.getHours();
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #333;">
                            <div style="font-size:7px; color:#666;">${dayStr}</div>
                            <div style="font-size:9px; color:#AAA;">${hour % 12 || 12}${ampm}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px; font-family:monospace;">
                    <div id="time-scale" style="display:flex; margin-bottom:5px; font-weight:bold; border-bottom:1px solid #222;">
                        ${timeLabels}
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:32px; background:#000; padding:3px; border:1px solid #444;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; display:flex; align-items:center; justify-content:center; border:1px solid #111; transition: 0.2s;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:10px; letter-spacing:1px;">PRECIPITATION HAZARD SYNC</span>
                        <span id="opt-status" style="color:#00FF00; font-size:9px;">SCANNING...</span>
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
                const result = await this.checkPrecip(samples, i * 2);
                this.applyColor(cells[i], result.level, result.code);
            }
            document.getElementById('opt-status').innerText = "1:1 SYNC ACTIVE";
        },

        async checkPrecip(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let maxLevel = 0;
            let triggerCode = 0;
            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));
                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    let L = 0;
                    // STRICT HAZARD MAPPING
                    if (code === 65 || code === 75 || code >= 95) L = 4; // RED
                    else if (code === 63 || code === 73) L = 3; // ORANGE
                    else if (code === 61 || code === 71) L = 2; // YELLOW
                    else if (code >= 51 && code <= 55) L = 1; // LIME (Drizzle)
                    
                    if (L > maxLevel) { maxLevel = L; triggerCode = code; }
                });
            } catch (e) { return {level: 0, code: 0}; }
            return {level: maxLevel, code: triggerCode};
        },

        applyColor(el, level, code) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            
            // 1:1 SYSTEM ICON INTEGRATION
            if (level >= 2) {
                // Pulls the same icon asset used in the Matrix
                const iconPath = window.WeatherEngine ? window.WeatherEngine.getIcon(code) : '';
                el.innerHTML = `<img src="${iconPath}" style="width:20px; height:20px; filter: drop-shadow(0 0 2px #000);">`;
            } else {
                el.innerHTML = "";
            }
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
