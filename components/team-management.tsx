"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Player } from "@/lib/types"
import { X, Plus, Trophy, Medal, Star } from "lucide-react"

interface TeamManagementProps {
  isOpen: boolean
  onClose: () => void
  currentTeam: string
  players: Player[]
}

export default function TeamManagement({ 
  isOpen, 
  onClose, 
  currentTeam, 
  players 
}: TeamManagementProps) {
  const [teamName, setTeamName] = useState(currentTeam)
  const [teamPlayers, setTeamPlayers] = useState(players)
  const [searchTerm, setSearchTerm] = useState("")

  const handleRemovePlayer = (playerId: number) => {
    setTeamPlayers(teamPlayers.filter(player => player.id !== playerId))
  }

  const handleMakeCaptain = (playerId: number) => {
    setTeamPlayers(
      teamPlayers.map(player => ({
        ...player,
        isCaptain: player.id === playerId
      }))
    )
  }

  const filteredPlayers = teamPlayers.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Team Management</DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage your team roster, formations, and settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="roster" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="settings">Team Settings</TabsTrigger>
            <TabsTrigger value="stats">Team Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Roster</h3>
              <Input
                placeholder="Search players..."
                className="max-w-xs bg-gray-800/50 border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map(player => (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
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
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-gray-700/50"
                      onClick={() => handleMakeCaptain(player.id)}
                      disabled={player.isCaptain}
                      title="Make Captain"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-gray-700/50"
                      onClick={() => handleRemovePlayer(player.id)}
                      title="Remove Player"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gray-800/30 border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer"
              >
                <div className="flex flex-col items-center space-y-2">
                  <Plus className="h-8 w-8 text-blue-400" />
                  <p className="text-sm text-gray-400">Add Player</p>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-gray-800/50 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-logo">Team Logo</Label>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>{teamName[0]}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" className="bg-gray-800/50 border-gray-700">
                    Upload Logo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Team Colors</Label>
                <div className="flex space-x-2">
                  <div className="h-10 w-10 rounded-full bg-blue-600 cursor-pointer border-2 border-white" />
                  <div className="h-10 w-10 rounded-full bg-white cursor-pointer" />
                  <div className="h-10 w-10 rounded-full bg-gray-800 cursor-pointer flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Wins" value="5" icon={<Trophy className="h-5 w-5 text-green-500" />} />
              <StatCard title="Losses" value="2" icon={<X className="h-5 w-5 text-red-500" />} />
              <StatCard title="Draws" value="1" icon={<Medal className="h-5 w-5 text-yellow-500" />} />
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Results</h3>
              <div className="space-y-2">
                <ResultItem
                  result="W"
                  opponent="Rival FC"
                  score="2-1"
                  date="June 15, 2023"
                />
                <ResultItem
                  result="L"
                  opponent="City United"
                  score="0-2"
                  date="June 8, 2023"
                />
                <ResultItem
                  result="W"
                  opponent="Athletic Club"
                  score="3-0"
                  date="May 30, 2023"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Cancel
          </Button>
          <Button onClick={onClose}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
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

interface ResultItemProps {
  result: "W" | "L" | "D"
  opponent: string
  score: string
  date: string
}

function ResultItem({ result, opponent, score, date }: ResultItemProps) {
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
        <span>{opponent}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="font-semibold">{score}</span>
        <span className="text-sm text-gray-400">{date}</span>
      </div>
    </div>
  )
}