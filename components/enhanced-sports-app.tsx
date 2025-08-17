"use client"

import { useState, useEffect } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import { SportField } from "@/components/sport-field"
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
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle, Users, Settings, LogOut, Wifi, WifiOff } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useSocket, useTeamSocket, useNotifications, useUserPresence } from "@/hooks/use-socket"
import { Player, TeamData, Notification } from "@/lib/types"

const sports = ["Soccer", "Basketball", "American Football", "Baseball"]
const formations = {
  "Soccer": ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"],
  "Basketball": ["1-2-2", "2-3", "1-3-1"],
  "American Football": ["4-3-4", "3-4-4", "4-2-5"],
  "Baseball": ["Standard", "Shift Left", "Shift Right"]
}

function SportsManagementAppContent() {
  const { data: session, status } = useSession()
  const [selectedSport, setSelectedSport] = useState("Soccer")
  const [selectedFormation, setSelectedFormation] = useState("4-4-2")
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
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
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false)
  
  // Data states
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Real-time hooks
  const { socket, isConnected } = useSocket()
  const { notifications } = useNotifications()
  const { onlineUsers, isUserOnline } = useUserPresence()

  const currentUserId = session?.user?.id

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return

      try {
        setLoading(true)
        const [playersData, teamsData] = await Promise.all([
          apiClient.getPlayers(),
          apiClient.getTeams({ userTeamsOnly: true })
        ])
        
        setPlayers(playersData)
        setTeams(teamsData)
        
        if (teamsData.length > 0) {
          setSelectedTeam(teamsData[0])
        }
      } catch (err) {
        setError('Failed to load data')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id])

  // Handle sport change
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setSelectedFormation(formations[sport as keyof typeof formations][0])
  }

  // Handle formation change with real-time update
  const handleFormationChange = (formation: string) => {
    setSelectedFormation(formation)
    
    // Update formation in real-time if team is selected
    if (selectedTeam && socket) {
      socket.emit('formation-update', {
        teamId: selectedTeam.id,
        formation,
        players: selectedTeam.players
      })
    }
  }

  // Handle player interactions
  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
    setIsProfileOpen(true)
  }

  const handlePlayerMove = (result: any) => {
    console.log("Player moved:", result)
    // Handle player movement logic here
  }

  // Handle notifications
  const handleNotificationAccept = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}`, { 
        status: 'ACCEPTED',
        isRead: true 
      })
    } catch (error) {
      console.error('Error accepting notification:', error)
    }
  }

  const handleNotificationDecline = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}`, { 
        status: 'DECLINED',
        isRead: true 
      })
    } catch (error) {
      console.error('Error declining notification:', error)
    }
  }

  // Authentication loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  // Authentication required
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/90 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Welcome to PlayMate</CardTitle>
            <CardDescription className="text-gray-400">
              Please sign in to access your sports management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => signIn('google')} 
              className="w-full"
              variant="outline"
            >
              Sign in with Google
            </Button>
            <Button 
              onClick={() => signIn()} 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Data loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">Loading your teams and players...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/90 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-red-400">Error</CardTitle>
            <CardDescription className="text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header */}
        <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">PlayMate</h1>
              {selectedTeam && (
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {selectedTeam.name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Team Chat Button */}
              {selectedTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTeamChatOpen(true)}
                  className="relative"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Team Chat
                </Button>
              )}

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex">
          {/* Side Menu */}
          <SideMenu
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen(!isMenuOpen)}
            onTeamManagement={() => setIsTeamManagementOpen(true)}
            onPlayerInvite={() => setIsPlayerInviteOpen(true)}
            onProfile={() => setIsProfileOpen(true)}
            onMatchScheduling={() => setIsMatchSchedulingOpen(true)}
            onMatchFinder={() => setIsMatchFinderOpen(true)}
            onTeamProfile={() => setIsTeamProfileOpen(true)}
            onLeagues={() => setIsLeaguesOpen(true)}
            onCalendar={() => setIsCalendarOpen(true)}
            onPickupGames={() => setIsPickupGamesOpen(true)}
            userTeams={teams}
            currentTeamId={selectedTeam?.id || ''}
            onTeamChange={(teamId) => {
              const team = teams.find(t => t.id === teamId)
              if (team) setSelectedTeam(team)
            }}
          />

          {/* Main Field Area */}
          <div className="flex-1 p-6">
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-wrap gap-4">
                <SportSelector
                  sports={sports}
                  selectedSport={selectedSport}
                  onSportChange={handleSportChange}
                />
                <FormationSelector
                  formations={formations[selectedSport as keyof typeof formations]}
                  selectedFormation={selectedFormation}
                  onFormationChange={handleFormationChange}
                />
              </div>

              {/* Field */}
              {selectedTeam ? (
                <SportField
                  sport={selectedSport}
                  formation={selectedFormation}
                  players={selectedTeam.players}
                  reserves={selectedTeam.reserves}
                  onPlayerMove={handlePlayerMove}
                  onPlayerClick={handlePlayerClick}
                  // currentUserId and teamCaptains are not directly available here, 
                  // but should be passed if SportField needs them for drag-and-drop permissions
                  // For now, assuming SportField handles permissions internally or they are not critical here
                />
              ) : (
                <Card className="bg-black/50 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-semibold mb-2">No Team Selected</h3>
                    <p className="text-gray-400 mb-4">
                      Create or join a team to start managing your lineup
                    </p>
                    <Button onClick={() => setIsTeamManagementOpen(true)}>
                      Create Team
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Notification System */}
        <NotificationSystem
          notifications={notifications}
          onAccept={handleNotificationAccept}
          onDecline={handleNotificationDecline}
        />

        {/* Dialogs */}
        <TeamManagement
          isOpen={isTeamManagementOpen}
          onClose={() => setIsTeamManagementOpen(false)}
          teams={teams}
          players={players}
          currentUserId={currentUserId || ''}
        />

        <PlayerInvite
          isOpen={isPlayerInviteOpen}
          onClose={() => setIsPlayerInviteOpen(false)}
          availablePlayers={players}
          currentTeam={selectedTeam}
          currentUserId={currentUserId || ''}
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
          teams={teams}
          currentTeam={selectedTeam}
        />

        <MatchFinder
          isOpen={isMatchFinderOpen}
          onClose={() => setIsMatchFinderOpen(false)}
          teams={teams}
          currentTeam={selectedTeam}
        />

        <TeamProfile
          isOpen={isTeamProfileOpen}
          onClose={() => setIsTeamProfileOpen(false)}
          team={selectedTeam}
          currentUserId={currentUserId || ''}
        />

        <LeaguesManager
          isOpen={isLeaguesOpen}
          onClose={() => setIsLeaguesOpen(false)}
          teams={teams}
          currentUserId={currentUserId || ''}
        />

        <CalendarView
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          teams={teams}
        />

        <PickupGames
          isOpen={isPickupGamesOpen}
          onClose={() => setIsPickupGamesOpen(false)}
          currentUserId={currentUserId || ''}
        />

        {/* Team Chat */}
        {selectedTeam && (
          <TeamChat
            teamId={selectedTeam.id}
            currentUserId={currentUserId || ''}
            isOpen={isTeamChatOpen}
            onClose={() => setIsTeamChatOpen(false)}
          />
        )}

        <Toaster />
        <Sonner />
      </div>
    </DndProvider>
  )
}

export default function EnhancedSportsApp() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <SportsManagementAppContent />
      </SessionProvider>
    </ErrorBoundary>
  )
}