"use client"

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Trophy, Medal, Star, Calendar, MapPin, Users, 
  Clock, BarChart2, Shield
} from "lucide-react"
import { teams } from "@/lib/data"

interface TeamProfileProps {
  isOpen: boolean
  onClose: () => void
  team?: any
  currentUserId?: number
}

export default function TeamProfile({ isOpen, onClose, team, currentUserId }: TeamProfileProps) {
  if (!team) return null
  
  const isCurrentUserCaptain = team.captains?.includes(currentUserId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Team Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            View your team's profile and statistics
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="history">Match History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={team.logo} />
                  <AvatarFallback>{team.name[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{team.name}</h2>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-400 ml-1">(4.2)</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Badge>Soccer</Badge>
                  <Badge>Premier League</Badge>
                  <Badge>Division 1</Badge>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Wins" value={team.wins.toString()} icon={<Trophy className="h-5 w-5 text-green-500" />} />
                  <StatCard title="Losses" value={team.losses.toString()} icon={<Shield className="h-5 w-5 text-red-500" />} />
                  <StatCard title="Draws" value={team.draws.toString()} icon={<Medal className="h-5 w-5 text-yellow-500" />} />
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
                  <h3 className="text-lg font-semibold">Team Description</h3>
                  <p className="text-gray-300">
                    A competitive soccer team founded in 2020. We focus on technical play and teamwork.
                    Currently competing in the Premier League and looking for friendly matches.
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Upcoming Matches</h3>
                  <div className="space-y-2">
                    <MatchItem 
                      opponent="City United" 
                      date="June 22, 2023" 
                      time="18:30"
                      location="City Arena"
                    />
                    <MatchItem 
                      opponent="Metro Stars" 
                      date="June 29, 2023" 
                      time="20:00"
                      location="Home Field"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roster" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.players.map(player => (
                <div 
                  key={player.id}
                  className={`p-4 rounded-lg ${player.isCaptain ? 'bg-blue-900/30' : 'bg-gray-800/30'} flex items-center justify-between`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium">{player.name}</p>
                        {player.isCaptain && (
                          <Trophy className="h-4 w-4 ml-2 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{player.position}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Team Performance</h3>
                <div className="space-y-3">
                  <PerformanceStat label="Goals Scored" value={28} maxValue={50} color="bg-green-600" />
                  <PerformanceStat label="Goals Conceded" value={12} maxValue={50} color="bg-red-600" />
                  <PerformanceStat label="Clean Sheets" value={4} maxValue={10} color="bg-blue-600" />
                  <PerformanceStat label="Possession" value={65} maxValue={100} color="bg-yellow-600" />
                  <PerformanceStat label="Pass Accuracy" value={78} maxValue={100} color="bg-purple-600" />
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">League Standing</h3>
                <div className="space-y-2">
                  <StandingItem position={1} team="City United" played={8} points={19} />
                  <StandingItem position={2} team={team.name} played={8} points={16} highlight />
                  <StandingItem position={3} team="Rival FC" played={8} points={13} />
                  <StandingItem position={4} team="Metro Stars" played={8} points={10} />
                  <StandingItem position={5} team="United FC" played={8} points={7} />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Top Performers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PerformerCard 
                  name="John Doe" 
                  stat="8 Goals" 
                  avatar="/placeholder.svg" 
                  icon={<Trophy className="h-5 w-5 text-yellow-500" />}
                />
                <PerformerCard 
                  name="Jane Smith" 
                  stat="6 Assists" 
                  avatar="/placeholder.svg" 
                  icon={<Medal className="h-5 w-5 text-blue-500" />}
                />
                <PerformerCard 
                  name="Mike Johnson" 
                  stat="5 Clean Sheets" 
                  avatar="/placeholder.svg" 
                  icon={<Shield className="h-5 w-5 text-green-500" />}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Recent Matches</h3>
              <div className="space-y-2">
                <HistoryItem 
                  result="W"
                  opponent="Rival FC"
                  score="2-1"
                  date="June 15, 2023"
                />
                <HistoryItem 
                  result="L"
                  opponent="City United"
                  score="0-2"
                  date="June 8, 2023"
                />
                <HistoryItem 
                  result="W"
                  opponent="Athletic Club"
                  score="3-0"
                  date="May 30, 2023"
                />
                <HistoryItem 
                  result="D"
                  opponent="Metro Stars"
                  score="1-1"
                  date="May 23, 2023"
                />
                <HistoryItem 
                  result="W"
                  opponent="United FC"
                  score="2-0"
                  date="May 16, 2023"
                />
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Achievements</h3>
              <div className="space-y-2">
                <AchievementItem 
                  title="League Champion" 
                  description="Won the Premier League" 
                  date="2022"
                  icon={<Trophy className="h-5 w-5 text-yellow-500" />}
                />
                <AchievementItem 
                  title="Cup Finalist" 
                  description="Reached the final of the Champions Cup" 
                  date="2021"
                  icon={<Medal className="h-5 w-5 text-silver-500" />}
                />
                <AchievementItem 
                  title="Most Improved Team" 
                  description="Awarded for exceptional progress" 
                  date="2020"
                  icon={<BarChart2 className="h-5 w-5 text-blue-500" />}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Close
          </Button>
          <Button onClick={onClose}>Edit Profile</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-medium">
      {children}
    </span>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-gray-400">{title}</h4>
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

interface MatchItemProps {
  opponent: string
  date: string
  time: string
  location: string
}

function MatchItem({ opponent, date, time, location }: MatchItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <p className="font-medium">vs {opponent}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{date}</span>
        </div>
      </div>
      <div className="flex justify-between items-center mt-1 text-sm text-gray-300">
        <div className="flex items-center space-x-2">
          <MapPin className="h-3 w-3" />
          <span>{location}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3" />
          <span>{time}</span>
        </div>
      </div>
    </div>
  )
}

interface PerformanceStatProps {
  label: string
  value: number
  maxValue: number
  color: string
}

function PerformanceStat({ label, value, maxValue, color }: PerformanceStatProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-gray-400">{value}</p>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
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

interface PerformerCardProps {
  name: string
  stat: string
  avatar: string
  icon: React.ReactNode
}

function PerformerCard({ name, stat, avatar, icon }: PerformerCardProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-4 flex items-center space-x-3">
      <Avatar>
        <AvatarImage src={avatar} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{name}</p>
        <div className="flex items-center text-sm text-gray-300">
          {icon}
          <span className="ml-1">{stat}</span>
        </div>
      </div>
    </div>
  )
}

interface HistoryItemProps {
  result: 'W' | 'L' | 'D'
  opponent: string
  score: string
  date: string
}

function HistoryItem({ result, opponent, score, date }: HistoryItemProps) {
  const bgColor = 
    result === "W" ? "bg-green-900/30" : 
    result === "L" ? "bg-red-900/30" : 
    "bg-yellow-900/30"
  
  const textColor = 
    result === "W" ? "text-green-500" : 
    result === "L" ? "text-red-500" : 
    "text-yellow-500"

  return (
    <div className={`${bgColor} rounded-lg p-3 flex justify-between items-center`}>
      <div className="flex items-center space-x-3">
        <div className={`${textColor} font-bold w-6 h-6 flex items-center justify-center rounded-full border border-current`}>
          {result}
        </div>
        <span>vs {opponent}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="font-semibold">{score}</span>
        <span className="text-sm text-gray-400">
          <Calendar className="inline-block mr-1 h-3 w-3" />
          {date}
        </span>
      </div>
    </div>
  )
}

interface AchievementItemProps {
  title: string
  description: string
  date: string
  icon: React.ReactNode
}

function AchievementItem({ title, description, date, icon }: AchievementItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3 flex items-center space-x-3">
      <div className="bg-gray-700 rounded-full p-2">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-400">
            <Calendar className="inline-block mr-1 h-3 w-3" />
            {date}
          </p>
        </div>
        <p className="text-sm text-gray-300">{description}</p>
      </div>
    </div>
  )
}