'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Simular envío (aquí integrarías con tu servicio de newsletter)
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
          <Mail className="h-8 w-8 text-white" />
        </div>

        {/* Content */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Suscríbete a nuestro newsletter
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
          Recibe las últimas novedades, ofertas exclusivas y promociones especiales
          directamente en tu correo
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico"
              required
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-4 bg-white text-[var(--primary-color)] font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Enviando...' : 'Suscribirse'}
            </button>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <p className="mt-4 text-white font-medium">
              ¡Gracias por suscribirte! 🎉
            </p>
          )}
          {status === 'error' && (
            <p className="mt-4 text-white font-medium">
              Ocurrió un error. Por favor, intenta de nuevo.
            </p>
          )}
        </form>

        {/* Privacy note */}
        <p className="mt-6 text-white/70 text-sm">
          No compartimos tu información. Puedes cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </section>
  );
}
