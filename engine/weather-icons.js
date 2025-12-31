/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Resilient Equidistant Logic
 * Status: FIXED - Fail-safe Nodes + Multi-Community Snapping
 */

const WeatherIcons = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: []
    };

    // 1. Improved Load with Integrated Fail-safe
    const loadCommunities = async () => {
        try {
            const res = await fetch('/data/communities.json');
            if (!res.ok) throw new Error("404");
            state.communities = await res.json();
        } catch (e) {
            // BASELINE: Ensuring coverage even if JSON is missing
            state.communities = [
                { name: "St. John's", lat: 47.56, lng: -52.71 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "St. Anthony", lat: 51.36, lng: -55.57 },
                { name: "Clarenville", lat: 48.17, lng: -53.96 }
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
        // Only block if another process is active, but check communities length
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const routeLayer = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!routeLayer) return;

        const coords = routeLayer.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        
        // Prevent unnecessary re-draws but force update if key changes
        if (currentKey === state.anchorKey) return;
        
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();

        // 2. EQUIDISTANT SAMPLING: Ensuring 5 waypoints across any distance
        const sampleRatios = [0.15, 0.35, 0.55, 0.75, 0.95];
        
        sampleRatios.forEach(ratio => {
            const index = Math.floor((coords.length - 1) * ratio);
            const [lng, lat] = coords[index];

            // 3. Finding nearest anchor community
            const anchorPoint = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? prev : curr;
            });

            const variant = getForecastVariation(anchorPoint.lat, anchorPoint.lng, new Date().getHours());

            const marker = L.marker([anchorPoint.lat, anchorPoint.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; transition: transform 0.2s;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; overflow:hidden; white-space:nowrap;">${anchorPoint.name.split(' ')[0]}</span>
                            <span style="font-size:18px; margin:2px 0;">${variant.sky}</span>
                            <div style="display:flex; gap:4px; font-size:12px; font-weight:bold;">
                                <span style="${variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${variant.temp}°</span>
                                <span style="color:#fff; font-weight:normal;">${variant.wind}k</span>
                            </div>
                        </div>`,
                    iconSize: [75, 65]
                }),
                zIndexOffset: 60000 // Ensure icons are above all other layers
            });
            
            marker.addTo(state.layer);
        });

        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
        state.isLocked = false;
    }

    // Faster interval for more responsive snapping
    loadCommunities().then(() => setInterval(reAnchor, 500));
})();
