"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, Calendar, Search, UserPlus, User, Trophy, 
  BarChart2, MapPin, Menu, X, Home
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SideMenuProps {
  onMyTeamClick: () => void
  onFindMatchClick: () => void
  onScheduleClick: () => void
  onInvitePlayerClick: () => void
  onProfileClick: () => void
  onTeamProfileClick: () => void
  onLeaguesClick: () => void
  onCalendarClick: () => void
  onPickupGamesClick: () => void
  onHomeClick: () => void
}

export default function SideMenu({
  onMyTeamClick,
  onFindMatchClick,
  onScheduleClick,
  onInvitePlayerClick,
  onProfileClick,
  onTeamProfileClick,
  onLeaguesClick,
  onCalendarClick,
  onPickupGamesClick,
  onHomeClick
}: SideMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        onClick={toggleMenu}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full w-64 bg-black/80 backdrop-blur-md z-40 text-white p-4 pt-16 shadow-xl"
          >
            <div className="flex flex-col space-y-2">
              <MenuItem icon={<Home />} label="Home" onClick={() => { onHomeClick(); toggleMenu(); }} />
              <MenuItem icon={<Users />} label="My Team" onClick={() => { onMyTeamClick(); toggleMenu(); }} />
              <MenuItem icon={<Search />} label="Find Match" onClick={() => { onFindMatchClick(); toggleMenu(); }} />
              <MenuItem icon={<Calendar />} label="Schedule Match" onClick={() => { onScheduleClick(); toggleMenu(); }} />
              <MenuItem icon={<UserPlus />} label="Invite Player" onClick={() => { onInvitePlayerClick(); toggleMenu(); }} />
              <MenuItem icon={<User />} label="My Profile" onClick={() => { onProfileClick(); toggleMenu(); }} />
              <MenuItem icon={<Trophy />} label="Team Profile" onClick={() => { onTeamProfileClick(); toggleMenu(); }} />
              <MenuItem icon={<BarChart2 />} label="Leagues" onClick={() => { onLeaguesClick(); toggleMenu(); }} />
              <MenuItem icon={<Calendar />} label="Calendar" onClick={() => { onCalendarClick(); toggleMenu(); }} />
              <MenuItem icon={<MapPin />} label="Pickup Games" onClick={() => { onPickupGamesClick(); toggleMenu(); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, x: 5 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 w-full text-left"
      onClick={onClick}
    >
      <span className="text-blue-400">{icon}</span>
      <span>{label}</span>
    </motion.button>
  )
}