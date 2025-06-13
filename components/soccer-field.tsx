import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Player } from "@/types/player";
import { Draggable } from "@hello-pangea/dnd";

interface SoccerFieldProps {
  className?: string;
  formation: string;
  players: Player[];
}

const formationPositions: Record<string, { x: number; y: number }[]> = {
  "4-4-2": [
    { x: 50, y: 10 },  // GK
    { x: 30, y: 30 },  // LB
    { x: 50, y: 30 },  // CB1
    { x: 70, y: 30 },  // CB2
    { x: 90, y: 30 },  // RB
    { x: 20, y: 50 },  // LM
    { x: 40, y: 50 },  // CM1
    { x: 60, y: 50 },  // CM2
    { x: 80, y: 50 },  // RM
    { x: 40, y: 70 },  // ST1
    { x: 60, y: 70 },  // ST2
  ],
  // Add other formations...
};

export const SoccerField = ({ className, formation, players }: SoccerFieldProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "w-full aspect-[2/3] rounded-md relative overflow-hidden",
        "bg-gradient-to-b from-[#2a5a27] to-[#326b2e]",
        className
      )}
    >
      {players && players.map((player, index) => {
        const position = formationPositions[formation] && formationPositions[formation][index];
        if (!position) return null;
        
        return (
          <Draggable key={player.id} draggableId={player.id.toString()} index={index}>
            {(provided) => (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center">
                  <span className="font-semibold">{player.position}</span>
                </div>
                <div className="text-xs text-center mt-1 text-white/80">
                  {player.name}
                </div>
              </div>
            )}
          </Draggable>
        );
      })}
    </motion.div>
  );
};