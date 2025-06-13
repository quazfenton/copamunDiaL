"use client"

import { useState } from "react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { CalendarIcon, Clock, MapPin } from "lucide-react"
import { teams } from "@/lib/data"

interface MatchSchedulingProps {
  isOpen: boolean
  onClose: () => void
}

export default function MatchScheduling({ isOpen, onClose }: MatchSchedulingProps) {
  const [date, setDate] = useState<Date>()
  const [selectedTeam, setSelectedTeam] = useState("")
  const [location, setLocation] = useState("")
  const [time, setTime] = useState("")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Schedule a Match</DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up a match with another team
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opponent">Select Opponent</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger id="opponent" className="bg-gray-800/50 border-gray-700">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={team.logo} />
                          <AvatarFallback>{team.name[0]}</AvatarFallback>
                        </Avatar>
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Match Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal bg-gray-800/50 border-gray-700 ${!date && "text-gray-400"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="bg-gray-900"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Match Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="time"
                  type="time"
                  className="bg-gray-800/50 border-gray-700 pl-10"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="location"
                  placeholder="Enter match location"
                  className="bg-gray-800/50 border-gray-700 pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Match Preview</h3>
              
              {selectedTeam ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="flex items-center justify-center w-full">
                    <div className="flex flex-col items-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>YT</AvatarFallback>
                      </Avatar>
                      <p className="mt-2 font-semibold">Your Team</p>
                    </div>
                    
                    <div className="mx-4 text-2xl font-bold text-gray-400">VS</div>
                    
                    <div className="flex flex-col items-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={teams.find(t => t.id.toString() === selectedTeam)?.logo} />
                        <AvatarFallback>
                          {teams.find(t => t.id.toString() === selectedTeam)?.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-2 font-semibold">
                        {teams.find(t => t.id.toString() === selectedTeam)?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 w-full">
                    {date && (
                      <div className="flex items-center justify-center space-x-2 text-gray-300">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{format(date, "PPP")}</span>
                      </div>
                    )}
                    
                    {time && (
                      <div className="flex items-center justify-center space-x-2 text-gray-300">
                        <Clock className="h-4 w-4" />
                        <span>{time}</span>
                      </div>
                    )}
                    
                    {location && (
                      <div className="flex items-center justify-center space-x-2 text-gray-300">
                        <MapPin className="h-4 w-4" />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-center">
                  Select an opponent, date, time, and location to see the match preview
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Cancel
          </Button>
          <Button 
            onClick={onClose}
            disabled={!selectedTeam || !date || !time || !location}
          >
            Schedule Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}