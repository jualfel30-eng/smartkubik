import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';

const CashRegisterContext = createContext(null);

export function CashRegisterProvider({ children }) {
    const [currentSession, setCurrentSession] = useState(null);
    const [loading, setLoading] = useState(true);

    // Obtener sesión actual del usuario y sus totales en tiempo real
    const fetchCurrentSession = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchApi('/cash-register/sessions/current');
            const session = response?.session || null;

            if (session && session.status === 'open') {
                try {
                    // Fetch live totals
                    const totals = await fetchApi(`/cash-register/sessions/${session._id}/totals`);
                    // Merge totals into session object for UI consumption
                    // calculatedTotals should be the structure returned by the service
                    session.calculatedTotals = totals || {};
                    // Also update legacy fields if needed for compatibility
                    session.totalSalesUsd = totals.salesUsd || 0;
                    session.totalSalesVes = totals.salesVes || 0;
                    session.totalTransactions = totals.totalOrders || 0;
                } catch (totalError) {
                    console.error('Error fetching live totals:', totalError);
                    // Continue with static session data if totals fail
                }
            }

            setCurrentSession(session);
        } catch (error) {
            console.error('Error fetching cash session:', error);
            setCurrentSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar al montar
    useEffect(() => {
        fetchCurrentSession();
    }, [fetchCurrentSession]);

    // Refrescar sesión (llamar después de abrir/cerrar caja)
    const refreshSession = useCallback(() => {
        fetchCurrentSession();
    }, [fetchCurrentSession]);

    // Verificar si hay sesión activa
    const hasActiveSession = Boolean(currentSession && currentSession.status === 'open');

    const value = {
        currentSession,
        loading,
        hasActiveSession,
        refreshSession,
        // Datos útiles para vincular a órdenes
        sessionId: currentSession?._id || null,
        registerId: currentSession?.registerName || null,
    };

    return (
        <CashRegisterContext.Provider value={value}>
            {children}
        </CashRegisterContext.Provider>
    );
}

export function useCashRegister() {
    const context = useContext(CashRegisterContext);
    if (!context) {
        throw new Error('useCashRegister debe usarse dentro de CashRegisterProvider');
    }
    return context;
}

export default CashRegisterContext;
