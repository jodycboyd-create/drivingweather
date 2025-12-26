export const BulletinLogic = {
    formatPOP(popValue, isExtendedRange) {
        if (popValue === null || popValue === undefined) return null;
        const roundedPop = Math.round(popValue / 10) * 10;
        
        // Rule: Omit POP < 30%
        if (roundedPop < 30) return null;
        return `${roundedPop}%`;
    },

    checkException(elementLevels) {
        if (!elementLevels) return false;
        // Primary trigger: Level 3
        return Object.values(elementLevels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        const { pop, levels, uvIndex, isDaytime, range } = weatherData;
        const isExtended = range === 'extended';

        return {
            location: community.name, 
            pop: this.formatPOP(pop, isExtended),
            uvIndex: (!isExtended && isDaytime) ? uvIndex : null,
            isCritical: this.checkException(levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/St_Johns' })
        };
    }
};
