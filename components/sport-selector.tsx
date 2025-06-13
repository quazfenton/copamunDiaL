import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SportSelector({ sports, selectedSport, onSelectSport }) {
  return (
    <div className="mb-4">
      <label htmlFor="sport-select" className="block text-sm font-medium text-gray-300 mb-2">
        Select Sport
      </label>
      <Select value={selectedSport} onValueChange={onSelectSport}>
        <SelectTrigger id="sport-select" className="w-full">
          <SelectValue placeholder="Select a sport" />
        </SelectTrigger>
        <SelectContent>
          {sports.map((sport) => (
            <SelectItem key={sport} value={sport}>
              {sport}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

