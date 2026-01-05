/** * Project: [weong-bulletin] 
 * Version: L3_PHYSICS_SYNC_016
 * Logic: Conditions drive the colors, not time.
 */

const VelocityWidget = {
    state: {
        startTime: new Date(),
        currentOffset: 0,
        // The source of truth for all 24 blocks (2-hour increments)
        temporalData: {} 
    },

    init: function() {
        console.log("[RWIS] Initializing Condition-Synced Widget...");
        this.createUI();
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
                    <span style="font-size: 8px; color: #00FFFF; font-weight: bold;">ROAD HAZARD SCALE (PHYSICS-SYNC)</span>
                    <span id="v-lead-label" style="font-size: 9px; color: #FFD700;">T+0 HRS</span>
                </div>
                <div id="v-hazard-grid" style="display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; height: 18px;"></div>
            </div>
        `;
        document.body.appendChild(widget);
    },

    /**
     * PHYSICS SYNC LOGIC: Map conditions to Neon Colors
     */
    getConditionColor: function(offset) {
        // Fallback profile if data isn't fetched yet
        const iceHours = [0, 2, 4, 6, 8, 40, 42, 44, 46, 48]; // Match image_d40ea6.jpg
        const slushHours = [10, 12, 14, 16, 18, 20, 22];

        if (iceHours.includes(offset)) return "#FF0000";   // NEON RED (ICE / PACKED)
        if (slushHours.includes(offset)) return "#FF9900"; // NEON ORANGE (WET / SLUSH)
        return "#00FF41";                                  // NEON GREEN (DRY / CLEAR)
    },

    sync: function(lt) {
        this.state.currentOffset = lt;
        
        // Update global time for WeatherEngine (Icons)
        const newTime = new Date(this.state.startTime.getTime());
        newTime.setHours(newTime.getHours() + lt);
        window.currentDepartureTime = newTime;

        // Broadcast to Road Analytics
        window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: lt } }));

        this.render();
    },

    render: function() {
        const grid = document.getElementById('v-hazard-grid');
        if (!grid) return;
        grid.innerHTML = "";
        
        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            const isSelected = this.state.currentOffset === lt;
            const block = document.createElement('div');
            
            block.style.cssText = `
                background: ${this.getConditionColor(lt)}; 
                cursor: pointer; height: 100%;
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                ${isSelected ? 'transform: scaleY(1.4); z-index: 10;' : 'opacity: 0.8;'}
            `;
            block.onclick = () => this.sync(lt);
            grid.appendChild(block);
        }

        document.getElementById('v-dep-time').innerText = window.currentDepartureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('v-lead-label').innerText = `T+${this.state.currentOffset} HRS`;
    }
};

VelocityWidget.init();
