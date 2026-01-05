/** * Project: [weong-bulletin]
 * Logic: L3 Velocity Calculator + Reactive Hazard Matrix
 * Feature: Weighted Average Road Hazard Scale
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0,
        departureTime: new Date(),
        routeDistance: 0,
        lastRouteHash: "",
        currentLeadTime: 0,
        hazardCache: {} // Stores [0.0 - 1.0] scores for each lead time
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
                </div>

                <div style="flex: 1.8; border-right: 1px solid rgba(255,215,0,0.3); padding-right: 10px; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">EST. ARRIVAL:</span><span id="m-arr-time" style="font-size: 18px; color: #00CCFF; font-weight: bold;">--:--</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">TOTAL DIST:</span><span id="m-travel-dist" style="font-size: 18px; color: #fff; font-weight: bold;">0.0 KM</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; opacity: 0.7;">MISSION DUR:</span><span id="m-travel-dur" style="font-size: 18px; color: #FFD700; font-weight: bold;">0H 0M</span></div>
                </div>

                <div style="flex: 0.8; text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                    <div style="font-size: 9px; opacity: 0.6;">SPD ADJ</div>
                    <div id="v-speed-off" style="font-size: 20px; color:#fff; font-weight:bold;">+0</div>
                    <div style="font-size: 8px; opacity: 0.5;">KM/H</div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 8px; color: #00FFFF; font-weight: bold; letter-spacing: 1px;">48H ROAD HAZARD SCALE</span>
                    <span id="active-lead-label" style="font-size: 9px; color: #FFD700; font-weight: bold;">T+0 HRS</span>
                </div>
                <div id="temporal-grid-scrubber" style="display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; height: 16px;"></div>
            </div>
        `;

        document.body.appendChild(widget);
        this.render();
    },

    /**
     * HAZARD CALCULATION ENGINE
     * Accesses Metro-Logic parameters without duplicating the API logic.
     */
    precalculateHazards: async function(routeLayer) {
        const coords = routeLayer.getLatLngs();
        const samples = [0, 0.5, 0.99].map(pct => coords[Math.floor((coords.length - 1) * pct)]);
        
        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            let totalHazard = 0;
            const targetDate = new Date();
            targetDate.setHours(targetDate.getHours() + lt);
            const targetIso = targetDate.toISOString().split(':')[0] + ":00";

            for (const wp of samples) {
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lng}&hourly=temperature_2m,precipitation&timezone=auto&forecast_days=3`);
                    const data = await res.json();
                    const idx = data.hourly.time.indexOf(targetIso);
                    const precip = (idx !== -1) ? data.hourly.precipitation[idx] : 0;
                    const rst = ((idx !== -1) ? data.hourly.temperature_2m[idx] : 0) - 1.2;

                    // Weighted average logic: Precip + Freezing = 1.0 (Red), Precip + Warm = 0.5 (Orange), Dry = 0 (Green)
                    if (precip > 0) {
                        totalHazard += (rst <= 0) ? 1.0 : 0.5;
                    }
                } catch (e) { console.warn("Hazard Precalc failed", e); }
            }
            this.state.hazardCache[lt] = totalHazard / samples.length;
        }
        this.render();
    },

    getWeightedColor: function(leadTime) {
        const risk = this.state.hazardCache[leadTime] || 0;
        
        // Scale: Green (0.0) -> Yellow (0.25) -> Orange (0.5) -> Red (1.0)
        let r, g, b;
        if (risk === 0) { r = 46; g = 204; b = 113; } // Emerald Green
        else if (risk <= 0.3) { r = 255; g = 215; b = 0; } // Yellow
        else if (risk <= 0.6) { r = 255; g = 165; b = 0; } // Orange
        else { r = 231; g = 76; b = 60; } // Alizarin Red
        
        return `rgb(${r}, ${g}, ${b})`;
    },

    jumpToLeadTime: function(hours) {
        this.state.currentLeadTime = hours;
        const now = new Date();
        this.state.departureTime = new Date(now.getTime() + (hours * 3600000));
        
        window.currentTemporalOffset = hours;
        window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: hours } }));
        this.render();
    },

    render: function() {
        const dist = this.state.routeDistance;
        const speed = 100 + this.state.speedAdjustment;
        const travelHours = speed > 0 ? dist / speed : 0;
        const arrivalDate = new Date(this.state.departureTime.getTime() + (travelHours * 3600000));

        const updateText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        updateText('m-dep-time', this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-arr-time', arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateText('m-travel-dur', `${Math.floor(travelHours)}H ${Math.round((travelHours % 1) * 60)}M`);
        updateText('m-travel-dist', `${dist.toFixed(1)} KM`);
        updateText('active-lead-label', `T+${this.state.currentLeadTime} HRS`);

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
                    cursor: pointer; height: 100%; transition: all 0.2s;
                    ${isSelected ? 'transform: scaleY(1.3);' : ''}
                `;
                block.onclick = () => this.jumpToLeadTime(lt);
                grid.appendChild(block);
            }
        }
    },

    startRouteObserver: function() {
        setInterval(() => {
            if (!window.map) return;
            const routeLayer = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (routeLayer) {
                const coords = routeLayer.getLatLngs();
                const routeHash = `${coords[0].lat.toFixed(4)}${coords.length}`;
                if (routeHash !== this.state.lastRouteHash) {
                    this.state.lastRouteHash = routeHash;
                    let totalMeters = 0;
                    for (let i = 0; i < coords.length - 1; i++) { totalMeters += coords[i].distanceTo(coords[i+1]); }
                    this.state.routeDistance = totalMeters / 1000;
                    this.precalculateHazards(routeLayer);
                }
            }
        }, 2000);
    },
    
    syncNow: function() { this.jumpToLeadTime(0); },
    updateTime: function(mins) { this.state.departureTime = new Date(this.state.departureTime.getTime() + mins * 60000); this.render(); }
};

VelocityWidget.init();
