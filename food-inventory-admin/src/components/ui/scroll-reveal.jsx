import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { fadeUp, STAGGER } from '@/lib/motion';

/**
 * ScrollReveal — wraps children in a fadeUp animation that fires once
 * when the element enters the viewport. Respects prefers-reduced-motion.
 *
 * Props:
 *   delay     — stagger delay offset in seconds (default 0)
 *   threshold — how much of the element must be visible (default 0.12)
 *   className — forwarded to the wrapper div
 *   stagger   — if true, wraps with a stagger container + maps children as listItems
 *
 * Usage:
 *   <ScrollReveal>
 *     <div>section content</div>
 *   </ScrollReveal>
 *
 *   <ScrollReveal delay={0.1}>...</ScrollReveal>
 */
export function ScrollReveal({
  children,
  delay = 0,
  threshold = 0.12,
  className,
}) {
  const { ref, inView } = useScrollReveal({ threshold });

  const variants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
        delay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="initial"
      animate={inView ? 'animate' : 'initial'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScrollRevealGroup — stagger container: each direct child fades up
 * with a 60ms offset between them as they enter the viewport.
 *
 * Usage:
 *   <ScrollRevealGroup className="grid gap-4 md:grid-cols-4">
 *     <Card>...</Card>
 *     <Card>...</Card>
 *   </ScrollRevealGroup>
 */
export function ScrollRevealGroup({
  children,
  threshold = 0.08,
  className,
  staggerDelay = 0.06,
}) {
  const { ref, inView } = useScrollReveal({ threshold });

  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.02,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="initial"
      animate={inView ? 'animate' : 'initial'}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>
      }
    </motion.div>
  );
}

export default ScrollReveal;
