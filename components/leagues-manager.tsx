"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type League = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  teams: { team: { name: string } }[];
};

export default function LeaguesManager() {
  const { data: session } = useSession();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [newLeague, setNewLeague] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isPublic: true,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchLeagues();
  }, [session]);

  const fetchLeagues = async () => {
    try {
      const response = await fetch("/api/leagues");
      const data = await response.json();
      setLeagues(data);
    } catch (error) {
      console.error("Failed to fetch leagues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeague),
      });
      if (response.ok) {
        setNewLeague({ name: "", description: "", startDate: "", endDate: "", isPublic: true });
        fetchLeagues(); // Refresh the list
      } else {
        console.error("Failed to create league:", await response.json());
      }
    } catch (error) {
      console.error("Error creating league:", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div>Loading leagues...</div>;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">League Management</h2>

      <Card>
        <CardHeader>
          <CardTitle>Create New League</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="leagueName">League Name</Label>
            <Input
              id="leagueName"
              value={newLeague.name}
              onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
              placeholder="e.g., Summer Soccer League"
            />
          </div>
          <div>
            <Label htmlFor="leagueDescription">Description</Label>
            <Input
              id="leagueDescription"
              value={newLeague.description}
              onChange={(e) => setNewLeague({ ...newLeague, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={newLeague.startDate}
                onChange={(e) => setNewLeague({ ...newLeague, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={newLeague.endDate}
                onChange={(e) => setNewLeague({ ...newLeague, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={newLeague.isPublic}
              onCheckedChange={(checked) => setNewLeague({ ...newLeague, isPublic: checked })}
            />
            <Label htmlFor="isPublic">Public League</Label>
          </div>
          <Button onClick={handleCreateLeague} disabled={creating}>
            {creating ? "Creating..." : "Create League"}
          </Button>
        </CardContent>
      </Card>

      <h3 className="text-xl font-bold mt-8">Existing Leagues</h3>
      {leagues.length === 0 ? (
        <p>No leagues found. Create one above!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Card key={league.id}>
              <CardHeader>
                <CardTitle>{league.name}</CardTitle>
                <p className="text-sm text-gray-500">{league.description}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Dates: {new Date(league.startDate).toLocaleDateString()} -{" "}
                  {new Date(league.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm">Created by: {league.creator?.name || league.creator?.email}</p>
                <p className="text-sm">Teams: {league.teams.length}</p>
                {/* Add more league details here */}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}