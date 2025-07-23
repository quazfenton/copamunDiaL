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
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ width: "4rem" }}
      animate={{ width: isExpanded ? "16rem" : "4rem" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 left-0 h-full bg-black/90 backdrop-blur-md z-40 text-white shadow-xl border-r border-white/10"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col h-full py-4">
        {/* Logo/Header */}
        <div className="px-4 mb-8 flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="ml-3 font-bold text-lg whitespace-nowrap"
              >
                CopaApp
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        {/* Menu Items */}
        <div className="flex flex-col space-y-1 px-2 flex-1">
          <MenuItem 
            icon={<Home />} 
            label="Home" 
            onClick={onHomeClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<Users />} 
            label="My Team" 
            onClick={onMyTeamClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<Search />} 
            label="Find Match" 
            onClick={onFindMatchClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<Calendar />} 
            label="Schedule" 
            onClick={onScheduleClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<UserPlus />} 
            label="Invite Player" 
            onClick={onInvitePlayerClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<User />} 
            label="Profile" 
            onClick={onProfileClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<Trophy />} 
            label="Team Profile" 
            onClick={onTeamProfileClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<BarChart2 />} 
            label="Leagues" 
            onClick={onLeaguesClick}
            isExpanded={isExpanded}
          />
          <MenuItem 
            icon={<MapPin />} 
            label="Pickup Games" 
            onClick={onPickupGamesClick}
            isExpanded={isExpanded}
          />
        </div>
      </div>
    </motion.div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isExpanded: boolean
}

function MenuItem({ icon, label, onClick, isExpanded }: MenuItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center w-full p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 group"
      onClick={onClick}
      title={!isExpanded ? label : undefined}
    >
      <div className="w-6 h-6 flex items-center justify-center text-blue-400 group-hover:text-blue-300">
        {icon}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="ml-3 whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}