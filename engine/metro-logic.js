/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Road Surface Temperature (RST) Energy Balance
 * Status: Baseline Build
 */

const MetroEngine = {
    // Standard constants for Newfoundland Asphalt (Standardized)
    ROADS: {
        ALBEDO: 0.15,      // Absorption of solar radiation
        EMISSIVITY: 0.95,  // Infrared radiation efficiency
        CONDUCTIVITY: 1.5, // Heat movement through pavement
        SPECIFIC_HEAT: 900 // Thermal mass of the road
    },

    /**
     * Estimates Road Surface Temperature Change
     * @param {Object} current - RWIS Ground Truth Data
     * @param {Object} forecast - Open-Meteo Atmospheric Data
     */
    calculateRST(current, forecast) {
        // 1. Net Radiation Balance
        const netRad = (1 - this.ROADS.ALBEDO) * forecast.shortwave_rad + 
                       (this.ROADS.EMISSIVITY * (forecast.longwave_rad - (5.67e-8 * Math.pow(current.surface_temp + 273.15, 4))));

        // 2. Sensible Heat Flux (Wind Cooling)
        const windEffect = 1.0 + 0.1 * forecast.wind_speed;
        const sensibleHeat = windEffect * (forecast.air_temp - current.surface_temp);

        // 3. Latent Heat Flux (Evaporative Cooling/Phase Change)
        // High impact during "Flash Freeze" events
        let latentHeat = 0;
        if (forecast.precipitation > 0) {
            latentHeat = -2.5e6 * (forecast.precipitation / 3600); // Cooling due to evaporation/melting
        }

        // 4. Final RST Delta
        const totalFlux = netRad + sensibleHeat + latentHeat;
        return current.surface_temp + (totalFlux / this.ROADS.SPECIFIC_HEAT);
    },

    async syncWithOptimize() {
        // This will eventually feed back into optimize.js to change 
        // the color block based on "Road State" rather than "Precipitation Code"
        console.log("[METRO] Energy balance sync initialized.");
    }
};

// Auto-initiate if dependency modules are present
if (window.RWIS && window.Optimizer) {
    MetroEngine.syncWithOptimize();
}
