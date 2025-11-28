import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadReservations = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/reservations${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setReservations(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setReservations([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReservation = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCalendar = useCallback(async (month) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/calendar?month=${month}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAvailability = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/reservations/check-availability', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createReservation = async (reservationData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData),
      });
      await loadReservations();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateReservation = async (id, reservationData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reservationData),
      });
      await loadReservations();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteReservation = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/reservations/${id}`, { method: 'DELETE' });
      setReservations(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmReservation = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/${id}/confirm`, {
        method: 'PATCH',
      });
      await loadReservations();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const seatReservation = async (id, seatData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/${id}/seat`, {
        method: 'PATCH',
        body: JSON.stringify(seatData),
      });
      await loadReservations();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markNoShow = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/reservations/${id}/no-show`, {
        method: 'PATCH',
      });
      await loadReservations();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/reservations/settings');
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (settingsData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/reservations/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData),
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    reservations,
    loading,
    error,
    loadReservations,
    getReservation,
    getCalendar,
    checkAvailability,
    createReservation,
    updateReservation,
    deleteReservation,
    confirmReservation,
    seatReservation,
    markNoShow,
    getSettings,
    updateSettings,
  };
};
