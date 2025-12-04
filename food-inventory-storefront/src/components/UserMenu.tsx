'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  domain: string;
}

export function UserMenu({ domain }: UserMenuProps) {
  const { customer, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isAuthenticated) {
    return (
      <Link
        href={`/${domain}/login`}
        className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
      >
        <LogIn className="w-5 h-5" />
        <span className="text-sm font-medium">Iniciar Sesión</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
      >
        <User className="w-5 h-5" />
        <span className="text-sm font-medium">{customer?.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <Link
            href={`/${domain}/perfil`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Mi Perfil
          </Link>
          <Link
            href={`/${domain}/mis-ordenes`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Mis Órdenes
          </Link>
          <hr className="my-1" />
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}
