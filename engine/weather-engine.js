/** * Project: [weong-bulletin]
 * Architecture: Self-Healing OGC Handshake
 * Logic: Recursive BBOX Expansion for NL Grid-Matching
 * Status: L3 Final Baseline
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        endpoint: "https://api.weather.gc.ca/collections/hrdps-continental-all-variables/items"
    };

    const fetchWithExpansion = async (lat, lng, eta, attempt = 1) => {
        try {
            // Requirement: RFC 3339 compliant datetime strings
            const timeISO = eta.toISOString().split('.')[0] + 'Z';
            
            // Expansion Logic: Widens search if first grid hit fails
            const buffer = 0.01 * attempt; 
            const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`;
            const url = `${state.endpoint}?bbox=${bbox}&datetime=${timeISO}&limit=1&f=json`;

            const res = await fetch(url, { headers: { 'User-Agent': 'WEONG-L3-NL' } });
            if (!res.ok) return null;

            const data = await res.json();
            const f = data.features?.[0]?.properties;

            // RECURSIVE CHECK: If no features, try a wider box (up to 3 times)
            if (!f && attempt < 3) {
                console.warn(`Grid Gap at Node. Expanding search (Attempt ${attempt + 1})...`);
                return await fetchWithExpansion(lat, lng, eta, attempt + 1);
            }

            return f ? {
                t: Math.round(f.temperature || f.TMP_AGL_2 || 0),
                w: Math.round(f.wind_speed || f.WIND_AGL_10 || 0),
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Synced"
            } : null;
        } catch (e) { return null; }
    };

    // ... (rest of the sync and render logic targeting 'weong-table-body')
})();
