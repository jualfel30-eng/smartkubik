import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateHeadingId(block) {
  if (!block || !block.children || !Array.isArray(block.children)) {
    return '';
  }
  const text = block.children.map(child => child.text || '').join('');
  if (!text) {
    return '';
  }
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
}
