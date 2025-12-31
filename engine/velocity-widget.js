/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Force-Attachment Build
 * Fix: Persistent Body-Check + Global Scope Exposure
 */

const VelocityWidget = {
    state: {
        baseSpeed: 100,
        offset: 0,
        departureTime: new Date()
    },

    init: function() {
        console.log("SYSTEM: Velocity Engine Initializing...");
        // Use a persistent interval to ensure it finds the body tag
        const bodyFinder = setInterval(() => {
            if (document.body) {
                clearInterval(bodyFinder);
                this.createUI();
            }
        }, 50);
    },

    createUI: function() {
        if (document.getElementById('velocity-anchor')) return;

        const container = document.createElement('div');
        container.id = 'velocity-anchor';
        
        // Use inline styles to ensure it floats above all Leaflet layers
        container.style.cssText = `
            position: fixed !important;
            bottom: 40px !important;
            right: 40px !important;
            z-index: 2147483647 !important;
            display: block !important;
            pointer-events: auto !important;
        `;

        container.innerHTML = `
            <div style="background:rgba(0,0,0,0.95); border:2px solid #FFD700; padding:15px; color:#FFD700; min-width:220px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius:4px; font-family:monospace;">
                <div style="font-size:10px; opacity:0.7; letter-spacing:1px; border-bottom:1px solid #333; margin-bottom:8px; padding-bottom:4px;">NAV VELOCITY</div>
                <div id="v-speed-val" style="font-size:28px; font-weight:bold; margin-bottom:2px;">100 KM/H</div>
                <div id="v-time-val" style="font-size:14px; margin-bottom:15px; color:#fff;">--:--</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <button id="v-spd-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">SPD -</button>
                    <button id="v-spd-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">SPD +</button>
                    <button id="v-time-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">TIME -</button>
                    <button id="v-time-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">TIME +</button>
                </div>
            </div>`;

        document.body.appendChild(container);
        this.setupListeners();
        this.render();
        console.log("SYSTEM: Velocity UI Injected and Active.");
    },

    render: function() {
        const speed = this.state.baseSpeed + this.state.offset;
        const timeStr = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        document.getElementById('v-speed-val').innerText = `${speed} KM/H`;
        document.getElementById('v-time-val').innerText = timeStr;

        // Push values to global window for WeatherEngine handshake
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
    },

    setupListeners: function() {
        document.getElementById('v-spd-plus').onclick = () => { this.state.offset += 10; this.render(); };
        document.getElementById('v-spd-minus').onclick = () => { this.state.offset -= 10; this.render(); };
        document.getElementById('v-time-plus').onclick = () => { 
            this.state.departureTime = new Date(this.state.departureTime.getTime() + 15 * 60000); 
            this.render(); 
        };
        document.getElementById('v-time-minus').onclick = () => { 
            this.state.departureTime = new Date(this.state.departureTime.getTime() - 15 * 60000); 
            this.render(); 
        };
    }
};

VelocityWidget.init();
