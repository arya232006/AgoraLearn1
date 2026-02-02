
export interface Activity {
    id: string;
    type: 'upload' | 'chat' | 'simulation' | 'quiz';
    title: string;
    timestamp: number;
    meta?: any;
}

const STORAGE_KEY = 'agoralearn:activity';

export function logActivity(activity: Omit<Activity, 'id' | 'timestamp'>): void {
    try {
        const history = getRecentActivity(50); // Keep last 50 items
        const newActivity: Activity = {
            ...activity,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        const updated = [newActivity, ...history].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Failed to log activity", e);
    }
}

export function getRecentActivity(limit: number = 10): Activity[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored).slice(0, limit);
    } catch (e) {
        return [];
    }
}

export function clearActivity(): void {
    localStorage.removeItem(STORAGE_KEY);
}
