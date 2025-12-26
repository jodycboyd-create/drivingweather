/**
 * route-engine.js 
 * Project: [weong-route]
 * Updated: Dec 2025 - Fixed pathing for /drivingweather/ subdirectory
 */

export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Updated path: No leading dot, targeting data from project root
            const response = await fetch('data/nl/communities.json');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            this.communities = await response.json();
            console.log("Newfoundland Dataset Loaded successfully.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine failed to load JSON:", error);
            return [];
        }
    }
}
