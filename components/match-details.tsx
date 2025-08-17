"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSocket from "@/hooks/use-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Match = {
  id: string;
  homeTeam: { id: string; name: string; logo?: string | null };
  awayTeam: { id: string; name: string; logo?: string | null };
  date: string;
  location: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  homeScore?: number | null;
  awayScore?: number | null;
};

interface MatchDetailsProps {
  initialMatch: Match;
}

export default function MatchDetails({ initialMatch }: MatchDetailsProps) {
  const { data: session } = useSession();
  const [match, setMatch] = useState<Match>(initialMatch);
  const socket = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  useEffect(() => {
    if (!socket || !match.id) return;

    socket.emit("join-room", `match-${match.id}`);

    const handleScoreUpdate = (data: {
      homeScore?: number | null;
      awayScore?: number | null;
      status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
    }) => {
      setMatch((prevMatch) => ({
        ...prevMatch,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        status: data.status,
      }));
    };

    socket.on("score-update", handleScoreUpdate);

    return () => {
      socket.off("score-update", handleScoreUpdate);
      socket.emit("leave-room", `match-${match.id}`);
    };
  }, [socket, match.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </CardTitle>
        <div className="text-center text-gray-500">
          <p>{new Date(match.date).toLocaleString()}</p>
          <p>{match.location}</p>
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex justify-around items-center text-4xl font-bold">
          <div>{match.homeScore ?? 0}</div>
          <div>-</div>
          <div>{match.awayScore ?? 0}</div>
        </div>
        <Badge className="mt-4">{match.status}</Badge>
      </CardContent>
    </Card>
  );
}