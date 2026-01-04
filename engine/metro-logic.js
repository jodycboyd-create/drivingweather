/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Community Name Scraping + Anti-Overlap Positioning
 * Logic: Passive sync with Velocity Widget events
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",
    visible: true,

    init() {
        this.injectUI();
        this.makeMovable();
        
        window.addEventListener('weong:update', (e) => {
            this.syncWithRoute(e.detail.offset || 0);
        });

        // Delay initial run to ensure map layers are loaded
        setTimeout(() => this.syncWithRoute(0), 1500);
    },

    /**
     * COMMUNITY NAME SCRAPING
     * Matches coordinates to the nearest primary Newfoundland Hub
     */
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

        let closest = hubs[0];
        let minDist = Infinity;

        hubs.forEach(h => {
            const d = Math.hypot(lat - h.lat, lng - h.lng);
            if (d < minDist) {
                minDist = d;
                closest = h;
            }
        });

        // If waypoints are between hubs, append approximate distance
        return minDist < 0.2 ? closest.name : `Near ${closest.name}`;
    },

    async syncWithRoute(offset) {
        if (!window.map || !this.visible) return;

        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
        if (!route) return;

        const coords = route.getLatLngs();
        const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
        
        const activeWaypoints = samples.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const p = coords[idx];
            return { 
                lat: p.lat, 
                lng: p.lng, 
                name: this.getCommunityName(p.lat, p.lng) 
            };
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
                
                const timeIdx = data.hourly.time.indexOf(targetIso);
                const airTemp = (timeIdx !== -1) ? data.hourly.temperature_2m[timeIdx] : data.hourly.temperature_2m[0];
                
                // L3 Baseline RST Logic
                const rst = airTemp - 1.8;
                let state = "DRY / CLEAR";
                let color = "#00FF00";

                if (rst <= 0) { state = "SLUSH / WET"; color = "#FFA500"; }
                if (rst <= -4) { state = "ICE / PACKED"; color = "#FF0000"; }

                rows += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 10px 0; color: #fff; font-weight: bold; font-size: 11px;">${wp.name}</td>
                        <td style="font-weight:bold; color: #00FFFF;">${rst.toFixed(1)}°C</td>
                        <td style="color:#666; font-size: 9px;">T+${offset}H</td>
                        <td style="color:${color}; font-weight:900; letter-spacing: 0.5px;">${state}</td>
                    </tr>`;
            } catch (e) { console.error(e); }
        }

        body.innerHTML = rows;
        const label = document.getElementById('metro-valid-time');
        if (label) label.innerText = `[T+${offset} HRS]`;
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        const matrix = document.getElementById('matrix-ui') || document.body;
        
        // ANTI-OVERLAP POSITIONING
        // Positions the table lower to avoid overlapping the Mission Weather Matrix
        matrix.insertAdjacentHTML('beforeend', `
            <div id="${this.containerId}" style="
                position: fixed; top: 480px; left: 20px;
                background: rgba(5, 5, 5, 0.98); border: 1px solid #333;
                border-left: 3px solid #00FFFF; padding: 15px; 
                width: 520px; z-index: 10001; font-family: monospace;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="color:#00FFFF; font-size:12px; font-weight:900; letter-spacing: 1px;">
                        ROAD ANALYTICS <span id="metro-valid-time" style="color:#FFD700; margin-left:10px;">[T+0]</span>
                    </div>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left; border-collapse: collapse;">
                    <thead><tr style="color:#444; font-size:9px; border-bottom: 1px solid #333;">
                        <th style="padding-bottom: 8px;">COMMUNITY</th>
                        <th style="padding-bottom: 8px;">RST</th>
                        <th style="padding-bottom: 8px;">LEAD</th>
                        <th style="padding-bottom: 8px;">CONDITION</th>
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
            if (e.target.tagName === 'TD' || e.target.tagName === 'TH') return;
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
