import React from 'react';
import { useCashRegister } from '../../contexts/CashRegisterContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CashRegisterIndicator() {
    const { currentSession, hasActiveSession, loading } = useCashRegister();
    const navigate = useNavigate();

    if (loading) {
        return (
            <Badge variant="outline" className="animate-pulse">
                Cargando caja...
            </Badge>
        );
    }

    if (!hasActiveSession) {
        return (
            <Button
                variant="destructive"
                size="sm"
                onClick={() => navigate('/cash-register')}
                className="gap-2"
                title="Abrir Caja para comenzar a vender"
            >
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Caja Cerrada</span>
            </Button>
        );
    }

    return (
        <Badge variant="outline" className="gap-2 px-3 py-1 border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30">
            <Unlock className="h-3 w-3" />
            <span className="hidden sm:inline">{currentSession.registerName}</span>
            <span className="sm:hidden">Abierta</span>
        </Badge>
    );
}
