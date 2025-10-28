import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getConversations, getMessagesForConversation } from '../lib/chatApi';
import { useAuth } from '../hooks/use-auth';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://api.smartkubik.com';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantStatuses, setAssistantStatuses] = useState({});
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const socket = useRef(null);
  const activeConversationRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide assistant widget on this page
  useEffect(() => {
    const assistantWidget = document.querySelector('.assistant-chat-widget-container');
    if (assistantWidget) {
      assistantWidget.style.display = 'none';
    }
    return () => {
      if (assistantWidget) {
        assistantWidget.style.display = '';
      }
    };
  }, []);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (tenantId) {
      // Fetch initial conversations
      getConversations().then(setConversations).catch(console.error);

      // Setup socket connection to /chat namespace
      socket.current = io(`${SOCKET_URL}/chat`, {
        query: { tenantId },
        transports: ['websocket', 'polling'],
      });

      socket.current.on('connect', () => {
        console.log('✅ Connected to chat server');
        console.log('Socket ID:', socket.current.id);
      });

      socket.current.on('disconnect', (reason) => {
        console.log('❌ Disconnected from chat server. Reason:', reason);
      });

      socket.current.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
      });

      socket.current.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      socket.current.on('newMessage', (message) => {
        console.log('📩 New message received:', message);
        // If the message belongs to the active conversation, update the state
        const currentConversation = activeConversationRef.current;
        if (currentConversation && message.conversationId === currentConversation._id) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
        // We could also update the conversation list to show a notification
      });

      socket.current.on('assistantStatus', (payload) => {
        console.log('🤖 Assistant status update:', payload);
        setAssistantStatuses(prev => {
          const next = { ...prev };
          if (payload.status === 'completed') {
            delete next[payload.conversationId];
          } else {
            next[payload.conversationId] = {
              ...payload,
              timestamp: Date.now(),
            };
          }
          return next;
        });
      });

      return () => {
        if (socket.current) socket.current.disconnect();
      };
    }
  }, [tenantId]);

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    setAssistantStatuses(prev => {
      const next = { ...prev };
      delete next[conversation._id];
      return next;
    });
    setLoading(true);
    try {
      const fetchedMessages = await getMessagesForConversation(conversation._id);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to fetch messages', error);
      setMessages([]); // Clear messages on error
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!socket.current) {
      console.error('❌ Socket is not initialized');
      return;
    }

    if (!socket.current.connected) {
      console.error('❌ Socket is not connected. Status:', socket.current.connected);
      return;
    }

    if (!newMessage.trim()) {
      console.warn('⚠️ Message is empty');
      return;
    }

    if (!activeConversation) {
      console.error('❌ No active conversation selected');
      return;
    }

    const messagePayload = {
      conversationId: activeConversation._id,
      content: newMessage.trim(),
    };

    console.log('📤 Sending message:', messagePayload);
    socket.current.emit('sendMessage', messagePayload);

    // Optimistically add message to UI
    const optimisticMessage = {
      content: newMessage.trim(),
      sender: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessage('');
  };

  const activeAssistantStatus = activeConversation
    ? assistantStatuses[activeConversation._id]
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground font-sans rounded-lg border border-border shadow-sm md:flex-row">
      {/* Conversations Sidebar */}
      <div className="flex w-full flex-shrink-0 flex-col border-border bg-card border-b md:h-full md:w-80 md:border-b-0 md:border-r lg:w-96">
        <div className="border-border border-b p-4 flex-shrink-0 sticky top-0 z-20 bg-card">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversations.map(convo => (
            <div
              key={convo._id}
              onClick={() => handleSelectConversation(convo)}
              className={`p-4 cursor-pointer hover:bg-muted transition-colors ${activeConversation?._id === convo._id ? 'bg-muted' : ''}`}
            >
              <p className="font-semibold">{convo.customerName || convo.customerPhoneNumber}</p>
              <p className="text-sm text-muted-foreground truncate">{convo.messages?.[0]?.content || 'No messages yet'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className="flex w-full flex-1 min-h-0 flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header - Sticky */}
            <div className="bg-card border-b border-border p-4 flex-shrink-0 sticky top-0 z-20">
              <h2 className="text-xl font-bold">{activeConversation.customerName || activeConversation.customerPhoneNumber}</h2>
            </div>

            {/* Messages Container - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-muted/50">
              {loading ? (
                <p>Loading messages...</p>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  const isAssistant = msg.sender === 'assistant';
                  const alignmentClass = isUser ? 'justify-end' : 'justify-start';
                  const bubbleClass = isUser
                    ? 'bg-primary text-primary-foreground'
                    : isAssistant
                      ? 'bg-secondary text-secondary-foreground border border-primary/30'
                      : 'bg-card border border-border/20';

                  return (
                    <div key={index} className={`mb-3 flex ${alignmentClass}`}>
                      <div className={`max-w-lg rounded-lg px-4 py-2 shadow-sm ${bubbleClass}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {activeAssistantStatus && (activeAssistantStatus.status === 'queued' || activeAssistantStatus.status === 'processing') && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span role="img" aria-label="typing">💬</span>
                  El asistente está redactando una respuesta...
                </div>
              )}
              {activeAssistantStatus && activeAssistantStatus.status === 'failed' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive-foreground">
                  <span role="img" aria-label="warning">⚠️</span>
                  No se pudo enviar la respuesta automática {activeAssistantStatus.note ? `(${activeAssistantStatus.note})` : ''}.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box - Fixed at Bottom */}
            <div className="border-border border-t bg-card p-4 pb-6 md:pb-8 flex-shrink-0 relative z-[60]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 focus:outline-none transition-colors flex-shrink-0">
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted/50">
            <p className="text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
