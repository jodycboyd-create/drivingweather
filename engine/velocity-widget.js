/** * Project: [weong-bulletin]
 * Logic: L3 Multi-Tier Road Speed + Precision Chronometer
 * Status: Final Layout Hardening [cite: 2025-12-31]
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0, // Offset from "Posted"
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
            box-shadow: 0 10px 40px rgba(0,0,0,1); width: 340px;
        `;

        widget.innerHTML = `
            <div style="background: rgba(255, 215, 0, 0.08); border: 1px solid #444; padding: 12px; margin-bottom: 15px;">
                <div style="font-size: 10px; color: #888; letter-spacing: 2px; margin-bottom: 8px; border-bottom: 1px solid #333;">MISSION METRICS</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <span style="font-size: 9px; color: #888;">DEPARTURE</span>
                        <div id="m-dep-time" style="font-size: 16px; color: #fff;">--:--</div>
                    </div>
                    <div style="border-left: 1px solid #333; padding-left: 10px;">
                        <span style="font-size: 9px; color: #00CCFF;">EST. ARRIVAL</span>
                        <div id="m-arr-time" style="font-size: 16px; color: #00CCFF; font-weight: bold;">--:--</div>
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 9px; color: #888;">TOTAL TRAVEL TIME:</span>
                    <span id="m-travel-dur" style="font-size: 20px; color: #FFD700;">0H 0M</span>
                </div>
            </div>

            <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                <button onclick="VelocityWidget.updateSpeed(-5)" style="background:#111; color:#FFD700; border:1px solid #FFD700; width:40px; height:40px; cursor:pointer;">-5</button>
                <div style="text-align: center;">
                    <div style="font-size: 10px; color: #888;">SPEED PROFILE</div>
                    <div style="font-size: 20px; color:#fff;">POSTED <span id="v-speed-off" style="color:#FFD700;">+0</span></div>
                    <div style="font-size: 9px; color: #444;">TCH: 100 | BR: 80 | COM: 50</div>
                </div>
                <button onclick="VelocityWidget.updateSpeed(5)" style="background:#111; color:#FFD700; border:1px solid #FFD700; width:40px; height:40px; cursor:pointer;">+5</button>
            </div>

            <div style="border-top: 1px solid #333; padding-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="text-align: center;">
                    <span style="font-size: 9px; color: #888;">ADJUST DAY</span>
                    <div style="display: flex; justify-content: center; gap: 5px; margin-top: 4px;">
                        <button onclick="VelocityWidget.updateDay(-1)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 10px;">-</button>
                        <button onclick="VelocityWidget.updateDay(1)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 10px;">+</button>
                    </div>
                    <div id="v-day-display" style="font-size: 11px; margin-top: 4px;">Dec 31</div>
                </div>
                <div style="text-align: center; border-left: 1px solid #333;">
                    <span style="font-size: 9px; color: #888;">ADJUST TIME (15M)</span>
                    <div style="display: flex; justify-content: center; gap: 5px; margin-top: 4px;">
                        <button onclick="VelocityWidget.updateTime(-15)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 10px;">-</button>
                        <button onclick="VelocityWidget.updateTime(15)" style="background:#111; color:#fff; border:1px solid #444; padding:5px 10px;">+</button>
                    </div>
                    <div style="font-size: 11px; margin-top: 4px;">INCREMENTAL</div>
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

    render: function() {
        // Blended Posted Speed Logic: Assumes 85% TCH, 10% Branch, 5% Community for crossing logic
        const blendedBase = (100 * 0.85) + (80 * 0.10) + (50 * 0.05);
        const finalSpeed = blendedBase + this.state.speedAdjustment;
        const dist = window.currentRouteDistance || 0;
        
        const travelHours = dist / finalSpeed;
        const h = Math.floor(travelHours);
        const m = Math.round((travelHours - h) * 60);
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        // Update UI
        document.getElementById('m-dep-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-arr-time').innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-travel-dur').innerText = `${h}H ${m}M`;
        
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
