
import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RecipeDetailDialog({ recipeId, open, onClose, hideCosts = false }) {
    const { getBom, calculateTotalCost } = useBillOfMaterials();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [totalCost, setTotalCost] = useState(0);

    useEffect(() => {
        if (open && recipeId) {
            loadRecipeDetails();
        } else {
            setRecipe(null);
            setTotalCost(0);
        }
    }, [open, recipeId]);

    const loadRecipeDetails = async () => {
        setLoading(true);
        try {
            const data = await getBom(recipeId);
            setRecipe(data);
            if (data) {
                // Attempt to load cost if not hidden
                try {
                    const cost = await calculateTotalCost(recipeId);
                    setTotalCost(cost);
                } catch (e) {
                    console.warn("Could not calculate fresh cost", e);
                }
            }
        } catch (error) {
            console.error('Failed to load recipe details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle de Receta</DialogTitle>
                    <DialogDescription>
                        Información completa de la receta y sus componentes.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : recipe ? (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground">Nombre:</span>
                                <p className="text-lg font-medium">{recipe.name}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground">Código:</span>
                                <p>{recipe.code}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground">Producto Base:</span>
                                <p>{recipe.productId?.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground">Producción:</span>
                                <p>{recipe.productionQuantity} {recipe.productionUnit}</p>
                            </div>
                        </div>

                        {/* Ingredients Table */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingrediente</TableHead>
                                        <TableHead>Cant. Requerida</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        {!hideCosts && <TableHead className="text-right">Costo Unitario (Base)</TableHead>}
                                        {!hideCosts && <TableHead className="text-right">Costo Componente</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.components?.map((comp, idx) => {
                                        // Obtener costo base (usando lógica simplificada de fallback al primer variante si no hay variante especifica)
                                        const product = comp.componentProductId;
                                        let unitCost = 0;
                                        if (product?.variants?.length > 0) {
                                            unitCost = product.variants[0].costPrice || 0;
                                        }

                                        const componentCost = unitCost * comp.quantity;

                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                    {product?.name || 'Unknown Product'}
                                                </TableCell>
                                                <TableCell>{comp.displayQuantity || comp.quantity}</TableCell>
                                                <TableCell>{comp.displayUnit || comp.unit}</TableCell>
                                                {!hideCosts && (
                                                    <TableCell className="text-right">
                                                        ${unitCost.toFixed(2)}
                                                    </TableCell>
                                                )}
                                                {!hideCosts && (
                                                    <TableCell className="text-right font-semibold">
                                                        ${componentCost.toFixed(2)}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                    {(!recipe.components || recipe.components.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={hideCosts ? 3 : 5} className="text-center text-muted-foreground">
                                                Sin ingredientes listados
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Cost Summary */}
                        {!hideCosts && (
                            <Card className="bg-muted border-none shadow-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Resumen de Costos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Costo Total Estimado:</span>
                                        <span className="text-xl font-bold">${totalCost.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        Error al cargar la receta o no existe.
                    </div>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">Cerrar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
