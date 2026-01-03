import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { ArrowLeft, Clock, BookOpen, ChevronRight, Home } from 'lucide-react';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import { docsIndex, getArticleBySlug, getArticlesByCategory } from '../docs/index';

const DocsArticle = () => {
  const { category, slug } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryData = docsIndex[category];
  const articleMeta = getArticleBySlug(slug);
  const relatedArticles = getArticlesByCategory(category).filter(a => a.slug !== slug).slice(0, 3);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        // Dynamic import of markdown file
        const response = await fetch(`/src/docs/${category}/${slug}.md`);

        if (!response.ok) {
          throw new Error('Article not found');
        }

        const text = await response.text();

        // Parse frontmatter (metadata between ---)
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = text.match(frontmatterRegex);

        if (match) {
          const frontmatter = match[1];
          const content = match[2];

          // Parse frontmatter into object
          const meta = {};
          frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();

              // Remove quotes
              value = value.replace(/^["']|["']$/g, '');

              // Parse arrays (keywords)
              if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
              }

              meta[key] = value;
            }
          });

          setMetadata(meta);
          setMarkdown(content);
        } else {
          setMarkdown(text);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError('No se pudo cargar el artículo');
        setIsLoading(false);
      }
    };

    if (category && slug) {
      loadMarkdown();
    }
  }, [category, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando artículo...</p>
        </div>
      </div>
    );
  }

  if (error || !categoryData || !articleMeta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Artículo no encontrado</h1>
          <p className="text-muted-foreground mb-6">{error || 'El artículo que buscas no existe.'}</p>
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

  return (
    <>
      <SEO
        title={metadata?.title || articleMeta.title}
        description={metadata?.description || articleMeta.description}
        keywords={metadata?.keywords || articleMeta.keywords}
        author={metadata?.author}
        url={`/docs/${category}/${slug}`}
        type="article"
        publishedTime={metadata?.date}
        category={categoryData.title}
        readTime={metadata?.readTime}
        articleData={{
          wordCount: markdown.split(/\s+/).length,
        }}
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Documentación", url: "/docs" },
          { name: categoryData.title, url: `/docs/${category}` },
          { name: metadata?.title || articleMeta.title, url: `/docs/${category}/${slug}` },
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <DocsHeader />

        {/* Breadcrumbs */}
        <div className="border-b bg-accent/50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                Inicio
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/docs" className="hover:text-primary transition-colors">
                Docs
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to={`/docs/${category}`} className="hover:text-primary transition-colors">
                {categoryData.title}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-xs">
                {metadata?.title || articleMeta.title}
              </span>
            </div>
          </div>
        </div>

        {/* Article Header */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Documentación
            </Link>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {metadata?.title || articleMeta.title}
          </h1>

          <p className="text-xl text-muted-foreground mb-6">
            {metadata?.description || articleMeta.description}
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground border-b pb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {metadata?.readTime || articleMeta.readTime}
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {categoryData.title}
            </div>
            {metadata?.date && (
              <div>
                {new Date(metadata.date).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 pb-12">
          <div className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold
            prose-h1:text-4xl prose-h1:mb-4
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
            prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-2
            prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:font-semibold
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
            prose-li:my-2
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
            prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-primary prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
            prose-table:w-full prose-table:border-collapse
            prose-thead:border-b-2
            prose-th:p-3 prose-th:text-left prose-th:font-semibold
            prose-td:p-3 prose-td:border-b
            prose-img:rounded-lg prose-img:shadow-lg
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                // Custom link handling
                a: ({ node, href, children, ...props }) => {
                  // Internal links
                  if (href?.startsWith('/docs/')) {
                    return <Link to={href} {...props}>{children}</Link>;
                  }
                  // External links
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-16">
            <div className="border-t pt-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Artículos Relacionados</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    to={`/docs/${category}/${article.slug}`}
                    className="group p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">
              ¿Listo para Implementar esta Solución?
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Prueba SmartKubik gratis por 14 días y transforma tu negocio hoy.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-colors"
            >
              Comenzar Gratis
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
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

export default DocsArticle;
