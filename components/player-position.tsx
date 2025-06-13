import { motion } from "framer-motion";

interface PlayerPositionProps {
  x: number;
  y: number;
  number: number;
  name: string;
  onClick?: () => void;
}

export const PlayerPosition = ({ x, y, number, name, onClick }: PlayerPositionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-pitch relative group transition-all hover:scale-105 cursor-pointer">
        <span className="font-semibold">{number}</span>
      </div>
      <span className="text-white text-sm font-medium drop-shadow-md">
        {name}
      </span>
    </motion.div>
  );
};