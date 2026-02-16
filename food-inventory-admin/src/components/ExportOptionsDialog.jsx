import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

export function ExportOptionsDialog({
    open,
    onClose,
    onExport,
    columns = [],
    title = "Opciones de Exportación",
    description = "Selecciona las columnas que deseas incluir en el archivo exportado."
}) {
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    // Initialize selected columns when columns prop changes or dialog opens
    useEffect(() => {
        if (open && columns.length > 0) {
            // By default select all columns that are marked as defaultChecked or all if not specified
            const defaults = columns
                .filter(col => col.defaultChecked !== false)
                .map(col => col.key);
            setSelectedColumns(defaults);
        }
    }, [open, columns]);

    const handleToggleColumn = (key) => {
        setSelectedColumns(prev => {
            if (prev.includes(key)) {
                return prev.filter(k => k !== key);
            } else {
                return [...prev, key];
            }
        });
    };

    const handleSelectAll = () => {
        setSelectedColumns(columns.map(col => col.key));
    };

    const handleDeselectAll = () => {
        setSelectedColumns([]);
    };

    const handleConfirmExport = async () => {
        if (selectedColumns.length === 0) {
            toast.error("Debes seleccionar al menos una columna para exportar.");
            return;
        }

        setIsExporting(true);
        try {
            await onExport(selectedColumns);
            onClose();
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error al exportar datos");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !isExporting && !val && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-end gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                        <CheckSquare className="mr-2 h-3 w-3" />
                        Todas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeselectAll} className="h-8 text-xs">
                        <Square className="mr-2 h-3 w-3" />
                        Ninguna
                    </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="grid grid-cols-1 gap-3">
                        {columns.map((column) => (
                            <div key={column.key} className="flex items-start space-x-2">
                                <Checkbox
                                    id={`col-${column.key}`}
                                    checked={selectedColumns.includes(column.key)}
                                    onCheckedChange={() => handleToggleColumn(column.key)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor={`col-${column.key}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {column.label}
                                    </Label>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="sm:justify-end gap-2 mt-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isExporting}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleConfirmExport} disabled={isExporting || selectedColumns.length === 0}>
                        {isExporting ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span> Exportando...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" /> Exportar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
