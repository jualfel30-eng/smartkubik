import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function generateHeadingId(children: any): string {
    if (!children) return ''
    // If children is a string, slugify it
    if (typeof children === 'string') {
        return children
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
    }
    // If children is an array or object (Sanity block), extract text
    // This is a simplified version, might need adjustment based on actual PortableText data
    try {
        if (Array.isArray(children)) {
            return children.map(child => child.text).join('').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        if (children.text) {
            return children.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
    } catch (e) {
        return ''
    }
    return ''
}
