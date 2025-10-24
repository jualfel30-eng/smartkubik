import { fetchApi } from './api';
import { createScopedLogger } from './logger';

const logger = createScopedLogger('ChatAPI');

export const getConversations = async () => {
  try {
    const data = await fetchApi('/chat/conversations');
    return data;
  } catch (error) {
    logger.error('Failed to fetch conversations', { message: error?.message });
    throw error;
  }
};

export const getMessagesForConversation = async (conversationId) => {
  try {
    const data = await fetchApi(`/chat/conversations/${conversationId}/messages`);
    return data;
  } catch (error) {
    logger.error('Failed to fetch messages for conversation', {
      conversationId,
      message: error?.message,
    });
    throw error;
  }
};
