import React, { useEffect, useRef, useState } from 'react';
import { Globe, Settings, DollarSign, Smartphone, Palette, CreditCard, Link2, BarChart3, RefreshCw, Store, Calendar, UtensilsCrossed, Hotel, Factory, Truck } from 'lucide-react';

/**
 * SECCIÓN: TU WEB DE VENTAS
 * Nueva sección 6 para el homepage de SmartKubik
 * Destaca la generación automática de páginas web conectadas al ERP
 */

const WebVentasSection = ({ language = 'es' }) => {
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    // Intersection Observer para animaciones al scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    const content = {
        es: {
            preHeadline: "Incluido sin costo extra",
            headline: "Tu Negocio Abierto 24/7. Tu Web Vende Por Ti.",
            subheadline: "SmartKubik genera automáticamente tu página web conectada al sistema. Tus clientes compran productos, reservan servicios o agendan citas — sin que tú levantes un dedo. Todo sincronizado en tiempo real.",
            badge: "Se genera automáticamente",
            steps: {
                title: "Cómo Funciona",
                items: [
                    {
                        icon: Settings,
                        number: "1",
                        title: "Configura tu negocio",
                        description: "Agrega tus productos, servicios, o define tu disponibilidad en SmartKubik."
                    },
                    {
                        icon: Globe,
                        number: "2",
                        title: "Tu web se genera sola",
                        description: "Automáticamente obtienes una página web profesional con todo tu catálogo o agenda."
                    },
                    {
                        icon: DollarSign,
                        number: "3",
                        title: "Vende mientras duermes",
                        description: "Tus clientes compran o reservan 24/7. Tú recibes notificaciones y el sistema hace el resto."
                    }
                ]
            },
            benefits: [
                {
                    icon: RefreshCw,
                    title: "Sincronización en Tiempo Real",
                    description: "Si vendes en tienda, tu web se actualiza. Si alguien reserva online, tu agenda se bloquea. Nunca sobrevender."
                },
                {
                    icon: Palette,
                    title: "Diseño Profesional",
                    description: "No necesitas diseñador. Tu web se ve moderna, rápida, y lista para convertir visitantes en clientes."
                },
                {
                    icon: CreditCard,
                    title: "Pagos Integrados",
                    description: "Tus clientes pagan online. El dinero llega a tu cuenta. La factura se genera automáticamente."
                },
                {
                    icon: Smartphone,
                    title: "100% Responsive",
                    description: "Funciona perfecto en celular, tablet y computadora. Porque tus clientes compran desde cualquier lugar."
                },
                {
                    icon: Link2,
                    title: "Tu Dominio",
                    description: "Usa tu propio dominio (tuempresa.com) o un subdominio gratuito. Tú eliges."
                },
                {
                    icon: BarChart3,
                    title: "Analytics Incluido",
                    description: "Sabe cuántas visitas tienes, qué productos ven más, y dónde abandonan. Optimiza sin adivinar."
                }
            ],
            verticals: {
                title: "Lo que tu cliente ve, según tu tipo de negocio:",
                items: [
                    {
                        icon: Store,
                        title: "Tiendas",
                        emoji: "🛍️",
                        tenant: "Tienda Online Completa",
                        customer: "Ver catálogo, agregar al carrito, pagar, recibir confirmación, rastrear pedido"
                    },
                    {
                        icon: Calendar,
                        title: "Servicios",
                        emoji: "💼",
                        tenant: "Agenda de Citas Online",
                        customer: "Ver disponibilidad, elegir servicio, seleccionar hora, pagar o reservar, recibir recordatorio"
                    },
                    {
                        icon: UtensilsCrossed,
                        title: "Restaurantes",
                        emoji: "🍽️",
                        tenant: "Página de Reservaciones",
                        customer: "Ver disponibilidad de mesas, elegir fecha/hora/personas, recibir confirmación por WhatsApp"
                    },
                    {
                        icon: Hotel,
                        title: "Hoteles",
                        emoji: "🏨",
                        tenant: "Motor de Reservas Directo",
                        customer: "Ver habitaciones disponibles, elegir fechas, pagar depósito, recibir confirmación"
                    },
                    {
                        icon: Factory,
                        title: "Manufactura/Mayoreo",
                        emoji: "🏭",
                        tenant: "Portal de Pedidos B2B",
                        customer: "Ver catálogo mayorista, hacer pedidos, ver historial, repetir pedidos anteriores"
                    },
                    {
                        icon: Truck,
                        title: "Logística",
                        emoji: "🚚",
                        tenant: "Portal de Tracking",
                        customer: "Rastrear envíos, solicitar recolección, ver historial de entregas"
                    }
                ]
            },
            comparison: {
                title: "Sin SmartKubik vs. Con SmartKubik",
                without: [
                    "Contratar diseñador web ($500-2,000)",
                    "Contratar programador ($1,000-5,000)",
                    "Pagar Shopify/Wix/Squarespace ($30-300/mes)",
                    "Integrar inventario manualmente",
                    "Actualizar disponibilidad a mano",
                    "Procesar pagos por separado",
                    "Enviar confirmaciones manualmente"
                ],
                with: [
                    "Se genera automáticamente",
                    "Incluido, sin código",
                    "Incluido sin costo extra",
                    "Sincronizado en tiempo real",
                    "Se actualiza solo",
                    "Pagos integrados",
                    "Automático por email y WhatsApp"
                ],
                savings: "Valor incluido: $3,000+ en desarrollo + $300/mes en herramientas",
                savingsSubtext: "Todo incluido en tu suscripción SmartKubik."
            },
            emotional: {
                text: "Imagina despertar con 3 ventas nuevas, 2 reservas confirmadas, y $500 en tu cuenta.",
                subtext: "Todo pasó mientras dormías. Tu web de SmartKubik nunca cierra."
            },
            ctas: {
                primary: "Ver Ejemplo de Tienda Online",
                secondary: "Ver Ejemplo de Agenda de Citas",
                microcopy: "Ejemplos reales de negocios usando SmartKubik. Sin trucos."
            }
        },
        en: {
            preHeadline: "Included at no extra cost",
            headline: "Your Business Open 24/7. Your Website Sells For You.",
            subheadline: "SmartKubik automatically generates your website connected to the system. Your customers buy products, book services, or schedule appointments — without you lifting a finger. Everything synced in real-time.",
            badge: "Auto-generated",
            steps: {
                title: "How It Works",
                items: [
                    {
                        icon: Settings,
                        number: "1",
                        title: "Set up your business",
                        description: "Add your products, services, or define your availability in SmartKubik."
                    },
                    {
                        icon: Globe,
                        number: "2",
                        title: "Your website generates itself",
                        description: "Automatically get a professional website with your entire catalog or schedule."
                    },
                    {
                        icon: DollarSign,
                        number: "3",
                        title: "Sell while you sleep",
                        description: "Your customers buy or book 24/7. You get notifications and the system does the rest."
                    }
                ]
            },
            benefits: [
                {
                    icon: RefreshCw,
                    title: "Real-Time Sync",
                    description: "Sell in-store, your website updates. Someone books online, your calendar blocks. Never oversell."
                },
                {
                    icon: Palette,
                    title: "Professional Design",
                    description: "No designer needed. Your website looks modern, fast, and ready to convert visitors into customers."
                },
                {
                    icon: CreditCard,
                    title: "Integrated Payments",
                    description: "Your customers pay online. Money hits your account. Invoice generates automatically."
                },
                {
                    icon: Smartphone,
                    title: "100% Responsive",
                    description: "Works perfectly on phone, tablet, and computer. Because your customers shop from anywhere."
                },
                {
                    icon: Link2,
                    title: "Your Domain",
                    description: "Use your own domain (yourbusiness.com) or a free subdomain. Your choice."
                },
                {
                    icon: BarChart3,
                    title: "Analytics Included",
                    description: "Know how many visits you get, what products they view most, and where they drop off. Optimize without guessing."
                }
            ],
            verticals: {
                title: "What your customer sees, based on your business type:",
                items: [
                    {
                        icon: Store,
                        title: "Retail",
                        emoji: "🛍️",
                        tenant: "Complete Online Store",
                        customer: "Browse catalog, add to cart, pay, receive confirmation, track order"
                    },
                    {
                        icon: Calendar,
                        title: "Services",
                        emoji: "💼",
                        tenant: "Online Booking Page",
                        customer: "See availability, choose service, select time, pay or reserve, receive reminder"
                    },
                    {
                        icon: UtensilsCrossed,
                        title: "Restaurants",
                        emoji: "🍽️",
                        tenant: "Reservation Page",
                        customer: "See table availability, choose date/time/party size, receive WhatsApp confirmation"
                    },
                    {
                        icon: Hotel,
                        title: "Hotels",
                        emoji: "🏨",
                        tenant: "Direct Booking Engine",
                        customer: "See available rooms, choose dates, pay deposit, receive confirmation"
                    },
                    {
                        icon: Factory,
                        title: "Manufacturing/Wholesale",
                        emoji: "🏭",
                        tenant: "B2B Order Portal",
                        customer: "Browse wholesale catalog, place orders, view history, repeat previous orders"
                    },
                    {
                        icon: Truck,
                        title: "Logistics",
                        emoji: "🚚",
                        tenant: "Tracking Portal",
                        customer: "Track shipments, request pickup, view delivery history"
                    }
                ]
            },
            comparison: {
                title: "Without SmartKubik vs. With SmartKubik",
                without: [
                    "Hire web designer ($500-2,000)",
                    "Hire developer ($1,000-5,000)",
                    "Pay Shopify/Wix/Squarespace ($30-300/mo)",
                    "Manually integrate inventory",
                    "Manually update availability",
                    "Process payments separately",
                    "Send confirmations manually"
                ],
                with: [
                    "Auto-generated",
                    "Included, no code",
                    "Included at no extra cost",
                    "Real-time sync",
                    "Updates automatically",
                    "Integrated payments",
                    "Automatic via email and WhatsApp"
                ],
                savings: "Included value: $3,000+ in development + $300/mo in tools",
                savingsSubtext: "All included in your SmartKubik subscription."
            },
            emotional: {
                text: "Imagine waking up to 3 new sales, 2 confirmed bookings, and $500 in your account.",
                subtext: "It all happened while you slept. Your SmartKubik website never closes."
            },
            ctas: {
                primary: "See Online Store Example",
                secondary: "See Booking Page Example",
                microcopy: "Real examples from businesses using SmartKubik. No tricks."
            }
        }
    };

    const t = content[language];

    return (
        <section
            ref={sectionRef}
            id="tu-web"
            className="section-web-ventas py-24 md:py-32 relative overflow-hidden"
        >
            {/* Background con gradient mesh */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-40"
                    style={{
                        background: `
                            radial-gradient(ellipse at 30% 40%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                            radial-gradient(ellipse at 70% 60%, rgba(16, 185, 129, 0.10) 0%, transparent 50%),
                            radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 45%),
                            linear-gradient(180deg, #0F172A 0%, #1E293B 100%)
                        `
                    }}
                />
            </div>

            <div className="container max-w-7xl mx-auto px-6 lg:px-8 relative z-10">

                {/* HEADER */}
                <div className={`text-center max-w-4xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <span className="text-cyan-400 text-sm font-medium tracking-wide uppercase mb-4 block">
                        {t.preHeadline}
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                        {t.headline}
                    </h2>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        {t.subheadline}
                    </p>
                </div>

                {/* VISUAL DE DISPOSITIVOS */}
                <div className={`devices-showcase relative mb-20 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <div className="relative max-w-6xl mx-auto">
                        {/* Mockup visual simplificado - en producción usar imágenes reales */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                            {/* Laptop */}
                            <div className="glass-card rounded-2xl p-8 transform md:translate-y-4 hover:scale-105 transition-transform duration-300">
                                <div className="aspect-video bg-gradient-to-br from-navy-800 to-navy-900 rounded-lg mb-4 border border-cyan-500/20 flex items-center justify-center">
                                    <Store className="w-16 h-16 text-cyan-400 opacity-50" />
                                </div>
                                <p className="text-sm text-gray-400 text-center">Tienda Online</p>
                            </div>

                            {/* Tablet */}
                            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                                <div className="aspect-[3/4] bg-gradient-to-br from-navy-800 to-navy-900 rounded-lg mb-4 border border-emerald-500/20 flex items-center justify-center">
                                    <Calendar className="w-16 h-16 text-emerald-400 opacity-50" />
                                </div>
                                <p className="text-sm text-gray-400 text-center">Calendario de Citas</p>
                            </div>

                            {/* Mobile */}
                            <div className="glass-card rounded-2xl p-4 transform md:translate-y-8 hover:scale-105 transition-transform duration-300">
                                <div className="aspect-[9/16] bg-gradient-to-br from-navy-800 to-navy-900 rounded-lg mb-4 border border-purple-500/20 flex items-center justify-center">
                                    <UtensilsCrossed className="w-12 h-12 text-purple-400 opacity-50" />
                                </div>
                                <p className="text-sm text-gray-400 text-center">Reservas</p>
                            </div>
                        </div>

                        {/* Badge flotante */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-2 rounded-full text-white font-semibold text-sm shadow-lg shadow-cyan-500/30 animate-pulse-slow whitespace-nowrap">
                            🚀 {t.badge}
                        </div>

                        {/* Líneas de conexión - decorativo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none hidden md:block">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-full blur-xl animate-pulse-slow" />
                        </div>
                    </div>
                </div>

                {/* CÓMO FUNCIONA - 3 PASOS */}
                <div className={`mb-20 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <div className="grid md:grid-cols-3 gap-8">
                        {t.steps.items.map((step, index) => {
                            const IconComponent = step.icon;
                            return (
                                <div
                                    key={index}
                                    className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300 group"
                                    style={{ transitionDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">
                                            {step.number}
                                        </div>
                                        <IconComponent className="w-8 h-8 text-cyan-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* GRID DE BENEFICIOS */}
                <div className={`mb-20 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {t.benefits.map((benefit, index) => {
                            const IconComponent = benefit.icon;
                            return (
                                <div
                                    key={index}
                                    className="glass-card rounded-2xl p-6 hover:-translate-y-1 hover:border-cyan-500/30 transition-all duration-300"
                                    style={{ transitionDelay: `${index * 50}ms` }}
                                >
                                    <IconComponent className="w-8 h-8 text-cyan-400 mb-4" />
                                    <h4 className="text-lg font-semibold text-white mb-2">{benefit.title}</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SEGÚN TU NEGOCIO */}
                <div className={`mb-20 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-br from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                        {t.verticals.title}
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {t.verticals.items.map((vertical, index) => {
                            const IconComponent = vertical.icon;
                            return (
                                <div
                                    key={index}
                                    className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">{vertical.emoji}</span>
                                        <IconComponent className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">{vertical.title}</h4>
                                    <p className="text-sm font-semibold text-cyan-400 mb-2">{vertical.tenant}</p>
                                    <p className="text-gray-400 text-sm leading-relaxed">{vertical.customer}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* COMPARACIÓN */}
                <div className={`glass-card rounded-3xl p-8 md:p-12 mb-16 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 text-white">
                        {t.comparison.title}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        {/* Sin SmartKubik */}
                        <div className="space-y-3">
                            <h4 className="text-lg font-semibold text-red-400 mb-4">❌ Sin SmartKubik</h4>
                            {t.comparison.without.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 text-gray-400">
                                    <span className="text-red-500 mt-1">✗</span>
                                    <span className="text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                        {/* Con SmartKubik */}
                        <div className="space-y-3">
                            <h4 className="text-lg font-semibold text-emerald-400 mb-4">✅ Con SmartKubik</h4>
                            {t.comparison.with.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 text-gray-300">
                                    <span className="text-emerald-500 mt-1">✓</span>
                                    <span className="text-sm font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Ahorro destacado */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 rounded-2xl p-6 text-center">
                        <p className="text-xl font-bold text-white mb-2">
                            💰 {t.comparison.savings}
                        </p>
                        <p className="text-gray-400 text-sm">{t.comparison.savingsSubtext}</p>
                    </div>
                </div>

                {/* CIERRE EMOCIONAL */}
                <div className={`text-center mb-12 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <div className="max-w-3xl mx-auto glass-card rounded-3xl p-8 md:p-12">
                        <p className="text-xl md:text-2xl text-gray-300 mb-4">
                            🌙 <strong className="text-white">{t.emotional.text}</strong>
                        </p>
                        <p className="text-lg text-gray-400">{t.emotional.subtext}</p>
                    </div>
                </div>

                {/* CTAs */}
                <div className={`transition-all duration-700 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
                        <a
                            href="#store-example"
                            className="bg-gradient-to-br from-cyan-500 to-emerald-500 text-white px-8 py-4 rounded-full font-bold text-base hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-2"
                        >
                            {t.ctas.primary} →
                        </a>
                        <a
                            href="#booking-example"
                            className="bg-transparent border-2 border-cyan-500/50 text-cyan-400 px-8 py-4 rounded-full font-bold text-base hover:bg-cyan-500/10 hover:border-cyan-500 transition-all duration-300 inline-flex items-center gap-2"
                        >
                            {t.ctas.secondary} →
                        </a>
                    </div>
                    <p className="text-center text-gray-500 text-sm">
                        {t.ctas.microcopy}
                    </p>
                </div>

            </div>

            <style jsx>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                .glass-card:hover {
                    border-color: rgba(6, 182, 212, 0.3);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }

                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
};

export default WebVentasSection;
