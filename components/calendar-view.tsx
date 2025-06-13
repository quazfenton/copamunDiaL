"use client"

import { useState } from "react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronLeft, ChevronRight, Clock, MapPin, 
  Trophy, Users, Calendar as CalendarIcon
} from "lucide-react"
import { format, isSameDay } from "date-fns"
import { matches } from "@/lib/data"

interface CalendarViewProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalendarView({ isOpen, onClose }: CalendarViewProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"month" | "day">("month")
  
  // Convert string dates to Date objects for comparison
  const eventsWithDates = matches.map(match => ({
    ...match,
    dateObj: new Date(match.date)
  }))
  
  const selectedDateEvents = eventsWithDates.filter(event => 
    isSameDay(event.dateObj, date)
  )

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      setView("day")
    }
  }

  const handleBackToMonth = () => {
    setView("month")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Calendar</DialogTitle>
          <DialogDescription className="text-gray-400">
            View your scheduled matches and events
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {view === "month" ? (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {format(date, "MMMM yyyy")}
                </h3>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 bg-gray-800/50 border-gray-700"
                    onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 bg-gray-800/50 border-gray-700"
                    onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="bg-transparent"
                modifiers={{
                  event: eventsWithDates.map(event => event.dateObj)
                }}
                modifiersStyles={{
                  event: {
                    fontWeight: "bold",
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    borderRadius: "4px"
                  }
                }}
              />
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Upcoming Events</h4>
                <div className="space-y-2">
                  {eventsWithDates.slice(0, 3).map(event => (
                    <EventItem 
                      key={event.id}
                      title={`${event.homeTeam.name} vs ${event.awayTeam.name}`}
                      date={format(event.dateObj, "EEEE, MMMM d, yyyy")}
                      time={event.time}
                      location={event.location}
                      type={event.status === "completed" ? "completed" : "scheduled"}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {format(date, "EEEE, MMMM d, yyyy")}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800/50 border-gray-700"
                  onClick={handleBackToMonth}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Back to Month
                </Button>
              </div>
              
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map(event => (
                    <DayEventCard 
                      key={event.id}
                      homeTeam={event.homeTeam}
                      awayTeam={event.awayTeam}
                      time={event.time}
                      location={event.location}
                      status={event.status}
                      score={event.score}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/20 rounded-lg p-6 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Events</h3>
                  <p className="text-gray-400 mb-4">You don't have any events scheduled for this day</p>
                  <Button>Schedule Event</Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EventItemProps {
  title: string
  date: string
  time: string
  location: string
  type: "scheduled" | "completed" | "cancelled"
}

function EventItem({ title, date, time, location, type }: EventItemProps) {
  const badgeColor = 
    type === "scheduled" ? "bg-blue-900/30 border-blue-700 text-blue-400" : 
    type === "completed" ? "bg-green-900/30 border-green-700 text-green-400" : 
    "bg-red-900/30 border-red-700 text-red-400"
  
  const badgeText = 
    type === "scheduled" ? "Scheduled" : 
    type === "completed" ? "Completed" : 
    "Cancelled"

  return (
    <div className="bg-gray-800/20 rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-300 mt-1">
            <CalendarIcon className="inline-block mr-1 h-3 w-3" />
            {date}
          </p>
        </div>
        <Badge variant="outline" className={badgeColor}>
          {badgeText}
        </Badge>
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-gray-400">
        <div>
          <Clock className="inline-block mr-1 h-3 w-3" />
          {time}
        </div>
        <div>
          <MapPin className="inline-block mr-1 h-3 w-3" />
          {location}
        </div>
      </div>
    </div>
  )
}

interface DayEventCardProps {
  homeTeam: any
  awayTeam: any
  time: string
  location: string
  status: "scheduled" | "completed" | "cancelled"
  score?: {
    home: number
    away: number
  }
}

function DayEventCard({ homeTeam, awayTeam, time, location, status, score }: DayEventCardProps) {
  const badgeColor = 
    status === "scheduled" ? "bg-blue-900/30 border-blue-700 text-blue-400" : 
    status === "completed" ? "bg-green-900/30 border-green-700 text-green-400" : 
    "bg-red-900/30 border-red-700 text-red-400"
  
  const badgeText = 
    status === "scheduled" ? "Scheduled" : 
    status === "completed" ? "Completed" : 
    "Cancelled"

  return (
    <div className="bg-gray-800/20 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium">Match</h4>
        <Badge variant="outline" className={badgeColor}>
          {badgeText}
        </Badge>
      </div>
      
      <div className="flex items-center justify-center mb-4">
        <div className="flex flex-col items-center">
          <Avatar className="h-16 w-16">
            <AvatarImage src={homeTeam.logo} />
            <AvatarFallback>{homeTeam.name[0]}</AvatarFallback>
          </Avatar>
          <p className="mt-2 font-semibold">{homeTeam.name}</p>
        </div>
        
        {status === "completed" && score ? (
          <div className="mx-6 text-center">
            <div className="text-3xl font-bold">
              {score.home} - {score.away}
            </div>
            <p className="text-sm text-gray-400 mt-1">Final Score</p>
          </div>
        ) : (
          <div className="mx-6 text-2xl font-bold text-gray-400">VS</div>
        )}
        
        <div className="flex flex-col items-center">
          <Avatar className="h-16 w-16">
            <AvatarImage src={awayTeam.logo} />
            <AvatarFallback>{awayTeam.name[0]}</AvatarFallback>
          </Avatar>
          <p className="mt-2 font-semibold">{awayTeam.name}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="flex flex-col items-center text-sm">
          <Clock className="h-4 w-4 mb-1 text-gray-400" />
          <span>{time}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <MapPin className="h-4 w-4 mb-1 text-gray-400" />
          <span>{location}</span>
        </div>
        <div className="flex flex-col items-center text-sm">
          <Users className="h-4 w-4 mb-1 text-gray-400" />
          <span>11 vs 11</span>
        </div>
      </div>
      
      {status === "scheduled" && (
        <div className="flex justify-end mt-4">
          <Button size="sm">
            <Trophy className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      )}
    </div>
  )
}