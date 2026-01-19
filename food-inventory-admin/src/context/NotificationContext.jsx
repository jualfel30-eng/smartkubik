import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'sonner';

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://api.smartkubik.com';

// Category icons for toasts
const CATEGORY_ICONS = {
    sales: '🛒',
    inventory: '📦',
    hr: '👥',
    finance: '💰',
    marketing: '📣',
    system: '⚠️',
};

export const NotificationProvider = ({ children }) => {
    const { tenant, token } = useAuth();
    const chatSocket = useRef(null);
    const notificationSocket = useRef(null);

    // Track unread counts per conversation: { conversationId: count }
    const [unreadByConversation, setUnreadByConversation] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isNotificationConnected, setIsNotificationConnected] = useState(false);

    // Notification center state
    const [centerNotifications, setCenterNotifications] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({ total: 0, byCategory: {} });

    const tenantId = tenant?.id;

    // Track active conversation where the user is currently looking
    const activeConversationIdRef = useRef(null);

    const setActiveConversationId = (id) => {
        activeConversationIdRef.current = id;
        // When user opens a conversation, mark it as read
        if (id) {
            setUnreadByConversation((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    // Compute total unread count across all conversations (WhatsApp)
    const unreadCount = Object.values(unreadByConversation).reduce((sum, count) => sum + count, 0);

    // Handle new notification from WebSocket
    const handleNewNotification = useCallback((notification) => {
        console.log('🔔 [NotificationContext] New notification:', notification);

        // Add to local state
        setCenterNotifications((prev) => [notification, ...prev].slice(0, 100));

        // Update unread counts
        setUnreadCounts((prev) => ({
            total: prev.total + 1,
            byCategory: {
                ...prev.byCategory,
                [notification.category]: (prev.byCategory[notification.category] || 0) + 1,
            },
        }));

        // Show toast for high priority notifications
        if (notification.priority === 'high' || notification.priority === 'critical') {
            const icon = CATEGORY_ICONS[notification.category] || '🔔';
            toast(
                `${icon} ${notification.title}`,
                {
                    description: notification.message,
                    duration: notification.priority === 'critical' ? 10000 : 5000,
                }
            );
        }
    }, []);

    // Handle unread count updates from WebSocket
    const handleUnreadCountUpdate = useCallback((data) => {
        console.log('📊 [NotificationContext] Unread count update:', data);
        setUnreadCounts(data);
    }, []);

    // =====================
    // CHAT SOCKET (existing)
    // =====================
    useEffect(() => {
        if (tenantId) {
            // Initialize chat socket connection
            if (!chatSocket.current) {
                chatSocket.current = io(`${SOCKET_URL}/chat`, {
                    query: { tenantId },
                    transports: ['websocket', 'polling'],
                });
            } else if (chatSocket.current.disconnected) {
                chatSocket.current.connect();
            }

            chatSocket.current.on('connect', () => {
                console.log('✅ [NotificationContext] Connected to chat server');
                setIsConnected(true);
            });

            chatSocket.current.on('disconnect', () => {
                console.log('❌ [NotificationContext] Chat disconnected');
                setIsConnected(false);
            });

            chatSocket.current.on('error', (err) => {
                console.error('❌ [NotificationContext] Chat socket error:', err);
            });

            // Handle new messages globally
            chatSocket.current.on('newMessage', (message) => {
                console.log('📩 [NotificationContext] New message:', message);

                // Only count messages from customers (sender: 'customer'), not from assistant or user
                const isCustomerMessage = message.sender === 'customer';

                // Only increment unread if:
                // 1. It's a customer message AND
                // 2. Active conversation is NOT the one receiving the message
                if (isCustomerMessage && activeConversationIdRef.current !== message.conversationId) {
                    setUnreadByConversation((prev) => ({
                        ...prev,
                        [message.conversationId]: (prev[message.conversationId] || 0) + 1,
                    }));
                }
            });

            // Listen for stock alerts (existing)
            chatSocket.current.on('stockAlert', (alert) => {
                setNotifications((prev) => [alert, ...prev]);
                toast.warning(`Alerta de Stock: ${alert.productName}`, {
                    description: `Stock bajo: ${alert.quantity} unidades`,
                });
            });

            return () => {
                if (chatSocket.current) {
                    chatSocket.current.off('connect');
                    chatSocket.current.off('disconnect');
                    chatSocket.current.off('newMessage');
                    chatSocket.current.off('stockAlert');
                }
            };
        } else {
            // If no tenant (logged out), ensure socket is closed
            if (chatSocket.current) {
                chatSocket.current.disconnect();
                chatSocket.current = null;
            }
        }
    }, [tenantId]);

    // =============================
    // NOTIFICATION SOCKET (new)
    // =============================
    useEffect(() => {
        if (tenantId && token) {
            // Initialize notification socket connection
            if (!notificationSocket.current) {
                notificationSocket.current = io(`${SOCKET_URL}/notifications`, {
                    query: { tenantId },
                    auth: { token },
                    transports: ['websocket', 'polling'],
                });
            } else if (notificationSocket.current.disconnected) {
                notificationSocket.current.connect();
            }

            notificationSocket.current.on('connect', () => {
                console.log('✅ [NotificationContext] Connected to notifications server');
                setIsNotificationConnected(true);
            });

            notificationSocket.current.on('disconnect', () => {
                console.log('❌ [NotificationContext] Notifications disconnected');
                setIsNotificationConnected(false);
            });

            notificationSocket.current.on('error', (err) => {
                console.error('❌ [NotificationContext] Notification socket error:', err);
            });

            // Listen for new notifications
            notificationSocket.current.on('notification', handleNewNotification);

            // Listen for unread count updates
            notificationSocket.current.on('unreadCount', handleUnreadCountUpdate);

            return () => {
                if (notificationSocket.current) {
                    notificationSocket.current.off('connect');
                    notificationSocket.current.off('disconnect');
                    notificationSocket.current.off('notification');
                    notificationSocket.current.off('unreadCount');
                }
            };
        } else {
            // If no tenant/token (logged out), ensure socket is closed
            if (notificationSocket.current) {
                notificationSocket.current.disconnect();
                notificationSocket.current = null;
            }
        }
    }, [tenantId, token, handleNewNotification, handleUnreadCountUpdate]);

    // Method to get unread count for a specific conversation
    const getUnreadCount = (conversationId) => {
        return unreadByConversation[conversationId] || 0;
    };

    // Method to clear unread count for a specific conversation
    const clearConversationUnread = (conversationId) => {
        setUnreadByConversation((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
        });
    };

    // Method to clear all unread counts
    const clearAllUnread = () => {
        setUnreadByConversation({});
    };

    // Update notification center unread counts (called after marking as read)
    const updateNotificationCounts = useCallback((newCounts) => {
        setUnreadCounts(newCounts);
    }, []);

    // Mark notification as read locally
    const markNotificationRead = useCallback((notificationId) => {
        setCenterNotifications((prev) =>
            prev.map((n) =>
                n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
            )
        );
    }, []);

    const value = {
        // Chat socket (WhatsApp - existing)
        socket: chatSocket.current,
        unreadCount,
        unreadByConversation,
        getUnreadCount,
        notifications,
        isConnected,
        setActiveConversationId,
        clearConversationUnread,
        clearAllUnread,

        // Notification center (new)
        notificationSocket: notificationSocket.current,
        isNotificationConnected,
        centerNotifications,
        notificationUnreadCounts: unreadCounts,
        updateNotificationCounts,
        markNotificationRead,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
