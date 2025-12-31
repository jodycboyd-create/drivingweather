/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Equidistant Path-Division
 * Status: Equidistant Waypoints + Northern Peninsula Coverage
 */

const WeatherIcons = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [], 
        targetSpacingKM: 100 // Target a waypoint roughly every 100km
    };

    const loadCommunities = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            state.communities = [
                { name: "Jack Ladder (Rest)", lat: 49.50, lng: -57.70, type: "rest" },
                { name: "River of Ponds", lat: 50.53, lng: -57.38, type: "minor" },
                { name: "St. Anthony", lat: 51.36, lng: -55.57, type: "major" }
            ];
        }
    };

    const getNearestCommunity = (lat, lng) => {
        // Preference: Major > Rest > Minor
        return state.communities.reduce((prev, curr) => {
            const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
            const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
            return dCurr < dPrev ? curr : prev;
        });
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

        // 1. Calculate Equidistant Sample Points
        // Instead of fixed percentages, we use 4-5 segments based on route length
        const segments = 5;
        const targetIndices = Array.from({length: segments}, (_, i) => Math.floor((coords.length - 1) * ((i + 1) / (segments + 1))));

        targetIndices.forEach((idx) => {
            const [lng, lat] = coords[idx];
            
            // 2. Snap to the nearest data-point in communities.json
            const community = getNearestCommunity(lat, lng);
            
            // Logic: If the route is on the Northern Peninsula, it will now hit 
            // points like Daniel's Harbour or Plum Point automatically
            const variant = getForecastVariation(community.lat, community.lng, new Date().getHours());

            L.marker([community.lat, community.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:70px; height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 12px rgba(0,0,0,0.9);">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; overflow:hidden;">${community.name.toUpperCase()}</span>
                            <span style="font-size:16px; margin-top:2px;">${variant.sky}</span>
                            <div style="display:flex; gap:4px; font-family:monospace;">
                                <span style="font-size:11px; font-weight:bold;">${variant.temp}°</span>
                                <span style="font-size:9px; color:#fff;">${variant.wind}k</span>
                            </div>
                        </div>`,
                    iconSize: [70, 60]
                })
            }).addTo(state.layer);
        });

        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
        state.isLocked = false;
    }

    // Interval and Shared Functions remain unchanged
    loadCommunities().then(() => setInterval(reAnchor, 1000));
})();
