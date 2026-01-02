/** * Project: [weong-route] | MODULE: optimize.js
 * Feature: UI Vertical Correction & Interaction Restore
 */

Optimizer.injectUI = function(container) {
    const now = new Date();
    // Offset calculation for time labels
    const timeLabels = Array(12).fill(0).map((_, i) => {
        const d = new Date(now.getTime() + (i * 4) * 3600000);
        return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                    <div style="font-size:7px; color:#444; text-transform:uppercase;">${d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                    <div style="font-size:9px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}</div>
                </div>`;
    }).join('');

    // MODIFIED: Increased margin-top and added explicit pointer-events
    const html = `
        <div id="opt-heat-map" style="
            margin-top: 85px; 
            margin-bottom: 15px; 
            border-bottom: 1px solid #00FFFF; 
            padding-bottom: 10px; 
            font-family: monospace;
            position: relative;
            z-index: 1001;
            pointer-events: auto;
        ">
            <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
            <div id="heat-grid" style="
                display:grid; 
                grid-template-columns: repeat(24, 1fr); 
                gap:2px; 
                height:38px; 
                background:#111; 
                padding:3px; 
                border:1px solid #333;
                cursor: pointer;
            ">
                ${Array(24).fill(0).map((_, i) => `
                    <div class="heat-cell" data-h="${i*2}" style="
                        background:#000; 
                        display:flex; 
                        align-items:center; 
                        justify-content:center;
                        pointer-events: all;
                    "></div>`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 2px;">
                <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:9px; letter-spacing:1px;">METRo ROAD SCAN...</span>
                <span id="opt-count" style="color:#00FF00; font-size:9px; font-weight:bold;">SURFACE: STABLE</span>
            </div>
        </div>`;

    // Ensure we don't duplicate the UI if it's already there
    const existing = document.getElementById('opt-heat-map');
    if (existing) existing.remove();

    container.children[0].insertAdjacentHTML('afterbegin', html);

    // RESTORE CLICK HANDLER
    const grid = document.getElementById('heat-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.heat-cell');
            if (cell && cell.dataset.h) {
                console.log(`SYSTEM: Shifting Lead Time to +${cell.dataset.h}H`);
                this.shiftTime(cell.dataset.h, cell);
            }
        });
    }
};
