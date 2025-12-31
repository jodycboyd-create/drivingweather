/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Universal Injection Build
 * Fix: Recursive Body-Check + Root Level Placement
 */

const VelocityWidget = {
    state: {
        baseSpeed: 100,
        offset: 0,
        departureTime: new Date()
    },

    init: function() {
        console.log("SYSTEM: Velocity Engine Initializing...");
        // Use a persistent interval to find the body regardless of load state
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
        
        // Use inline styles to override any map-level clipping
        container.style.cssText = `
            position: fixed !important;
            bottom: 40px !important;
            right: 40px !important;
            z-index: 2147483647 !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
        `;

        container.innerHTML = `
            <div style="background:rgba(0,0,0,0.95); border:2px solid #FFD700; padding:15px; color:#FFD700; min-width:220px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius:4px; font-family:monospace; pointer-events: auto;">
                <div style="font-size:10px; opacity:0.7; letter-spacing:1px; border-bottom:1px solid #333; margin-bottom:8px; padding-bottom:4px;">NAV VELOCITY</div>
                <div id="v-speed-val" style="font-size:28px; font-weight:bold; margin-bottom:2px; color:#FFD700;">100 KM/H</div>
                <div id="v-time-val" style="font-size:14px; margin-bottom:15px; color:#fff;">--:--</div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <button id="v-spd-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold; font-size:11px;">SPD -</button>
                    <button id="v-spd-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold; font-size:11px;">SPD +</button>
                    <button id="v-time-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold; font-size:11px;">TIME -</button>
                    <button id="v-time-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold; font-size:11px;">TIME +</button>
                </div>
            </div>`;

        // Prepend ensures it's at the top of the DOM stack
        document.body.appendChild(container);
        
        this.setupListeners();
        this.render();
        console.log("SYSTEM: Velocity UI Forced to Screen.");
    },

    render: function() {
        const speed = this.state.baseSpeed + this.state.offset;
        const timeStr = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const sEl = document.getElementById('v-speed-val');
        const tEl = document.getElementById('v-time-val');
        
        if (sEl) sEl.innerText = `${speed} KM/H`;
        if (tEl) tEl.innerText = timeStr;

        // Push values to global window for WeatherEngine handshake
        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = this.state.departureTime;
    },

    setupListeners: function() {
        const handle = (id, fn) => document.getElementById(id).onclick = fn;

        handle('v-spd-plus', () => { this.state.offset += 10; this.render(); });
        handle('v-spd-minus', () => { this.state.offset -= 10; this.render(); });
        handle('v-time-plus', () => { 
            this.state.departureTime = new Date(this.state.departureTime.getTime() + 15 * 60000); 
            this.render(); 
        });
        handle('v-time-minus', () => { 
            this.state.departureTime = new Date(this.state.departureTime.getTime() - 15 * 60000); 
            this.render(); 
        });
    }
};

VelocityWidget.init();
