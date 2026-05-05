/**
 * Live Scorekeeper Component
 * 
 * Real-time match scorekeeping interface for team captains.
 * Allows updating scores, recording events, and managing match timer.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/hooks/use-socket';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timer, Flag, Shield, UserX, UserCheck, Save } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo?: string | null;
}

interface MatchEvent {
  type: 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'PENALTY' | 'OWN_GOAL';
  playerId: string;
  playerName?: string;
  minute: number;
  team: 'home' | 'away';
  details?: Record<string, any>;
}

interface LiveScorekeeperProps {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  initialScore: { home: number; away: number };
  initialMinute?: number;
  initialStatus?: string;
  isAuthorized?: boolean;
}

export function LiveScorekeeper({
  matchId,
  homeTeam,
  awayTeam,
  initialScore,
  initialMinute = 0,
  initialStatus = 'SCHEDULED',
  isAuthorized = false,
}: LiveScorekeeperProps) {
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  // State
  const [minute, setMinute] = useState(initialMinute);
  const [homeScore, setHomeScore] = useState(initialScore.home);
  const [awayScore, setAwayScore] = useState(initialScore.away);
  const [isRunning, setIsRunning] = useState(initialStatus === 'LIVE');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<{ team: 'home' | 'away'; type: string } | null>(null);

  // Event form state
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [assistPlayer, setAssistPlayer] = useState('');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && minute < 90) {
      interval = setInterval(() => {
        setMinute((m) => Math.min(m + 1, 90));
      }, 60000); // Increment every minute (real-time)
    }
    return () => clearInterval(interval);
  }, [isRunning, minute]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('match:scoreUpdated', (data) => {
      if (data.matchId === matchId) {
        setHomeScore(data.homeScore);
        setAwayScore(data.awayScore);
        setMinute(data.minute);
      }
    });

    socket.on('match:eventOccurred', (data) => {
      if (data.matchId === matchId) {
        setEvents((prev) => [
          ...prev,
          {
            type: data.type,
            playerId: data.playerId,
            playerName: data.playerName,
            minute: data.minute,
            team: data.team,
          },
        ]);
      }
    });

    return () => {
      socket.off('match:scoreUpdated');
      socket.off('match:eventOccurred');
    };
  }, [socket, matchId]);

  // Join match room
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('match:join', { matchId });
      return () => {
        socket.emit('match:leave', { matchId });
      };
    }
  }, [socket, isConnected, matchId]);

  // Handle goal
  const handleGoal = useCallback((team: 'home' | 'away') => {
    if (!isAuthorized) {
      toast({
        title: 'Not Authorized',
        description: 'Only team captains can record events',
        variant: 'destructive',
      });
      return;
    }

    setPendingEvent({ team, type: 'GOAL' });
    setShowEventDialog(true);
  }, [isAuthorized, toast]);

  // Handle card
  const handleCard = useCallback((team: 'home' | 'away', cardType: 'yellow' | 'red') => {
    if (!isAuthorized) {
      toast({
        title: 'Not Authorized',
        description: 'Only team captains can record events',
        variant: 'destructive',
      });
      return;
    }

    setPendingEvent({ team, type: cardType === 'yellow' ? 'YELLOW_CARD' : 'RED_CARD' });
    setShowEventDialog(true);
  }, [isAuthorized, toast]);

  // Handle submit event
  const handleSubmitEvent = useCallback(async () => {
    if (!pendingEvent || !selectedPlayer) return;

    const newEvent: MatchEvent = {
      type: pendingEvent.type as MatchEvent['type'],
      playerId: selectedPlayer,
      minute,
      team: pendingEvent.team,
      ...(assistPlayer && pendingEvent.type === 'GOAL' && {
        details: { assist: assistPlayer },
      }),
    };

    // Emit via socket
    socket?.emit('match:event', {
      matchId,
      ...newEvent,
    }, (response: any) => {
      if (response?.success) {
        setEvents((prev) => [...prev, newEvent]);
        setShowEventDialog(false);
        setSelectedPlayer('');
        setAssistPlayer('');
        
        toast({
          title: 'Event Recorded',
          description: `${newEvent.type} recorded at ${minute}'`,
        });
      } else {
        toast({
          title: 'Error',
          description: response?.error || 'Failed to record event',
          variant: 'destructive',
        });
      }
    });
  }, [pendingEvent, selectedPlayer, assistPlayer, minute, socket, matchId, toast]);

  // Handle submit score
  const handleSubmitScore = useCallback(async () => {
    if (!isAuthorized) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/matches/${matchId}/live-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScore,
          awayScore,
          minute,
          status: minute >= 90 ? 'COMPLETED' : 'LIVE',
          events: events.map((e) => ({
            ...e,
            minute: e.minute,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Score Updated',
          description: 'Match score has been updated successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to update score');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update score',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, homeScore, awayScore, minute, events, isAuthorized, toast]);

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'GOAL':
        return '⚽';
      case 'YELLOW_CARD':
        return '🟨';
      case 'RED_CARD':
        return '🟥';
      case 'SUBSTITUTION':
        return '🔄';
      case 'PENALTY':
        return '🎯';
      case 'OWN_GOAL':
        return '🥅';
      default:
        return '📝';
    }
  };

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Only team captains can update the score
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Live Scorekeeper</span>
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'LIVE' : 'PAUSED'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timer */}
          <div className="flex items-center justify-between mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="text-3xl font-bold">{minute}&apos;</span>
            </div>
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
            >
              {isRunning ? 'Stop Timer' : 'Start Timer'}
            </Button>
          </div>

          {/* Score Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Home Team */}
            <div className="text-center p-4 border rounded-lg">
              <h3 className="font-bold text-lg mb-2">{homeTeam.name}</h3>
              <div className="text-5xl font-bold my-4">{homeScore}</div>
              <div className="space-y-2">
                <Button 
                  onClick={() => handleGoal('home')} 
                  size="sm" 
                  className="w-full"
                >
                  ⚽ Goal
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleCard('home', 'yellow')} 
                    size="sm" 
                    variant="outline"
                  >
                    🟨
                  </Button>
                  <Button 
                    onClick={() => handleCard('home', 'red')} 
                    size="sm" 
                    variant="outline"
                  >
                    🟥
                  </Button>
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="text-center p-4 border rounded-lg">
              <h3 className="font-bold text-lg mb-2">{awayTeam.name}</h3>
              <div className="text-5xl font-bold my-4">{awayScore}</div>
              <div className="space-y-2">
                <Button 
                  onClick={() => handleGoal('away')} 
                  size="sm" 
                  className="w-full"
                >
                  ⚽ Goal
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleCard('away', 'yellow')} 
                    size="sm" 
                    variant="outline"
                  >
                    🟨
                  </Button>
                  <Button 
                    onClick={() => handleCard('away', 'red')} 
                    size="sm" 
                    variant="outline"
                  >
                    🟥
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Event Log */}
          {events.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Event Log ({events.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {events.map((event, idx) => (
                  <div
                    key={idx}
                    className="text-sm p-2 bg-muted rounded flex items-center justify-between"
                  >
                    <span>
                      {event.minute}&apos; {getEventIcon(event.type)} {event.type.replace('_', ' ')}
                    </span>
                    <Badge variant="outline">
                      {event.team === 'home' ? homeTeam.name : awayTeam.name}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            onClick={handleSubmitScore} 
            className="mt-6 w-full"
            disabled={isSubmitting || !isConnected}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Score Update'}
          </Button>

          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Connecting to server...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record {pendingEvent?.type?.replace('_', ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="player">Player</Label>
              <Input
                id="player"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                placeholder="Player ID or name"
              />
            </div>

            {pendingEvent?.type === 'GOAL' && (
              <div>
                <Label htmlFor="assist">Assist (optional)</Label>
                <Input
                  id="assist"
                  value={assistPlayer}
                  onChange={(e) => setAssistPlayer(e.target.value)}
                  placeholder="Player ID or name"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmitEvent} className="flex-1">
                Record Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LiveScorekeeper;
