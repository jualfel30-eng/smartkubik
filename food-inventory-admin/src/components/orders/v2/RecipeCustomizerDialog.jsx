import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Dialog to customize ingredients for a recipe-based product.
 * Fetches the BOM and allows users to remove ingredients.
 */
export function RecipeCustomizerDialog({
    open,
    onOpenChange,
    product,
    initialRemovedIngredients = [],
    onConfirm,
}) {
    const [loading, setLoading] = useState(false);
    const [bom, setBom] = useState(null);
    const [ingredients, setIngredients] = useState([]);
    const [removedIds, setRemovedIds] = useState(new Set(initialRemovedIngredients));

    useEffect(() => {
        if (open && product?.productId) {
            loadRecipe();
        } else {
            setBom(null);
            setIngredients([]);
        }
    }, [open, product]);

    // Sync removedIds if opened with different initial values
    useEffect(() => {
        if (open) {
            setRemovedIds(new Set(initialRemovedIngredients));
        }
    }, [open, initialRemovedIngredients]);

    const loadRecipe = async () => {
        setLoading(true);
        try {
            // Fetch BOM for the product
            const response = await fetchApi(`/bill-of-materials/by-product/${product.productId}`);
            if (response && response.data) {
                // The API returns an array of BOMs for the product. We take the first active one.
                const bomData = Array.isArray(response.data) ? response.data[0] : response.data;

                if (bomData) {
                    setBom(bomData);
                    if (bomData.components) {
                        setIngredients(bomData.components);
                    } else {
                        setIngredients([]);
                    }
                } else {
                    setIngredients([]);
                }
            } else {
                // No BOM found for this product
                setIngredients([]);
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            toast.error('Error al cargar la receta');
        } finally {
            setLoading(false);
        }
    };

    const toggleIngredient = (ingredientId) => {
        const newRemoved = new Set(removedIds);
        if (newRemoved.has(ingredientId)) {
            newRemoved.delete(ingredientId); // Re-add (un-remove)
        } else {
            newRemoved.add(ingredientId); // Remove
        }
        setRemovedIds(newRemoved);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(removedIds));
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Personalizar: {product?.name}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : ingredients.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">
                            Este producto no tiene ingredientes personalizables.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                Desmarca los ingredientes que deseas quitar:
                            </p>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                {ingredients.map((comp) => {
                                    // Ensure we have an ID to track. 
                                    // comp.componentProductId is the ID of the raw material (ingredient)
                                    const ingId = comp.componentProductId?._id || comp.componentProductId;
                                    const ingName = comp.componentProductId?.name || comp.name || `Ingrediente desconocido (ID: ${ingId})`;

                                    const isRemoved = removedIds.has(ingId);

                                    return (
                                        <div
                                            key={ingId}
                                            className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50 transition-colors"
                                        >
                                            <Checkbox
                                                id={`ing-${ingId}`}
                                                checked={!isRemoved}
                                                onCheckedChange={() => toggleIngredient(ingId)}
                                            />
                                            <label
                                                htmlFor={`ing-${ingId}`}
                                                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer ${isRemoved ? 'text-muted-foreground line-through' : ''}`}
                                            >
                                                {ingName}
                                            </label>
                                            <span className="text-xs text-muted-foreground">
                                                {comp.quantity} {comp.unit}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading || ingredients.length === 0}>
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
