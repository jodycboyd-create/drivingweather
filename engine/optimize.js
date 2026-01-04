/**
 * PROJECT: [weong-route]
 * MODULE: optimize.js | L3 STABILITY PATCH 017
 * Feature: Time-Space Parity Logic (Lead-Time as a "Virtual Pin")
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        this.injectUI();
        this.updateTimeline();
        // Set initial T+0 state
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 30px; right: 30px;
                background: rgba(5, 5, 5, 0.95); border: 1px solid #333;
                border-top: 3px solid #00FFFF; padding: 10px; 
                border-radius: 4px; box-shadow: 0 15px 40px rgba(0,0,0,0.9);
                font-family: 'Roboto Mono', monospace; z-index: 40000;
                width: 420px; pointer-events: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #00FFFF; font-size: 9px; font-weight: 900; letter-spacing: 1.5px;">
                        48H PREDICTIVE HEAT ANALYTICS
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 10px; font-weight: bold; background: rgba(255,215,0,0.1); padding: 2px 6px;">
                        T+0 HRS
                    </span>
                </div>
                <div id="timeline-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(24, 1fr); 
                    gap: 2px; 
                    height: 22px;
                "></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * ADVANCE SYSTEM TIME
     * Acts as a "Temporal Pin Drop"
     */
    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        
        // Update Scrubber UI
        this.updateTimeline();

        /**
         * GLOBAL REFRESH TRIGGER:
         * We update the Departure Time reference so all calculation-heavy 
         * engines think the 'current' time has shifted.
         */
        const baseTime = new Date();
        window.simulatedCurrentTime = new Date(baseTime.getTime() + (hours * 3600000));

        // 1. Force Road Analytics to refresh its API calls for the new offset
        if (window.MetroTable && typeof window.MetroTable.updateTable === 'function') {
            window.MetroTable.updateTable(hours);
        }

        /** * 2. Force Weather Engine Sync
         * Dispatches a custom event that 'weather-engine.js' listens for 
         * to refresh tabular ETA and Map Icons.
         */
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours, simulatedTime: window.simulatedCurrentTime } 
        }));
        
        console.log(`[TEMPORAL-PIN] Shifted to T+${hours}. Updating Newfoundland data...`);
    },

    getWeightedColor(leadTime) {
        // Red (Icing) to Green (Clear) transition
        let risk = 0; 
        if (leadTime <= 8) risk = 1.0; 
        else if (leadTime <= 16) risk = 0.6; 
        else if (leadTime <= 24) risk = 0.3;

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
                border: ${isSelected ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)'};
                cursor: pointer; opacity: ${isSelected ? '1' : '0.5'};
                transition: transform 0.1s;
                ${isSelected ? 'transform: translateY(-2px);' : ''}
            `;
            
            block.onclick = (e) => {
                e.stopPropagation();
                this.setTime(leadTime);
            };

            grid.appendChild(block);
        }
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    }
};

OptimizeEngine.init();/**
 * PROJECT: [weong-route]
 * MODULE: optimize.js | L3 STABILITY PATCH 016
 * Feature: Weighted Heat Ribbon + Global Sync + Bottom-Right Anchor
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        this.injectUI();
        this.updateTimeline();
        // Initial sync to lock in T+0 state across all tables
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        // Positioned bottom-right as requested
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 30px; right: 30px;
                background: rgba(5, 5, 5, 0.95); border: 1px solid #333;
                border-top: 3px solid #00FFFF; padding: 10px; 
                border-radius: 4px; box-shadow: 0 15px 40px rgba(0,0,0,0.9);
                font-family: 'Roboto Mono', monospace; z-index: 40000;
                width: 420px; pointer-events: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #00FFFF; font-size: 9px; font-weight: 900; letter-spacing: 1.5px;">
                        48H PREDICTIVE HEAT ANALYTICS
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 10px; font-weight: bold; background: rgba(255,215,0,0.1); padding: 2px 6px;">
                        T+0 HRS
                    </span>
                </div>
                
                <div id="timeline-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(24, 1fr); 
                    gap: 2px; 
                    height: 22px;
                "></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * WEIGHTED COLOR LOGIC
     * Pure Red = 100% ICE/PACKED | Pure Green = 100% DRY/CLEAR
     * Interpolates through Orange/Yellow for mixed conditions
     */
    getWeightedColor(leadTime) {
        // Simulated route analysis: Early Jan 4 hours are dominated by icing
        // 1.0 = Danger (Red), 0.0 = Safe (Green)
        let riskFactor = 0; 
        
        if (leadTime <= 8) riskFactor = 1.0; // Pure Red: System-wide icing
        else if (leadTime <= 16) riskFactor = 0.6; // Orange: Mixed Slush/Ice
        else if (leadTime <= 24) riskFactor = 0.3; // Yellow: Cautionary clearing
        else riskFactor = 0.0; // Pure Green: Clear conditions

        // RGB Interpolation (Green: 46, 204, 113 to Red: 231, 76, 60)
        const r = Math.floor(46 + (riskFactor * (231 - 46)));
        const g = Math.floor(204 - (riskFactor * (204 - 76)));
        const b = Math.floor(113 - (riskFactor * (113 - 60)));
        
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
                border: ${isSelected ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)'};
                cursor: pointer; opacity: ${isSelected ? '1' : '0.5'};
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                ${isSelected ? 'transform: translateY(-2px);' : ''}
            `;
            
            // Interaction: Direct logic injection for Lead Time advancement
            block.onclick = (e) => {
                e.stopPropagation();
                this.setTime(leadTime);
            };

            grid.appendChild(block);
        }
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    /**
     * FORCED GLOBAL SYNCHRONIZATION
     * Updates: Road Analytics, Weather Matrix, and Map Icons
     */
    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        this.updateTimeline();

        // 1. Update Road Analytics (MetroTable)
        if (window.MetroTable && typeof window.MetroTable.updateTable === 'function') {
            window.MetroTable.updateTable(hours);
        }

        // 2. Dispatch event for WeatherEngine (Matrix & Map Pins)
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours } 
        }));
        
        console.log(`[CORE] Temporal State Advanced: T+${hours} | Broad-spectrum sync active.`);
    }
};

OptimizeEngine.init();
