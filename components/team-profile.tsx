"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TeamChat from "@/components/team-chat";
import TeamInviteManager from "@/components/team-invite-manager";

type Player = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  image?: string | null;
  position?: string | null;
  preferredPositions: string[];
  bio?: string | null;
  email: string;
  phone?: string | null;
  location?: string | null;
  rating?: number | null;
  stats: {
    matches: number;
    goals: number;
    assists: number;
    rating: number;
  };
  teams: string[];
  isCaptain: boolean;
};

type Team = {
  id: string;
  name: string;
  logo?: string | null;
  bio?: string | null;
  formation: string;
  location?: string | null;
  isPrivate: boolean;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  captains: string[];
  players: Player[];
  reserves: Player[];
};

export default function TeamProfile() {
  const { data: session } = useSession();
  const params = useParams();
  const teamId = params.id as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !session?.user?.id) return;

    const fetchTeam = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch team");
        }
        const data = await response.json();
        setTeam(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId, session]);

  if (loading) return <div>Loading team profile...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!team) return <div>Team not found.</div>;

  const isTeamMember = team.players.some(p => p.id === session?.user?.id) || team.reserves.some(r => r.id === session?.user?.id);
  const isCaptainOrCreator = team.captains.includes(session?.user?.id || '') || team.createdBy === session?.user?.id;

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={team.logo || "/placeholder-logo.png"} alt={team.name} />
            <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-3xl">{team.name}</CardTitle>
            <p className="text-gray-600">{team.bio}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary">{team.formation}</Badge>
              {team.location && <Badge variant="secondary">{team.location}</Badge>}
              {team.isPrivate && <Badge variant="destructive">Private</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{team.wins}</p>
              <p className="text-sm text-gray-500">Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{team.losses}</p>
              <p className="text-sm text-gray-500">Losses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{team.draws}</p>
              <p className="text-sm text-gray-500">Draws</p>
            </div>
          </div>
          <p className="text-lg font-semibold mt-4">Team Rating: {team.rating.toFixed(1)}</p>

          <h3 className="text-xl font-bold mt-6 mb-3">Players ({team.players.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.players.map((player) => (
              <Card key={player.id}>
                <CardContent className="flex items-center p-4">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={player.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{player.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{player.name || player.email}</p>
                    <p className="text-sm text-gray-500">{player.position}</p>
                    {player.isCaptain && <Badge className="mt-1">Captain</Badge>}
                    <div className="text-xs text-gray-500 mt-1">
                      Matches: {player.stats.matches} | Goals: {player.stats.goals} | Assists: {player.stats.assists}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {team.reserves.length > 0 && (
            <>
              <h3 className="text-xl font-bold mt-6 mb-3">Reserves ({team.reserves.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.reserves.map((player) => (
                  <Card key={player.id}>
                    <CardContent className="flex items-center p-4">
                      <Avatar className="h-12 w-12 mr-3">
                        <AvatarImage src={player.image || "/placeholder-user.jpg"} />
                        <AvatarFallback>{player.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{player.name || player.email}</p>
                        <p className="text-sm text-gray-500">{player.position}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          Matches: {player.stats.matches} | Goals: {player.stats.goals} | Assists: {player.stats.assists}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isTeamMember && (
        <div className="mt-8">
          <TeamChat teamId={teamId} />
        </div>
      )}

      {isCaptainOrCreator && (
        <div className="mt-8">
          <TeamInviteManager teamId={teamId} />
        </div>
      )}
    </div>
  );
}