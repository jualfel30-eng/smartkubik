import React, { useState } from 'react';
import WebVentasSection from './WebVentasSection';

/**
 * DEMO PAGE - Tu Web de Ventas Section
 *
 * Esta página te permite previsualizar la nueva sección antes de integrarla
 * al homepage principal.
 *
 * Para verla:
 * 1. Agrega esta ruta al router: /demo-web-ventas
 * 2. Navega a esa URL en el navegador
 * 3. Prueba cambiar entre ES/EN con el botón
 */

const WebVentasSectionDemo = () => {
    const [language, setLanguage] = useState('es');

    return (
        <div className="min-h-screen bg-navy-900">
            {/* Header de control */}
            <div className="fixed top-4 right-4 z-50 flex gap-4">
                <button
                    onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                    className="bg-white/10 backdrop-blur-lg px-4 py-2 rounded-full text-white font-medium hover:bg-white/20 transition-all border border-white/20"
                >
                    {language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
                </button>
            </div>

            {/* Información de demo */}
            <div className="container max-w-7xl mx-auto px-6 pt-8">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-6 mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        🎨 Demo: Nueva Sección "Tu Web de Ventas"
                    </h1>
                    <p className="text-gray-300 mb-4">
                        Esta es una previsualización de la nueva sección propuesta para el homepage de SmartKubik.
                        Se insertaría como <strong>Sección 6</strong>, después de "Para Tu Tipo de Negocio" y antes de "La IA que Trabaja por Ti".
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-cyan-400 font-semibold mb-2">✅ Características implementadas:</p>
                            <ul className="text-gray-400 space-y-1">
                                <li>• Diseño consistente con el homepage actual</li>
                                <li>• Glassmorphism y gradientes cyan-emerald</li>
                                <li>• Animaciones al scroll</li>
                                <li>• Soporte bilingüe ES/EN</li>
                                <li>• 100% responsive</li>
                                <li>• Hover effects en todos los cards</li>
                            </ul>
                        </div>
                        <div>
                            <p className="text-cyan-400 font-semibold mb-2">📋 Contenido incluido:</p>
                            <ul className="text-gray-400 space-y-1">
                                <li>• Headline con gradient text</li>
                                <li>• 3 pasos "Cómo Funciona"</li>
                                <li>• 6 beneficios en grid</li>
                                <li>• 6 verticales de industria</li>
                                <li>• Tabla comparativa</li>
                                <li>• Cierre emocional + CTAs</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-cyan-500/20">
                        <p className="text-gray-400 text-sm">
                            <strong>Nota:</strong> Los mockups de dispositivos son placeholders. En producción se reemplazarían con capturas de pantalla reales o renders 3D de las interfaces.
                        </p>
                    </div>
                </div>
            </div>

            {/* La sección en sí */}
            <WebVentasSection language={language} />

            {/* Footer informativo */}
            <div className="container max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-3">🚀 Próximos pasos para integración:</h3>
                    <ol className="text-gray-400 space-y-2 text-sm">
                        <li>1. <strong className="text-white">Revisar contenido:</strong> Confirmar textos en ES/EN y hacer ajustes si es necesario</li>
                        <li>2. <strong className="text-white">Preparar assets:</strong> Crear mockups reales de las 3 interfaces (tienda, agenda, reservas)</li>
                        <li>3. <strong className="text-white">Definir CTAs:</strong> Configurar enlaces a ejemplos reales o demos interactivos</li>
                        <li>4. <strong className="text-white">Integrar al homepage:</strong> Importar el componente y ubicarlo después de la sección de industrias</li>
                        <li>5. <strong className="text-white">Actualizar navegación:</strong> Agregar anchor link en el menú si es necesario</li>
                        <li>6. <strong className="text-white">Testing:</strong> Verificar responsive en móvil, tablet y desktop</li>
                        <li>7. <strong className="text-white">Analytics:</strong> Agregar tracking de clics en CTAs</li>
                    </ol>
                </div>

                <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">💡 Valor estratégico de esta sección:</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-emerald-400 font-semibold mb-2">Diferenciación</p>
                            <p className="text-gray-400">
                                Destaca una ventaja que Odoo, SAP y QuickBooks no tienen integrada de esta forma.
                            </p>
                        </div>
                        <div>
                            <p className="text-emerald-400 font-semibold mb-2">Valor Tangible</p>
                            <p className="text-gray-400">
                                Comunica $3,000+ en ahorro de desarrollo + $300/mes en herramientas incluido.
                            </p>
                        </div>
                        <div>
                            <p className="text-emerald-400 font-semibold mb-2">Conversión</p>
                            <p className="text-gray-400">
                                "Vende mientras duermes" es un beneficio emocional poderoso para pequeños negocios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .bg-navy-900 {
                    background-color: #0A0F1C;
                }

                body {
                    background-color: #0A0F1C;
                    color: #F8FAFC;
                }
            `}</style>
        </div>
    );
};

export default WebVentasSectionDemo;
