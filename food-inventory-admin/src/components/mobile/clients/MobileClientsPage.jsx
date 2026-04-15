import { useState } from 'react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';
import MobileClientsList from './MobileClientsList.jsx';
import MobileClientProfile from './MobileClientProfile.jsx';
import MobileCheckinQR from './MobileCheckinQR.jsx';

/**
 * Página raíz de Clientes en mobile.
 * Estado local: selectedClient → muestra perfil; null → muestra lista.
 * onNewAppointment navega a /appointments?new=1 con datos precargados.
 */
export default function MobileClientsPage() {
  const { isBeauty } = useMobileVertical();
  const [selected, setSelected] = useState(null);
  const [quickNew, setQuickNew] = useState(null);

  if (selected) {
    return (
      <MobileClientProfile
        client={selected}
        isBeauty={isBeauty}
        onBack={() => setSelected(null)}
        onNewAppointment={(c) => {
          // Navigate to appointments with ?new=1 — the quickOpen in MobileAppointmentsPage
          // will pick it up and pre-fill the client name
          const url = new URL(window.location.href);
          url.pathname = url.pathname.replace(/\/crm.*/, '/appointments');
          url.searchParams.set('new', '1');
          window.location.href = url.toString();
        }}
      />
    );
  }

  return (
    <div className="md:hidden mobile-content-pad space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Clientes</h1>
      </div>
      {isBeauty && <MobileCheckinQR />}
      <MobileClientsList
        onSelectClient={setSelected}
        onNewAppointment={(c) => {
          const url = new URL(window.location.href);
          url.pathname = url.pathname.replace(/\/crm.*/, '/appointments');
          url.searchParams.set('new', '1');
          window.location.href = url.toString();
        }}
      />
    </div>
  );
}
