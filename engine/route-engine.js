/**
 * ROUTE-ENGINE.JS | v.2025.12.29.18
 * Bridge Confirmation: Green Route + Midpoint Block
 */
const RouteEngine = {
    _control: null,
    _block: null,

    calculateRoute: function(start, end) {
        const map = window.map; // Accessing global map from anchor index.html
        if (!map) return;

        // Cleanup
        if (this._control) map.removeControl(this._control);
        if (this._block) map.removeLayer(this._block);

        // CHANGE: Routing color set to GREEN to verify this file is in control
        this._control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null,
            addWaypoints: false,
            routeWhileDragging: false,
            show: false,
            lineOptions: { 
                styles: [{ color: '#00FF00', weight: 8, opacity: 0.9 }] 
            }
        }).addTo(map);

        // CHANGE: Using 'routeselected' for higher reliability in drawing blocks
        this._control.on('routeselected', (e) => {
            const route = e.route;
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

            // Create a 1km x 1km Red Square to confirm injection functionality
            const bounds = [
                [mid.lat - 0.01, mid.lng - 0.01], 
                [mid.lat + 0.01, mid.lng + 0.01]
            ];

            this._block = L.rectangle(bounds, {
                color: "#FF0000",
                fillColor: "#FF0000",
                fillOpacity: 1,
                weight: 2
            }).addTo(map);

            console.log("Confirmed: Route Green / Block Red at Midpoint.");
        });
    }
};
