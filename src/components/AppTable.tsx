import { useState, useRef, useEffect, useCallback } from 'react'
import type { Application, Stage, Priority } from '../types'
import { STAGE_LABELS, STAGE_ORDER } from '../types'
import './AppTable.css'

interface Props {
  applications: Application[]
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onUpdate: (id: string, changes: Partial<Application>) => void
  onUpdateStage: (id: string, stage: Stage) => void
  onOpenDetail: (id: string) => void
  onDelete: (id: string) => void
}

const STAGE_THEME: Record<Stage, { bg: string; color: string; border: string; dot: string }> = {
  DRAFT:        { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9', dot: '#5F5E5A' },
  APPLIED:      { bg: '#E6F1FB', color: '#0C447C', border: '#B5D4F4', dot: '#185FA5' },
  ASSESSMENT:   { bg: '#EEEDFE', color: '#3C3489', border: '#CECBF6', dot: '#534AB7' },
  INTERVIEWING: { bg: '#FAEEDA', color: '#633806', border: '#FAC775', dot: '#854F0B' },
  WAITING:      { bg: '#E1F5EE', color: '#085041', border: '#9FE1CB', dot: '#0F6E56' },
  OFFER:        { bg: '#EAF3DE', color: '#3B6D11', border: '#C0DD97', dot: '#3B6D11' },
  ENDED:        { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7', dot: '#B4B2A9' },
}

const PRIORITY_THEME: Record<Priority, { bg: string; color: string; border: string }> = {
  P0: { bg: '#FCEBEB', color: '#A32D2D', border: '#F7C1C1' },
  P1: { bg: '#FAEEDA', color: '#854F0B', border: '#FAC775' },
  P2: { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' },
  P3: { bg: '#F1EFE8', color: '#9C9B96', border: '#B4B2A9' },
}

export default function AppTable({
  applications, selected, onToggleSelect, onToggleAll,
  onUpdate, onUpdateStage, onOpenDetail, onDelete,
}: Props) {
  const allSelected = applications.length > 0 && selected.size === applications.length

  if (applications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="28" rx="4" stroke="#B4B2A9" strokeWidth="1.5"/>
            <path d="M6 18h36M18 18v20" stroke="#B4B2A9" strokeWidth="1.5"/>
            <circle cx="12" cy="14" r="1.5" fill="#B4B2A9"/>
            <circle cx="12" cy="26" r="1.5" fill="#E0DED8"/>
            <circle cx="12" cy="32" r="1.5" fill="#E0DED8"/>
          </svg>
        </div>
        <p className="empty-state__title">还没有投递记录</p>
        <p className="empty-state__desc">点击「新增机会」开始记录你的求职进度，或导入已有的备份文件</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="app-table">
        <thead>
          <tr>
            <th className="col-check">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th className="col-info">公司 / 岗位</th>
            <th className="col-stage">阶段</th>
            <th className="col-next">下一步</th>
            <th className="col-date">关键日期</th>
            <th className="col-priority">优先级</th>
            <th className="col-channel">渠道</th>
            <th className="col-note">备注</th>
            <th className="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <AppRow
              key={app.id}
              app={app}
              checked={selected.has(app.id)}
              onToggle={() => onToggleSelect(app.id)}
              onUpdate={onUpdate}
              onUpdateStage={onUpdateStage}
              onOpenDetail={() => onOpenDetail(app.id)}
              onDelete={() => onDelete(app.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface RowProps {
  app: Application
  checked: boolean
  onToggle: () => void
  onUpdate: (id: string, changes: Partial<Application>) => void
  onUpdateStage: (id: string, stage: Stage) => void
  onOpenDetail: () => void
  onDelete: () => void
}

function AppRow({ app, checked, onToggle, onUpdate, onUpdateStage, onOpenDetail, onDelete }: RowProps) {
  const st = STAGE_THEME[app.stage]
  const pt = PRIORITY_THEME[app.priority]
  const isEnded = app.stage === 'ENDED'
  // Detect urgency: key date within 3 days
  const isUrgent = (() => {
    if (!app.keyDate || isEnded) return false
    const today = new Date(); today.setHours(0,0,0,0)
    const d = new Date(app.keyDate + 'T00:00:00')
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
    return diff >= 0 && diff <= 3
  })()

  const posCity = [app.position, app.city].filter(Boolean).join(' · ')

  return (
    <tr className={`app-row ${checked ? 'app-row--selected' : ''} ${isEnded ? 'app-row--ended' : ''} ${isUrgent ? 'app-row--urgent' : ''}`}>
      <td className="col-check" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
      </td>
      <td className="col-info" onClick={onOpenDetail}>
        <div className="info-cell">
          <span className="info-cell__company">
            {app.company || <span className="cell-placeholder">公司名</span>}
          </span>
          <span className="info-cell__position">
            {posCity || <span className="cell-placeholder">岗位名</span>}
          </span>
          {app.link && (
            <a href={app.link} target="_blank" rel="noopener noreferrer" className="info-cell__link" onClick={e => e.stopPropagation()} title="JD 链接">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 1H2.5A1.5 1.5 0 001 2.5v7A1.5 1.5 0 002.5 11h7A1.5 1.5 0 0011 9.5V7M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>
      </td>
      <td className="col-stage" onClick={e => e.stopPropagation()}>
        <div
          className="stage-select-wrap"
          style={{ background: st.bg, borderColor: st.border }}
        >
          <span className="stage-dot" style={{ background: st.dot }} />
          <select
            className="stage-select"
            style={{ color: st.color }}
            value={app.stage}
            onChange={e => onUpdateStage(app.id, e.target.value as Stage)}
          >
            {STAGE_ORDER.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="col-next" onClick={e => e.stopPropagation()}>
        <EditableCell
          value={app.nextAction}
          onSave={v => onUpdate(app.id, { nextAction: v })}
          placeholder="下一步动作..."
        />
      </td>
      <td className="col-date" onClick={e => e.stopPropagation()}>
        <div className="date-cell">
          <input
            className="inline-date"
            type="date"
            value={app.keyDate}
            onChange={e => onUpdate(app.id, { keyDate: e.target.value })}
          />
          <DateBadge date={app.keyDate} />
        </div>
      </td>
      <td className="col-priority" onClick={e => e.stopPropagation()}>
        <select
          className="priority-select"
          style={{ background: pt.bg, color: pt.color, borderColor: pt.border }}
          value={app.priority}
          onChange={e => onUpdate(app.id, { priority: e.target.value as Priority })}
        >
          {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="col-channel" onClick={e => e.stopPropagation()}>
        <EditableCell
          value={app.channel}
          onSave={v => onUpdate(app.id, { channel: v })}
          placeholder="渠道"
        />
      </td>
      <td className="col-note" onClick={e => e.stopPropagation()}>
        <EditableCell
          value={app.note}
          onSave={v => onUpdate(app.id, { note: v })}
          placeholder="备注..."
        />
      </td>
      <td className="col-actions" onClick={e => e.stopPropagation()}>
        <div className="row-actions">
          <button className="row-action-btn" onClick={onOpenDetail} title="详情">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M2 7h10M2 10.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          <button className="row-action-btn row-action-btn--delete" onClick={onDelete} title="删除">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M3.5 4v7.5a1 1 0 001 1h5a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

function EditableCell({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)

  useEffect(() => {
    if (!composingRef.current) setDraft(value)
  }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = useCallback(() => {
    if (composingRef.current) return
    setEditing(false)
    if (draft !== value) onSave(draft)
  }, [draft, value, onSave])

  if (!editing) {
    return (
      <span
        className={`cell-text ${!value ? 'cell-text--placeholder' : ''}`}
        title={value || undefined}
        onClick={e => { e.stopPropagation(); setEditing(true) }}
      >
        {value || placeholder}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      className="cell-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onCompositionStart={() => { composingRef.current = true }}
      onCompositionEnd={() => { composingRef.current = false }}
      onBlur={commit}
      onKeyDown={e => {
        if (composingRef.current) return
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

function DateBadge({ date }: { date: string }) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date + 'T00:00:00')
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let className = 'date-badge'
  let text = ''
  if (diff < 0) { className += ' date-badge--past'; text = `${-diff}天前` }
  else if (diff === 0) { className += ' date-badge--urgent'; text = '今天' }
  else if (diff === 1) { className += ' date-badge--urgent'; text = '明天' }
  else if (diff <= 3) { className += ' date-badge--soon'; text = `${diff}天后` }
  else if (diff <= 7) { className += ' date-badge--normal'; text = `${diff}天后` }
  else { text = `${diff}天后` }

  return <span className={className}>{text}</span>
}
