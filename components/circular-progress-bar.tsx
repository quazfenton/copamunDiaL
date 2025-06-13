import { motion } from "framer-motion"

interface CircularProgressBarProps {
  progress: number
  size: number
  strokeWidth: number
}

export function CircularProgressBar({ progress, size, strokeWidth }: CircularProgressBarProps) {
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle stroke="#1a1a1a" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={center} cy={center} />
      <motion.circle
        stroke="#0ff"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="transparent"
        r={radius}
        cx={center}
        cy={center}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: circumference - (progress / 100) * circumference,
        }}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold fill-current text-cyan-500"
      >
        {`${progress}%`}
      </text>
    </svg>
  )
}

