// Lazy-loads the heavy `xlsx` library (~460KB) only when an export/import
// action actually runs, keeping it out of the initial chunk of the
// Inventory / Products / Payments screens (which are loaded constantly).
//
// Usage inside an (async) handler:
//   const XLSX = await getXLSX();
//   XLSX.utils.json_to_sheet(...)
let _xlsxPromise;

export function getXLSX() {
  if (!_xlsxPromise) {
    // Interop: depending on the bundler, the CJS module may land on the
    // namespace directly or under `.default`. Pick whichever exposes `utils`.
    _xlsxPromise = import("xlsx").then((mod) =>
      mod && mod.utils ? mod : mod.default,
    );
  }
  return _xlsxPromise;
}
