/**
 * ROUTE-ENGINE.JS | CORRECTED SPEED BUILD
 * Updates: Medium Grey Ribbon, No Icons, Fixed Segmented Speeds (100/80/50).
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
                 * SEGMENTED SPEED CALCULATION [Corrected]
                 * TCH: 100 km/h (75% of route)
                 * Branch: 80 km/h (20% of route)
                 * Local: 50 km/h (5% of route)
                 */
                const travelTimeHrs = 
                    ((distanceKm * 0.75) / 100) + 
                    ((distanceKm * 0.20) / 80) + 
                    ((distanceKm * 0.05) / 50);

                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                /**
                 * LIGHTER GREY RIBBON
                 * #888888 for a distinct grey road feel.
                 */
                L.polyline(coordinates, { 
                    color: '#888888', 
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
                 * METRICS FLAG (Text Only)
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
