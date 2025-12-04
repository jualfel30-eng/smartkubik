'use client';

import { ReactNode } from 'react';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartSidebar } from '@/components/CartSidebar';

interface ClientLayoutProps {
  children: ReactNode;
  domain: string;
}

function ClientLayoutInner({ children, domain }: ClientLayoutProps) {
  const { isCartOpen, closeCart } = useCart();

  return (
    <>
      {children}
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} domain={domain} />
    </>
  );
}

export function ClientLayout({ children, domain }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <ClientLayoutInner domain={domain}>
          {children}
        </ClientLayoutInner>
      </CartProvider>
    </AuthProvider>
  );
}
