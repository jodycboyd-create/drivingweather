/** * Project: [weong-route] | MODULE: optimize.js
 * Version: L3_STABILIZED_CORE_V3
 * Feature: Fail-Safe Weighted Mean + Data Mapping Fix
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="12"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="12"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            if (!container) return setTimeout(() => this.init(), 1000);
            
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            // Small delay to ensure table data is registered in the window object
            setTimeout(() => this.runScan(), 500);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#666;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'P' : 'A'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="
                    margin-bottom: 2px; 
                    width: 100%;
                    max-width: 500px;
                    border: 1px solid #00FFFF; 
                    background: #050505;
                    padding: 2px 6px; 
                    font-family: monospace;
                    pointer-events: auto;
                ">
                    <div style="display:flex; background:#000;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:1px; height:18px; background:#111; padding:1px; cursor:pointer; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:8px;">ROUTE_SCAN: ACTIVE</span>
                        <div style="display:flex; gap:5px; font-size:7px; font-weight:900;">
                            <span style="color:#00FF00;">DRY</span><span style="color:#FFFF00;">FRST</span><span style="color:#FF8C00;">SLSH</span><span style="color:#FF0000;">ICE</span>
                        </div>
                        <span id="opt-count" style="color:#00FF00; font-size:8px;">L3_STABLE</span>
                    </div>
                </div>`;

            container.insertAdjacentHTML('afterbegin', html);
            document.getElementById('heat-grid').addEventListener('click', (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            });
        },

        runScan() {
            const cells = document.querySelectorAll('.heat-cell');
            // Check for both possible data locations to avoid nulls
            const currentTableData = window.MetroTable?.currentData || window.currentWeatherData || [];

            cells.forEach((cell) => {
                const hourOffset = parseInt(cell.dataset.h);
                const result = this.calculateWeightedMean(currentTableData, hourOffset);
                
                // FIXED PALETTE: No more undefined colors
                const neonPalette = ["#00FF00", "#ADFF2F", "#FFFF00", "#FF8C00", "#FF0000"];
                const colorIdx = Math.round(result.meanSeverity);
                const safeColor = neonPalette[colorIdx] || "#00FF00"; // Default to Green if logic fails
                
                cell.style.backgroundColor = safeColor;
                cell.innerHTML = result.avgPrecip > 0.1 ? (result.isSnow ? this.svgs.snow : this.svgs.rain) : "";
            });
        },

        calculateWeightedMean(timeline, offset) {
            // Filter by hourOffset, but if timeline is empty, return baseline Green
            if (!timeline || timeline.length === 0) return { meanSeverity: 0, avgPrecip: 0, isSnow: false };

            const dataSet = timeline.filter(d => parseInt(d.hourOffset) === offset);
            const activeSet = dataSet.length ? dataSet : [timeline[0]];

            let totalSeverity = 0;
            let totalPrecip = 0;
            let snowPoints = 0;

            activeSet.forEach(data => {
                let sev = 0;
                // Standardize inputs: Check 'condition', 'cond', 'temp', or 'air'
                const cond = (data.condition || data.cond || "").toUpperCase();
                const air = parseFloat(data.temp || data.air || 0);
                const rst = air - 1.2;
                const precip = parseFloat(data.precip || 0);

                if (cond.includes("ICE") || cond.includes("PACKED") || rst < -7.0) sev = 4;
                else if (cond.includes("SLUSH") || cond.includes("SNOW")) sev = 3;
                else if (rst <= 0 && (cond.includes("WET") || precip > 0)) sev = 2;
                else if (cond.includes("WET") || precip > 0) sev = 1;
                else sev = 0; // DRY / CLEAR

                totalSeverity += sev;
                totalPrecip += precip;
                if (rst < 0) snowPoints++;
            });

            return {
                meanSeverity: totalSeverity / activeSet.length,
                avgPrecip: totalPrecip / activeSet.length,
                isSnow: (snowPoints / activeSet.length) > 0.5
            };
        },

        shiftTime(hours, target) {
            const offset = parseInt(hours);
            window.currentDepartureTime = new Date(Date.now() + offset * 3600000);
            
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "1px solid #FFF";

            window.MasterClock?.update(offset);
            window.MetroTable?.updateTable?.(offset);
            window.WeatherMatrix?.update?.(offset);
            
            document.getElementById('opt-consensus').innerText = `+${offset}H MEAN`;
            this.runScan();
        }
    };

    window.Optimizer = Optimizer;
    Optimizer.init();
})();
