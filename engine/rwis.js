/** * Project: [weong-route] | MODULE: rwis.js
 * Feature: Road Weather Information System Station Markers
 */

(function() {
    const RWIS = {
        group: L.layerGroup(),
        visible: false,
        // Major NL RWIS Station Coordinates
        stations: [
            { name: "Foxtrap", lat: 47.50, lng: -52.99 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Pasadena", lat: 49.01, lng: -57.60 },
            { name: "Wreckhouse", lat: 47.71, lng: -59.30 }
        ],

        init() {
            this.createToggle();
            this.loadStationData();
        },

        async loadStationData() {
            this.stations.forEach(async (stn) => {
                // Fetching via Open-Meteo as a proxy for station-proximate current conditions
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stn.lat}&longitude=${stn.lng}&current_weather=true`);
                const data = await res.json();
                const temp = data.current_weather.temperature;
                const wind = data.current_weather.windspeed;

                const icon = L.divIcon({
                    className: 'rwis-icon',
                    html: `<div style="background:rgba(0,0,0,0.8); border:1px solid #00FFFF; color:#00FFFF; 
                            padding:2px; font-size:9px; white-space:nowrap; border-radius:3px;">
                            ${stn.name}<br>${temp}°C | ${wind}km/h</div>`
                });

                L.marker([stn.lat, stn.lng], { icon }).addTo(this.group);
            });
        },

        createToggle() {
            const btn = document.createElement('button');
            btn.id = 'toggle-rwis';
            btn.innerHTML = 'RWIS: OFF';
            btn.style = `position:absolute; top:155px; left:10px; z-index:1000; 
                         background:#111; color:#00FFFF; border:1px solid #00FFFF; 
                         padding:5px; font-family:monospace; cursor:pointer; width:100px;`;
            
            btn.onclick = () => {
                this.visible = !this.visible;
                if (this.visible) {
                    this.group.addTo(window.map);
                    btn.innerHTML = 'RWIS: ON';
                    btn.style.background = '#00FFFF';
                    btn.style.color = '#000';
                } else {
                    window.map.removeLayer(this.group);
                    btn.innerHTML = 'RWIS: OFF';
                    btn.style.background = '#111';
                    btn.style.color = '#00FFFF';
                }
            };
            document.body.appendChild(btn);
        }
    };
    RWIS.init();
})();
