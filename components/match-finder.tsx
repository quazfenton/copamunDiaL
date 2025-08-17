"use client"

import { useState, useEffect } from "react"
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
import { CalendarIcon, Clock, MapPin, Search, Star, Trophy, Users as UsersIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { apiClient } from "@/lib/api-client"
import { TeamData } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface MatchFinderProps {
  isOpen: boolean
  onClose: () => void
  currentTeam?: TeamData
}

export default function MatchFinder({ isOpen, onClose, currentTeam }: MatchFinderProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("")
  const [distance, setDistance] = useState([10])
  const [skillLevel, setSkillLevel] = useState("any")
  const [sport, setSport] = useState<string>("")
  const [ageGroup, setAgeGroup] = useState<string>("")
  const [coords, setCoords] = useState<{lat?: number; lng?: number}>({})
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  const [matchRequests, setMatchRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5; // Number of items per page

  useEffect(() => {
    if (isOpen) {
      fetchMatchData();
    }
  }, [isOpen, currentPage, sport, ageGroup, coords.lat, coords.lng, distance]); // Refetch when filters change

  const fetchMatchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchesRes, requestsRes] = await Promise.all([
        apiClient.getMatches({ 
          status: 'SCHEDULED', 
          sport: sport || undefined,
          ageGroup: ageGroup || undefined,
          latitude: coords.lat,
          longitude: coords.lng,
          radius: distance[0],
          page: currentPage, 
          pageSize 
        }),
        apiClient.getMatchRequests(currentTeam?.id),
      ]);
      setAvailableMatches(matchesRes);
      setTotalPages(Math.ceil(matchesRes.length / pageSize));
      setMatchRequests(requestsRes);
    } catch (err: any) {
      setError(err.message || "Failed to fetch match data.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch match data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = availableMatches.filter(match => {
    const matchesSearch = match.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDistance = match.distance <= distance[0]
    const matchesSkill = skillLevel === "any" || match.skillLevel.toLowerCase() === skillLevel.toLowerCase()
    
    return matchesSearch && matchesDistance && matchesSkill
  })

  const handleRequestMatch = async (targetTeamId: string) => {
    if (!currentTeam?.id) {
      toast({
        title: "Error",
        description: "Please select your team first.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.sendMatchRequest({
        fromTeamId: currentTeam.id,
        toTeamId: targetTeamId,
        proposedDate: new Date().toISOString(), // Placeholder, ideally from a date picker
        proposedLocation: "", // Placeholder, ideally from a location picker
        message: `Match request from ${currentTeam.name}`,
      });
      toast({
        title: "Error",
        description: err.message || "Failed to send match request.",
        variant: "destructive",
      });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl flex items-center justify-center h-[50vh]">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Error</DialogTitle>
            <DialogDescription className="text-red-400">
              {error}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={fetchMatchData}>Try Again</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            <TabsTrigger value="requests">Match Requests ({matchRequests.length})</TabsTrigger>
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
                  <Label>Distance (km)</Label>
                  <span className="text-sm text-gray-400">{distance[0]} km</span>
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
                  <Label htmlFor="sport">Sport</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="sport" className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Any sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="Soccer">Soccer</SelectItem>
                      <SelectItem value="Basketball">Basketball</SelectItem>
                      <SelectItem value="Tennis">Tennis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageGroup">Age Group</Label>
                  <Select value={ageGroup} onValueChange={setAgeGroup}>
                    <SelectTrigger id="ageGroup" className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Any age group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="U10">U10</SelectItem>
                      <SelectItem value="U12">U12</SelectItem>
                      <SelectItem value="U14">U14</SelectItem>
                      <SelectItem value="Adult">Adult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Use my location</Label>
                  <Button variant="outline" className="bg-gray-800/50 border-gray-700" onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      }, (err) => {
                        toast({ title: "Location error", description: err.message, variant: "destructive" });
                      })
                    }
                  }}>Set Current Location</Button>
                </div>
              </div>

              <div className="md:w-2/3">
                <div className="space-y-3">
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map(match => (
                      <MatchCard
                        key={match.id}
                        team={match.team}
                        date={new Date(match.date)}
                        time={match.time}
                        location={match.location}
                        distance={match.distance}
                        skillLevel={match.skillLevel}
                        onRequestMatch={() => handleRequestMatch(match.team.id)}
                      />
                    ))
                  ) : (
                    <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                      <p className="text-gray-400">No matches found matching your criteria</p>
                      <Button variant="outline" className="mt-4 bg-gray-800/50 border-gray-700" onClick={() => {
                        setSearchTerm("");
                        setDistance([10]);
                        setSkillLevel("any");
                      }}>
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="outline">
                      <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                    </Button>
                    <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                    <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                      Next <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-3">
              {matchRequests.length > 0 ? (
                matchRequests.map(request => (
                  <MatchRequestCard
                    key={request.id}
                    request={request}
                    onAccept={() => console.log("Accept request", request.id)}
                    onDecline={() => console.log("Decline request", request.id)}
                  />
                ))
              ) : (
                <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                  <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Match Requests</h3>
                  <p className="text-gray-400 mb-4">You don't have any pending match requests</p>
                  <Button>Create Match Request</Button>
                </div>
              )}
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
  onRequestMatch: () => void;
}

function MatchCard({ team, date, time, location, distance, skillLevel, onRequestMatch }: MatchCardProps) {
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
        <Button size="sm" onClick={onRequestMatch}>Request Match</Button>
      </div>
    </div>
  )
}

interface MatchRequestCardProps {
  request: any;
  onAccept: () => void;
  onDecline: () => void;
}

function MatchRequestCard({ request, onAccept, onDecline }: MatchRequestCardProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={request.fromTeam.logo} />
            <AvatarFallback>{request.fromTeam.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Match Request from {request.fromTeam.name}</h3>
            <p className="text-sm text-gray-400">{request.message}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-yellow-900/30 border-yellow-700">
          Pending
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="flex flex-col items-center text-sm">
          <CalendarIcon className="h-4 w-4 mb-1 text-gray-400" />
          <span>{format(new Date(request.proposedDate), "MMM d, yyyy")}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <Clock className="h-4 w-4 mb-1 text-gray-400" />
          <span>{request.proposedTime || "Any Time"}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <MapPin className="h-4 w-4 mb-1 text-gray-400" />
          <span>{request.proposedLocation || "Any Location"}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-3">
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onAccept}>Accept</Button>
        <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={onDecline}>Decline</Button>
      </div>
    </div>
  );
}