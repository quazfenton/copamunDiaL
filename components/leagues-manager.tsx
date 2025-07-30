"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, Calendar, Search, Users, Shield, 
  ChevronRight, Plus, BarChart2
} from "lucide-react"
import { leagues as mockLeagues, teams } from "@/lib/data"
import { LeagueData } from "@/lib/types";

interface LeaguesManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function LeaguesManager({ isOpen, onClose }: LeaguesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [leagues, setLeagues] = useState<LeagueData[]>(mockLeagues);
  const [selectedLeague, setSelectedLeague] = useState(leagues[0])
  const [newLeague, setNewLeague] = useState({
    name: "",
    sport: "Soccer",
    startDate: "",
    endDate: "",
    description: "",
    teams: [],
  });

  useEffect(() => {
    if (isOpen) {
      fetch("http://localhost:3001/api/leagues")
        .then((res) => res.json())
        .then((data) => {
          setLeagues(data);
          setSelectedLeague(data[0]);
        });
    }
  }, [isOpen]);

  const handleCreateLeague = () => {
    fetch("http://localhost:3001/api/leagues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newLeague),
    })
      .then((res) => res.json())
      .then((data) => {
        setLeagues([...leagues, data]);
        onClose();
      });
  };

  const filteredLeagues = leagues.filter(league => 
    league.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Leagues Manager</DialogTitle>
          <DialogDescription className="text-gray-400">
            Browse, join, and manage leagues
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="browse">Browse Leagues</TabsTrigger>
            <TabsTrigger value="my-leagues">My Leagues</TabsTrigger>
            <TabsTrigger value="create">Create League</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search leagues..."
                className="bg-gray-800/50 border-gray-700 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeagues.map(league => (
                <LeagueCard 
                  key={league.id}
                  league={league}
                  onClick={() => {
                    setSelectedLeague(league);
                    // Switch to the "My Leagues" tab
                    const trigger = document.querySelector('button[data-state="inactive"][value="my-leagues"]');
                    if (trigger) (trigger as HTMLButtonElement).click();
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-leagues" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LeagueDetailCard league={selectedLeague} />
              
              <div className="space-y-4">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Standings</h3>
                  <div className="space-y-2">
                    {selectedLeague.teams.sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws)).map((team, index) => (
                      <StandingItem 
                        key={team.id}
                        position={index + 1}
                        team={team.name}
                        played={team.wins + team.losses + team.draws}
                        points={team.wins * 3 + team.draws}
                        highlight={team.id === 1} // Highlight "Your Team"
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Upcoming Matches</h3>
                  <div className="space-y-2">
                    {selectedLeague.matches
                      .filter(match => match.status === "scheduled")
                      .map(match => (
                        <MatchItem 
                          key={match.id}
                          homeTeam={match.homeTeam.name}
                          awayTeam={match.awayTeam.name}
                          date={match.date}
                          time={match.time}
                          location={match.location}
                        />
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create New League</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">League Name</label>
                    <Input
                      className="bg-gray-800/50 border-gray-700"
                      placeholder="Enter league name"
                      value={newLeague.name}
                      onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sport</label>
                    <Input
                      className="bg-gray-800/50 border-gray-700"
                      value={newLeague.sport}
                      onChange={(e) => setNewLeague({ ...newLeague, sport: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      className="bg-gray-800/50 border-gray-700"
                      type="date"
                      value={newLeague.startDate}
                      onChange={(e) => setNewLeague({ ...newLeague, startDate: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      className="bg-gray-800/50 border-gray-700"
                      type="date"
                      value={newLeague.endDate}
                      onChange={(e) => setNewLeague({ ...newLeague, endDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full bg-gray-800/50 border-gray-700 rounded-md p-2 min-h-[100px]"
                    placeholder="Enter league description"
                    value={newLeague.description}
                    onChange={(e) => setNewLeague({ ...newLeague, description: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teams</label>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-400">Invite teams to your league</p>
                      <Button size="sm" variant="outline" className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Team
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {teams.map(team => (
                        <div 
                          key={team.id}
                          className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={team.logo} />
                              <AvatarFallback>{team.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{team.name}</span>
                          </div>
                          <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700">
                            Added
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" className="bg-gray-800/50 border-gray-700" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLeague}>
                    Create League
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface LeagueCardProps {
  league: any
  onClick: () => void
}

function LeagueCard({ league, onClick }: LeagueCardProps) {
  return (
    <div 
      className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{league.name}</h3>
          <div className="flex items-center text-sm text-gray-400 mt-1">
            <Users className="h-3 w-3 mr-1" />
            <span>{league.teams.length} Teams</span>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-900/30 border-blue-700">
          Active
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center text-gray-300">
          <Calendar className="h-3 w-3 mr-1" />
          <span>{league.startDate} - {league.endDate}</span>
        </div>
        <Button size="sm" variant="ghost" className="h-8 px-2">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface LeagueDetailCardProps {
  league: any
}

function LeagueDetailCard({ league }: { league: LeagueData }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{league.name}</h3>
        <Badge variant="outline" className="bg-blue-900/30 border-blue-700">
          Active
        </Badge>
      </div>
      
      <div className="flex items-center text-sm text-gray-300 mt-2">
        <Calendar className="h-3 w-3 mr-1" />
        <span>{league.startDate} - {league.endDate}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-4">
        <StatBox 
          icon={<Trophy className="h-4 w-4 text-yellow-500" />}
          label="Teams"
          value={league.teams.length.toString()}
        />
        <StatBox 
          icon={<Shield className="h-4 w-4 text-blue-500" />}
          label="Matches"
          value={league.matches.length.toString()}
        />
        <StatBox 
          icon={<BarChart2 className="h-4 w-4 text-green-500" />}
          label="Rounds"
          value="3"
        />
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium mb-2">Participating Teams</h4>
        <div className="flex flex-wrap gap-2">
          {league.teams.map(team => (
            <div 
              key={team.id}
              className="flex items-center space-x-1 bg-gray-800/50 rounded-full px-2 py-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={team.logo} />
                <AvatarFallback>{team.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{team.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button size="sm">View Details</Button>
      </div>
    </div>
  )
}

interface StatBoxProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatBox({ icon, label, value }: StatBoxProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2 flex flex-col items-center justify-center">
      {icon}
      <span className="text-xs text-gray-400 mt-1">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

interface StandingItemProps {
  position: number
  team: string
  played: number
  points: number
  highlight?: boolean
}

function StandingItem({ position, team, played, points, highlight }: StandingItemProps) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${highlight ? 'bg-blue-900/30' : 'bg-gray-800/20'}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-6 h-6 flex items-center justify-center rounded-full ${highlight ? 'bg-blue-700' : 'bg-gray-700'} text-sm font-medium`}>
          {position}
        </div>
        <span className={highlight ? 'font-semibold' : ''}>{team}</span>
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <div>
          <span className="text-gray-400 mr-1">P:</span>
          <span>{played}</span>
        </div>
        <div className="font-semibold">
          <span className="text-gray-400 mr-1">Pts:</span>
          <span>{points}</span>
        </div>
      </div>
    </div>
  )
}

interface MatchItemProps {
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  location: string
}

function MatchItem({ homeTeam, awayTeam, date, time, location }: MatchItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{homeTeam}</span>
          <span className="text-gray-400">vs</span>
          <span className="font-medium">{awayTeam}</span>
        </div>
        <div className="text-sm text-gray-400">
          <Calendar className="inline-block mr-1 h-3 w-3" />
          {date}
        </div>
      </div>
      <div className="flex justify-between items-center mt-1 text-sm text-gray-300">
        <div>
          <span className="text-gray-400 mr-1">Time:</span>
          {time}
        </div>
        <div>
          <span className="text-gray-400 mr-1">Location:</span>
          {location}
        </div>
      </div>
    </div>
  )
}
