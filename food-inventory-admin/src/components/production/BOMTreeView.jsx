import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Package, Layers, AlertCircle } from 'lucide-react';

/**
 * BOMTreeView
 * Componente para mostrar la estructura jerárquica de un BOM en formato árbol
 * Permite expandir/colapsar niveles para explorar la estructura completa
 */
export function BOMTreeView({ bomId }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const loadBOMStructure = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/bill-of-materials/${bomId}/structure`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setTreeData(result.data);
        // Expandir el primer nivel por defecto
        setExpandedNodes(new Set([result.data?.bomId]));
      } else {
        throw new Error(result.message || 'Error al cargar estructura de BOM');
      }
    } catch (error) {
      console.error('Error al cargar estructura de BOM:', error);
      alert(error.message || 'Error al cargar estructura de BOM');
    } finally {
      setLoading(false);
    }
  }, [bomId]);

  useEffect(() => {
    if (bomId) {
      loadBOMStructure();
    }
  }, [bomId, loadBOMStructure]);

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set();
    const collectIds = (node) => {
      if (node.bomId) allIds.add(node.bomId);
      if (node.productId) allIds.add(node.productId);
      if (node.children) {
        node.children.forEach(collectIds);
      }
    };
    if (treeData) collectIds(treeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([treeData?.bomId]));
  };

  const TreeNode = ({ node, level = 0 }) => {
    if (!node) return null;

    // Detectar errores de dependencias circulares
    if (node.error) {
      return (
        <div
          className="flex items-center gap-2 p-2 rounded border border-red-300 bg-red-50"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">
            Error: {node.error}
          </span>
        </div>
      );
    }

    const nodeId = node.bomId || node.productId;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(nodeId);
    const isLeaf = node.isLeaf;

    return (
      <div className="select-none">
        <div
          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer group"
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => hasChildren && toggleNode(nodeId)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            )}
          </div>

          {/* Icon */}
          {isLeaf ? (
            <Package className="h-4 w-4 text-blue-500" />
          ) : (
            <Layers className="h-4 w-4 text-orange-500" />
          )}

          {/* Product Info */}
          <div className="flex-1 flex items-center gap-3">
            <span className="font-medium">{node.productName}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {node.sku}
            </Badge>

            {/* Quantity info */}
            <div className="text-sm text-muted-foreground">
              {node.requiredQuantity !== undefined ? (
                <span>
                  {node.requiredQuantity} {node.unit}
                  {node.scrapPercentage > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      +{node.scrapPercentage}% scrap
                    </Badge>
                  )}
                </span>
              ) : (
                <span>
                  Produce: {node.quantity} unidades
                </span>
              )}
            </div>

            {/* Level badge */}
            <Badge variant="outline" className="ml-auto">
              Nivel {node.level}
            </Badge>

            {/* Type badge */}
            {isLeaf ? (
              <Badge variant="default">Material Base</Badge>
            ) : (
              <Badge variant="secondary">Sub-ensamble</Badge>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map((child, index) => (
              <TreeNode
                key={child.bomId || child.productId || index}
                node={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">Cargando estructura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!treeData) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No hay datos de estructura disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Estructura Jerárquica de BOM
            </CardTitle>
            <CardDescription>
              Vista de árbol mostrando todos los niveles de componentes y sub-ensambles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expandir Todo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Colapsar Todo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-muted/5">
          <TreeNode node={treeData} level={0} />
        </div>
      </CardContent>
    </Card>
  );
}
