import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { ArrowLeft, GitMerge, Loader2 } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import MatchTypeBadge from './MatchTypeBadge.jsx';
import FieldComparison from './FieldComparison.jsx';
import VariantMergePreview from './VariantMergePreview.jsx';
import MergeConfirmDialog from './MergeConfirmDialog.jsx';
import { getDuplicateGroup, mergeProducts } from '@/lib/api.js';
import { toast } from 'sonner';

export default function MergeView({ group, onBack, onMergeComplete }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Merge config
  const [masterProductId, setMasterProductId] = useState(group?.suggestedMasterId || '');
  const [fieldResolutions, setFieldResolutions] = useState([]);
  const [variantStrategy, setVariantStrategy] = useState('combine');
  const [notes, setNotes] = useState('');

  // Load full group details with populated products
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getDuplicateGroup(group._id);
        const prods = res.products || res.data?.products || [];
        setProducts(prods);
        if (!masterProductId && res.suggestedMasterId) {
          setMasterProductId(String(res.suggestedMasterId));
        }
      } catch (err) {
        toast.error('Error al cargar detalle del grupo');
      } finally {
        setLoading(false);
      }
    }
    if (group?._id) load();
  }, [group?._id]);

  const masterProduct = products.find((p) => String(p._id) === String(masterProductId));
  const duplicateProducts = products.filter((p) => String(p._id) !== String(masterProductId));

  const handleFieldResolution = (field, sourceProductId) => {
    setFieldResolutions((prev) => {
      const filtered = prev.filter((r) => r.field !== field);
      return [...filtered, { field, sourceProductId }];
    });
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      await mergeProducts(group._id, {
        masterProductId,
        fieldResolutions: fieldResolutions.length > 0 ? fieldResolutions : undefined,
        variantMergeStrategy: variantStrategy,
        notes: notes || undefined,
      });
      toast.success('Productos fusionados exitosamente');
      setShowConfirm(false);
      onMergeComplete?.();
    } catch (err) {
      toast.error(err.message || 'Error al fusionar productos');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <ConfidenceBadge score={group.confidenceScore} />
          <MatchTypeBadge matchType={group.matchType} />
        </div>
        <Button onClick={() => setShowConfirm(true)} disabled={!masterProductId || products.length < 2}>
          <GitMerge className="mr-2 h-4 w-4" />
          Fusionar
        </Button>
      </div>

      {/* Master selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Seleccionar producto maestro</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={masterProductId} onValueChange={setMasterProductId}>
            <div className="space-y-2">
              {products.map((p) => {
                const score = group.completenessScores?.find(
                  (c) => String(c.productId) === String(p._id),
                );
                return (
                  <label
                    key={p._id}
                    className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                      String(p._id) === String(masterProductId)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={String(p._id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {p.sku || '—'} | Marca: {p.brand || '—'} | Precio: {p.salePrice ? `$${p.salePrice}` : '—'}
                      </p>
                    </div>
                    {score && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Completitud: {score.score}%
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Field comparison (for first duplicate) */}
      {masterProduct && duplicateProducts.length > 0 && (
        <div className="space-y-4">
          {duplicateProducts.map((dup) => (
            <div key={dup._id} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Comparación: {masterProduct.name} vs {dup.name}
              </h4>
              <FieldComparison
                masterProduct={masterProduct}
                duplicateProduct={dup}
                fieldResolutions={fieldResolutions}
                onFieldResolutionChange={handleFieldResolution}
              />
            </div>
          ))}
        </div>
      )}

      {/* Variant merge strategy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Estrategia de variantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={variantStrategy} onValueChange={setVariantStrategy}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combine">Combinar todas las variantes</SelectItem>
              <SelectItem value="keep_master">Mantener solo las del maestro</SelectItem>
            </SelectContent>
          </Select>
          <VariantMergePreview
            masterProduct={masterProduct}
            duplicateProducts={duplicateProducts}
            strategy={variantStrategy}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notas (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregar notas sobre esta fusión..."
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <MergeConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        masterProduct={masterProduct}
        duplicateCount={duplicateProducts.length}
        reassignmentPreview={null}
        onConfirm={handleMerge}
        loading={merging}
      />
    </div>
  );
}
