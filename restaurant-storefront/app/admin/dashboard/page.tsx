'use client';

import { useEffect, useState } from 'react';
import { restaurantAdminApi } from '@/lib/api';
import { Order } from '@/types';
import { TrendingUp, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStats {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0 });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('admin_token')!;
                const res = await restaurantAdminApi.getOrders(token, { limit: 5 }) as { data: Order[]; total: number };

                const orders = res.data;
                const today = new Date().toISOString().slice(0, 10);

                let todayOrders = 0;
                let todayRevenue = 0;
                let pending = 0;

                orders.forEach(order => {
                    if (order.createdAt.startsWith(today)) {
                        todayOrders++;
                        todayRevenue += Number(order.total);
                    }
                    if (order.status === 'pending') {
                        pending++;
                    }
                });

                setStats({ todayOrders, todayRevenue, pendingOrders: pending });
                setRecentOrders(orders);
            } catch {
                console.error('Failed to load dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) {
        return <div className="text-muted animate-pulse">Cargando métricas...</div>;
    }

    const statCards = [
        { label: 'Ventas de Hoy', value: `$${stats.todayRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
        { label: 'Pedidos Hoy', value: stats.todayOrders, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Por Preparar', value: stats.pendingOrders, icon: Clock, color: 'text-accent', bg: 'bg-accent/10' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-display font-black text-3xl text-white mb-2">Panel de Resumen</h1>
                <p className="text-muted">Un vistazo al estado actual de tu restaurante.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-surface border border-white/5 rounded-2xl p-6 flex items-center gap-4"
                        >
                            <div className={`p-4 rounded-xl ${card.bg}`}>
                                <Icon className={`w-8 h-8 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-muted text-sm font-medium mb-1">{card.label}</p>
                                <p className="font-display font-bold text-3xl text-white">{card.value}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden mt-8">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-white">Últimos Pedidos</h2>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="p-12 text-center text-muted">No hay pedidos registrados todavía.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-muted text-sm border-b border-white/10">
                                    <th className="p-4 font-semibold">Ref</th>
                                    <th className="p-4 font-semibold">Cliente</th>
                                    <th className="p-4 font-semibold">Total</th>
                                    <th className="p-4 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentOrders.map(order => (
                                    <tr key={order._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-accent">{order.orderRef}</td>
                                        <td className="p-4 font-medium text-white">{order.customerName}</td>
                                        <td className="p-4">${Number(order.total).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                        ${order.status === 'pending' ? 'bg-accent/10 text-accent border-accent/20' :
                                                    order.status === 'delivered' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}
                                            >
                                                {order.status === 'pending' && <Clock className="w-3 h-3" />}
                                                {order.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                                                {order.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
