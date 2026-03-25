// Mock for pdf-parse to avoid pdfjs-dist ESM import.meta.url issue in Jest
class PDFParse {
  async parse(buffer) {
    return { text: '', numpages: 0, info: {} };
  }
}

module.exports = { PDFParse };
