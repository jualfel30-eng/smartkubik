import Link from 'next/link';

export default function Footer() {
    const restaurantName = "Restaurante"; // Typically fetched from Settings Context

    return (
        <footer className="w-full bg-surface border-t border-white/5 py-12 mt-auto">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Brand Col */}
                    <div className="flex flex-col">
                        <Link href="/" className="font-display font-bold text-2xl tracking-tighter text-foreground mb-4">
                            {restaurantName}<span className="text-accent">.</span>
                        </Link>
                        <p className="text-muted text-sm max-w-xs leading-relaxed">
                            Redefiniendo el sabor local con ingredientes frescos y tecnología de punta.
                        </p>
                    </div>

                    {/* Links Col */}
                    <div className="flex flex-col space-y-3">
                        <h4 className="font-display font-bold text-foreground">Explora</h4>
                        <Link href="/" className="text-sm text-muted hover:text-accent transition-colors w-fit">Inicio</Link>
                        <Link href="/catalogo" className="text-sm text-muted hover:text-accent transition-colors w-fit">Menú</Link>
                        <Link href="/admin/login" className="text-sm text-muted hover:text-accent transition-colors w-fit mt-4 opacity-50">Admin</Link>
                    </div>

                    {/* Contact Col */}
                    <div className="flex flex-col space-y-3">
                        <h4 className="font-display font-bold text-foreground">Contacto</h4>
                        <span className="text-sm text-muted">Avenida Principal, Ciudad Central</span>
                        <span className="text-sm text-muted">hello@{restaurantName.toLowerCase().replace(/\s/g, '')}.com</span>
                    </div>

                </div>

                <div className="w-full h-px bg-white/5 my-8" />

                <div className="w-full flex flex-col md:flex-row items-center justify-between text-xs text-muted">
                    <p>© {new Date().getFullYear()} {restaurantName}. Todos los derechos reservados.</p>
                    <p className="mt-2 md:mt-0 flex items-center gap-1">
                        Powered by <span className="text-foreground font-semibold">SmartKubik</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
