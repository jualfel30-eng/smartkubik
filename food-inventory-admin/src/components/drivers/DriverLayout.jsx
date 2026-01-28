import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Truck, Package, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/use-auth';

export const DriverLayout = () => {
    const location = useLocation();
    const { logout, user } = useAuth();

    // Check if path starts with /driver (simple check)
    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header / Navbar */}
            <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-md mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-full">
                            <Truck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">Driver Portal</h1>
                            <p className="text-xs text-slate-400">{user?.firstName}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout} className="text-slate-400 hover:text-white hover:bg-slate-800">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-md mx-auto w-full h-full pb-20">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full z-10 pb-safe">
                <div className="max-w-md mx-auto w-full grid grid-cols-2 h-16">
                    <Link
                        to="/driver/pool"
                        className={`flex flex-col items-center justify-center gap-1 ${isActive('/driver/pool') ? 'text-blue-600' : 'text-slate-500'}`}
                    >
                        <Package className="h-6 w-6" />
                        <span className="text-xs font-medium">Disponibles</span>
                    </Link>
                    <Link
                        to="/driver/active"
                        className={`flex flex-col items-center justify-center gap-1 ${isActive('/driver/active') ? 'text-blue-600' : 'text-slate-500'}`}
                    >
                        <Truck className="h-6 w-6" />
                        <span className="text-xs font-medium">Mis Entregas</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
};
