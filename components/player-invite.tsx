"use client"

import { useState } from "react"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Copy, Mail, Phone, Share2, User } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface PlayerInviteProps {
  isOpen: boolean
  onClose: () => void
}

export default function PlayerInvite({ isOpen, onClose }: PlayerInviteProps) {
  const [copied, setCopied] = useState(false)
  const [inviteMethod, setInviteMethod] = useState("email")
  const [searchTerm, setSearchTerm] = useState("")

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://playmate-app.com/invite/team123")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const suggestedPlayers = [
    { id: 101, name: "Alex Johnson", position: "Forward", avatar: "/placeholder.svg" },
    { id: 102, name: "Maria Garcia", position: "Midfielder", avatar: "/placeholder.svg" },
    { id: 103, name: "Sam Wilson", position: "Defender", avatar: "/placeholder.svg" },
    { id: 104, name: "Taylor Smith", position: "Goalkeeper", avatar: "/placeholder.svg" },
  ]

  const filteredPlayers = suggestedPlayers.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Invite Players</DialogTitle>
          <DialogDescription className="text-gray-400">
            Invite players to join your team or find new teammates
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="find">Find Players</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Invite Method</Label>
                <RadioGroup 
                  defaultValue="email" 
                  className="flex space-x-4"
                  onValueChange={setInviteMethod}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="cursor-pointer">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone" className="cursor-pointer">Phone</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="link" id="link" />
                    <Label htmlFor="link" className="cursor-pointer">Share Link</Label>
                  </div>
                </RadioGroup>
              </div>

              {inviteMethod === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="email-input">Email Address</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email-input"
                      placeholder="player@example.com"
                      className="bg-gray-800/50 border-gray-700"
                    />
                    <Button>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invite
                    </Button>
                  </div>
                </div>
              )}

              {inviteMethod === "phone" && (
                <div className="space-y-2">
                  <Label htmlFor="phone-input">Phone Number</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="phone-input"
                      placeholder="+1 (555) 123-4567"
                      className="bg-gray-800/50 border-gray-700"
                    />
                    <Button>
                      <Phone className="mr-2 h-4 w-4" />
                      Send SMS
                    </Button>
                  </div>
                </div>
              )}

              {inviteMethod === "link" && (
                <div className="space-y-2">
                  <Label htmlFor="invite-link">Invite Link</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="invite-link"
                      value="https://playmate-app.com/invite/team123"
                      readOnly
                      className="bg-gray-800/50 border-gray-700"
                    />
                    <Button onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <Button variant="outline" className="flex-1 bg-gray-800/50 border-gray-700">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="find" className="space-y-4">
            <div className="space-y-4">
              <Input
                placeholder="Search players by name or position..."
                className="bg-gray-800/50 border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Suggested Players</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPlayers.map(player => (
                    <div 
                      key={player.id}
                      className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-sm text-gray-400">{player.position}</p>
                        </div>
                      </div>
                      <Button size="sm">
                        <User className="mr-2 h-4 w-4" />
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}