import { Award, Boxes, Brain, Flame, Footprints, Heart, Shapes, Sparkles } from 'lucide-react'

// badges.json stores icon names as strings; this turns them into lucide icons.
// Listed by hand (not `import *`) so only these icons end up in the bundle.
const ICONS = { Boxes, Brain, Flame, Footprints, Heart, Shapes, Sparkles }

export default function BadgeIcon({ name, className = 'h-6 w-6' }) {
  const Icon = ICONS[name] ?? Award
  return <Icon aria-hidden="true" className={className} />
}
