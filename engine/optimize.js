/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Fix TypeError + Failsafe Icon Recovery
 */

(function() {
    const Optimizer = {
        // Internal Icon Fallback if window.WeatherEngine fails
        iconMap: { 
            61: "https://www.weather.gov/images/forecast/icons/ra.png", 63: "https://www.weather.gov/images/forecast/icons/ra.png",
            71: "https://www.weather.gov/images/forecast/icons/sn.png", 73: "https://www.weather.gov/images/forecast/icons/sn.png"
        },

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
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #333;">
                            <div style="font-size:7px; color:#555;">${day}</div>
                            <div style="font-size:9px; color:#999;">${hr % 12 || 12}${hr >= 12 ? 'PM' : 'AM'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px; font-family:monospace;">
                    <div style="display:flex; margin-bottom:5px; background:rgba(0,0,0,0.3); padding:2px 0;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:3px; height:32px; background:#111; padding:3px; border:1px solid #444;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; display:flex; align-items:center; justify-content:center; border:1px solid #222;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:10px;">PRECIPITATION SYNC</span>
                        <span id="opt-status" style="color:#00FF00; font-size:9px;">READY</span>
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', html);
            document.getElementById('heat-grid').onclick = (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            };
        },

        async runScan(route) {
            document.getElementById('opt-status').innerText = "SCANNING...";
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const res = await this.checkPrecip(samples, i * 2);
                this.applyColor(cells[i], res.level, res.code);
            }
            document.getElementById('opt-status').innerText = "ISLAND SYNC COMPLETE";
        },

        async checkPrecip(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let maxL = 0, trigCode = 0;
            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));
                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    let L = (code === 63 || code === 73) ? 3 : (code === 61 || code === 71) ? 2 : (code >= 51 && code <= 55) ? 1 : 0;
                    if (L > maxL) { maxL = L; trigCode = code; }
                });
            } catch (e) { return {level: 0, code: 0}; }
            return {level: maxL, code: trigCode};
        },

        applyColor(el, level, code) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            if (level >= 2) {
                // Failsafe check to prevent TypeError
                const url = (window.WeatherEngine && typeof window.WeatherEngine.getIconUrl === 'function') 
                    ? window.WeatherEngine.getIconUrl(code) 
                    : this.iconMap[code] || "";
                el.innerHTML = url ? `<img src="${url}" style="width:18px; height:18px; filter: drop-shadow(0 0 2px #000);">` : "";
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
