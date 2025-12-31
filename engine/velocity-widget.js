/** * Project: [weong-bulletin]
 * Logic: L3 User-Centric Labeling + Segment-Aware Speed
 * Status: Final Control Hardening [cite: 2025-12-31]
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
            box-shadow: 0 10px 40px rgba(0,0,0,1); width: 360px;
        `;

        widget.innerHTML = `
            <div style="background: rgba(255, 215, 0, 0.08); border: 1px solid #444; padding: 12px; margin-bottom: 20px;">
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

            <div style="margin-bottom: 20px;">
                <div style="font-size: 10px; color: #FFD700; margin-bottom: 8px; letter-spacing: 1px;">SET TRAVEL SPEED</div>
                <div style="display: flex; align-items: center; justify-content: space-between; background: #111; padding: 10px; border: 1px solid #333;">
                    <button onclick="VelocityWidget.updateSpeed(-5)" style="background:#222; color:#FFD700; border:1px solid #FFD700; width:50px; height:40px; cursor:pointer; font-weight:bold;">-5</button>
                    <div style="text-align: center;">
                        <div id="v-speed-off" style="font-size: 24px; color:#fff; font-weight:bold; line-height:1;">+0</div>
                        <div style="font-size: 8px; color: #555; margin-top:2px;">OFFSET KM/H</div>
                    </div>
                    <button onclick="VelocityWidget.updateSpeed(5)" style="background:#222; color:#FFD700; border:1px solid #FFD700; width:50px; height:40px; cursor:pointer; font-weight:bold;">+5</button>
                </div>
            </div>

            <div>
                <div style="font-size: 10px; color: #FFD700; margin-bottom: 8px; letter-spacing: 1px;">SET DEPARTURE TIME</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #111; padding: 10px; border: 1px solid #333;">
                    <div style="text-align: center;">
                        <div id="v-day-display" style="font-size: 12px; color:#fff; margin-bottom:5px;">Dec 31</div>
                        <div style="display: flex; justify-content: center; gap: 8px;">
                            <button onclick="VelocityWidget.updateDay(-1)" style="background:#222; color:#fff; border:1px solid #444; width:35px; height:30px; cursor:pointer;">-</button>
                            <button onclick="VelocityWidget.updateDay(1)" style="background:#222; color:#fff; border:1px solid #444; width:35px; height:30px; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid #333;">
                        <div style="font-size: 11px; color:#888; margin-bottom:5px;">+/- 15 MIN</div>
                        <div style="display: flex; justify-content: center; gap: 8px;">
                            <button onclick="VelocityWidget.updateTime(-15)" style="background:#222; color:#fff; border:1px solid #444; width:35px; height:30px; cursor:pointer;">-</button>
                            <button onclick="VelocityWidget.updateTime(15)" style="background:#222; color:#fff; border:1px solid #444; width:35px; height:30px; cursor:pointer;">+</button>
                        </div>
                    </div>
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
        const totalKm = window.currentRouteDistance || 0;
        let base = 100;
        if (totalKm < 50) base = 50;
        else if (totalKm < 150) base = 80;
        return base + this.state.speedAdjustment;
    },

    render: function() {
        const finalSpeed = this.calculateWeightedSpeed();
        const dist = window.currentRouteDistance || 0;
        const travelHours = finalSpeed > 0 ? dist / finalSpeed : 0;
        const h = Math.floor(travelHours);
        const m = Math.round((travelHours - h) * 60);
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        // Update UI Elements
        document.getElementById('m-dep-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-arr-time').innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('m-travel-dur').innerText = `${h}H ${m}M`;
        document.getElementById('m-travel-dist').innerHTML = `${dist.toFixed(1)} <small style="font-size:10px;">KM</small>`;
        
        document.getElementById('v-speed-off').innerText = (this.state.speedAdjustment >= 0 ? "+" : "") + this.state.speedAdjustment;
        document.getElementById('v-day-display').innerText = this.state.departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

        // Sync Global State
        window.currentCruisingSpeed = finalSpeed;
        window.currentDepartureTime = this.state.departureTime;
        
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
