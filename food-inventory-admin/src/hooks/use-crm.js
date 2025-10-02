import { useCrmContext } from '@/context/CrmContext.jsx';

// Este hook ahora simplemente consume el contexto para mantener la compatibilidad hacia atrás.
export const useCRM = () => useCrmContext();
