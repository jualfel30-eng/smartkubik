import { LocaleProvider, AdminDivision } from '../../interfaces';
import veStates from './data/ve-states.json';

export class VeLocaleProvider implements LocaleProvider {
  getLanguage(): string {
    return 'es-VE';
  }

  getTimezone(): string {
    return 'America/Caracas';
  }

  getPhonePrefix(): string {
    return '+58';
  }

  getAdminDivisions(): AdminDivision[] {
    return veStates.map((state) => ({
      code: state.estado,
      name: state.estado,
      subdivisions: state.municipios.map((m) => ({
        code: m,
        name: m,
      })),
    }));
  }

  getAdminDivisionLabel(): string {
    return 'Estado';
  }

  getDateFormat(): string {
    return 'dd/MM/yyyy';
  }

  getNumberLocale(): string {
    return 'es-VE';
  }
}
