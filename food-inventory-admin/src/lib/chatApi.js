import api from './api';

export const getConversations = async () => {
  try {
    const response = await api.get('/chat/conversations');
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// We will also need an endpoint to get messages for a conversation
export const getMessagesForConversation = async (conversationId) => {
    try {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching messages for conversation ${conversationId}:`, error);
        throw error;
    }
};
