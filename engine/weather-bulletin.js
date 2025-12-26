export const BulletinLogic = {
    formatPOP(popValue, isExtendedRange) {
        if (popValue === null || popValue === undefined) return null;
        const roundedPop = Math.round(popValue / 10) * 10;
        if (roundedPop < 30) return null;
        return `${roundedPop}%`;
    },

    checkException(elementLevels) {
        if (!elementLevels) return false;
        return Object.values(elementLevels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        return {
            location: community.name, 
            pop: this.formatPOP(weatherData.pop, weatherData.range === 'extended'),
            uvIndex: (!weatherData.isExtended && weatherData.isDaytime) ? weatherData.uvIndex : null,
            isCritical: this.checkException(weatherData.levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/St_Johns' })
        };
    }
};
