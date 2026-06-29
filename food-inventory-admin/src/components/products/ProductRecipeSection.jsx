import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash, ChefHat, Factory, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { fetchApi } from '@/lib/api';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';

/**
 * Sección de "Receta / elaboración propia" embebida en la ficha de producto.
 *
 * Para negocios pequeños (abastos, panaderías) que elaboran productos propios:
 * define las materias primas que componen ESTE producto (BoM) y permite producir
 * lotes que descuentan insumos y suman el terminado al inventario.
 *
 * El insumo se busca server-side (igual que el buscador de productos): async,
 * sin preload — escala a miles de productos.
 */
export default function ProductRecipeSection({ product }) {
  const productId = product?._id;
  const baseUnit = product?.unitOfMeasure || 'unidad';

  const {
    getBomByProduct,
    createBom,
    updateBom,
    calculateTotalCost,
    previewProduction,
    produceBatch,
  } = useBillOfMaterials();

  const [loading, setLoading] = useState(true);
  const [bom, setBom] = useState(null);
  const [enabled, setEnabled] = useState(false);

  // Editor de receta
  const [productionQuantity, setProductionQuantity] = useState(1);
  const [components, setComponents] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null); // option {value,label,product}
  const [ingredientQty, setIngredientQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(null);

  // Producir lote
  const [produceQty, setProduceQty] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [producing, setProducing] = useState(false);
  // Sustituciones al producir: { [productoReceta]: option {value,label} }.
  const [substitutes, setSubstitutes] = useState({});

  // Búsqueda server-side de insumos (mismo patrón que el buscador de productos).
  const loadProductOptions = useCallback(
    async (query) => {
      try {
        const res = await fetchApi(
          `/products?search=${encodeURIComponent(query)}&limit=20`,
        );
        return (res.data || [])
          .filter((p) => p._id !== productId)
          .map((p) => ({
            value: p._id,
            label: `${p.name} (${p.sku})`,
            product: p,
          }));
      } catch {
        return [];
      }
    },
    [productId],
  );

  const loadCost = useCallback(
    async (bomId, qty) => {
      try {
        const costPerBatch = await calculateTotalCost(bomId);
        const perUnit = qty > 0 ? costPerBatch / qty : 0;
        setEstimatedCost({ batch: costPerBatch, unit: perUnit });
      } catch {
        setEstimatedCost(null);
      }
    },
    [calculateTotalCost],
  );

  // Carga inicial: ¿este producto ya tiene receta?
  useEffect(() => {
    if (!productId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await getBomByProduct(productId);
        const existing = Array.isArray(result) ? result[0] : result;
        if (!active) return;
        if (existing) {
          setBom(existing);
          setEnabled(true);
          setProductionQuantity(existing.productionQuantity || 1);
          setComponents(
            (existing.components || []).map((c) => ({
              componentProductId: c.componentProductId?._id || c.componentProductId,
              productName: c.componentProductId?.name || c.productName || 'Insumo',
              quantity: c.quantity,
              unit: c.unit,
              scrapPercentage: c.scrapPercentage || 0,
            })),
          );
          loadCost(existing._id, existing.productionQuantity || 1);
        }
      } catch {
        // sin receta o error de carga: queda en modo "no elaborado"
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId, getBomByProduct, loadCost]);

  const handleAddIngredient = () => {
    const opt = selectedIngredient;
    const qty = parseFloat(ingredientQty);
    if (!opt || !qty || qty <= 0) return;
    if (components.some((c) => c.componentProductId === opt.value)) {
      toast.error('Ese insumo ya está en la receta');
      return;
    }
    const prod = opt.product || {};
    setComponents([
      ...components,
      {
        componentProductId: opt.value,
        productName: prod.name || opt.label,
        quantity: qty,
        unit: prod.unitOfMeasure || 'unidad',
        scrapPercentage: 0,
      },
    ]);
    setSelectedIngredient(null);
    setIngredientQty(1);
  };

  const handleRemoveIngredient = (idx) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async () => {
    if (components.length === 0) {
      toast.error('Agrega al menos un insumo a la receta');
      return;
    }
    const qty = parseFloat(productionQuantity);
    if (!qty || qty <= 0) {
      toast.error('La cantidad que rinde la receta debe ser mayor a 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        productId,
        name: product.name,
        productionQuantity: qty,
        productionUnit: baseUnit,
        components: components.map((c) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          unit: c.unit,
          scrapPercentage: c.scrapPercentage,
        })),
        isActive: true,
      };
      let saved;
      if (bom?._id) {
        saved = await updateBom(bom._id, payload);
      } else {
        const safeSku = (product.sku || productId).toString().replace(/\s+/g, '-').toUpperCase();
        saved = await createBom({ ...payload, code: `REC-${safeSku}` });
      }
      setBom(saved);
      if (saved?._id) loadCost(saved._id, qty);
      toast.success('Receta guardada');
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  // Overrides {insumo-receta → producto-real} para los sustitutos elegidos.
  const buildOverrides = (subs = substitutes) =>
    components
      .filter(
        (c) =>
          subs[c.componentProductId] &&
          subs[c.componentProductId].value !== c.componentProductId,
      )
      .map((c) => ({
        componentProductId: c.componentProductId,
        replacementProductId: subs[c.componentProductId].value,
      }));

  const runPreview = async (qtyValue, overridesArg) => {
    const qty = parseFloat(qtyValue);
    if (!bom?._id || !qty || qty <= 0) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    try {
      const data = await previewProduction(
        bom._id,
        qty,
        overridesArg ?? buildOverrides(),
      );
      setPreview(data);
    } catch (err) {
      setPreview(null);
      toast.error(err?.message || 'No se pudo calcular la vista previa');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubstituteChange = (componentProductId, option) => {
    const next = { ...substitutes };
    if (!option || option.value === componentProductId) {
      delete next[componentProductId]; // vuelve al insumo por defecto
    } else {
      next[componentProductId] = option;
    }
    setSubstitutes(next);
    if (produceQty) runPreview(produceQty, buildOverrides(next));
  };

  const handleProduce = async () => {
    const qty = parseFloat(produceQty);
    if (!bom?._id || !qty || qty <= 0) return;
    setProducing(true);
    try {
      const result = await produceBatch(bom._id, qty, buildOverrides());
      toast.success(
        `Producidas ${result.produced} ${result.unit}. Costo unitario: ${result.unitCost?.toFixed(2)}`,
      );
      setProduceQty('');
      setPreview(null);
    } catch (err) {
      toast.error(err?.message || 'No se pudo producir el lote');
    } finally {
      setProducing(false);
    }
  };

  if (!productId) return null;

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Este producto lo elaboro yo</Label>
        </div>
        <Switch
          checked={enabled}
          disabled={loading || !!bom}
          onCheckedChange={setEnabled}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Define las materias primas que lo componen y produce lotes que descuentan
        insumos y suman este producto al inventario.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando receta…
        </div>
      )}

      {enabled && !loading && (
        <div className="mt-4 space-y-4">
          {/* Rinde */}
          <div className="flex items-end gap-3">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Esta receta rinde</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={productionQuantity}
                onChange={(e) => setProductionQuantity(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground pb-2">{baseUnit}</span>
          </div>

          {/* Agregar insumo (búsqueda server-side) */}
          <div className="flex items-end gap-2 p-3 bg-muted rounded-md border">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Materia prima</Label>
              <SearchableSelect
                asyncSearch
                isCreatable={false}
                loadOptions={loadProductOptions}
                minSearchLength={2}
                debounceMs={300}
                value={selectedIngredient}
                onSelection={(opt) => setSelectedIngredient(opt)}
                placeholder="Buscar insumo por nombre o SKU…"
              />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">Cantidad</Label>
              <Input
                type="number"
                className="h-8"
                min="0.001"
                step="0.001"
                value={ingredientQty}
                onChange={(e) => setIngredientQty(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleAddIngredient} disabled={!selectedIngredient}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>

          {/* Tabla de insumos */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="w-28">Cantidad</TableHead>
                  <TableHead className="w-20">Unidad</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No hay insumos agregados
                    </TableCell>
                  </TableRow>
                ) : (
                  components.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{c.productName}</TableCell>
                      <TableCell>{c.quantity}</TableCell>
                      <TableCell>{c.unit}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIngredient(idx)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            {estimatedCost ? (
              <span className="text-sm text-muted-foreground">
                Costo estimado: {estimatedCost.batch.toFixed(2)} / {productionQuantity}{' '}
                {baseUnit} ({estimatedCost.unit.toFixed(2)} por {baseUnit})
              </span>
            ) : (
              <span />
            )}
            <Button onClick={handleSaveRecipe} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {bom ? 'Actualizar receta' : 'Guardar receta'}
            </Button>
          </div>

          {/* Producir lote (solo si la receta ya existe) */}
          {bom?._id && (
            <div className="border rounded-md p-4 space-y-3 bg-card">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Producir lote</span>
              </div>

              {/* Sustitución de insumo: por defecto el de la receta, pero puedes
                  elegir la marca/producto real que usaste en este lote. */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Insumos a usar (cambia la marca real si aplica)
                </Label>
                {components.map((c) => (
                  <div key={c.componentProductId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
                      {c.productName}
                    </span>
                    <div className="flex-1">
                      <SearchableSelect
                        asyncSearch
                        isCreatable={false}
                        loadOptions={loadProductOptions}
                        minSearchLength={2}
                        debounceMs={300}
                        value={
                          substitutes[c.componentProductId] || {
                            value: c.componentProductId,
                            label: c.productName,
                          }
                        }
                        onSelection={(opt) =>
                          handleSubstituteChange(c.componentProductId, opt)
                        }
                        placeholder="Buscar…"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-3">
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Cantidad a producir ({baseUnit})</Label>
                  <Input
                    type="number"
                    aria-label="Cantidad a producir"
                    min="0.001"
                    step="0.001"
                    value={produceQty}
                    onChange={(e) => setProduceQty(e.target.value)}
                    onBlur={(e) => runPreview(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleProduce}
                  disabled={
                    producing ||
                    previewing ||
                    !produceQty ||
                    (preview && !preview.allAvailable)
                  }
                >
                  {producing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Producir
                </Button>
              </div>

              {previewing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculando…
                </div>
              )}

              {preview && !previewing && (
                <div className="text-sm">
                  {preview.allAvailable ? (
                    <p className="text-muted-foreground">
                      Costo del lote: {preview.estimatedCost?.toFixed(2)} (
                      {preview.estimatedUnitCost?.toFixed(2)} por {baseUnit})
                    </p>
                  ) : (
                    <div className="text-destructive">
                      <div className="flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-4 w-4" /> Stock insuficiente
                      </div>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {preview.missing?.map((m) => (
                          <li key={m.sku}>
                            {m.name}: requiere {m.required?.toFixed(2)}, disponible{' '}
                            {m.available?.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
