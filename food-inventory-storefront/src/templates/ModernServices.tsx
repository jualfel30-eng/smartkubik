'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';

interface ModernServicesProps {
  config: {
    tenantId: string;
    name: string;
    description: string;
    logo: string;
    services: Array<{
      _id: string;
      name: string;
      description: string;
      image: string;
      category: string;
    }>;
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
    };
    team?: Array<{
      name: string;
      role: string;
      photo: string;
      bio: string;
    }>;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      whatsapp?: string;
    };
    contactInfo: {
      phone: string;
      email: string;
      address?: string | {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
      };
    };
    externalLinks?: {
      reserveWithGoogle?: string;
      whatsapp?: string;
    };
  };
  domain?: string;
}

export default function ModernServices({ config, domain }: ModernServicesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(config.services.map(s => s.category))];
  const filteredServices = selectedCategory === 'all'
    ? config.services
    : config.services.filter(s => s.category === selectedCategory);

  const primaryColor = config?.theme?.primaryColor || '#1d4ed8';
  const secondaryColor = config?.theme?.secondaryColor || '#2563eb';
  const themeStyle: CSSProperties = {
    '--color-primary': primaryColor,
    '--color-secondary': secondaryColor,
  } as CSSProperties;

  return (
    <div className="min-h-screen" style={themeStyle}>
      {/* Header con Logo y Navegación */}
      <header className="sticky top-0 bg-white shadow-md z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {config.logo && (
              <Image 
                src={config.logo} 
                alt={config.name} 
                width={50} 
                height={50}
                className="rounded-full"
              />
            )}
            <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {config.name}
            </span>
          </div>

          <div className="flex gap-6">
            <a href="#servicios" className="hover:text-primary transition">Servicios</a>
            <a href="#equipo" className="hover:text-primary transition">Equipo</a>
            <a href="#contacto" className="hover:text-primary transition">Contacto</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        className="text-white py-20"
        style={{
          backgroundImage: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">{config.name}</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">{config.description}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="#contacto" 
              className="bg-white text-primary px-8 py-3 rounded-full font-semibold hover:bg-opacity-90 transition inline-block"
            >
              Contáctanos Ahora
            </a>
            {domain && (
              <a
                href={`/${domain}/book`}
                className="bg-transparent border border-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-primary transition inline-block"
              >
                Reservar en Línea
              </a>
            )}
            {config.externalLinks?.reserveWithGoogle && (
              <a
                href={config.externalLinks.reserveWithGoogle}
                className="bg-white/20 border border-white/60 px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-primary transition inline-block"
                target="_blank"
                rel="noreferrer"
              >
                Reservar con Google
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Nuestros Servicios</h2>

          {/* Filtros de Categorías */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full transition ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Grid de Servicios */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map(service => (
              <div 
                key={service._id} 
                className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition"
              >
                {service.image && (
                  <div className="relative h-64">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-2xl font-semibold mb-2">{service.name}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <a 
                    href="#contacto" 
                    className="text-primary font-semibold hover:underline"
                  >
                    Más información →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section (Opcional) */}
      {config.team && config.team.length > 0 && (
        <section id="equipo" className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Nuestro Equipo</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {config.team.map((member, idx) => (
                <div key={idx} className="text-center">
                  <div className="relative w-48 h-48 mx-auto mb-4">
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-primary font-medium mb-2">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contacto" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-12">Contáctanos</h2>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Información de Contacto */}
            <div>
              <h3 className="text-2xl font-semibold mb-6">Información</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-primary text-xl">📞</span>
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <a href={`tel:${config.contactInfo.phone}`} className="text-gray-600 hover:text-primary">
                      {config.contactInfo.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-primary text-xl">✉️</span>
                  <div>
                    <p className="font-medium">Email</p>
                    <a href={`mailto:${config.contactInfo.email}`} className="text-gray-600 hover:text-primary">
                      {config.contactInfo.email}
                    </a>
                  </div>
                </div>

                {config.externalLinks?.whatsapp && (
                  <div className="flex items-start gap-3">
                    <span className="text-primary text-xl">💬</span>
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <a
                        href={config.externalLinks.whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-600 hover:text-primary"
                      >
                        Escríbenos por WhatsApp
                      </a>
                    </div>
                  </div>
                )}

                {config.contactInfo.address && (
                  <div className="flex items-start gap-3">
                    <span className="text-primary text-xl">📍</span>
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-gray-600">
                        {typeof config.contactInfo.address === 'string'
                          ? config.contactInfo.address
                          : [
                              config.contactInfo.address.street,
                              config.contactInfo.address.city,
                              config.contactInfo.address.state,
                              config.contactInfo.address.country,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Redes Sociales */}
              {config.socialMedia && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Síguenos</h3>
                  <div className="flex gap-4">
                    {config.socialMedia.instagram && (
                      <a href={config.socialMedia.instagram} target="_blank" rel="noopener" className="text-3xl hover:text-primary transition">
                        📷
                      </a>
                    )}
                    {config.socialMedia.facebook && (
                      <a href={config.socialMedia.facebook} target="_blank" rel="noopener" className="text-3xl hover:text-primary transition">
                        👥
                      </a>
                    )}
                    {config.socialMedia.whatsapp && (
                      <a href={`https://wa.me/${config.socialMedia.whatsapp}`} target="_blank" rel="noopener" className="text-3xl hover:text-primary transition">
                        💬
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de Contacto */}
            <form className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Nombre</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Mensaje</label>
                <textarea 
                  rows={4} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 {config.name}. Todos los derechos reservados.</p>
          <p className="text-gray-400 text-sm mt-2">Powered by Food Inventory SaaS</p>
        </div>
      </footer>
    </div>
  );
}
