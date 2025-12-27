<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WEonG - Final State Anchor</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
    <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #001220; }
        .snapping-label {
            font-weight: bold; color: #0047AB; background: white;
            border: 2px solid #0047AB; padding: 6px 12px; border-radius: 8px;
            pointer-events: none; white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-family: sans-serif;
        }
        /* Lock the SVG to the tiles to prevent "Ocean Drift" */
        .leaflet-overlay-pane svg { transition: none !important; pointer-events: none !important; }
        .leaflet-routing-container { display: none !important; }
    </style>
</head>
<body>
<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>

<script>
    /**
     * [weong-route] - SILENT ENGINE STRATEGY
     * Prevents engine from fighting the camera and reverting waypoints.
     */
    let map, communities = [], markers = [null, null], routingControl;

    async function init() {
        // [1] Set the view IMMEDIATELY so there is no default zoom conflict
        map = L.map('map', { 
            zoomControl: false, 
            fadeAnimation: false,
            zoomAnimation: true 
        }).setView([49.0, -56.0], 7); 
        
        window.weongMap = map; 
        
        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(map);

        try {
            const response = await fetch('data/nl/communities.json');
            const data = await response.json();
            communities = data.features;
            if (communities.length > 0) setupRoutingPins();
        } catch (e) { console.error("Dataset Load Error"); }
    }

    function findNearestNode(latlng) {
        return communities.reduce((prev, curr) => {
            const p = L.latLng(prev.geometry.coordinates[1], prev.geometry.coordinates[0]);
            const c = L.latLng(curr.geometry.coordinates[1], curr.geometry.coordinates[0]);
            return latlng.distanceTo(c) < latlng.distanceTo(p) ? curr : prev;
        });
    }

    function setupRoutingPins() {
        const anchors = [[48.9454, -57.9415], [47.5615, -52.7126]];
        anchors.forEach((coord, i) => {
            const nearest = findNearestNode(L.latLng(coord));
            const marker = L.marker([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], { 
                draggable: true 
            }).addTo(map);
            
            marker.bindTooltip(nearest.properties.name, { 
                permanent: true, className: 'snapping-label' 
            }).openTooltip();
            
            markers[i] = marker;
            
            marker.on('drag', (e) => {
                const live = findNearestNode(e.latlng);
                marker.setTooltipContent(live.properties.name);
            });

            marker.on('dragend', () => {
                const final = findNearestNode(marker.getLatLng());
                marker.setLatLng([final.geometry.coordinates[1], final.geometry.coordinates[0]]);
                marker.unbindTooltip().bindTooltip(final.properties.name, { 
                    permanent: true, className: 'snapping-label' 
                }).openTooltip();
                
                // [2] Clear old route immediately to prevent any revert attempts
                syncRoute();
            });
        });
        syncRoute();
    }

    function syncRoute() {
        if (!markers[0] || !markers[1]) return;
        const wps = [markers[0].getLatLng(), markers[1].getLatLng()];

        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }

        // [3] fitSelectedRoutes: false is the key. It stops the engine's "auto-zoom"
        routingControl = L.Routing.control({
            waypoints: wps,
            createMarker: () => null,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: false, 
            show: false,
            lineOptions: {
                styles: [{ color: '#1A73E8', weight: 8, opacity: 0.8 }],
                extendToWaypoints: true
            }
        }).addTo(map);

        window.weongRouter = routingControl;

        routingControl.on('routesfound', (e) => {
            // [4] We control the camera manually. No competition with the engine.
            if (!map.dragging.moving()) {
                map.flyToBounds(L.latLngBounds(e.routes[0].coordinates), { 
                    padding: [120, 120], 
                    duration: 0.8 
                });
            }
        });
    }
    window.onload = init;
</script>

<script src="velocity-widget.js"></script>
</body>
</html>
