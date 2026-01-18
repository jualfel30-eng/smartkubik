import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'sonner';

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://api.smartkubik.com';

export const NotificationProvider = ({ children }) => {
    const { tenant } = useAuth();
    const socket = useRef(null);

    // Track unread counts per conversation: { conversationId: count }
    const [unreadByConversation, setUnreadByConversation] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
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

    // Compute total unread count across all conversations
    const unreadCount = Object.values(unreadByConversation).reduce((sum, count) => sum + count, 0);

    useEffect(() => {
        if (tenantId) {
            // Initialize socket connection
            if (!socket.current) {
                socket.current = io(`${SOCKET_URL}/chat`, {
                    query: { tenantId },
                    transports: ['websocket', 'polling'],
                });
            } else if (socket.current.disconnected) {
                socket.current.connect();
            }

            socket.current.on('connect', () => {
                console.log('✅ [NotificationContext] Connected to chat server');
                setIsConnected(true);
            });

            socket.current.on('disconnect', () => {
                console.log('❌ [NotificationContext] Disconnected');
                setIsConnected(false);
            });

            socket.current.on('error', (err) => {
                console.error('❌ [NotificationContext] Socket error:', err);
            });

            // Handle new messages globally
            socket.current.on('newMessage', (message) => {
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

            // Listen for other global events here (e.g., 'stockAlert', 'calendarEvent')
            socket.current.on('stockAlert', (alert) => {
                setNotifications((prev) => [alert, ...prev]);
                toast.warning(`Alerta de Stock: ${alert.productName}`, {
                    description: `Stock bajo: ${alert.quantity} unidades`,
                });
            });

            return () => {
                if (socket.current) {
                    socket.current.off('connect');
                    socket.current.off('disconnect');
                    socket.current.off('newMessage');
                    socket.current.off('stockAlert');
                    // We don't disconnect here to prevent frequent reconnects if component re-renders,
                    // but strictly speaking in a Provider structure, unmount means app close or logout.
                    // socket.current.disconnect(); 
                }
            };
        } else {
            // If no tenant (logged out), ensure socket is closed
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        }
    }, [tenantId]);

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

    const value = {
        socket: socket.current,
        unreadCount,
        unreadByConversation,
        getUnreadCount,
        notifications,
        isConnected,
        setActiveConversationId,
        clearConversationUnread,
        clearAllUnread,
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
