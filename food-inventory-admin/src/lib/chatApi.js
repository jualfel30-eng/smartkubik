import { fetchApi } from './api';

const API_PREFIX = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const getConversations = async () => {
  try {
    const data = await fetchApi(`${API_PREFIX}/chat/conversations`);
    return data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// We will also need an endpoint to get messages for a conversation
export const getMessagesForConversation = async (conversationId) => {
    try {
        const data = await fetchApi(`${API_PREFIX}/chat/conversations/${conversationId}/messages`);
        return data;
    } catch (error) {
        console.error(`Error fetching messages for conversation ${conversationId}:`, error);
        throw error;
    }
};
