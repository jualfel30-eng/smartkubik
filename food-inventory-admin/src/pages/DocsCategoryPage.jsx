import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  ArrowRight,
  Home,
  ChevronRight,
  BookOpen,
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
  Megaphone,
  UserCog,
  GraduationCap,
  Store,
  Warehouse,
  Briefcase,
} from 'lucide-react';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import DocsSidebar, { DocsSidebarMobileToggle, DocsSidebarDrawer } from '../components/DocsSidebar';
import { docsIndex, getArticlesByCategory } from '../docs/index';
import { fadeUp, STAGGER, listItem } from '../lib/motion';

const DocsCategoryPage = () => {
  const { category } = useParams();
  const categoryData = docsIndex[category];
  const articles = getArticlesByCategory(category);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const categoryIcons = {
    Boxes, ShoppingCart, Truck, Calculator, ArrowRightLeft,
    Users, Settings, UtensilsCrossed, Scissors, Factory,
    Megaphone, UserCog, GraduationCap, Store, Warehouse,
    Briefcase, BookOpen,
  };

  const categoryColors = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    slate: 'from-slate-500 to-slate-600',
    orange: 'from-orange-500 to-orange-600',
    rose: 'from-rose-500 to-rose-600',
    red: 'from-red-500 to-red-600',
    violet: 'from-violet-500 to-violet-600',
    indigo: 'from-indigo-500 to-indigo-600',
    gray: 'from-gray-500 to-gray-600',
    green: 'from-green-500 to-green-600',
  };

  if (!categoryData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Categoría no encontrada</h1>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Documentación
          </Link>
        </div>
      </div>
    );
  }

  const Icon = categoryIcons[categoryData.icon];
  const gradientClass = categoryColors[categoryData.color] || 'from-gray-500 to-gray-600';

  return (
    <>
      <SEO
        title={`${categoryData.title} - Centro de Ayuda`}
        description={categoryData.description}
        keywords={[categoryData.title, 'documentación', 'guías', 'tutoriales', 'SmartKubik ERP']}
        url={`/docs/${category}`}
        type="website"
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Centro de Ayuda", url: "/docs" },
          { name: categoryData.title, url: `/docs/${category}` },
        ]}
      />

      <div className="min-h-screen bg-background">
        <DocsHeader />

        {/* Breadcrumbs */}
        <div className="border-b bg-accent/50">
          <div className="max-w-[1400px] mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                Inicio
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/docs" className="hover:text-primary transition-colors">
                Documentación
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">{categoryData.title}</span>
            </div>
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="max-w-[1400px] mx-auto flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border sticky top-0 h-screen overflow-hidden">
            <DocsSidebar headings={[]} />
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Category Hero */}
            <motion.div
              className={`bg-gradient-to-r ${gradientClass} text-white`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-6 md:px-8 py-10 md:py-12">
                <div className="flex items-start gap-5">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    {Icon && <Icon className="w-8 h-8 md:w-10 md:h-10" />}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
                      {categoryData.title}
                    </h1>
                    <p className="text-base md:text-lg text-white/90 max-w-2xl">
                      {categoryData.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm text-sm">
                      <BookOpen className="w-4 h-4" />
                      {articles.length} {articles.length === 1 ? 'artículo' : 'artículos'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Articles Grid — with stagger animation */}
            <div className="px-6 md:px-8 py-10">
              {articles.length > 0 ? (
                <motion.div
                  className="grid md:grid-cols-2 gap-5"
                  variants={STAGGER(0.06, 0.1)}
                  initial="initial"
                  animate="animate"
                >
                  {articles.map((article) => (
                    <motion.div key={article.slug} variants={listItem}>
                      <Link
                        to={`/docs/${category}/${article.slug}`}
                        className="group block bg-card border border-border rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden"
                      >
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {article.readTime}
                            </div>
                            {article.featured && (
                              <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs font-medium rounded">
                                Destacado
                              </div>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h3>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {article.description}
                          </p>

                          {/* Quick answer preview */}
                          {article.quickAnswer && (
                            <div className="text-xs text-muted-foreground bg-accent/50 rounded-md p-2 mb-3 line-clamp-2">
                              {article.quickAnswer.split('\n')[0]}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {article.keywords.slice(0, 2).map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-accent text-muted-foreground rounded-full"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Próximamente</h3>
                  <p className="text-muted-foreground mb-6">
                    Estamos trabajando en contenido para esta categoría.
                  </p>
                  <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Explorar Otras Categorías
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t bg-card">
              <div className="px-6 md:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-muted-foreground text-sm">
                    © 2025 SmartKubik. Todos los derechos reservados.
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
                    <Link to="/docs" className="hover:text-primary transition-colors">Documentación</Link>
                    <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
                    <Link to="/register" className="hover:text-primary transition-colors">Registrarse</Link>
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

export default DocsCategoryPage;
