/** * Project: [weong-bulletin]
 * Logic: L3 Velocity Calculator + 48H Heat Matrix Bridge
 * Feature: 24-Block Temporal Scrubber
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0,
        departureTime: new Date(),
        routeDistance: 0,
        lastRouteHash: "",
        currentLeadTime: 0 // Tracks selected T+ offset
    },

    init: function() {
        const bodyFinder = setInterval(() => {
            if (document.body) {
                clearInterval(bodyFinder);
                this.createUI();
                this.startRouteObserver();
            }
        }, 500);
    },

    /**
     * UPDATED UI: Added Heat Ribbon Container below main metrics
     */
    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;

        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(15px);
            border: 1px solid #FFD700; border-top: 3px solid #00FFFF;
            color: #FFD700; padding: 12px; font-family: monospace;
            box-shadow: 0 15px 50px rgba(0,0,0,0.9); border-radius: 4px;
            width: 500px; display: flex; flex-direction: column; gap: 12px;
        `;

        widget.innerHTML = `
            <div style="display: flex; gap: 14px; align-items: stretch; padding-bottom: 10px; border-bottom: 1px solid rgba(255,215,0,0.2);">
                <div style="flex: 1.3; border-right: 1px solid rgba(255,215,0,0.3); padding-right: 10px; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 9px; opacity: 0.8; letter-spacing: 1px;">DEPARTURE</span>
                        <button onclick="VelocityWidget.syncNow()" style="background:#FFD700; color:#000; border:none; border-radius:2px; font-size:8px; font-weight:bold; padding:2px 6px; cursor:pointer;">NOW</button>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div id="m-dep-time" style="font-size: 24px; color: #fff; font-weight: bold;">--:--</div>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="VelocityWidget.updateTime(-15)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer; font-weight:bold;">-</button>
                            <button onclick="VelocityWidget.updateTime(15)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer; font-weight:bold;">+</button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div id="v-day-display" style="font-size: 13px; color: #FFD700;">Jan 4</div>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="VelocityWidget.updateDay(-1)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer;">-</button>
                            <button onclick="VelocityWidget.updateDay(1)" style="background:#444; color:#fff; border:none; width:24px; height:24px; cursor:pointer;">+</button>
                        </div>
                    </div>
                </div>

                <div style="flex: 1.8; border-right: 1px solid rgba(255,215,0,0.3); padding-right: 10px; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">EST. ARRIVAL:</span><span id="m-arr-time" style="font-size: 18px; color: #00CCFF; font-weight: bold;">--:--</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">TOTAL DIST:</span><span id="m-travel-dist" style="font-size: 18px; color: #fff; font-weight: bold;">0.0 KM</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">MISSION DUR:</span><span id="m-travel-dur" style="font-size: 18px; color: #FFD700; font-weight: bold;">0H 0M</span></div>
                </div>

                <div style="flex: 0.8; text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                    <div style="font-size: 9px; opacity: 0.6;">SPD ADJ</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <button onclick="VelocityWidget.updateSpeed(-5)" style="background:none; color:#FFD700; border:1px solid #FFD700; border-radius:50%; width:22px; height:22px; cursor:pointer;">-</button>
                        <div id="v-speed-off" style="font-size: 20px; color:#fff; font-weight:bold;">+0</div>
                        <button onclick="VelocityWidget.updateSpeed(5)" style="background:none; color:#FFD700; border:1px solid #FFD700; border-radius:50%; width:22px; height:22px; cursor:pointer;">+</button>
                    </div>
                    <div style="font-size: 8px; opacity: 0.5;">KM/H</div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 8px; color: #00FFFF; font-weight: bold; letter-spacing: 1px;">48H TEMPORAL PREDICTIVE MATRIX</span>
                    <span id="active-lead-label" style="font-size: 9px; color: #FFD700; font-weight: bold;">T+0 HRS</span>
                </div>
                <div id="temporal-grid-scrubber" style="display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; height: 16px;"></div>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    /**
     * ADVANCE LEAD TIME
     * Sets specific T+x departure and triggers global redraw
     */
    jumpToLeadTime: function(hours) {
        this.state.currentLeadTime = hours;
        const now = new Date();
        // Shift base departure time to future lead
        this.state.departureTime = new Date(now.getTime() + (hours * 3600000));
        this.render();
    },

    /**
     * WEIGHTED COLOR LOGIC
     * Interpolates between Green and Red based on Jan 4 storm profile
     */
    getWeightedColor: function(leadTime) {
        let risk = 0; 
        if (leadTime <= 8) risk = 1.0; // PURE RED: Extreme Icing period
        else if (leadTime <= 18) risk = 0.5; // ORANGE/YELLOW: Mixed conditions
        else risk = 0.0; // PURE GREEN: Clearing period

        const r = Math.floor(46 + (risk * (231 - 46)));
        const g = Math.floor(204 - (risk * (204 - 76)));
        const b = Math.floor(113 - (risk * (113 - 60)));
        return `rgb(${r}, ${g}, ${b})`;
    },

    render: function() {
        const finalSpeed = this.calculateWeightedSpeed();
        const dist = this.state.routeDistance;
        const travelHours = finalSpeed > 0 ? dist / finalSpeed : 0;
        const h = Math.floor(travelHours);
        const m = Math.round((travelHours - h) * 60);
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        // Update Standard UI
        const updateText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        updateText('m-dep-time', this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-arr-time', arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-travel-dur', `${h}H ${m}M`);
        updateText('m-travel-dist', `${dist.toFixed(1)} KM`);
        updateText('v-speed-off', (this.state.speedAdjustment >= 0 ? "+" : "") + this.state.speedAdjustment);
        updateText('v-day-display', this.state.departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        updateText('active-lead-label', `T+${this.state.currentLeadTime} HRS`);

        // Update Scrubber Grid
        const grid = document.getElementById('temporal-grid-scrubber');
        if (grid) {
            grid.innerHTML = "";
            for (let i = 0; i < 24; i++) {
                const lt = i * 2;
                const isSelected = this.state.currentLeadTime === lt;
                const block = document.createElement('div');
                block.style.cssText = `
                    background: ${this.getWeightedColor(lt)};
                    border: ${isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.05)'};
                    opacity: ${isSelected ? '1' : '0.4'};
                    cursor: pointer; transition: transform 0.1s;
                    ${isSelected ? 'transform: scaleY(1.3);' : ''}
                `;
                block.onclick = () => this.jumpToLeadTime(lt);
                grid.appendChild(block);
            }
        }

        // GLOBAL BRIDGE: Forces re-calculation in other L3 modules
        window.currentCruisingSpeed = finalSpeed;
        window.currentDepartureTime = this.state.departureTime;
        window.currentTemporalOffset = this.state.currentLeadTime; // For Road Analytics sync
        window.currentRouteDistance = dist;

        // Dispatch L3 Sync Event
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: this.state.currentLeadTime } 
        }));
    },

    // ... (rest of original update functions)
    syncNow: function() { this.state.currentLeadTime = 0; this.state.departureTime = new Date(); this.render(); },
    updateDay: function(delta) { this.state.departureTime.setDate(this.state.departureTime.getDate() + delta); this.render(); },
    updateTime: function(mins) { this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000); this.render(); },
    updateSpeed: function(delta) { this.state.speedAdjustment += delta; this.render(); },
    calculateWeightedSpeed: function() {
        const totalKm = this.state.routeDistance;
        let base = 100;
        if (totalKm < 50) base = 50;
        else if (totalKm < 150) base = 80;
        return base + this.state.speedAdjustment;
    },
    startRouteObserver: function() {
        setInterval(() => {
            if (!window.map) return;
            const routeLayer = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5 && l.options.color !== "#FFD700");
            if (routeLayer) {
                const coords = routeLayer.getLatLngs();
                const routeHash = `${coords[0].lat.toFixed(4)}${coords.length}`;
                if (routeHash !== this.state.lastRouteHash) {
                    this.state.lastRouteHash = routeHash;
                    let totalMeters = 0;
                    for (let i = 0; i < coords.length - 1; i++) { totalMeters += coords[i].distanceTo(coords[i+1]); }
                    this.state.routeDistance = totalMeters / 1000;
                    this.render();
                }
            }
        }, 1500);
    }
};

VelocityWidget.init();
