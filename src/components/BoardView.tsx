import { useState, useEffect, type DragEvent } from 'react'
import type { Application, Stage } from '../types'
import { STAGE_ORDER, STAGE_LABELS } from '../types'
import './BoardView.css'

interface Props {
  applications: Application[]
  onUpdateStage: (id: string, stage: Stage) => void
  onOpenDetail: (id: string) => void
  onAdd: () => void
}

const STAGE_THEME: Record<Stage, { dot: string; bg: string; border: string; text: string }> = {
  DRAFT:        { dot: '#5F5E5A', bg: '', border: '', text: '#5F5E5A' },
  APPLIED:      { dot: '#185FA5', bg: '', border: '', text: '#0C447C' },
  ASSESSMENT:   { dot: '#534AB7', bg: '', border: '', text: '#3C3489' },
  INTERVIEWING: { dot: '#854F0B', bg: '', border: '', text: '#633806' },
  WAITING:      { dot: '#0F6E56', bg: '', border: '', text: '#085041' },
  OFFER:        { dot: '#3B6D11', bg: '#EAF3DE', border: '#C0DD97', text: '#27500A' },
  ENDED:        { dot: '#B4B2A9', bg: '', border: '', text: '#888780' },
}

const PRIORITY_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  P0: { bg: '#FCEBEB', color: '#A32D2D', border: '#F7C1C1' },
  P1: { bg: '#FAEEDA', color: '#854F0B', border: '#FAC775' },
  P2: { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' },
  P3: { bg: '#F1EFE8', color: '#9C9B96', border: '#B4B2A9' },
}

function isDateUrgent(date: string): boolean {
  if (!date) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date + 'T00:00:00')
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  return diff >= 0 && diff <= 3
}

export default function BoardView({ applications, onUpdateStage, onOpenDetail, onAdd }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  // Track which stages are collapsed; empty stages start collapsed
  const [collapsed, setCollapsed] = useState<Set<Stage>>(() => {
    const grouped = new Map<Stage, number>()
    for (const s of STAGE_ORDER) grouped.set(s, 0)
    for (const app of applications) grouped.set(app.stage, (grouped.get(app.stage) ?? 0) + 1)
    const init = new Set<Stage>()
    for (const s of STAGE_ORDER) {
      if ((grouped.get(s) ?? 0) === 0) init.add(s)
    }
    return init
  })

  // When data changes, auto-expand columns that now have data
  const grouped = new Map<Stage, Application[]>()
  for (const s of STAGE_ORDER) grouped.set(s, [])
  for (const app of applications) {
    grouped.get(app.stage)?.push(app)
  }

  useEffect(() => {
    setCollapsed(prev => {
      let changed = false
      const next = new Set(prev)
      for (const s of STAGE_ORDER) {
        const count = grouped.get(s)?.length ?? 0
        if (count > 0 && next.has(s)) {
          next.delete(s)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [applications]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCollapse(stage: Stage) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  function handleDragStart(e: DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: DragEvent, stage: Stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stage)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e: DragEvent, stage: Stage) {
    e.preventDefault()
    setDragOver(null)
    if (dragId) {
      onUpdateStage(dragId, stage)
      setDragId(null)
      // Auto-expand if collapsed
      setCollapsed(prev => {
        if (!prev.has(stage)) return prev
        const next = new Set(prev)
        next.delete(stage)
        return next
      })
    }
  }

  return (
    <div className="board">
      {STAGE_ORDER.map(stage => {
        const items = grouped.get(stage) ?? []
        const theme = STAGE_THEME[stage]
        const isEnded = stage === 'ENDED'
        const isOffer = stage === 'OFFER'
        const isCollapsed = collapsed.has(stage)

        // Collapsed mini strip
        if (isCollapsed) {
          return (
            <div
              key={stage}
              className={`board__mini ${isEnded ? 'board__mini--ended' : ''} ${isOffer ? 'board__mini--offer' : ''}`}
              style={{ color: theme.text }}
              title={`点击展开：${STAGE_LABELS[stage]}（${items.length}）`}
              onClick={() => toggleCollapse(stage)}
              onDragOver={e => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage)}
            >
              <span className="board__mini-dot" style={{ background: theme.dot }} />
              <span className="board__mini-label">{STAGE_LABELS[stage]}</span>
              <span className="board__mini-count">{items.length}</span>
            </div>
          )
        }

        // Full column
        return (
          <div
            key={stage}
            className={`board__column ${dragOver === stage ? 'board__column--dragover' : ''} ${isOffer ? 'board__column--offer' : ''} ${isEnded ? 'board__column--ended' : ''}`}
            style={isOffer && !dragOver ? { background: theme.bg, borderColor: theme.border } : undefined}
            onDragOver={e => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage)}
          >
            <div className="board__column-header">
              <span className="board__col-title">
                <span className="board__col-dot" style={{ background: theme.dot }} />
                {STAGE_LABELS[stage]}
              </span>
              <div className="board__col-header-right">
                <span className="board__count">{items.length}</span>
                <button
                  className="board__collapse-btn"
                  onClick={() => toggleCollapse(stage)}
                  title="折叠此列"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M9 4.5L6 7.5L3 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="board__cards">
              {items.map(app => {
                const pt = PRIORITY_CHIP[app.priority]
                const isDraft = !app.company && !app.position
                const urgent = isDateUrgent(app.keyDate)
                return isDraft ? (
                  <div
                    key={app.id}
                    className="board__card-draft"
                    onClick={() => onOpenDetail(app.id)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><path d="M6 4v4M4 6h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                    点击补全公司和岗位信息
                  </div>
                ) : (
                  <div
                    key={app.id}
                    className={`board__card ${dragId === app.id ? 'board__card--dragging' : ''}`}
                    style={{ borderLeftColor: theme.dot }}
                    draggable
                    onDragStart={e => handleDragStart(e, app.id)}
                    onClick={() => onOpenDetail(app.id)}
                  >
                    <div className="board__card-company">{app.company}</div>
                    <div className="board__card-pos">{[app.position, app.city].filter(Boolean).join(' · ')}</div>
                    <div className="board__card-meta">
                      <span
                        className="board__card-chip"
                        style={{ background: pt.bg, color: pt.color, border: `0.5px solid ${pt.border}` }}
                      >
                        {app.priority}
                      </span>
                      {app.keyDate && (
                        <span className={`board__card-date ${urgent ? 'board__card-date--urgent' : ''}`}>
                          {app.keyDate.slice(5)}{urgent ? ' ⚡' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && (
                <div className="board__empty-text">暂无记录</div>
              )}
            </div>
            <button className="board__add-btn" onClick={onAdd}>+ 快速新增</button>
          </div>
        )
      })}
    </div>
  )
}
