/** * Project: [weong-bulletin]
 * Version: L3_EXPANDED_RECOVERY_015
 * Status: Full Object Structure (Non-Condensed)
 * Fix: Hazard Scale Sync + Condition Alignment
 */

const VelocityWidget = {
    state: {
        startTime: new Date(),
        currentOffset: 0,
        // Jan 4-5 Storm Data: Alignment with ICE / PACKED
        // 1.0 = RED (Ice/Packed), 0.6 = ORANGE (Slush), 0.0 = GREEN (Clear)
        hazardProfile: [
            1.0, 1.0, 1.0, 1.0, 1.0, // T+0 to T+8: RED
            1.0, 1.0, 1.0, 0.6, 0.6, // T+10 to T+18: RED to ORANGE Transition
            0.6, 0.6, 0.5, 0.4, 0.3, // T+20 to T+28: ORANGE (Slush/Wet)
            0.2, 0.1, 0.0, 0.0, 0.0, // T+30 to T+38: YELLOW to GREEN
            0.0, 0.0, 0.0, 0.0        // T+40+ : GREEN (Dry/Clear)
        ]
    },

    init: function() {
        console.log("[RWIS] Velocity Widget Initializing...");
        this.createUI();
        this.render();
        // Initial sync to set T+0 icons
        this.sync(0);
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
            box-shadow: 0 15px 50px rgba(0,0,0,0.9);
        `;

        widget.innerHTML = `
            <div style="display: flex; gap: 14px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 10px;">
                <div style="flex: 1.3; border-right: 1px solid #333; padding-right: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 9px; color: #FFD700;">DEPARTURE</span>
                        <button onclick="VelocityWidget.sync(0)" style="background:#FFD700; color:#000; border:none; padding:2px 5px; font-size:8px; cursor:pointer; font-weight:bold;">NOW</button>
                    </div>
                    <div id="v-dep-time" style="font-size: 26px; color: #fff; font-weight: bold;">--:--</div>
                </div>
                <div style="flex: 1.8; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">EST. ARRIVAL:</span><span style="font-size: 18px; color: #00FFFF; font-weight: bold;">04:06 AM</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="font-size: 10px; color:#666;">MISSION DUR:</span><span style="font-size: 18px; color: #FFD700; font-weight: bold;">6H 53M</span></div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 8px; color: #00FFFF; font-weight: bold;">ROAD HAZARD SCALE</span>
                    <span id="v-lead-label" style="font-size: 9px; color: #FFD700;">T+0 HRS</span>
                </div>
                <div id="v-hazard-grid" style="display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; height: 18px;"></div>
            </div>
        `;
        document.body.appendChild(widget);
    },

    sync: function(lt) {
        this.state.currentOffset = lt;
        
        // 1. GLOBAL TIME SYNC: Used by WeatherEngine for Icon Switching
        const newTime = new Date(this.state.startTime.getTime());
        newTime.setHours(newTime.getHours() + lt);
        window.currentDepartureTime = newTime;

        // 2. DISPATCH UPDATE: Used by Metro-Logic for Road Condition Sync
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: lt } 
        }));

        this.render();
    },

    getWeightedColor: function(risk) {
        // Alignment: Forces RED for ICE/PACKED conditions
        if (risk >= 0.8) return "#FF0000"; // NEON RED
        if (risk >= 0.5) return "#FF9900"; // NEON ORANGE
        if (risk >= 0.2) return "#FFFF00"; // NEON YELLOW
        return "#00FF41";                  // NEON GREEN
    },

    render: function() {
        const grid = document.getElementById('v-hazard-grid');
        if (!grid) return;
        grid.innerHTML = "";
        
        this.state.hazardProfile.forEach((risk, i) => {
            const lt = i * 2;
            const isSelected = this.state.currentOffset === lt;
            const block = document.createElement('div');
            
            block.style.cssText = `
                background: ${this.getWeightedColor(risk)}; cursor: pointer; height: 100%;
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                ${isSelected ? 'transform: scaleY(1.4); z-index: 10;' : 'opacity: 0.7;'}
                transition: transform 0.1s ease;
            `;
            block.onclick = () => this.sync(lt);
            grid.appendChild(block);
        });

        const depEl = document.getElementById('v-dep-time');
        if (depEl) depEl.innerText = window.currentDepartureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const labelEl = document.getElementById('v-lead-label');
        if (labelEl) labelEl.innerText = `T+${this.state.currentOffset} HRS`;
    }
};

VelocityWidget.init();
