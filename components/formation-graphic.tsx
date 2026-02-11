"use client"

import { useDrag, useDrop } from "react-dnd"
import { motion } from "framer-motion"
import PlayerIcon from "@/components/player-icon"
import { formationPositions } from "@/lib/data"

interface FormationGraphicProps {
  sport: string;
  formation: string;
  players: any[];
  onSwap: (fromIndex: number, toIndex: number) => void;
}

export default function FormationGraphic({ sport, formation, players, onSwap }: FormationGraphicProps) {
  const positions = (formationPositions as any)[sport]?.[formation] || []

  const getBackgroundImage = () => {
    switch (sport) {
      case "Soccer":
        return "url('/soccer-field.jpg')"
      case "Basketball":
        return "url('/basketball-court.jpg')"
      case "American Football":
        return "url('/football-field.jpg')"
      case "Baseball":
        return "url('/baseball-field.jpg')"
      default:
        return "url('/soccer-field.jpg')"
    }
  }

  const backgroundStyle = {
    backgroundImage: getBackgroundImage(),
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden" style={backgroundStyle}>
      {positions.map((position: { top: string; left: string }, index: number) => (
        <PlayerPosition
          key={index}
          index={index}
          position={position}
          player={players[index]}
          onSwap={onSwap}
        />
      ))}
    </div>
  )
}

interface PlayerPositionProps {
  index: number;
  position: { top: string; left: string };
  player: any;
  onSwap: (fromIndex: number, toIndex: number) => void;
}

function PlayerPosition({ index, position, player, onSwap }: PlayerPositionProps) {
  const [{ isOver }, drop] = useDrop({
    accept: "player-icon",
    drop: (item: { index: number }) => onSwap(item.index, index),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  })

  const [{ isDragging }, drag] = useDrag({
    type: "player-icon",
    item: { index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  const refCallback = (node: HTMLDivElement | null) => {
    if (node) {
      drag(drop(node));
    }
  };

  return (
    <motion.div
      ref={refCallback}
      className={`absolute ${isOver ? "bg-blue-500 bg-opacity-50 rounded-full p-2" : ""}`}
      style={{
        top: position.top,
        left: position.left,
        transform: "translate(-50%, -50%)",
        opacity: isDragging ? 0.5 : 1,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <PlayerIcon player={player} />
    </motion.div>
  )
}