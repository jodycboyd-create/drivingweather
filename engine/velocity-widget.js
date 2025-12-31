/** * Project: [weong-bulletin]
 * Logic: L3 Precision Priority Layout + Native Picker
 * Status: Absolute Path Hardening
 */

const VelocityWidget = {
    state: {
        baseSpeed: 100,
        offset: 0,
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
            box-shadow: 0 10px 40px rgba(0,0,0,1); width: 320px;
        `;

        widget.innerHTML = `
            <div style="font-size: 10px; border-bottom: 2px solid #FFD700; margin-bottom: 15px; padding-bottom: 5px; letter-spacing: 2px; opacity: 0.8;">MISSION PARAMETERS</div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 10px; color: #888; margin-bottom: 4px;">PROMINENT DEPARTURE</div>
                <input type="datetime-local" id="v-input-dep-time" 
                    style="background: #111; border: 1px solid #FFD700; color: #fff; padding: 8px; font-family: monospace; width: 100%; font-size: 16px; cursor: pointer;">
            </div>

            <div style="background: rgba(255, 215, 0, 0.05); border: 1px solid #333; padding: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 9px; color: #888;">TOTAL KM</span>
                    <span id="v-route-dist" style="font-size: 24px; color: #fff; font-weight: bold;">0.0</span>
                </div>
                <div style="display: flex; flex-direction: column; border-left: 1px solid #333; padding-left: 10px;">
                    <span style="font-size: 9px; color: #00CCFF;">EST. ARRIVAL</span>
                    <span id="v-arrival-time" style="font-size: 24px; color: #00CCFF; font-weight: bold;">--:--</span>
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; background: #111; padding: 10px; border: 1px solid #333;">
                <button onclick="VelocityWidget.updateSpeed(-10)" style="background:none; color:#FFD700; border:1px solid #FFD700; cursor:pointer; width:45px; height:45px; font-size:20px;">-</button>
                <div style="text-align: center;">
                    <div id="v-display-speed" style="font-size: 32px; font-weight: bold; line-height: 1;">100</div>
                    <div style="font-size: 10px; color: #888;">KM/H</div>
                </div>
                <button onclick="VelocityWidget.updateSpeed(10)" style="background:none; color:#FFD700; border:1px solid #FFD700; cursor:pointer; width:45px; height:45px; font-size:20px;">+</button>
            </div>
        `;

        document.body.appendChild(widget);
        
        // Sync the datetime input to current state
        const timeInput = document.getElementById('v-input-dep-time');
        timeInput.onchange = (e) => {
            this.state.departureTime = new Date(e.target.value);
            this.render();
        };

        this.render();
    },

    updateSpeed: function(delta) {
        this.state.offset += delta;
        this.render();
    },

    render: function() {
        const speed = this.state.baseSpeed + this.state.offset;
        const dist = window.currentRouteDistance || 0;
        const eteHoursTotal = speed > 0 ? (dist / speed) : 0;
        const arrivalDate = new Date(this.state.departureTime.getTime() + (eteHoursTotal * 3600000));

        // Update Input UI (Format: YYYY-MM-DDTHH:MM)
        const input = document.getElementById('v-input-dep-time');
        if (input) {
            const tzOffset = this.state.departureTime.getTimezoneOffset() * 60000;
            input.value = new Date(this.state.departureTime - tzOffset).toISOString().slice(0, 16);
        }

        // Update Numeric Displays
        document.getElementById('v-display-speed').innerText = speed;
        document.getElementById('v-route-dist').innerText = dist.toFixed(1);
        document.getElementById('v-arrival-time').innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Global State Export
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
        
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
