"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Calendar, MapPin, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const OptionsMenu = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-80 bg-gray-900 bg-opacity-90 backdrop-blur-md p-6 shadow-lg z-50"
        >
          <Button variant="ghost" className="absolute top-4 right-4" onClick={onClose}>
            <X />
          </Button>
          <h2 className="text-2xl font-bold mb-6">Options</h2>
          <nav className="space-y-4">
            <Button variant="ghost" className="w-full justify-start">
              <MapPin className="mr-2" /> Find Local Matches
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="mr-2" /> Match Schedule
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2" /> User Profiles
            </Button>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OptionsMenu

