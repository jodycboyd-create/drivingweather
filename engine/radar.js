/** * Project: [weong-route] | MODULE: radar.js
 * Feature: Togglable Precipitation Radar Layer
 */

(function() {
    const Radar = {
        layer: null,
        visible: false,

        async init() {
            // Check RainViewer for latest API endpoints
            const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await resp.json();
            const latest = data.radar.past[data.radar.past.length - 1];
            
            this.layer = L.tileLayer(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
                opacity: 0.6,
                zIndex: 400
            });
            
            this.createToggle();
        },

        createToggle() {
            const btn = document.createElement('button');
            btn.id = 'toggle-radar';
            btn.innerHTML = 'RADAR: OFF';
            btn.style = `position:absolute; top:120px; left:10px; z-index:1000; 
                         background:#111; color:#FFD700; border:1px solid #FFD700; 
                         padding:5px; font-family:monospace; cursor:pointer; width:100px;`;
            
            btn.onclick = () => {
                this.visible = !this.visible;
                if (this.visible) {
                    this.layer.addTo(window.map);
                    btn.innerHTML = 'RADAR: ON';
                    btn.style.background = '#FFD700';
                    btn.style.color = '#000';
                } else {
                    window.map.removeLayer(this.layer);
                    btn.innerHTML = 'RADAR: OFF';
                    btn.style.background = '#111';
                    btn.style.color = '#FFD700';
                }
            };
            document.body.appendChild(btn);
        }
    };
    Radar.init();
})();
