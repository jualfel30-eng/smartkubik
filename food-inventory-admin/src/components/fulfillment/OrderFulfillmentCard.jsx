
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Package,
    Truck,
    MapPin,
    User,
    Check,
    Clock,
    ChevronRight,
    Printer
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const OrderFulfillmentCard = ({ order, onStatusUpdate }) => {
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [notes, setNotes] = useState(order.deliveryNotes || '');
    const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');

    const nextStatus = {
        'pending': 'picking',
        'picking': 'packed',
        'packed': 'in_transit',
        'in_transit': 'delivered'
    };

    const statusLabels = {
        'pending': 'Pendiente',
        'picking': 'En Preparación',
        'packed': 'Empacado',
        'in_transit': 'En Camino',
        'delivered': 'Entregado'
    };

    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'picking': 'bg-blue-100 text-blue-800',
        'packed': 'bg-purple-100 text-purple-800',
        'in_transit': 'bg-orange-100 text-orange-800',
        'delivered': 'bg-green-100 text-green-800'
    };

    const handleAdvance = () => {
        const next = nextStatus[order.fulfillmentStatus];
        if (next) {
            onStatusUpdate(order._id, next, notes);
            setIsUpdateDialogOpen(false);
        }
    };

    const isDelivery = order.fulfillmentType?.includes('delivery');

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <Badge className={statusColors[order.fulfillmentStatus] || 'bg-gray-100'}>
                        {statusLabels[order.fulfillmentStatus] || order.fulfillmentStatus}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
                {/* Customer Info */}
                <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="overflow-hidden">
                        <p className="font-medium truncate">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customerPhone}</p>
                    </div>
                </div>

                {/* Address */}
                {isDelivery && order.shipping?.address && (
                    <div className="flex items-start gap-2 text-sm bg-slate-50 p-2 rounded">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <p className="line-clamp-2 text-xs">
                            {order.shipping.address.street}, {order.shipping.address.city}
                        </p>
                    </div>
                )}

                {/* Items Summary */}
                <div className="border-t pt-2 mt-2">
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">{order.items.length} Artículos</p>
                    <ul className="text-sm space-y-1">
                        {order.items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                                <span className="truncate flex-1">{item.productName}</span>
                                <span className="font-mono text-xs ml-2">x{item.quantity}</span>
                            </li>
                        ))}
                        {order.items.length > 3 && (
                            <li className="text-xs text-muted-foreground text-center">
                                +{order.items.length - 3} más...
                            </li>
                        )}
                    </ul>
                </div>
            </CardContent>

            <CardFooter className="pt-2 border-t flex gap-2">
                <Button variant="outline" size="icon" className="shrink-0" title="Imprimir">
                    <Printer className="w-4 h-4" />
                </Button>

                {nextStatus[order.fulfillmentStatus] && (
                    <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                Avanzar <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Actualizar Estado: {order.orderNumber}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="flex items-center gap-4 justify-center">
                                    <Badge variant="outline" className="text-base py-1 px-3">
                                        {statusLabels[order.fulfillmentStatus]}
                                    </Badge>
                                    <ChevronRight />
                                    <Badge className={`text-base py-1 px-3 ${statusColors[nextStatus[order.fulfillmentStatus]]}`}>
                                        {statusLabels[nextStatus[order.fulfillmentStatus]]}
                                    </Badge>
                                </div>

                                {nextStatus[order.fulfillmentStatus] === 'in_transit' && isDelivery && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Número de Tracking / Guía</label>
                                        <Input
                                            placeholder="Ej: TEALCA-123456"
                                            value={trackingNumber}
                                            onChange={(e) => setTrackingNumber(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Notas de Entrega (Opcional)</label>
                                    <Textarea
                                        placeholder="Comentarios sobre el empaquetado o entrega..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAdvance}>Confirmar Cambio</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardFooter>
        </Card>
    );
};
