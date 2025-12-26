// route-engine.js - The [weong-route] geographic processor
export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        // Points to the location in your 'data/nl/' folder
        const response = await fetch('../data/nl/communities.json');
        this.communities = await response.json();
        console.log("Newfoundland Dataset Locked and Loaded.");
        return this.communities;
    }

    getCommunityById(id) {
        return this.communities.find(c => c.id === id);
    }
}
