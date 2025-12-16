"use client"

import { motion } from "framer-motion"

interface AIBadgeProps {
  className?: string
}

const AIBadge = ({ className = "" }: AIBadgeProps) => {
  return (
    <motion.div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-md ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-xs">✨</span>
      <span className="text-xs font-medium text-purple-400">Автоматична ШІ-генерація</span>
    </motion.div>
  )
}

export default AIBadge

