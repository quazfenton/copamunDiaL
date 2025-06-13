"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CircularProgressBar } from "@/components/circular-progress-bar"

export default function Desktop() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className="bg-black bg-opacity-50 backdrop-blur-md border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="p-6 relative">
              <h2 className="text-2xl font-bold mb-4">Widget {index}</h2>
              <p className="text-gray-300 mb-4">This is a futuristic widget with hover effects and dynamic content.</p>
              <Button className="bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all duration-300">
                Activate
              </Button>
              <motion.div
                className="absolute top-0 right-0 m-4"
                initial={{ scale: 0 }}
                animate={{ scale: hoveredCard === index ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CircularProgressBar progress={75} size={60} strokeWidth={6} />
              </motion.div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

