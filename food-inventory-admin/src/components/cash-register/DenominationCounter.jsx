import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Calculator } from "lucide-react";

// Denominaciones soportadas
const DENOMINATIONS = {
    USD: [100, 50, 20, 10, 5, 2, 1],
    VES: [500, 200, 100, 50, 20, 10, 5],
};

export function DenominationCounter({ currency, onConfirm, initialCounts = {} }) {
    const [counts, setCounts] = useState(initialCounts);
    const [open, setOpen] = useState(false);

    // Reiniciar counts si initialCounts cambia
    useEffect(() => {
        setCounts(initialCounts);
    }, [initialCounts]);

    const handleCountChange = (denom, value) => {
        const numValue = parseInt(value) || 0;
        setCounts((prev) => ({
            ...prev,
            [denom]: numValue,
        }));
    };

    const calculateTotal = () => {
        return Object.entries(counts).reduce((total, [denom, count]) => {
            return total + parseFloat(denom) * count;
        }, 0);
    };

    const handleConfirm = () => {
        const total = calculateTotal();
        onConfirm(total, counts);
        setOpen(false);
    };

    const denominations = DENOMINATIONS[currency] || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Contar billetes">
                    <Calculator className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Contar Billetes ({currency})</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    {denominations.map((denom) => (
                        <div key={denom} className="flex items-center gap-2">
                            <Label className="w-16 text-right font-mono text-lg">{denom}</Label>
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="text-right"
                                    value={counts[denom] || ""}
                                    onChange={(e) => handleCountChange(denom, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div className="w-20 text-right text-sm text-muted-foreground font-mono">
                                {((counts[denom] || 0) * denom).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Campo para monedas o montos sueltos extra */}
                    <div className="col-span-2 border-t pt-4 mt-2">
                        <div className="flex items-center gap-2">
                            <Label className="w-24">Monedas / Otros</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-right"
                                value={counts["coins"] || ""}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setCounts(prev => ({ ...prev, coins: isNaN(val) ? "" : val }));
                                }}
                            />
                            <div className="w-20 text-right text-sm text-muted-foreground font-mono">
                                {(parseFloat(counts["coins"]) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                    <div className="text-lg font-bold">
                        Total: {calculateTotal().toLocaleString(undefined, { style: 'currency', currency })}
                    </div>
                    <Button onClick={handleConfirm}>Confirmar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
