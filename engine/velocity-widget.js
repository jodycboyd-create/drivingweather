/** * Project: [weong-bulletin]
 * Version: L3_STABLE_EXPANDED
 * Logic: Restoring global weather matrix & sky icon synchronization
 */

const VelocityWidget = {
    state: {
        departureTime: new Date(),
        currentLeadTime: 0,
        // Jan 4 Storm Profile
        hazardCache: { 
            0: 1.0, 2: 1.0, 4: 1.0, 6: 1.0, 8: 1.0, 
            10: 0.6, 12: 0.5, 14: 0.5, 16: 0.3, 18: 0.2, 
            20: 0.0, 22: 0.0, 24: 0.0, 26: 0.0, 28: 0.0,
            30: 0.0, 32: 0.0, 34: 0.0, 36: 0.0 // T+34 is Green/Clear
        } 
    },

    init: function() {
        this.createUI();
        this.render();
        // Initial broadcast to ensure icons load at T+0
        this.broadcastUpdate(0);
    },

    // UI generation stable
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
        widget.innerHTML = `
            <div style="display: flex; gap: 14px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 10px;">
                <div style="flex: 1.3; border-right: 1px solid #333; padding-right: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 9px; color: #FFD700;">DEPARTURE</span>
                        <button onclick="VelocityWidget.broadcastUpdate(0)" style="background:#FFD700; color:#000; border:none; border-radius:2px; font-size:8px; cursor:pointer;">NOW</button>
                    </div>
                    <div id="m-dep-time" style="font-size: 26px; color: #fff; font-weight: bold;">--:--</div>
                </div>
                <div style="flex: 1.8; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">EST. ARRIVAL:</span><span style="font-size: 18px; color: #00FFFF; font-weight: bold;">04:06 AM</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">MISSION DUR:</span><span style="font-size: 18px; color: #FFD700; font-weight: bold;">6H 53M</span></div>
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
    },

    broadcastUpdate: function(lt) {
        this.state.currentLeadTime = lt;
        // The Global Event Tunnel
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: lt } 
        }));
        this.render();
    },

    getWeightedColor: function(leadTime) {
        const risk = this.state.hazardCache[leadTime] ?? 0;
        if (risk >= 0.8) return "#FF0000"; // NEON RED
        if (risk >= 0.5) return "#FF9900"; // NEON ORANGE
        if (risk >= 0.2) return "#FFFF00"; // NEON YELLOW
        return "#00FF41";                  // NEON GREEN
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
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                cursor: pointer; height: 100%; transition: transform 0.1s;
                ${isSelected ? 'transform: scaleY(1.4); z-index: 10;' : 'opacity: 0.8;'}
            `;
            block.onclick = () => this.broadcastUpdate(lt);
            grid.appendChild(block);
        }
        document.getElementById('m-dep-time').innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('active-lead-label').innerText = `T+${this.state.currentLeadTime} HRS`;
    }
};

/**
 * GLOBAL WEATHER SYNC LISTENER
 * Re-linking Matrix Icons and Data
 */
window.addEventListener('weong:update', function(e) {
    if (!e.detail || typeof e.detail.offset === 'undefined') return;
    const offset = e.detail.offset;

    // 1. RE-SYNC WEATHER MATRIX DATA & ICONS
    // This ensures that sky icons change when T+ is selected
    if (typeof updateMissionMatrix === 'function') {
        updateMissionMatrix(offset);
    }

    // 2. RE-SYNC ROAD ANALYTICS (Already Working)
    if (typeof MetroTable !== 'undefined' && MetroTable.syncWithRoute) {
        MetroTable.syncWithRoute(offset);
    }
    
    // 3. SYNC VALID TIME LABELS
    const validTimeLabel = document.getElementById('metro-valid-time');
    if (validTimeLabel) {
        const d = new Date();
        d.setHours(d.getHours() + offset);
        validTimeLabel.innerText = `[VALID: ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]`;
    }
});

VelocityWidget.init();
