import { useCallback } from 'react';

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook for managing order drafts in localStorage
 * @param {string} tenantId - Tenant ID for scoping drafts
 * @param {string} context - Context identifier (e.g., 'pos', 'table_123', 'whatsapp_456')
 */
export function useOrderDraft(tenantId, context = 'pos') {
    const storageKey = `draft_order_${tenantId}_${context}`;

    const saveDraft = useCallback((orderData) => {
        try {
            const draft = {
                timestamp: Date.now(),
                orderData
            };
            localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, [storageKey]);

    const loadDraft = useCallback(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return null;

            const draft = JSON.parse(stored);
            const age = Date.now() - draft.timestamp;

            // Expire old drafts
            if (age > DRAFT_EXPIRY_MS) {
                localStorage.removeItem(storageKey);
                return null;
            }

            return draft.orderData;
        } catch (error) {
            console.error('Failed to load draft:', error);
            return null;
        }
    }, [storageKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    }, [storageKey]);

    const hasDraft = useCallback(() => {
        const draft = loadDraft();
        return draft !== null;
    }, [loadDraft]);

    return { saveDraft, loadDraft, clearDraft, hasDraft };
}
