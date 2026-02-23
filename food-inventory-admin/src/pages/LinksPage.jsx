import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Instagram,
  Facebook,
  MessageCircle,
  BookOpen,
  Rocket,
  Play,
  ExternalLink,
  Sparkles,
  Globe,
  Mail,
  FileText,
  ShoppingBag,
  Link2,
  Youtube,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

// ── UTM helper ────────────────────────────────────────────────
const UTM_DEFAULTS = {
  utm_source: 'linktree',
  utm_medium: 'social',
  utm_campaign: 'bio_link',
};

function withUtm(url, overrides = {}) {
  const params = { ...UTM_DEFAULTS, ...overrides };
  const sep = url.includes('?') ? '&' : '?';
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `${url}${sep}${qs}`;
}

// ── Links data ────────────────────────────────────────────────
const LINKS = [
  {
    id: 'trial',
    label: 'Prueba SmartKubik GRATIS 14 días',
    url: '/register',
    icon: Sparkles,
    highlight: true,
    internal: true,
    utmOverride: { utm_campaign: 'free_trial' },
  },
  {
    id: 'founders',
    label: 'Programa Clientes Fundadores — Hasta 51% OFF',
    url: '/fundadores',
    icon: Rocket,
    highlight: true,
    internal: true,
    utmOverride: { utm_campaign: 'founders' },
  },
  {
    id: 'whatsapp',
    label: 'Escríbenos por WhatsApp',
    url: 'https://wa.me/584241234567?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20SmartKubik',
    icon: MessageCircle,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'instagram',
    label: 'Síguenos en Instagram',
    url: 'https://instagram.com/smartkubik',
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
  },
  {
    id: 'tiktok',
    label: 'Videos en TikTok',
    url: 'https://tiktok.com/@smartkubik',
    icon: Play,
    color: 'from-gray-700 to-gray-900',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    url: 'https://facebook.com/smartkubik',
    icon: Facebook,
    color: 'from-blue-600 to-blue-700',
  },
  {
    id: 'youtube',
    label: 'Tutoriales en YouTube',
    url: 'https://youtube.com/@smartkubik',
    icon: Play,
    color: 'from-red-600 to-red-700',
  },
  {
    id: 'blog',
    label: 'Blog — Tips para tu negocio',
    url: '/blog',
    icon: BookOpen,
    internal: true,
  },
  {
    id: 'docs',
    label: 'Documentación y guías',
    url: '/docs',
    icon: BookOpen,
    internal: true,
  },
];

const ICON_MAP = {
  link: Link2, globe: Globe, instagram: Instagram, facebook: Facebook,
  youtube: Youtube, whatsapp: MessageCircle, tiktok: Play,
  mail: Mail, book: BookOpen, 'file-text': FileText,
  'shopping-bag': ShoppingBag, 'external-link': ExternalLink,
  sparkles: Sparkles, rocket: Rocket,
};

function resolveIcon(iconKey) {
  return ICON_MAP[iconKey] || Link2;
}

// ── Component ─────────────────────────────────────────────────
export default function LinksPage() {
  const [links, setLinks] = useState(LINKS);

  useEffect(() => {
    // Try to fetch global links from API; fall back to hardcoded
    fetch(`${getApiBaseUrl()}/social-links?tenantId=`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const apiLinks = Array.isArray(data) ? data : data?.data;
        if (apiLinks && apiLinks.length > 0) {
          setLinks(
            apiLinks.map((l) => ({
              id: l._id,
              label: l.label,
              url: l.url,
              icon: resolveIcon(l.icon),
              highlight: l.highlight || false,
              internal: l.url.startsWith('/'),
              utmOverride: l.utmCampaign ? { utm_campaign: l.utmCampaign } : undefined,
            })),
          );
        }
      })
      .catch(() => {
        // Silently use fallback LINKS
      });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.classList.add('landing-page-active');
    document.documentElement.classList.add('landing-page-active');

    const styleId = 'links-custom-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      body.landing-page-active {
        background-color: #0A0F1C !important;
        color: #F8FAFC !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const s = document.getElementById(styleId);
      if (s) s.remove();
      document.body.classList.remove('landing-page-active');
      document.documentElement.classList.remove('landing-page-active');
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-screen bg-[#070A13] text-white font-sans flex flex-col items-center px-4 py-12 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/15 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/15 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        {/* Avatar / Logo */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 p-[3px] shadow-lg shadow-cyan-900/30">
            <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center overflow-hidden">
              <img
                src="/assets/logo-smartkubik.png"
                alt="SmartKubik"
                className="h-12 w-auto"
              />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-xl font-bold text-white mb-1 tracking-tight"
        >
          SmartKubik
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="text-sm text-gray-400 mb-8 text-center max-w-xs"
        >
          El ERP con IA que simplifica tu negocio. Inventario, ventas, WhatsApp y
          más — todo en un solo lugar.
        </motion.p>

        {/* Links */}
        <div className="w-full space-y-3">
          {links.map((link) => {
            const finalUrl = link.internal
              ? withUtm(link.url, link.utmOverride)
              : link.url;

            const isExternal = !link.internal;
            const Tag = link.internal ? 'a' : 'a';

            return (
              <motion.a
                key={link.id}
                variants={itemVariants}
                href={finalUrl}
                {...(isExternal
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={`group flex items-center gap-3 w-full px-5 py-4 rounded-2xl border transition-all text-left ${
                  link.highlight
                    ? 'bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border-cyan-500/30 hover:border-cyan-400/50 shadow-lg shadow-cyan-900/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    link.highlight
                      ? 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-white'
                      : link.color
                      ? `bg-gradient-to-br ${link.color} text-white`
                      : 'bg-white/10 text-gray-300'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="flex-1 text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                  {link.label}
                </span>
                {isExternal ? (
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 shrink-0 transition-colors" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                )}
              </motion.a>
            );
          })}
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-10 text-center">
          <p className="text-xs text-gray-600">
            © 2026 SmartKubik Inc. — Hecho en Venezuela
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
