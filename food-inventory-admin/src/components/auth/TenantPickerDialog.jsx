import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';

export function TenantPickerDialog({
  isOpen,
  memberships,
  defaultMembershipId = null,
  onSelect,
  onCancel,
  isLoading = false,
  errorMessage = '',
}) {
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [rememberAsDefault, setRememberAsDefault] = useState(
    Boolean(defaultMembershipId),
  );

  useEffect(() => {
    if (isOpen) {
      const fallbackId =
        defaultMembershipId || memberships[0]?.id || null;
      setSelectedMembershipId(fallbackId);
      setRememberAsDefault(Boolean(defaultMembershipId));
    }
  }, [isOpen, defaultMembershipId, memberships]);

  const selectedMembership = useMemo(() => {
    return memberships.find((membership) => membership.id === selectedMembershipId);
  }, [memberships, selectedMembershipId]);

  const handleConfirm = () => {
    if (selectedMembershipId) {
      onSelect(selectedMembershipId, rememberAsDefault);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Selecciona una organización</DialogTitle>
          <DialogDescription>
            Escoge el negocio o sede con la que deseas trabajar. Puedes recordar
            tu selección para futuras sesiones.
          </DialogDescription>
        </DialogHeader>

        {memberships.length === 0 ? (
          <div className="rounded-md border border-dashed border-red-300 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Tu cuenta no tiene organizaciones activas asignadas. Contacta a un
            administrador para solicitar acceso.
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={selectedMembershipId ?? ''}
              onValueChange={setSelectedMembershipId}
              className="space-y-3"
            >
              {memberships.map((membership) => (
                <Label
                  key={membership.id}
                  htmlFor={membership.id}
                  className={`block cursor-pointer rounded-lg border p-4 transition hover:border-primary ${
                    selectedMembershipId === membership.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          id={membership.id}
                          value={membership.id}
                        />
                        <span className="font-semibold text-foreground">
                          {membership.tenant?.name || 'Tenant sin nombre'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <p>Código: {membership.tenant?.code || 'N/D'}</p>
                        <p>Rol: {membership.role?.name || 'N/D'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {membership.isDefault && (
                        <Badge variant="secondary">Predeterminado</Badge>
                      )}
                      <Badge
                        variant={
                          membership.status === 'active' ? 'outline' : 'destructive'
                        }
                      >
                        {membership.status === 'active'
                          ? 'Activo'
                          : membership.status}
                      </Badge>
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between rounded-md border-border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Recordar esta selección
                </p>
                <p className="text-xs text-muted-foreground">
                  Usaremos esta organización la próxima vez que inicies sesión.
                </p>
              </div>
              <Switch
                checked={rememberAsDefault}
                onCheckedChange={setRememberAsDefault}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !selectedMembershipId ||
              memberships.length === 0 ||
              selectedMembership?.status !== 'active'
            }
          >
            {isLoading ? 'Aplicando...' : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
