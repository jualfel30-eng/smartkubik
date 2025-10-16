import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

const normalizeKey = (value) => (value ? value.toString() : '');

export function useBankReconciliation(accountId) {
  const [isUploading, setUploading] = useState(false);
  const [isLoadingDetails, setLoadingDetails] = useState(false);
  const [statementImport, setStatementImport] = useState(null);
  const [pending, setPending] = useState([]);

  const buildKey = (item) => {
    return [
      normalizeKey(item.statementImportId),
      normalizeKey(item.transactionDate),
      normalizeKey(item.reference),
      Number(item.amount || 0).toFixed(2),
    ].join('|');
  };

  const importStatement = useCallback(
    async (formData) => {
      if (!accountId) {
        toast.error('Selecciona una cuenta bancaria antes de importar');
        return null;
      }

      setUploading(true);
      try {
        if (!formData.has('bankAccountId')) {
          formData.append('bankAccountId', accountId);
        }

        const result = await fetchApi('/bank-reconciliation/import', {
          method: 'POST',
          body: formData,
        });

        const newImport = result.statementImport || null;
        setStatementImport(newImport);

        const unmatched = (result.unmatched ?? []).map((item) => {
          const enriched = {
            ...item,
            statementImportId: item.statementImportId ?? newImport?._id,
          };
          return {
            ...enriched,
            __key: buildKey(enriched),
          };
        });
        setPending(unmatched);

        toast.success('Estado de cuenta importado correctamente', {
          description: `${result.statementImport?.matchedRows ?? 0} movimientos conciliados automáticamente`,
        });

        return result;
      } catch (error) {
        toast.error('Error al importar estado de cuenta', {
          description: error.message,
        });
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [accountId],
  );

  const manualReconcile = useCallback(
    async (payload) => {
      try {
        await fetchApi('/bank-reconciliation/manual', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const reconciliationKey = buildKey({
          statementImportId: payload.statementImportId ?? statementImport?._id,
          transactionDate: payload.bankDate,
          reference: payload.bankReference,
          amount: payload.bankAmount,
        });

        setPending((current) => current.filter((item) => item.__key !== reconciliationKey));

        setStatementImport((current) => {
          if (!current) return current;
          return {
            ...current,
            matchedRows: (current.matchedRows ?? 0) + 1,
            unmatchedRows: Math.max((current.unmatchedRows ?? 1) - 1, 0),
          };
        });

        toast.success('Transacción conciliada manualmente');
      } catch (error) {
        toast.error('No se pudo conciliar la transacción', {
          description: error.message,
        });
        throw error;
      }
    },
    [statementImport],
  );

  const loadStatementDetails = useCallback(
    async (statementId) => {
      if (!statementId) return null;

      setLoadingDetails(true);
      try {
        const result = await fetchApi(`/bank-reconciliation/statement/${statementId}`);

        const statement = result.statement || null;
        setStatementImport(statement);

        const unmatched = (statement?.metadata?.unmatched ?? []).map((item) => {
          const enriched = {
            ...item,
            statementImportId: item.statementImportId ?? statement?._id,
          };
          return {
            ...enriched,
            __key: buildKey(enriched),
          };
        });

        setPending(unmatched);
        return result;
      } catch (error) {
        toast.error('No se pudo cargar el estado de cuenta', {
          description: error.message,
        });
        throw error;
      } finally {
        setLoadingDetails(false);
      }
    },
    [],
  );

  return {
    isUploading,
    isLoadingDetails,
    statementImport,
    pending,
    importStatement,
    manualReconcile,
    loadStatementDetails,
  };
}
