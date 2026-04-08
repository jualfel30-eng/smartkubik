
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
import InlineEditableCell from './InlineEditableCell';

/**
 * SellingUnitsPopover
 *
 * Allows editing prices for multiple selling units of a product.
 *
 * @param {object[]} sellingUnits - Array of selling unit objects
 * @param {string} unitOfMeasure - Base unit of measure (e.g., "Saco", "Kg")
 * @param {function} onUpdateSellingUnit - (unitIndex, field, value) => void
 * @param {React.ReactNode} children - Trigger element
 */
const SellingUnitsPopover = ({
    sellingUnits = [],
    unitOfMeasure = '',
    onUpdateSellingUnit,
    children
}) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[540px] p-0" align="end">
                <div className="p-4 border-b">
                    <h4 className="font-medium leading-none">Unidades de Venta</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ajusta los precios individuales por unidad de venta.
                    </p>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Unidad</TableHead>
                            <TableHead className="text-center">
                                Contenido x {unitOfMeasure || 'base'}
                            </TableHead>
                            <TableHead className="text-right">Costo/Unidad</TableHead>
                            <TableHead className="text-right">Precio/Unidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sellingUnits.map((unit, index) => {
                            const contenido = unit.conversionFactor && unit.conversionFactor > 0
                                ? parseFloat((1 / unit.conversionFactor).toFixed(4))
                                : null;
                            return (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-xs">{unit.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{unit.abbreviation}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                        {contenido !== null
                                            ? `${contenido} ${unit.abbreviation || 'und'} / ${unitOfMeasure || 'base'}`
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <InlineEditableCell
                                            value={unit.costPerUnit || 0}
                                            type="currency"
                                            onSave={(val) => onUpdateSellingUnit(index, 'costPerUnit', val)}
                                            className="justify-end"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <InlineEditableCell
                                            value={unit.pricePerUnit || 0}
                                            type="currency"
                                            onSave={(val) => onUpdateSellingUnit(index, 'pricePerUnit', val)}
                                            className="justify-end"
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </PopoverContent>
        </Popover>
    );
};

export default SellingUnitsPopover;
