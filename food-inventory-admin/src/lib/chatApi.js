import axios from 'axios';

// This should be in a global config file
const API_BASE_URL = 'http://localhost:3000/api/v1';

const getAuthToken = () => {
  // In a real app, you would get this from localStorage, cookies, or a state management library
  return localStorage.getItem('accessToken'); 
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getConversations = async () => {
  try {
    const response = await apiClient.get('/chat/conversations');
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// We will also need an endpoint to get messages for a conversation
export const getMessagesForConversation = async (conversationId) => {
    try {
        const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching messages for conversation ${conversationId}:`, error);
        throw error;
    }
};
