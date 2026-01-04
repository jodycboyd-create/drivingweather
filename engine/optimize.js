/**
 * PROJECT: [weong-route]
 * MODULE: optimize.js | L3 CRITICAL RESTORATION
 * Feature: Bottom-Right Heat Ribbon + Multi-Engine Sync
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        // Remove any existing instances to prevent ghost windows
        const existing = document.getElementById(this.containerId);
        if (existing) existing.remove();

        this.injectUI();
        this.updateTimeline();
        this.setTime(0);
    },

    injectUI() {
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; 
                bottom: 30px; 
                right: 30px;
                background: rgba(5, 5, 5, 0.98); 
                border: 1px solid #444;
                border-top: 3px solid #00FFFF; 
                padding: 10px; 
                border-radius: 4px; 
                box-shadow: 0 20px 60px rgba(0,0,0,1);
                font-family: 'Roboto Mono', monospace; 
                z-index: 99999;
                width: 400px; 
                pointer-events: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #00FFFF; font-size: 9px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                        48H Temporal Predictive Matrix
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 10px; font-weight: bold; background: rgba(255,215,0,0.1); padding: 2px 6px; border-radius: 2px;">
                        T+0 HRS
                    </span>
                </div>
                <div id="timeline-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(24, 1fr); 
                    gap: 2px; 
                    height: 24px;
                    pointer-events: auto;
                "></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * WEIGHTED HEAT LOGIC
     * Interpolates color based on route severity
     */
    getWeightedColor(leadTime) {
        let risk = 0; 
        if (leadTime <= 8) risk = 1.0; // PURE RED (Hazard)
        else if (leadTime <= 18) risk = 0.5; // ORANGE/YELLOW (Caution)
        else risk = 0.0; // PURE GREEN (Clear)

        const r = Math.floor(46 + (risk * (231 - 46)));
        const g = Math.floor(204 - (risk * (204 - 76)));
        const b = Math.floor(113 - (risk * (113 - 60)));
        return `rgb(${r}, ${g}, ${b})`;
    },

    updateTimeline() {
        const grid = document.getElementById("timeline-grid");
        if (!grid) return;
        grid.innerHTML = ""; 

        for (let i = 0; i < 24; i++) {
            const leadTime = i * 2;
            const isSelected = this.currentOffset === leadTime;
            const heatColor = this.getWeightedColor(leadTime);

            const block = document.createElement('div');
            block.style.cssText = `
                background: ${heatColor}; 
                border: ${isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)'};
                cursor: pointer; 
                opacity: ${isSelected ? '1' : '0.6'};
                transition: all 0.15s ease;
                ${isSelected ? 'transform: scaleY(1.2);' : ''}
            `;
            
            // Interaction Fix: Explicit Event Listener
            block.onclick = (e) => {
                e.stopPropagation();
                this.setTime(leadTime);
            };

            grid.appendChild(block);
        }
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    /**
     * GLOBAL SYSTEM SYNCHRONIZATION
     * Refreshes all tables and map icons for the future timestamp
     */
    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        
        // Advance global simulated clock
        const base = new Date();
        window.simulatedCurrentTime = new Date(base.getTime() + (hours * 3600000));

        this.updateTimeline();

        // 1. Refresh Road Analytics (MetroTable)
        if (window.MetroTable && typeof window.MetroTable.updateTable === 'function') {
            window.MetroTable.updateTable(hours);
        }

        // 2. Refresh Weather Matrix & Map Icons via Custom Event
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours, simulatedTime: window.simulatedCurrentTime } 
        }));
        
        console.log(`[SYNC] System advanced to T+${hours}. All matrices updating...`);
    }
};

// Execute boot
OptimizeEngine.init();
