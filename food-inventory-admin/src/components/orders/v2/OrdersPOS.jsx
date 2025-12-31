import React, { useState } from 'react';
import { NewOrderFormV2 } from './NewOrderFormV2';
import { toast } from 'sonner';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { fetchApi } from '@/lib/api';

export function OrdersPOS() {
    const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
    const [selectedOrderForProcessing, setSelectedOrderForProcessing] = useState(null);

    const handleOrderCreated = (newOrder) => {
        // Dispatch event to notify other components
        document.dispatchEvent(new CustomEvent('order-form-success'));

        console.log('Order created in POS mode:', newOrder);

        // Auto-open processing wizard
        if (newOrder && newOrder._id) {
            setSelectedOrderForProcessing(newOrder);
            setIsProcessingDrawerOpen(true);
        }
    };

    const handleCloseProcessingDrawer = () => {
        setIsProcessingDrawerOpen(false);
        setSelectedOrderForProcessing(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Nueva Orden</h1>
                    <p className="text-muted-foreground">
                        Punto de Venta (POS)
                    </p>
                </div>
            </div>

            <NewOrderFormV2 onOrderCreated={handleOrderCreated} />

            <OrderProcessingDrawer
                isOpen={isProcessingDrawerOpen}
                onClose={handleCloseProcessingDrawer}
                order={selectedOrderForProcessing}
                onUpdate={async () => {
                    // In POS, usually we just assume done, but we can refresh the order object if sticking around
                    if (selectedOrderForProcessing?._id) {
                        try {
                            const updatedOrder = await fetchApi(`/orders/${selectedOrderForProcessing._id}`);
                            setSelectedOrderForProcessing(updatedOrder);
                        } catch (error) {
                            console.error('Error refreshing selected order:', error);
                        }
                    }
                }}
                showMinimizeButton={false} // Optionally hide minimize if not relevant in pure POS
            />
        </div>
    );
}
