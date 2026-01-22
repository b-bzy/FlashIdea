import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'server', 'activity.log');

export const logAction = (action: string, details: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${action}] ${JSON.stringify(details)}\n`;

    // Console output for debug
    console.log(`[LOG] ${action}:`, details);

    // File append
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error("Failed to write to log file:", err);
    });
};
