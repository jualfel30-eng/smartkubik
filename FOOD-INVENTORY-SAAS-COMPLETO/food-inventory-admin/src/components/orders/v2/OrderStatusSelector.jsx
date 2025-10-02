import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchApi } from '@/lib/api';
import { toast } from "sonner";

const orderStatusMap = {
  draft: { label: 'Borrador', color: 'bg-gray-400' },
  pending: { label: 'Pendiente', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
  processing: { label: 'Procesando', color: 'bg-purple-500' },
  shipped: { label: 'Enviado', color: 'bg-indigo-500' },
  delivered: { label: 'Entregado', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
  refunded: { label: 'Reembolsado', color: 'bg-pink-500' },
};

const ORDER_STATUSES = Object.keys(orderStatusMap);

export function OrderStatusSelector({ order, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return;

    setIsLoading(true);
    try {
      await fetchApi(`/orders/${order._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      toast.success(`Orden #${order.orderNumber} actualizada`, {
        description: `Nuevo estado: ${orderStatusMap[newStatus]?.label || newStatus}`,
      });

      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error("Error al actualizar la orden", {
        description: error.message || "No se pudo cambiar el estado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatus = orderStatusMap[order.status] || { label: order.status, color: 'bg-gray-400' };

  return (
    <Select
      value={order.status}
      onValueChange={handleStatusChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue asChild>
          <div className="flex items-center">
            <span className={`h-2 w-2 rounded-full mr-2 ${currentStatus.color}`} />
            <span>{currentStatus.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((status) => {
          const statusInfo = orderStatusMap[status];
          return (
            <SelectItem key={status} value={status}>
              <div className="flex items-center">
                <span className={`h-2 w-2 rounded-full mr-2 ${statusInfo.color}`} />
                <span>{statusInfo.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}