/**
 * ROUTE-ENGINE.JS | FINAL REFINEMENT
 * Fixed: Stacked flags, redundant fetches, and 24-hr rate-limit protection.
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,
    _abortController: null, // NEW: Kills pending requests to save bandwidth

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        // 1. IMMEDIATE CLEANUP: Prevent "Stacking"
        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();
        
        this._layers.clearLayers();
        if (this._flag) {
            window.map.removeLayer(this._flag);
            this._flag = null;
        }

        const pts = window.hubMarkers.map(m => m.getLatLng());
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson&steps=false`;

        fetch(url, { signal: this._abortController.signal })
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;
                
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                // Weighted Speed (90km/h average for NL)
                const weightedSpeed = 90; 
                const travelTimeHrs = distanceKm / weightedSpeed;
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                // DRAW RIBBON
                L.polyline(coordinates, { color: '#222', weight: 10, opacity: 0.9 }).addTo(this._layers);
                L.polyline(coordinates, { color: '#FFD700', weight: 2, dashArray: '10, 20' }).addTo(this._layers);
                this._layers.addTo(window.map);

                // PROFESSIONAL FLAG
                const midIndex = Math.floor(coordinates.length / 2);
                this._flag = L.marker(coordinates[midIndex], {
                    icon: L.divIcon({
                        className: 'route-flag-container',
                        html: `<div class="route-bubble">🏁 ${distanceKm.toFixed(1)} km | ${hours}h ${mins}m</div>`,
                        iconSize: [160, 30],
                        iconAnchor: [80, 15]
                    })
                }).addTo(window.map);
            })
            .catch(err => {
                if (err.name === 'AbortError') return; // Expected when dragging fast
                console.error("Route Engine: Request Failed", err);
            });
    }
};

window.addEventListener('shell-live', () => {
    window.hubMarkers.forEach(m => {
        // Change 'drag' to 'dragend' to only fire ONCE per move
        m.off('dragend'); // Prevent duplicate listeners
        m.on('dragend', () => window.RouteEngine.calculate());
    });
    window.RouteEngine.calculate();
});
