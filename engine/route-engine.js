/**
 * route-engine.js 
 * Project: [weong-route]
 * Fixed for: https://[username].github.io/drivingweather/
 */

export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Using the full repo path to avoid 404s
            const response = await fetch('/drivingweather/data/nl/communities.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load data. Status: ${response.status}`);
            }
            
            this.communities = await response.json();
            console.log("Newfoundland Dataset Locked and Loaded.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Fetch Error:", error);
            // Alerting the UI that it failed
            const status = document.getElementById('status-msg');
            if (status) status.innerHTML = `<span style="color:red;">Error: ${error.message}</span>`;
            return [];
        }
    }
}
