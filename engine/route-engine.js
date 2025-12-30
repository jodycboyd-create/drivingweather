/**
 * ROUTE-ENGINE.JS | SEGMENT-AWARE BUILD
 * Updates: Lighter Grey Ribbon, Text-only Metrics, Segmented Speed Logic.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,
    _abortController: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;

        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();

        const pts = window.hubMarkers.map(m => m.getLatLng());
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson&steps=false`;

        fetch(url, { signal: this._abortController.signal })
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;

                this._layers.clearLayers();
                if (this._flag) window.map.removeLayer(this._flag);

                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                /**
                 * 1. SEGMENTED SPEED CALCULATION
                 * Logic: TCH (100) = 75%, Branch (80) = 20%, Local (50) = 5%
                 * This follows the typical NL route profile from Hub to Destination.
                 */
                const tchDist = distanceKm * 0.75;
                const branchDist = distanceKm * 0.20;
                const localDist = distanceKm * 0.05;
                
                const travelTimeHrs = (tchDist / 100) + (branchDist / 80) + (localDist / 50);
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                /**
                 * 2. LIGHTER ROAD RIBBON
                 * Changed from #222 to #666666 for better visibility.
                 */
                L.polyline(coordinates, { 
                    color: '#666666', 
                    weight: 9, 
                    opacity: 0.85,
                    lineCap: 'round' 
                }).addTo(this._layers);

                L.polyline(coordinates, { 
                    color: '#FFD700', 
                    weight: 2, 
                    dashArray: '10, 20', 
                    opacity: 1 
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                /**
                 * 3. METRICS FLAG (No Icon)
                 * Removed 🏁 icon as per instructions.
                 */
                const midIndex = Math.floor(coordinates.length / 2);
                this._flag = L.marker(coordinates[midIndex], {
                    icon: L.divIcon({
                        className: 'route-flag-container',
                        html: `<div class="route-bubble">${distanceKm.toFixed(1)} km | ${hours}h ${mins}m</div>`,
                        iconSize: [160, 30],
                        iconAnchor: [80, 15]
                    })
                }).addTo(window.map);
                
                window.map.fitBounds(L.polyline(coordinates).getBounds(), { padding: [40, 40] });
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Engine Sync Error", err);
            });
    }
};

window.addEventListener('shell-live', () => {
    window.hubMarkers.forEach(m => {
        m.off('dragend'); 
        m.on('dragend', () => window.RouteEngine.calculate());
    });
    window.RouteEngine.calculate();
});
