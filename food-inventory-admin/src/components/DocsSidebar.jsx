import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronDown, ChevronRight, Menu, X, BookOpen } from 'lucide-react';
import { docsIndex } from '../docs/index';
import { SPRING, DUR, EASE } from '../lib/motion';

/**
 * DocsSidebar — Navigation sidebar for the docs/help center.
 * Shows categories (expandable with spring animation) + TOC for current article.
 * Sticky on desktop, drawer on mobile.
 */
export default function DocsSidebar({ headings = [], onMobileClose }) {
  const { category: activeCategory, slug: activeSlug } = useParams();
  const [expandedCategories, setExpandedCategories] = useState({});

  // Auto-expand active category
  useEffect(() => {
    if (activeCategory) {
      setExpandedCategories(prev => ({ ...prev, [activeCategory]: true }));
    }
  }, [activeCategory]);

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const categories = useMemo(() => {
    return Object.entries(docsIndex).filter(([, data]) => data.articles.length > 0);
  }, []);

  return (
    <LayoutGroup>
      <nav className="h-full overflow-y-auto py-6 px-4 text-sm">
        {/* Categories + Articles */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
            Categorías
          </h3>
          <ul className="space-y-1">
            {categories.map(([key, data]) => {
              const isExpanded = expandedCategories[key];
              const isActiveCategory = key === activeCategory;

              return (
                <li key={key}>
                  <button
                    onClick={() => toggleCategory(key)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors text-left ${
                      isActiveCategory
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/80 hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{data.title}</span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: DUR.fast, ease: EASE.out }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING.soft}
                        className="overflow-hidden mt-1 ml-3 pl-3 border-l border-border space-y-0.5"
                      >
                        {data.articles.map((article) => {
                          const isActive = key === activeCategory && article.slug === activeSlug;
                          return (
                            <li key={article.slug} className="relative">
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active-pill"
                                  className="absolute inset-0 bg-primary/10 rounded-md"
                                  transition={SPRING.soft}
                                />
                              )}
                              <Link
                                to={`/docs/${key}/${article.slug}`}
                                onClick={onMobileClose}
                                className={`relative block px-2 py-1.5 rounded-md transition-colors truncate ${
                                  isActive
                                    ? 'text-primary font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                              >
                                {article.title}
                              </Link>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Table of Contents (current article) */}
        {headings.length > 0 && (
          <div className="border-t border-border pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
              En esta página
            </h3>
            <ul className="space-y-0.5">
              {headings.map((heading, idx) => (
                <li key={idx}>
                  <a
                    href={`#${heading.id}`}
                    onClick={onMobileClose}
                    className={`block px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate ${
                      heading.level === 3 ? 'ml-3 text-xs' : ''
                    }`}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </LayoutGroup>
  );
}

/**
 * DocsSidebarMobileToggle — Floating button that opens sidebar drawer on mobile.
 * Larger touch target (56px) positioned above thumb zone.
 */
export function DocsSidebarMobileToggle({ isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-6 right-6 z-50 lg:hidden flex items-center gap-2 px-4 py-3.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors min-h-[56px]"
      aria-label={isOpen ? 'Cerrar navegación' : 'Abrir navegación'}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      {!isOpen && <span className="text-sm font-medium">Índice</span>}
    </button>
  );
}

/**
 * DocsSidebarDrawer — Mobile drawer wrapper with slide-in animation.
 */
export function DocsSidebarDrawer({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={SPRING.drawer}
            className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-background border-r border-border shadow-xl lg:hidden overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Documentación</span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
