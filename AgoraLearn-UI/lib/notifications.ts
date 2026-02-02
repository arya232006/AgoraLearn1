
export interface Notification {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

const STORAGE_KEY = 'agoralearn:notifications';

export function createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    try {
        const current = getNotifications();
        const newNote: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false
        };

        // Keep max 20 notifications
        const updated = [newNote, ...current].slice(0, 20);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Dispatch event so UI can update immediately
        window.dispatchEvent(new Event('notification-updated'));
    } catch (e) {
        console.error("Failed to create notification", e);
    }
}

export function getNotifications(): Notification[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

export function markAsRead(id: string): void {
    try {
        const current = getNotifications();
        const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('notification-updated'));
    } catch (e) { console.error(e); }
}

export function markAllAsRead(): void {
    try {
        const current = getNotifications();
        const updated = current.map(n => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('notification-updated'));
    } catch (e) { console.error(e); }
}

export function getUnreadCount(): number {
    return getNotifications().filter(n => !n.read).length;
}
