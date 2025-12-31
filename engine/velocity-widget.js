/** * Project: [weong-route] + [weong-bulletin]
 * Build: L3_FINAL_SYNC_001_REDESIGN
 * Purpose: Global Navigation Controller & Weather Engine Trigger
 */

const VelocityWidget = {
    // 1. STATE INITIALIZATION
    state: {
        baseSpeed: 100,
        offset: 0,
        departureTime: new Date()
    },

    // 2. ENTRY POINT
    init: function() {
        console.log("SYSTEM: Velocity Engine Initializing...");
        // Ensuring DOM readiness for injection
        if (document.body) {
            this.createUI();
        } else {
            window.addEventListener('DOMContentLoaded', () => this.createUI());
        }
    },

    // 3. UI INJECTION (Matches Tabular Forecast Theme)
    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        
        // Hardened CSS for Absolute Map Overlay
        widget.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: #000;
            border: 2px solid #FFD700;
            color: #FFD700;
            padding: 10px;
            font-family: 'Arial Black', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.8);
            min-width: 190px;
            pointer-events: auto;
        `;

        widget.innerHTML = `
            <div style="font-size: 10px; border-bottom: 1px solid #FFD700; margin-bottom: 5px; letter-spacing: 1px;">VELOCITY CONTROL</div>
            <div id="v-display-speed" style="font-size: 24px; text-align: center; font-weight: bold;">100 KM/H</div>
            <div id="v-display-time" style="font-size: 14px; text-align: center; color: #fff; margin-bottom: 10px;">--:--</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button onclick="VelocityWidget.updateSpeed(-10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 5px; font-weight: bold;">SPD -</button>
                <button onclick="VelocityWidget.updateSpeed(10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 5px; font-weight: bold;">SPD +</button>
                <button onclick="VelocityWidget.updateTime(-15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 5px; font-weight: bold;">TIME -</button>
                <button onclick="VelocityWidget.updateTime(15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding: 5px; font-weight: bold;">TIME +</button>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
        console.log("SYSTEM: Velocity UI Rendered and Handshake Active.");
    },

    // 4. CONTROL LOGIC
    updateSpeed: function(delta) {
        this.state.offset += delta;
        this.render();
    },

    updateTime: function(mins) {
        this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000);
        this.render();
    },

    // 5. THE RENDER & HANDSHAKE TRIGGER
    render: function() {
        const speed = this.state.baseSpeed + this.state.offset;
        const speedEl = document.getElementById('v-display-speed');
        const timeEl = document.getElementById('v-display-time');
        
        if (speedEl) speedEl.innerText = `${speed} KM/H`;
        if (timeEl) timeEl.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // EXPORT TO GLOBALS FOR ENGINES
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
        
        // TRIGGER WEATHER ENGINE RECALCULATION
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

// 6. GLOBAL EXPOSURE (Required for onclick handlers in modules)
window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
