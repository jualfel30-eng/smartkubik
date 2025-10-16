import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Check, Star, Users, TrendingUp, Shield, Zap, BarChart3, MessageCircle, Calendar, Package, CreditCard, Settings, PlayCircle, ArrowRight, Menu, X, Sun, Moon } from 'lucide-react';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import SmartKubikLogoLight from '@/assets/logo-smartkubik-light.png';

const SmartKubikLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  const logoSrc = isDarkMode ? SmartKubikLogoDark : SmartKubikLogoLight;

  const features = [
    {
      icon: <Package className="w-6 h-6" />,
      title: "Inventario",
      description: "Control total de productos y stock en tiempo real",
      accent: "blue"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Ventas",
      description: "Facturación automática y contabilidad integrada",
      accent: "green"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "CRM 80/20",
      description: "Identifica y premia a tus mejores clientes",
      accent: "purple"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Agenda",
      description: "Programa citas directamente desde WhatsApp",
      accent: "orange"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "WhatsApp IA",
      description: "Asistente que vende 24/7 automáticamente",
      accent: "gradient"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics",
      description: "Reportes claros para tomar mejores decisiones",
      accent: "blue"
    }
  ];

  const benefits = [
    "Organiza todas las áreas de tu negocio en un solo lugar",
    "Aumenta ventas con IA que trabaja 24/7",
    "Identifica automáticamente a tus mejores clientes",
    "Ahorra 80% del tiempo en tareas administrativas",
    "Una fracción del costo de sistemas tradicionales",
    "Fácil de usar, sin conocimientos técnicos"
  ];

  const plans = [
    {
      name: "Básico",
      price: "$29",
      period: "/mes",
      description: "Para empezar a organizar tu negocio",
      features: [
        "Inventario y productos",
        "Ventas y facturación",
        "Contabilidad básica",
        "CRM de clientes",
        "Reportes esenciales",
        "Soporte por email"
      ],
      popular: false,
      available: true
    },
    {
      name: "Profesional", 
      price: "$59",
      period: "/mes",
      description: "Para negocios que buscan crecer",
      features: [
        "Todo del plan Básico",
        "Calendario de citas",
        "Contabilidad avanzada",
        "Múltiples usuarios",
        "Reportes avanzados",
        "Soporte prioritario"
      ],
      popular: true,
      available: true
    },
    {
      name: "IA Premium",
      price: "$150", 
      period: "/mes",
      description: "La revolución completa para tu negocio",
      features: [
        "Todo del plan Profesional",
        "WhatsApp + IA integrado",
        "Ventas automáticas 24/7",
        "CRM 80/20 inteligente",
        "Descuentos automáticos VIP",
        "Consultoría especializada"
      ],
      popular: false,
      available: false,
      comingSoon: true
    }
  ];

  const accentColors = {
    blue: isDarkMode ? "border-l-blue-400" : "border-l-blue-500",
    green: isDarkMode ? "border-l-green-400" : "border-l-green-500", 
    purple: isDarkMode ? "border-l-purple-400" : "border-l-purple-500",
    orange: isDarkMode ? "border-l-orange-400" : "border-l-orange-500",
    gradient: "border-l-blue-500"
  };

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
    bgCard: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    borderLight: isDarkMode ? 'border-gray-600' : 'border-gray-100',
    navBg: isDarkMode ? 'bg-gray-900/95' : 'bg-white/95',
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeClasses.bg}`}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .button-hover {
          transition: all 0.2s ease;
        }
        
        .button-hover:hover {
          transform: translateY(-1px);
        }
        
        .card-hover {
          transition: all 0.2s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
        }
      `}</style>

      {/* Navigation - Clean Microsoft style */}
      <nav className={`fixed top-0 w-full ${themeClasses.navBg} backdrop-blur-sm border-b ${themeClasses.borderLight} z-50 transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 animate-fadeIn">
              <img src={logoSrc} alt="Smart Kubik" className="h-10 w-auto" />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`text-sm ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}>Características</a>
              <a href="#benefits" className={`text-sm ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}>Beneficios</a>
              <a href="#pricing" className={`text-sm ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}>Precios</a>
              <Link to="/blog" className={`text-sm ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}>Blog</Link>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors duration-200 button-hover">
                Regístrate
              </Link>
              <Link to="/login" className={`text-sm font-medium ${themeClasses.text} hover:text-white transition-colors duration-200 button-hover hover:bg-blue-600 px-4 py-2 rounded-md`}>
                Inicia sesión
              </Link>
            </div>

            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className={`w-5 h-5 ${themeClasses.text}`} /> : <Menu className={`w-5 h-5 ${themeClasses.text}`} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className={`md:hidden ${themeClasses.bgCard} border-t ${themeClasses.borderLight} animate-fadeIn`}>
            <div className="px-6 py-4 space-y-3">
              <a href="#features" className={`block text-sm ${themeClasses.textSecondary}`}>Características</a>
              <a href="#benefits" className={`block text-sm ${themeClasses.textSecondary}`}>Beneficios</a>
              <a href="#pricing" className={`block text-sm ${themeClasses.textSecondary}`}>Precios</a>
              <Link to="/blog" className={`block text-sm ${themeClasses.textSecondary}`}>Blog</Link>
              <button
                onClick={toggleDarkMode}
                className={`flex items-center space-x-2 text-sm ${themeClasses.textSecondary}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>
              <Link to="/register" className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
                Regístrate
              </Link>
              <Link to="/login" className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
                Inicia sesión
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Clean, focused */}
      <section id="hero" className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center ${isDarkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-600'} px-3 py-1.5 rounded-full text-sm font-medium mb-8 animate-fadeInUp`}>
              <Zap className="w-4 h-4 mr-2" />
              Próximamente: WhatsApp + IA para ventas automáticas
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${themeClasses.text} mb-6 leading-tight animate-fadeInUp delay-100`}>
              Organiza tu negocio
              <span className="block gradient-text">
                como un cubo Rubik
              </span>
            </h1>
            
            <p className={`text-lg ${themeClasses.textSecondary} mb-8 max-w-2xl mx-auto animate-fadeInUp delay-200`}>
              Sistema administrativo completo: inventario, ventas, contabilidad, CRM y pronto WhatsApp con IA. Todo integrado y fácil de usar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fadeInUp delay-300">
              <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center button-hover">
                Comenzar gratis 14 días
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <button className={`flex items-center text-sm ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-200`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Ver demo (2 min)
              </button>
            </div>

            {/* Product preview - Clean grid */}
            <div className={`max-w-5xl mx-auto animate-fadeInUp delay-400`}>
              <div className={`${themeClasses.bgCard} rounded-lg border ${themeClasses.borderLight} p-8`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {features.map((feature, index) => (
                    <div key={index} className={`text-left`}>
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} ${themeClasses.textMuted} flex-shrink-0`}>
                          {feature.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-medium text-sm ${themeClasses.text} mb-1`}>
                            {feature.title}
                          </h3>
                          <p className={`text-xs ${themeClasses.textMuted} leading-relaxed`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section - Clean and focused */}
      <section id="problem" className={`py-16 ${themeClasses.bgSecondary} px-6 transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 ${isVisible.problem ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${themeClasses.text} mb-4`}>
              ¿Te sientes abrumado manejando tu negocio?
            </h2>
            <p className={`text-lg ${themeClasses.textSecondary} max-w-2xl mx-auto`}>
              Llevar un negocio es complejo cuando usas 5 programas diferentes para inventario, ventas, contabilidad, clientes y agenda.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { title: "Información dispersa", desc: "Ventas en Excel, inventario en papel, clientes en WhatsApp" },
              { title: "Pérdida de tiempo", desc: "Horas perdidas transfiriendo información entre sistemas" },
              { title: "Ventas perdidas", desc: "Clientes que se van por falta de respuesta o stock" }
            ].map((item, index) => (
              <div key={index} className={`${themeClasses.bgCard} p-6 rounded-lg border ${themeClasses.borderLight} card-hover ${isVisible.problem ? 'animate-fadeInUp' : 'opacity-0'}`} style={{animationDelay: `${index * 100}ms`}}>
                <h3 className={`font-semibold ${themeClasses.text} mb-2`}>{item.title}</h3>
                <p className={`text-sm ${themeClasses.textSecondary}`}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className={`text-center ${isVisible.problem ? 'animate-fadeInUp delay-300' : 'opacity-0'}`}>
            <p className={`text-lg ${themeClasses.textSecondary}`}>
              Es momento de organizar tu negocio como un cubo Rubik: <span className={`font-medium ${themeClasses.text}`}>cada cara en su lugar, todo conectado</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - Clean cards */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 ${isVisible.features ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${themeClasses.text} mb-4`}>
              Todo en un solo lugar
            </h2>
            <p className={`text-lg ${themeClasses.textSecondary} max-w-2xl mx-auto`}>
              Smart Kubik integra todas las herramientas esenciales. Simple, potente y diseñado para empresarios.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className={`${themeClasses.bgCard} p-6 rounded-lg border-l-4 ${accentColors[feature.accent]} border-t border-r border-b ${themeClasses.borderLight} card-hover transition-all duration-200 ${isVisible.features ? 'animate-fadeInUp' : 'opacity-0'}`} style={{animationDelay: `${index * 50}ms`}}>
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} ${themeClasses.textMuted} flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${themeClasses.text} mb-2`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm ${themeClasses.textSecondary} leading-relaxed`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - Two column layout */}
      <section id="benefits" className={`py-16 ${themeClasses.bgSecondary} px-6 transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className={isVisible.benefits ? 'animate-fadeInUp' : 'opacity-0'}>
              <h2 className={`text-3xl md:text-4xl font-bold ${themeClasses.text} mb-6`}>
                ¿Por qué Smart Kubik es diferente?
              </h2>
              <p className={`text-lg ${themeClasses.textSecondary} mb-8`}>
                No somos solo otro software. Somos la solución completa pensada específicamente para empresarios venezolanos.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className={`flex items-start space-x-3 ${isVisible.benefits ? 'animate-fadeInUp' : 'opacity-0'}`} style={{animationDelay: `${index * 50}ms`}}>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className={`text-sm ${themeClasses.text}`}>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className={`mt-8 p-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} rounded-lg border ${isVisible.benefits ? 'animate-fadeInUp delay-300' : 'opacity-0'}`}>
                <div className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className={`font-semibold ${themeClasses.text} mb-1`}>Próximamente: IA Revolution</h3>
                    <p className={`text-sm ${themeClasses.textSecondary}`}>
                      Asistente de ventas en WhatsApp que trabajará 24/7 aumentando tus ingresos automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${isVisible.benefits ? 'animate-fadeInUp delay-200' : 'opacity-0'}`}>
              <div className={`${themeClasses.bgCard} p-6 rounded-lg border ${themeClasses.borderLight}`}>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Caso de éxito real</h3>
                </div>
                <blockquote className={`${themeClasses.textSecondary} mb-4 text-sm leading-relaxed`}>
                  "Smart Kubik me cambió el negocio. Antes perdía horas con Excel y papeles. Ahora todo está organizado y puedo enfocarme en vender más."
                </blockquote>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className={`font-medium ${themeClasses.text} text-sm`}>Carlos M.</p>
                    <p className={`text-xs ${themeClasses.textMuted}`}>Retail de tecnología</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Clean cards */}
      <section id="pricing" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 ${isVisible.pricing ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold ${themeClasses.text} mb-4`}>
              Precios transparentes
            </h2>
            <p className={`text-lg ${themeClasses.textSecondary} max-w-2xl mx-auto`}>
              14 días gratis. Elige el plan que mejor se adapte a tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div key={index} className={`relative ${themeClasses.bgCard} rounded-lg p-6 border transition-all duration-200 ${
                plan.popular ? 'border-blue-500 ring-1 ring-blue-500' : themeClasses.borderLight
              } ${!plan.available ? 'opacity-60' : ''} card-hover ${isVisible.pricing ? 'animate-fadeInUp' : 'opacity-0'}`} style={{animationDelay: `${index * 100}ms`}}>
                
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Más popular
                    </span>
                  </div>
                )}
                
                {plan.comingSoon && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Próximamente
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>{plan.name}</h3>
                  <div className="mb-3">
                    <span className={`text-3xl font-bold ${themeClasses.text}`}>{plan.price}</span>
                    <span className={`${themeClasses.textMuted}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className={`text-sm ${themeClasses.text}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  to="/register"
                  className={`w-full block text-center py-2.5 rounded text-sm font-medium transition-all duration-200 ${
                    plan.available 
                      ? plan.popular 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 button-hover' 
                        : `border border-blue-600 text-blue-600 hover:bg-blue-50 ${isDarkMode ? 'hover:bg-blue-900/20' : ''}`
                      : `${isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                  }`}
                  disabled={!plan.available}
                >
                  {plan.comingSoon ? 'Próximamente' : 'Comenzar gratis'}
                </Link>
              </div>
            ))}
          </div>

          <div className={`text-center mt-12 ${isVisible.pricing ? 'animate-fadeInUp delay-300' : 'opacity-0'}`}>
            <p className={`${themeClasses.textSecondary} mb-4 text-sm`}>
              ¿Necesitas más información? Tenemos una solución para cada tipo de negocio.
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200">
              Hablar con un especialista →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 animate-fadeInUp">
            ¿Listo para organizar tu negocio?
          </h2>
          <p className="text-lg text-blue-100 mb-8 animate-fadeInUp delay-100">
            Únete a los empresarios que ya están transformando sus negocios con Smart Kubik.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fadeInUp delay-200">
            <Link to="/register" className="bg-white text-blue-600 px-6 py-3 rounded text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center button-hover">
              Comenzar gratis ahora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <button className="text-white border border-white px-6 py-3 rounded text-sm font-medium hover:bg-white hover:text-blue-600 transition-all duration-200 button-hover">
              Ver demo
            </button>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100 text-sm animate-fadeInUp delay-300">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Sin tarjeta de crédito
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              14 días gratis
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Soporte en español
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-900'} text-white py-12 px-6 transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4 animate-fadeIn">
                <img src={SmartKubikLogoDark} alt="Smart Kubik" className="h-10 w-auto" />
              </div>
              <p className="text-gray-400 mb-6 max-w-md text-sm">
                La solución completa para organizar y hacer crecer tu negocio. Diseñado específicamente para empresarios venezolanos.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-4 text-sm">Producto</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors duration-200">Características</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200">Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4 text-sm">Soporte</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors duration-200">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Smart Kubik. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400 mt-4 sm:mt-0">
              <a href="#" className="hover:text-white transition-colors duration-200">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Términos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartKubikLanding;
