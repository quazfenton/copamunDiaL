"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import useSocket from "@/hooks/use-socket";

type Message = {
  id: string;
  content: string;
  type: "TEXT" | "IMAGE";
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
};

interface TeamChatProps {
  teamId: string;
}

export default function TeamChat({ teamId }: TeamChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  useEffect(() => {
    if (!session?.user?.id || !teamId) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/messages`);
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [session, teamId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-room", `team-${teamId}`);

    const handleNewMessage = (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.emit("leave-room", `team-${teamId}`);
    };
  }, [socket, teamId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session?.user?.id || !teamId || !socket) return;

    const messageData = {
      content: newMessage,
      type: "TEXT",
      teamId: teamId,
      userId: session.user.id,
      user: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image,
      },
      createdAt: new Date().toISOString(),
    };

    socket.emit("send-message", messageData);
    setNewMessage("");
  };

  if (loading) return <div>Loading chat...</div>;

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader>
        <CardTitle>Team Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start ${
              message.user.id === session?.user?.id ? "justify-end" : "justify-start"
            }`}
          >
            {message.user.id !== session?.user?.id && (
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={message.user.image || "/placeholder-user.jpg"} />
                <AvatarFallback>{message.user.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`p-3 rounded-lg max-w-[70%] ${
                message.user.id === session?.user?.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              <p className="font-semibold text-sm">
                {message.user.id === session?.user?.id ? "You" : message.user.name || "Unknown User"}
              </p>
              <p>{message.content}</p>
              <p className="text-xs opacity-75 mt-1">
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
            {message.user.id === session?.user?.id && (
              <Avatar className="h-8 w-8 ml-3">
                <AvatarImage src={message.user.image || "/placeholder-user.jpg"} />
                <AvatarFallback>{message.user.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </CardContent>
      <CardFooter className="flex items-center p-4 border-t">
        <Input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          className="flex-1 mr-2"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </CardFooter>
    </Card>
  );
}