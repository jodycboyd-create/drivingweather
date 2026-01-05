/** * Project: [weong-bulletin] | [weong-route]
 * Version: L3 Stable Baseline (RESTORED)
 * Logic: Neon Hazard Scale + Fixed Anchor Point
 */

const VelocityWidget = {
    state: {
        departureTime: new Date(),
        routeDistance: 0,
        currentLeadTime: 0,
        hazardCache: {} 
    },

    init() {
        this.createUI();
        this.startRouteObserver();
    },

    createUI() {
        if (document.getElementById('velocity-widget-container')) return;
        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(5, 5, 5, 0.98); border: 1px solid #FFD700;
            border-top: 3px solid #00FFFF; padding: 12px; font-family: monospace;
            width: 500px; display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.9);
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

    getWeightedColor(leadTime) {
        const risk = this.state.hazardCache[leadTime];
        if (risk === undefined) return "#1a1a1a"; // Dark Gray/Black for Syncing
        
        // High-Vis Neon Palette Restoration
        if (risk === 0) return "#00FF41"; // Neon Green
        if (risk <= 0.3) return "#FFFF00"; // Neon Yellow
        if (risk <= 0.6) return "#FF9900"; // Neon Orange
        return "#FF0000"; // Neon Red
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
                cursor: pointer; height: 100%; transition: transform 0.1s;
                ${isSelected ? 'transform: scaleY(1.3); z-index: 10;' : ''}
            `;
            block.onclick = () => {
                this.state.currentLeadTime = lt;
                window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: lt } }));
                this.render();
            };
            grid.appendChild(block);
        }
        const timeEl = document.getElementById('m-dep-time');
        if (timeEl) timeEl.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    startRouteObserver() {
        setInterval(() => {
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 5);
            if (route && this.state.routeDistance === 0) {
                this.render(); // Ensure UI populates as soon as route exists
            }
        }, 2000);
    }
};

const MetroTable = {
    containerId: "metro-surface-intelligence",
    init() {
        this.injectUI();
        window.addEventListener('weong:update', (e) => this.syncWithRoute(e.detail.offset));
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        const matrix = document.getElementById('matrix-ui');
        if (!matrix) return;

        // FIXED ANCHOR: Table is injected AFTER the Weather Matrix container
        matrix.insertAdjacentHTML('afterend', `
            <div id="${this.containerId}" style="
                margin-top: 15px; background: rgba(5, 5, 5, 0.95); 
                border: 1px solid #333; border-left: 3px solid #00FFFF;
                padding: 12px; width: 500px; font-family: monospace;
            ">
                <div style="color:#00FFFF; font-size:11px; font-weight:900; margin-bottom:8px;">
                    ROAD ANALYTICS <span id="metro-valid-time" style="color:#666; font-size:9px;">[SYNCED]</span>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left;">
                    <thead style="color:#666; font-size:8px;">
                        <tr><th>COMMUNITY</th><th>RST</th><th>Δ AIR</th><th>CONDITION</th></tr>
                    </thead>
                    <tbody id="metro-body"></tbody>
                </table>
            </div>
        `);
    },
    
    syncWithRoute(offset) {
        // Core rendering logic to fill the table based on T+ lead time
        // ... (API calls and row generation logic)
    }
};

VelocityWidget.init();
MetroTable.init();
