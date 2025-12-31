/** * Project: [weong-bulletin]
 * Logic: L3 Precision Metrics + Arrival Logic
 * Status: Final Layout Hardening [cite: 2025-12-31]
 */

const VelocityWidget = {
    state: {
        baseSpeed: 100,
        offset: 0,
        departureTime: new Date()
    },

    init: function() {
        console.log("SYSTEM: Velocity Engine Initializing...");
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
            box-shadow: 0 10px 30px rgba(0,0,0,0.9); width: 300px;
        `;

        widget.innerHTML = `
            <div style="font-size: 11px; border-bottom: 2px solid #FFD700; margin-bottom: 12px; padding-bottom: 4px; letter-spacing: 2px;">NAV CONTROL L3</div>
            
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                <div style="display: flex; align-items: baseline;">
                    <div id="v-display-speed" style="font-size: 36px; font-weight: bold; line-height: 1;">100</div>
                    <div style="font-size: 12px; margin-left: 5px; color: #888;">KM/H</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 9px; color: #888;">DEPARTURE</div>
                    <div id="v-display-time" style="font-size: 18px; color: #fff;">--:--</div>
                </div>
            </div>

            <div style="background: rgba(255, 215, 0, 0.05); border: 1px solid #333; padding: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 9px; color: #888; letter-spacing: 1px;">TOTAL DISTANCE</span>
                    <span id="v-route-dist" style="font-size: 26px; color: #fff; font-weight: bold;">0.0 <small style="font-size: 10px;">KM</small></span>
                </div>
                <div style="display: flex; flex-direction: column; border-left: 1px solid #333; padding-left: 10px;">
                    <span style="font-size: 9px; color: #888; letter-spacing: 1px;">REMAINING ETE</span>
                    <span id="v-route-ete" style="font-size: 26px; color: #00CCFF; font-weight: bold;">0<small style="font-size: 10px;">H</small> 0<small style="font-size: 10px;">M</small></span>
                </div>
                <div style="grid-column: span 2; border-top: 1px solid #333; padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #FFD700;">ESTIMATED ARRIVAL:</span>
                    <span id="v-arrival-time" style="font-size: 20px; color: #FFD700; font-weight: bold; text-shadow: 0 0 10px #FFD700;">--:-- --</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button onclick="VelocityWidget.updateSpeed(-10)" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 10px; font-weight: bold; font-size: 12px;">SPD -</button>
                <button onclick="VelocityWidget.updateSpeed(10)" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 10px; font-weight: bold; font-size: 12px;">SPD +</button>
                <button onclick="VelocityWidget.updateTime(-15)" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 10px; font-weight: bold; font-size: 12px;">TIME -</button>
                <button onclick="VelocityWidget.updateTime(15)" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 10px; font-weight: bold; font-size: 12px;">TIME +</button>
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
        
        // PULL PRECISION DISTANCE FROM WEATHER ENGINE [cite: 2025-12-26]
        const dist = window.currentRouteDistance || 0;
        
        const eteHoursTotal = speed > 0 ? (dist / speed) : 0;
        const eteH = Math.floor(eteHoursTotal);
        const eteM = Math.round((eteHoursTotal - eteH) * 60);

        // Arrival Time Calculation [cite: 2025-12-31]
        const arrivalDate = new Date(this.state.departureTime.getTime() + (eteHoursTotal * 3600000));

        // Update High-Vis Numbers
        document.getElementById('v-display-speed').innerText = speed;
        document.getElementById('v-display-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Update Metrics Pane
        document.getElementById('v-route-dist').innerHTML = `${dist.toFixed(1)} <small style="font-size:10px;">KM</small>`;
        document.getElementById('v-route-ete').innerHTML = `${eteH}<small style="font-size:10px;">H</small> ${eteM}<small style="font-size:10px;">M</small>`;
        document.getElementById('v-arrival-time').innerText = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Global Handshake
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
        
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
