/** * [weong-bulletin] - ECCC HRDPS Diagnostic Engine
 * Locked: Dec 30, 2025 Baseline [cite: 2025-12-30]
 */

window.BulletinLogic = {
    // ECCC GeoMet Layer Config for HRDPS
    ECCC_BASE: "https://geo.weather.gc.ca/geomet",
    LAYERS: {
        temp: "HRDPS.CONTINENTAL_TT",
        wind: "HRDPS.CONTINENTAL_UU", // Combined with VV for speed
        precip: "HRDPS.CONTINENTAL_PRATE", 
        snow: "HRDPS.CONTINENTAL_SDE", // Snow Depth/Accumulation
        vis: "HRDPS.CONTINENTAL_VIS"  // Visibility Diagnostic
    },

    /**
     * Rule: Level 3 Trigger for Newfoundland Hazards [cite: 2023-12-23]
     */
    checkException(metrics) {
        const triggers = {
            heavySnow: metrics.snow > 5, // 5cm+ per segment
            lowVis: metrics.vis < 0.8,   // < 800m visibility
            highWind: metrics.wind > 90  // 90km/h+ gusts
        };
        return triggers.heavySnow || triggers.lowVis || triggers.highWind;
    },

    /**
     * Fetch Diagnostic data from ECCC GeoMet WMS GetFeatureInfo
     */
    async fetchECCCPoint(lat, lng, timeISO) {
        // Constructing the tactical WMS query for HRDPS grid
        const url = `${this.ECCC_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
                    `&LAYERS=${Object.values(this.LAYERS).join(',')}` +
                    `&QUERY_LAYERS=${Object.values(this.LAYERS).join(',')}` +
                    `&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}` +
                    `&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326` +
                    `&TIME=${timeISO}`;
        
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    /**
     * Generate Sleek Diagnostic Table for Pop-ups
     */
    generateTableHTML(data) {
        const isCrit = this.checkException(data);
        return `
            <div style="font-family: 'Courier New', monospace; font-size: 11px; background: #000; color: #fff; padding: 10px; border: 1px solid ${isCrit ? '#ff4757' : '#FFD700'};">
                <div style="border-bottom: 1px solid #333; margin-bottom: 5px; color: #FFD700; font-weight: bold;">
                    HRDPS DIAGNOSTIC ${isCrit ? '[CRITICAL]' : ''}
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td>TEMP:</td><td style="text-align:right;">${data.temp}°C</td></tr>
                    <tr><td>WIND:</td><td style="text-align:right;">${data.wind} km/h</td></tr>
                    <tr><td>VIS:</td><td style="text-align:right; color: ${data.vis < 1 ? '#ff4757' : '#fff'};">${data.vis} km</td></tr>
                    <tr><td>SNOW:</td><td style="text-align:right;">${data.snow} cm</td></tr>
                    <tr><td>POP:</td><td style="text-align:right;">${data.pop || '30%'}</td></tr>
                </table>
            </div>
        `;
    }
};
