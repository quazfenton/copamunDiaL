"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Player } from "@/lib/types";

interface FriendsListProps {
  currentUserId: number;
}

export default function FriendsList({ currentUserId }: FriendsListProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchFriends();
    }
  }, [session, currentUserId]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getFriends(); // Assuming this API call exists
      setFriends(data);
    } catch (error: any) {
      console.error("Failed to fetch friends:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch friends.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await apiClient.searchPlayers({ search: searchTerm }); // Assuming searchPlayers exists
      setSearchResults(results.filter((p: Player) => p.id !== currentUserId && !friends.some(f => f.id === p.id)));
    } catch (error: any) {
      console.error("Failed to search players:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to search players.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await apiClient.sendFriendRequest(toUserId); // Assuming this API call exists
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent.",
      });
      setSearchResults(searchResults.filter(p => p.id !== toUserId)); // Remove from search results
    } catch (error: any) {
      console.error("Failed to send friend request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="text-white">Loading friends...</div>;

  return (
    <div className="space-y-6 p-4 bg-black/90 text-white rounded-lg border border-gray-800">
      <h2 className="text-2xl font-bold mb-4">My Friends</h2>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search for players to add..."
            className="bg-gray-800/50 border-gray-700 pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <Button 
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Search Results</h3>
            {searchResults.map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 border border-gray-700 rounded-lg bg-gray-800/50">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{player.name}</p>
                </div>
                <Button size="sm" onClick={() => handleSendFriendRequest(player.id)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Friend
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">My Connections ({friends.length})</h3>
        {friends.length > 0 ? (
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-gray-800/50">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.avatar} />
                  <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{friend.name}</p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
                <Button size="sm" variant="outline" className="border-gray-500 text-gray-400 hover:bg-gray-700 hover:text-white">
                  View Profile
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">You don't have any friends yet. Search for players to add!</p>
        )}
      </div>
    </div>
  );
}