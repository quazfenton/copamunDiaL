"use client"

import { useState, useEffect } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { SessionProvider, useSession } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import { SoccerField } from "@/components/soccer-field"
import SportSelector from "@/components/sport-selector"
import FormationSelector from "@/components/formation-selector"
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
import NotificationSystem from "@/components/notification-system"
import TeamChat from "@/components/team-chat"
import { ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageCircle, Users, Settings } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useSocket, useTeamSocket, useNotifications, useUserPresence } from "@/hooks/use-socket"
import { Player, TeamData, Notification } from "@/lib/types"

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
  
  // Current user and team state
  const [currentUserId] = useState(1) // John Doe
  const [currentTeamId, setCurrentTeamId] = useState(1)
  const [userTeams, setUserTeams] = useState<TeamData[]>(teams.filter(team => 
    players.find(p => p.id === currentUserId)?.teams.includes(team.id)
  ))
  
  // Current team data
  const currentTeam = teams.find(team => team.id === currentTeamId) || teams[0]
  
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
  
  // Player interaction state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications)

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setSelectedFormation(formations[sport][0])
  }

  const handlePlayerMove = (result: any) => {
    console.log("Player moved:", result)
    // Handle player movement logic here
  }

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
    setIsProfileOpen(true)
  }

  const handleNotificationAccept = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status: 'accepted' as const, isRead: true } : n)
    )
  }

  const handleNotificationDecline = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status: 'declined' as const, isRead: true } : n)
    )
  }

  const handleNotificationDismiss = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        {/* Side Menu - Always visible on the left */}
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
        
        {/* Main Content Area - This will now be the pitch */}
        <div className="pl-16 flex min-h-screen"> {/* Padding for SideMenu, flex for layout */}
          {/* Soccer Field as the background */}
          <div className="flex-1 relative"> {/* Allows SoccerField to expand */}
            {/* Team Name Header */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-white mb-2">
                {currentTeam.name}
              </h1>
              <p className="text-white/80">{currentTeam.bio}</p>
              
              {/* Team Selection Dropdown if user has multiple teams */}
              {userTeams.length > 1 && (
                <div className="mt-4">
                  <select 
                    value={currentTeamId} 
                    onChange={(e) => setCurrentTeamId(parseInt(e.target.value))}
                    className="bg-black/50 text-white border border-white/20 rounded px-3 py-2"
                  >
                    {userTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Formation Controls - Positioned absolutely to overlay the pitch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 mb-8 flex justify-center items-center space-x-4">
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
            
            {/* Soccer Field - This component will now act as the primary background */}
            <div className="w-full h-full absolute inset-0 z-0"> {/* Ensure it covers the area */}
              <SoccerField
                formation={selectedFormation}
                players={currentTeam.players}
                reserves={currentTeam.reserves}
                onPlayerMove={handlePlayerMove}
                onPlayerClick={handlePlayerClick}
                currentUserId={currentUserId}
                teamCaptains={currentTeam.captains}
              />
            </div>
          </div> {/* End of main content div */}
        </div> {/* End of main content wrapper */}
        
        {/* Dialogs - These should appear on top of the pitch */}
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
          player={selectedPlayer}
          currentUserId={currentUserId}
        />
        
        <MatchScheduling
          isOpen={isMatchSchedulingOpen}
          onClose={() => setIsMatchSchedulingOpen(false)}
        />
        
        <MatchFinder
          isOpen={isMatchFinderOpen}
          onClose={() => setIsMatchFinderOpen(false)}
          currentTeam={currentTeam}
        />
        
        <TeamProfile
          isOpen={isTeamProfileOpen}
          onClose={() => setIsTeamProfileOpen(false)}
          team={currentTeam}
          currentUserId={currentUserId}
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
        
        {/* Notification System */}
        <NotificationSystem
          notifications={notifications}
          onAccept={handleNotificationAccept}
          onDecline={handleNotificationDecline}
          onDismiss={handleNotificationDismiss}
        />
      </div>
      
      <Toaster />
      <Sonner />
    </DndProvider>
  )
}
