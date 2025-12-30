/**
 * ROUTE-ENGINE.JS | ISLAND-SCALE DASH BUILD
 * Fixes: Missing dashes at zoom level 7.
 * Features: Adaptive width, Proportional dashes, 100/80/50 Speeds.
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

                // Speed Math: 100/80/50 km/h (No Moose Logic)
                const totalHrs = ((distanceKm * 0.75) / 100) + ((distanceKm * 0.20) / 80) + ((distanceKm * 0.05) / 50);
                const hours = Math.floor(totalHrs);
                const mins = Math.round((totalHrs - hours) * 60);

                /**
                 * DYNAMIC SCALING
                 * Ensures visibility without "bulk" at zoom 7.
                 */
                const z = window.map.getZoom();
                const baseWeight = z > 10 ? 8 : (z > 7 ? 5 : 3);
                const borderWeight = baseWeight + 2.5;
                
                // Scale dash length so it doesn't look like a solid line at distance
                const dashPattern = z > 7 ? '10, 20' : '5, 10';

                // 1. SHARP OUTER BORDER
                L.polyline(coordinates, { 
                    color: '#444444', weight: borderWeight, opacity: 1, lineCap: 'round' 
                }).addTo(this._layers);

                // 2. MAIN GREY RIBBON
                L.polyline(coordinates, { 
                    color: '#777777', weight: baseWeight, opacity: 1, lineCap: 'round' 
                }).addTo(this._layers);

                // 3. YELLOW CENTER DASH (Always active now)
                L.polyline(coordinates, { 
                    color: '#FFD700', 
                    weight: Math.max(1, baseWeight * 0.25), 
                    dashArray: dashPattern, 
                    opacity: 1 
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                const midIndex = Math.floor(coordinates.length / 2);
                this._flag = L.marker(coordinates[midIndex], {
                    icon: L.divIcon({
                        className: 'route-flag-container',
                        html: `<div class="route-bubble">${distanceKm.toFixed(1)} km | ${hours}h ${mins}m</div>`,
                        iconSize: [160, 30],
                        iconAnchor: [80, 15]
                    })
                }).addTo(window.map);
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Sync Error", err);
            });
    }
};

window.addEventListener('shell-live', () => {
    window.hubMarkers.forEach(m => {
        m.off('dragend'); 
        m.on('dragend', () => window.RouteEngine.calculate());
    });
    // Re-render on zoom to apply new dynamic weights/dashes
    window.map.on('zoomend', () => window.RouteEngine.calculate());
    window.RouteEngine.calculate();
});
