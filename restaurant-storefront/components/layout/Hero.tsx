'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface HeroProps {
    restaurantName: string;
    tagline?: string;
    videoUrl?: string;
    imageUrl?: string;
}

export default function Hero({ restaurantName, tagline, videoUrl, imageUrl }: HeroProps) {
    const bgStyle = !videoUrl && imageUrl
        ? { backgroundImage: `url('${imageUrl}')` }
        : undefined;

    return (
        <section className="relative w-full h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Media */}
            <div className="absolute inset-0 z-0">
                {videoUrl ? (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-60"
                    >
                        <source src={videoUrl} type="video/mp4" />
                    </video>
                ) : (
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat opacity-60"
                        style={bgStyle || { backgroundImage: "url('/hero-bg.png')" }}
                    />
                )}
                {/* Overlay gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-6"
                >
                    <span className="inline-block py-1 px-3 rounded-full bg-accent/20 text-accent text-sm font-bold tracking-wider mb-4 border border-accent/20">
                        SABOR AUTÉNTICO
                    </span>
                    <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl">
                        {restaurantName.toUpperCase()}<br />
                        <span className="text-accent italic font-medium">EXPERIENCE</span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-10"
                >
                    {tagline || 'Ingredientes premium, preparados con pasión al instante.'}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5, type: 'spring' }}
                >
                    <Link
                        href="/catalogo"
                        className="group relative inline-flex items-center justify-center px-8 py-4 bg-accent text-white font-bold text-lg rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,69,0,0.6)]"
                    >
                        <span className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                        <span className="relative z-10">Ordenar Ahora</span>
                    </Link>
                </motion.div>

            </div>
        </section>
    );
}
