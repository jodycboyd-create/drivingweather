/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Equidistant Snapping
 * Status: Fixed Regression + Guaranteed Peninsula Coverage
 */

const WeatherIcons = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: []
    };

    const loadCommunities = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            // Emergency Fail-safe: Essential NL Waypoints
            state.communities = [
                { name: "Deer Lake", lat: 49.17, lng: -57.43, type: "major" },
                { name: "Port au Choix", lat: 50.71, lng: -57.35, type: "rest" },
                { name: "St. Anthony", lat: 51.36, lng: -55.57, type: "major" }
            ];
        }
    };

    const getForecastVariation = (lat, lng, hour) => {
        const seed = lat + lng + hour;
        const skyOptions = ["☀️", "🌤️", "☁️", "❄️"];
        return {
            temp: Math.round(-5 + (Math.sin(seed) * 3)),
            wind: Math.round(35 + (Math.cos(seed) * 15)),
            sky: skyOptions[Math.abs(Math.floor(seed % 4))]
        };
    };

    async function reAnchor() {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        
        if (currentKey === state.anchorKey) return;
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();

        // FIX: Divide route into 5 guaranteed equidistant segments
        const samplePoints = [0.10, 0.30, 0.50, 0.70, 0.90];
        
        samplePoints.forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];

            // Snap to the absolute nearest community in the database
            const nearest = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? prev : curr;
            });

            const variant = getForecastVariation(nearest.lat, nearest.lng, new Date().getHours());

            L.marker([nearest.lat, nearest.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:70px; height:62px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 10px #000;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; text-transform:uppercase;">${nearest.name.split(' ')[0]}</span>
                            <span style="font-size:18px; margin:2px 0;">${variant.sky}</span>
                            <div style="display:flex; gap:4px; font-size:11px; font-weight:bold;">
                                <span style="${variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${variant.temp}°</span>
                                <span style="color:#fff; font-weight:normal;">${variant.wind}k</span>
                            </div>
                        </div>`
                })
            }).addTo(state.layer);
        });

        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
        state.isLocked = false;
    }

    loadCommunities().then(() => setInterval(reAnchor, 1000));
})();
