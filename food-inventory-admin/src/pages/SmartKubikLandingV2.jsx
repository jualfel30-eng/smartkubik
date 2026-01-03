import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
    Cpu,
    Globe,
    BarChart3,
    Zap,
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    Factory,
    MessageSquare,
    Box,
    Layers,
    Activity,
    Server,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- COMPONENTS ---

const GlassCard = ({ children, className = "" }) => (
    <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/10 ${className}`}
    >
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl transition-all duration-500 group-hover:bg-violet-500/30" />
        <div className="relative z-10">{children}</div>
    </div>
);

const SectionHeading = ({ badge, title, subtitle }) => (
    <div className="mb-12 text-center md:mb-20">
        <Badge
            variant="outline"
            className="mb-4 text-violet-300 border-violet-500/30 bg-violet-500/10 px-4 py-1.5 uppercase tracking-widest"
        >
            {badge}
        </Badge>
        <h2 className="mb-6 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl font-outfit">
            {title}
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-slate-400 md:text-xl">
            {subtitle}
        </p>
    </div>
);

// --- SECTIONS ---

const Navbar = () => (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-lg shadow-violet-500/20">
                    S
                </div>
                <span className="text-xl font-bold tracking-tight text-white font-outfit">
                    SmartKubik
                </span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
                {["Product", "Solutions", "Enterprise", "Pricing"].map((item) => (
                    <a
                        key={item}
                        href="#"
                        className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
                    >
                        {item}
                    </a>
                ))}
            </div>
            <div className="flex items-center gap-4">
                <a href="/login" className="hidden text-sm font-medium text-white transition-opacity hover:opacity-80 md:block">
                    Login
                </a>
                <Button className="rounded-full bg-white px-6 font-semibold text-black hover:bg-slate-200">
                    Get Started
                </Button>
            </div>
        </div>
    </nav>
);

const Hero = () => {
    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-32 pb-20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
                <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[90px]" />
                <div className="bg-[url('https://grainy-gradients.vercel.app/noise.svg')] absolute inset-0 opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-white/80">
                        v2.0 Now Available: The Neural Update
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="mx-auto mb-8 max-w-5xl bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl lg:text-8xl font-outfit"
                >
                    The Operating System <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                        for High-Stakes Commerce
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 md:text-xl"
                >
                    Replace your fragmented stack with one unified brain.
                    Manufacturing depth, Enterprise controls, and AI intelligence—all in one
                    liquid interface.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
                >
                    <Button size="lg" className="h-14 rounded-full bg-violet-600 px-8 text-lg font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-700 hover:shadow-violet-500/40">
                        Deploy Infrastructure <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-14 rounded-full border-white/10 bg-transparent px-8 text-lg text-white hover:bg-white/5"
                    >
                        View Architecture
                    </Button>
                </motion.div>

                {/* 3D Dashboard Mockup */}
                <motion.div
                    initial={{ opacity: 0, rotateX: 20, y: 100 }}
                    animate={{ opacity: 1, rotateX: 0, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, type: "spring" }}
                    className="relative mt-20 mx-auto max-w-6xl perspective-[2000px]"
                >
                    <div className="relative rounded-xl border border-white/10 bg-[#0A0A0A] p-2 shadow-2xl shadow-violet-500/10 backdrop-blur-sm md:p-4 rotate-x-[15deg] transform-preserve-3d transition-transform duration-700 hover:rotate-x-0">
                        {/* Dashboard Header */}
                        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4 px-2">
                            <div className="flex gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                                <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                            </div>
                            <div className="h-6 w-96 rounded-full bg-white/5"></div>
                            <div className="h-8 w-8 rounded-full bg-violet-500/20"></div>
                        </div>

                        {/* Dashboard Content Grid */}
                        <div className="grid grid-cols-12 gap-6 p-4">
                            {/* Left Col */}
                            <div className="col-span-3 space-y-4">
                                <div className="h-32 rounded-lg bg-white/5 p-4 border border-white/5">
                                    <div className="mb-2 h-8 w-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Activity size={18} /></div>
                                    <div className="text-2xl font-bold text-white">$4.2M</div>
                                    <div className="text-xs text-slate-500">Monthly Revenue (+12%)</div>
                                </div>
                                <div className="h-32 rounded-lg bg-white/5 p-4 border border-white/5">
                                    <div className="mb-2 h-8 w-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"><Users size={18} /></div>
                                    <div className="text-2xl font-bold text-white">8,430</div>
                                    <div className="text-xs text-slate-500">Active Users</div>
                                </div>
                            </div>
                            {/* Main Chart */}
                            <div className="col-span-6 rounded-lg bg-white/5 p-6 border border-white/5">
                                <div className="flex justify-between mb-8">
                                    <div>
                                        <div className="text-sm text-slate-400">Production Output</div>
                                        <div className="text-xl font-bold text-white">98.2% Efficiency</div>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <div className="px-2 py-1 rounded bg-white/10 text-white">1D</div>
                                        <div className="px-2 py-1 rounded bg-violet-500 text-white">1W</div>
                                        <div className="px-2 py-1 rounded bg-white/10 text-white">1M</div>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between h-40 gap-2">
                                    {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 80, 75].map((h, i) => (
                                        <div key={i} className={`w-full rounded-t-sm transition-all hover:bg-violet-400 ${i === 9 ? 'bg-violet-500' : 'bg-white/10'}`} style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                            </div>
                            {/* Right Col */}
                            <div className="col-span-3 space-y-4">
                                <div className="h-full rounded-lg bg-white/5 p-4 border border-white/5 flex flex-col gap-3">
                                    <div className="text-sm font-medium text-slate-300 mb-2">System Health</div>
                                    <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                                        <span className="text-xs text-slate-400 flex items-center gap-2"><Server size={12} /> API Gateway</span>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                                        <span className="text-xs text-slate-400 flex items-center gap-2"><Zap size={12} /> AI Engine</span>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                                        <span className="text-xs text-slate-400 flex items-center gap-2"><Globe size={12} /> CDN Edge</span>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Glow under dashboard */}
                    <div className="absolute -bottom-10 left-0 right-0 h-40 bg-violet-500/20 blur-[80px]" />
                </motion.div>
            </div>
        </section>
    );
};

const BrainSection = () => (
    <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
                badge="Neural Core"
                title="Automate Decisions. Not Just Tasks."
                subtitle="Vector-Embedded Intelligence analyzes correlation between Production Costs and Sales Velocity in real-time."
            />

            <div className="grid gap-8 md:grid-cols-3">
                <GlassCard className="group p-8">
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50 transition-all group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white">
                        <Zap size={28} />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-white">Predictive Actions</h3>
                    <p className="text-slate-400">The system notices matcha latte sales spiking and autonomously schedules a new production run for almond milk 48 hours in advance.</p>
                </GlassCard>

                <GlassCard className="group p-8 relative overflow-hidden border-violet-500/30 bg-violet-900/10">
                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white text-black ring-1 ring-white/50 transition-all group-hover:scale-110">
                        <Cpu size={28} />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-white">Vector Brain</h3>
                    <p className="text-slate-400">Unlike basic chatbots, our AI understands semantic relationships between your inventory, recipes, and customer reviews.</p>
                </GlassCard>

                <GlassCard className="group p-8">
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50 transition-all group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white">
                        <MessageSquare size={28} />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-white">Conversational Ops</h3>
                    <p className="text-slate-400">"Hey SmartKubik, what's our margin impact if we switch avocado suppliers?" Get instant, calculated answers.</p>
                </GlassCard>
            </div>
        </div>
    </section>
);

const FactorySection = () => (
    <section className="relative py-32 bg-[#0A0A0A]">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
                <div>
                    <Badge variant="outline" className="mb-4 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 uppercase tracking-widest">
                        Manufacturing Depth
                    </Badge>
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-outfit">
                        Industrial-Grade Precision.
                    </h2>
                    <p className="mb-8 text-lg text-slate-400">
                        Most IMS tools just subtract stock. We handle recursive BOMs, Work Center overheads, and automated journal entries per production run.
                    </p>

                    <div className="space-y-6">
                        {["Recursive Bill of Materials", "Work Center Management", "Live Cost Calculation", "Scrap & Waste Tracking"].map((item) => (
                            <div key={item} className="flex items-center gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                                    <CheckCircle2 size={16} />
                                </div>
                                <span className="text-lg text-white">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    {/* 3D Exploded View Card */}
                    <GlassCard className="p-0 border-white/10 bg-[#111]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <span className="text-sm font-mono text-slate-400">BOM: TECH-BURGER-V2</span>
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        </div>
                        <div className="p-8 space-y-4">
                            {/* Layer 1 */}
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/50 transition-colors">
                                <Box className="text-emerald-500" />
                                <div className="flex-1">
                                    <div className="text-white font-medium">Finished Unit</div>
                                    <div className="text-xs text-slate-500">SKU: TB-001 • Target Cost: $4.20</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-mono">1.0 ea</div>
                                </div>
                            </div>
                            {/* Connector */}
                            <div className="ml-8 h-6 w-0.5 bg-white/10"></div>
                            {/* Layer 2 */}
                            <div className="ml-8 flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                                <Layers className="text-blue-500" />
                                <div className="flex-1">
                                    <div className="text-white font-medium">Sub-Assembly: Sauce Mix</div>
                                    <div className="text-xs text-slate-500">SKU: SM-002 • Labor: 4 mins</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-mono">0.05 L</div>
                                </div>
                            </div>
                            {/* Connector */}
                            <div className="ml-16 h-6 w-0.5 bg-white/10"></div>
                            {/* Layer 3 */}
                            <div className="ml-16 flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                                <Factory className="text-violet-500" />
                                <div className="flex-1">
                                    <div className="text-white font-medium">Raw Material: Spice Blend</div>
                                    <div className="text-xs text-slate-500">Vendor: Spicely Inc</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-mono">12 g</div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    </section>
);

const EcosystemSection = () => (
    <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-[#050505] to-[#050505]" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
            <SectionHeading
                badge="Global Scale"
                title="Built for the Franchise."
                subtitle="Centralized Control, Decentralized Execution. Manage 100+ locations from a single pane of glass."
            />

            <div className="relative mx-auto mt-20 max-w-5xl">
                {/* Abstract Map Visualization */}
                <div className="aspect-[16/9] rounded-2xl border border-white/10 bg-[#0A0A0A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                    {/* Nodes */}
                    <div className="absolute top-1/3 left-1/4">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-24 w-24 animate-ping rounded-full bg-violet-500/20"></div>
                            <div className="relative h-4 w-4 rounded-full bg-white shadow-[0_0_20px_rgba(139,92,246,0.8)]"></div>
                            <GlassCard className="absolute left-6 top-6 w-48 p-3 !bg-[#050505]/90">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs font-bold text-white">Miami HQ</span>
                                </div>
                                <div className="text-[10px] text-slate-400">Sales: $12,402 / day</div>
                            </GlassCard>
                        </div>
                    </div>

                    <div className="absolute bottom-1/3 right-1/3">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-16 w-16 animate-ping rounded-full bg-blue-500/20 animation-delay-500"></div>
                            <div className="relative h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
                        </div>
                    </div>

                    <div className="absolute top-1/4 right-1/4">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-500/20 animation-delay-700"></div>
                            <div className="relative h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
                        </div>
                    </div>

                    {/* Connecting Lines (SVG) */}
                    <svg className="absolute inset-0 h-full w-full pointer-events-none">
                        <path d="M 300 200 Q 500 100 700 300" stroke="url(#lineGradient)" strokeWidth="2" fill="none" opacity="0.5" />
                        <path d="M 300 200 Q 500 400 600 200" stroke="url(#lineGradient)" strokeWidth="2" fill="none" opacity="0.3" />
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        </div>
    </section>
);

const Footer = () => (
    <footer className="border-t border-white/10 bg-[#020202] py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="mb-8 text-4xl font-bold text-white md:text-6xl font-outfit">
                Ready to deploy your <br />
                <span className="text-violet-500">Central Nervous System?</span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-400">
                Join the high-stakes operators running their business on SmartKubik.
            </p>
            <Button size="lg" className="h-16 rounded-full bg-white px-10 text-xl font-bold text-black shadow-2xl hover:bg-slate-200">
                Initialize Deployment <ArrowRight className="ml-2" />
            </Button>

            <div className="mt-20 flex flex-col items-center gap-6 md:flex-row md:justify-between border-t border-white/5 pt-10 text-sm text-slate-500">
                <div>© 2026 SmartKubik Inc. All rights reserved.</div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-white">Privacy</a>
                    <a href="#" className="hover:text-white">Terms</a>
                    <a href="#" className="hover:text-white">Status</a>
                </div>
            </div>
        </div>
    </footer>
);

export default function SmartKubikLandingV2() {
    return (
        <div className="min-h-screen bg-[#050505] text-slate-200 font-inter selection:bg-violet-500/30 selection:text-white">
            <Navbar />
            <main>
                <Hero />
                <BrainSection />
                <FactorySection />
                <EcosystemSection />
                <Footer />
            </main>
        </div>
    );
}
