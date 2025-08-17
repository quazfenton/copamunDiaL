"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import MapView from "@/components/map-view";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GameLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  type: "match" | "pickup";
  details?: string;
}

export default function MapPage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(50); // Default radius in km
  const [sportFilter, setSportFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Error getting user location:", err);
          // Default to a central location if geolocation fails
          setUserLocation({ lat: 34.052235, lng: -118.243683 }); // Los Angeles
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      setUserLocation({ lat: 34.052235, lng: -118.243683 }); // Los Angeles
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !userLocation) return;

    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("latitude", userLocation.lat.toString());
        queryParams.append("longitude", userLocation.lng.toString());
        queryParams.append("radius", radius.toString());
        if (sportFilter) queryParams.append("sport", sportFilter);
        if (dateFilter) queryParams.append("date", dateFilter);

        const [matchesResponse, pickupGamesResponse] = await Promise.all([
          fetch(`/api/matches?${queryParams.toString()}`),
          fetch(`/api/pickup-games?${queryParams.toString()}`),
        ]);

        if (!matchesResponse.ok) throw new Error("Failed to fetch matches");
        if (!pickupGamesResponse.ok) throw new Error("Failed to fetch pickup games");

        const matches = await matchesResponse.json();
        const pickupGames = await pickupGamesResponse.json();

        const gameLocations: GameLocation[] = [];

        matches.forEach((match: any) => {
          if (match.latitude && match.longitude) {
            gameLocations.push({
              id: match.id,
              latitude: match.latitude,
              longitude: match.longitude,
              name: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
              type: "match",
              details: `Date: ${new Date(match.date).toLocaleDateString()} | Status: ${match.status}`,
            });
          }
        });

        pickupGames.forEach((game: any) => {
          if (game.latitude && game.longitude) {
            gameLocations.push({
              id: game.id,
              latitude: game.latitude,
              longitude: game.longitude,
              name: `${game.sport} Pickup Game`,
              type: "pickup",
              details: `Date: ${new Date(game.date).toLocaleDateString()} | Players Needed: ${game.playersNeeded}`,
            });
          }
        });

        setLocations(gameLocations);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [session, userLocation, radius, sportFilter, dateFilter]);

  const handleMarkerClick = (location: GameLocation) => {
    alert(`Clicked on: ${location.name}\nDetails: ${location.details}`);
    // In a real app, you'd navigate to a detail page or open a modal
  };

  if (!userLocation) return <div>Getting your location...</div>;
  if (loading) return <div>Loading games on map...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Discover Games Near You</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filter Games</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="radius">Search Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              min="1"
              max="200"
            />
          </div>
          <div>
            <Label htmlFor="sportFilter">Sport</Label>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sports</SelectItem>
                <SelectItem value="Soccer">Soccer</SelectItem>
                <SelectItem value="Basketball">Basketball</SelectItem>
                <SelectItem value="Volleyball">Volleyball</SelectItem>
                {/* Add more sports as needed */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dateFilter">Date</Label>
            <Input
              id="dateFilter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <MapView
        locations={locations}
        center={userLocation}
        zoom={12}
        onMarkerClick={handleMarkerClick}
      />
    </div>
  );
}