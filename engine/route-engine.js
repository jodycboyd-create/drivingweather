// route-engine.js - The [weong-route] geographic processor
export class RouteEngine {
    constructor(communities) {
        this.communities = communities;
        this.islandData = new Map();
        this.initializeEngine();
    }

    initializeEngine() {
        // Locks in the Newfoundland dataset logic
        this.communities.forEach(loc => {
            this.islandData.set(loc.id || loc.name, {
                ...loc,
                region: loc.region || "Island-Wide",
                locked: true
            });
        });
        console.log("Route Engine: Newfoundland Dataset Locked.");
    }

    getCommunityData(id) {
        return this.islandData.get(id);
    }

    getAllCommunities() {
        return Array.from(this.islandData.values());
    }
}
