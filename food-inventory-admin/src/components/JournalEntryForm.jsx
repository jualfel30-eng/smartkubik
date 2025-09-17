import React, { useState, useEffect } from 'react';
import { fetchChartOfAccounts, createJournalEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Combobox } from '@/components/ui/combobox';

const JournalEntryForm = ({ onSuccess }) => {
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { accountId: '', description: '', debit: '', credit: '' },
    { accountId: '', description: '', debit: '', credit: '' },
  ]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const fetchedAccounts = await fetchChartOfAccounts();
        const formattedAccounts = fetchedAccounts.map(acc => ({ value: acc._id, label: `${acc.code} - ${acc.name}` }));
        setAccounts(formattedAccounts);
      } catch (err) {
        setError('Error al cargar las cuentas. Por favor, intente de nuevo.');
      }
    };
    loadAccounts();
  }, []);

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: '', credit: '' }]);
  };

  const removeLine = (index) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!date || !description.trim()) {
      setError('La fecha y la descripción son obligatorias.');
      return;
    }
    
    if (lines.some(line => !line.accountId)) {
      setError('Todas las líneas deben tener una cuenta seleccionada.');
      return;
    }

    if (lines.length < 2) {
      setError('Un asiento contable debe tener al menos dos líneas.');
      return;
    }

    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError('El total de débitos debe ser igual al total de créditos.');
      return;
    }
    
    if (totalDebits === 0 && totalCredits === 0) {
      setError('El asiento debe tener valores mayores a cero.');
      return;
    }

    setLoading(true);
    try {
      const entryData = {
        date: date.toISOString(),
        description,
        lines: lines.map(line => ({
          accountId: line.accountId,
          description: line.description,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
        })),
      };
      
      await createJournalEntry(entryData);
      
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = totalDebits - totalCredits;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input 
            id="description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Ej: Aporte de capital inicial"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Cuenta</TableHead>
              <TableHead className="w-[40%]">Descripción</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Combobox
                    options={accounts}
                    value={line.accountId}
                    onChange={(value) => handleLineChange(index, 'accountId', value)}
                    placeholder="Seleccione una cuenta..."
                    searchPlaceholder="Buscar cuenta..."
                    emptyPlaceholder="No se encontraron cuentas."
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={line.description} 
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    placeholder="Descripción de la línea"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    className="text-right"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    className="text-right"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addLine}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Línea
        </Button>
        <div className={cn(
          "text-right font-mono p-2 rounded-md text-sm",
          Math.abs(difference) > 0.01 ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
        )}>
          <div>Total Debe: {totalDebits.toFixed(2)}</div>
          <div>Total Haber: {totalCredits.toFixed(2)}</div>
          <div className="font-bold mt-1 border-t pt-1">Diferencia: {difference.toFixed(2)}</div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || Math.abs(difference) > 0.01}>
          {loading ? 'Guardando...' : 'Guardar Asiento'}
        </Button>
      </div>
    </form>
  );
};

export default JournalEntryForm;
