"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type PlayerRecommendation = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  email: string;
  image?: string | null;
  position?: string | null;
  preferredPositions: string[];
  rating?: number | null;
  location?: string | null;
  ageGroup?: string | null;
  matches: number;
  goals: number;
  assists: number;
};

type TeamRecommendation = {
  id: string;
  name: string;
  logo?: string | null;
  bio?: string | null;
  location?: string | null;
  rating?: number | null;
  wins: number;
  losses: number;
  draws: number;
};

type MatchRecommendation = {
  id: string;
  date: string;
  location: string;
  homeTeam: { id: string; name: string; logo?: string | null };
  awayTeam: { id: string; name: string; logo?: string | null };
};

type Recommendation = PlayerRecommendation | TeamRecommendation | MatchRecommendation;

export default function Recommendations() {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendationType, setRecommendationType] = useState<"player" | "team" | "match">("player");
  const [sportFilter, setSportFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState<number | string>("");
  const [maxRatingFilter, setMaxRatingFilter] = useState<number | string>("");

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchRecommendations();
  }, [session, recommendationType, sportFilter, locationFilter, ageGroupFilter, minRatingFilter, maxRatingFilter]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("type", recommendationType);
      if (sportFilter) queryParams.append("sport", sportFilter);
      if (locationFilter) queryParams.append("location", locationFilter);
      if (ageGroupFilter) queryParams.append("ageGroup", ageGroupFilter);
      if (minRatingFilter) queryParams.append("minRating", minRatingFilter.toString());
      if (maxRatingFilter) queryParams.append("maxRating", maxRatingFilter.toString());

      const response = await fetch(`/api/recommendations?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch recommendations");
      }
      const data = await response.json();
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRecommendationCard = (rec: Recommendation) => {
    if (rec.type === "player") {
      const player = rec as PlayerRecommendation;
      return (
        <Card key={player.id}>
          <CardContent className="flex items-center p-4">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={player.image || "/placeholder-user.jpg"} />
              <AvatarFallback>{player.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{player.name || player.email}</p>
              <p className="text-sm text-gray-500">{player.position}</p>
              <p className="text-xs text-gray-500">Rating: {player.rating?.toFixed(1) || "N/A"}</p>
              <p className="text-xs text-gray-500">Preferred: {player.preferredPositions.join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      );
    } else if (rec.type === "team") {
      const team = rec as TeamRecommendation;
      return (
        <Card key={team.id}>
          <CardContent className="flex items-center p-4">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={team.logo || "/placeholder-logo.png"} />
              <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{team.name}</p>
              <p className="text-sm text-gray-500">{team.location}</p>
              <p className="text-xs text-gray-500">Rating: {team.rating?.toFixed(1) || "N/A"}</p>
              <p className="text-xs text-gray-500">W/L/D: {team.wins}/{team.losses}/{team.draws}</p>
            </div>
          </CardContent>
        </Card>
      );
    } else if (rec.type === "match") {
      const match = rec as MatchRecommendation;
      return (
        <Card key={match.id}>
          <CardContent className="p-4">
            <p className="font-semibold">{match.homeTeam.name} vs {match.awayTeam.name}</p>
            <p className="text-sm text-gray-500">Date: {new Date(match.date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">Location: {match.location}</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Recommendations</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filter Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="recommendationType">Recommend</Label>
            <Select value={recommendationType} onValueChange={(value) => setRecommendationType(value as "player" | "team" | "match")}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Players</SelectItem>
                <SelectItem value="team">Teams</SelectItem>
                <SelectItem value="match">Matches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sportFilter">Sport</Label>
            <Input
              id="sportFilter"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              placeholder="e.g., Soccer"
            />
          </div>
          <div>
            <Label htmlFor="locationFilter">Location</Label>
            <Input
              id="locationFilter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="e.g., Los Angeles"
            />
          </div>
          <div>
            <Label htmlFor="ageGroupFilter">Age Group</Label>
            <Input
              id="ageGroupFilter"
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value)}
              placeholder="e.g., U10, Adult"
            />
          </div>
          <div>
            <Label htmlFor="minRatingFilter">Min Rating</Label>
            <Input
              id="minRatingFilter"
              type="number"
              value={minRatingFilter}
              onChange={(e) => setMinRatingFilter(e.target.value)}
              placeholder="0.0"
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="maxRatingFilter">Max Rating</Label>
            <Input
              id="maxRatingFilter"
              type="number"
              value={maxRatingFilter}
              onChange={(e) => setMaxRatingFilter(e.target.value)}
              placeholder="5.0"
              step="0.1"
            />
          </div>
          <div className="col-span-full">
            <Button onClick={fetchRecommendations}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div>Loading recommendations...</div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : recommendations.length === 0 ? (
        <div>No recommendations found based on your criteria.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(renderRecommendationCard)}
        </div>
      )}
    </div>
  );
}