import '@testing-library/jest-dom';

// Polyfill for Radix UI + jsdom issue with hasPointerCapture
if (typeof window !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function(pointerId) {
      return false;
    };
  }

  // Polyfill for Radix UI + jsdom issue with scrollIntoView
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = function() {};
  }
}