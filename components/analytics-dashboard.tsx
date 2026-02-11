"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts"
import { 
  TrendingUp, TrendingDown, Target, Trophy, Users, Calendar,
  Activity, Zap, Award, Star, Clock, MapPin
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Player, TeamData, MatchData } from "@/lib/types"

interface AnalyticsDashboardProps {
  players: Player[]
  teams: TeamData[]
  matches: MatchData[]
  currentUserId?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Performance trend data (mock - would come from API)
const generatePerformanceTrend = (playerId: string) => {
  return Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    goals: Math.floor(Math.random() * 5),
    assists: Math.floor(Math.random() * 4),
    rating: (6 + Math.random() * 4).toFixed(1),
    matches: Math.floor(Math.random() * 4) + 1,
  }))
}

// Radar chart data for player skills
const generateSkillsData = (player: Player) => {
  return [
    { skill: 'Pace', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
    { skill: 'Shooting', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
    { skill: 'Passing', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
    { skill: 'Dribbling', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
    { skill: 'Defense', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
    { skill: 'Physical', value: Math.floor(60 + Math.random() * 40), fullMark: 100 },
  ]
}

export function AnalyticsDashboard({ players, teams, matches, currentUserId }: AnalyticsDashboardProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'season' | 'all'>('month')

  // Find current user's player profile
  const currentPlayer = useMemo(() => 
    players.find(p => p.id === currentUserId) || players[0],
    [players, currentUserId]
  )

  useEffect(() => {
    if (currentPlayer) {
      setSelectedPlayer(currentPlayer)
    }
    if (teams.length > 0) {
      setSelectedTeam(teams[0])
    }
  }, [currentPlayer, teams])

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    const totalMatches = matches.length
    const completedMatches = matches.filter(m => m.status === 'COMPLETED').length
    const totalGoals = players.reduce((sum, p) => sum + (p.stats?.goals || 0), 0)
    const totalAssists = players.reduce((sum, p) => sum + (p.stats?.assists || 0), 0)
    const avgRating = players.length > 0
      ? players.reduce((sum, p) => sum + (p.stats?.rating || 0), 0) / players.length
      : 0
    
    return { totalMatches, completedMatches, totalGoals, totalAssists, avgRating }
  }, [matches, players])

  // Team comparison data
  const teamComparisonData = useMemo(() => {
    return teams.slice(0, 6).map(team => ({
      name: team.name.slice(0, 10),
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      rating: team.rating || 0,
      players: team.players.length,
    }))
  }, [teams])

  // Position distribution for pie chart
  const positionDistribution = useMemo(() => {
    const positions: Record<string, number> = {}
    players.forEach(p => {
      const pos = p.position || 'Unknown'
      positions[pos] = (positions[pos] || 0) + 1
    })
    return Object.entries(positions).map(([name, value]) => ({ name, value }))
  }, [players])

  const performanceTrend = selectedPlayer ? generatePerformanceTrend(selectedPlayer.id) : []
  const skillsData = selectedPlayer ? generateSkillsData(selectedPlayer) : []

  return (
    <div className="space-y-6 p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                  <p className="text-2xl font-bold">{aggregateStats.totalMatches}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Goals</p>
                  <p className="text-2xl font-bold">{aggregateStats.totalGoals}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+8% from last month</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Players</p>
                  <p className="text-2xl font-bold">{players.length}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-purple-500">
                <Activity className="h-3 w-3 mr-1" />
                <span>{players.filter(p => p.isOnline).length} online now</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{aggregateStats.avgRating.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-full">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <div className="mt-2">
                <Progress value={aggregateStats.avgRating * 10} className="h-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-4 w-auto">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>
          
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="season">This Season</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Trend
                </CardTitle>
                <CardDescription>Goals and assists over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceTrend}>
                      <defs>
                        <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAssists" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="goals" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorGoals)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="assists" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorAssists)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Skills Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Player Skills
                </CardTitle>
                <CardDescription>
                  {selectedPlayer?.name || 'Select a player'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={skillsData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="skill" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                      <Radar
                        name="Skills"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Rating History</CardTitle>
              <CardDescription>Match rating progression</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis domain={[5, 10]} className="text-xs" />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Team Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Team Performance
                </CardTitle>
                <CardDescription>Win/Loss/Draw comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="wins" fill="#10b981" name="Wins" />
                      <Bar dataKey="draws" fill="#f59e0b" name="Draws" />
                      <Bar dataKey="losses" fill="#ef4444" name="Losses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Team Ratings */}
            <Card>
              <CardHeader>
                <CardTitle>Team Ratings</CardTitle>
                <CardDescription>Overall team performance scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.slice(0, 5).map((team, index) => (
                    <div key={team.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{team.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {(team.rating || 0).toFixed(1)}
                          </span>
                        </div>
                        <Progress value={(team.rating || 0) * 10} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Position Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Position Distribution</CardTitle>
                <CardDescription>Player positions breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={positionDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {positionDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Scorers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Leading goal scorers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players
                    .toSorted((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
                    .slice(0, 5)
                    .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {player.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{player.stats?.goals || 0}</p>
                          <p className="text-xs text-muted-foreground">goals</p>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-base">Performance Insight</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your team's performance has improved by <span className="text-green-500 font-semibold">23%</span> over the last month. 
                    Key contributors: stronger midfield possession and improved set-piece conversion rate.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending Up
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Target className="h-4 w-4 text-amber-500" />
                    </div>
                    <CardTitle className="text-base">Formation Suggestion</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Based on your squad's strengths, consider switching to a <span className="text-amber-500 font-semibold">4-3-3</span> formation. 
                    This would better utilize your wing players' pace and crossing ability.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="text-xs">
                      Apply Suggestion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Users className="h-4 w-4 text-green-500" />
                    </div>
                    <CardTitle className="text-base">Player Recommendation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your team lacks depth in <span className="text-green-500 font-semibold">defensive midfield</span>. 
                    Consider inviting players with high tackling and interception stats.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="text-xs">
                      Find Players
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-500" />
                    </div>
                    <CardTitle className="text-base">Schedule Optimization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your team plays best on <span className="text-purple-500 font-semibold">weekend afternoons</span>. 
                    Win rate: 78% vs 45% for weekday evening games.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Best: Saturday 2-4 PM
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full bg-gradient-to-br from-red-500/5 to-rose-500/5 border-red-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Activity className="h-4 w-4 text-red-500" />
                    </div>
                    <CardTitle className="text-base">Fitness Alert</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-red-500 font-semibold">3 players</span> have played 4+ matches in the last 2 weeks. 
                    Consider rotating to prevent fatigue-related injuries.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Workload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <MapPin className="h-4 w-4 text-cyan-500" />
                    </div>
                    <CardTitle className="text-base">Venue Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Home advantage is <span className="text-cyan-500 font-semibold">significant</span> for your team. 
                    Win rate: 82% home vs 58% away. Focus on securing home fixtures.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      +24% Home Advantage
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AnalyticsDashboard
