/** * Project: [weong-bulletin]
 * Logic: L3 Velocity + Route Metrics Handshake
 * Status: Final UI Integration [cite: 2025-12-31]
 */

const VelocityWidget = {
    state: {
        baseSpeed: 100,
        offset: 0,
        departureTime: new Date(),
        totalDistance: 0
    },

    init: function() {
        console.log("SYSTEM: Velocity Engine + Metrics Initializing...");
        const bodyFinder = setInterval(() => {
            if (document.body) {
                clearInterval(bodyFinder);
                this.createUI();
            }
        }, 50);
    },

    // Fetches distance from the active Leaflet route line
    getRouteDistance: function() {
        if (!window.map) return 0;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return 0;
        
        // Approx distance calculation from coordinates (or use a constant if preferred)
        // For NL TCH build, we'll use the route length multiplier
        return (route.feature.geometry.coordinates.length * 0.85).toFixed(1);
    },

    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: absolute; bottom: 20px; right: 20px; z-index: 10000;
            background: #000; border: 2px solid #FFD700; color: #FFD700;
            padding: 12px; font-family: 'Arial Black', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.8); min-width: 210px;
        `;

        widget.innerHTML = `
            <div style="font-size: 10px; border-bottom: 1px solid #FFD700; margin-bottom: 8px; letter-spacing: 1px;">NAV CONTROL</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div id="v-display-speed" style="font-size: 24px; font-weight: bold;">100 KM/H</div>
                <div id="v-display-time" style="font-size: 14px; color: #fff;">--:--</div>
            </div>

            <div style="background: #111; padding: 8px; border: 1px solid #333; margin-bottom: 10px; font-family: monospace;">
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: #888;">DIST:</span>
                    <span id="v-route-dist">0.0 KM</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: #888;">ETE:</span>
                    <span id="v-route-ete" style="color: #00CCFF;">0h 0m</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button onclick="VelocityWidget.updateSpeed(-10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 6px; font-weight: bold; font-size: 10px;">SPD -</button>
                <button onclick="VelocityWidget.updateSpeed(10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 6px; font-weight: bold; font-size: 10px;">SPD +</button>
                <button onclick="VelocityWidget.updateTime(-15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 6px; font-weight: bold; font-size: 10px;">TIME -</button>
                <button onclick="VelocityWidget.updateTime(15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 6px; font-weight: bold; font-size: 10px;">TIME +</button>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    updateSpeed: function(delta) {
        this.state.offset += delta;
        this.render();
    },

    updateTime: function(mins) {
        this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000);
        this.render();
    },

    render: function() {
        const speed = this.state.baseSpeed + this.state.offset;
        const dist = this.getRouteDistance();
        
        // Calculate ETE (Hours = Distance / Speed)
        const eteHoursTotal = dist / speed;
        const eteH = Math.floor(eteHoursTotal);
        const eteM = Math.round((eteHoursTotal - eteH) * 60);

        document.getElementById('v-display-speed').innerText = `${speed} KM/H`;
        document.getElementById('v-display-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('v-route-dist').innerText = `${dist} KM`;
        document.getElementById('v-route-ete').innerText = `${eteH}h ${eteM}m`;

        // Handshake Update
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
        
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
