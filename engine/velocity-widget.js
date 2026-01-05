/** * Project: [weong-bulletin] 
 * Version: L3_ANCHOR_FINAL
 * Strategy: Passive Sync - Updates globals without breaking sister modules.
 */

const VelocityWidget = {
    state: {
        startTime: new Date(), // Locked session start
        currentOffset: 0,
        // Jan 4 Storm Profile Fallback
        hazardProfile: [1,1,1,1,1,0.6,0.5,0.5,0.3,0.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },

    init: function() {
        console.log("[RWIS] Initializing Velocity Widget (Passive Mode)...");
        this.createUI();
        this.render();
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
                        <button onclick="VelocityWidget.sync(0)" style="background:#FFD700; color:#000; border:none; padding:2px 5px; font-size:8px; cursor:pointer;">NOW</button>
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
        
        // 1. UPDATE GLOBAL DATE
        // WeatherEngine's interval will pick this up automatically.
        const newTime = new Date(this.state.startTime.getTime());
        newTime.setHours(newTime.getHours() + lt);
        window.currentDepartureTime = newTime;

        // 2. ALERT ROAD ANALYTICS
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: lt } 
        }));

        this.render();
    },

    render: function() {
        const grid = document.getElementById('v-hazard-grid');
        if (!grid) return;
        grid.innerHTML = "";
        
        this.state.hazardProfile.forEach((risk, i) => {
            const lt = i * 2;
            const isSelected = this.state.currentOffset === lt;
            const block = document.createElement('div');
            
            // Neon Logic
            let color = "#00FF41"; // Green
            if (risk >= 0.8) color = "#FF0000"; // Red
            else if (risk >= 0.5) color = "#FF9900"; // Orange
            else if (risk >= 0.2) color = "#FFFF00"; // Yellow

            block.style.cssText = `
                background: ${color}; cursor: pointer; height: 100%;
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                ${isSelected ? 'transform: scaleY(1.4); z-index: 10;' : 'opacity: 0.7;'}
            `;
            block.onclick = () => this.sync(lt);
            grid.appendChild(block);
        });

        document.getElementById('v-dep-time').innerText = window.currentDepartureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('v-lead-label').innerText = `T+${this.state.currentOffset} HRS`;
    }
};

// Initialize
VelocityWidget.init();
