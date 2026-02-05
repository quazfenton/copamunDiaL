"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, Calendar as CalendarIcon, MapPin, Users, Plus, 
  ChevronRight, Medal, Crown, Swords, Timer, CheckCircle2
} from "lucide-react"

// Types
interface Team {
  id: string
  name: string
  logo?: string
  seed?: number
}

interface BracketMatch {
  id: string
  round: number
  matchNumber: number
  homeTeam?: Team
  awayTeam?: Team
  homeScore?: number
  awayScore?: number
  winnerId?: string
  status: 'PENDING' | 'SCHEDULED' | 'LIVE' | 'COMPLETED'
  scheduledAt?: string
  nextMatchId?: string
}

interface Tournament {
  id: string
  name: string
  description?: string
  sport: string
  bracketType: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS'
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED'
  maxTeams: number
  startDate: string
  endDate?: string
  registrationEnd?: string
  prizeInfo?: string
  rules?: string
  location?: string
  entryFee?: number
  teams: Team[]
  matches: BracketMatch[]
}

interface TournamentBracketProps {
  tournament?: Tournament
  onCreateTournament?: (data: Partial<Tournament>) => void
  onUpdateMatch?: (matchId: string, data: Partial<BracketMatch>) => void
  onRegisterTeam?: (tournamentId: string, teamId: string) => void
  isOrganizer?: boolean
}

// Generate bracket structure for single elimination
function generateSingleEliminationBracket(teams: Team[]): BracketMatch[] {
  const matches: BracketMatch[] = []
  const numTeams = teams.length
  const numRounds = Math.ceil(Math.log2(numTeams))
  const firstRoundMatches = Math.pow(2, numRounds - 1)
  
  let matchNumber = 1
  
  // First round
  for (let i = 0; i < firstRoundMatches; i++) {
    const homeTeamIndex = i * 2
    const awayTeamIndex = i * 2 + 1
    
    matches.push({
      id: `match-1-${i + 1}`,
      round: 1,
      matchNumber: matchNumber++,
      homeTeam: teams[homeTeamIndex],
      awayTeam: teams[awayTeamIndex],
      status: 'PENDING',
    })
  }
  
  // Subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - round)
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `match-${round}-${i + 1}`,
        round,
        matchNumber: matchNumber++,
        status: 'PENDING',
      })
    }
  }
  
  return matches
}

// Match Card Component
function MatchCard({ 
  match, 
  isOrganizer, 
  onUpdate 
}: { 
  match: BracketMatch
  isOrganizer?: boolean
  onUpdate?: (data: Partial<BracketMatch>) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() || '')
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() || '')

  const handleSaveScore = () => {
    const home = parseInt(homeScore) || 0
    const away = parseInt(awayScore) || 0
    const winnerId = home > away ? match.homeTeam?.id : home < away ? match.awayTeam?.id : undefined
    
    onUpdate?.({
      homeScore: home,
      awayScore: away,
      winnerId,
      status: 'COMPLETED'
    })
    setIsEditing(false)
  }

  const getStatusColor = () => {
    switch (match.status) {
      case 'LIVE': return 'bg-red-500'
      case 'COMPLETED': return 'bg-green-500'
      case 'SCHEDULED': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className={cn(
        "w-48 transition-all duration-200 hover:shadow-lg",
        match.status === 'LIVE' && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
      )}>
        <CardContent className="p-3">
          {/* Status indicator */}
          <div className="absolute -top-1 -right-1">
            <span className={cn("w-3 h-3 rounded-full block", getStatusColor())} />
          </div>

          {/* Match number */}
          <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
            <span>Match {match.matchNumber}</span>
            {match.status === 'LIVE' && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                LIVE
              </Badge>
            )}
          </div>

          {/* Teams */}
          <div className="space-y-2">
            {/* Home Team */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded-md transition-colors",
              match.winnerId === match.homeTeam?.id 
                ? "bg-green-500/20 border border-green-500/50" 
                : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2">
                {match.homeTeam?.seed && (
                  <span className="text-[10px] text-muted-foreground w-4">
                    #{match.homeTeam.seed}
                  </span>
                )}
                <span className="text-sm font-medium truncate max-w-24">
                  {match.homeTeam?.name || 'TBD'}
                </span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-12 h-6 text-center text-sm p-1"
                />
              ) : (
                <span className="font-bold text-lg min-w-6 text-center">
                  {match.homeScore ?? '-'}
                </span>
              )}
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">vs</span>
            </div>

            {/* Away Team */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded-md transition-colors",
              match.winnerId === match.awayTeam?.id 
                ? "bg-green-500/20 border border-green-500/50" 
                : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2">
                {match.awayTeam?.seed && (
                  <span className="text-[10px] text-muted-foreground w-4">
                    #{match.awayTeam.seed}
                  </span>
                )}
                <span className="text-sm font-medium truncate max-w-24">
                  {match.awayTeam?.name || 'TBD'}
                </span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-12 h-6 text-center text-sm p-1"
                />
              ) : (
                <span className="font-bold text-lg min-w-6 text-center">
                  {match.awayScore ?? '-'}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isOrganizer && match.homeTeam && match.awayTeam && (
            <div className="mt-2 flex justify-end">
              {isEditing ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSaveScore}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  Update Score
                </Button>
              )}
            </div>
          )}

          {/* Schedule info */}
          {match.scheduledAt && (
            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(match.scheduledAt), 'MMM d, h:mm a')}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Round Label Component
function RoundLabel({ round, totalRounds }: { round: number; totalRounds: number }) {
  const labels: Record<number, string> = {
    1: 'Round of ' + Math.pow(2, totalRounds),
  }
  
  if (round === totalRounds) return <span className="flex items-center gap-1"><Crown className="h-4 w-4 text-yellow-500" /> Final</span>
  if (round === totalRounds - 1) return <span>Semi-Finals</span>
  if (round === totalRounds - 2) return <span>Quarter-Finals</span>
  
  return <span>{labels[round] || `Round ${round}`}</span>
}

// Connector Lines Component
function ConnectorLines({ round, matchIndex, totalMatchesInRound }: { 
  round: number
  matchIndex: number 
  totalMatchesInRound: number
}) {
  return (
    <div className="flex items-center w-8">
      <div className="w-full h-px bg-border" />
    </div>
  )
}

export function TournamentBracket({ 
  tournament, 
  onCreateTournament,
  onUpdateMatch,
  onRegisterTeam,
  isOrganizer = false
}: TournamentBracketProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTournament, setNewTournament] = useState<Partial<Tournament>>({
    name: '',
    sport: 'Soccer',
    bracketType: 'SINGLE_ELIMINATION',
    maxTeams: 8,
  })
  const [startDate, setStartDate] = useState<Date>()

  // Group matches by round
  const matchesByRound = useMemo(() => {
    if (!tournament?.matches) return {}
    
    return tournament.matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = []
      acc[match.round].push(match)
      return acc
    }, {} as Record<number, BracketMatch[]>)
  }, [tournament?.matches])

  const totalRounds = Object.keys(matchesByRound).length

  const handleCreateTournament = () => {
    onCreateTournament?.({
      ...newTournament,
      startDate: startDate?.toISOString(),
      status: 'DRAFT',
    })
    setIsCreateDialogOpen(false)
  }

  // Demo tournament for display
  const demoTournament: Tournament = tournament || {
    id: 'demo',
    name: 'Summer Championship 2024',
    description: 'Annual summer tournament',
    sport: 'Soccer',
    bracketType: 'SINGLE_ELIMINATION',
    status: 'IN_PROGRESS',
    maxTeams: 8,
    startDate: new Date().toISOString(),
    prizeInfo: '1st: $1000, 2nd: $500, 3rd: $250',
    location: 'City Stadium',
    teams: [
      { id: '1', name: 'Thunder FC', seed: 1 },
      { id: '2', name: 'Lightning United', seed: 8 },
      { id: '3', name: 'Storm Chasers', seed: 4 },
      { id: '4', name: 'Cyclone SC', seed: 5 },
      { id: '5', name: 'Blaze FC', seed: 3 },
      { id: '6', name: 'Inferno United', seed: 6 },
      { id: '7', name: 'Frost Giants', seed: 2 },
      { id: '8', name: 'Ice Warriors', seed: 7 },
    ],
    matches: generateSingleEliminationBracket([
      { id: '1', name: 'Thunder FC', seed: 1 },
      { id: '2', name: 'Lightning United', seed: 8 },
      { id: '3', name: 'Storm Chasers', seed: 4 },
      { id: '4', name: 'Cyclone SC', seed: 5 },
      { id: '5', name: 'Blaze FC', seed: 3 },
      { id: '6', name: 'Inferno United', seed: 6 },
      { id: '7', name: 'Frost Giants', seed: 2 },
      { id: '8', name: 'Ice Warriors', seed: 7 },
    ]),
  }

  const displayTournament = tournament || demoTournament
  const displayMatchesByRound = tournament ? matchesByRound : 
    displayTournament.matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = []
      acc[match.round].push(match)
      return acc
    }, {} as Record<number, BracketMatch[]>)
  
  const displayTotalRounds = Object.keys(displayMatchesByRound).length

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{displayTournament.name}</h2>
              <p className="text-muted-foreground">{displayTournament.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Swords className="h-4 w-4" />
              <span>{displayTournament.sport}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{displayTournament.teams.length}/{displayTournament.maxTeams} teams</span>
            </div>
            {displayTournament.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{displayTournament.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(new Date(displayTournament.startDate), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={
            displayTournament.status === 'IN_PROGRESS' ? 'default' :
            displayTournament.status === 'COMPLETED' ? 'secondary' :
            'outline'
          }>
            {displayTournament.status.replace('_', ' ')}
          </Badge>
          
          {isOrganizer && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Tournament
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Tournament</DialogTitle>
                  <DialogDescription>Set up a new tournament bracket</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Tournament Name</Label>
                    <Input 
                      value={newTournament.name}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Summer Championship 2024"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sport</Label>
                      <Select 
                        value={newTournament.sport}
                        onValueChange={(v) => setNewTournament(prev => ({ ...prev, sport: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Soccer">Soccer</SelectItem>
                          <SelectItem value="Basketball">Basketball</SelectItem>
                          <SelectItem value="American Football">American Football</SelectItem>
                          <SelectItem value="Baseball">Baseball</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Format</Label>
                      <Select 
                        value={newTournament.bracketType}
                        onValueChange={(v: any) => setNewTournament(prev => ({ ...prev, bracketType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE_ELIMINATION">Single Elimination</SelectItem>
                          <SelectItem value="DOUBLE_ELIMINATION">Double Elimination</SelectItem>
                          <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                          <SelectItem value="SWISS">Swiss System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Teams</Label>
                      <Select 
                        value={newTournament.maxTeams?.toString()}
                        onValueChange={(v) => setNewTournament(prev => ({ ...prev, maxTeams: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Teams</SelectItem>
                          <SelectItem value="8">8 Teams</SelectItem>
                          <SelectItem value="16">16 Teams</SelectItem>
                          <SelectItem value="32">32 Teams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={newTournament.description || ''}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tournament description..."
                    />
                  </div>
                  
                  <div>
                    <Label>Prize Info</Label>
                    <Input 
                      value={newTournament.prizeInfo || ''}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, prizeInfo: e.target.value }))}
                      placeholder="1st: $1000, 2nd: $500..."
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTournament}>
                    Create Tournament
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Prize Info */}
      {displayTournament.prizeInfo && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Medal className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Prizes</p>
              <p className="text-sm text-muted-foreground">{displayTournament.prizeInfo}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bracket Display */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Bracket</CardTitle>
          <CardDescription>
            {displayTournament.bracketType.replace('_', ' ')} format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="flex gap-8 pb-4 min-w-max">
              {Object.entries(displayMatchesByRound).map(([roundStr, matches], roundIndex) => {
                const round = parseInt(roundStr)
                return (
                  <div key={round} className="flex flex-col">
                    {/* Round header */}
                    <div className="text-center mb-4 font-semibold text-sm">
                      <RoundLabel round={round} totalRounds={displayTotalRounds} />
                    </div>
                    
                    {/* Matches */}
                    <div 
                      className="flex flex-col justify-around flex-1"
                      style={{ gap: `${Math.pow(2, round) * 16}px` }}
                    >
                      {matches.map((match, matchIndex) => (
                        <div key={match.id} className="flex items-center">
                          <MatchCard 
                            match={match} 
                            isOrganizer={isOrganizer}
                            onUpdate={(data) => onUpdateMatch?.(match.id, data)}
                          />
                          {roundIndex < Object.keys(displayMatchesByRound).length - 1 && (
                            <ConnectorLines 
                              round={round} 
                              matchIndex={matchIndex}
                              totalMatchesInRound={matches.length}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {/* Champion display */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-center mb-4 font-semibold text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Champion
                </div>
                <Card className="w-48 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30">
                  <CardContent className="p-4 text-center">
                    <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-lg">TBD</p>
                    <p className="text-sm text-muted-foreground">Winner</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Registered Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Teams
          </CardTitle>
          <CardDescription>
            {displayTournament.teams.length} of {displayTournament.maxTeams} spots filled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayTournament.teams.map((team) => (
              <div 
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {team.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{team.name}</p>
                  {team.seed && (
                    <p className="text-xs text-muted-foreground">Seed #{team.seed}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: displayTournament.maxTeams - displayTournament.teams.length }).map((_, i) => (
              <div 
                key={`empty-${i}`}
                className="flex items-center justify-center gap-3 p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Open Slot</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TournamentBracket
