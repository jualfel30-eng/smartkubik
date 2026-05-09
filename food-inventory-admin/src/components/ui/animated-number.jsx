import * as React from "react"
import { useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion"
import { motion } from "framer-motion"
import { SPRING } from "@/lib/motion"

const defaultFormatter = (n) => Math.round(n).toLocaleString()

function AnimatedNumber({
  value = 0,
  formatter = defaultFormatter,
  spring,
  className,
  prefix = "",
  suffix = "",
  duration,
}) {
  const reduceMotion = useReducedMotion()
  const motionValue = useMotionValue(typeof value === "number" ? value : 0)
  const springValue = useSpring(motionValue, spring || SPRING.soft)
  const display = useTransform(springValue, (v) => `${prefix}${formatter(v)}${suffix}`)

  React.useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) return
    if (reduceMotion) {
      motionValue.set(value)
      springValue.jump(value)
    } else {
      motionValue.set(value)
    }
  }, [value, motionValue, springValue, reduceMotion])

  if (typeof value !== "number" || Number.isNaN(value)) {
    return <span className={className}>{prefix}{formatter(0)}{suffix}</span>
  }

  return <motion.span className={className}>{display}</motion.span>
}

const currencyFormatter = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function AnimatedCurrency({ value = 0, currency = "$", className, spring }) {
  return (
    <AnimatedNumber
      value={value}
      formatter={currencyFormatter}
      prefix={currency}
      className={className}
      spring={spring}
    />
  )
}

export { AnimatedNumber, AnimatedCurrency }
export default AnimatedNumber
