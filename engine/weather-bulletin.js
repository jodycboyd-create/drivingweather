/** * [weong-bulletin] Project Logic
 * Locked: Dec 30, 2025 Baseline [cite: 2025-12-30]
 */

window.BulletinLogic = {
    formatPOP(popValue) {
        if (popValue === null || popValue === undefined) return null;
        // Rule: Report to the nearest 10%
        const roundedPop = Math.round(popValue / 10) * 10;
        // Rule: POP < 30% omitted (PubPro/Extended rules)
        return roundedPop >= 30 ? `${roundedPop}%` : null;
    },

    /**
     * Exception Trigger Logic
     * Primary trigger: Level 3 for all elements [cite: 2023-12-23]
     */
    checkException(levels) {
        if (!levels) return false;
        return Object.values(levels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        const { pop, levels, uvIndex, isDaytime } = weatherData;

        return {
            location: community.name, 
            pop: this.formatPOP(pop),
            // Rule: Add UV index to daytime periods
            uvIndex: isDaytime ? uvIndex : null,
            isCritical: this.checkException(levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { 
                timeZone: 'America/St_Johns',
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
    }
};
