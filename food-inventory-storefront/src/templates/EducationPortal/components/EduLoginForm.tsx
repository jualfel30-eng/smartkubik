'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEducationAuth } from '@/contexts/EducationAuthContext';
import type { EduPublicConfig } from '../types';

interface EduLoginFormProps {
  config: EduPublicConfig;
  domain: string;
}

type UserType = 'student' | 'teacher';

export default function EduLoginForm({ config, domain }: EduLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStudent, loginTeacher, isAuthenticated, isStudent, isTeacher } = useEducationAuth();

  const [userType, setUserType] = useState<UserType>(
    (searchParams.get('type') as UserType) || 'student'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      if (isTeacher) router.push(`/${domain}/education/teacher`);
      else if (isStudent) router.push(`/${domain}/education/student`);
    }
  }, [isAuthenticated, isStudent, isTeacher, router, domain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (userType === 'student') {
        await loginStudent(email, password, domain);
        router.push(`/${domain}/education/student`);
      } else {
        await loginTeacher(email, password);
        router.push(`/${domain}/education/teacher`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciales incorrectas. Por favor, intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputWrapStyle: React.CSSProperties = {
    marginBottom: '24px',
    borderBottom: '1px solid var(--edu-gray-300)',
    paddingBottom: '12px',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--edu-gray-500)',
    display: 'block',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--edu-gray-900)',
    outline: 'none',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 'clamp(40px, 6vw, 80px)',
      maxWidth: '420px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Logo */}
      {config.logoUrl && (
        <img
          src={config.logoUrl}
          alt={config.institutionName}
          style={{ height: '48px', objectFit: 'contain', marginBottom: '32px', alignSelf: 'center' }}
        />
      )}

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '32px',
        color: 'var(--edu-navy)',
        margin: '0 0 8px',
      }}>
        Bienvenido de vuelta
      </h1>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        color: 'var(--edu-gray-500)',
        margin: '0 0 40px',
      }}>
        {config.institutionName}
      </p>

      {/* Toggle Estudiante / Docente */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        background: 'var(--edu-gray-100)',
        borderRadius: '100px',
        padding: '4px',
      }}>
        {(['student', 'teacher'] as UserType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setUserType(type)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '100px',
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              background: userType === type ? 'var(--edu-navy)' : 'transparent',
              color: userType === type ? 'white' : 'var(--edu-gray-500)',
              transition: 'background 200ms ease, color 200ms ease',
              cursor: 'pointer',
            }}
          >
            {type === 'student' ? 'Estudiante' : 'Docente'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={inputWrapStyle}>
          <label style={labelStyle} htmlFor="edu-email">Email</label>
          <input
            id="edu-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ ...inputWrapStyle, position: 'relative' }}>
          <label style={labelStyle} htmlFor="edu-password">Contraseña</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="edu-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ ...inputStyle, paddingRight: '32px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--edu-gray-400)',
                padding: '4px',
                position: 'absolute',
                right: 0,
              }}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1l16 16M8 4a5 5 0 016.5 6.5M2.5 6A9 9 0 0116 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--edu-danger-bg)',
            border: '1px solid var(--edu-danger)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '24px',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--edu-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="edu-btn edu-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10"/>
              </svg>
              Iniciando sesión...
            </span>
          ) : 'Iniciar Sesión'}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
