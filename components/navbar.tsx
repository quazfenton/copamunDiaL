import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <nav className="flex justify-between items-center mb-8">
      <Link href="/" className="text-2xl font-bold">
        Sports Manager
      </Link>
      <Button variant="ghost" onClick={onMenuClick}>
        <Menu />
      </Button>
    </nav>
  )
}

