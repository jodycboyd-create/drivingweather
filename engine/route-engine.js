export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Using a relative path from the root where index.html sits
            const response = await fetch('./data/nl/communities.json');
            
            if (!response.ok) {
                // This will help us see EXACTLY where it tried to look
                throw new Error(`404 Not Found at: ${response.url}`);
            }
            
            this.communities = await response.json();
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Error:", error);
            const status = document.getElementById('status-msg');
            if (status) status.innerHTML = `<span style="color:red;">${error.message}</span>`;
            return [];
        }
    }
}
