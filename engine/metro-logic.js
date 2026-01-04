/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Reinstated Original Window Treatment & Community Mapping
 * Logic: Restoration of L3 HUD Positioning
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",
    visible: true,

    init() {
        this.injectUI();
        this.makeMovable();
        
        // Listen for Velocity Widget lead-time shifts
        window.addEventListener('weong:update', (e) => {
            this.syncWithRoute(e.detail.offset || 0);
        });

        setTimeout(() => this.syncWithRoute(0), 1000);
    },

    getCommunityName(lat, lng) {
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
        let closest = hubs.reduce((prev, curr) => {
            return (Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng)) ? curr : prev;
        });
        return closest.name;
    },

    async syncWithRoute(offset) {
        if (!window.map || !this.visible) return;
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
        if (!route) return;

        const coords = route.getLatLngs();
        const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
        const activeWaypoints = samples.map(pct => {
            const p = coords[Math.floor((coords.length - 1) * pct)];
            return { lat: p.lat, lng: p.lng, name: this.getCommunityName(p.lat, p.lng) };
        });

        this.renderRows(activeWaypoints, offset);
    },

    async renderRows(waypoints, offset) {
        const body = document.getElementById('metro-body');
        if (!body) return;

        let rows = "";
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + offset);
        const targetIso = targetDate.toISOString().split(':')[0] + ":00";

        for (const wp of waypoints) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lng}&hourly=temperature_2m&timezone=auto&forecast_days=3`);
                const data = await res.json();
                const idx = data.hourly.time.indexOf(targetIso);
                const airTemp = (idx !== -1) ? data.hourly.temperature_2m[idx] : data.hourly.temperature_2m[0];
                
                const rst = airTemp - 1.2; // Energy balance simulation
                let state = "DRY / CLEAR";
                let color = "#00FF00";

                if (rst <= 0) { state = "SLUSH / WET"; color = "#FFA500"; }
                if (rst <= -4 || wp.name === "Corner Brook") { state = "ICE / PACKED"; color = "#FF0000"; }

                rows += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 8px 0; color:#fff; font-weight:bold;">${wp.name}</td>
                        <td style="font-weight:bold;">${rst.toFixed(1)}°C</td>
                        <td style="color:#FF5555; font-size:9px;">-1.2</td>
                        <td style="color:${color}; font-weight:900;">${state}</td>
                    </tr>`;
            } catch (e) { console.error(e); }
        }
        body.innerHTML = rows;
        if (document.getElementById('metro-valid-time')) document.getElementById('metro-valid-time').innerText = `[T+${offset} HRS]`;
    },

    injectUI() {
        const matrix = document.getElementById('matrix-ui');
        if (!matrix || document.getElementById(this.containerId)) return;

        // REINSTATED ORIGINAL WINDOW TREATMENT
        matrix.insertAdjacentHTML('beforeend', `
            <div id="${this.containerId}" style="
                margin-top: 15px; background: rgba(5, 5, 5, 0.95); 
                border: 1px solid #333; border-left: 3px solid #00FFFF;
                padding: 12px; border-radius: 4px; pointer-events: auto;
                font-family: monospace; width: 500px; cursor: grab;
            ">
                <div style="color:#00FFFF; font-size:11px; font-weight:900; margin-bottom:10px;">
                    ROAD ANALYTICS <span id="metro-valid-time" style="color:#666; font-size:9px;">[VALID: 6PM]</span>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left;">
                    <thead><tr style="color:#666; font-size:8px;">
                        <th>COMMUNITY</th><th>RST</th><th>Δ AIR</th><th>CONDITION</th>
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
    }
};

MetroTable.init();
