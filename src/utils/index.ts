export function logError(message: string, error: any) {
    console.error(`${message}:`, error);
}

export function logInfo(message: string, data?: any) {
    console.info(message, data);
}

export function parseJSON(jsonString: string) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logError('Failed to parse JSON', error);
        return null;
    }
}

export function formatDate(date: Date) {
    return date.toISOString();
}