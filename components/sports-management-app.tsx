"use client"

import { useState } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import TeamLineup from "@/components/team-lineup"
import SportSelector from "@/components/sport-selector"
import FormationSelector from "@/components/formation-selector"
import Navbar from "@/components/navbar"
import OptionsMenu from "@/components/options-menu"
import SideMenu from "@/components/side-menu"
import TeamManagement from "@/components/team-management"
import PlayerInvite from "@/components/player-invite"
import Profile from "@/components/profile"
import MatchScheduling from "@/components/match-scheduling"
import MatchFinder from "@/components/match-finder"
import TeamProfile from "@/components/team-profile"
import LeaguesManager from "@/components/leagues-manager"
import CalendarView from "@/components/calendar-view"
import PickupGames from "@/components/pickup-games"
import { players } from "@/lib/data"

const sports = ["Soccer", "Basketball", "American Football", "Baseball"]
const formations = {
  Soccer: ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"],
  Basketball: ["1-2-2", "2-3", "3-2"],
  "American Football": ["4-3", "3-4", "Nickel"],
  Baseball: ["Standard", "Shift", "Infield In"],
}

export default function SportsManagementApp() {
  const [selectedSport, setSelectedSport] = useState(sports[0])
  const [selectedFormation, setSelectedFormation] = useState(formations[selectedSport][0])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentTeam, setCurrentTeam] = useState("Your Team")
  
  // Dialog states
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false)
  const [isPlayerInviteOpen, setIsPlayerInviteOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMatchSchedulingOpen, setIsMatchSchedulingOpen] = useState(false)
  const [isMatchFinderOpen, setIsMatchFinderOpen] = useState(false)
  const [isTeamProfileOpen, setIsTeamProfileOpen] = useState(false)
  const [isLeaguesOpen, setIsLeaguesOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isPickupGamesOpen, setIsPickupGamesOpen] = useState(false)

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setSelectedFormation(formations[sport][0])
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-4 py-8">
        <Navbar onMenuClick={() => setIsMenuOpen(!isMenuOpen)} />
        
        <SideMenu 
          onMyTeamClick={() => setIsTeamManagementOpen(true)}
          onFindMatchClick={() => setIsMatchFinderOpen(true)}
          onScheduleClick={() => setIsMatchSchedulingOpen(true)}
          onInvitePlayerClick={() => setIsPlayerInviteOpen(true)}
          onProfileClick={() => setIsProfileOpen(true)}
          onTeamProfileClick={() => setIsTeamProfileOpen(true)}
          onLeaguesClick={() => setIsLeaguesOpen(true)}
          onCalendarClick={() => setIsCalendarOpen(true)}
          onPickupGamesClick={() => setIsPickupGamesOpen(true)}
          onHomeClick={() => {
            // Reset to home view
            setIsMenuOpen(false)
          }}
        />
        
        <div className="mb-8 flex justify-between items-center">
          <div>
            <SportSelector 
              sports={sports} 
              selectedSport={selectedSport} 
              onSelectSport={handleSportChange} 
            />
            <FormationSelector
              formations={formations[selectedSport]}
              selectedFormation={selectedFormation}
              onSelectFormation={setSelectedFormation}
            />
          </div>
          <OptionsMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
        
        <TeamLineup sport={selectedSport} formation={selectedFormation} />
        
        {/* Dialogs */}
        <TeamManagement
          isOpen={isTeamManagementOpen}
          onClose={() => setIsTeamManagementOpen(false)}
          currentTeam={currentTeam}
          players={players}
        />
        
        <PlayerInvite
          isOpen={isPlayerInviteOpen}
          onClose={() => setIsPlayerInviteOpen(false)}
        />
        
        <Profile
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
        
        <MatchScheduling
          isOpen={isMatchSchedulingOpen}
          onClose={() => setIsMatchSchedulingOpen(false)}
        />
        
        <MatchFinder
          isOpen={isMatchFinderOpen}
          onClose={() => setIsMatchFinderOpen(false)}
        />
        
        <TeamProfile
          isOpen={isTeamProfileOpen}
          onClose={() => setIsTeamProfileOpen(false)}
        />
        
        <LeaguesManager
          isOpen={isLeaguesOpen}
          onClose={() => setIsLeaguesOpen(false)}
        />
        
        <CalendarView
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
        />
        
        <PickupGames
          isOpen={isPickupGamesOpen}
          onClose={() => setIsPickupGamesOpen(false)}
        />
      </div>
      
      <Toaster />
      <Sonner />
    </DndProvider>
  )
}