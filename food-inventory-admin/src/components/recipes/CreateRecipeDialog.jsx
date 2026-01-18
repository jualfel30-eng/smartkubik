
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash, Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';

export function CreateRecipeDialog({ open, onClose, onSave, initialData = null }) {
    // Separate hooks for products to produce (simple) and ingredients (supply)
    const { products: simpleProducts, loadProducts: loadSimpleProducts } = useProducts();
    const { products: supplyProducts, loadProducts: loadSupplyProducts } = useProducts();

    // Recipe Header State
    const [targetProductId, setTargetProductId] = useState('');
    const [recipeCode, setRecipeCode] = useState('');
    const [productionQuantity, setProductionQuantity] = useState(1);
    const [productionUnit, setProductionUnit] = useState('unidad');
    const [productionCategory, setProductionCategory] = useState('General');

    const defaultCategories = [
        { value: 'Cocina Caliente', label: 'Cocina Caliente' },
        { value: 'Cocina Fría', label: 'Cocina Fría' },
        { value: 'Panadería', label: 'Panadería' },
        { value: 'Bar', label: 'Bar' },
        { value: 'Producción', label: 'Producción' },
        { value: 'General', label: 'General' },
    ];

    // Ingredients State
    const [components, setComponents] = useState([]);

    // Current Component Adding State
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [ingredientQuantity, setIngredientQuantity] = useState(1);
    const [ingredientUnit, setIngredientUnit] = useState('unidad');

    useEffect(() => {
        if (open) {
            // Load Finished Goods (Simple) for the target product
            loadSimpleProducts({ limit: 100, isActive: true, productType: 'simple' });
            // Load Raw Materials (Ingredients)
            loadSupplyProducts({ limit: 100, isActive: true, productType: 'raw_material' });

            if (initialData) {
                loadInitialData();
            } else {
                resetForm();
            }
        }
    }, [open, initialData, loadSimpleProducts, loadSupplyProducts]);

    const loadInitialData = () => {
        if (!initialData) return;
        setTargetProductId(initialData.productId?._id || initialData.productId || '');
        setRecipeCode(initialData.code || '');
        setProductionQuantity(initialData.productionQuantity || 1);
        setProductionUnit(initialData.productionUnit || 'unidad');

        // Map components
        // Ensure we handle populated vs unpopulated componentProductId if necessary, 
        // though typically editing fetches populated data.
        const mappedComponents = (initialData.components || []).map(comp => ({
            componentProductId: comp.componentProductId?._id || comp.componentProductId,
            productName: comp.componentProductId?.name || comp.productName || 'Unknown',
            quantity: comp.quantity,
            unit: comp.unit,
            displayQuantity: comp.displayQuantity || comp.quantity,
            displayUnit: comp.displayUnit || comp.unit,
            scrapPercentage: comp.scrapPercentage || 0
        }));
        setComponents(mappedComponents);
    };

    const resetForm = () => {
        setTargetProductId('');
        setRecipeCode('');
        setProductionQuantity(1);
        setProductionUnit('unidad');
        setComponents([]);
        setSelectedIngredient('');
        setIngredientQuantity(1);
        setIngredientUnit('unidad');
    };

    const handleAddIngredient = () => {
        if (!selectedIngredient || ingredientQuantity <= 0) return;

        const product = supplyProducts.find(p => p._id === selectedIngredient);
        if (!product) return;

        // Decode unit and factor
        let finalQuantity = parseFloat(ingredientQuantity);
        let finalUnit = ingredientUnit;
        let displayUnit = ingredientUnit;

        // Check if it's an encoded unit (starts with __ENC__)
        if (ingredientUnit.startsWith('__ENC__')) {
            const parts = ingredientUnit.split('__');
            const unitName = parts[2];
            const factor = parseFloat(parts[3]);

            // Convert to base unit
            finalQuantity = finalQuantity * factor;
            finalUnit = product.unitOfMeasure; // Store as base unit

            // Set display values for kitchen view
            displayUnit = unitName;
        }

        const newComponent = {
            componentProductId: selectedIngredient,
            productName: product.name,
            quantity: finalQuantity,
            unit: finalUnit, // Always save as Base Unit for backend consistency
            displayQuantity: parseFloat(ingredientQuantity), // Capture user input as display qty
            displayUnit: displayUnit, // Capture user selected unit name
            scrapPercentage: 0
        };

        setComponents([...components, newComponent]);

        // Reset ingredient input
        setSelectedIngredient('');
        setIngredientQuantity(1);
        setIngredientUnit('unidad');
    };

    const handleRemoveIngredient = (index) => {
        const newComponents = [...components];
        newComponents.splice(index, 1);
        setComponents(newComponents);
    };

    const handleSubmit = () => {
        if (!targetProductId || !recipeCode || components.length === 0) {
            alert("Please fill all required fields and add at least one ingredient.");
            return;
        }

        const payload = {
            productId: targetProductId,
            code: recipeCode,
            name: simpleProducts.find(p => p._id === targetProductId)?.name || 'Recipe',
            productionQuantity: parseFloat(productionQuantity),
            productionUnit,
            productionCategory,
            components: components.map(({ productName, ...rest }) => rest),
            isActive: true
        };

        onSave(payload);
    };

    // Determine production unit based on selected product
    useEffect(() => {
        if (targetProductId) {
            const product = simpleProducts.find(p => p._id === targetProductId);
            if (product) {
                setProductionUnit(product.unitOfMeasure || 'unidad');

                // Auto-generate code only if creating (not editing)
                if (!initialData) {
                    const safeSku = (product.sku || '').replace(/\s+/g, '-').toUpperCase();
                    setRecipeCode(`REC-${safeSku}`);
                }
            }
        }
    }, [targetProductId, simpleProducts, initialData]);



    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Modifica los detalles de la receta existente.' : 'Define los ingredientes necesarios para producir un producto.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">

                    {/* Header Section */}
                    <div className="space-y-4 border-b pb-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Producto a Producir</Label>
                                <Select value={targetProductId} onValueChange={setTargetProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un producto..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {simpleProducts.map(p => (
                                            <SelectItem key={p._id} value={p._id}>
                                                {p.name} ({p.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Categoría de Producción</Label>
                                <Combobox
                                    options={defaultCategories}
                                    value={productionCategory}
                                    onChange={setProductionCategory}
                                    placeholder="Seleccionar categoría"
                                    searchPlaceholder="Buscar categoría..."
                                    emptyPlaceholder="Categoría no encontrada"
                                    creatable={true}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Código de Receta</Label>
                                <Input
                                    value={recipeCode}
                                    onChange={(e) => setRecipeCode(e.target.value)}
                                    placeholder="REC-BURGER-001"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Cantidad a Producir</Label>
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={productionQuantity}
                                    onChange={(e) => setProductionQuantity(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Unidad de Producción</Label>
                                <Input
                                    value={productionUnit}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Components / Ingredients Section */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Ingredientes</h3>

                        <div className="flex items-end gap-2 mb-4 p-3 bg-muted rounded-md border">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Ingrediente</Label>
                                <Select value={selectedIngredient} onValueChange={(val) => {
                                    setSelectedIngredient(val);
                                    // Reset unit to base when changing product
                                    const prod = supplyProducts.find(p => p._id === val);
                                    if (prod) {
                                        setIngredientUnit(prod.unitOfMeasure);
                                    }
                                }}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Buscar ingrediente..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {supplyProducts.map(p => (
                                            <SelectItem key={p._id} value={p._id}>
                                                {p.name} ({p.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-24 space-y-1">
                                <Label className="text-xs">Cantidad</Label>
                                <Input
                                    type="number"
                                    className="h-8"
                                    min="0.001"
                                    step="0.001"
                                    value={ingredientQuantity}
                                    onChange={(e) => setIngredientQuantity(e.target.value)}
                                />
                            </div>

                            <div className="w-32 space-y-1">
                                <Label className="text-xs">Unidad</Label>
                                <Select
                                    value={ingredientUnit}
                                    onValueChange={setIngredientUnit}
                                    disabled={!selectedIngredient}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(() => {
                                            const prod = supplyProducts.find(p => p._id === selectedIngredient);
                                            if (!prod) return <SelectItem value="unidad">Unidad</SelectItem>;

                                            // Base Unit
                                            const units = [
                                                { name: prod.unitOfMeasure, value: prod.unitOfMeasure, factor: 1 }
                                            ];

                                            // Selling Units (if any)
                                            if (prod.sellingUnits && prod.sellingUnits.length > 0) {
                                                prod.sellingUnits.forEach(su => {
                                                    // Avoid duplicates if selling unit name matches base unit
                                                    if (su.name !== prod.unitOfMeasure) {
                                                        units.push({
                                                            name: su.name,
                                                            value: `__ENC__${su.name}__${su.conversionFactor}`, // Encode factor in value
                                                            factor: su.conversionFactor
                                                        });
                                                    }
                                                });
                                            }

                                            return units.map((u, idx) => (
                                                <SelectItem key={idx} value={u.value}>
                                                    {u.name}
                                                </SelectItem>
                                            ));
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button size="sm" onClick={handleAddIngredient} disabled={!selectedIngredient}>
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar
                            </Button>
                        </div>

                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingrediente</TableHead>
                                        <TableHead className="w-24">Cant.</TableHead>
                                        <TableHead className="w-24">Und.</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {components.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                                No hay ingredientes agregados
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        components.map((comp, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{comp.productName}</TableCell>
                                                <TableCell>{comp.displayQuantity || comp.quantity}</TableCell>
                                                <TableCell>{comp.displayUnit || comp.unit}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(idx)}>
                                                        <Trash className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSubmit}>{initialData ? 'Actualizar Receta' : 'Guardar Receta'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
