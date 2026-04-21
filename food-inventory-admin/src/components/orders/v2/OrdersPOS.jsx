import React, { useState } from 'react';
import { NewOrderFormV2 } from './NewOrderFormV2';
import { toast } from 'sonner';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { fetchApi } from '@/lib/api';
import { useSidebar } from '@/components/ui/sidebar';
import { useMediaQuery } from '@/hooks/use-media-query';

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, DollarSign } from 'lucide-react';
import { CashRegisterIndicator } from '@/components/cash-register/CashRegisterIndicator';
import { CashClosingDrawer } from '@/components/cash-register/CashClosingDrawer';

export function OrdersPOS() {
    const navigate = useNavigate();
    const { state, setOpen } = useSidebar();
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
    const [selectedOrderForProcessing, setSelectedOrderForProcessing] = useState(null);

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

            <NewOrderFormV2 onOrderCreated={handleOrderCreated} />

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
