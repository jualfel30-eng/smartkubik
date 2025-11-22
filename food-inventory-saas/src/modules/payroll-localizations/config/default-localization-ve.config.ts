export const DEFAULT_VE_LOCALIZATION = {
  country: "VE",
  version: 1,
  label: "VE · Tasas base",
  status: "draft",
  validFrom: new Date("2025-01-01"),
  rates: {
    ivss: {
      employer: 0.09,
      employee: 0.04,
    },
    faov: {
      employer: 0.02,
      employee: 0.01,
    },
    paroForzoso: {
      employer: 0.02,
      employee: 0.005,
    },
    utilitiesDays: 30,
    vacationDays: 15,
    islrTable: [
      { from: 0, to: 7500, rate: 0.0 },
      { from: 7500, to: 18000, rate: 0.06 },
      { from: 18000, to: 30000, rate: 0.09 },
      { from: 30000, to: 60000, rate: 0.12 },
      { from: 60000, to: 90000, rate: 0.16 },
      { from: 90000, to: 120000, rate: 0.22 },
      { from: 120000, to: 999999999, rate: 0.34 },
    ],
  },
  metadata: {
    source: "bootstrap",
    localization: "VE",
  },
};
