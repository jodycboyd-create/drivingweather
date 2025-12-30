/**
 * ROUTE-ENGINE.JS | ZERO-REGRESSION BUILD
 * Fixed: Missing default route on load.
 * Features: #777777 Ribbon, No Icons, 100/80/50 Speeds.
 *
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,
    _abortController: null,

    calculate: function() {
        // Ensure map and both markers exist before attempting fetch
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) {
            console.warn("RouteEngine: Waiting for markers...");
            return;
        }

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

                /** * SPEED MATH [LOCKED]
                 * 100 km/h (TCH), 80 km/h (Branch), 50 km/h (Local)
                 */
                const totalHrs = ((distanceKm * 0.75) / 100) + ((distanceKm * 0.20) / 80) + ((distanceKm * 0.05) / 50);
                const hours = Math.floor(totalHrs);
                const mins = Math.round((totalHrs - hours) * 60);

                // 1. OUTER BORDER (Sharp Edge)
                L.polyline(coordinates, { 
                    color: '#444444', weight: 11, opacity: 1, lineCap: 'round' 
                }).addTo(this._layers);

                // 2. MAIN GREY RIBBON (#777777)
                L.polyline(coordinates, { 
                    color: '#777777', weight: 8, opacity: 1, lineCap: 'round' 
                }).addTo(this._layers);

                // 3. CENTER DASH
                L.polyline(coordinates, { 
                    color: '#FFD700', weight: 2, dashArray: '12, 24', opacity: 1 
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                // TEXT-ONLY METRICS
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

/**
 * REINFORCED HANDSHAKE
 * Specifically triggers the first calculation for the default route.
 */
window.addEventListener('shell-live', () => {
    console.log("RouteEngine: Handshake Received.");
    
    if (window.hubMarkers) {
        window.hubMarkers.forEach(m => {
            m.off('dragend'); 
            m.on('dragend', () => window.RouteEngine.calculate());
        });
        
        // Force the initial calculation for Corner Brook -> St. John's
        setTimeout(() => {
            window.RouteEngine.calculate();
        }, 100); 
    }
});
