'use client';

import type { ColorScheme } from '../BeautyStorefront';

interface Professional {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  specialties: string[];
  instagram?: string;
}

interface BeautyTeamProps {
  professionals: Professional[];
  primaryColor: string;
  colors: ColorScheme;
}

export default function BeautyTeam({ professionals, primaryColor, colors }: BeautyTeamProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {professionals.map((prof) => (
        <div key={prof._id} className={`${colors.card} rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition`}>
          <div className="relative">
            <div
              className={`w-full h-64 bg-gradient-to-br ${colors.placeholderGradient} flex items-center justify-center`}
              style={{
                background: prof.avatar
                  ? `url(${prof.avatar}) center/cover`
                  : `linear-gradient(135deg, ${primaryColor}30, ${primaryColor}50)`,
              }}
            >
              {!prof.avatar && (
                <div className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white" style={{ background: primaryColor }}>
                  {(prof.name || '?').charAt(0)}
                </div>
              )}
            </div>
            {prof.instagram && (
              <a
                href={`https://instagram.com/${prof.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`absolute bottom-4 right-4 ${colors.card} p-2 rounded-full shadow-lg hover:scale-110 transition`}
                style={{ color: primaryColor }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
          </div>
          <div className="p-6">
            <h3 className={`text-2xl font-bold mb-1 ${colors.text}`}>{prof.name}</h3>
            <p className="font-medium mb-3" style={{ color: primaryColor }}>{prof.role}</p>
            {prof.bio && <p className={`${colors.textMuted} text-sm mb-4`}>{prof.bio}</p>}
            <div className="flex flex-wrap gap-2">
              {prof.specialties.map((specialty, i) => (
                <span key={i} className="px-3 py-1 text-sm rounded-full" style={{ background: `${primaryColor}15`, color: primaryColor }}>
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
