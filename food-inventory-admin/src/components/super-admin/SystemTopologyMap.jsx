import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Layers,
  Filter,
  Target,
  X,
  ChevronRight,
  Activity,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import '@xyflow/react/dist/style.css';

// ─── Status / Layer Configuration ─────────────────────────────────────────────

const STATUS_COLORS = {
  ok: { bg: '#10b981', border: '#10b981', text: '#fff', glow: 'rgba(16,185,129,0.35)' },
  warning: { bg: '#f59e0b', border: '#f59e0b', text: '#fff', glow: 'rgba(245,158,11,0.35)' },
  error: { bg: '#f43f5e', border: '#f43f5e', text: '#fff', glow: 'rgba(244,63,94,0.45)' },
};

const STATUS_ICON = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const GROUP_LABELS = {
  frontends: 'Frontends',
  modules: 'Módulos Backend',
  infrastructure: 'Infraestructura',
  core: 'Core',
  products: 'Productos',
  inventory: 'Inventario',
  sales: 'Ventas',
  purchasing: 'Compras',
  crm: 'CRM',
  finance: 'Finanzas',
  transfers: 'Transferencias',
  hr: 'RRHH',
  services: 'Servicios',
  restaurant: 'Restaurante',
  marketing: 'Marketing',
  storefront: 'Storefront',
  external: 'Externos',
};

// Visual styling per group — frontends and modules get distinct treatment
const GROUP_STYLE = {
  frontends: { isLarge: true, prefix: '🖥️ ' },
  modules: { isLarge: true, prefix: '⚙️ ' },
  infrastructure: { isLarge: true, prefix: '' },
  external: { isLarge: false, prefix: '' },
};

// ─── Custom Node Component ────────────────────────────────────────────────────

function SystemNode({ data }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.warning;
  const Icon = STATUS_ICON[data.status] || AlertTriangle;
  const style = GROUP_STYLE[data.group] || { isLarge: false, prefix: '' };
  const isLarge = style.isLarge;
  const isDimmed = data.dimmed;
  const isHighlighted = data.highlighted;

  return (
    <div
      style={{
        opacity: isDimmed ? 0.2 : 1,
        transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.2s',
        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border, opacity: 0.5 }} />
      <div
        style={{
          background: colors.bg,
          color: colors.text,
          border: `2px solid ${isHighlighted ? '#fff' : colors.border}`,
          borderRadius: 10,
          padding: isLarge ? '12px 18px' : '8px 14px',
          minWidth: isLarge ? 170 : 130,
          fontSize: isLarge ? 14 : 12,
          fontWeight: 600,
          boxShadow: isHighlighted
            ? `0 0 0 4px ${colors.glow}, 0 0 20px ${colors.glow}`
            : `0 2px 8px ${colors.glow}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon size={isLarge ? 18 : 14} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {style.prefix}{data.label}
          </div>
          {data.details && !isLarge && (
            <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>{data.details}</div>
          )}
          {data.details && isLarge && (
            <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>
              {data.details}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border, opacity: 0.5 }} />
    </div>
  );
}

const nodeTypes = { systemNode: SystemNode };

// ─── Layout Algorithm (Dagre) ─────────────────────────────────────────────────

const NODE_DEFAULT_WIDTH = 160;
const NODE_DEFAULT_HEIGHT = 50;
const NODE_LARGE_WIDTH = 200;
const NODE_LARGE_HEIGHT = 70;

function getNodeSize(group) {
  const isLarge = GROUP_STYLE[group]?.isLarge;
  return isLarge
    ? { width: NODE_LARGE_WIDTH, height: NODE_LARGE_HEIGHT }
    : { width: NODE_DEFAULT_WIDTH, height: NODE_DEFAULT_HEIGHT };
}

function computeLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 35,
    ranksep: 100,
    edgesep: 25,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const { width, height } = getNodeSize(node.data?.group);
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const { width, height } = getNodeSize(node.data?.group);
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    };
  });
}

// ─── Build graph data from system map result ──────────────────────────────────

function buildGraphData(systemMap) {
  if (!systemMap?.nodes) return { nodes: [], edges: [] };

  // Build nodes
  const flowNodes = systemMap.nodes.map((n) => ({
    id: n.id,
    type: 'systemNode',
    data: {
      label: n.name,
      status: n.status,
      group: n.group,
      details: n.details,
      raw: n,
    },
    position: { x: 0, y: 0 }, // will be overwritten by dagre
  }));

  // Build edges (only ones with both endpoints existing as nodes)
  const nodeIds = new Set(flowNodes.map((n) => n.id));
  const flowEdges = (systemMap.connections || [])
    .filter((c) => nodeIds.has(c.source) && nodeIds.has(c.target))
    .map((c) => {
      const colors = STATUS_COLORS[c.status] || STATUS_COLORS.warning;
      return {
        id: c.id,
        source: c.source,
        target: c.target,
        animated: c.status === 'ok',
        style: {
          stroke: colors.border,
          strokeWidth: c.status === 'error' ? 2.5 : 1.5,
          opacity: c.status === 'error' ? 1 : 0.6,
        },
        data: { raw: c },
      };
    });

  return { nodes: computeLayout(flowNodes, flowEdges), edges: flowEdges };
}

// ─── Blast Radius — find downstream/upstream nodes ────────────────────────────

function findRelatedNodes(nodeId, edges) {
  const downstream = new Set();
  const upstream = new Set();

  // Downstream: follow edges where source === nodeId, recursively
  const stackDown = [nodeId];
  while (stackDown.length) {
    const current = stackDown.pop();
    edges.forEach((e) => {
      if (e.source === current && !downstream.has(e.target)) {
        downstream.add(e.target);
        stackDown.push(e.target);
      }
    });
  }

  // Upstream: follow edges where target === nodeId, recursively
  const stackUp = [nodeId];
  while (stackUp.length) {
    const current = stackUp.pop();
    edges.forEach((e) => {
      if (e.target === current && !upstream.has(e.source)) {
        upstream.add(e.source);
        stackUp.push(e.source);
      }
    });
  }

  return { downstream, upstream };
}

// ─── Side Panel — Node Details ────────────────────────────────────────────────

function NodeDetailPanel({ node, allEdges, allNodes, onClose, onBlastRadius }) {
  if (!node) return null;
  const colors = STATUS_COLORS[node.data.status] || STATUS_COLORS.warning;
  const Icon = STATUS_ICON[node.data.status] || AlertTriangle;

  const incoming = allEdges
    .filter((e) => e.target === node.id)
    .map((e) => ({ ...e, otherNode: allNodes.find((n) => n.id === e.source) }))
    .filter((e) => e.otherNode);

  const outgoing = allEdges
    .filter((e) => e.source === node.id)
    .map((e) => ({ ...e, otherNode: allNodes.find((n) => n.id === e.target) }))
    .filter((e) => e.otherNode);

  const groupLabel = GROUP_LABELS[node.data.group] || node.data.group;

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] bg-card border border-border rounded-lg shadow-2xl z-10 flex flex-col overflow-hidden">
      <div
        className="p-4 border-b border-border flex items-start justify-between gap-2"
        style={{ background: `linear-gradient(135deg, ${colors.glow}, transparent)` }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: colors.border }} />
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{node.data.label}</h3>
            <Badge variant="outline" className="mt-1 text-xs">{groupLabel}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {node.data.details && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Detalles</p>
            <p className="text-sm">{node.data.details}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => onBlastRadius(node.id)}
        >
          <Target className="h-4 w-4" />
          Aislar zona de impacto
        </Button>

        {incoming.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Recibe datos de ({incoming.length})
            </p>
            <div className="space-y-1">
              {incoming.map((e) => {
                const c = STATUS_COLORS[e.data.raw.status] || STATUS_COLORS.warning;
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.border }} />
                    <span className="text-sm truncate flex-1">{e.otherNode.data.label}</span>
                    {e.data.raw.latencyMs > 0 && (
                      <span className="text-xs text-muted-foreground">{e.data.raw.latencyMs}ms</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {outgoing.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Alimenta a ({outgoing.length})
            </p>
            <div className="space-y-1">
              {outgoing.map((e) => {
                const c = STATUS_COLORS[e.data.raw.status] || STATUS_COLORS.warning;
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.border }} />
                    <span className="text-sm truncate flex-1">{e.otherNode.data.label}</span>
                    {e.data.raw.latencyMs > 0 && (
                      <span className="text-xs text-muted-foreground">{e.data.raw.latencyMs}ms</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Topology Map Component ──────────────────────────────────────────────

function SystemTopologyMapInner({ systemMap }) {
  const initialGraph = useMemo(() => buildGraphData(systemMap), [systemMap]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);
  const [blastRadiusNodeId, setBlastRadiusNodeId] = useState(null);

  // Reset graph when systemMap data changes (after refresh)
  useEffect(() => {
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
  }, [initialGraph, setNodes, setEdges]);

  // Apply visual modifiers based on filters
  const displayedNodes = useMemo(() => {
    let result = nodes;

    // Filter "only problems"
    if (showOnlyProblems) {
      const problemNodeIds = new Set(
        nodes.filter((n) => n.data.status !== 'ok').map((n) => n.id)
      );
      // Also keep neighbors of problem nodes for context
      edges.forEach((e) => {
        if (problemNodeIds.has(e.source)) problemNodeIds.add(e.target);
        if (problemNodeIds.has(e.target)) problemNodeIds.add(e.source);
      });
      result = result.filter((n) => problemNodeIds.has(n.id));
    }

    // Apply blast radius highlighting
    if (blastRadiusNodeId) {
      const { downstream, upstream } = findRelatedNodes(blastRadiusNodeId, edges);
      const affected = new Set([blastRadiusNodeId, ...downstream, ...upstream]);
      result = result.map((n) => ({
        ...n,
        data: {
          ...n.data,
          dimmed: !affected.has(n.id),
          highlighted: n.id === blastRadiusNodeId,
        },
      }));
    } else {
      result = result.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: false, highlighted: false },
      }));
    }

    return result;
  }, [nodes, edges, showOnlyProblems, blastRadiusNodeId]);

  const displayedEdges = useMemo(() => {
    if (!blastRadiusNodeId) return edges;
    const { downstream, upstream } = findRelatedNodes(blastRadiusNodeId, edges);
    const affected = new Set([blastRadiusNodeId, ...downstream, ...upstream]);
    return edges.map((e) => ({
      ...e,
      style: {
        ...e.style,
        opacity: affected.has(e.source) && affected.has(e.target) ? e.style?.opacity || 0.6 : 0.05,
      },
    }));
  }, [edges, blastRadiusNodeId]);

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const handleBlastRadius = useCallback((nodeId) => {
    setBlastRadiusNodeId(nodeId);
  }, []);

  const clearBlastRadius = useCallback(() => {
    setBlastRadiusNodeId(null);
  }, []);

  // Stats for the toolbar
  const stats = useMemo(() => {
    const errors = nodes.filter((n) => n.data.status === 'error').length;
    const warnings = nodes.filter((n) => n.data.status === 'warning').length;
    return { errors, warnings, total: nodes.length };
  }, [nodes]);

  return (
    <div className="relative w-full h-[700px] border border-border rounded-lg overflow-hidden bg-background">
      <ReactFlow
        nodes={displayedNodes}
        edges={displayedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background gap={24} size={1} color="rgba(120,120,120,0.15)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => STATUS_COLORS[n.data.status]?.border || '#888'}
          pannable
          zoomable
          style={{ background: 'rgba(0,0,0,0.4)' }}
        />

        <Panel position="top-left" className="flex flex-col gap-2">
          <div className="bg-card border border-border rounded-lg p-2 flex items-center gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold">{stats.total}</span>
              <span className="text-muted-foreground">nodos</span>
            </div>
            {stats.errors > 0 && (
              <div className="flex items-center gap-1 text-rose-500 text-sm font-medium">
                <XCircle className="h-4 w-4" />
                {stats.errors}
              </div>
            )}
            {stats.warnings > 0 && (
              <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {stats.warnings}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-2 flex flex-col gap-1 shadow-lg">
            <Button
              variant={showOnlyProblems ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowOnlyProblems((v) => !v)}
              className="justify-start gap-2 h-8"
            >
              <Filter className="h-4 w-4" />
              Solo problemas
            </Button>
            {blastRadiusNodeId && (
              <Button
                variant="default"
                size="sm"
                onClick={clearBlastRadius}
                className="justify-start gap-2 h-8"
              >
                <X className="h-4 w-4" />
                Salir de aislamiento
              </Button>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          allEdges={edges}
          allNodes={nodes}
          onClose={() => setSelectedNode(null)}
          onBlastRadius={(nodeId) => {
            handleBlastRadius(nodeId);
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
}

export default function SystemTopologyMap({ systemMap }) {
  if (!systemMap?.nodes?.length) {
    return (
      <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>No hay datos del mapa del sistema</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <SystemTopologyMapInner systemMap={systemMap} />
    </ReactFlowProvider>
  );
}
