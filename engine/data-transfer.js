/** * Project: [weong-route] | MODULE: data-transfer.js
 * Feature: MSC GeoMet Handshake & Caching Engine
 */

const DataTransfer = {
    cache: {},
    lastFetch: null,
    
    async getUnifiedForecast(points) {
        // 1. Check if we have fresh data (less than 15 mins old) to save API hits
        if (this.lastFetch && (Date.now() - this.lastFetch < 900000)) {
            return this.cache;
        }

        const bbox = this.calculateBBOX(points);
        const url = `https://geo.weather.gc.ca/geomet?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=GDPS.ETA_TT&BBOX=${bbox}&OUTPUTFORMAT=application/json`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // 2. Normalize and Store
            this.cache = this.normalize(data);
            this.lastFetch = Date.now();
            return this.cache;
        } catch (e) {
            console.error("DATA_TRANSFER_CRITICAL_FAILURE: Falling back to local state.");
            return this.cache; 
        }
    },

    calculateBBOX(points) {
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        return `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;
    },

    normalize(geoJson) {
        // Formats MSC data into our standardized [weong-route] schema
        return geoJson.features.map(f => ({
            coords: f.geometry.coordinates,
            temp: f.properties.VALUE,
            time: f.properties.FORECAST_HOUR
        }));
    }
};
