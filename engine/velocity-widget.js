/** * Project: [weong-bulletin]
 * Logic: Self-Contained L3 Velocity Calculator
 * Feature: Active Route Scraping & Weather-Engine Bridge
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0,
        departureTime: new Date(),
        routeDistance: 0,
        lastRouteHash: ""
    },

    init: function() {
        const bodyFinder = setInterval(() => {
            if (document.body) {
                clearInterval(bodyFinder);
                this.createUI();
                this.startRouteObserver(); // New: Continuous route monitoring
            }
        }, 500);
    },

    /**
     * Scrapes Leaflet for the active route polyline and updates distance
     * Bridges the gap between visual path and mathematical metrics
     */
    startRouteObserver: function() {
        setInterval(() => {
            if (!window.map) return;
            
            // Search for the polyline with high point density (the route)
            const routeLayer = Object.values(window.map._layers).find(l => 
                l._latlngs && l._latlngs.length > 5 && l.options.color !== "#FFD700"
            );

            if (routeLayer) {
                const coords = routeLayer.getLatLngs();
                const routeHash = `${coords[0].lat.toFixed(4)}${coords.length}`;
                
                // Only recalculate if the route geometry actually changed
                if (routeHash !== this.state.lastRouteHash) {
                    this.state.lastRouteHash = routeHash;
                    
                    // Standard Leaflet distance calculation in meters -> KM
                    let totalMeters = 0;
                    for (let i = 0; i < coords.length - 1; i++) {
                        totalMeters += coords[i].distanceTo(coords[i+1]);
                    }
                    
                    this.state.routeDistance = totalMeters / 1000;
                    window.currentRouteDistance = this.state.routeDistance; 
                    this.render();
                }
            } else if (this.state.routeDistance !== 0) {
                // Reset if route is cleared
                this.state.routeDistance = 0;
                window.currentRouteDistance = 0;
                this.render();
            }
        }, 1500);
    },

    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(12px);
            border: 1px solid #FFD700; color: #FFD700;
            padding: 12px; font-family: monospace;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8); border-radius: 4px;
            width: 480px; display: flex; gap: 14px; align-items: stretch;
        `;

        widget.innerHTML = `
            <div style="flex: 1.3; border-right: 1px solid rgba(255,215,0,0.3); padding-right: 10px; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 9px; opacity: 0.8; letter-spacing: 1px;">DEPARTURE</span>
                    <button onclick="VelocityWidget.syncNow()" style="background:#FFD700; color:#000; border:none; border-radius:2px; font-size:8px; font-weight:bold; padding:2px 6px; cursor:pointer;">NOW</button>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div id="m-dep-time" style="font-size: 24px; color: #fff; font-weight: bold;">--:--</div>
                    <div style="display: flex; gap: 4px;">
                        <button onclick="VelocityWidget.updateTime(-15)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer; font-weight:bold;">-</button>
                        <button onclick="VelocityWidget.updateTime(15)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer; font-weight:bold;">+</button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div id="v-day-display" style="font-size: 13px; color: #FFD700;">Dec 31</div>
                    <div style="display: flex; gap: 4px;">
                        <button onclick="VelocityWidget.updateDay(-1)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer;">-</button>
                        <button onclick="VelocityWidget.updateDay(1)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer;">+</button>
                    </div>
                </div>
            </div>

            <div style="flex: 1.8; border-right: 1px solid rgba(255,215,0,0.3); padding-right: 10px; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 10px; opacity: 0.7;">EST. ARRIVAL:</span>
                    <span id="m-arr-time" style="font-size: 18px; color: #00CCFF; font-weight: bold;">--:--</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 10px; opacity: 0.7;">TOTAL DIST:</span>
                    <span id="m-travel-dist" style="font-size: 18px; color: #fff; font-weight: bold;">0.0 KM</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 10px; opacity: 0.7;">MISSION DUR:</span>
                    <span id="m-travel-dur" style="font-size: 18px; color: #FFD700; font-weight: bold;">0H 0M</span>
                </div>
            </div>

            <div style="flex: 0.8; text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                <div style="font-size: 9px; opacity: 0.6;">SPD ADJ</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <button onclick="VelocityWidget.updateSpeed(-5)" style="background:none; color:#FFD700; border:1px solid #FFD700; border-radius:50%; width:22px; height:22px; cursor:pointer;">-</button>
                    <div id="v-speed-off" style="font-size: 20px; color:#fff; font-weight:bold;">+0</div>
                    <button onclick="VelocityWidget.updateSpeed(5)" style="background:none; color:#FFD700; border:1px solid #FFD700; border-radius:50%; width:22px; height:22px; cursor:pointer;">+</button>
                </div>
                <div style="font-size: 8px; opacity: 0.5;">KM/H</div>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    syncNow: function() { this.state.departureTime = new Date(); this.render(); },
    updateDay: function(delta) { this.state.departureTime.setDate(this.state.departureTime.getDate() + delta); this.render(); },
    updateTime: function(mins) { this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000); this.render(); },
    updateSpeed: function(delta) { this.state.speedAdjustment += delta; this.render(); },

    calculateWeightedSpeed: function() {
        const totalKm = this.state.routeDistance;
        let base = 100;
        if (totalKm < 50) base = 50;
        else if (totalKm < 150) base = 80;
        return base + this.state.speedAdjustment;
    },

    render: function() {
        const finalSpeed = this.calculateWeightedSpeed();
        const dist = this.state.routeDistance;
        const travelHours = finalSpeed > 0 ? dist / finalSpeed : 0;
        const h = Math.floor(travelHours);
        const m = Math.round((travelHours - h) * 60);
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        // UI Updates
        const updateText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        
        updateText('m-dep-time', this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-arr-time', arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-travel-dur', `${h}H ${m}M`);
        updateText('m-travel-dist', `${dist.toFixed(1)} KM`);
        updateText('v-speed-off', (this.state.speedAdjustment >= 0 ? "+" : "") + this.state.speedAdjustment);
        updateText('v-day-display', this.state.departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' }));

        // GLOBAL EXPOSURE: Crucial for WeatherEngine syncing
        window.currentCruisingSpeed = finalSpeed;
        window.currentDepartureTime = this.state.departureTime;
        window.currentRouteDistance = dist;
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
