import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchApi } from '@/lib/api';
import { toast } from "sonner";

const ORDER_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function OrderStatusSelector({ order, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return;

    setIsLoading(true);

    const { data, error } = await fetchApi(`/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    setIsLoading(false);

    if (error) {
      console.error("Failed to update order status:", error);
      toast.error("Error al actualizar la orden", {
        description: error || "No se pudo cambiar el estado.",
      });
      return;
    }

    if (data) {
      toast.success(`Orden #${order.orderNumber} actualizada`, {
        description: `Nuevo estado: ${newStatus}`,
      });

      if (onStatusChange) {
        onStatusChange();
      }
    }
  };

  return (
    <Select
      value={order.status}
      onValueChange={handleStatusChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Cambiar estado" />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            <span className="capitalize">{status}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}