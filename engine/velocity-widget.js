/** * Project: [weong-bulletin]
 * Logic: Black Default for No-Data + Table Population Fix
 */

const VelocityWidget = {
    state: {
        speedAdjustment: 0,
        departureTime: new Date(),
        routeDistance: 0,
        currentLeadTime: 0,
        hazardCache: {} 
    },

    init: function() {
        this.createUI();
        this.startRouteObserver();
    },

    createUI: function() {
        if (document.getElementById('velocity-widget-container')) return;
        const widget = document.createElement('div');
        widget.id = 'velocity-widget-container';
        widget.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: rgba(5, 5, 5, 0.98); border: 1px solid #FFD700;
            border-top: 3px solid #00FFFF; padding: 12px; font-family: monospace;
            width: 500px; display: flex; flex-direction: column; gap: 10px;
        `;
        // ... (UI HTML same as previous build, using Neon Palette)
        document.body.appendChild(widget);
        this.render();
    },

    getWeightedColor: function(leadTime) {
        const risk = this.state.hazardCache[leadTime];
        
        // NO-DATA DEFAULT: Black
        if (risk === undefined || isNaN(risk)) return "#000000"; 
        
        if (risk === 0) return "#00FF41"; // Neon Green
        if (risk <= 0.3) return "#FFFF00"; // Neon Yellow
        if (risk <= 0.6) return "#FF9900"; // Neon Orange
        return "#FF0000"; // Neon Red
    },

    render: function() {
        const grid = document.getElementById('temporal-grid-scrubber');
        if (!grid) return;
        grid.innerHTML = "";
        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            const isSelected = this.state.currentLeadTime === lt;
            const block = document.createElement('div');
            block.style.cssText = `
                background: ${this.getWeightedColor(lt)};
                border: ${isSelected ? '2px solid #fff' : '1px solid #222'};
                opacity: 1; cursor: pointer; height: 100%; transition: transform 0.1s;
                ${isSelected ? 'transform: scaleY(1.3); z-index: 10;' : ''}
            `;
            block.onclick = () => {
                this.state.currentLeadTime = lt;
                window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: lt } }));
                this.render();
            };
            grid.appendChild(block);
        }
        if(document.getElementById('active-lead-label')) {
            document.getElementById('active-lead-label').innerText = `T+${this.state.currentLeadTime} HRS`;
        }
    },

    startRouteObserver: function() {
        setInterval(() => {
            if (!window.map) return;
            // Improved Route Detection Logic
            const routeLayer = Object.values(window.map._layers).find(l => 
                l._latlngs && l._latlngs.length > 5 && l.options.color !== "#FFD700"
            );
            if (routeLayer) {
                const coords = routeLayer.getLatLngs();
                this.precalculateHazards(routeLayer);
            }
        }, 3000);
    }
};

const MetroTable = {
    containerId: "metro-surface-intelligence",
    init() {
        this.injectUI();
        window.addEventListener('weong:update', (e) => this.syncWithRoute(e.detail.offset));
        // Force an initial sync to populate the "blank" table
        setTimeout(() => this.syncWithRoute(0), 1500);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        const matrix = document.getElementById('matrix-ui');
        if (!matrix) return;

        matrix.insertAdjacentHTML('afterend', `
            <div id="${this.containerId}" style="
                margin-top: 20px; background: rgba(5, 5, 5, 0.95); 
                border: 1px solid #333; border-left: 3px solid #00FFFF;
                padding: 12px; width: 500px; font-family: monospace;
                pointer-events: auto; position: relative;
            ">
                <div style="color:#00FFFF; font-size:11px; font-weight:900; margin-bottom:8px;">
                    ROAD ANALYTICS <span id="metro-valid-time" style="color:#666; font-size:9px;">[READY]</span>
                </div>
                <table style="width:100%; color:#fff; font-size:10px; text-align:left;">
                    <thead style="color:#666; font-size:8px;">
                        <tr><th>COMMUNITY</th><th>RST</th><th>Δ AIR</th><th>CONDITION</th></tr>
                    </thead>
                    <tbody id="metro-body">
                        <tr><td colspan="4" style="color:#444; text-align:center; padding:10px;">AWAITING ROUTE DATA...</td></tr>
                    </tbody>
                </table>
            </div>
        `);
    },

    async syncWithRoute(offset) {
        if (!window.map) return;
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
        if (!route) return;
        
        // Re-trigger the rendering logic to fill the blank body
        this.renderRows(this.sampleWaypoints(route), offset);
    }
};

VelocityWidget.init();
MetroTable.init();
