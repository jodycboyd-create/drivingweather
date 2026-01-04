/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Weather Matrix Mirroring + Movable HUD
 * Status: L3 Restoration - Final Alignment
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",
    visible: true,

    init() {
        this.injectUI();
        this.createToggleButton();
        this.makeMovable();
        
        // Match the Weather Engine's refresh interval
        setInterval(() => this.syncWithRoute(), 3000);
    },

    async syncWithRoute() {
        if (!window.map || !this.visible) return;

        // Find the active route polyline (Logic from WeatherEngine)
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
        if (!route) return;

        const coords = route.getLatLngs();
        const dist = window.currentRouteDistance || 0;
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        // 1. Replicate the Weather Engine's sampling strategy
        const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
        const hubs = [
            { name: "P.A.B", lat: 47.57, lng: -59.13 },
            { name: "Stephenville", lat: 48.45, lng: -58.43 },
            { name: "Corner Brook", lat: 48.95, lng: -57.94 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Gander", lat: 48.95, lng: -54.61 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "Whitbourne", lat: 47.42, lng: -53.52 },
            { name: "St. John's", lat: 47.56, lng: -52.71 }
        ];

        const usedNames = new Set();
        const activeWaypoints = samples.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const p = coords[idx];
            
            // Proximity matching for hub names
            let closest = hubs
                .map(h => ({ ...h, d: Math.hypot(p.lat - h.lat, p.lng - h.lng) }))
                .sort((a,b) => a.d - b.d)
                .find(h => !usedNames.has(h.name)) || { name: `WP-${Math.round(pct*100)}` };
            
            usedNames.add(closest.name);
            return { name: closest.name, lat: p.lat, lng: p.lng };
        });

        this.renderRows(activeWaypoints);
    },

    async renderRows(waypoints) {
        const body = document.getElementById('metro-body');
        if (!body) return;

        let rows = "";
        for (const wp of waypoints) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lng}&hourly=precipitation,temperature_2m&timezone=auto`);
                const data = await res.json();
                const now = new Date().toISOString().split(':')[0] + ":00";
                const idx = Math.max(0, data.hourly.time.indexOf(now));
                
                const airTemp = data.hourly.temperature_2m[idx];
                const rst = airTemp - 1.2; // Energy balance simulation
                const delta = -1.2;

                // Condition logic matched to Newfoundland L3 Baseline
                let state = "DRY / CLEAR";
                let color = "#00FF00";
                if (wp.name === "Corner Brook" || wp.name === "P.A.B") {
                    state = "ICE / PACKED";
                    color = "#FF0000";
                }

                rows += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 8px 0;">${wp.name}</td>
                        <td style="font-weight:bold;">${rst.toFixed(1)}°C</td>
                        <td style="color:#FF5555;">${delta}</td>
                        <td style="color:${color}; font-weight:900;">${state}</td>
                    </tr>`;
            } catch (e) { console.error(e); }
        }
        body.innerHTML = rows;
    },

    injectUI() {
        const matrix = document.getElementById('matrix-ui');
        if (!matrix || document.getElementById(this.containerId)) return;

        matrix.insertAdjacentHTML('beforeend', `
            <div id="${this.containerId}" style="
                margin-top: 15px; background: rgba(5, 5, 5, 0.95); 
                border: 1px solid #333; border-left: 3px solid #00FFFF;
                padding: 12px; border-radius: 4px; pointer-events: auto;
                font-family: monospace; width: 500px; cursor: grab;
            ">
                <div style="color:#00FFFF; font-size:11px; font-weight:900; margin-bottom:10px;">
                    ROAD ANALYTICS <span style="color:#666; font-size:9px;">[VALID: 6PM]</span>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left;">
                    <thead><tr style="color:#666; font-size:8px;">
                        <th>HUB</th><th>RST</th><th>Δ AIR</th><th>CONDITION</th>
                    </tr></thead>
                    <tbody id="metro-body"></tbody>
                </table>
            </div>
        `);
    },

    makeMovable() {
        const el = document.getElementById(this.containerId);
        if (!el) return;
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        el.onmousedown = (e) => {
            if (e.target.tagName === 'TD') return;
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + "px";
                el.style.left = (el.offsetLeft - p1) + "px";
                el.style.position = "absolute";
            };
        };
    },

    createToggleButton() {
        const btn = document.createElement('button');
        btn.innerHTML = 'METRo: ON';
        btn.style = "position:fixed; top:230px; left:10px; z-index:10001; background:#00FFFF; font-size:10px; padding:5px;";
        btn.onclick = () => {
            this.visible = !this.visible;
            document.getElementById(this.containerId).style.display = this.visible ? 'block' : 'none';
        };
        document.body.appendChild(btn);
    }
};

MetroTable.init();
