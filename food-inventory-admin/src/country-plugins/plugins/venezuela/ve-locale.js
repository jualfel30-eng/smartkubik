import veStates from '../../../lib/venezuela-data.js';

export const veLocaleProvider = {
  getLanguage() {
    return 'es-VE';
  },

  getTimezone() {
    return 'America/Caracas';
  },

  getPhonePrefix() {
    return '+58';
  },

  getAdminDivisions() {
    const data = veStates.venezuelaData || veStates;
    return (Array.isArray(data) ? data : []).map((state) => ({
      code: state.estado,
      name: state.estado,
      subdivisions: state.municipios.map((m) => ({
        code: m,
        name: m,
      })),
    }));
  },

  getAdminDivisionLabel() {
    return 'Estado';
  },

  getDateFormat() {
    return 'dd/MM/yyyy';
  },

  getNumberLocale() {
    return 'es-VE';
  },
};
