import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { STAGGER, listItem, EASE, DUR } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * AnimatedTableBody — Drop-in replacement for <tbody> with staggered row animations.
 *
 * Animates rows on mount (staggered fade+slide) and on item exit (fade out).
 * Uses framer-motion — only import in lazy-loaded page components to keep
 * the main bundle lean.
 *
 * Usage:
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <AnimatedTableBody>
 *       {data.map(item => (
 *         <AnimatedTableRow key={item._id}>
 *           <TableCell>...</TableCell>
 *         </AnimatedTableRow>
 *       ))}
 *     </AnimatedTableBody>
 *   </Table>
 *
 * Or use the convenience wrapper:
 *   <AnimatedTableBody
 *     items={data}
 *     keyField="_id"
 *     renderRow={(item) => (
 *       <>
 *         <TableCell>{item.name}</TableCell>
 *         <TableCell>{item.quantity}</TableCell>
 *       </>
 *     )}
 *   />
 */

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
}

const rowVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DUR.fast, ease: EASE.out },
  },
}

function AnimatedTableBody({
  children,
  items,
  keyField = "_id",
  renderRow,
  className,
  ...props
}) {
  // Convenience mode: items + renderRow
  if (items && renderRow) {
    return (
      <motion.tbody
        data-slot="table-body"
        className={cn("[&_tr:last-child]:border-0", className)}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        {...props}
      >
        <AnimatePresence>
          {items.map((item) => (
            <AnimatedTableRow key={item[keyField]} className="group/row hover:bg-muted/50 border-b transition-colors">
              {renderRow(item)}
            </AnimatedTableRow>
          ))}
        </AnimatePresence>
      </motion.tbody>
    )
  }

  // Manual mode: children
  return (
    <motion.tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      {...props}
    >
      {children}
    </motion.tbody>
  )
}

function AnimatedTableRow({ children, className, ...props }) {
  return (
    <motion.tr
      data-slot="table-row"
      className={cn(
        "group/row hover:bg-muted/50 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground border-b transition-colors",
        className
      )}
      variants={rowVariants}
      layout
      {...props}
    >
      {children}
    </motion.tr>
  )
}

export { AnimatedTableBody, AnimatedTableRow }
