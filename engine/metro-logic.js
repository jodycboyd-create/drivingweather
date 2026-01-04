/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Passive Sync with Velocity Widget
 * Logic: Listens to 'weong:update' and calculates temporal offset
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",
    visible: true,

    init() {
        this.injectUI();
        this.makeMovable();
        
        // PASSIVE LISTENER: Triggered by the Velocity Widget's existing broadcast
        window.addEventListener('weong:update', (e) => {
            // e.detail.offset contains the 2, 4, 6... hour lead time
            this.syncWithRoute(e.detail.offset || 0);
        });

        // Initial sync for T+0
        setTimeout(() => this.syncWithRoute(0), 1000);
    },

    async syncWithRoute(offset) {
        if (!window.map || !this.visible) return;

        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
        if (!route) return;

        const coords = route.getLatLngs();
        const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
        
        // Sampling hubs based on route position
        const activeWaypoints = samples.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const p = coords[idx];
            return { lat: p.lat, lng: p.lng };
        });

        this.renderRows(activeWaypoints, offset);
    },

    async renderRows(waypoints, offset) {
        const body = document.getElementById('metro-body');
        if (!body) return;

        let rows = "";
        // Calculate the target ISO string for the API index lookup
        // Based on current time + the offset broadcasted by the Velocity Widget
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + offset);
        const targetIso = targetDate.toISOString().split(':')[0] + ":00";

        for (const wp of waypoints) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lng}&hourly=temperature_2m&timezone=auto&forecast_days=3`);
                const data = await res.json();
                
                const timeIdx = data.hourly.time.indexOf(targetIso);
                const airTemp = (timeIdx !== -1) ? data.hourly.temperature_2m[timeIdx] : data.hourly.temperature_2m[0];
                
                // JAN 4 Baseline: RST is typically lower than Air Temp in storm conditions
                const rst = airTemp - 1.8;
                
                let state = "DRY / CLEAR";
                let color = "#00FF00";
                if (rst <= 0) { state = "SLUSH / WET"; color = "#FFA500"; }
                if (rst <= -4) { state = "ICE / PACKED"; color = "#FF0000"; }

                rows += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 10px 0; color: #aaa;">WP @ ${wp.lat.toFixed(2)}</td>
                        <td style="font-weight:bold; color: #fff;">${rst.toFixed(1)}°C</td>
                        <td style="color:#00FFFF; font-size: 9px;">T+${offset}H</td>
                        <td style="color:${color}; font-weight:900;">${state}</td>
                    </tr>`;
            } catch (e) { console.error("[METRO] API Error:", e); }
        }

        body.innerHTML = rows;
        const label = document.getElementById('metro-valid-time');
        if (label) label.innerText = `[T+${offset} HRS]`;
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        const matrix = document.getElementById('matrix-ui') || document.body;
        matrix.insertAdjacentHTML('beforeend', `
            <div id="${this.containerId}" style="
                position: fixed; top: 400px; left: 20px;
                background: rgba(10, 10, 10, 0.95); border: 1px solid #333;
                border-left: 3px solid #00FFFF; padding: 12px; 
                width: 480px; z-index: 10000; font-family: monospace;
            ">
                <div style="color:#00FFFF; font-size:11px; font-weight:900; margin-bottom:10px;">
                    ROAD ANALYTICS <span id="metro-valid-time" style="color:#666; margin-left:10px;">[T+0]</span>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left;">
                    <thead><tr style="color:#444; font-size:8px;">
                        <th>LOCATION</th><th>RST</th><th>LEAD</th><th>CONDITION</th>
                    </tr></thead>
                    <tbody id="metro-body"></tbody>
                </table>
            </div>
        `);
    },

    makeMovable() {
        const el = document.getElementById(this.containerId);
        let p1=0, p2=0, p3=0, p4=0;
        el.onmousedown = (e) => {
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + "px";
                el.style.left = (el.offsetLeft - p1) + "px";
            };
        };
    }
};

MetroTable.init();
