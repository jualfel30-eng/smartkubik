'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/lib/cart-store';
import { useRestaurant } from '@/lib/restaurant-context';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const { config } = useRestaurant();
    const restaurantName = config?.restaurantName || "Restaurante";
    const logoUrl = config?.logoUrl;

    // Zustand cart items count
    const items = useCartStore((state) => state.items);
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    // Handle scroll effect for glassmorphism
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Inicio', href: '/' },
        { name: 'Menú', href: '/catalogo' },
    ];

    return (
        <header
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
                ? 'bg-background/80 backdrop-blur-md border-b border-white/10 shadow-lg'
                : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">

                {/* Brand / Logo */}
                <Link href="/" className="font-display font-bold text-2xl tracking-tighter text-foreground group flex items-center gap-2">
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt={restaurantName}
                            width={120}
                            height={40}
                            className="h-10 w-auto object-contain"
                            unoptimized
                        />
                    ) : (
                        <>{restaurantName}<span className="text-accent group-hover:text-white transition-colors">.</span></>
                    )}
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`font-medium text-sm transition-colors hover:text-accent ${pathname === link.href ? 'text-accent' : 'text-foreground/80'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Actions (Cart & Mobile Button) */}
                <div className="flex items-center gap-4">

                    <button
                        type="button"
                        className="relative p-2 rounded-full hover:bg-white/5 transition-colors group"
                        aria-label="Open cart"
                        // We dispatch a custom event to open the cart drawer generically
                        onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
                    >
                        <ShoppingBag className="w-6 h-6 text-foreground group-hover:text-accent transition-colors" strokeWidth={1.5} />
                        <AnimatePresence>
                            {itemCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute top-0 right-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                                >
                                    {itemCount}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-foreground"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden absolute top-20 left-0 w-full bg-surface border-b border-white/10 shadow-2xl py-4"
                    >
                        <div className="flex flex-col px-4 gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`font-medium text-lg py-2 border-b border-white/5 ${pathname === link.href ? 'text-accent' : 'text-foreground/80'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
