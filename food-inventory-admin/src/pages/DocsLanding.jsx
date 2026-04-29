import { Link } from 'react-router-dom';
import {
  Boxes,
  ShoppingCart,
  Truck,
  Calculator,
  ArrowRightLeft,
  Users,
  Settings,
  UtensilsCrossed,
  Scissors,
  Factory,
  UserCog,
  GraduationCap,
  Megaphone,
  Search,
  Clock,
  ArrowRight,
  Zap,
  CheckCircle,
  MessageCircle,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import DocsSidebar, { DocsSidebarMobileToggle, DocsSidebarDrawer } from '../components/DocsSidebar';
import { searchArticles, popularSearches, landingCategories } from '../docs/index';
import { trackEvent } from '../lib/analytics';
import { SPRING, DUR, EASE, STAGGER, listItem, fadeUp, scaleIn } from '../lib/motion';

const categoryIcons = {
  Boxes, ShoppingCart, Truck, Calculator, ArrowRightLeft,
  Users, Settings, UtensilsCrossed, Scissors, Factory,
  UserCog, GraduationCap, Megaphone,
};

const categoryColors = {
  emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  blue: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  purple: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  amber: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800',
  pink: 'bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800',
  slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800',
  orange: 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
  rose: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800',
  red: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  violet: 'bg-violet-100 text-violet-600 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800',
  indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800',
  gray: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const staggerContainer = STAGGER(0.04, 0.02);
const chipStagger = STAGGER(0.04, 0.1);

const DocsLanding = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Auto-focus search on desktop
  useEffect(() => {
    if (window.innerWidth >= 768 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (query.length >= 1) {
      const results = searchArticles(query);
      setSearchResults(results);
      setIsSearching(true);
      trackEvent('docs_search', {
        query,
        resultsCount: results.length,
        quickAnswerShown: results.length > 0 && !!results[0].quickAnswer,
      });
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, []);

  const handlePillClick = (pill) => {
    handleSearch(pill.query);
    searchInputRef.current?.focus();
    trackEvent('docs_popular_search', { label: pill.label, query: pill.query });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // The first result with a quickAnswer
  const quickAnswerResult = searchResults.find((r) => r.quickAnswer);

  return (
    <>
      <SEO
        title="Centro de Ayuda — SmartKubik"
        description="Guías paso a paso, soluciones a problemas comunes, y tutoriales para cada módulo de SmartKubik. Inventario, ventas, compras, contabilidad y más."
        keywords={[
          "documentación ERP", "centro de ayuda", "guías SmartKubik",
          "tutoriales", "soluciones", "inventario", "ventas", "contabilidad"
        ]}
        url="/docs"
        type="website"
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Centro de Ayuda", url: "/docs" },
        ]}
      />

      <div className="min-h-screen bg-background">
        <DocsHeader />

        {/* Main Layout: Sidebar + Content */}
        <div className="max-w-[1400px] mx-auto flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border sticky top-0 h-screen overflow-hidden">
            <DocsSidebar headings={[]} />
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* HERO: Search-first — "Tell me what hurts" */}
            <section className="px-6 md:px-8 pt-10 md:pt-14 pb-8">
              <motion.div
                className="max-w-2xl mx-auto text-center"
                initial="initial"
                animate="animate"
                variants={fadeUp}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                  <Zap className="w-3.5 h-3.5" />
                  Centro de Ayuda
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                  ¿Con qué necesitas ayuda?
                </h1>

                <p className="text-base text-muted-foreground mb-6">
                  Describe tu problema y te damos la respuesta al instante.
                </p>

                {/* Search Bar — HERO element */}
                <div className="relative max-w-xl mx-auto" ref={searchContainerRef}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder='Describe tu problema... (ej: "no puedo ajustar stock")'
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-input bg-background text-foreground focus:border-primary focus:outline-none text-base placeholder:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Search Results Dropdown with Quick Answer */}
                  <AnimatePresence>
                    {isSearching && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: DUR.fast, ease: EASE.out }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-xl border border-border max-h-[70vh] overflow-y-auto z-20 text-left"
                      >
                        {searchResults.length > 0 ? (
                          <div>
                            {/* Quick Answer — the answer WITHOUT clicking an article */}
                            {quickAnswerResult && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={SPRING.soft}
                                className="p-4 border-b border-border bg-emerald-50/50 dark:bg-emerald-950/30"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={SPRING.bouncy}
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </motion.div>
                                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                    Respuesta rápida
                                  </span>
                                </div>
                                <div className="text-sm text-foreground whitespace-pre-line leading-relaxed border-l-2 border-emerald-400 pl-3">
                                  {quickAnswerResult.quickAnswer}
                                </div>
                                <Link
                                  to={`/docs/${quickAnswerResult.category}/${quickAnswerResult.slug}`}
                                  className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline font-medium"
                                  onClick={clearSearch}
                                >
                                  Ver guía completa
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </motion.div>
                            )}

                            {/* Article Results */}
                            <motion.div
                              className="p-2"
                              variants={staggerContainer}
                              initial="initial"
                              animate="animate"
                            >
                              {quickAnswerResult && searchResults.length > 1 && (
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold px-3 pt-2 pb-1">
                                  Artículos relacionados
                                </p>
                              )}
                              {searchResults.map((article) => (
                                <motion.div key={`${article.category}-${article.slug}`} variants={listItem}>
                                  <Link
                                    to={`/docs/${article.category}/${article.slug}`}
                                    className="block p-3 hover:bg-accent rounded-lg transition-colors"
                                    onClick={clearSearch}
                                  >
                                    <div className="font-medium text-sm text-foreground">{article.title}</div>
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.description}</div>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {article.readTime}
                                      <span className="mx-1">·</span>
                                      {article.categoryTitle}
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                            </motion.div>
                          </div>
                        ) : (
                          <div className="p-6 text-center">
                            <p className="text-muted-foreground text-sm mb-3">
                              No encontramos resultados para "{searchQuery}"
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {popularSearches.slice(0, 4).map((pill) => (
                                <button
                                  key={pill.query}
                                  onClick={() => handlePillClick(pill)}
                                  className="text-xs px-3 py-1.5 bg-accent text-foreground rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  {pill.label}
                                </button>
                              ))}
                            </div>
                            <a
                              href="https://wa.me/584121234567"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-4 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Contactar soporte por WhatsApp
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </section>

            {/* "Lo más buscado" pills */}
            <section className="px-6 md:px-8 pb-8">
              <div className="max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
                  Lo más buscado
                </p>
                <motion.div
                  className="flex flex-wrap justify-center gap-2"
                  variants={chipStagger}
                  initial="initial"
                  animate="animate"
                >
                  {popularSearches.map((pill) => (
                    <motion.button
                      key={pill.query}
                      variants={scaleIn}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePillClick(pill)}
                      className="text-sm px-4 py-2 bg-card border border-border rounded-full text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      {pill.label}
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </section>

            {/* Category Grid — 8 groups, secondary to search */}
            <section className="px-6 md:px-8 pb-10">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="text-lg font-bold text-foreground">Guías por módulo</h2>
                </div>

                <motion.div
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  variants={STAGGER(0.05, 0.15)}
                  initial="initial"
                  animate="animate"
                >
                  {landingCategories.map((cat) => {
                    const Icon = categoryIcons[cat.icon];
                    const colorClass = categoryColors[cat.color] || categoryColors.gray;

                    return (
                      <motion.div key={cat.key} variants={listItem}>
                        <Link
                          to={`/docs/${cat.key}`}
                          className="group flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-primary/30 transition-all text-center"
                        >
                          <div className={`p-2.5 rounded-lg border ${colorClass}`}>
                            {Icon && <Icon className="w-5 h-5" />}
                          </div>
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {cat.label}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* More categories link */}
                <div className="text-center mt-4">
                  <Link
                    to="/docs/transferencias"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    + Transferencias, Producción, RRHH, Marketing y más
                  </Link>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="px-6 md:px-8 pb-10">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 md:p-8 text-center text-white">
                  <h2 className="text-xl md:text-2xl font-bold mb-3">
                    ¿No encontraste lo que buscabas?
                  </h2>
                  <p className="text-sm md:text-base mb-5 opacity-90">
                    El Asistente IA dentro de la plataforma puede consultar tu inventario, órdenes y configuración en tiempo real.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <a
                      href="https://wa.me/584121234567"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar Soporte
                    </a>
                    <Link
                      to="/login"
                      className="px-5 py-2.5 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-sm"
                    >
                      Ir a SmartKubik
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-card">
              <div className="px-6 md:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-muted-foreground text-sm">
                    © 2025 SmartKubik. Todos los derechos reservados.
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
                    <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
                    <Link to="/register" className="hover:text-primary transition-colors">Registrarse</Link>
                    <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <DocsSidebarMobileToggle
          isOpen={isMobileSidebarOpen}
          onToggle={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <DocsSidebarDrawer
          isOpen={isMobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        >
          <DocsSidebar
            headings={[]}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </DocsSidebarDrawer>
      </div>
    </>
  );
};

export default DocsLanding;
