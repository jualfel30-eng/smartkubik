import React, { useState, useEffect, useRef } from 'react';

// Industry Backgrounds (WebP optimized)
import RestaurantBg from '@/assets/industries/restaurant.webp';
import RetailBg from '@/assets/industries/retail.webp';
import ManufacturaBg from '@/assets/industries/manufactura.webp';
import ServicesBg from '@/assets/industries/services.webp';
import LogisticsBg from '@/assets/industries/logistics.webp';
import HotelsBg from '@/assets/industries/hotels.webp';

// Restaurant Mockups (WebP optimized)
import ErpTables from '@/assets/industries/erp_tables.webp';
import ErpKds from '@/assets/industries/erp_kds.webp';
import ErpReservations from '@/assets/industries/erp_reservations.webp';
import ErpBillSplitting from '@/assets/industries/erp_billsplitting.webp';
import ErpTips from '@/assets/industries/erp_tips.webp';
import ErpMenu from '@/assets/industries/erp_menu.webp';

const ScrollStackSection = ({ language }) => {
    const [activeRestaurantFeature, setActiveRestaurantFeature] = useState(null);
    const sectionRef = useRef(null);

    // Scroll Stack Animation Logic - Optimized for Mobile/iOS
    useEffect(() => {
        let metrics = {
            sectionTop: 0,
            sectionHeight: 0,
            scrollDistance: 0,
            viewportHeight: 0
        };

        const section = sectionRef.current;
        if (!section) return;

        // Use scoped selectors within the component to avoid conflicts
        const cards = section.querySelectorAll('.stack-card');
        const title = section.querySelector('#stack-title');
        const footer = section.querySelector('#stack-footer');

        const calculateMetrics = () => {
            if (!section) return;
            const rect = section.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            metrics.sectionTop = rect.top + scrollTop;
            metrics.sectionHeight = section.offsetHeight;

            const stickyDiv = section.querySelector('.sticky');
            if (stickyDiv && metrics.viewportHeight === 0) {
                metrics.viewportHeight = stickyDiv.offsetHeight;
            }

            metrics.scrollDistance = metrics.sectionHeight - metrics.viewportHeight;
        };

        const handleScroll = () => {
            if (!section || cards.length === 0) return;

            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            let rawProgress = (scrollTop - metrics.sectionTop) / metrics.scrollDistance;
            let progress = Math.max(0, Math.min(1, rawProgress));

            // Logic adapted from original file
            let titleDepth = 0;
            if (progress > 0.50) {
                titleDepth = (progress - 0.50) / 0.10;
            }

            if (title) {
                if (titleDepth > 0) {
                    const exitScale = Math.max(0.8, 1 - (titleDepth * 0.05));
                    let exitOpacity = 1;
                    if (titleDepth > 0.1) {
                        exitOpacity = Math.max(0, 1 - ((titleDepth - 0.1) * 2));
                    }
                    title.style.transform = `scale(${exitScale})`;
                    title.style.opacity = exitOpacity.toString();
                } else {
                    title.style.opacity = '1';
                    title.style.transform = 'scale(1)';
                }
            }

            const cardGap = 20;
            const scaleStep = 0.05;

            let cardsExitPhase = 0;
            if (progress > 0.55) {
                cardsExitPhase = (progress - 0.55) / 0.15;
            }

            cards.forEach((card, index) => {
                const cardStart = 0.0 + (index * 0.12);
                let cardProgress = (progress - cardStart) / 0.15;
                cardProgress = Math.max(0, Math.min(1, cardProgress));

                const easeOut = 1 - Math.pow(1 - cardProgress, 3);
                let translateY = (1 - easeOut) * (metrics.viewportHeight * 0.8);

                const currentCardFloat = (progress - 0.0) / 0.12;
                let depth = Math.max(0, currentCardFloat - (index + 1));

                let stackOffset = -(depth * cardGap);
                let scale = 1 - (depth * scaleStep);
                let opacity = 1;
                let blur = 0;

                if (depth > 0) {
                    if (depth > 0.2) {
                        const effectDepth = depth - 0.2;
                        opacity = Math.max(0.1, 1 - (effectDepth * 1.5));
                        blur = effectDepth * 10;
                    } else {
                        opacity = 1 - (depth * 0.2);
                    }
                }

                if (cardProgress < 1) {
                    opacity = opacity * Math.min(1, easeOut * 2);
                }

                if (cardsExitPhase > 0) {
                    scale = scale * (1 - (cardsExitPhase * 0.2));
                    opacity = opacity * (1 - (cardsExitPhase * 3));
                }

                const finalY = translateY + stackOffset;
                card.style.transform = `translate3d(0, ${finalY}px, 0) scale(${Math.max(0.8, scale)})`;
                card.style.opacity = Math.max(0, opacity).toString();
                card.style.filter = `blur(${blur}px)`;
            });

            if (footer) {
                footer.style.transition = 'none';
                if (progress > 0.5) {
                    let holdProgress = (progress - 0.5) / 0.25;
                    holdProgress = Math.min(1, holdProgress);
                    footer.style.opacity = Math.min(1, holdProgress * 4).toString();

                    const startY = 20;
                    const holdY = -25;
                    const currentY = startY - ((startY - holdY) * holdProgress);

                    footer.style.transform = `translateY(${currentY}vh) scale(${1 + (holdProgress * 0.15)})`;
                } else {
                    footer.style.opacity = '0';
                    footer.style.transform = 'translateY(20vh)';
                }
            }
        };

        // Initialize logic
        calculateMetrics();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', calculateMetrics);

        // Run calculation again after a short delay to ensure layout is settled
        setTimeout(calculateMetrics, 100);
        setTimeout(calculateMetrics, 500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', calculateMetrics);
        };
    }, []);

    return (
        <section
            id="section-scroll-stack"
            ref={sectionRef}
            className="relative bg-navy-900"
            style={{ height: "250svh" }}
        >
            <div className="sticky top-0 w-full flex flex-col items-center justify-center overflow-hidden" style={{ height: '100svh' }}>

                {/* Dynamic Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 opacity-60"
                        style={{
                            backgroundImage: `url(${activeRestaurantFeature === 'tables' ? RestaurantBg :
                                    activeRestaurantFeature === 'kds' ? RestaurantBg :
                                        activeRestaurantFeature ? RestaurantBg : // Fallback
                                            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' // Transparent placeholder
                                })`
                        }}></div>
                    <div className="absolute inset-0 bg-navy-900/80"></div>
                </div>

                <div className="relative px-6 w-full max-w-6xl mx-auto h-full flex flex-col items-center justify-center">

                    {/* Section Title */}
                    <div id="stack-title" className="text-center mb-0 relative z-30 transition-all duration-500 origin-center">
                        <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
                            <span className={`block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 lang-es ${language === "es" ? "" : "hidden"}`}>
                                Tu Negocio,
                            </span>
                            <span className={`block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 lang-en ${language === "en" ? "" : "hidden"}`}>
                                Your Business,
                            </span>
                            <span className={`text-white lang-es ${language === "es" ? "" : "hidden"}`}>Simplificado.</span>
                            <span className={`text-white lang-en ${language === "en" ? "" : "hidden"}`}>Simplified.</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Un sistema operativo para cada tipo de operación.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>An operating system for every type of operation.</span>
                        </p>
                    </div>

                    {/* Stack Cards Container */}
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none z-20">

                        {/* CARD 1: RESTAURANTS */}
                        <div className="stack-card absolute w-full max-w-5xl pointer-events-auto" style={{ transform: 'translateY(100vh)', opacity: 0 }}>
                            <div className="glass-card rounded-3xl p-1 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden">
                                <div className="grid lg:grid-cols-2 gap-0">
                                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-bold mb-6 w-fit">
                                            <span>🍽️</span>
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Restaurantes & Bares</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Restaurants & Bars</span>
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}><span className="text-orange-500">Llena Mesas</span>, No Papeles</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}><span className="text-orange-500">Fill Tables</span>, Not Paperwork</span>
                                        </h3>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {[
                                                { id: 'tables', icon: '🗺️', es: { t: 'Mesas en Tiempo Real', d: 'Gestión visual de tu salón.' }, en: { t: 'Real-Time Tables', d: 'Visual floor management.' } },
                                                { id: 'kds', icon: '📺', es: { t: 'Pantalla de Cocina', d: 'Cero gritos, cero errores.' }, en: { t: 'Kitchen Display System', d: 'No shouting, no errors.' } },
                                                { id: 'reservations', icon: '📅', es: { t: 'Reservaciones', d: 'Agenda inteligente.' }, en: { t: 'Reservations', d: 'Smart scheduling.' } },
                                                { id: 'split', icon: '💸', es: { t: 'División de Cuentas', d: 'Sin dolores de cabeza.' }, en: { t: 'Bill Splitting', d: 'No more headaches.' } },
                                                { id: 'tips', icon: '💵', es: { t: 'Propinas Justas', d: 'Reparto automático.' }, en: { t: 'Fair Tips', d: 'Automatic splitting.' } },
                                                { id: 'menu', icon: '📊', es: { t: 'Menu Engineering', d: 'Maximiza ganancias.' }, en: { t: 'Menu Engineering', d: 'Maximize profits.' } }
                                            ].map(feat => (
                                                <button
                                                    key={feat.id}
                                                    onClick={() => setActiveRestaurantFeature(feat.id)}
                                                    className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === feat.id ? 'border-orange-500 ring-1 ring-orange-500 bg-white/5' : 'border-white/10'}`}>
                                                    <div className="text-2xl mb-2">{feat.icon}</div>
                                                    <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>{feat.es.t}</div>
                                                    <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>{feat.en.t}</div>
                                                    <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>{feat.es.d}</div>
                                                    <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>{feat.en.d}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Visual Display */}
                                    <div className="rounded-xl border border-white/10 h-80 md:h-auto min-h-[500px] flex items-center justify-center relative overflow-hidden group m-4 lg:m-8 lg:ml-0 bg-black/20">
                                        {!activeRestaurantFeature && (
                                            <>
                                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${RestaurantBg})` }}></div>
                                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                                <div className="relative z-30 glass-card p-6 rounded-xl border border-white/20 w-72 text-left shadow-2xl animate-fade-in">
                                                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-lg">🍽️</div>
                                                            <div>
                                                                <div className="text-white font-bold text-lg">Mesa 12</div>
                                                                <div className="text-orange-400 text-xs font-bold uppercase tracking-wider">Reservada</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Cliente</div>
                                                            <div className="text-white font-medium flex items-center gap-2">
                                                                <span>Familia Rodríguez</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div><div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Hora</div><div className="text-white">8:00 PM</div></div>
                                                            <div><div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Personas</div><div className="text-white">4 Pax</div></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {activeRestaurantFeature && (
                                            <div className="absolute inset-0 z-40 bg-navy-900 animate-fade-in">
                                                <img
                                                    src={
                                                        activeRestaurantFeature === 'tables' ? ErpTables :
                                                            activeRestaurantFeature === 'kds' ? ErpKds :
                                                                activeRestaurantFeature === 'reservations' ? ErpReservations :
                                                                    activeRestaurantFeature === 'split' ? ErpBillSplitting :
                                                                        activeRestaurantFeature === 'tips' ? ErpTips :
                                                                            activeRestaurantFeature === 'menu' ? ErpMenu : ErpTables
                                                    }
                                                    alt="Feature Preview" className="w-full h-full object-contain" loading="lazy"
                                                />
                                                <button onClick={(e) => { e.stopPropagation(); setActiveRestaurantFeature(null); }} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-50">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: RETAIL */}
                        <div className="stack-card absolute w-full max-w-5xl pointer-events-auto" style={{ transform: 'translateY(100vh)', opacity: 0 }}>
                            <div className="glass-card rounded-3xl p-1 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden relative">
                                <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${RetailBg})` }}></div>
                                <div className="relative z-10 p-8 lg:p-12 flex flex-col items-center text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-sm font-bold mb-6">
                                        <span>🛍️</span>
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Retail & Tiendas</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Retail & Shops</span>
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Tu Inventario, <span className="text-pink-500">Bajo Control</span></span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Your Inventory, <span className="text-pink-500">Under Control</span></span>
                                    </h3>
                                    <p className="text-xl text-gray-300 max-w-2xl mb-8">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Sincroniza tienda física y online. Predice qué se va a vender antes de que se agote.</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Sync physical and online stores. Predict what will sell before it runs out.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: MANUFACTURING */}
                        <div className="stack-card absolute w-full max-w-5xl pointer-events-auto" style={{ transform: 'translateY(100vh)', opacity: 0 }}>
                            <div className="glass-card rounded-3xl p-1 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden relative">
                                <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${ManufacturaBg})` }}></div>
                                <div className="relative z-10 p-8 lg:p-12 flex flex-col items-center text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-bold mb-6">
                                        <span>🏭</span>
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Manufactura</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Manufacturing</span>
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Producción <span className="text-blue-500">Sin Cuellos de Botella</span></span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Production <span className="text-blue-500">Without Bottlenecks</span></span>
                                    </h3>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer / CTA - Stays at bottom until end */}
                    <div id="stack-footer" className="absolute bottom-0 translate-y-[20vh] opacity-0 transition-all duration-700 z-40 text-center pb-24">
                        <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Eso es SmartKubik.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>That is SmartKubik.</span>
                        </h3>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full run-border bg-navy-800 text-cyan-400 font-mono text-sm">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                            </span>
                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Sistema Operativo v1.0</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Operating System v1.0</span>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default ScrollStackSection;
