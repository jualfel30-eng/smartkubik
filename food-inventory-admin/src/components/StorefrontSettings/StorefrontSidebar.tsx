import { motion } from 'framer-motion';
import { SPRING } from '../../lib/motion';
import { Check, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SidebarSection {
  id: string;
  label: string;
  icon: LucideIcon;
  complete: boolean;
  visible?: boolean; // only for applicable verticals
}

interface StorefrontSidebarProps {
  sections: SidebarSection[];
  activeId: string | null;
  onNavigate: (id: string) => void;
}

export function StorefrontSidebar({ sections, activeId, onNavigate }: StorefrontSidebarProps) {
  const visibleSections = sections.filter((s) => s.visible !== false);

  return (
    <nav className="sticky top-6 space-y-1">
      {visibleSections.map((section) => {
        const isActive = section.id === activeId;
        const Icon = section.icon;

        return (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm
              transition-colors duration-150 group
              ${isActive
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }
            `}
          >
            {/* Completion indicator */}
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {section.complete ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING.bouncy}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </motion.span>
              ) : (
                <Circle className={`w-2.5 h-2.5 ${isActive ? 'text-blue-400' : 'text-gray-600'}`} />
              )}
            </span>

            {/* Icon */}
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'}`} />

            {/* Label */}
            <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
