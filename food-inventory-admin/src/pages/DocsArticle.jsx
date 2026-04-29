import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, ChevronRight, Home, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import DocsHeader from '../components/DocsHeader';
import DocsSidebar, { DocsSidebarMobileToggle, DocsSidebarDrawer } from '../components/DocsSidebar';
import ReadingProgress from '../components/ReadingProgress';
import ArticleFeedback from '../components/ArticleFeedback';
import { docsIndex, getArticleBySlug, getArticlesByCategory } from '../docs/index';
import { trackEvent } from '../lib/analytics';
import { fadeUp, DUR, EASE, STAGGER, listItem } from '../lib/motion';

const DocsArticle = () => {
  const { category, slug } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const readStartRef = useRef(Date.now());

  const categoryData = docsIndex[category];
  const articleMeta = getArticleBySlug(slug);
  const relatedArticles = getArticlesByCategory(category).filter(a => a.slug !== slug).slice(0, 3);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/src/docs/${category}/${slug}.md`);

        if (!response.ok) {
          throw new Error('Article not found');
        }

        const text = await response.text();

        // Parse frontmatter
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = text.match(frontmatterRegex);

        if (match) {
          const frontmatter = match[1];
          const content = match[2];

          const meta = {};
          let currentKey = null;
          let multilineValue = '';
          let inMultiline = false;

          frontmatter.split('\n').forEach(line => {
            // Handle YAML multiline (|)
            if (inMultiline) {
              if (line.match(/^\s/) || line === '') {
                multilineValue += (multilineValue ? '\n' : '') + line.replace(/^ {2}/, '');
                return;
              } else {
                meta[currentKey] = multilineValue.trim();
                inMultiline = false;
              }
            }

            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();

              if (value === '|') {
                currentKey = key;
                multilineValue = '';
                inMultiline = true;
                return;
              }

              value = value.replace(/^["']|["']$/g, '');
              if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
              }
              meta[key] = value;
            }
          });

          // Flush any remaining multiline
          if (inMultiline && currentKey) {
            meta[currentKey] = multilineValue.trim();
          }

          setMetadata(meta);
          setMarkdown(content);
        } else {
          setMarkdown(text);
        }

        setIsLoading(false);
        readStartRef.current = Date.now();
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError('No se pudo cargar el artículo');
        setIsLoading(false);
      }
    };

    if (category && slug) {
      loadMarkdown();
      setMobileSidebarOpen(false);
    }

    // Track read time on unmount
    return () => {
      if (readStartRef.current && slug) {
        const readTime = Math.round((Date.now() - readStartRef.current) / 1000);
        if (readTime > 3) {
          trackEvent('docs_article_read', { slug, category, readTimeSeconds: readTime });
        }
      }
    };
  }, [category, slug]);

  // Extract headings from markdown for TOC
  const headings = useMemo(() => {
    if (!markdown) return [];
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const result = [];
    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
      const text = match[2].replace(/[*_`]/g, '');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      result.push({
        level: match[1].length,
        text,
        id,
      });
    }
    return result;
  }, [markdown]);

  // Get quickAnswer from article meta (index.js) or frontmatter
  const quickAnswer = articleMeta?.quickAnswer || metadata?.quickAnswer;

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DocsHeader />
        <div className="max-w-[1400px] mx-auto flex">
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border" />
          <div className="flex-1 min-w-0">
            <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse">
              <div className="h-8 bg-accent rounded-lg w-3/4 mb-4" />
              <div className="h-4 bg-accent rounded w-full mb-2" />
              <div className="h-4 bg-accent rounded w-2/3 mb-8" />
              <div className="h-px bg-border mb-8" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="mb-3">
                  <div className={`h-4 bg-accent rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/5'}`} />
                </div>
              ))}
            </div>
          </div>
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
        articleData={{ wordCount: markdown.split(/\s+/).length }}
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Centro de Ayuda", url: "/docs" },
          { name: categoryData.title, url: `/docs/${category}` },
          { name: metadata?.title || articleMeta.title, url: `/docs/${category}/${slug}` },
        ]}
      />

      <ReadingProgress />

      <div className="min-h-screen bg-background">
        <DocsHeader />

        {/* Breadcrumbs */}
        <div className="border-b bg-accent/50">
          <div className="max-w-[1400px] mx-auto px-4 py-3">
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

        {/* Main Layout: Sidebar + Content */}
        <div className="max-w-[1400px] mx-auto flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border sticky top-0 h-screen overflow-hidden">
            <DocsSidebar headings={headings} />
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeUp}
            >
              {/* Article Header */}
              <div className="max-w-3xl mx-auto px-6 py-10">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  {metadata?.title || articleMeta.title}
                </h1>

                <p className="text-base md:text-lg text-muted-foreground mb-6">
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

              {/* TL;DR Summary — the answer for 80% of users */}
              {quickAnswer && (
                <div className="max-w-3xl mx-auto px-6 pb-6">
                  <div className="bg-accent/60 dark:bg-accent/30 border border-border rounded-lg p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                      En resumen
                    </p>
                    <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {quickAnswer}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tiempo estimado: {metadata?.readTime || articleMeta.readTime || '2 min'}
                    </p>
                  </div>
                </div>
              )}

              {/* Article Content */}
              <article className="max-w-3xl mx-auto px-6 pb-12">
                <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:scroll-mt-4
                  prose-h1:text-3xl prose-h1:mb-4
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                  prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
                  prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:font-semibold
                  prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                  prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                  prose-li:my-2
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-accent/50 prose-blockquote:py-2 prose-blockquote:rounded-r-md
                  prose-code:bg-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-primary prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                  prose-table:w-full prose-table:border-collapse
                  prose-thead:border-b-2
                  prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:bg-accent/50
                  prose-td:p-3 prose-td:border-b
                  prose-img:rounded-lg prose-img:shadow-lg
                ">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    components={{
                      h2: ({ node, children, ...props }) => {
                        const text = String(children).replace(/[*_`]/g, '');
                        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
                        return <h2 id={id} {...props}>{children}</h2>;
                      },
                      h3: ({ node, children, ...props }) => {
                        const text = String(children).replace(/[*_`]/g, '');
                        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
                        return <h3 id={id} {...props}>{children}</h3>;
                      },
                      a: ({ node, href, children, ...props }) => {
                        if (href?.startsWith('/docs/')) {
                          return <Link to={href} {...props}>{children}</Link>;
                        }
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

              {/* Article Completed — Clear Next Step */}
              <div className="max-w-3xl mx-auto px-6 pb-8">
                <div className="bg-accent/40 dark:bg-accent/20 rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-foreground font-medium">
                    ¿Ya tienes lo que necesitabas?
                  </p>
                  <div className="flex gap-3">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Volver a SmartKubik
                    </Link>
                    <Link
                      to="/docs"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      Más artículos
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Was This Helpful? */}
              <div className="max-w-3xl mx-auto px-6 pb-8">
                <ArticleFeedback articleSlug={slug} category={category} />
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="max-w-3xl mx-auto px-6 pb-16">
                  <div className="border-t pt-10">
                    <h2 className="text-lg font-bold text-foreground mb-4">Artículos Relacionados</h2>
                    <motion.div
                      className="grid md:grid-cols-3 gap-4"
                      variants={STAGGER(0.05)}
                      initial="initial"
                      whileInView="animate"
                      viewport={{ once: true, margin: '-50px' }}
                    >
                      {relatedArticles.map((article) => (
                        <motion.div key={article.slug} variants={listItem}>
                          <Link
                            to={`/docs/${category}/${article.slug}`}
                            className="group block p-4 border border-border rounded-lg hover:border-primary hover:shadow-sm transition-all"
                          >
                            <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Footer */}
            <footer className="border-t bg-card">
              <div className="max-w-3xl mx-auto px-6 py-8">
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
            headings={headings}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </DocsSidebarDrawer>
      </div>
    </>
  );
};

export default DocsArticle;
