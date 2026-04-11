'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Leaf,
    ShoppingBag,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
        { label: 'Pedidos', icon: ShoppingBag, href: '/admin/orders' },
        { label: 'Menú & Platos', icon: UtensilsCrossed, href: '/admin/menu' },
        { label: 'Ingredientes', icon: Leaf, href: '/admin/ingredients' },
        { label: 'Configuración', icon: Settings, href: '/admin/settings' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-surface border-r border-white/5 py-8">
            <div className="px-8 mb-12">
                <h2 className="font-display font-black text-2xl tracking-tighter text-white">
                    Panel <span className="text-accent">Admin</span>
                </h2>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-muted hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-8 mt-auto pt-8 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-muted hover:text-red-400 transition-colors w-full"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-semibold">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden fixed z-[60] top-4 left-4 p-2 bg-surface border border-white/10 rounded-lg text-white"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Sidebar */}
            <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex md:flex-col z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="md:hidden fixed inset-y-0 left-0 w-72 z-50 flex flex-col shadow-2xl"
                        >
                            <SidebarContent />
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-full bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
