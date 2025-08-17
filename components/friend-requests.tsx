import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { X, Check, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type Friendship = {
  id: string;
  status: string;
  friend: { id: number; name: string; email: string; image?: string };
  type: "incoming" | "outgoing";
};

interface FriendRequestsProps {
  currentUserId: number;
}

export default function FriendRequests({ currentUserId }: FriendRequestsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    
    const fetchRequests = async () => {
      try {
        const data = await apiClient.getFriendRequests(); // Assuming this API call exists
        setRequests(data);
      } catch (error: any) {
        console.error("Failed to fetch friend requests:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch friend requests.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [session, toast]);

  const handleUpdateFriendshipStatus = async (id: string, status: "accepted" | "declined") => {
    try {
      await apiClient.updateFriendshipStatus(id, status); // Assuming this API call exists
      setRequests(requests.filter(req => req.id !== id));
      toast({
        title: "Success",
        description: `Friend request ${status}.`,
      });
    } catch (error: any) {
      console.error(`Failed to ${status} request:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${status} request.`,
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="text-white">Loading friend requests...</div>;
  if (!requests.length) return <div className="text-white">No pending friend requests</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white mb-4">Friend Requests</h3>
      {requests.map(request => (
        <div key={request.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={request.friend.image} />
              <AvatarFallback>{request.friend.name?.charAt(0) || request.friend.email.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{request.friend.name || request.friend.email}</p>
              <p className="text-sm text-gray-400">
                {request.type === "incoming" ? "Incoming request" : "Outgoing request"}
              </p>
            </div>
          </div>
          
          {request.type === "incoming" && (
            <div className="flex space-x-2">
              <Button 
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleUpdateFriendshipStatus(request.id, "accepted")}
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button 
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                onClick={() => handleUpdateFriendshipStatus(request.id, "declined")}
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </div>
          )}
          {request.type === "outgoing" && (
            <Button 
              size="sm"
              variant="outline"
              className="border-gray-500 text-gray-400 hover:bg-gray-700 hover:text-white"
              disabled
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Pending
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}