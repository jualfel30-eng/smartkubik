
import React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import InlineEditableCell from './InlineEditableCell';

/**
 * ProductVariantsPopover
 * 
 * Allows editing prices for multiple variants of a product.
 * 
 * @param {object[]} variants - Array of variants
 * @param {function} onUpdateVariant - (variantIndex, field, value) => void
 * @param {React.ReactNode} children - Trigger element
 */
const ProductVariantsPopover = ({
    variants = [],
    onUpdateVariant,
    children
}) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="end">
                <div className="p-4 border-b">
                    <h4 className="font-medium leading-none">Editar Variantes</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ajusta los precios individuales por presentación.
                    </p>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Variante</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                            <TableHead className="text-right">Precio Venta</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.map((variant, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-xs">{variant.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{variant.unitSize} {variant.unit}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <InlineEditableCell
                                        value={variant.costPrice || 0}
                                        type="currency"
                                        onSave={(val) => onUpdateVariant(index, 'costPrice', val)}
                                        className="justify-end"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <InlineEditableCell
                                        value={variant.basePrice || 0}
                                        type="currency"
                                        onSave={(val) => onUpdateVariant(index, 'basePrice', val)}
                                        className="justify-end"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </PopoverContent>
        </Popover>
    );
};

export default ProductVariantsPopover;
