import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * usePwaInstall — fuente única de verdad para "agregar a pantalla de inicio".
 *
 * El evento `beforeinstallprompt` (Android/Chrome) solo se dispara UNA vez y se
 * consume al usarlo. Si cada componente lo escuchara por su cuenta, el primero
 * en montar se queda el evento y el resto se queda sin nada. Por eso lo
 * capturamos una sola vez a nivel de app (PwaInstallProvider) y lo exponemos a
 * cualquier punto de entrada (banner, tarjeta del menú "Más", etc.).
 *
 * iOS nunca dispara `beforeinstallprompt`: ahí la instalación es siempre manual
 * (Compartir → Añadir a pantalla de inicio), así que `canPromptInstall` es false
 * pero `ios` es true para mostrar instrucciones.
 */

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

const PwaInstallContext = createContext(null);

const FALLBACK = {
  ios: false,
  isStandalone: false,
  canPromptInstall: false,
  canInstall: false,
  promptInstall: async () => ({ outcome: 'unavailable' }),
};

export function PwaInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (e) => {
      // Evita el mini-infobar nativo; nosotros decidimos cuándo ofrecer la instalación.
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = (e) =>
      setStandalone(e.matches || window.navigator.standalone === true);
    mql?.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mql?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // El evento solo es utilizable una vez.
    setDeferredPrompt(null);
    return choice; // { outcome: 'accepted' | 'dismissed' }
  }, [deferredPrompt]);

  const ios = isIos();
  const value = {
    ios,
    isStandalone: standalone,
    // Prompt nativo disponible (Android/Chrome/Edge).
    canPromptInstall: !!deferredPrompt,
    // ¿Tiene sentido ofrecer algún punto de entrada para instalar?
    canInstall: !standalone && (!!deferredPrompt || ios),
    promptInstall,
  };

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    // Fallback seguro si se usa fuera del provider (no rompe el render).
    return { ...FALLBACK, ios: isIos(), isStandalone: isStandalone() };
  }
  return ctx;
}
