import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ArrowRight,
  Home,
  ChevronRight,
  UtensilsCrossed,
  Store,
  Warehouse,
  Briefcase,
  Factory,
  BookOpen
} from 'lucide-react';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import { docsIndex, getArticlesByCategory } from '../docs/index';

const DocsCategoryPage = () => {
  const { category } = useParams();
  const categoryData = docsIndex[category];
  const articles = getArticlesByCategory(category);

  const categoryIcons = {
    UtensilsCrossed,
    Store,
    Warehouse,
    Briefcase,
    Factory,
    BookOpen,
  };

  const categoryColors = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    gray: 'from-gray-500 to-gray-600',
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
  const gradientClass = categoryColors[categoryData.color];

  return (
    <>
      <SEO
        title={`${categoryData.title} - Documentación`}
        description={categoryData.description}
        keywords={[categoryData.title, 'documentación', 'guías', 'tutoriales', 'SmartKubik ERP']}
        url={`/docs/${category}`}
        type="website"
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Documentación", url: "/docs" },
          { name: categoryData.title, url: `/docs/${category}` },
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <DocsHeader />

        {/* Breadcrumbs */}
        <div className="border-b bg-accent/50">
          <div className="max-w-7xl mx-auto px-4 py-3">
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

        {/* Category Hero */}
        <div className={`bg-gradient-to-r ${gradientClass} text-white`}>
          <div className="max-w-7xl mx-auto px-4 py-16">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Documentación
            </Link>

            <div className="flex items-start gap-6">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                {Icon && <Icon className="w-12 h-12" />}
              </div>

              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  {categoryData.title}
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  {categoryData.description}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BookOpen className="w-4 h-4" />
                  {articles.length} {articles.length === 1 ? 'artículo disponible' : 'artículos disponibles'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          {articles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  to={`/docs/${category}/${article.slug}`}
                  className="group bg-card border border-border rounded-xl hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {article.readTime}
                      </div>
                      {article.featured && (
                        <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                          Destacado
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {article.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {article.keywords.slice(0, 2).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-accent text-muted-foreground rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Próximamente
              </h3>
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

        {/* CTA Section */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className={`bg-gradient-to-r ${gradientClass} rounded-2xl p-12 text-center text-white`}>
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para Transformar tu Negocio?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Prueba SmartKubik gratis por 14 días. Sin tarjeta de crédito.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2"
              >
                Comenzar Gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Ver Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t bg-card">
          <div className="max-w-7xl mx-auto px-4 py-8">
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
    </>
  );
};

export default DocsCategoryPage;
