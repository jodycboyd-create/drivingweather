/**
 * ROUTE-ENGINE.JS | LEVEL 3 LOCKED BUILD
 * Features: #999999 Ribbon, Text-only Metrics, Corrected 100/80/50 Speeds.
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
                 * SPEED CALCULATION: 100 -> 80 -> 50 km/h
                 * This calculates the time as a weighted average of your requested speeds.
                 */
                const time100 = (distanceKm * 0.70) / 100; // TCH
                const time80 = (distanceKm * 0.20) / 80;   // Branch
                const time50 = (distanceKm * 0.10) / 50;   // Local
                
                const totalHrs = time100 + time80 + time50;
                const hours = Math.floor(totalHrs);
                const mins = Math.round((totalHrs - hours) * 60);

                // ROAD RIBBON: Lighter Grey (#999999)
                L.polyline(coordinates, { 
                    color: '#999999', weight: 9, opacity: 0.85, lineCap: 'round' 
                }).addTo(this._layers);

                L.polyline(coordinates, { 
                    color: '#FFD700', weight: 2, dashArray: '10, 20' 
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                // METRICS FLAG: Removed checkered icon
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
                if (err.name !== 'AbortError') console.error("Sync Error", err);
            });
    }
};
