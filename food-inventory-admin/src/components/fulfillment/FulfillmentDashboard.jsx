
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Truck, Package, CheckCircle, Clock, Store } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OrderFulfillmentCard } from './OrderFulfillmentCard';
import { DeliveryConfigDialog } from './DeliveryConfigDialog';
import { Settings as SettingsIcon } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export function FulfillmentDashboard() {
    const { token, tenant } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [activeMethods, setActiveMethods] = useState({
        enablePickup: true,
        enableDelivery: true,
        enableNationalShipping: false,
        enablePosOrders: false
    });

    const API_URL = import.meta.env.VITE_API_URL;

    const fetchOrders = async () => {
        try {
            setLoading(true);
            // Fetch active fulfillment orders
            const statusFilter = 'pending,picking,packed,in_transit';
            const queryParams = new URLSearchParams({
                fulfillmentStatus: statusFilter,
                limit: 100,
                sortBy: 'fulfillmentDate',
                sortOrder: 'asc'
            });

            if (filterType !== 'all') {
                queryParams.append('fulfillmentType', filterType);
            }

            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            const response = await fetch(`${API_URL}/orders?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error('Error fetching fulfillment orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const data = await fetchApi('/delivery/rates');
            if (data?.settings) {
                setActiveMethods({
                    enablePickup: data.settings.enablePickup,
                    enableDelivery: data.settings.enableDelivery,
                    enableNationalShipping: data.settings.enableNationalShipping,
                    enablePosOrders: data.settings.enablePosOrders
                });
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [filterType, searchTerm, activeTab]);

    const handleStatusUpdate = async (orderId, newStatus, notes) => {
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}/fulfillment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, notes })
            });

            if (response.ok) {
                fetchOrders(); // Refresh list
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Group orders by status
    const ordersByStatus = {
        pending: orders.filter(o => o.fulfillmentStatus === 'pending'),
        picking: orders.filter(o => o.fulfillmentStatus === 'picking'),
        packed: orders.filter(o => o.fulfillmentStatus === 'packed'),
        in_transit: orders.filter(o => o.fulfillmentStatus === 'in_transit'),
    };

    const getTabCount = (status) => ordersByStatus[status]?.length || 0;

    return (
        <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Entregas</h1>
                    <p className="text-muted-foreground">Administra el flujo de preparación y envío de pedidos.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsConfigOpen(true)}>
                        <SettingsIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={fetchOrders} disabled={loading}>
                        {loading ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cliente o # orden..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant={filterType === 'all' ? 'secondary' : 'ghost'}
                            onClick={() => setFilterType('all')}
                        >
                            Todos
                        </Button>

                        {activeMethods.enableDelivery && (
                            <Button
                                variant={filterType === 'delivery' ? 'secondary' : 'ghost'}
                                onClick={() => setFilterType('delivery')}
                                className="gap-2"
                            >
                                <Truck className="h-4 w-4" /> Delivery
                            </Button>
                        )}

                        {activeMethods.enablePickup && (
                            <Button
                                variant={filterType === 'pickup' ? 'secondary' : 'ghost'}
                                onClick={() => setFilterType('pickup')}
                                className="gap-2"
                            >
                                <Package className="h-4 w-4" /> Pickup
                            </Button>
                        )}

                        {activeMethods.enableNationalShipping && (
                            <Button
                                variant={filterType === 'shipping' ? 'secondary' : 'ghost'}
                                onClick={() => setFilterType('shipping')}
                                className="gap-2"
                            >
                                <Truck className="h-4 w-4" /> Nacional
                            </Button>
                        )}

                        {activeMethods.enablePosOrders && (
                            <Button
                                variant={filterType === 'pos' ? 'secondary' : 'ghost'}
                                onClick={() => setFilterType('pos')}
                                className="gap-2"
                            >
                                <Store className="h-4 w-4" /> Tienda
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Kanban / Tabs View */}
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full grid-cols-4 mb-8">
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="h-4 w-4" /> Pendientes
                        <Badge variant="secondary" className="ml-2">{getTabCount('pending')}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="picking" className="gap-2">
                        <Package className="h-4 w-4" /> Picking
                        <Badge variant="secondary" className="ml-2">{getTabCount('picking')}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="packed" className="gap-2">
                        <CheckCircle className="h-4 w-4" /> Empacado
                        <Badge variant="secondary" className="ml-2">{getTabCount('packed')}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="in_transit" className="gap-2">
                        <Truck className="h-4 w-4" /> En Camino
                        <Badge variant="secondary" className="ml-2">{getTabCount('in_transit')}</Badge>
                    </TabsTrigger>
                </TabsList>

                {['pending', 'picking', 'packed', 'in_transit'].map((status) => (
                    <TabsContent key={status} value={status} className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {ordersByStatus[status].length === 0 ? (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No hay órdenes en este estado
                                </div>
                            ) : (
                                ordersByStatus[status].map(order => (
                                    <OrderFulfillmentCard
                                        key={order._id}
                                        order={order}
                                        onStatusUpdate={handleStatusUpdate}
                                    />
                                ))
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <DeliveryConfigDialog
                open={isConfigOpen}
                onOpenChange={setIsConfigOpen}
                onConfigChange={(newConfig) => {
                    setActiveMethods(newConfig);
                    // Reset filter if current filter is disabled
                    if (filterType === 'pos' && !newConfig.enablePosOrders) setFilterType('all');
                    if (filterType === 'shipping' && !newConfig.enableNationalShipping) setFilterType('all');
                    loadConfig(); // Reload to be sure
                }}
            />
        </div>
    );
}
