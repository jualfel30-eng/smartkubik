import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchApi } from '@/lib/api';

const HOUSEKEEPING_TAG = 'housekeeping';

function normalizeTasks(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
}

function ensureTagList(tags = []) {
  const merged = [HOUSEKEEPING_TAG, ...tags];
  return Array.from(new Set(merged.filter(Boolean).map((tag) => String(tag).trim())));
}

export function useHousekeepingTasks({ autoLoad = true } = {}) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const upsertTask = useCallback((task) => {
    if (!task?._id) {
      return;
    }
    setTasks((prev) => {
      const index = prev.findIndex((item) => item._id === task._id);
      if (index === -1) {
        return [...prev, task];
      }
      const next = [...prev];
      next[index] = task;
      return next;
    });
  }, []);

  const removeTask = useCallback((taskId) => {
    setTasks((prev) => prev.filter((item) => item._id !== taskId));
  }, []);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/todos?tags=housekeeping&isCompleted=false');
      const normalized = normalizeTasks(response);
      setTasks(normalized);
    } catch (err) {
      console.error('Error loading housekeeping tasks', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    void loadTasks();
  }, [autoLoad, loadTasks]);

  const tasksByResource = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const resourceId = task.resourceId || task.metadata?.resourceId || null;
      if (!resourceId) {
        return;
      }
      const list = map.get(resourceId) || [];
      list.push(task);
      map.set(resourceId, list);
    });
    return map;
  }, [tasks]);

  const createTask = useCallback(
    async (payload) => {
      const body = {
        ...payload,
        tags: ensureTagList(payload?.tags),
      };
      const response = await fetchApi('/todos', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (response) {
        upsertTask(response);
      }
      return response;
    },
    [upsertTask],
  );

  const updateTask = useCallback(
    async (taskId, payload) => {
      const body = {
        ...payload,
      };
      if (Array.isArray(body.tags)) {
        body.tags = ensureTagList(body.tags);
      }
      const response = await fetchApi(`/todos/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (response) {
        if (response.isCompleted) {
          removeTask(response._id);
        } else {
        upsertTask(response);
      }
      }
      return response;
    },
    [removeTask, upsertTask],
  );

  const deleteTask = useCallback(
    async (taskId) => {
      await fetchApi(`/todos/${taskId}`, { method: 'DELETE' });
      removeTask(taskId);
    },
    [removeTask],
  );

  const markPendingForResource = useCallback(
    async (resourceId, context = {}) => {
      if (!resourceId) {
        return null;
      }
      const resourceTasks = tasksByResource.get(resourceId) || [];
      const activeTask = resourceTasks.find((task) => task && task.isCompleted === false);

      const dueDate =
        context.dueDate ||
        context.nextCheckIn ||
        new Date(Date.now() + 15 * 60 * 1000).toISOString(); // default 15 min in future

      if (activeTask) {
        const requiresUpdate =
          activeTask.isCompleted === true ||
          (dueDate && activeTask.dueDate !== dueDate) ||
          (context.priority && activeTask.priority !== context.priority);

        if (requiresUpdate) {
          return updateTask(activeTask._id, {
            isCompleted: false,
            dueDate,
            priority: context.priority || activeTask.priority || 'medium',
          });
        }
        return activeTask;
      }

      const title = context.title || `Housekeeping - ${context.roomName || resourceId}`;
      return createTask({
        title,
        dueDate,
        tags: ensureTagList(context.tags),
        priority: context.priority || 'medium',
        resourceId,
        appointmentId: context.appointmentId,
      });
    },
    [createTask, tasksByResource, updateTask],
  );

  const markCompletedForResource = useCallback(
    async (resourceId) => {
      if (!resourceId) {
        return;
      }
      const resourceTasks = tasksByResource.get(resourceId) || [];
      const pending = resourceTasks.filter((task) => task && task.isCompleted === false);
      await Promise.all(
        pending.map((task) =>
          updateTask(task._id, {
            isCompleted: true,
            completedAt: new Date().toISOString(),
          }),
        ),
      );
    },
    [tasksByResource, updateTask],
  );

  return {
    tasks,
    tasksByResource,
    isLoading,
    error,
    refresh: loadTasks,
    createTask,
    updateTask,
    deleteTask,
    markPendingForResource,
    markCompletedForResource,
  };
}
