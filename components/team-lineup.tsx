"use client"

import { useState, useEffect } from "react"
import { useDrop } from "react-dnd"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import PlayerCard from "@/components/player-card"
import FormationGraphic from "@/components/formation-graphic"
import { players as initialPlayers } from "@/lib/data"
import { Player } from "@/lib/types"

export default function TeamLineup({ sport, formation }) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [lineup, setLineup] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  useEffect(() => {
    // Reset lineup when sport or formation changes
    setLineup([])
    setPlayers(initialPlayers)
  }, [sport, formation])

  const [, drop] = useDrop({
    accept: "player",
    drop: (item: { id: number }, monitor) => {
      const dropResult = monitor.getDropResult()
      if (item && dropResult) {
        const updatedLineup = [...lineup]
        const playerIndex = players.findIndex((p) => p.id === item.id)
        if (playerIndex !== -1) {
          updatedLineup.push(players[playerIndex])
          setPlayers(players.filter((p) => p.id !== item.id))
          setLineup(updatedLineup)
        }
      }
    },
  })

  const removeFromLineup = (playerId: number) => {
    const playerToRemove = lineup.find((p) => p.id === playerId)
    if (playerToRemove) {
      setLineup(lineup.filter((p) => p.id !== playerId))
      setPlayers([...players, playerToRemove])
    }
  }

  const swapPlayers = (fromIndex: number, toIndex: number) => {
    const newLineup = [...lineup]
    const [removed] = newLineup.splice(fromIndex, 1)
    newLineup.splice(toIndex, 0, removed)
    setLineup(newLineup)
  }

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-2xl font-bold mb-4">
            Team Lineup - {sport} ({formation})
          </h2>
          <div ref={drop} className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 rounded-lg min-h-[400px]">
            <FormationGraphic 
              sport={sport} 
              formation={formation} 
              players={lineup} 
              onSwap={swapPlayers} 
            />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Reserve Roster</h2>
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 rounded-lg">
            <div className="grid grid-cols-1 gap-4">
              {players.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  draggable 
                  onClick={() => handlePlayerClick(player)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={selectedPlayer !== null} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="bg-black/90 text-white backdrop-blur-sm">
          <DialogTitle className="text-lg font-semibold">
            Player Profile
          </DialogTitle>
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={selectedPlayer?.avatar || selectedPlayer?.image} />
              <AvatarFallback>
                {selectedPlayer ? selectedPlayer.name[0] : "?"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">
              {selectedPlayer?.name || "Unknown Player"}
            </h2>
            <p className="text-white/70">
              Position: {selectedPlayer?.position || "Unknown"}
            </p>
            {selectedPlayer?.isCaptain && (
              <p className="text-yellow-500 font-semibold">Team Captain</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}