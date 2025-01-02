/**
 * Helper function for determining the risk details based on the severity.
 * This function calculates the risk score and color associated with a given severity level.
 * 
 * @param severity - The severity level (e.g., 'High', 'Medium', 'Low').
 * @returns An object containing the severity level, corresponding risk score, and color.
 */
export const getRiskDetails = (severity: string) => {
    // Assign risk score and color based on severity
    const riskScore = severity === 'High' ? 100 : (severity === 'Medium' ? 50 : 10);
    const color = severity === 'High' ? 'red' : (severity === 'Medium' ? 'orange' : 'green');

    return { severity, riskScore, color }; // Return details in an object
};

/**
 * Retrieves severity details based on the secret pattern name.
 * This function looks up the severity level for a given secret pattern and returns its corresponding risk details.
 * If the pattern is not found, it returns default values indicating an unknown severity.
 * 
 * @param patternName - The name of the secret pattern.
 * @param secretPatterns - An array of objects containing secret pattern names and their associated severity levels.
 * @returns An object containing the severity level, risk score, and color corresponding to the secret pattern.
 */
export const getSeverityDetails = (patternName: string, secretPatterns: { name: string, severity: string }[]) => {
    // Search for the pattern in the provided secret patterns array
    const pattern = secretPatterns.find(p => p.name === patternName);

    if (pattern) {
        // If pattern is found, return the risk details based on the severity
        return getRiskDetails(pattern.severity);
    }

    // Return default values for unknown patterns
    return { severity: 'Unknown', riskScore: 0, color: 'gray' };
};
