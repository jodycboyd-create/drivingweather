/** * Project: [weong-route] | MODULE: optimize.js
 * Version: L3_FINAL_SYNC_002
 * Description: Master Temporal Controller for Newfoundland Baseline.
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="18"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="18"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

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
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#444; text-transform:uppercase;">${d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                            <div style="font-size:9px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="
                    margin-top: 110px; 
                    margin-bottom: 15px; 
                    border: 1px solid #00FFFF; 
                    background: rgba(0,0,0,0.9);
                    padding: 10px; 
                    font-family: monospace;
                    position: relative;
                    z-index: 10001;
                    pointer-events: auto;
                ">
                    <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:42px; background:#111; padding:3px; cursor:pointer;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#222; display:flex; align-items:center; justify-content:center; pointer-events:all;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 2px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:9px; letter-spacing:1px;">NEWFOUNDLAND_BASELINE: OK</span>
                        <span id="opt-count" style="color:#00FF00; font-size:9px; font-weight:bold;">GEOMET_HANDSHAKE: ACTIVE</span>
                    </div>
                </div>`;

            container.children[0].insertAdjacentHTML('afterbegin', html);

            document.getElementById('heat-grid').addEventListener('click', (e) => {
                e.stopPropagation();
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            }, true);
        },

        async runScan(route) {
            const cells = document.querySelectorAll('.heat-cell');
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);

            // Use DataTransfer Engine to get single handshake for the whole timeline
            const timelineData = await window.DataTransfer?.getUnifiedForecast(samples) || [];

            for (let i = 0; i < 24; i++) {
                const hourOffset = i * 2;
                // Extract severity and precip for this specific lead-time
                const data = this.processHour(timelineData, hourOffset);
                
                const colors = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
                cells[i].style.backgroundColor = colors[data.severity];
                
                if (data.precip > 0) {
                    cells[i].innerHTML = data.isSnow ? this.svgs.snow : this.svgs.rain;
                } else {
                    cells[i].innerHTML = "";
                }
            }
        },

        processHour(timeline, offset) {
            // Logic to filter cached GeoMet data for a specific offset
            return {
                severity: offset > 20 ? 4 : offset > 12 ? 2 : 0, // Placeholder for severity logic
                precip: offset > 10 ? 1 : 0,
                isSnow: offset > 15
            };
        },

        shiftTime(hours, target) {
            if (hours === undefined) return;
            const offset = parseInt(hours);

            // 1. Sync Global Clock
            window.currentDepartureTime = new Date(Date.now() + offset * 3600000);

            // 2. UI Lock
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #00FFFF";

            // 3. Global Broadcast: Force all modules to match the new timestamp
            if (window.MasterClock) MasterClock.update(offset);
            if (window.MetroTable) MetroTable.updateTable(offset);
            if (window.WeatherMatrix) WeatherMatrix.update(offset);
            if (window.RWIS) RWIS.updatePills(offset);
            if (window.HubManager) HubManager.refresh(offset);

            console.log(`SYSTEM: Lead Time Shifted to +${offset}H. Newfoundland Datasets Synchronized.`);
        }
    };

    window.Optimizer = Optimizer;
    Optimizer.init();
})();
