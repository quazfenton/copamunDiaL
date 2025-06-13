import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FormationSelector({ formations, selectedFormation, onSelectFormation }) {
  return (
    <div className="mb-4">
      <label htmlFor="formation-select" className="block text-sm font-medium text-gray-300 mb-2">
        Select Formation
      </label>
      <Select value={selectedFormation} onValueChange={onSelectFormation}>
        <SelectTrigger id="formation-select" className="w-full">
          <SelectValue placeholder="Select a formation" />
        </SelectTrigger>
        <SelectContent>
          {formations.map((formation) => (
            <SelectItem key={formation} value={formation}>
              {formation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

