import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentShift, clockIn, clockOut } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

const ShiftContext = createContext(null);

export const ShiftProvider = ({ children }) => {
  const [activeShift, setActiveShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchCurrentShift = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await getCurrentShift();
      if (response.success) {
        setActiveShift(response.data);
      } else {
        setActiveShift(null);
      }
    } catch (error) {
      // No-op, it's fine if there's no active shift
      setActiveShift(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const handleClockIn = async () => {
    try {
      const response = await clockIn();
      if (response.success) {
        toast.success('Turno iniciado exitosamente');
        setActiveShift(response.data);
      } else {
        toast.error('Error al iniciar turno', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red al iniciar turno', { description: error.message });
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await clockOut();
      if (response.success) {
        toast.success('Turno finalizado exitosamente');
        setActiveShift(null);
      } else {
        toast.error('Error al finalizar turno', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red al finalizar turno', { description: error.message });
    }
  };

  const value = {
    activeShift,
    isLoading,
    isClockedIn: !!activeShift,
    clockIn: handleClockIn,
    clockOut: handleClockOut,
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};
