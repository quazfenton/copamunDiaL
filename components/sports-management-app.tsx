"use client"

import { useState, useEffect, useMemo } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { SessionProvider, useSession, signIn } from "next-auth/react"
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
import { Loader2, MessageCircle, Users, Settings, UserPlus } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useSocket, useTeamSocket, useNotifications, useUserPresence } from "@/hooks/use-socket"
import { Player, TeamData, Notification } from "@/lib/types"
import LoginForm from "@/components/auth/login-form"
import RegisterForm from "@/components/auth/register-form"
import FormationBuilder from "@/components/formation-builder"
import NotificationCenter from "@/components/notification-center"
import FriendsList from "@/components/friends-list"
import FriendRequests from "@/components/friend-requests"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const sports = ["Soccer", "Basketball", "American Football", "Baseball"]
const formations = {
  Soccer: ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"],
  Basketball: ["1-2-2", "2-3", "3-2"],
  "American Football": ["4-3", "3-4", "Nickel"],
  Baseball: ["Standard", "Shift", "Infield In"],
}

function SportsManagementAppContent() {
  const { data: session, status } = useSession();
  const [selectedSport, setSelectedSport] = useState(sports[0])
  const [selectedFormation, setSelectedFormation] = useState(formations[selectedSport][0])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [isFormationBuilderOpen, setIsFormationBuilderOpen] = useState(false)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isFriendsDialogOpen, setIsFriendsDialogOpen] = useState(false);
  
  // Data state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [pickupGames, setPickupGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current user and team state
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [userTeams, setUserTeams] = useState<TeamData[]>([]);
  
  // Current team data
  const currentTeam = teams.find(team => team.id === currentTeamId);
  
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Player interaction state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  
  // Notification state
  const { notifications, setNotifications: setSocketNotifications } = useNotifications();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const unreadNotificationsCount = useMemo(() => 
    allNotifications.filter(n => !n.isRead).length
  , [allNotifications]);

  const pendingNotificationsForPopups = useMemo(() => 
    allNotifications.filter(n => !n.isRead && n.status === 'pending')
  , [allNotifications]);

  useEffect(() => {
    if (status === "authenticated") {
      setCurrentUserId(session.user.id);
      fetchData();
    }
  }, [status, session]);

  useEffect(() => {
    setAllNotifications(prev => [...notifications, ...prev]);
  }, [notifications]);

  const handleSaveFormation = (formationName: string, playerPositions: any) => {
    console.log("Saving formation:", formationName, playerPositions);
    // Here you would typically make an API call to save the formation to your backend
    // For example: apiClient.saveFormation({ name: formationName, positions: playerPositions });
    // After successful save, you might want to refetch formations or update local state
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead(); // Assuming this API call exists
      setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [playersRes, teamsRes, matchesRes, leaguesRes, pickupGamesRes, notificationsRes] = await Promise.all([
        apiClient.getPlayers(),
        apiClient.getTeams(),
        apiClient.getMatches(),
        apiClient.getLeagues(),
        apiClient.getPickupGames(),
        apiClient.getNotifications(),
      ]);
      setPlayers(playersRes.data);
      setTeams(teamsRes);
      setMatches(matchesRes.data);
      setLeagues(leaguesRes.data);
      setPickupGames(pickupGamesRes);
      setAllNotifications(notificationsRes);

      if (session?.user?.id) {
        const user = playersRes.data.find(p => p.id === session.user.id);
        if (user) {
          const userTeams = teamsRes.filter(team => user.teams.includes(team.id));
          setUserTeams(userTeams);
          if (userTeams.length > 0) {
            setCurrentTeamId(userTeams[0].id);
          }
        }
      }

    } catch (err) {
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setSelectedFormation(formations[selectedSport][0])
  }

  const handlePlayerMove = (result: any) => {
    console.log("Player moved:", result)
    // Handle player movement logic here
  }

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
    setIsProfileOpen(true)
  }

  const handleNotificationAccept = async (notificationId: number) => {
    await apiClient.respondToTeamInvite(notificationId.toString(), 'ACCEPTED');
    fetchData();
  }

  const handleNotificationDecline = async (notificationId: number) => {
    await apiClient.respondToTeamInvite(notificationId.toString(), 'DECLINED');
    fetchData();
  }

  const handleNotificationDismiss = async (notificationId: number) => {
    await apiClient.markNotificationRead(notificationId.toString());
    fetchData();
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        {showRegisterForm ? (
          <RegisterForm onSwitchToLogin={() => setShowRegisterForm(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegisterForm(true)} />
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-red-900/50 text-white border-red-700">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={fetchData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
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
          onNotificationsClick={() => setIsNotificationCenterOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
          onBuildFormationClick={() => setIsFormationBuilderOpen(true)}
          onFriendsClick={() => setIsFriendsDialogOpen(true)}
        />
        
        {/* Main Content Area - This will now be the pitch */}
        {currentTeam && (
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
                      value={currentTeamId || ''} 
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
                <SportField
                  sport={selectedSport}
                  formation={selectedFormation}
                  players={currentTeam.players.map(pId => players.find(p => p.id === pId)).filter(Boolean) as Player[]}
                  reserves={currentTeam.reserves.map(pId => players.find(p => p.id === pId)).filter(Boolean) as Player[]}
                  onPlayerMove={handlePlayerMove}
                  onPlayerClick={handlePlayerClick}
                  currentUserId={currentUserId}
                  teamCaptains={currentTeam.captains}
                />
              </div>
            </div> {/* End of main content div */}
          </div>
        )}
        
        {/* Dialogs - These should appear on top of the pitch */}
        {currentTeam && (
          <TeamManagement
            isOpen={isTeamManagementOpen}
            onClose={() => setIsTeamManagementOpen(false)}
            currentTeam={currentTeam}
            players={players}
          />
        )}
        
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
        
        {currentTeam && (
          <MatchFinder
            isOpen={isMatchFinderOpen}
            onClose={() => setIsMatchFinderOpen(false)}
            currentTeam={currentTeam}
          />
        )}
        
        {currentTeam && (
          <TeamProfile
            isOpen={isTeamProfileOpen}
            onClose={() => setIsTeamProfileOpen(false)}
            team={currentTeam}
            currentUserId={currentUserId}
          />
        )}
        
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
        
        {/* Notification System (for temporary pop-ups) */}
        <NotificationSystem
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={pendingNotificationsForPopups}
          onAccept={handleNotificationAccept}
          onDecline={handleNotificationDecline}
          onDismiss={handleNotificationDismiss}
        />

        {/* Notification Center (for full view) */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          notifications={allNotifications}
          onAccept={handleNotificationAccept}
          onDecline={handleNotificationDecline}
          onDismiss={handleNotificationDismiss}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />

        <FormationBuilder
          isOpen={isFormationBuilderOpen}
          onClose={() => setIsFormationBuilderOpen(false)}
          currentFormation={selectedFormation}
          players={players} // Pass all available players for the builder
          onSaveFormation={handleSaveFormation}
          sport={selectedSport}
        />

        {/* Friends Dialog */}
        <Dialog open={isFriendsDialogOpen} onOpenChange={setIsFriendsDialogOpen}>
          <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-2xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Friends & Requests</DialogTitle>
              <DialogDescription>Manage your friends and pending requests.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="friends" className="mt-4 flex-grow flex flex-col">
              <TabsList className="bg-gray-800/50 mb-4">
                <TabsTrigger value="friends">My Friends</TabsTrigger>
                <TabsTrigger value="requests">Friend Requests</TabsTrigger>
              </TabsList>
              <TabsContent value="friends" className="flex-grow overflow-y-auto pr-4">
                {currentUserId && <FriendsList currentUserId={currentUserId} />}
              </TabsContent>
              <TabsContent value="requests" className="flex-grow overflow-y-auto pr-4">
                {currentUserId && <FriendRequests currentUserId={currentUserId} />}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      <Toaster />
      <Sonner />
    </DndProvider>
  )
}

export default function SportsManagementApp() {
  return (
    <SessionProvider>
      <SportsManagementAppContent />
    </SessionProvider>
  )
}