/** * Project: [weong-bulletin]
 * Architecture: OGC API Features Handshake
 * Strategy: BBOX + ISO-Datetime Filtering
 * Status: L3 Deployment
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // The robust OGC endpoint
        collectionUrl: "https://api.weather.gc.ca/collections/hrdps-continental-all-variables/items"
    };

    const fetchOGCWeather = async (lat, lng, eta) => {
        try {
            // ECCC requires RFC 3339 compliant datetime strings (e.g., YYYY-MM-DDTHH:MM:SSZ)
            const timeISO = eta.toISOString().split('.')[0] + 'Z';
            
            // Bounding Box (BBOX) query: [min_lon, min_lat, max_lon, max_lat]
            // We use a 0.02 degree buffer to ensure we hit the 2.5km HRDPS grid
            const bbox = `${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}`;
            
            const url = `${state.collectionUrl}?bbox=${bbox}&datetime=${timeISO}&limit=1&f=json`;

            const res = await fetch(url, {
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'WEONG-NL-Engine-2025' // Prevents 403 Forbidden blocks
                }
            });

            if (!res.ok) throw new Error(`API_STATUS_${res.status}`);

            const data = await res.json();
            const f = data.features?.[0]?.properties;

            return f ? {
                t: Math.round(f.temperature || f.TMP_AGL_2 || 0),
                w: Math.round(f.wind_speed || f.WIND_AGL_10 || 0),
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Synced"
            } : null;
        } catch (e) {
            console.error("WEONG Handshake Error:", e.message);
            return null;
        }
    };

    // ... (rest of the sync logic remains the same)
})();
