"use client"

import { useDrag } from "react-dnd"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { X, Trophy } from "lucide-react"
import { Player } from "@/lib/types"

interface PlayerCardProps {
  player: Player
  draggable?: boolean
  onRemove?: () => void
  onClick?: () => void
}

export default function PlayerCard({ player, draggable = false, onRemove, onClick }: PlayerCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "player",
    item: { id: player.id, name: player.name },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <Card
      ref={draggable ? drag : null}
      className={`relative ${isDragging ? "opacity-50" : "opacity-100"} ${draggable ? "cursor-move" : ""} ${onClick ? "cursor-pointer" : ""} hover:bg-gray-800/50 transition-colors`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center space-x-4">
        <Avatar>
          <AvatarImage src={player.image || player.avatar} alt={player.name} />
          <AvatarFallback>
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center">
            <p className="font-semibold">{player.name}</p>
            {player.isCaptain && (
              <Trophy className="h-4 w-4 ml-2 text-yellow-500" />
            )}
          </div>
          <p className="text-sm text-gray-400">{player.position}</p>
        </div>
        {onRemove && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }} 
            className="absolute top-1 right-1 text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </CardContent>
    </Card>
  )
}