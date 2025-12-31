/** * Project: [weong-bulletin]
 * Logic: Compressed nglass Tactical HUD
 * Status: Final Layout Lock-in [cite: 2025-12-31]
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
        // nglass aesthetic: blur, transparency, and rounded corners
        widget.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 10000;
            background: rgba(15, 15, 15, 0.75); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.25); color: #FFD700;
            padding: 12px; font-family: 'Segoe UI', sans-serif;
            box-shadow: 0 15px 35px rgba(0,0,0,0.6); border-radius: 16px;
            width: 440px; display: flex; gap: 15px; align-items: stretch;
        `;

        widget.innerHTML = `
            <div style="flex: 1.2; border-right: 1px solid rgba(255,215,0,0.1); padding-right: 10px;">
                <div style="font-size: 9px; opacity: 0.6; letter-spacing: 1px; margin-bottom: 4px;">DEPARTURE</div>
                <div id="m-dep-time" style="font-size: 20px; color: #fff; font-weight: bold; line-height: 1;">--:--</div>
                <div id="v-day-display" style="font-size: 10px; color: #FFD700; margin: 4px 0 8px 0;">Dec 31</div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="VelocityWidget.updateTime(-15)" style="background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:4px; flex:1; cursor:pointer; font-size:10px; padding:4px;">-15m</button>
                    <button onclick="VelocityWidget.updateTime(15)" style="background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:4px; flex:1; cursor:pointer; font-size:10px; padding:4px;">+15m</button>
                </div>
            </div>

            <div style="flex: 1.5; border-right: 1px solid rgba(255,215,0,0.1); padding-right: 10px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                        <span style="font-size: 9px; color: #00CCFF; opacity: 0.8;">EST. ARRIVAL</span>
                        <div id="m-arr-time" style="font-size: 18px; color: #00CCFF; font-weight: bold;">--:--</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 9px; opacity: 0.6;">DIST:</span>
                        <span id="m-travel-dist" style="font-size: 12px; color: #fff; font-weight: bold;">0.0 KM</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 9px; opacity: 0.6;">DUR:</span>
                        <span id="m-travel-dur" style="font-size: 14px; color: #FFD700; font-weight: bold;">0H 0M</span>
                    </div>
                </div>
            </div>

            <div style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="font-size: 9px; opacity: 0.6;">SPEED OFFSET</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <button onclick="VelocityWidget.updateSpeed(-5)" style="background:none; color:#FFD700; border:1px solid rgba(255,215,0,0.4); border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold;">-</button>
                    <div id="v-speed-off" style="font-size: 22px; color:#fff; font-weight:bold;">+0</div>
                    <button onclick="VelocityWidget.updateSpeed(5)" style="background:none; color:#FFD700; border:1px solid rgba(255,215,0,0.4); border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <div style="font-size: 8px; opacity: 0.4;">ADJ. KM/H</div>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    updateSpeed: function(delta) {
        this.state.speedAdjustment += delta;
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

        // Update UI DOM
        const depTimeEl = document.getElementById('m-dep-time');
        const arrTimeEl = document.getElementById('m-arr-time');
        const durEl = document.getElementById('m-travel-dur');
        const distEl = document.getElementById('m-travel-dist');
        const speedOffEl = document.getElementById('v-speed-off');
        const dayEl = document.getElementById('v-day-display');

        if (depTimeEl) depTimeEl.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (arrTimeEl) arrTimeEl.innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (durEl) durEl.innerText = `${h}H ${m}M`;
        if (distEl) distEl.innerText = `${dist.toFixed(1)} KM`;
        if (speedOffEl) speedOffEl.innerText = (this.state.speedAdjustment >= 0 ? "+" : "") + this.state.speedAdjustment;
        if (dayEl) dayEl.innerText = this.state.departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

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
