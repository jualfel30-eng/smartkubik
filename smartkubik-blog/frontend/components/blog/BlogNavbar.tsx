"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { ThemeToggle } from '@/components/ThemeToggle'

const BlogNavbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { resolvedTheme } = useTheme()

    const logoSrc = resolvedTheme === 'dark' ? '/blog/logo-smartkubik-light.png' : '/blog/logo-smartkubik.png'

    return (
        <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b border-border z-50 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center space-x-3 animate-fadeIn">
                        <img src={logoSrc} alt="Smart Kubik" className="h-10 w-auto" />
                    </Link>

                    <div className="hidden md:flex items-center space-x-8">
                        <a href="https://smartkubik.com/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                            Características
                        </a>
                        <a href="https://smartkubik.com/#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                            Beneficios
                        </a>
                        <a href="https://smartkubik.com/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                            Precios
                        </a>
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                            Blog
                        </Link>
                        <ThemeToggle />
                        <Link
                            href="/register"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
                        >
                            Regístrate
                        </Link>
                        <Link
                            href="/login"
                            className="text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-md transition-colors duration-200"
                        >
                            Inicia sesión
                        </Link>
                    </div>

                    <button
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-card border-t border-border animate-fadeIn">
                    <div className="px-6 py-4 space-y-3">
                        <a href="https://smartkubik.com/#features" className="block text-sm text-muted-foreground">
                            Características
                        </a>
                        <a href="https://smartkubik.com/#benefits" className="block text-sm text-muted-foreground">
                            Beneficios
                        </a>
                        <a href="https://smartkubik.com/#pricing" className="block text-sm text-muted-foreground">
                            Precios
                        </a>
                        <Link href="/" className="block text-sm text-muted-foreground">
                            Blog
                        </Link>
                        <div className="pt-2">
                            <ThemeToggle />
                        </div>
                        <Link
                            href="/register"
                            className="block w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium text-center"
                        >
                            Regístrate
                        </Link>
                        <Link
                            href="/login"
                            className="block w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium text-center"
                        >
                            Inicia sesión
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    )
}

export default BlogNavbar
