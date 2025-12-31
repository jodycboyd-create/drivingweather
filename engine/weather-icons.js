/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Equidistant Node Generation
 * Status: Universal NL Coverage + Community Snapping
 */

const WeatherIcons = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: []
    };

    // 1. Fetch from your comprehensive Newfoundland dataset
    const loadCommunities = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            console.error("WEONG-L3: Dataset Load Error");
        }
    };

    // 2. Universal Snapping: Snaps a path point to the nearest logical hub
    const snapToData = (lat, lng) => {
        return state.communities.reduce((prev, curr) => {
            const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
            const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
            return dCurr < dPrev ? curr : prev;
        });
    };

    async function reAnchor() {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const routeLayer = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!routeLayer) return;

        const coords = routeLayer.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        
        if (currentKey === state.anchorKey) return;
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();

        // 3. Dynamic Equidistant Sampling
        // Divides any route into 5 equal geographic segments
        const sampleRatios = [0.15, 0.35, 0.55, 0.75, 0.95];
        
        sampleRatios.forEach(ratio => {
            const index = Math.floor((coords.length - 1) * ratio);
            const [lng, lat] = coords[index];

            // 4. Anchor weather data to the nearest community/rest stop
            const anchorPoint = snapToData(lat, lng);
            const variant = getForecastVariation(anchorPoint.lat, anchorPoint.lng, new Date().getHours());

            L.marker([anchorPoint.lat, anchorPoint.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:72px; height:64px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; text-transform:uppercase; white-space:nowrap; overflow:hidden;">${anchorPoint.name}</span>
                            <span style="font-size:18px; margin:2px 0;">${variant.sky}</span>
                            <div style="display:flex; gap:4px; font-size:12px; font-weight:bold;">
                                <span style="${variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${variant.temp}°</span>
                                <span style="color:#fff; font-weight:normal;">${variant.wind}k</span>
                            </div>
                        </div>`
                }),
                zIndexOffset: 50000
            }).addTo(state.layer);
        });

        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
        state.isLocked = false;
    }

    loadCommunities().then(() => setInterval(reAnchor, 1000));
})();
