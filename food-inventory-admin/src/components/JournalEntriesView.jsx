import React, { useState, useEffect, useCallback } from 'react';
import { fetchJournalEntries } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, PlusCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import JournalEntryForm from './JournalEntryForm';

const JournalEntriesView = () => {
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadJournalEntries = useCallback(async (page) => {
    setLoading(true);
    setError(null);
    try {
      const apiResponse = await fetchJournalEntries(page, pagination.limit);
      setJournalEntries(apiResponse.data || []);
      setPagination({
        page: apiResponse.page,
        limit: apiResponse.limit,
        total: apiResponse.total,
        totalPages: apiResponse.totalPages,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    loadJournalEntries(pagination.page);
  }, [pagination.page, loadJournalEntries]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
  }

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan="4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
      );
    }

    if (journalEntries.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan="4" className="text-center">No se encontraron asientos contables.</TableCell>
        </TableRow>
      );
    }

    return journalEntries.map(entry => (
      <React.Fragment key={entry._id}>
        <TableRow className="bg-muted/50">
          <TableCell className="font-bold">{new Date(entry.date).toLocaleDateString()}</TableCell>
          <TableCell className="font-bold" colSpan="3">{entry.description}</TableCell>
        </TableRow>
        {entry.lines.map((line, index) => (
          <TableRow key={`${entry._id}-${index}`}>
            <TableCell className="pl-10">
              {line.account 
                ? `${line.account.name} (${line.account.code})` 
                : <i className="text-muted-foreground">(Cuenta eliminada)</i>}
            </TableCell>
            <TableCell>{line.description}</TableCell>
            <TableCell className="text-right font-mono">{line.debit > 0 ? formatCurrency(line.debit) : ''}</TableCell>
            <TableCell className="text-right font-mono">{line.credit > 0 ? formatCurrency(line.credit) : ''}</TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    ));
  };

  return (
    <>
      <div className="flex justify-start mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Crear Asiento Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Asiento Contable</DialogTitle>
              <DialogDescription>
                Complete los detalles del asiento. Asegúrese de que los débitos y créditos estén balanceados.
              </DialogDescription>
            </DialogHeader>
            <JournalEntryForm onSuccess={() => {
              setIsDialogOpen(false);
              loadJournalEntries(1);
            }} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha / Cuenta</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Página {pagination.page} de {pagination.totalPages}
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadJournalEntries(1)} 
            disabled={pagination.page === 1 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadJournalEntries(pagination.page - 1)} 
            disabled={pagination.page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadJournalEntries(pagination.page + 1)} 
            disabled={pagination.page === pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadJournalEntries(pagination.totalPages)} 
            disabled={pagination.page === pagination.totalPages || loading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default JournalEntriesView;
