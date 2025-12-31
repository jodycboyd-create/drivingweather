/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Dynamic Community Injection
 * Status: JSON-Driven Waypoints + Rest Stop Preference [cite: 2023-12-23, 2025-12-30]
 */

const WeatherIcons = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [] // Loaded dynamically [cite: 2025-12-30]
    };

    // Load Central Dataset [cite: 2025-12-26]
    const loadCommunities = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            console.error("WEONG-L3: Community JSON Load Failure");
            // Fail-safe baseline communities [cite: 2025-12-30]
            state.communities = [
                { name: "Whitbourne Stop", lat: 47.42, lng: -53.53, type: "rest" },
                { name: "Gander", lat: 48.95, lng: -54.61, type: "major" },
                { name: "Deer Lake", lat: 49.17, lng: -57.43, type: "major" }
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

        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        
        if (currentKey === state.anchorKey) return;
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();

        // LOGIC: Identify which communities from the JSON are near this route [cite: 2025-12-30]
        const activeWaypoints = state.communities.filter(community => {
            return coords.some(coord => {
                const dist = Math.hypot(coord[1] - community.lat, coord[0] - community.lng);
                return dist < 0.05; // ~5km proximity threshold
            });
        });

        // Filter and prioritize: limit to 5 nodes, favoring "rest" types [cite: 2025-12-30]
        activeWaypoints
            .sort((a, b) => (b.type === "rest" ? 1 : -1))
            .slice(0, 5) 
            .forEach((wp) => {
                const arrival = new Date(depTime.getTime() + 3600000 * 2); // Est. offset
                const variant = getForecastVariation(wp.lat, wp.lng, arrival.getHours());

                L.marker([wp.lat, wp.lng], {
                    icon: L.divIcon({
                        className: 'w-node',
                        html: `
                            <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                                <span style="font-size:9px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; margin-bottom:2px; text-transform:uppercase;">${wp.name.substring(0,10)}</span>
                                <span style="font-size:16px;">${variant.sky}</span>
                                <div style="display:flex; gap:3px; align-items:center;">
                                    <span style="font-size:12px; font-weight:bold;">${variant.temp}°</span>
                                    <span style="font-size:9px; color:#fff;">${variant.wind}k</span>
                                </div>
                            </div>`,
                        iconSize: [65, 65]
                    }),
                    zIndexOffset: 45000
                }).addTo(state.layer);
            });

        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
        state.isLocked = false;
    }

    loadCommunities().then(() => setInterval(reAnchor, 1000));
})();
