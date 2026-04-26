import React, { useState, useEffect, useCallback } from 'react';
import { NewOrderFormV2 } from './NewOrderFormV2';
import { toast } from 'sonner';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { fetchApi } from '@/lib/api';
import { useSidebar } from '@/components/ui/sidebar';
import { useMediaQuery } from '@/hooks/use-media-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, tapScale, DUR, EASE, SPRING } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';
import { useDailyPOSRevenue } from '@/hooks/useDailyPOSRevenue';
import { useAuth } from '@/hooks/use-auth.jsx';

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, DollarSign, Target, X, Keyboard } from 'lucide-react';
import { CashRegisterIndicator } from '@/components/cash-register/CashRegisterIndicator';
import { CashClosingDrawer } from '@/components/cash-register/CashClosingDrawer';

export function OrdersPOS() {
    const navigate = useNavigate();
    const { state, setOpen } = useSidebar();
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const { tenant } = useAuth();
    const posRevenue = useDailyPOSRevenue(tenant?._id);
    const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
    const [selectedOrderForProcessing, setSelectedOrderForProcessing] = useState(null);

    // Keyboard shortcut hints
    const [showShortcuts, setShowShortcuts] = useState(() => {
        try {
            return localStorage.getItem('sk_pos:shortcuts_dismissed') !== 'true';
        } catch { return true; }
    });

    const dismissShortcuts = useCallback(() => {
        setShowShortcuts(false);
        try { localStorage.setItem('sk_pos:shortcuts_dismissed', 'true'); } catch {}
    }, []);

    // Keyboard shortcut listeners
    useEffect(() => {
        const handleKeydown = (e) => {
            // Skip if typing in an input
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

            if (e.key === 'F2') {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('pos-focus-search'));
            } else if (e.key === 'F4') {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('pos-pay'));
            } else if (e.key === 'Escape') {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('clear-order-form'));
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    const handleOrderCreated = (newOrder) => {
        document.dispatchEvent(new CustomEvent('order-form-success'));
        console.log('Order created in POS mode:', newOrder);

        if (newOrder && newOrder._id) {
            setSelectedOrderForProcessing(newOrder);
            setIsProcessingDrawerOpen(true);
        }
    };

    const handleCloseProcessingDrawer = () => {
        setIsProcessingDrawerOpen(false);
        setSelectedOrderForProcessing(null);
    };

    const handleModuleClick = () => {
        if (state === 'expanded') {
            setOpen(false);
        }
    };

    return (
        <div className="space-y-2 lg:space-y-4" onClick={handleModuleClick}>
            {/* Header — compact on mobile, full on desktop */}
            <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5 lg:space-y-1">
                    <h1 className="text-xl lg:text-3xl font-bold">
                        {isDesktop ? 'Nueva Orden' : 'POS'}
                    </h1>
                    {isDesktop && (
                        <p className="text-muted-foreground">
                            Punto de Venta (POS)
                        </p>
                    )}
                </div>
                <div className="flex gap-1.5 lg:gap-2">
                    {/* Reset — icon-only on mobile */}
                    <Button
                        variant="outline"
                        size={isDesktop ? 'default' : 'icon'}
                        className={isDesktop ? 'gap-2' : 'h-9 w-9'}
                        onClick={() => {
                            document.dispatchEvent(new CustomEvent('clear-order-form'));
                        }}
                    >
                        <RotateCcw className="h-4 w-4" />
                        {isDesktop && 'Nueva Orden'}
                    </Button>
                    {/* History — icon-only on mobile */}
                    <Button
                        variant="outline"
                        size={isDesktop ? 'default' : 'icon'}
                        className={isDesktop ? 'gap-2' : 'h-9 w-9'}
                        onClick={() => navigate('/orders/history')}
                    >
                        <History className="h-4 w-4" />
                        {isDesktop && 'Historial de Órdenes'}
                    </Button>
                    <CashClosingDrawer />
                    <CashRegisterIndicator />
                </div>
            </div>

            {/* Session Summary Bar */}
            {isDesktop && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DUR.base, ease: EASE.out }}
                    className="flex items-center justify-between px-4 py-2 rounded-lg border bg-card text-sm"
                >
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Hoy:</span>
                        <motion.span
                            key={posRevenue.todayTotal >= 1000 ? 'milestone' : 'normal'}
                            animate={posRevenue.todayTotal >= 500 && posRevenue.todayTotal < 600
                                ? { scale: [1, 1.05, 1] }
                                : {}
                            }
                            transition={SPRING.bouncy}
                        >
                            <AnimatedNumber
                                value={posRevenue.todayTotal}
                                format={(n) => `$${n.toFixed(2)}`}
                                duration={0.6}
                                className="font-bold tabular-nums"
                            />
                        </motion.span>
                        <span className="text-muted-foreground">
                            en {posRevenue.todayCount} {posRevenue.todayCount === 1 ? 'orden' : 'ordenes'}
                        </span>
                        {posRevenue.todayTotal >= 1000 && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={SPRING.bouncy}
                            >
                                <Target className="h-4 w-4 text-emerald-500" />
                            </motion.span>
                        )}
                    </div>
                    {posRevenue.lastOrder && (
                        <div className="text-muted-foreground text-xs">
                            Ultimo: #{posRevenue.lastOrder.orderNumber}{' '}
                            {posRevenue.lastOrder.customerName && (
                                <span>{posRevenue.lastOrder.customerName} </span>
                            )}
                            <span className="font-medium text-foreground">
                                ${(posRevenue.lastOrder.total || 0).toFixed(2)}
                            </span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Keyboard Shortcut Hints */}
            <AnimatePresence>
                {showShortcuts && isDesktop && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: DUR.base, ease: EASE.out }}
                        className="flex items-center gap-4 px-4 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg border overflow-hidden"
                    >
                        <Keyboard className="h-3.5 w-3.5 shrink-0" />
                        <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">F2</kbd> Buscar producto</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">F4</kbd> Pagar</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Esc</kbd> Limpiar</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">B</kbd> Codigo de barras</span>
                        <button onClick={dismissShortcuts} className="ml-auto hover:text-foreground transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <NewOrderFormV2 onOrderCreated={handleOrderCreated} posRevenue={posRevenue} />

            <OrderProcessingDrawer
                isOpen={isProcessingDrawerOpen}
                onClose={handleCloseProcessingDrawer}
                order={selectedOrderForProcessing}
                onUpdate={async () => {
                    if (selectedOrderForProcessing?._id) {
                        try {
                            const updatedOrder = await fetchApi(`/orders/${selectedOrderForProcessing._id}`);
                            setSelectedOrderForProcessing(updatedOrder);
                        } catch (error) {
                            console.error('Error refreshing selected order:', error);
                        }
                    }
                }}
                showMinimizeButton={false}
            />
        </div>
    );
}
