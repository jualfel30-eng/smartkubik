import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    ShoppingCart,
    Package,
    Users,
    DollarSign,
    Megaphone,
    AlertTriangle,
    Check,
    CheckCheck,
    Trash2,
    Settings,
    X,
    RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

const CATEGORY_CONFIG = {
    sales: {
        label: 'Ventas',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
    },
    inventory: {
        label: 'Inventario',
        icon: Package,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
    },
    hr: {
        label: 'RRHH',
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
    },
    finance: {
        label: 'Finanzas',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    marketing: {
        label: 'Marketing',
        icon: Megaphone,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
    },
    system: {
        label: 'Sistema',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
    },
};

const PRIORITY_STYLES = {
    low: 'border-l-gray-300',
    medium: 'border-l-blue-400',
    high: 'border-l-orange-500',
    critical: 'border-l-red-600',
};

export const NotificationCenter = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({ total: 0, byCategory: {} });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchNotifications = useCallback(async (category = null, pageNum = 1, append = false) => {
        if (!token) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: '20',
            });
            if (category && category !== 'all') {
                params.append('category', category);
            }

            const response = await fetch(`${API_URL}/notification-center?${params}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (append) {
                    setNotifications(prev => [...prev, ...data.data]);
                } else {
                    setNotifications(data.data);
                }
                setHasMore(data.page < data.totalPages);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchUnreadCounts = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/notification-center/unread`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUnreadCounts(data);
            }
        } catch (error) {
            console.error('Error fetching unread counts:', error);
        }
    }, [token]);

    useEffect(() => {
        if (open) {
            fetchNotifications(activeTab === 'all' ? null : activeTab, 1);
            fetchUnreadCounts();
        }
    }, [open, activeTab, fetchNotifications, fetchUnreadCounts]);

    // Fetch unread count periodically when closed
    useEffect(() => {
        fetchUnreadCounts();
        const interval = setInterval(fetchUnreadCounts, 60000); // Every minute
        return () => clearInterval(interval);
    }, [fetchUnreadCounts]);

    const handleTabChange = (value) => {
        setActiveTab(value);
        setPage(1);
        setNotifications([]);
        fetchNotifications(value === 'all' ? null : value, 1);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(activeTab === 'all' ? null : activeTab, nextPage, true);
    };

    const markAsRead = async (notificationId) => {
        if (!token) return;

        try {
            await fetch(`${API_URL}/notification-center/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
                )
            );
            fetchUnreadCounts();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!token) return;

        try {
            const params = activeTab !== 'all' ? `?category=${activeTab}` : '';
            await fetch(`${API_URL}/notification-center/read-all${params}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
            );
            fetchUnreadCounts();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        if (!token) return;

        try {
            await fetch(`${API_URL}/notification-center/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            fetchUnreadCounts();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }
        if (notification.navigateTo) {
            setOpen(false);
            navigate(notification.navigateTo);
        }
    };

    const renderNotificationItem = (notification) => {
        const config = CATEGORY_CONFIG[notification.category] || CATEGORY_CONFIG.system;
        const Icon = config.icon;
        const timeAgo = notification.createdAt
            ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })
            : '';

        return (
            <div
                key={notification._id}
                className={cn(
                    'p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors border-l-4',
                    PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.medium,
                    !notification.isRead && 'bg-muted/30'
                )}
                onClick={() => handleNotificationClick(notification)}
            >
                <div className="flex items-start gap-3">
                    <div className={cn('rounded-full p-2 mt-0.5', config.bgColor, config.color)}>
                        <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-sm font-medium truncate', !notification.isRead && 'font-semibold')}>
                                {notification.title}
                            </p>
                            {!notification.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                        </div>
                        {notification.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.message}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification._id);
                                }}
                                title="Marcar como leída"
                            >
                                <Check size={14} />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                            }}
                            title="Eliminar"
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderTabBadge = (category) => {
        const count = category === 'all'
            ? unreadCounts.total
            : (unreadCounts.byCategory?.[category] || 0);

        if (count === 0) return null;

        return (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] min-w-[18px] h-[16px]">
                {count > 99 ? '99+' : count}
            </Badge>
        );
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell size={20} />
                    {unreadCounts.total > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full"
                        >
                            {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                <SheetHeader className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <SheetTitle>Centro de Notificaciones</SheetTitle>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setPage(1);
                                    fetchNotifications(activeTab === 'all' ? null : activeTab, 1);
                                    fetchUnreadCounts();
                                }}
                                title="Actualizar"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setOpen(false);
                                    navigate('/settings?tab=notifications');
                                }}
                                title="Configuración"
                            >
                                <Settings size={16} />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start px-2 py-1 h-auto flex-wrap gap-1 bg-transparent border-b border-border rounded-none">
                        <TabsTrigger value="all" className="text-xs px-2 py-1 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Todas{renderTabBadge('all')}
                        </TabsTrigger>
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <TabsTrigger key={key} value={key} className="text-xs px-2 py-1 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                {config.label}{renderTabBadge(key)}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex-1 overflow-hidden">
                        <TabsContent value={activeTab} className="h-full m-0">
                            {notifications.length > 0 && (
                                <div className="px-3 py-2 border-b border-border flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-7"
                                        onClick={markAllAsRead}
                                    >
                                        <CheckCheck size={14} className="mr-1" />
                                        Marcar todas como leídas
                                    </Button>
                                </div>
                            )}
                            <ScrollArea className="h-[calc(100vh-220px)]">
                                {loading && notifications.length === 0 ? (
                                    <div className="p-4 space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <Bell size={48} className="text-muted-foreground/30 mb-4" />
                                        <p className="text-muted-foreground">No hay notificaciones</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Las nuevas notificaciones aparecerán aquí
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {notifications.map(renderNotificationItem)}
                                        {hasMore && (
                                            <div className="p-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleLoadMore}
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Cargando...' : 'Cargar más'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
};

export default NotificationCenter;
