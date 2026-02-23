import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LightRaysCanvas from '../components/LightRaysCanvas';
import { BackgroundBeams } from '../components/ui/BackgroundBeams';
import testimonials from '../data/testimonials';
// Icons
import {
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Store,
    Utensils,
    Zap,
    Trophy,
    MessageCircle, // WhatsApp
    BarChart3,
    Rocket,
    Lock,
    Users,
    ArrowRight,
    DollarSign,
    Smartphone,
    Wallet,
    Building2,
    Star,
    Quote
} from 'lucide-react';

// Pricing Configuration
const PRICING_TIERS = [
    {
        id: 'starter',
        name: 'Starter',
        regularPrice: 19,
        founderMonthly: 12,
        founderAnnual: 10,
        discountMonthly: 37, // 37% OFF
        discountAnnual: 47, // 47% OFF
        cupos: 20,
        features: [
            "1 usuario",
            "1 sucursal",
            "Inventario hasta 100 productos",
            "Ventas y órdenes básicas",
            "Reportes esenciales",
            "Soporte por email"
        ],
        notIncluded: [
            "Sin IA ni WhatsApp",
            "Sin web de ventas",
            "Sin integraciones avanzadas"
        ]
    },
    {
        id: 'fundamental',
        name: 'Fundamental',
        regularPrice: 39,
        founderMonthly: 29,
        founderAnnual: 25,
        discountMonthly: 26, // 26% OFF
        discountAnnual: 36, // 36% OFF
        cupos: 15,
        features: [
            "1 usuario",
            "1 sucursal",
            "Todos los módulos básicos incluídos",
            "Web de ventas vinculada al sistema",
            "Analítica y reportes básicos",
            "Backup mensual",
            "Soporte estandar"
        ],
        notIncluded: [
            "Sin automatización IA",
            "Sin agentes de análisis predictivo",
            "Sin integraciones de correo, calendario o tareas"
        ]
    },
    {
        id: 'crecimiento',
        name: 'Crecimiento',
        isPopular: true,
        regularPrice: 99,
        founderMonthly: 59,
        founderAnnual: 49,
        discountMonthly: 40, // 40% OFF
        discountAnnual: 51, // 51% OFF
        cupos: 45,
        features: [
            "Todo lo del plan Fundamental",
            "Todos los módulos + funciones IA avanzadas",
            "Hasta 5 usuarios",
            "Hasta 2 sucursales",
            "Integración WhatsApp + ventas/reservas",
            "Automatizaciones IA",
            "Agente IA de Análisis predictivo",
            "Mayor personalización de tu web",
            "Integraciones Full (Gmail/Outlook)",
            "Backup semanal",
            "Soporte prioritario"
        ],
        notIncluded: []
    },
    {
        id: 'expansion',
        name: 'Expansión',
        regularPrice: 149,
        founderMonthly: 99,
        founderAnnual: 85,
        discountMonthly: 34, // 34% OFF
        discountAnnual: 43, // 43% OFF
        cupos: 30,
        features: [
            "Todo lo del plan Crecimiento",
            "Usuarios Ilimitados",
            "Sucursales Ilimitadas",
            "Soporte dedicado / SLA",
            "Migración gratuita",
            "Asistente IA Ilimitado",
            "Back up diario",
            "Dominio web propio",
            "Acceso prioritario a nuevas funciones",
            "Web sin publicidad"
        ],
        notIncluded: []
    }
];

// Feature Comparison for Vertical Tabs
const VERTICALS = {
    restaurant: {
        label: "Restaurantes",
        icon: Utensils,
        painPoints: [
            { pain: "3 horas al día contestando WhatsApp", solution: "IA responde y toma pedidos automáticamente" },
            { pain: "Merma descontrolada en cocina", solution: "Análisis predictivo de inventario y recetas" },
            { pain: "Reservas en papel o Excel desactualizado", solution: "Sistema de reservas 100% integrado" }
        ]
    },
    retail: {
        label: "Retail",
        icon: Store,
        painPoints: [
            { pain: "Inventario 'fantasma' entre sedes", solution: "Visibilidad multi-sede en tiempo real" },
            { pain: "Decisiones basadas en intuición", solution: "Dashboards en vivo con reportes IA" },
            { pain: "Sistemas desconectados (POS, Web, Inv)", solution: "Todo unificado en una sola plataforma" }
        ]
    }
};

const FAQ_ITEMS = [
    {
        q: "¿Qué pasa después de los 90 cupos?",
        a: "El programa se cierra definitivamente. Los precios volverán a su tarifa regular ($39/$99/$149) y los beneficios exclusivos como el badge de fundador y el acceso al grupo VIP desaparecerán."
    },
    {
        q: "¿Puedo cambiar de plan y conservar el descuento?",
        a: "Sí. Tu estatus de Fundador se liga a tu cuenta, no al plan. Podrás subir o bajar de nivel manteniendo siempre el porcentaje de descuento especial reservado para fundadores."
    },
    {
        q: "¿El descuento aplica para siempre?",
        a: "Sí, es vitalicio. Mientras mantengas tu suscripción activa, tu precio nunca subirá, incluso si aumentamos nuestros precios públicos en el futuro."
    },
    {
        q: "¿Qué sucede si necesito más de 2 sucursales en el plan Crecimiento?",
        a: "Puedes adquirir 'Add-ons' de sucursal extra a precio preferencial de fundador, o migrar al plan Expansión que incluye sucursales ilimitadas."
    }
];

const PAYMENT_METHODS = [
    {
        id: 'efectivo_usd',
        icon: DollarSign,
        name: 'Efectivo USD',
        desc: 'Pago en dólares en efectivo. Coordinamos la entrega personalmente.',
        color: 'text-green-400',
        bg: 'bg-green-400/10',
    },
    {
        id: 'pago_movil',
        icon: Smartphone,
        name: 'Pago Móvil',
        desc: 'Transferencia instantánea desde cualquier banco venezolano.',
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
    },
    {
        id: 'binance_usdt',
        icon: Wallet,
        name: 'Binance (USDT)',
        desc: 'Pago en USDT vía Binance Pay. Rápido y sin comisiones.',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
    },
    {
        id: 'transferencia',
        icon: Building2,
        name: 'Transferencia Bancaria',
        desc: 'Transferencia nacional en bolívares al tipo de cambio del día.',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
    },
];

const FoundersPage = () => {
    const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'
    const [activeVertical, setActiveVertical] = useState('restaurant');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [showStickyBanner, setShowStickyBanner] = useState(false);
    const heroRef = useRef(null);

    // Inject scoped styles + landing-page-active class (mirrors SmartKubikLanding exactly)
    useEffect(() => {
        window.scrollTo(0, 0);
        const styleId = 'founders-custom-styles';
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove();

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
          /* Global body/html styles - SCOPED with landing-page-active class */
          html.landing-page-active { scroll-behavior: smooth !important; }
          body.landing-page-active {
            background-color: #0A0F1C !important;
            color: #F8FAFC !important;
          }

          /* Custom color classes - SCOPED to landing page */
          #landing-page-root .bg-navy-900 { background-color: #0A0F1C !important; }
          #landing-page-root .bg-navy-800 { background-color: #0F172A !important; }
          #landing-page-root .bg-navy-700 { background-color: #1E293B !important; }
          #landing-page-root .text-cyan-electric { color: #06B6D4 !important; }
          #landing-page-root .bg-cyan-electric { background-color: #06B6D4 !important; }
          #landing-page-root .border-cyan-electric { border-color: #06B6D4 !important; }
          #landing-page-root .text-text-secondary { color: #94A3B8 !important; }

          /* Glass card styles - SCOPED - GPU compositing (prevents flickering with WebGL layers) */
          #landing-page-root .glass-card:not(.stack-card) {
            background: rgba(255, 255, 255, 0.03) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            transform: translate3d(0, 0, 0) !important;
            -webkit-transform: translate3d(0, 0, 0) !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
            will-change: auto !important;
            transition: all 0.3s ease !important;
          }

          #landing-page-root .glass-card:not(.stack-card):hover {
            border-color: rgba(6, 182, 212, 0.5) !important;
            border-width: 2px !important;
            box-shadow:
              0 8px 32px rgba(6, 182, 212, 0.15),
              0 0 0 1px rgba(6, 182, 212, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          }

          /* Button styles - SCOPED */
          #landing-page-root .btn-primary {
            background: linear-gradient(135deg, #06B6D4, #10B981) !important;
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.4) !important;
            transition: all 0.3s ease !important;
          }
          #landing-page-root .btn-primary:hover {
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 0 0 50px rgba(6, 182, 212, 0.6) !important;
          }
        `;
        document.head.appendChild(styleSheet);
        document.body.classList.add('landing-page-active');
        document.documentElement.classList.add('landing-page-active');

        return () => {
            const style = document.getElementById(styleId);
            if (style) style.remove();
            document.body.classList.remove('landing-page-active');
            document.documentElement.classList.remove('landing-page-active');
        };
    }, []);

    // Sticky banner: show when hero scrolls out of view
    useEffect(() => {
        const node = heroRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            ([entry]) => setShowStickyBanner(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    // Initial Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div id="landing-page-root">
            <div className="min-h-screen bg-[#070A13] text-white font-sans overflow-x-hidden relative selection:bg-cyan-500/30 selection:text-cyan-200">
                {/* --- Background Effects (GPU-promoted to avoid header compositing conflicts) --- */}
                <div className="fixed inset-0 pointer-events-none z-0 opacity-25" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
                    {/* Brand Gradients — static blur, opacity animation only on wrapper */}
                    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen" style={{ opacity: 0.8 }}></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[1000px] h-[1000px] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen" style={{ opacity: 0.8 }}></div>
                </div>
                <div className="fixed inset-0 z-0 opacity-[0.07] pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
                    <LightRaysCanvas />
                </div>

                {/* --- Navigation (Simplified & Glitch-Free) --- */}
                <nav className="fixed top-0 w-full z-50 py-4 px-4 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div id="nav-card" className="glass-card rounded-full px-6 py-3 flex justify-between items-center">
                            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <img src="/assets/logo-smartkubik.png" alt="SmartKubik Logo" className="h-[24px] md:h-[28px] w-auto" />
                            </Link>
                            <div className="flex items-center gap-4">
                                <span className="hidden md:block text-sm text-gray-400">¿Ya eres miembro?</span>
                                <Link to="/login" className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                                    Iniciar Sesión
                                </Link>
                                <a href="#pricing" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition-all border border-white/10">
                                    Ver Planes
                                </a>
                            </div>
                        </div>
                    </div>
                </nav>


                {/* HERO WRAPPER */}
                <div ref={heroRef} className="relative min-h-[91vh] flex flex-col justify-center overflow-hidden">
                    {/* BackgroundBeams hero effect */}
                    <BackgroundBeams className="z-0 pointer-events-none" />
                    {/* Overlay gradient to fade bottom */}
                    <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-[#070A13]/60 to-[#070A13] pointer-events-none"></div>

                    {/* Content Container - Keeps padding for Nav and spacing */}
                    <div className="relative z-10 pt-32 pb-20 w-full">
                        {/* --- 1. HERO SECTION (Centered) --- */}
                        <motion.section
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-7xl mx-auto px-4 text-center mb-12"
                        >
                            <motion.div variants={itemVariants} className="inline-block py-1 px-4 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-xs md:text-sm mb-6 tracking-wide shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                ⚠️ SOLO QUEDAN 78 CUPOS DISPONIBLES
                            </motion.div>

                            <motion.h1 variants={itemVariants} className="font-display font-black mb-6 leading-none relative z-10" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                <span className="block text-white font-bold tracking-tighter text-5xl md:text-6xl lg:text-7xl mb-2 drop-shadow-xl">Programa</span>
                                <span className="block text-5xl md:text-6xl lg:text-7xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-emerald-400 to-cyan-200 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] pb-4">
                                    Clientes Fundadores
                                </span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
                                Únete a los primeros 90 negocios visionarios y obtén <span className="text-white font-bold">precio bloqueado de por vida</span> con hasta 51% de descuento y migración incluída.
                            </motion.p>

                            {/* Scarcity Bar */}
                            <motion.div variants={itemVariants} className="max-w-md mx-auto mb-10">
                                <div className="flex justify-between text-sm mb-2 text-gray-400 font-medium">
                                    <span>Progreso</span>
                                    <span className="text-emerald-400">12 reclamados</span>
                                </div>
                                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 w-[13.3%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 text-right">78/90 disponibles</p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transform hover:scale-105 transition-all text-lg flex items-center justify-center gap-2">
                                    Unirme como Fundador
                                    <ArrowRight className="w-5 h-5" />
                                </a>
                                <a href="https://wa.me/584241234567?text=Hola%2C%20quiero%20ver%20una%20demo%20en%20vivo%20de%20SmartKubik" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all text-lg backdrop-blur-sm flex items-center justify-center gap-2">
                                    <MessageCircle className="w-5 h-5" />
                                    Ver Demo en Vivo
                                </a>
                            </motion.div>

                            <motion.div variants={itemVariants} className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sin tarjeta de crédito</span>
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Setup en 15 min</span>
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Venezuela Ready</span>
                            </motion.div>
                        </motion.section>
                    </div> {/* End Content Container */}
                </div> {/* End Hero Wrapper */}


                {/* --- 2. BENEFITS GRID --- */}
                <section className="max-w-7xl mx-auto px-4 mb-32 pt-24 text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter mb-16 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                        Beneficios de Unirte
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {[
                            { icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/10", title: "Precio Bloqueado", desc: "Tu tarifa nunca subirá. Protección vitalicia contra inflación de precios." },
                            { icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", title: "Comunidad VIP", desc: "Acceso exclusivo a grupo de WhatsApp directo con los fundadores." },
                            { icon: Rocket, color: "text-purple-400", bg: "bg-purple-400/10", title: "Early Access", desc: "Recibe nuevas funciones 4 semanas antes que el público general." },
                            { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", title: "Influencia Real", desc: "Vota en el roadmap de producto. Construimos lo que tú necesitas." },
                            { icon: Lock, color: "text-emerald-400", bg: "bg-emerald-400/10", title: "Seguridad Total", desc: "Backups automáticos diarios y encriptación de grado bancario." },
                            { icon: MessageCircle, color: "text-green-400", bg: "bg-green-400/10", title: "Soporte Prioritario", desc: "Canal directo con ingeniería. Sin bots, gente real resolviendo." },
                        ].map((benefit, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group cursor-default"
                            >
                                <div className={`w-12 h-12 rounded-xl ${benefit.bg} ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <benefit.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-white">{benefit.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{benefit.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>


                {/* --- 3. PRICING SECTION --- */}
                <section id="pricing" className="max-w-7xl mx-auto px-4 mb-32 scroll-mt-32">
                    <div className="text-center mb-24">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            Elige tu Nivel de Fundador
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">Asegura tu precio de por vida hoy y olvídate de la inflación para siempre.</p>

                        {/* Billing Toggle */}
                        <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Anual <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white">-15% Extra</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        {PRICING_TIERS.map((tier, idx) => {
                            const isAnnual = billingCycle === 'annual';
                            const price = isAnnual ? tier.founderAnnual : tier.founderMonthly;
                            const discount = isAnnual ? tier.discountAnnual : tier.discountMonthly;

                            return (
                                <motion.div
                                    key={tier.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.15 }}
                                    className={`relative rounded-3xl p-8 border backdrop-blur-md flex flex-col h-full ${tier.isPopular ? 'bg-navy-800/80 border-cyan-500/50 shadow-2xl shadow-cyan-900/20 z-10 scale-105 md:-mt-4' : 'bg-navy-900/60 border-white/10 hover:border-white/20'}`}
                                >
                                    {tier.isPopular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-wider shadow-lg">
                                            MÁS POPULAR
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-gray-500 line-through text-lg">${tier.regularPrice}</span>
                                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                                                ${price}
                                            </span>
                                            <span className="text-gray-400 text-sm">/mes</span>
                                        </div>
                                        <div className="mt-2 inline-block px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                            Ahorras {discount}% Vitalicio
                                        </div>
                                    </div>

                                    {/* Cupos Counter */}
                                    <div className="mb-8">
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Disponibilidad</span>
                                            <span>{Math.max(0, tier.cupos - 5)} Quedan</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(tier.cupos / 90) * 100}%` }}></div>
                                        </div>
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1">
                                        {tier.features.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                        {tier.notIncluded.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                <XCircle className="w-5 h-5 text-gray-700 shrink-0" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href={`https://wa.me/584241234567?text=Hola,%20quiero%20el%20plan%20${tier.name}%20de%20Fundadores`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full py-4 rounded-xl font-bold text-center transition-all ${tier.isPopular
                                            ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        Elegir Plan {tier.name}
                                    </a>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>


                {/* --- 3.5 PAYMENT METHODS --- */}
                <section className="max-w-5xl mx-auto px-4 mb-32">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            Métodos de Pago
                        </h2>
                        <p className="text-lg text-gray-400 max-w-xl mx-auto">
                            100% adaptados a Venezuela. Paga como te sea más cómodo.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PAYMENT_METHODS.map((method, idx) => (
                            <motion.div
                                key={method.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/10 transition-all text-center group"
                            >
                                <div className={`w-12 h-12 mx-auto rounded-xl ${method.bg} ${method.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <method.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{method.name}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{method.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* --- 4. VERTICALS SECTION --- */}
                <section className="max-w-7xl mx-auto px-4 mb-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            ¿Por qué tú? ¿Por qué ahora?
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">Diseñado específicamente para resolver el caos operativo de tu rubro.</p>
                    </div>

                    <div className="bg-navy-800/50 rounded-3xl p-1 border border-white/10 max-w-4xl mx-auto backdrop-blur-md">
                        <div className="flex p-1 gap-1 mb-8">
                            {Object.entries(VERTICALS).map(([key, data]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveVertical(key)}
                                    className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${activeVertical === key ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <data.icon className="w-5 h-5" />
                                    {data.label}
                                </button>
                            ))}
                        </div>

                        <div className="px-6 md:px-12 pb-12">
                            <div className="grid md:grid-cols-3 gap-6">
                                {VERTICALS[activeVertical].painPoints.map((item, idx) => (
                                    <motion.div
                                        key={`${activeVertical}-${idx}`}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                                        className="bg-navy-900/50 p-6 rounded-2xl border border-white/5"
                                    >
                                        <div className="flex items-center gap-2 mb-3 text-red-400 text-sm font-semibold">
                                            <XCircle className="w-4 h-4" /> Problema
                                        </div>
                                        <p className="text-gray-400 mb-6 min-h-[48px]">{item.pain}</p>

                                        <div className="w-full h-px bg-white/10 mb-6"></div>

                                        <div className="flex items-center gap-2 mb-3 text-emerald-400 text-sm font-semibold">
                                            <CheckCircle2 className="w-4 h-4" /> Solución SmartKubik
                                        </div>
                                        <p className="text-white font-medium">{item.solution}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>





                {/* --- 5. TESTIMONIALS --- */}
                <section className="max-w-7xl mx-auto px-4 mb-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            Lo que dicen nuestros Fundadores
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Negocios reales que ya están transformando sus operaciones con SmartKubik.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testimonials.slice(0, 3).map((t, idx) => (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.12 }}
                                className="relative p-6 md:p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col"
                            >
                                <Quote className="w-8 h-8 text-cyan-500/30 mb-4" />
                                <p className="text-gray-300 leading-relaxed mb-6 flex-1 italic">
                                    "{t.quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {t.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{t.name}</p>
                                        <p className="text-gray-500 text-xs truncate">{t.role} — {t.business}</p>
                                    </div>
                                    {t.metric && (
                                        <span className="ml-auto shrink-0 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold whitespace-nowrap">
                                            {t.metric}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Second row — 2 testimonials centered */}
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
                        {testimonials.slice(3, 5).map((t, idx) => (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.12 }}
                                className="relative p-6 md:p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col"
                            >
                                <Quote className="w-8 h-8 text-cyan-500/30 mb-4" />
                                <p className="text-gray-300 leading-relaxed mb-6 flex-1 italic">
                                    "{t.quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {t.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{t.name}</p>
                                        <p className="text-gray-500 text-xs truncate">{t.role} — {t.business}</p>
                                    </div>
                                    {t.metric && (
                                        <span className="ml-auto shrink-0 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold whitespace-nowrap">
                                            {t.metric}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* --- 6. FAQ & FOOTER --- */}
                <section className="max-w-3xl mx-auto px-4 mb-32">
                    <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-12 tracking-tight">Preguntas Frecuentes</h2>
                    <div className="space-y-4">
                        {FAQ_ITEMS.map((item, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors"
                                >
                                    <span className="font-semibold">{item.q}</span>
                                    {openFaqIndex === idx ? <ChevronUp className="text-cyan-400" /> : <ChevronDown className="text-gray-500" />}
                                </button>
                                <AnimatePresence>
                                    {openFaqIndex === idx && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/5 mt-2">
                                                {item.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="text-center pb-20 px-4">
                    <div className="max-w-5xl mx-auto bg-gradient-to-br from-cyan-900/20 to-emerald-900/20 rounded-3xl p-8 md:p-16 border border-cyan-500/20 backdrop-blur-md relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black)] pointer-events-none"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-black mb-8 leading-tight text-white tracking-tighter">
                                ¿Listo para dejar de<br className="hidden md:block" /> administrar caos?
                            </h2>
                            <a href="#pricing" className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black rounded-full text-lg transition-all shadow-lg shadow-cyan-900/40">
                                Solicitar Acceso de Fundador
                            </a>
                            <p className="mt-6 text-sm text-gray-500">30 días de garantía • Cancela cuando quieras</p>
                        </div>
                    </div>
                </section>

                <footer className="text-center text-gray-600 text-sm py-12 border-t border-white/5 pb-24">
                    © 2026 SmartKubik Inc. Todos los derechos reservados.
                </footer>

                {/* --- STICKY FOUNDER SLOTS BANNER --- */}
                <AnimatePresence>
                    {showStickyBanner && (
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50"
                        >
                            <div className="bg-[#0F172A]/95 backdrop-blur-xl border-t border-cyan-500/20 shadow-[0_-4px_30px_rgba(6,182,212,0.15)]">
                                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-emerald-400 text-sm font-bold">78/90 cupos</span>
                                        </div>
                                        <span className="text-gray-400 text-sm truncate hidden md:block">
                                            Precio bloqueado de por vida — hasta 51% OFF
                                        </span>
                                        <span className="text-gray-400 text-sm truncate md:hidden sm:hidden">
                                            78 cupos — hasta 51% OFF
                                        </span>
                                        <span className="text-gray-400 text-sm truncate sm:block hidden md:hidden">
                                            Hasta 51% OFF vitalicio
                                        </span>
                                    </div>
                                    <a
                                        href="#pricing"
                                        className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-cyan-900/30 flex items-center gap-2"
                                    >
                                        Ver Planes
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default FoundersPage;
