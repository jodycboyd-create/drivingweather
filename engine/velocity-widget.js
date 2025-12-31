/** * Project: [weong-bulletin]
 * Logic: L3 Segment-Aware Speed Engine + Dynamic Distance
 * Status: Route-Type Hardening [cite: 2025-12-31]
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0,
        departureTime: new Date()
    },

    init: function() {
        const bodyFinder = setInterval(() => {
            if (document.body) {
                clearInterval(bodyFinder);
                this.createUI();
            }
        }, 50);
    },

    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 10000;
            background: #000; border: 2px solid #FFD700; color: #FFD700;
            padding: 15px; font-family: 'Arial Black', sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,1); width: 350px;
        `;

        widget.innerHTML = `
            <div style="background: rgba(255, 215, 0, 0.08); border: 1px solid #444; padding: 12px; margin-bottom: 15px;">
                <div style="font-size: 10px; color: #888; letter-spacing: 2px; margin-bottom: 8px; border-bottom: 1px solid #333;">MISSION METRICS</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 9px; color: #888;">DEPARTURE</span>
                        <div id="m-dep-time" style="font-size: 16px; color: #fff;">--:--</div>
                    </div>
                    <div style="border-left: 1px solid #333; padding-left: 10px;">
                        <span style="font-size: 9px; color: #00CCFF;">EST. ARRIVAL</span>
                        <div id="m-arr-time" style="font-size: 16px; color: #00CCFF; font-weight: bold;">--:--</div>
                    </div>
                </div>
                <div style="border-top: 1px solid #333; padding-top: 8px; display: flex; justify-content: space-between; align-items: baseline;">
                    <div>
                        <span style="font-size: 9px; color: #888;">TRAVEL DISTANCE</span>
                        <div id="m-travel-dist" style="font-size: 18px; color: #fff;">0.0 <small style="font-size:10px;">KM</small></div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 9px; color: #888;">TRAVEL TIME</span>
                        <div id="m-travel-dur" style="font-size: 18px; color: #FFD700;">0H 0M</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; background: #111; padding: 8px; border-radius: 4px;">
                <button onclick="VelocityWidget.updateSpeed(-5)" style="background:#222; color:#FFD700; border:1px solid #FFD700; width:45px; height:45px; cursor:pointer; font-size:16px;">-5</button>
                <div style="text-align: center;">
                    <div style="font-size: 9px; color: #888;">POSTED ADJ.</div>
                    <div id="v-speed-off" style="font-size: 24px; color:#fff; font-weight:bold;">+0</div>
                    <div style="font-size: 8px; color: #555;">TCH:100 | BR:80 | COM:50</div>
                </div>
                <button onclick="VelocityWidget.updateSpeed(5)" style="background:#222; color:#FFD700; border:1px solid #FFD700; width:45px; height:45px; cursor:pointer; font-size:16px;">+5</button>
            </div>

            <div style="border-top: 1px solid #333; padding-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="text-align: center;">
                    <span style="font-size: 9px; color: #888;">DAY ADJUST</span>
                    <div style="display: flex; justify-content: center; gap: 5px; margin-top: 4px;">
                        <button onclick="VelocityWidget.updateDay(-1)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 12px; cursor:pointer;">-</button>
                        <button onclick="VelocityWidget.updateDay(1)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 12px; cursor:pointer;">+</button>
                    </div>
                    <div id="v-day-display" style="font-size: 11px; margin-top: 6px; color:#FFD700;">Dec 31</div>
                </div>
                <div style="text-align: center; border-left: 1px solid #333;">
                    <span style="font-size: 9px; color: #888;">TIME ADJUST</span>
                    <div style="display: flex; justify-content: center; gap: 5px; margin-top: 4px;">
                        <button onclick="VelocityWidget.updateTime(-15)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 12px; cursor:pointer;">-</button>
                        <button onclick="VelocityWidget.updateTime(15)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 12px; cursor:pointer;">+</button>
                    </div>
                    <div style="font-size: 9px; margin-top: 6px; color:#888;">(15 MIN STEPS)</div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    updateSpeed: function(delta) {
        this.state.speedAdjustment += delta;
        this.render();
    },

    updateDay: function(delta) {
        this.state.departureTime.setDate(this.state.departureTime.getDate() + delta);
        this.render();
    },

    updateTime: function(mins) {
        this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000);
        this.render();
    },

    calculateWeightedSpeed: function() {
        // Find the route layer
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route || !route.feature.properties.summary) return 100 + this.state.speedAdjustment;

        // Leaflet Routing Machine doesn't provide easy road-type breakdown in standard JSON,
        // So we apply a heuristic: Distance > 50km on major routes uses 100, others 80.
        // For Newfoundland specifically:
        const totalKm = window.currentRouteDistance || 0;
        let base = 100; // Default TCH

        // If the route is short or heavily branched (calculated by distance/node density), drop base
        if (totalKm < 50) base = 50; // Community/Local
        else if (totalKm < 150) base = 80; // Branch Road

        return base + this.state.speedAdjustment;
    },

    render: function() {
        const finalSpeed = this.calculateWeightedSpeed();
        const dist = window.currentRouteDistance || 0;
        
        const travelHours = dist / finalSpeed;
        const h = Math.floor(travelHours);
        const m = Math.round((travelHours - h) * 60);
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        // Update High-Vis Metrics
        document.getElementById('m-dep-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-arr-time').innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-travel-dur').innerText = `${h}H ${m}M`;
        document.getElementById('m-travel-dist').innerHTML = `${dist.toFixed(1)} <small style="font-size:10px;">KM</small>`;
        
        // Update Speed Adjustment UI
        document.getElementById('v-speed-off').innerText = (this.state.speedAdjustment >= 0 ? "+" : "") + this.state.speedAdjustment;
        document.getElementById('v-day-display').innerText = this.state.departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

        // Global Sync
        window.currentCruisingSpeed = finalSpeed;
        window.currentDepartureTime = this.state.departureTime;
        
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
