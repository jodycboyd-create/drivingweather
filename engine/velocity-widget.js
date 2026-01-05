/** * Project: [weong-bulletin]
 * Logic: T+ Lead Time Hazard Calculation
 * Feature: Weighted Green-Yellow-Orange-Red Scale
 */

const VelocityWidget = {
    state: {
        departureTime: new Date(),
        routeDistance: 0,
        currentLeadTime: 0,
        hazardCache: {} // [0.0 - 1.0] intensity scores
    },

    init() {
        this.createUI();
        this.startRouteObserver();
    },

    // UI generation same as baseline
    createUI() {
        if (document.getElementById('velocity-widget-container')) return;
        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(10, 10, 10, 0.98); border: 1px solid #FFD700;
            border-top: 3px solid #00FFFF; padding: 12px; font-family: monospace;
            width: 500px; display: flex; flex-direction: column; gap: 10px;
        `;

        widget.innerHTML = `
            <div style="display: flex; gap: 14px; align-items: stretch; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 10px;">
                <div style="flex: 1.3; border-right: 1px solid #333; padding-right: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-size: 9px; color: #FFD700;">DEPARTURE</span>
                        <button onclick="VelocityWidget.syncNow()" style="background:#FFD700; color:#000; border:none; border-radius:2px; font-size:8px; font-weight:bold; cursor:pointer; padding: 2px 5px;">NOW</button>
                    </div>
                    <div id="m-dep-time" style="font-size: 26px; color: #fff; font-weight: bold;">--:--</div>
                </div>
                <div style="flex: 1.8; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">EST. ARRIVAL:</span><span id="m-arr-time" style="font-size: 18px; color: #00FFFF; font-weight: bold;">--:--</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">MISSION DUR:</span><span id="m-travel-dur" style="font-size: 18px; color: #FFD700; font-weight: bold;">0H 0M</span></div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 8px; color: #00FFFF; font-weight: bold;">ROAD HAZARD SCALE</span>
                    <span id="active-lead-label" style="font-size: 9px; color: #FFD700;">T+0 HRS</span>
                </div>
                <div id="temporal-grid-scrubber" style="display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; height: 18px;"></div>
            </div>
        `;
        document.body.appendChild(widget);
        this.render();
    },

    /**
     * HAZARD CALCULATION REINSTATED
     * Calculates risk intensity for each T+ box
     */
    async calculateRiskProfile(routeLayer) {
        const coords = routeLayer.getLatLngs();
        // Sample Start, Mid, and End of route
        const samples = [0, 0.5, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);

        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            let combinedRisk = 0;
            const targetDate = new Date();
            targetDate.setHours(targetDate.getHours() + lt);
            const targetIso = targetDate.toISOString().split(':')[0] + ":00";

            for (const wp of samples) {
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lng}&hourly=temperature_2m,precipitation&timezone=auto&forecast_days=3`);
                    const data = await res.json();
                    const idx = data.hourly.time.indexOf(targetIso);
                    const precip = idx !== -1 ? data.hourly.precipitation[idx] : 0;
                    const rst = (idx !== -1 ? data.hourly.temperature_2m[idx] : 0) - 1.2;

                    // Condition weighting: ICE = 1.0, WET = 0.5, DRY = 0.0
                    if (precip > 0) {
                        combinedRisk += (rst <= 0) ? 1.0 : 0.5;
                    }
                } catch (e) { console.warn("Cache sync failed for T+" + lt); }
            }
            this.state.hazardCache[lt] = combinedRisk / samples.length;
        }
        this.render();
    },

    getWeightedColor(leadTime) {
        const risk = this.state.hazardCache[leadTime];
        if (risk === undefined) return "#111"; // No Data Black

        // REINSTATED COLOR SCALE
        if (risk === 0) return "#00FF41";     // NEON GREEN (Dry/Clear)
        if (risk <= 0.3) return "#FFFF00";   // NEON YELLOW (Trace Precip)
        if (risk <= 0.6) return "#FF9900";   // NEON ORANGE (Wet/Slush)
        return "#FF0000";                    // NEON RED (Ice/Packed)
    },

    render() {
        const grid = document.getElementById('temporal-grid-scrubber');
        if (!grid) return;
        grid.innerHTML = "";
        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            const isSelected = this.state.currentLeadTime === lt;
            const block = document.createElement('div');
            block.style.cssText = `
                background: ${this.getWeightedColor(lt)};
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                cursor: pointer; height: 100%; transition: all 0.1s;
                ${isSelected ? 'transform: scaleY(1.3); z-index: 10;' : ''}
            `;
            block.onclick = () => {
                this.state.currentLeadTime = lt;
                window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: lt } }));
                this.render();
            };
            grid.appendChild(block);
        }
        
        const depTime = document.getElementById('m-dep-time');
        if (depTime) depTime.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const label = document.getElementById('active-lead-label');
        if (label) label.innerText = `T+${this.state.currentLeadTime} HRS`;
    },

    startRouteObserver() {
        setInterval(() => {
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 5);
            if (route) {
                const routeHash = `${route.getLatLngs()[0].lat}${route.getLatLngs().length}`;
                if (routeHash !== this.state.lastHash) {
                    this.state.lastHash = routeHash;
                    this.calculateRiskProfile(route);
                }
            }
        }, 3000);
    },
    
    syncNow() {
        this.state.departureTime = new Date();
        this.render();
    }
};

VelocityWidget.init();
