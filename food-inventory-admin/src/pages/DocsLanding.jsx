import { Link } from 'react-router-dom';
import {
  BookOpen,
  UtensilsCrossed,
  Store,
  Warehouse,
  Briefcase,
  Factory,
  Search,
  TrendingUp,
  Clock,
  ArrowRight,
  Star,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import { docsIndex, getFeaturedArticles, searchArticles } from '../docs/index';

const DocsLanding = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const featuredArticles = getFeaturedArticles();

  const categoryIcons = {
    UtensilsCrossed,
    Store,
    Warehouse,
    Briefcase,
    Factory,
    BookOpen,
  };

  const categoryColors = {
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setIsSearching(true);
      const results = searchArticles(query);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  return (
    <>
      <SEO
        title="Documentación y Casos de Uso"
        description="Aprende cómo SmartKubik ERP ayuda a restaurantes, tiendas, almacenes y más a optimizar su gestión. Casos de uso reales, tutoriales y guías completas."
        keywords={[
          "documentación ERP",
          "casos de uso ERP",
          "guías SmartKubik",
          "tutoriales gestión empresarial",
          "soluciones de negocio",
          "optimizar inventario",
          "control de ventas"
        ]}
        url="/docs"
        type="website"
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Documentación", url: "/docs" },
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <DocsHeader />

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Centro de Conocimiento SmartKubik
          </div>

          <h1 className="text-5xl font-bold text-foreground mb-6">
            Aprende Cómo SmartKubik<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transforma tu Negocio
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Casos de uso reales, guías paso a paso y soluciones probadas para cada industria.
            Descubre cómo resolver los problemas más comunes de tu negocio.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar soluciones, tutoriales, casos de uso..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-input bg-background text-foreground focus:border-primary focus:outline-none text-lg"
              />
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="mt-4 bg-card rounded-xl shadow-lg border border-border max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="p-2">
                    {searchResults.map((article) => (
                      <Link
                        key={article.slug}
                        to={`/docs/${article.category}/${article.slug}`}
                        className="block p-4 hover:bg-accent rounded-lg transition-colors"
                      >
                        <div className="font-medium text-foreground">{article.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{article.description}</div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                          <span className="mx-1">•</span>
                          <span className="capitalize">{article.categoryTitle}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No se encontraron resultados para "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="text-3xl font-bold text-blue-600 mb-2">{featuredArticles.length}+</div>
              <div className="text-muted-foreground">Guías Prácticas</div>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="text-3xl font-bold text-purple-600 mb-2">6</div>
              <div className="text-muted-foreground">Industrias Cubiertas</div>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
              <div className="text-muted-foreground">Casos Reales</div>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-2 mb-8">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-3xl font-bold text-foreground">Artículos Destacados</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {featuredArticles.map((article) => {
              const categoryData = docsIndex[article.category];
              const Icon = categoryIcons[categoryData.icon];
              const colorClass = categoryColors[categoryData.color];

              return (
                <Link
                  key={article.slug}
                  to={`/docs/${article.category}/${article.slug}`}
                  className="group bg-card rounded-xl shadow-sm border border-border hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg border ${colorClass}`}>
                        {Icon && <Icon className="w-6 h-6" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {article.readTime}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>

                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {article.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {article.keywords.slice(0, 2).map((keyword, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-accent text-muted-foreground rounded-full">
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Categories Grid */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Explora por Industria</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(docsIndex).map((categoryKey) => {
              const category = docsIndex[categoryKey];
              const Icon = categoryIcons[category.icon];
              const colorClass = categoryColors[category.color];
              const articleCount = category.articles.length;

              return (
                <Link
                  key={categoryKey}
                  to={`/docs/${categoryKey}`}
                  className="group bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-lg transition-all duration-300"
                >
                  <div className={`p-3 rounded-lg border ${colorClass} inline-block mb-4`}>
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>

                  <p className="text-muted-foreground text-sm mb-4">
                    {category.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {articleCount} {articleCount === 1 ? 'artículo' : 'artículos'}
                    </span>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para Transformar tu Negocio?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Prueba SmartKubik gratis por 14 días. Sin tarjeta de crédito.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
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
        </section>

        {/* Footer */}
        <footer className="border-t bg-card">
          <div className="max-w-7xl mx-auto px-4 py-8">
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
    </>
  );
};

export default DocsLanding;
