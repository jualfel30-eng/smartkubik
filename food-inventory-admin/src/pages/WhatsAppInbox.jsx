import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getConversations, getMessagesForConversation } from '../lib/chatApi';
import { useAuth } from '../hooks/use-auth';
import { useCrmContext } from '@/context/CrmContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '../lib/api';
import { toast } from 'sonner';

import { ShoppingBag, Calendar, Menu, ChevronLeft, Smile, CreditCard, Send, Store } from 'lucide-react';
import { ActionPanel } from '../components/chat/ActionPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://api.smartkubik.com';

const COMMON_EMOJIS = ['👍', '👋', '🎉', '😂', '❤️', '🔥', '🤔', '🙏', '✅', '❌', '🍕', '🍔', '🥗', '🥤', '🍦', '💵', '💳', '🚚', '📦', '🏠'];

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantStatuses, setAssistantStatuses] = useState({});
  const { tenant } = useAuth();
  const { paymentMethods } = useCrmContext();
  const { socket, setActiveConversationId, getUnreadCount } = useNotification();
  const tenantId = tenant?.id;
  const activeConversationRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const [activeAction, setActiveAction] = useState('order'); // 'order' | 'reservation'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orderIdToView, setOrderIdToView] = useState(null);

  // Responsive: Close sidebar on mobile when conversation is selected
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        if (activeConversation) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation]);

  // Handle conversation selection with mobile logic
  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    setActiveConversationId(conversation._id); // Mark as active in global context
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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

  const handleBackToInbox = () => {
    setActiveConversation(null);
    setActiveConversationId(null); // Clear active conversation in global context
    setIsSidebarOpen(true);
    setIsActionPanelOpen(false);
  };


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
    if (tenantId && socket) {
      // Fetch initial conversations
      getConversations().then(setConversations).catch(console.error);

      // Listen to socket events (socket is managed globally)
      socket.on('newMessage', (message) => {
        console.log('📩 New message received:', message);
        // If the message belongs to the active conversation, update the state
        const currentConversation = activeConversationRef.current;
        if (currentConversation && message.conversationId === currentConversation._id) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
        // Refresh conversation list to update last message
        getConversations().then(setConversations).catch(console.error);
      });

      socket.on('assistantStatus', (payload) => {
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
        if (socket) {
          socket.off('newMessage');
          socket.off('assistantStatus');
        }
      };
    }
  }, [tenantId, socket]);

  const sendMessage = (content) => {
    if (!socket || !socket.connected) {
      console.error('❌ Socket not connected');
      return;
    }
    if (!activeConversation) return;

    const messagePayload = {
      conversationId: activeConversation._id,
      content: content.trim(),
    };

    console.log('📤 Sending message:', messagePayload);
    socket.emit('sendMessage', messagePayload);

    // Optimistically add message to UI
    const optimisticMessage = {
      content: content.trim(),
      sender: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage('');
  };

  const handleSendPaymentMethods = async () => {
    if (!paymentMethods || paymentMethods.length === 0) {
      alert('No hay métodos de pago configurados.');
      return;
    }
    if (!activeConversation) return;

    const rows = paymentMethods
      .filter(m => m.isActive)
      .map(m => {
        let description = '';
        if (m.type === 'mobile_payment') {
          description = `${m.details.bank} - ${m.details.phone}`;
        } else if (m.type === 'zelle') {
          description = m.details.email;
        } else if (m.type === 'transfer') {
          description = `${m.details.bankName} - ${m.details.accountNumber?.slice(-4)}`;
        }
        return {
          id: `payment_${m._id || m.type}_${Date.now()}`,
          title: m.name.substring(0, 24),
          description: description.substring(0, 72)
        };
      });

    if (rows.length === 0) return;

    try {
      await api.post('/chat/messages/interactive', {
        conversationId: activeConversation._id,
        body: "Por favor seleccione un método de pago para ver los detalles:",
        action: {
          button: "Ver Métodos",
          sections: [
            {
              title: "Métodos Disponibles",
              rows: rows
            }
          ]
        },
        header: "Métodos de Pago",
        footer: "Seleccione una opción"
      });
    } catch (err) {
      console.error("Error sending interactive message:", err);
      toast.error("Error al enviar métodos de pago. Verifique consola.");
    }
  };

  const handleShareStorefront = async () => {
    if (!activeConversation) return;

    try {
      // Fetch storefront config to get the domain
      const response = await api.get('/storefront');
      const storefrontConfig = response.data || response;

      if (!storefrontConfig || !storefrontConfig.domain) {
        toast.error('No se ha configurado el storefront aún. Por favor configúralo primero en Configuración > Storefront.');
        return;
      }

      if (!storefrontConfig.isActive) {
        toast.warning('El storefront está desactivado. Actívalo en Configuración > Storefront.');
      }

      // Build the production storefront URL using the tenant's subdomain
      const storefrontUrl = `https://${storefrontConfig.domain}.smartkubik.com`;

      // Get the custom message template or use default
      const welcomeMessage = storefrontConfig.whatsappIntegration?.welcomeMessage ||
        `¡Hola! 👋\n\nTe comparto el enlace a nuestra tienda online donde puedes ver todos nuestros productos y hacer tu pedido:\n\n${storefrontUrl}\n\n¿En qué puedo ayudarte?`;

      // Replace any {storefrontUrl} placeholder in the welcome message
      const finalMessage = welcomeMessage.includes('{storefrontUrl}')
        ? welcomeMessage.replace('{storefrontUrl}', storefrontUrl)
        : welcomeMessage.includes(storefrontUrl)
          ? welcomeMessage
          : `${welcomeMessage}\n\n${storefrontUrl}`;

      // Send the message via socket (this will make the URL clickable in WhatsApp)
      sendMessage(finalMessage);
      toast.success('Enlace del storefront enviado');
    } catch (err) {
      console.error("Error sharing storefront:", err);

      // Check if it's a 404 error (storefront not configured)
      if (err?.response?.status === 404 || err?.message?.includes('404') || err?.message?.includes('not found')) {
        toast.error('No se ha configurado el storefront. Por favor configúralo primero.');
      } else {
        toast.error('Error al enviar el enlace del storefront');
      }
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  const activeAssistantStatus = activeConversation
    ? assistantStatuses[activeConversation._id]
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground font-sans rounded-lg border border-border shadow-sm md:flex-row">
      {/* Conversations Sidebar */}
      <div className={`${isSidebarOpen ? 'flex' : 'hidden'} w-full flex-shrink-0 flex-col border-border bg-card border-b md:h-full md:w-80 md:border-b-0 md:border-r lg:w-96 transition-all duration-300 ease-in-out`}>
        <div className="border-border border-b p-4 flex-shrink-0 sticky top-0 z-20 bg-card flex justify-between items-center">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversations.map(convo => (
            <div
              key={convo._id}
              onClick={() => handleSelectConversation(convo)}
              className={`p-4 cursor-pointer hover:bg-muted transition-colors flex items-center gap-3 ${activeConversation?._id === convo._id ? 'bg-muted' : ''}`}
            >
              <Avatar>
                <AvatarImage src={convo.avatar || convo.profilePicUrl} />
                <AvatarFallback>{getInitials(convo.customerName || convo.customerPhoneNumber)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{convo.customerName || convo.customerPhoneNumber}</p>
                  {getUnreadCount(convo._id) > 0 && (
                    <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px] h-5 min-w-5 flex items-center justify-center">
                      {getUnreadCount(convo._id) > 99 ? '99+' : getUnreadCount(convo._id)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{convo.messages?.[0]?.content || 'No messages yet'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={`${!isSidebarOpen || activeConversation ? 'flex' : 'hidden md:flex'} w-full flex-1 min-h-0 flex-col transition-all duration-300`}>
        {activeConversation ? (
          <>
            {/* Chat Header - Sticky */}
            <div className="bg-card border-b border-border p-4 flex-shrink-0 sticky top-0 z-20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={handleBackToInbox}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Cerrar lista" : "Abrir lista"}>
                  <Menu className="h-5 w-5" />
                </Button>

                <Avatar>
                  <AvatarImage src={activeConversation.avatar || activeConversation.profilePicUrl} />
                  <AvatarFallback>{getInitials(activeConversation.customerName || activeConversation.customerPhoneNumber)}</AvatarFallback>
                </Avatar>

                <h2 className="text-xl font-bold truncate">{activeConversation.customerName || activeConversation.customerPhoneNumber}</h2>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setActiveAction('order'); setIsActionPanelOpen(true); }}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Orden</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setActiveAction('reservation'); setIsActionPanelOpen(true); }}>
                  <Calendar className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Reserva</span>
                </Button>
              </div>
            </div>

            {/* Messages Container - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-muted/50">
              {loading ? (
                <div className="flex justify-center p-4">Loading messages...</div>
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
                        {msg.metadata?.action === 'order_created' && msg.metadata?.data?.orderId && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2 w-full gap-2 bg-background/50 hover:bg-background/80 text-foreground border shadow-sm"
                            onClick={() => {
                              setOrderIdToView(msg.metadata.data.orderId);
                              setActiveAction('order');
                              setIsActionPanelOpen(true);
                            }}
                          >
                            <ShoppingBag className="h-4 w-4" />
                            Ver Orden
                          </Button>
                        )}
                        <p className="text-[10px] opacity-70 text-right mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
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
              {/* Actions Bar */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Emojis">
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="grid grid-cols-5 gap-2">
                      {COMMON_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addEmoji(emoji)}
                          className="text-xl hover:bg-muted p-2 rounded cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShareStorefront}
                  title="Compartir Enlace de Tienda"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Storefront
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendPaymentMethods}
                  title="Enviar Métodos de Pago"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Datos Pago
                </Button>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted/50">
            <p className="text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* Action Panel */}
      <ActionPanel
        isOpen={isActionPanelOpen}
        onClose={() => {
          setIsActionPanelOpen(false);
          setOrderIdToView(null);
        }}
        activeAction={activeAction}
        onActionChange={setActiveAction}
        activeConversation={activeConversation}
        tenant={tenant}
        initialOrderId={orderIdToView}
      />
    </div>
  );
};

export default WhatsAppInbox;
