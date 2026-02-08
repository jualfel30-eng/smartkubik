import React from 'react';
import { Link } from 'react-router-dom';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import LightRaysCanvas from '../components/LightRaysCanvas';

const FoundersPage = () => {
    return (
        <div className="min-h-screen bg-navy-900 text-white font-sans overflow-x-hidden relative">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-cyan-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[1000px] h-[1000px] bg-emerald-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" style={{ animationDelay: '-5s' }}></div>
            </div>
            <div className="fixed inset-0 z-0 opacity-40">
                <LightRaysCanvas />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 py-4 px-4 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="glass-card rounded-full px-6 py-3 flex justify-between items-center backdrop-blur-md bg-white/5 border border-white/10">
                        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src="/assets/logo-smartkubik.png" alt="SmartKubik Logo" className="h-[20px] md:h-[28px] w-auto" />
                        </Link>
                        <Link to="/login" className="text-sm font-medium hover:text-cyan-400 transition-colors">
                            Iniciar Sesión
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 max-w-4xl mx-auto px-4 pt-32 pb-20 text-center">
                {/* Header */}
                <div className="mb-12">
                    <span className="inline-block py-1 px-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-sm mb-6">
                        🏆 PROGRAMA EXCLUSIVO DE LANZAMIENTO
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        Conviértete en <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Fundador SmartKubik</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Ayúdanos a moldear el futuro de la gestión gastronómica y obtén beneficios vitalicios que nunca volverán a estar disponibles.
                    </p>
                </div>

                {/* Offer Card */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-navy-800/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12">

                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                            <div className="text-left">
                                <h3 className="text-2xl font-bold text-white mb-2">Descuento Vitalicio</h3>
                                <p className="text-gray-400">Precio congelado para siempre, sin sorpresas.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-lg line-through mb-1">$99/mes</div>
                                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                                    $45<span className="text-xl text-gray-400 font-normal">/mes</span>
                                </div>
                                <div className="text-emerald-400 font-bold mt-2">✨ Ahorras 55% de por vida</div>
                            </div>
                        </div>

                        {/* Benefits Grid */}
                        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">🚀</div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Acceso Anticipado</h4>
                                    <p className="text-sm text-gray-400">Prueba nuevas funciones antes que nadie y decide nuestro roadmap.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">🎓</div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Onboarding VIP</h4>
                                    <p className="text-sm text-gray-400">Configuración guiada personalizada por nuestro equipo de ingenieros.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">💎</div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Badge de Fundador</h4>
                                    <p className="text-sm text-gray-400">Distintivo exclusivo en tu perfil y soporte prioritario 24/7.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">🔒</div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Precio Protegido</h4>
                                    <p className="text-sm text-gray-400">Tu tarifa nunca subirá, sin importar cuántas funciones agreguemos.</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA Section */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-full max-w-md bg-white/5 rounded-full h-4 overflow-hidden relative">
                                <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-emerald-500 w-[15%] animate-pulse"></div>
                            </div>
                            <p className="text-sm text-gray-400">
                                <span className="text-white font-bold">12</span> de 90 cupos reclamados
                            </p>

                            <a href="https://wa.me/584241234567?text=Hola,%20quiero%20aplicar%20al%20Programa%20de%20Fundadores%20de%20SmartKubik"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transform hover:scale-105 transition-all text-lg flex items-center justify-center gap-2">
                                Solicitar Acceso Ahora
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </a>
                            <p className="text-xs text-gray-500 mt-2">Sin compromiso. Garantía de devolución de 30 días.</p>
                        </div>

                    </div>
                </div>

                {/* Footer simple */}
                <div className="mt-20 text-gray-500 text-sm">
                    © 2026 SmartKubik Inc. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
};

export default FoundersPage;
