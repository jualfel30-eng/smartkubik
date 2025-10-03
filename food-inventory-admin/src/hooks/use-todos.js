import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';

export const useTodos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/todos');
      setTodos(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Error fetching todos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (todoData) => {
    try {
      const newTodo = await fetchApi('/todos', {
        method: 'POST',
        body: JSON.stringify(todoData),
      });
      setTodos(prevTodos => [newTodo, ...prevTodos]);
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      const updatedTodo = await fetchApi(`/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setTodos(prevTodos => 
        prevTodos.map(todo => (todo._id === id ? updatedTodo : todo))
      );
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await fetchApi(`/todos/${id}`, { method: 'DELETE' });
      setTodos(prevTodos => prevTodos.filter(todo => todo._id !== id));
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  return { todos, loading, error, addTodo, updateTodo, deleteTodo, refetch: fetchTodos };
};