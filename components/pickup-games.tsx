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
import { 
  CalendarIcon, Clock, MapPin, Search, Users, 
  Plus, Calendar as CalendarFull
} from "lucide-react"
import { format } from "date-fns"
import { pickupGames } from "@/lib/data"

interface PickupGamesProps {
  isOpen: boolean
  onClose: () => void
}

export default function PickupGames({ isOpen, onClose }: PickupGamesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [distance, setDistance] = useState([10])
  const [sport, setSport] = useState("any")
  const [date, setDate] = useState<Date | undefined>(undefined)

  const filteredGames = pickupGames.filter(game => {
    const matchesSearch = game.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.sport.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSport = sport === "any" || game.sport.toLowerCase() === sport.toLowerCase()
    
    return matchesSearch && matchesSport
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pickup Games</DialogTitle>
          <DialogDescription className="text-gray-400">
            Find casual games in your area or organize your own
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="find" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="find">Find Games</TabsTrigger>
            <TabsTrigger value="my-games">My Games</TabsTrigger>
            <TabsTrigger value="create">Create Game</TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search location or sport..."
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
                  <Label htmlFor="sport-type">Sport</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="sport-type" className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Any sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any sport</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="volleyball">Volleyball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="date"
                      type="date"
                      className="bg-gray-800/50 border-gray-700 pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="md:w-2/3">
                <div className="space-y-3">
                  {filteredGames.length > 0 ? (
                    filteredGames.map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                      />
                    ))
                  ) : (
                    <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                      <p className="text-gray-400">No games found matching your criteria</p>
                      <Button variant="outline" className="mt-4 bg-gray-800/50 border-gray-700">
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-games" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-6 text-center">
              <CalendarFull className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Games Joined</h3>
              <p className="text-gray-400 mb-4">You haven't joined any pickup games yet</p>
              <Button>Find Games</Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create Pickup Game</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="game-sport">Sport</Label>
                    <Select>
                      <SelectTrigger id="game-sport" className="bg-gray-800/50 border-gray-700">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soccer">Soccer</SelectItem>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="tennis">Tennis</SelectItem>
                        <SelectItem value="volleyball">Volleyball</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="game-location">Location</Label>
                    <Input 
                      id="game-location" 
                      placeholder="Enter location" 
                      className="bg-gray-800/50 border-gray-700" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="game-date">Date</Label>
                    <Input 
                      id="game-date" 
                      type="date" 
                      className="bg-gray-800/50 border-gray-700" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="game-time">Time</Label>
                    <Input 
                      id="game-time" 
                      type="time" 
                      className="bg-gray-800/50 border-gray-700" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="players-needed">Players Needed</Label>
                    <Input 
                      id="players-needed" 
                      type="number" 
                      min="2" 
                      max="22" 
                      defaultValue="10" 
                      className="bg-gray-800/50 border-gray-700" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="skill-level">Skill Level</Label>
                    <Select>
                      <SelectTrigger id="skill-level" className="bg-gray-800/50 border-gray-700">
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="any">Any Skill Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea 
                    id="description"
                    className="w-full bg-gray-800/50 border-gray-700 rounded-md p-2 min-h-[100px]"
                    placeholder="Provide details about the game"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" className="bg-gray-800/50 border-gray-700">
                    Cancel
                  </Button>
                  <Button>
                    Create Game
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

interface GameCardProps {
  game: any
}

function GameCard({ game }: GameCardProps) {
  const spotsLeft = game.playersNeeded - game.playersJoined
  const isFull = spotsLeft <= 0
  
  return (
    <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h3 className="font-semibold">{game.sport} Game</h3>
            <Badge className="ml-2 bg-blue-900/30 text-blue-300 border-none">
              {format(new Date(game.date), "MMM d")}
            </Badge>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            <MapPin className="inline-block mr-1 h-3 w-3" />
            {game.location}
          </p>
        </div>
        <Badge variant="outline" className={isFull ? "bg-red-900/30 text-red-400 border-red-700" : "bg-green-900/30 text-green-400 border-green-700"}>
          {isFull ? "Full" : `${spotsLeft} spots left`}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="flex flex-col items-center text-sm">
          <Clock className="h-4 w-4 mb-1 text-gray-400" />
          <span>{game.time}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <Users className="h-4 w-4 mb-1 text-gray-400" />
          <span>{game.playersJoined}/{game.playersNeeded}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <Avatar className="h-6 w-6 mb-1">
            <AvatarImage src={game.organizer.avatar} />
            <AvatarFallback>{game.organizer.name[0]}</AvatarFallback>
          </Avatar>
          <span>Organizer</span>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button size="sm" disabled={isFull}>
          <Plus className="h-4 w-4 mr-2" />
          Join Game
        </Button>
      </div>
    </div>
  )
}