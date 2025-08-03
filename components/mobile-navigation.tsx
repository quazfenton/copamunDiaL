"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, Users, Calendar, Trophy, MessageCircle, 
  User, Settings, Bell, Search, Plus
} from 'lucide-react'
import { TeamData } from '@/lib/types'

interface MobileNavigationProps {
  userTeams: TeamData[]
  currentTeamId: string
  onTeamChange: (teamId: string) => void
  onTeamManagement: () => void
  onPlayerInvite: () => void
  onProfile: () => void
  onMatchScheduling: () => void
  onMatchFinder: () => void
  onTeamProfile: () => void
  onLeagues: () => void
  onCalendar: () => void
  onPickupGames: () => void
  notificationCount?: number
}

export default function MobileNavigation({
  userTeams,
  currentTeamId,
  onTeamChange,
  onTeamManagement,
  onPlayerInvite,
  onProfile,
  onMatchScheduling,
  onMatchFinder,
  onTeamProfile,
  onLeagues,
  onCalendar,
  onPickupGames,
  notificationCount = 0
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "Team Management",
      onClick: () => {
        onTeamManagement()
        setIsOpen(false)
      }
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "Invite Players",
      onClick: () => {
        onPlayerInvite()
        setIsOpen(false)
      }
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Schedule Match",
      onClick: () => {
        onMatchScheduling()
        setIsOpen(false)
      }
    },
    {
      icon: <Search className="h-5 w-5" />,
      label: "Find Matches",
      onClick: () => {
        onMatchFinder()
        setIsOpen(false)
      }
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "Leagues",
      onClick: () => {
        onLeagues()
        setIsOpen(false)
      }
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Calendar",
      onClick: () => {
        onCalendar()
        setIsOpen(false)
      }
    },
    {
      icon: <Plus className="h-5 w-5" />,
      label: "Pickup Games",
      onClick: () => {
        onPickupGames()
        setIsOpen(false)
      }
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Team Profile",
      onClick: () => {
        onTeamProfile()
        setIsOpen(false)
      }
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "My Profile",
      onClick: () => {
        onProfile()
        setIsOpen(false)
      }
    }
  ]

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-black/50 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-black/95 border-gray-800 w-80">
              <div className="space-y-6 mt-6">
                {/* Team Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Your Teams</h3>
                  <div className="space-y-2">
                    {userTeams.map((team) => (
                      <Button
                        key={team.id}
                        variant={team.id === currentTeamId ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          onTeamChange(team.id)
                          setIsOpen(false)
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {team.name.charAt(0)}
                            </span>
                          </div>
                          <span>{team.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Menu Items */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Menu</h3>
                  <div className="space-y-1">
                    {menuItems.map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
                        onClick={item.onClick}
                      >
                        {item.icon}
                        <span className="ml-3">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold text-white">PlayMate</h1>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-gray-800 p-2">
        <div className="flex justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={onTeamManagement}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Teams</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={onCalendar}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Calendar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={onMatchFinder}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs">Matches</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={onLeagues}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-xs">Leagues</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={onProfile}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </>
  )
}