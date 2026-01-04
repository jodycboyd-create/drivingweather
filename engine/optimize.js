/**
 * PROJECT: [weong-route]
 * MODULE: optimize.js | L3 STABILITY PATCH 014
 * Feature: 48H Single-Row Matrix + Hit-Box Fix
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        this.injectUI();
        this.makeMovable();
        this.updateTimeline();
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
                background: rgba(10, 10, 10, 0.98); border: 1px solid #333;
                border-top: 3px solid #00FFFF; padding: 0; 
                border-radius: 4px; box-shadow: 0 15px 50px rgba(0,0,0,0.9);
                font-family: 'Roboto Mono', monospace; z-index: 25000;
                width: 920px; pointer-events: auto;
            ">
                <div id="temp-drag-handle" style="
                    cursor: grab; padding: 10px 15px; 
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(20,20,20,0.5);
                ">
                    <span style="color: #00FFFF; font-size: 10px; font-weight: 900; letter-spacing: 2px;">
                        48H TEMPORAL PREDICTIVE MATRIX
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 11px; font-weight: bold; background: rgba(255,215,0,0.1); padding: 2px 8px; border-radius: 3px;">
                        T+0 HRS
                    </span>
                </div>
                
                <div style="padding: 0 15px 15px 15px;">
                    <div id="timeline-grid" style="
                        display: grid; 
                        grid-template-columns: repeat(24, 1fr); 
                        gap: 4px; 
                        pointer-events: auto;
                    "></div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    updateTimeline() {
        const grid = document.getElementById("timeline-grid");
        if (!grid) return;

        let boxes = "";
        for (let i = 0; i < 24; i++) {
            const leadTime = i * 2;
            const isSelected = this.currentOffset === leadTime;
            
            // Replicating the Jan 4 Storm Profile color scale
            let heatColor = "#1B4332"; // Dark Green (Clear)
            if (leadTime <= 8) heatColor = "#78291c"; // Dark Red (Icing/Hazard)
            else if (leadTime <= 18) heatColor = "#7a6211"; // Mustard (Caution)

            if (isSelected) heatColor = (leadTime <= 8) ? "#e74c3c" : (leadTime <= 18) ? "#f1c40f" : "#2ecc71";

            boxes += `
                <div onclick="OptimizeEngine.setTime(${leadTime})" style="
                    height: 35px; background: ${heatColor}; 
                    border: ${isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.05)'};
                    opacity: ${isSelected ? '1' : '0.6'};
                    cursor: pointer; display: flex; align-items: center; 
                    justify-content: center; font-size: 10px; font-weight: 900;
                    color: ${isSelected ? '#000' : '#fff'}; transition: all 0.1s;
                    pointer-events: auto;
                ">
                    ${leadTime}
                </div>`;
        }
        grid.innerHTML = boxes;
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        this.updateTimeline();

        // Broadcast to Road Analytics and Weather Matrix
        if (window.MetroTable) window.MetroTable.updateTable(hours);
        window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: hours } }));
    },

    makeMovable() {
        const el = document.getElementById(this.containerId);
        const handle = document.getElementById("temp-drag-handle");
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        
        handle.onmousedown = (e) => {
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + "px";
                el.style.left = (el.offsetLeft - p1 + (el.offsetWidth/2)) + "px";
                el.style.bottom = "auto";
                el.style.transform = "translateX(-50%)";
            };
        };
    }
};

OptimizeEngine.init();
