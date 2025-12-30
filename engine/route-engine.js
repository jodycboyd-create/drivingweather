/**
 * ROUTE-ENGINE.JS | v.2025.12.29.19
 * CORE FUNCTIONALITY: Blue Route + Physical Red Square
 */
const RouteEngine = {
    _control: null,
    _block: null,

    calculateRoute: function(start, end) {
        const map = window.map; 
        if (!map) return;

        if (this._control) map.removeControl(this._control);
        if (this._block) this._block.remove();

        // Standard Blue Route
        this._control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
            
            // Convert coordinate to a pixel point on the screen
            const point = map.latLngToContainerPoint(mid);

            // Create a physical HTML square block
            this._block = document.createElement('div');
            this._block.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                background: red;
                border: 2px solid black;
                z-index: 1000;
                left: ${point.x - 10}px;
                top: ${point.y - 10}px;
                pointer-events: none;
            `;

            // Append directly to the map container to ensure it is visible
            document.getElementById('map').appendChild(this._block);

            // Keep the block pinned during zooms/pans
            map.on('viewreset move', () => {
                const newPoint = map.latLngToContainerPoint(mid);
                this._block.style.left = (newPoint.x - 10) + 'px';
                this._block.style.top = (newPoint.y - 10) + 'px';
            });
        });
    }
};
