export interface AdminDivision {
  code: string;
  name: string;
  subdivisions?: { code: string; name: string }[];
}

export interface LocaleProvider {
  getLanguage(): string;
  getTimezone(): string;
  getPhonePrefix(): string;
  getAdminDivisions(): AdminDivision[];
  getAdminDivisionLabel(): string;
  getDateFormat(): string;
  getNumberLocale(): string;
}
