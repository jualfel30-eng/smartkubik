import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { getConversations, getMessagesForConversation } from '../lib/chatApi';
// import { AuthContext } from '../context/AuthContext'; // Assuming this context exists

// Placeholder for AuthContext if it doesn't exist
const AuthContext = React.createContext({ tenantId: 'some-hardcoded-tenant-id', token: 'some-token' });

const SOCKET_URL = 'http://localhost:3000/chat';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { tenantId } = useContext(AuthContext);
  const socket = useRef(null);

  useEffect(() => {
    if (tenantId) {
      // Fetch initial conversations
      getConversations().then(setConversations).catch(console.error);

      // Setup socket connection
      socket.current = io(SOCKET_URL, {
        query: { tenantId },
      });

      socket.current.on('connect', () => console.log('Connected to chat server'));
      socket.current.on('disconnect', () => console.log('Disconnected from chat server'));

      socket.current.on('newMessage', (message) => {
        console.log('New message received:', message);
        // If the message belongs to the active conversation, update the state
        if (activeConversation && message.conversationId === activeConversation._id) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
        // We could also update the conversation list to show a notification
      });

      return () => {
        if (socket.current) socket.current.disconnect();
      };
    }
  }, [tenantId, activeConversation]);

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
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
    if (newMessage.trim() && activeConversation) {
      const messagePayload = {
        conversationId: activeConversation._id,
        content: newMessage,
      };
      socket.current.emit('sendMessage', messagePayload);
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.map(convo => (
            <div key={convo._id} onClick={() => handleSelectConversation(convo)} className={`p-4 cursor-pointer hover:bg-gray-100 ${activeConversation?._id === convo._id ? 'bg-gray-100' : ''}`}>
              <p className="font-semibold">{convo.customerName || convo.customerPhoneNumber}</p>
              <p className="text-sm text-gray-600 truncate">{convo.messages?.[0]?.content || 'No messages yet'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <div className="bg-white p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">{activeConversation.customerName || activeConversation.customerPhoneNumber}</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {loading ? (
                <p>Loading messages...</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`flex mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg px-4 py-2 rounded-lg shadow ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="bg-white p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none">
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
