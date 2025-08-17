"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SportField } from "@/components/sport-field"
import { Player } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface FormationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormation: string;
  players: Player[];
  onSaveFormation: (formationName: string, playerPositions: any) => void;
  sport: string; // Add sport prop
}

export default function FormationBuilder({
  isOpen,
  onClose,
  currentFormation,
  players,
  onSaveFormation,
  sport,
}: FormationBuilderProps) {
  const [formationName, setFormationName] = useState(currentFormation);
  const [playerPositions, setPlayerPositions] = useState<any>({}); // This will store player positions on the field
  const { toast } = useToast();

  // Initialize player positions based on the current formation or default
  React.useEffect(() => {
    // For a real implementation, you'd load positions based on currentFormation
    // For now, we'll just use a placeholder or empty object
    setPlayerPositions({}); 
  }, [currentFormation]);

  const handlePlayerMove = (result: any) => {
    // This function would update playerPositions state based on drag-and-drop
    console.log("Player moved in builder:", result);
    // Example: setPlayerPositions(prev => ({ ...prev, [result.playerId]: result.newPosition }));
  };

  const handleSave = () => {
    if (!formationName.trim()) {
      toast({
        title: "Error",
        description: "Formation name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    onSaveFormation(formationName, playerPositions);
    toast({
      title: "Success",
      description: `Formation '${formationName}' saved successfully.`, 
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 text-white backdrop-blur-sm border-gray-800 max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Formation Builder</DialogTitle>
          <DialogDescription>Create or modify custom formations.</DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col space-y-4 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="formation-name">Formation Name</Label>
            <Input
              id="formation-name"
              value={formationName}
              onChange={(e) => setFormationName(e.target.value)}
              placeholder="e.g., My Custom 4-3-3"
              className="bg-gray-800/50 border-gray-700"
            />
          </div>

          <div className="flex-grow relative bg-green-700 rounded-lg overflow-hidden">
            {/* Placeholder for the SportField or a custom field component */}
            <h3 className="text-white text-center py-4">Drag and drop players here to build your formation</h3>
            {/* 
              In a full implementation, you would render a SportField or similar component here
              and pass it the `playerPositions` state and `handlePlayerMove` callback.
              You would also need a way to represent available players to drag onto the field.
            */}
            <SportField
              sport={sport}
              formation={currentFormation} // This might need to be dynamic based on builder actions
              players={[]} // Players to be dragged onto the field
              reserves={[]} // Reserves for the builder
              onPlayerMove={handlePlayerMove}
              onPlayerClick={() => {}} // No-op for builder
              currentUserId={null}
              teamCaptains={[]}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-800/50 border-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Formation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}