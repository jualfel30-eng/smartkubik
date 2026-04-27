import { useRef, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../lib/motion';
import type { LucideIcon } from 'lucide-react';

interface SectionWrapperProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  onVisibilityChange?: (id: string, visible: boolean) => void;
}

export function SectionWrapper({ id, title, icon: Icon, children, onVisibilityChange }: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisibilityChange) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(id, entry.isIntersecting);
      },
      { threshold: 0.2, rootMargin: '-80px 0px -40% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, onVisibilityChange]);

  return (
    <section id={id} ref={ref} className="scroll-mt-24">
      <motion.div
        variants={fadeUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.06]">
              <Icon className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          </div>
          {children}
        </div>
      </motion.div>
    </section>
  );
}
