import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import mermaid from 'mermaid';
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  X,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

// ─── Mermaid Code Block ───────────────────────────────────────────────────────

function MermaidBlock({ code }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 11)}`,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Error rendering diagram');
      });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-md border border-rose-500/30 bg-rose-500/5 text-sm">
        <p className="text-rose-500 font-medium mb-1">Error en diagrama Mermaid</p>
        <pre className="text-xs text-muted-foreground overflow-x-auto">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-muted-foreground">
            Ver código fuente
          </summary>
          <pre className="text-xs mt-2 overflow-x-auto">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
    />
  );
}

// ─── Markdown Renderer with Mermaid + GFM ─────────────────────────────────────

const markdownComponents = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match?.[1];
    const codeStr = String(children).replace(/\n$/, '');

    if (!inline && lang === 'mermaid') {
      return <MermaidBlock code={codeStr} />;
    }

    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-muted text-foreground/90 text-[0.9em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="my-4 p-4 rounded-md bg-muted/60 border border-border overflow-x-auto">
        <code className={`font-mono text-sm ${className || ''}`} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold mt-6 mb-4 pb-2 border-b border-border">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-semibold mt-4 mb-2">{children}</h4>
  ),
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 ml-6 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 ml-6 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 border-l-4 border-primary/40 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold border border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border border-border align-top">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
      className="text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-border" />,
};

function MarkdownContent({ content }) {
  return (
    <div className="text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Tree Sidebar ─────────────────────────────────────────────────────────────

function TreeNode({ node, level, currentPath, onSelect, expanded, onToggleExpand }) {
  const isExpanded = expanded.has(node.path);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => onToggleExpand(node.path)}
          className="w-full flex items-center gap-1.5 py-1 px-2 rounded hover:bg-muted/50 text-sm"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {node.children.length}
          </span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                level={level + 1}
                currentPath={currentPath}
                onSelect={onSelect}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File
  const isActive = currentPath === node.path;
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-2 rounded text-sm transition-colors ${
        isActive
          ? 'bg-primary/15 text-foreground font-medium'
          : 'hover:bg-muted/50 text-muted-foreground'
      }`}
      style={{ paddingLeft: `${level * 12 + 26}px` }}
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{node.name.replace(/\.md$/, '')}</span>
    </button>
  );
}

// Recursive helpers
function findAllFiles(nodes, acc = []) {
  for (const n of nodes) {
    if (n.type === 'file') acc.push(n);
    else if (n.type === 'folder') findAllFiles(n.children, acc);
  }
  return acc;
}

function findAllFolderPaths(nodes, acc = new Set()) {
  for (const n of nodes) {
    if (n.type === 'folder') {
      acc.add(n.path);
      findAllFolderPaths(n.children, acc);
    }
  }
  return acc;
}

function filterTree(nodes, query) {
  const q = query.toLowerCase().trim();
  if (!q) return nodes;
  const result = [];
  for (const n of nodes) {
    if (n.type === 'folder') {
      const filteredChildren = filterTree(n.children, q);
      if (filteredChildren.length > 0 || n.name.toLowerCase().includes(q)) {
        result.push({ ...n, children: filteredChildren });
      }
    } else if (n.name.toLowerCase().includes(q)) {
      result.push(n);
    }
  }
  return result;
}

// ─── Main Wiki Viewer ─────────────────────────────────────────────────────────

export default function WikiViewer() {
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [currentPath, setCurrentPath] = useState(null);
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const res = await fetchApi('/admin/wiki/tree');
      const data = res.data || [];
      setTree(data);
      // Auto-expand top-level folders for usability
      const topFolderPaths = data
        .filter((n) => n.type === 'folder')
        .map((n) => n.path);
      setExpanded(new Set(topFolderPaths));
    } catch (err) {
      toast.error(err?.message || 'Error al cargar el árbol de la wiki');
    } finally {
      setLoadingTree(false);
    }
  }, []);

  const loadPage = useCallback(async (path) => {
    setLoadingContent(true);
    setContentError(null);
    try {
      const res = await fetchApi(
        `/admin/wiki/page?path=${encodeURIComponent(path)}`,
      );
      setContent(res.data?.content || '');
    } catch (err) {
      setContentError(err?.message || 'Error al cargar la página');
      setContent('');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Auto-select index.md if exists when tree loads
  useEffect(() => {
    if (currentPath || tree.length === 0) return;
    const allFiles = findAllFiles(tree);
    const indexFile = allFiles.find((f) => f.path === 'index.md');
    if (indexFile) setCurrentPath(indexFile.path);
    else if (allFiles.length > 0) setCurrentPath(allFiles[0].path);
  }, [tree, currentPath]);

  useEffect(() => {
    if (currentPath) loadPage(currentPath);
  }, [currentPath, loadPage]);

  const handleSelect = useCallback((path) => {
    setCurrentPath(path);
  }, []);

  const handleToggleExpand = useCallback((path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // When searching, expand all matching folders
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const filtered = filterTree(tree, searchQuery);
    return filtered;
  }, [tree, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const allFolders = findAllFolderPaths(filteredTree);
      setExpanded(allFolders);
    }
  }, [searchQuery, filteredTree]);

  const totalFiles = useMemo(() => findAllFiles(tree).length, [tree]);

  if (loadingTree) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Wiki no encontrada</p>
        <p className="text-sm mt-1">
          Verifica que el directorio <code>docs/wiki/</code> esté presente y desplegado al servidor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[600px]">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Documentos
            </span>
            <Badge variant="outline" className="text-[10px]">
              {totalFiles}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {filteredTree.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              Sin resultados
            </div>
          ) : (
            filteredTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                level={0}
                currentPath={currentPath}
                onSelect={handleSelect}
                expanded={expanded}
                onToggleExpand={handleToggleExpand}
              />
            ))
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
        {currentPath && (
          <div className="px-5 py-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <code className="truncate font-mono">{currentPath}</code>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingContent ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contentError ? (
            <div className="text-center text-sm text-rose-500 py-8">
              {contentError}
            </div>
          ) : !currentPath ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Selecciona un documento de la lista
            </div>
          ) : (
            <motion.div
              key={currentPath}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MarkdownContent content={content} />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
