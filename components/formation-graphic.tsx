"use client"

import { useDrag, useDrop } from "react-dnd"
import { motion } from "framer-motion"
import PlayerIcon from "@/components/player-icon"
import { formationPositions } from "@/lib/data"

export default function FormationGraphic({ sport, formation, players, onSwap }) {
  const positions = formationPositions[sport]?.[formation] || []

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
      {positions.map((position, index) => (
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

function PlayerPosition({ index, position, player, onSwap }) {
  const [{ isOver }, drop] = useDrop({
    accept: "player-icon",
    drop: (item) => onSwap(item.index, index),
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

  return (
    <motion.div
      ref={(node) => drag(drop(node))}
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