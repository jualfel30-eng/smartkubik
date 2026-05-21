'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { TOKEN_STORAGE_KEY, loginStudent as apiLoginStudent, loginTeacher as apiLoginTeacher } from '@/lib/educationApi';

interface EducationUser {
  type: 'edu_student' | 'teacher';
  id: string;
  name: string;
  tenantId: string;
  academicYear?: string;
  role?: string;
}

interface EducationAuthContextValue {
  user: EducationUser | null;
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  loginStudent: (email: string, password: string, domain: string) => Promise<void>;
  loginTeacher: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const EducationAuthContext = createContext<EducationAuthContextValue | null>(null);

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function buildUser(payload: Record<string, unknown>): EducationUser | null {
  if (!payload) return null;
  if (payload.type === 'edu_student') {
    return {
      type: 'edu_student',
      id: payload.studentId as string || payload.sub as string,
      name: payload.name as string || '',
      tenantId: payload.tenantId as string || '',
      academicYear: payload.academicYear as string | undefined,
    };
  }
  const roleName = (payload.role as { name?: string })?.name || payload.roleName as string;
  if (roleName === 'TEACHER' || payload.sub) {
    return {
      type: 'teacher',
      id: payload.sub as string,
      name: payload.name as string || payload.email as string || '',
      tenantId: payload.tenantId as string || '',
      role: roleName,
    };
  }
  return null;
}

export function EducationAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EducationUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      const payload = decodeJwt(token);
      if (payload && (payload.exp as number) * 1000 > Date.now()) {
        setUser(buildUser(payload));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }, []);

  const loginStudent = useCallback(async (email: string, password: string, domain: string) => {
    const res = await apiLoginStudent(email, password, domain);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
    const payload = decodeJwt(res.access_token);
    if (payload) setUser(buildUser(payload));
  }, []);

  const loginTeacher = useCallback(async (email: string, password: string) => {
    const res = await apiLoginTeacher(email, password);
    const payload = decodeJwt(res.access_token);
    if (!payload) throw new Error('Token inválido');
    const roleName = (payload.role as { name?: string })?.name || payload.roleName as string;
    if (roleName !== 'TEACHER') throw new Error('Esta cuenta no tiene rol de docente.');
    localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
    setUser(buildUser(payload));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <EducationAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isStudent: user?.type === 'edu_student',
      isTeacher: user?.type === 'teacher',
      loginStudent,
      loginTeacher,
      logout,
    }}>
      {children}
    </EducationAuthContext.Provider>
  );
}

export function useEducationAuth() {
  const ctx = useContext(EducationAuthContext);
  if (!ctx) throw new Error('useEducationAuth must be used inside EducationAuthProvider');
  return ctx;
}
