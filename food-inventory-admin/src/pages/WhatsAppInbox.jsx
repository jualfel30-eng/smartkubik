import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getConversations, getMessagesForConversation } from '../lib/chatApi';
import { useAuth } from '../hooks/use-auth';
import { useToast } from '../components/ui/use-toast';
import { createScopedLogger } from '../lib/logger';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://api.smartkubik.com';
const logger = createScopedLogger('WhatsAppInbox');

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { tenant } = useAuth();
  const { toast } = useToast();
  const tenantId = tenant?.id;
  const socket = useRef(null);
  const activeConversationIdRef = useRef(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversation?._id ?? null;
  }, [activeConversation]);

  useEffect(() => {
    if (!tenantId) {
      return undefined;
    }

    let isMounted = true;

    const loadConversations = async () => {
      try {
        const data = await getConversations();
        if (isMounted) {
          setConversations(data);
        }
      } catch (error) {
        logger.error('Unable to load conversations', { message: error?.message });
        toast({
          title: 'No se pudieron cargar las conversaciones',
          description: 'Intenta recargar la página o vuelve más tarde.',
          variant: 'destructive',
        });
      }
    };

    loadConversations();

    const client = io(`${SOCKET_URL}/chat`, {
      query: { tenantId },
      transports: ['websocket', 'polling'],
    });

    socket.current = client;
    logger.info('Opening chat socket connection', { tenantId });

    client.on('connect', () => {
      logger.info('Chat socket connected', { socketId: client.id });
    });

    client.on('disconnect', (reason) => {
      logger.warn('Chat socket disconnected', { reason });
      toast({
        title: 'Conexión con el chat interrumpida',
        description: 'Intentaremos reconectar automáticamente.',
        variant: 'destructive',
      });
    });

    client.on('connect_error', (error) => {
      logger.error('Chat socket connection error', { message: error?.message });
      toast({
        title: 'No se pudo conectar con el chat',
        description: 'Reintentaremos en unos segundos.',
        variant: 'destructive',
      });
    });

    client.on('error', (error) => {
      logger.error('Chat socket error', { message: error?.message });
    });

    client.on('newMessage', (message) => {
      logger.debug('Incoming chat message', {
        conversationId: message?.conversationId,
        sender: message?.sender,
      });

      if (activeConversationIdRef.current && message?.conversationId === activeConversationIdRef.current) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    return () => {
      isMounted = false;
      client.removeAllListeners();
      client.disconnect();
      logger.info('Closed chat socket connection');
    };
  }, [tenantId, toast]);

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    setLoading(true);

    try {
      const fetchedMessages = await getMessagesForConversation(conversation._id);
      setMessages(fetchedMessages);
    } catch (error) {
      logger.error('Unable to load conversation messages', {
        conversationId: conversation?._id,
        message: error?.message,
      });
      toast({
        title: 'No se pudieron cargar los mensajes',
        description: 'Revisa tu conexión e intenta nuevamente.',
        variant: 'destructive',
      });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage = newMessage.trim();

    if (!socket.current || !socket.current.connected) {
      logger.error('Cannot send message because socket is unavailable');
      toast({
        title: 'No hay conexión con el chat',
        description: 'Espera a que se restablezca la conexión.',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedMessage) {
      logger.warn('Attempted to send an empty message');
      toast({
        title: 'Escribe un mensaje',
        description: 'No puedes enviar un mensaje vacío.',
      });
      return;
    }

    if (!activeConversation) {
      logger.error('Cannot send message without an active conversation');
      toast({
        title: 'Selecciona una conversación',
        description: 'Elige un chat antes de enviar mensajes.',
      });
      return;
    }

    const messagePayload = {
      conversationId: activeConversation._id,
      content: trimmedMessage,
    };

    logger.debug('Dispatching outbound chat message', {
      conversationId: messagePayload.conversationId,
    });

    socket.current.emit('sendMessage', messagePayload);

    const optimisticMessage = {
      content: trimmedMessage,
      sender: 'user',
      createdAt: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    setNewMessage('');
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      {/* Conversations Sidebar */}
      <div className="w-1/4 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.map((convo) => (
            <div
              key={convo._id}
              onClick={() => handleSelectConversation(convo)}
              className={`p-4 cursor-pointer hover:bg-muted ${activeConversation?._id === convo._id ? 'bg-muted' : ''}`}
            >
              <p className="font-semibold">{convo.customerName || convo.customerPhoneNumber}</p>
              <p className="text-sm text-muted-foreground truncate">{convo.messages?.[0]?.content || 'No messages yet'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <div className="bg-card p-4 border-b border-border">
              <h2 className="text-xl font-bold">{activeConversation.customerName || activeConversation.customerPhoneNumber}</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-muted/50">
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
                    <div key={index} className={`flex mb-3 ${alignmentClass}`}>
                      <div className={`max-w-lg px-4 py-2 rounded-lg shadow-sm ${bubbleClass}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="bg-card p-4 border-t border-border">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 bg-transparent border border-input rounded-l-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 focus:outline-none">
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/50">
            <p className="text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
