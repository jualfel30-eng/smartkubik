import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export function useImportWebSocket(userId) {
  const [progress, setProgress] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [wsError, setWsError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const socket = io(`${baseUrl}/data-import`, {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[DataImport WS] Connected');
    });

    socket.on('import:progress', (data) => {
      setProgress(data);
    });

    socket.on('import:complete', (data) => {
      setIsComplete(true);
      setCompletionResult(data);
      setProgress((prev) => prev ? { ...prev, percentComplete: 100 } : prev);
    });

    socket.on('import:failed', (data) => {
      setWsError(data.error || 'Error en la importación');
    });

    socket.on('disconnect', () => {
      console.log('[DataImport WS] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const resetWs = useCallback(() => {
    setProgress(null);
    setIsComplete(false);
    setCompletionResult(null);
    setWsError(null);
  }, []);

  return {
    progress,
    isComplete,
    completionResult,
    wsError,
    resetWs,
  };
}
