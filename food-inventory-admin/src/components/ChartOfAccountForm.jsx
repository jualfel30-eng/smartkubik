
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACCOUNT_TYPES = ["Ingreso", "Gasto", "Activo", "Pasivo", "Patrimonio"];

const COST_BEHAVIORS = [
  { value: "fixed", label: "Fijo" },
  { value: "variable", label: "Variable" },
  { value: "mixed", label: "Mixto" },
];

const LIQUIDITY_CLASSES = [
  { value: "current", label: "Circulante" },
  { value: "non_current", label: "No circulante" },
];

const TYPES_WITH_COST_BEHAVIOR = ["Gasto"];
const TYPES_WITH_LIQUIDITY = ["Activo", "Pasivo"];

export function ChartOfAccountForm({ onSubmit, onCancel, initialData }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [costBehavior, setCostBehavior] = useState("");
  const [liquidityClass, setLiquidityClass] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setType(initialData.type || "");
      setDescription(initialData.description || "");
      setCostBehavior(initialData.costBehavior || "");
      setLiquidityClass(initialData.liquidityClass || "");
    } else {
      setName("");
      setType("");
      setDescription("");
      setCostBehavior("");
      setLiquidityClass("");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { name, type, description };
    if (costBehavior) data.costBehavior = costBehavior;
    if (liquidityClass) data.liquidityClass = liquidityClass;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Cuenta</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ventas de Mercancía"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Cuenta</Label>
        <Select value={type} onValueChange={setType} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Seleccione un tipo" />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((accType) => (
              <SelectItem key={accType} value={accType}>
                {accType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {TYPES_WITH_COST_BEHAVIOR.includes(type) && (
        <div className="space-y-2">
          <Label htmlFor="costBehavior">Comportamiento de Costo</Label>
          <Select value={costBehavior} onValueChange={setCostBehavior}>
            <SelectTrigger id="costBehavior">
              <SelectValue placeholder="Clasificar costo (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {COST_BEHAVIORS.map((cb) => (
                <SelectItem key={cb.value} value={cb.value}>
                  {cb.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Fijo: no cambia con el volumen (alquiler, seguros). Variable: cambia con ventas (materia prima). Mixto: ambos.
          </p>
        </div>
      )}

      {TYPES_WITH_LIQUIDITY.includes(type) && (
        <div className="space-y-2">
          <Label htmlFor="liquidityClass">Clasificacion de Liquidez</Label>
          <Select value={liquidityClass} onValueChange={setLiquidityClass}>
            <SelectTrigger id="liquidityClass">
              <SelectValue placeholder="Clasificar liquidez (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {LIQUIDITY_CLASSES.map((lc) => (
                <SelectItem key={lc.value} value={lc.value}>
                  {lc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Circulante: convertible en efectivo en menos de 1 ano. No circulante: a largo plazo.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="(Opcional)"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}
