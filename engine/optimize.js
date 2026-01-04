/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.4.0 - Movable HUD Logic
 * STATUS: System Restoration - Waypoint Linked
 */

const OptimizeEngine = {
    init: function() {
        console.log("[SYSTEM] Optimize Engine: Movable HUD Active.");
        this.makeMovable(document.getElementById("road-analytics-table")); // Ensure this ID matches your container
        this.sync();

        window.addEventListener('weong:update', () => this.sync());
        window.addEventListener('clock:update', () => this.sync());
    },

    /**
     * WINDOW DRAG LOGIC
     * Allows the user to reposition the Analytics window without breaking the sync.
     */
    makeMovable: function(elmnt) {
        if (!elmnt) return;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = elmnt.querySelector(".window-header") || elmnt; // Drag by header or whole box

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            elmnt.style.bottom = "auto"; // Kill bottom anchor once moved
            elmnt.style.right = "auto";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    sync: function() {
        const markers = window.hubMarkers || [];
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const container = document.querySelector("#road-analytics-table");

        if (!tableBody || markers.length === 0) return;

        // DATA SYNC: Mirroring Jan 4 6:00 PM RST state
        tableBody.innerHTML = markers.map((marker, i) => {
            const label = marker.options.label || marker.label || `Hub ${i + 1}`;
            const isCB = label.toLowerCase().includes("corner brook");
            const rst = isCB ? "-10.9°C" : (-6.0 - (i * 1.5)).toFixed(1) + "°C";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${label}</td>
                    <td>${rst}</td>
                    <td style="color: #888;">-1.2</td>
                    <td class="status-stable" style="color: #00ff00;">DRY / CLEAR</td>
                </tr>`;
        }).join('');

        this.injectThermalRibbon(container);
    },

    injectThermalRibbon: function(parent) {
        const oldRibbon = document.getElementById("thermal-hud-ribbon");
        if (oldRibbon) oldRibbon.remove();

        const ribbon = document.createElement("div");
        ribbon.id = "thermal-hud-ribbon";
        ribbon.style = "display: flex; gap: 2px; height: 20px; margin-top: 10px; border-top: 1px solid #333; padding-top: 5px;";
        
        const steps = ["+2H", "+4H", "+6H", "+8H", "+10H"];
        ribbon.innerHTML = steps.map((step, i) => {
            const color = (i < 2) ? "rgba(255, 0, 0, 0.6)" : "rgba(0, 255, 0, 0.4)";
            return `<div style="flex:1; background:${color}; color:#fff; font-size:9px; text-align:center; line-height:20px; font-weight:bold;">${step}</div>`;
        }).join('');

        parent.appendChild(ribbon);
    }
};

const bootLoader = setInterval(() => {
    if (window.hubMarkers && window.hubMarkers.length > 0) {
        clearInterval(bootLoader);
        OptimizeEngine.init();
    }
}, 500);
