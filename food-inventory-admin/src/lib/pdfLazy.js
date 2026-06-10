// Lazy-loads jsPDF + jspdf-autotable (~400KB combined) only when a PDF is
// actually generated, keeping it out of the chunks of every screen that
// imports pdfGenerator (order details, invoice delivery, etc.).
//
// Usage inside an async function:
//   const { jsPDF, autoTable } = await getPdfLib();
let _pdfPromise;

export function getPdfLib() {
  if (!_pdfPromise) {
    _pdfPromise = Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]).then(([jspdf, auto]) => ({
      jsPDF: jspdf.default || jspdf,
      autoTable: auto.default || auto,
    }));
  }
  return _pdfPromise;
}
