import React from 'react';

interface FieldLayoutProps {
  className?: string;
}

export const SoccerFieldLayout: React.FC<FieldLayoutProps> = ({ className }) => (
  <div
    className={`relative w-full h-full rounded-lg overflow-hidden border-2 border-white/20 ${className}`}
    style={{
      background: `
        linear-gradient(90deg, 
          #2a5a27 0%, 
          #326b2e 25%, 
          #2a5a27 50%, 
          #326b2e 75%, 
          #2a5a27 100%
        )
      `,
      backgroundSize: "100px 100%"
    }}
  >
    {/* Field Lines */}
    <div className="absolute inset-0">
      {/* Center Line */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 transform -translate-y-1/2" />
      {/* Center Circle */}
      <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/60 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      {/* Penalty Areas */}
      <div className="absolute top-2 left-1/4 right-1/4 h-16 border border-white/60" />
      <div className="absolute bottom-2 left-1/4 right-1/4 h-16 border border-white/60" />
      {/* Goal Areas */}
      <div className="absolute top-2 left-2/5 right-2/5 h-8 border border-white/60" />
      <div className="absolute bottom-2 left-2/5 right-2/5 h-8 border border-white/60" />
    </div>
  </div>
);

export const BasketballCourtLayout: React.FC<FieldLayoutProps> = ({ className }) => (
  <div
    className={`relative w-full h-full rounded-lg overflow-hidden border-2 border-white/20 ${className}`}
    style={{
      background: `linear-gradient(to bottom, #b87333, #8b4513)`,
    }}
  >
    {/* Court Lines */}
    <div className="absolute inset-0">
      {/* Half Court Line */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 transform -translate-y-1/2" />
      {/* Center Circle */}
      <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/60 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      {/* Free Throw Lines */}
      <div className="absolute top-0 left-1/4 w-1/2 h-24 border border-white/60" />
      <div className="absolute bottom-0 left-1/4 w-1/2 h-24 border border-white/60" />
      {/* Three-Point Lines */}
      <div className="absolute top-0 left-0 w-full h-full border-l-2 border-r-2 border-white/60 rounded-b-[50%] rounded-t-[50%]" />
    </div>
  </div>
);

export const AmericanFootballFieldLayout: React.FC<FieldLayoutProps> = ({ className }) => (
  <div
    className={`relative w-full h-full rounded-lg overflow-hidden border-2 border-white/20 ${className}`}
    style={{
      background: `linear-gradient(90deg, #4CAF50 0%, #66BB6A 25%, #4CAF50 50%, #66BB6A 75%, #4CAF50 100%)`,
      backgroundSize: "100px 100%"
    }}
  >
    {/* Field Lines */}
    <div className="absolute inset-0">
      {/* Yard Lines (simplified) */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute left-0 right-0 h-0.5 bg-white/60" style={{ top: `${(i + 1) * 10}%` }} />
      ))}
      {/* End Zones */}
      <div className="absolute top-0 left-0 w-full h-[10%] bg-red-700/50" />
      <div className="absolute bottom-0 left-0 w-full h-[10%] bg-blue-700/50" />
    </div>
  </div>
);

export const BaseballDiamondLayout: React.FC<FieldLayoutProps> = ({ className }) => (
  <div
    className={`relative w-full h-full rounded-lg overflow-hidden border-2 border-white/20 ${className}`}
    style={{
      background: `radial-gradient(circle at 50% 100%, #4CAF50 0%, #4CAF50 50%, #8B4513 50%, #8B4513 100%)`,
    }}
  >
    {/* Diamond Lines (simplified) */}
    <div className="absolute inset-0">
      {/* Home Plate */}
      <div className="absolute bottom-[5%] left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white rotate-45" />
      {/* Bases */}
      <div className="absolute top-[20%] left-[20%] w-6 h-6 bg-white rotate-45" />
      <div className="absolute top-[20%] right-[20%] w-6 h-6 bg-white rotate-45" />
      <div className="absolute bottom-[20%] left-[20%] w-6 h-6 bg-white rotate-45" />
    </div>
  </div>
);

export const getFieldLayout = (sport: string) => {
  switch (sport) {
    case "Soccer":
      return SoccerFieldLayout;
    case "Basketball":
      return BasketballCourtLayout;
    case "American Football":
      return AmericanFootballFieldLayout;
    case "Baseball":
      return BaseballDiamondLayout;
    default:
      return SoccerFieldLayout; // Default to soccer
  }
};
