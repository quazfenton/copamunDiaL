"use client"

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Player } from "@/lib/types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formationPositions } from "@/lib/data";
import { getFieldLayout } from "@/lib/field-layouts";
import { useIsMobile } from "@/hooks/use-mobile";

interface SportFieldProps {
  className?: string;
  sport: string;
  formation: string;
  players: Player[];
  reserves?: Player[];
  onPlayerMove?: (result: any) => void;
  onPlayerClick?: (player: Player) => void;
  currentUserId?: number;
  teamCaptains?: number[];
}

interface PositionSlot {
  id: string;
  player?: Player;
  position: { top: string; left: string };
}

export function SportField({
  className,
  sport,
  formation,
  players,
  reserves = [],
  onPlayerMove,
  onPlayerClick,
  currentUserId = 1,
  teamCaptains = [1]
}: SportFieldProps) {
  const FieldLayout = getFieldLayout(sport);

  // Create position slots for the current formation
  const positions = formationPositions[sport]?.[formation] || formationPositions.Soccer["4-4-2"];
  
  const [positionSlots, setPositionSlots] = useState<PositionSlot[]>(() => {
    return positions.map((pos, index) => ({
      id: `position-${index}`,
      player: players[index] || undefined,
      position: pos
    }));
  });

  const [reservePlayers, setReservePlayers] = useState<Player[]>(reserves);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Handle movement between positions and reserves
    if (source.droppableId === "reserves" && destination.droppableId.startsWith("position-")) {
      // Move from reserves to position
      const reserveIndex = source.index;
      const positionIndex = parseInt(destination.droppableId.split("-")[1]);
      
      const newReserves = [...reservePlayers];
      const playerToMove = newReserves.splice(reserveIndex, 1)[0];
      
      const newPositions = [...positionSlots];
      if (newPositions[positionIndex].player) {
        // Swap with existing player
        newReserves.push(newPositions[positionIndex].player!);
      }
      newPositions[positionIndex].player = playerToMove;
      
      setReservePlayers(newReserves);
      setPositionSlots(newPositions);
    } else if (source.droppableId.startsWith("position-") && destination.droppableId === "reserves") {
      // Move from position to reserves
      const positionIndex = parseInt(source.droppableId.split("-")[1]);
      
      const newPositions = [...positionSlots];
      const playerToMove = newPositions[positionIndex].player;
      
      if (playerToMove) {
        newPositions[positionIndex].player = undefined;
        const newReserves = [...reservePlayers];
        newReserves.splice(destination.index, 0, playerToMove);
        
        setPositionSlots(newPositions);
        setReservePlayers(newReserves);
      }
    } else if (source.droppableId.startsWith("position-") && destination.droppableId.startsWith("position-")) {
      // Swap positions
      const sourceIndex = parseInt(source.droppableId.split("-")[1]);
      const destIndex = parseInt(destination.droppableId.split("-")[1]);
      
      const newPositions = [...positionSlots];
      const sourcePlayer = newPositions[sourceIndex].player;
      const destPlayer = newPositions[destIndex].player;
      
      newPositions[sourceIndex].player = destPlayer;
      newPositions[destIndex].player = sourcePlayer;
      
      setPositionSlots(newPositions);
    }

    if (onPlayerMove) {
      onPlayerMove(result);
    }
  };

  const isCurrentUserCaptain = teamCaptains.includes(currentUserId);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        {/* Team Formation Title */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">Formation: {formation}</h2>
        </div>
        
        {/* Sport Field */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full aspect-[2/3] rounded-lg overflow-hidden"
        >
          <FieldLayout className="absolute inset-0" />

          {/* Position Slots */}
          {positionSlots.map((slot, index) => (
            <Droppable key={slot.id} droppableId={slot.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: slot.position.top,
                    left: slot.position.left,
                    width: "60px",
                    height: "60px"
                  }}
                >
                  {slot.player ? (
                    <Draggable
                      draggableId={`player-${slot.player.id}`}
                      index={0}
                      isDragDisabled={!isCurrentUserCaptain}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "w-full h-full cursor-pointer",
                            snapshot.isDragging && "z-50"
                          )}
                          onClick={() => onPlayerClick?.(slot.player!)}
                        >
                          <PlayerPosition player={slot.player} />
                        </div>
                      )}
                    </Draggable>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 border-2 border-dashed border-white/40 rounded-full flex items-center justify-center">
                        <span className="text-white/60 text-xs">+</span>
                      </div>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </motion.div>

        {/* Reserves Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            Reserves 
            <Badge variant="secondary" className="ml-2">
              {reservePlayers.length}
            </Badge>
          </h3>
          
          <Droppable droppableId="reserves" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex gap-3 p-4 rounded-lg border-2 border-dashed min-h-[80px] items-center",
                  snapshot.isDraggingOver 
                    ? "border-blue-400 bg-blue-400/10" 
                    : "border-white/20 bg-black/20"
                )}
              >
                {reservePlayers.map((player, index) => (
                  <Draggable
                    key={`reserve-${player.id}`}
                    draggableId={`reserve-${player.id}`}
                    index={index}
                    isDragDisabled={!isCurrentUserCaptain}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(
                          "flex-shrink-0",
                          snapshot.isDragging && "z-50"
                        )}
                        onClick={() => onPlayerClick?.(player)}
                      >
                        <PlayerPosition player={player} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {reservePlayers.length === 0 && (
                  <p className="text-white/60 text-sm italic">No reserve players</p>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {!isCurrentUserCaptain && (
          <div className="mt-2">
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Only team captains can move players
            </Badge>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}

interface PlayerPositionProps {
  player: Player;
  size?: "sm" | "md";
}

function PlayerPosition({ player, size = "md" }: PlayerPositionProps) {
  const isMobile = useIsMobile();
  const sizeClasses = {
    sm: isMobile ? "w-10 h-10" : "w-12 h-12",
    md: isMobile ? "w-12 h-12" : "w-14 h-14"
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], "border-2 border-white shadow-lg")}>
          <AvatarImage src={player.avatar} alt={player.name} />
          <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
            {player.firstName?.charAt(0) || player.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {player.isCaptain && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-black">C</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-white drop-shadow-md">
          {player.firstName || player.name.split(' ')[0]}
        </p>
        <p className="text-xs text-white/80 drop-shadow-md">
          {player.position.slice(0, 3).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

export default SportField;