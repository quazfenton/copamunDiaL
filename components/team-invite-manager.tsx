"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type TeamInvite = {
  id: string;
  teamId: string;
  fromId: string;
  toId: string;
  message?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  team: {
    id: string;
    name: string;
    logo?: string | null;
  };
  from: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
  to: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
};

interface TeamInviteManagerProps {
  teamId?: string; // Optional, if managing invites for a specific team
}

export default function TeamInviteManager({ teamId }: TeamInviteManagerProps) {
  const { data: session } = useSession();
  const [sentInvites, setSentInvites] = useState<TeamInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<TeamInvite[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteMessage, setNewInviteMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchInvites();
  }, [session, teamId]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      // Fetch received invites for the current user
      const receivedResponse = await fetch(`/api/teams/${teamId || 'any'}/invites?type=received`);
      const receivedData = await receivedResponse.json();
      setReceivedInvites(receivedData);

      // Fetch sent invites by the current user (if teamId is provided, filter by team)
      const sentResponse = await fetch(`/api/teams/${teamId || 'any'}/invites?type=sent`);
      const sentData = await sentResponse.json();
      setSentInvites(sentData);

    } catch (error) {
      console.error("Failed to fetch invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!newInviteEmail.trim() || !teamId) return;
    setSending(true);

    try {
      // First, find the user by email to get their ID
      const userResponse = await fetch(`/api/players?email=${newInviteEmail}`);
      const userData = await userResponse.json();
      if (!userResponse.ok || userData.length === 0) {
        alert("User with that email not found.");
        setSending(false);
        return;
      }
      const toUserId = userData.id;

      const response = await fetch(`/api/teams/${teamId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, message: newInviteMessage }),
      });

      if (response.ok) {
        alert("Invite sent successfully!");
        setNewInviteEmail("");
        setNewInviteMessage("");
        fetchInvites(); // Refresh invites
      } else {
        const errorData = await response.json();
        alert(`Failed to send invite: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("An unexpected error occurred while sending the invite.");
    } finally {
      setSending(false);
    }
  };

  const handleRespondToInvite = async (inviteId: string, status: "ACCEPTED" | "DECLINED") => {
    try {
      const response = await fetch(`/api/teams/${inviteId}/invites`, { // Note: using inviteId as param
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        alert(`Invite ${status.toLowerCase()}!`);
        fetchInvites(); // Refresh invites
      } else {
        const errorData = await response.json();
        alert(`Failed to respond to invite: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error responding to invite:", error);
      alert("An unexpected error occurred while responding to the invite.");
    }
  };

  if (loading) return <div>Loading team invites...</div>;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Team Invite Management</h2>

      {teamId && (
        <Card>
          <CardHeader>
            <CardTitle>Send Team Invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Recipient Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={newInviteEmail}
                onChange={(e) => setNewInviteEmail(e.target.value)}
                placeholder="Enter recipient's email"
              />
            </div>
            <div>
              <Label htmlFor="inviteMessage">Message (Optional)</Label>
              <Input
                id="inviteMessage"
                value={newInviteMessage}
                onChange={(e) => setNewInviteMessage(e.target.value)}
                placeholder="e.g., Join our team!"
              />
            </div>
            <Button onClick={handleSendInvite} disabled={sending}>
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      <h3 className="text-xl font-bold mt-8">Received Invites</h3>
      {receivedInvites.length === 0 ? (
        <p>No pending team invites.</p>
      ) : (
        <div className="grid gap-4">
          {receivedInvites.map((invite) => (
            <Card key={invite.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={invite.from.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{invite.from.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {invite.from.name || invite.from.email} invited you to join{" "}
                      <span className="font-semibold">{invite.team.name}</span>
                    </p>
                    {invite.message && <p className="text-sm text-gray-500">"{invite.message}"</p>}
                  </div>
                </div>
                {invite.status === "PENDING" && (
                  <div className="flex space-x-2">
                    <Button onClick={() => handleRespondToInvite(invite.id, "ACCEPTED")}>Accept</Button>
                    <Button variant="outline" onClick={() => handleRespondToInvite(invite.id, "DECLINED")}>Decline</Button>
                  </div>
                )}
                {invite.status !== "PENDING" && (
                  <p className={`font-semibold ${invite.status === "ACCEPTED" ? "text-green-600" : "text-red-600"}`}>
                    {invite.status}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-xl font-bold mt-8">Sent Invites</h3>
      {sentInvites.length === 0 ? (
        <p>No team invites sent.</p>
      ) : (
        <div className="grid gap-4">
          {sentInvites.map((invite) => (
            <Card key={invite.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={invite.to.image || "/placeholder-user.jpg"} />
                    <AvatarFallback>{invite.to.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      You invited {invite.to.name || invite.to.email} to join{" "}
                      <span className="font-semibold">{invite.team.name}</span>
                    </p>
                    {invite.message && <p className="text-sm text-gray-500">"{invite.message}"</p>}
                  </div>
                </div>
                <p className={`font-semibold ${invite.status === "PENDING" ? "text-yellow-600" : invite.status === "ACCEPTED" ? "text-green-600" : "text-red-600"}`}>
                  {invite.status}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}