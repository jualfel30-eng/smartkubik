import { fetchApi } from './api';

export const getConversations = async () => {
  try {
    const data = await fetchApi('/chat/conversations');
    return data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

export const getMessagesForConversation = async (conversationId) => {
  try {
    const data = await fetchApi(`/chat/conversations/${conversationId}/messages`);
    return data;
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
};
