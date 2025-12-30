/**
 * ROUTE-ENGINE.JS | ROBUST PRO BUILD
 * Fixed: Disappearing routes and handshake collisions.
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,
    _abortController: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;

        // Abort any "in-flight" request to prevent ghost data
        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();

        const pts = window.hubMarkers.map(m => m.getLatLng());
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson&steps=false`;

        fetch(url, { signal: this._abortController.signal })
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;

                // 1. ONLY CLEAR AFTER DATA ARRIVES (Prevents disappearing)
                this._layers.clearLayers();
                if (this._flag) window.map.removeLayer(this._flag);

                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                // Weighted Speed: 90km/h (NL Standard)
                const weightedSpeed = 90; 
                const travelTimeHrs = distanceKm / weightedSpeed;
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                // DRAW
                L.polyline(coordinates, { color: '#222', weight: 10, opacity: 0.9 }).addTo(this._layers);
                L.polyline(coordinates, { color: '#FFD700', weight: 2, dashArray: '10, 20' }).addTo(this._layers);
                this._layers.addTo(window.map);

                const midIndex = Math.floor(coordinates.length / 2);
                this._flag = L.marker(coordinates[midIndex], {
                    icon: L.divIcon({
                        className: 'route-flag-container',
                        html: `<div class="route-bubble">🏁 ${distanceKm.toFixed(1)} km | ${hours}h ${mins}m</div>`,
                        iconSize: [160, 30],
                        iconAnchor: [80, 15]
                    })
                }).addTo(window.map);
                
                // Keep the route in view
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
