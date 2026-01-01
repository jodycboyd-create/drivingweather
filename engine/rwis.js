/** * Project: [weong-route] | MODULE: rwis.js
 * Feature: Professional RWIS Pill Plotting (Togglable)
 */

(function() {
    const RWIS = {
        group: L.layerGroup(),
        visible: false,
        stations: [
            { id: "FTP", name: "Foxtrap", lat: 47.502, lng: -52.991 },
            { id: "CLV", name: "Clarenville", lat: 48.163, lng: -53.961 },
            { id: "GFW", name: "Grand Falls", lat: 48.932, lng: -55.651 },
            { id: "PAS", name: "Pasadena", lat: 49.011, lng: -57.602 },
            { id: "WRE", name: "Wreckhouse", lat: 47.712, lng: -59.301 },
            { id: "GAN", name: "Gander", lat: 48.957, lng: -54.584 },
            { id: "DBY", name: "Deer Lake", lat: 49.172, lng: -57.432 }
        ],

        init() {
            this.createToggle();
            this.loadStationData();
        },

        async loadStationData() {
            this.group.clearLayers();
            
            for (const stn of this.stations) {
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stn.lat}&longitude=${stn.lng}&current_weather=true`);
                    const data = await res.json();
                    const temp = data.current_weather.temperature.toFixed(1);
                    const wind = Math.round(data.current_weather.windspeed);

                    const pillHtml = `
                        <div style="
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            background: rgba(10, 10, 10, 0.9); 
                            border: 1px solid #00FFFF; 
                            border-radius: 4px; 
                            padding: 2px 4px; 
                            box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
                            font-family: 'Segoe UI', Roboto, monospace;
                            min-width: 45px;
                        ">
                            <div style="color: #00FFFF; font-size: 8px; font-weight: 900; border-bottom: 1px solid #333; width: 100%; text-align: center; margin-bottom: 2px;">
                                ${stn.id}
                            </div>
                            <div style="color: #FFF; font-size: 11px; font-weight: bold; line-height: 1.1;">
                                ${temp}°
                            </div>
                            <div style="color: #00FFFF; font-size: 7px; opacity: 0.8;">
                                ${wind} <span style="font-size: 5px;">KM/H</span>
                            </div>
                        </div>
                    `;

                    const icon = L.divIcon({
                        className: 'rwis-pill',
                        html: pillHtml,
                        iconSize: [50, 40],
                        iconAnchor: [25, 20]
                    });

                    L.marker([stn.lat, stn.lng], { icon })
                     .bindPopup(`<b>Station: ${stn.name}</b><br>Ground Truth Data Sync`)
                     .addTo(this.group);

                } catch (e) {
                    console.error(`RWIS Sync Failed for ${stn.id}`);
                }
            }
        },

        createToggle() {
            const btn = document.createElement('button');
            btn.id = 'toggle-rwis';
            btn.innerHTML = 'RWIS: OFF';
            btn.style = `
                position: absolute; top: 160px; left: 10px; z-index: 1000; 
                background: #111; color: #00FFFF; border: 1px solid #00FFFF; 
                padding: 6px; font-family: monospace; font-size: 10px; 
                cursor: pointer; width: 100px; text-align: center;
                transition: all 0.2s;
            `;
            
            btn.onclick = () => {
                this.visible = !this.visible;
                if (this.visible) {
                    this.group.addTo(window.map);
                    btn.innerHTML = 'RWIS: ON';
                    btn.style.background = '#00FFFF';
                    btn.style.color = '#000';
                    this.loadStationData(); // Refresh on toggle
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
