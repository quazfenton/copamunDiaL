"use client"

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Trophy, Medal, Star, Calendar, MapPin, Clock, 
  User, Mail, Phone, Globe, Camera, Edit
} from "lucide-react"

interface ProfileProps {
  isOpen: boolean
  onClose: () => void
  player?: any
  currentUserId?: number
}

export default function Profile({ isOpen, onClose, player, currentUserId }: ProfileProps) {
  const isOwnProfile = player?.id === currentUserId
  const displayPlayer = player || {
    id: currentUserId || 1,
    name: "John Doe",
    firstName: "John",
    position: "Forward",
    preferredPositions: ["Forward", "Midfielder"],
    bio: "Passionate soccer player with excellent scoring ability.",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    stats: { matches: 42, goals: 28, assists: 15, rating: 4.2 }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isOwnProfile ? "My Profile" : `${displayPlayer.name}'s Profile`}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isOwnProfile ? "View and edit your player profile" : "View player profile"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-gray-800/50 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute bottom-0 right-0 rounded-full bg-blue-600 border-none hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-bold">{displayPlayer.name}</h2>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Star className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-400 ml-1">({displayPlayer.stats?.rating || 4.0})</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Badge>{displayPlayer.position}</Badge>
                  {displayPlayer.isCaptain && <Badge>Team Captain</Badge>}
                  {displayPlayer.preferredPositions?.map(pos => 
                    pos !== displayPlayer.position && (
                      <Badge key={pos} variant="outline">{pos}</Badge>
                    )
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User />} label="Full Name" value={displayPlayer.name} />
                  {displayPlayer.email && <InfoItem icon={<Mail />} label="Email" value={displayPlayer.email} />}
                  {displayPlayer.phone && <InfoItem icon={<Phone />} label="Phone" value={displayPlayer.phone} />}
                  {displayPlayer.location && <InfoItem icon={<Globe />} label="Location" value={displayPlayer.location} />}
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
                  <h3 className="text-lg font-semibold">Bio</h3>
                  <p className="text-gray-300">
                    {displayPlayer.bio || "No bio available."}
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Teams</h3>
                  <div className="space-y-2">
                    <TeamItem 
                      name="Your Team" 
                      role="Captain" 
                      logo="/placeholder.svg" 
                      joined="2020"
                    />
                    <TeamItem 
                      name="City United" 
                      role="Forward" 
                      logo="/placeholder.svg" 
                      joined="2018-2020"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Matches" value={displayPlayer.stats?.matches?.toString() || "0"} icon={<Calendar className="h-5 w-5 text-blue-500" />} />
              <StatCard title="Goals" value={displayPlayer.stats?.goals?.toString() || "0"} icon={<Trophy className="h-5 w-5 text-green-500" />} />
              <StatCard title="Assists" value={displayPlayer.stats?.assists?.toString() || "0"} icon={<Medal className="h-5 w-5 text-yellow-500" />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Recent Performances</h3>
                <div className="space-y-2">
                  <PerformanceItem 
                    match="vs Rival FC" 
                    date="June 15, 2023" 
                    stats="2 Goals, 1 Assist" 
                    rating={5}
                  />
                  <PerformanceItem 
                    match="vs City United" 
                    date="June 8, 2023" 
                    stats="0 Goals, 1 Assist" 
                    rating={3}
                  />
                  <PerformanceItem 
                    match="vs Athletic Club" 
                    date="May 30, 2023" 
                    stats="1 Goal, 0 Assists" 
                    rating={4}
                  />
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Skill Ratings</h3>
                <div className="space-y-3">
                  <SkillBar skill="Shooting" value={85} />
                  <SkillBar skill="Passing" value={75} />
                  <SkillBar skill="Dribbling" value={80} />
                  <SkillBar skill="Defense" value={60} />
                  <SkillBar skill="Physical" value={70} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Match History</h3>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <HistoryItem 
                    key={i}
                    match={`vs ${['Rival FC', 'City United', 'Athletic Club', 'Metro Stars', 'United FC'][i % 5]}`}
                    date={`June ${15 - i * 7}, 2023`}
                    result={i % 3 === 0 ? 'W' : i % 3 === 1 ? 'L' : 'D'}
                    score={i % 3 === 0 ? '2-1' : i % 3 === 1 ? '0-2' : '1-1'}
                  />
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Achievement History</h3>
              <div className="space-y-2">
                <AchievementItem 
                  title="League Champion" 
                  description="Won the Premier League with Your Team" 
                  date="2022"
                  icon={<Trophy className="h-5 w-5 text-yellow-500" />}
                />
                <AchievementItem 
                  title="Top Scorer" 
                  description="Scored 15 goals in a single season" 
                  date="2021"
                  icon={<Star className="h-5 w-5 text-yellow-500" />}
                />
                <AchievementItem 
                  title="MVP" 
                  description="Most Valuable Player in the Champions Cup" 
                  date="2020"
                  icon={<Medal className="h-5 w-5 text-blue-500" />}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    defaultValue="John Doe"
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    defaultValue="john.doe@example.com"
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    defaultValue="+1 (555) 123-4567"
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    defaultValue="New York, USA"
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  defaultValue="Passionate soccer player with 10+ years of experience. Specializing in forward positions with a strong scoring record. Team captain for 3 seasons with excellent leadership skills."
                  className="bg-gray-800/50 border-gray-700 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-position">Primary Position</Label>
                  <Select defaultValue="forward">
                    <SelectTrigger className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forward">Forward</SelectItem>
                      <SelectItem value="midfielder">Midfielder</SelectItem>
                      <SelectItem value="defender">Defender</SelectItem>
                      <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-position">Secondary Position</Label>
                  <Select defaultValue="midfielder">
                    <SelectTrigger className="bg-gray-800/50 border-gray-700">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forward">Forward</SelectItem>
                      <SelectItem value="midfielder">Midfielder</SelectItem>
                      <SelectItem value="defender">Defender</SelectItem>
                      <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-medium">
      {children}
    </span>
  )
}

interface InfoItemProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center space-x-3 bg-gray-800/30 rounded-lg p-3">
      <div className="text-blue-400">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

interface TeamItemProps {
  name: string
  role: string
  logo: string
  joined: string
}

function TeamItem({ name, role, logo, joined }: TeamItemProps) {
  return (
    <div className="flex items-center justify-between bg-gray-800/20 rounded-lg p-3">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={logo} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-gray-400">{role}</p>
        </div>
      </div>
      <div className="text-sm text-gray-400">
        <Calendar className="inline-block mr-1 h-3 w-3" />
        {joined}
      </div>
    </div>
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

interface PerformanceItemProps {
  match: string
  date: string
  stats: string
  rating: number
}

function PerformanceItem({ match, date, stats, rating }: PerformanceItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{match}</p>
          <p className="text-sm text-gray-400">
            <Calendar className="inline-block mr-1 h-3 w-3" />
            {date}
          </p>
        </div>
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} 
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-300 mt-1">{stats}</p>
    </div>
  )
}

interface SkillBarProps {
  skill: string
  value: number
}

function SkillBar({ skill, value }: SkillBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{skill}</p>
        <p className="text-sm text-gray-400">{value}/100</p>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 rounded-full" 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

interface HistoryItemProps {
  match: string
  date: string
  result: 'W' | 'L' | 'D'
  score: string
}

function HistoryItem({ match, date, result, score }: HistoryItemProps) {
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
        <span>{match}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="font-semibold">{score}</span>
        <span className="text-sm text-gray-400">
          <Calendar className="inline-block mr-1 h-3 w-3" />
          {date}
        </span>
      </div>
    </div>
  )
}

interface AchievementItemProps {
  title: string
  description: string
  date: string
  icon: React.ReactNode
}

function AchievementItem({ title, description, date, icon }: AchievementItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3 flex items-center space-x-3">
      <div className="bg-gray-700 rounded-full p-2">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-400">
            <Calendar className="inline-block mr-1 h-3 w-3" />
            {date}
          </p>
        </div>
        <p className="text-sm text-gray-300">{description}</p>
      </div>
    </div>
  )
}