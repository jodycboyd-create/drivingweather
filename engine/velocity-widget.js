/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Redesign (Unified Overlay Style)
 * Logic: Direct DOM Injection with Handshake Links
 */

const VelocityWidget = {
    // Core state for the Level 3 Handshake
    state: {
        currentSpeed: 100,
        departureTime: new Date()
    },

    init: function() {
        console.log("SYSTEM: Velocity Engine Initializing...");
        // Wait for body to be stable
        if (document.body) {
            this.createUI();
        } else {
            window.addEventListener('DOMContentLoaded', () => this.createUI());
        }
    },

    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        
        // Styled to match your "DETAILED TABULAR FORECAST" UI
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
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            min-width: 180px;
        `;

        widget.innerHTML = `
            <div style="font-size: 10px; border-bottom: 1px solid #FFD700; margin-bottom: 5px;">VELOCITY CONTROL</div>
            <div id="v-display-speed" style="font-size: 20px; text-align: center;">100 KM/H</div>
            <div id="v-display-time" style="font-size: 12px; text-align: center; color: #fff; margin-bottom: 10px;">--:--</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="VelocityWidget.updateSpeed(-10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD -</button>
                <button onclick="VelocityWidget.updateSpeed(10)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD +</button>
                <button onclick="VelocityWidget.updateTime(-15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME -</button>
                <button onclick="VelocityWidget.updateTime(15)" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME +</button>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
        console.log("SYSTEM: Velocity UI Rendered");
    },

    updateSpeed: function(delta) {
        this.state.currentSpeed = Math.max(10, this.state.currentSpeed + delta);
        this.render();
    },

    updateTime: function(mins) {
        this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000);
        this.render();
    },

    render: function() {
        const speedEl = document.getElementById('v-display-speed');
        const timeEl = document.getElementById('v-display-time');
        
        if (speedEl) speedEl.innerText = `${this.state.currentSpeed} KM/H`;
        if (timeEl) timeEl.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // CRITICAL HANDSHAKE: Update Global Variables for Weather Engine
        window.currentCruisingSpeed = this.state.currentSpeed;
        window.currentDepartureTime = this.state.departureTime;
        
        // Trigger Weather Engine Sync if available
        if (window.WeatherEngine && typeof window.WeatherEngine.syncCycle === 'function') {
            window.WeatherEngine.syncCycle();
        }
    }
};

// Expose to window so onclick handlers can find it
window.VelocityWidget = VelocityWidget;
VelocityWidget.init();
