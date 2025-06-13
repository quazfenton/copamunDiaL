"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy } from "lucide-react"
import { Player } from "@/lib/types"

interface PlayerIconProps {
  player?: Player
  onClick?: () => void
}

const PlayerIcon = ({ player, onClick }: PlayerIconProps) => {
  if (!player) {
    return (
      <div className="flex flex-col items-center">
        <Avatar 
          className="w-12 h-12 border-2 border-gray-300 bg-gray-800 bg-opacity-50"
          onClick={onClick}
        >
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div className="text-xs text-center mt-1 text-white/80">Empty</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar 
          className="w-12 h-12 border-2 border-white"
          onClick={onClick}
        >
          <AvatarImage src={player.image || player.avatar} alt={player.name} />
          <AvatarFallback>
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        {player.isCaptain && (
          <Trophy className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 bg-black rounded-full p-[2px]" />
        )}
      </div>
      <div className="text-xs text-center mt-1 text-white/80">
        {player.position}
      </div>
    </div>
  )
}

export default PlayerIcon