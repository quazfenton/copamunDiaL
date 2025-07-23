"use client"

import { useState } from "react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Clock, MapPin, Search, Star, Trophy, Users } from "lucide-react"
import { format } from "date-fns"
import { teams } from "@/lib/data"

interface MatchFinderProps {
  isOpen: boolean
  onClose: () => void
  currentTeam?: any
}

export default function MatchFinder({ isOpen, onClose }: MatchFinderProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [distance, setDistance] = useState([10])
  const [skillLevel, setSkillLevel] = useState("any")

  const availableMatches = [
    {
      id: 1,
      team: teams[1],
      date: new Date(2023, 5, 22),
      time: "18:30",
      location: "City Arena",
      distance: 3.2,
      skillLevel: "Intermediate"
    },
    {
      id: 2,
      team: teams[2],
      date: new Date(2023, 5, 25),
      time: "20:00",
      location: "Community Field",
      distance: 5.7,
      skillLevel: "Advanced"
    },
    {
      id: 3,
      team: {
        ...teams[0],
        name: "Metro Stars",
        logo: "/placeholder.svg"
      },
      date: new Date(2023, 5, 18),
      time: "16:00",
      location: "Metro Stadium",
      distance: 8.1,
      skillLevel: "Beginner"
    }
  ]

  const filteredMatches = availableMatches.filter(match => {
    const matchesSearch = match.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDistance = match.distance <= distance[0]
    const matchesSkill = skillLevel === "any" || match.skillLevel.toLowerCase() === skillLevel.toLowerCase()
    
    return matchesSearch && matchesDistance && matchesSkill
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Find a Match</DialogTitle>
          <DialogDescription className="text-gray-400">
            Discover teams looking for opponents
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="available" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="available">Available Matches</TabsTrigger>
            <TabsTrigger value="requests">Match Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search teams or locations..."
                    className="bg-gray-800/50 border-gray-700 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Distance (km)</Label>
                    <span className="text-sm text-gray-400">{distance[0]} km</span>
                  </div>
                  <Slider
                    defaultValue={[10]}
                    max={50}
                    step={1}
                    value={distance}
                    onValueChange={setDistance}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill-level">Skill Level</Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger id="skill-level" className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Any skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any skill level</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="cursor-pointer bg-blue-900/30 hover:bg-blue-800/50">Friendly</Badge>
                    <Badge variant="outline" className="cursor-pointer">Competitive</Badge>
                    <Badge variant="outline" className="cursor-pointer">Tournament</Badge>
                    <Badge variant="outline" className="cursor-pointer">Practice</Badge>
                  </div>
                </div>
              </div>

              <div className="md:w-2/3">
                <div className="space-y-3">
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map(match => (
                      <MatchCard
                        key={match.id}
                        team={match.team}
                        date={match.date}
                        time={match.time}
                        location={match.location}
                        distance={match.distance}
                        skillLevel={match.skillLevel}
                      />
                    ))
                  ) : (
                    <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                      <p className="text-gray-400">No matches found matching your criteria</p>
                      <Button variant="outline" className="mt-4 bg-gray-800/50 border-gray-700">
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Match Requests</h3>
              <p className="text-gray-400 mb-4">You don't have any pending match requests</p>
              <Button>Create Match Request</Button>
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

interface MatchCardProps {
  team: any
  date: Date
  time: string
  location: string
  distance: number
  skillLevel: string
}

function MatchCard({ team, date, time, location, distance, skillLevel }: MatchCardProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={team.logo} />
            <AvatarFallback>{team.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{team.name}</h3>
            <div className="flex items-center text-sm text-gray-400">
              <Trophy className="h-3 w-3 mr-1" />
              <span>{team.wins}W - {team.losses}L - {team.draws}D</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-900/30 border-blue-700">
          {skillLevel}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="flex flex-col items-center text-sm">
          <CalendarIcon className="h-4 w-4 mb-1 text-gray-400" />
          <span>{format(date, "MMM d, yyyy")}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <Clock className="h-4 w-4 mb-1 text-gray-400" />
          <span>{time}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <MapPin className="h-4 w-4 mb-1 text-gray-400" />
          <span>{distance} km</span>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-300">
        <MapPin className="h-3 w-3 inline-block mr-1" />
        {location}
      </div>

      <div className="flex justify-end mt-3">
        <Button size="sm">Request Match</Button>
      </div>
    </div>
  )
}