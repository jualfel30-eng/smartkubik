import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, PackageCheck, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { DriverMap } from './DriverMap';

export const DriverDashboard = () => {
    const location = useLocation();
    // Determine mode based on URL: /driver/pool or /driver/active
    const mode = location.pathname.includes('active') ? 'active' : 'pool';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedMapOrderId, setExpandedMapOrderId] = useState(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const endpoint = mode === 'pool' ? '/drivers/pool' : '/drivers/orders/active';
            const response = await fetchApi(endpoint);
            if (response.success) {
                setOrders(response.data);
            }
        } catch (error) {
            toast.error('Error cargando órdenes');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [mode]); // Reload when switching tabs

    const handleClaim = async (orderId) => {
        try {
            await fetchApi(`/drivers/orders/${orderId}/claim`, { method: 'POST' });
            toast.success('¡Orden asignada!');
            fetchOrders(); // Refresh pool
        } catch (error) {
            toast.error('No se pudo asignar la orden');
        }
    };

    const handleComplete = async (orderId) => {
        // For simplicity, direct completion without photo for now
        if (confirm('¿Confirmar entrega completada?')) {
            try {
                await fetchApi(`/drivers/orders/${orderId}/complete`, {
                    method: 'POST',
                    body: JSON.stringify({ notes: 'Entregado vía Driver App' })
                });
                toast.success('¡Entrega completada!');
                fetchOrders();
            } catch (error) {
                toast.error('Error al completar la entrega');
            }
        }
    };

    const toggleMap = (orderId) => {
        setExpandedMapOrderId(prev => prev === orderId ? null : orderId);
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4">
                <div className="bg-slate-100 p-6 rounded-full">
                    {mode === 'pool' ? <PackageCheck className="h-10 w-10 text-slate-400" /> : <Truck className="h-10 w-10 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                    {mode === 'pool' ? 'No hay órdenes disponibles' : 'No tienes entregas activas'}
                </h3>
                <p className="text-sm text-slate-500">
                    {mode === 'pool' ? 'Espera a que salgan nuevos pedidos de cocina.' : 'Ve al tab "Disponibles" para tomar un pedido.'}
                </p>
                <Button variant="outline" onClick={fetchOrders}>Actualizar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map(order => (
                <Card key={order._id} className="border-l-4 border-l-blue-600 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between">
                            <Badge variant="outline" className="font-mono">{order.orderNumber}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <CardTitle className="text-base">{order.customerName}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 text-sm space-y-2">
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                {order.shipping?.address ? (
                                    <>
                                        <p>{order.shipping.address.street}</p>
                                        <p className="text-xs text-slate-500">{order.shipping.address.city}</p>
                                    </>
                                ) : (
                                    <span className="text-slate-400 italic">Sin dirección registrada</span>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded text-xs text-slate-600">
                            {order.items.length} Artículos • Total: ${order.totalAmount}
                        </div>

                        {/* Map Section */}
                        {expandedMapOrderId === order._id && (
                            <div className="h-48 w-full mt-2 rounded-lg overflow-hidden border">
                                <DriverMap
                                    origin={{ lat: 10.1807, lng: -67.9904 }} // TODO: Replace with Real Store Location
                                    destination={
                                        order.shipping?.address?.coordinates
                                            ? { lat: order.shipping.address.coordinates.lat, lng: order.shipping.address.coordinates.lng }
                                            : null
                                    }
                                />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="pt-0 flex flex-col gap-2">
                        {mode === 'pool' ? (
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleClaim(order._id)}>
                                <Truck className="w-4 h-4 mr-2" /> Reclamar Pedido
                            </Button>
                        ) : (
                            <div className="flex flex-col w-full gap-2">
                                <div className="flex gap-2 w-full">
                                    <Button variant="outline" className="flex-1" onClick={() => toggleMap(order._id)}>
                                        <Navigation className="w-4 h-4 mr-2" />
                                        {expandedMapOrderId === order._id ? 'Ocultar Mapa' : 'Ver Mapa'}
                                    </Button>
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleComplete(order._id)}>
                                        <PackageCheck className="w-4 h-4 mr-2" /> Completar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};
