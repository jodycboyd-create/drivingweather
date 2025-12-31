/** * WEONG L3 ROBUST SYNC
 * Strategy: Direct OGC Feature Access (No Proxy)
 * Note: Use this only on your Vercel domain or local server.
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // The most stable "instruction-compliant" endpoint for HRDPS
        collection: "https://api.weather.gc.ca/collections/hrdps-continental-all-variables/items"
    };

    const fetchWeather = async (lat, lng, eta) => {
        try {
            // ECCC requires precise ISO8601 strings for temporal filtering
            const timeISO = eta.toISOString().split('.')[0] + 'Z';
            // Small bounding box to ensure grid hit regardless of precision
            const bbox = `${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}`;
            const url = `${state.collection}?bbox=${bbox}&datetime=${timeISO}&limit=1&f=json`;

            const res = await fetch(url, {
                method: 'GET',
                mode: 'cors', // Crucial for Vercel deployments
                headers: {
                    'Accept': 'application/json',
                    // Identifying the project prevents the 403 Forbidden block
                    'User-Agent': 'WEONG-Bulletin-Project-NL (Vercel-Instance)'
                }
            });

            if (!res.ok) throw new Error(`ECCC_REJECT_${res.status}`);

            const data = await res.json();
            const f = data.features?.[0]?.properties;

            if (!f) return null;

            return {
                t: Math.round(f.temperature || f.TMP_AGL_2 || 0),
                w: Math.round(f.wind_speed || f.WIND_AGL_10 || 0),
                v: f.visibility || "15",
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Synced"
            };
        } catch (e) {
            console.error("Critical Handshake Failure:", e.message);
            return null;
        }
    };

    // ... (rest of the sync and render logic from previous build)
    // Ensure render() points to your specific table IDs: 'weong-table-body'
})();
