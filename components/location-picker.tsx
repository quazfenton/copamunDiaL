import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { MapPin } from "lucide-react";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const SUGGESTED_LOCATIONS = [
  "Main City Stadium",
  "Community Sports Complex",
  "Central Park Field",
  "Recreation Center",
];

export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
        >
          {value || "Select location..."}
          <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search locations..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mb-2"
          />
          <div className="space-y-1">
            {SUGGESTED_LOCATIONS.map((location) => (
              <Button
                key={location}
                variant="ghost"
                className="w-full justify-start text-left font-normal"
                onClick={() => {
                  onChange(location);
                  setIsOpen(false);
                }}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {location}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};