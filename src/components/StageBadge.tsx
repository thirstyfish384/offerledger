import type { Stage } from '../types'
import { STAGE_LABELS } from '../types'
import './StageBadge.css'

export default function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`stage-badge stage-badge--${stage.toLowerCase()}`}>
      <span className="stage-badge__dot" />
      {STAGE_LABELS[stage]}
    </span>
  )
}
