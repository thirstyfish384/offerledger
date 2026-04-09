import { useEffect, useState, useRef } from 'react'
import type { Application, Stage, Priority, EndReason } from '../types'
import { STAGE_LABELS, STAGE_ORDER, PRIORITY_LABELS, END_REASON_LABELS } from '../types'
import { getSuggestion, getOffsetDate } from '../utils/nextActionSuggestions'
import StageBadge from './StageBadge'
import './DetailDrawer.css'

const STAGE_TIMELINE_COLOR: Record<Stage, string> = {
  DRAFT: '#5F5E5A',
  APPLIED: '#185FA5',
  ASSESSMENT: '#534AB7',
  INTERVIEWING: '#854F0B',
  WAITING: '#0F6E56',
  OFFER: '#3B6D11',
  ENDED: '#993C1D',
}

const INITIAL_BG: Record<number, { bg: string; color: string; border: string }> = {
  0: { bg: '#EEEDFE', color: '#3C3489', border: '#CECBF6' },
  1: { bg: '#E6F1FB', color: '#0C447C', border: '#B5D4F4' },
  2: { bg: '#E1F5EE', color: '#085041', border: '#9FE1CB' },
  3: { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  4: { bg: '#FAECE7', color: '#712B13', border: '#F5C4B3' },
}

function getInitialStyle(name: string) {
  const idx = (name.charCodeAt(0) || 0) % 5
  return INITIAL_BG[idx]
}

interface Props {
  app: Application | null
  onClose: () => void
  onUpdate: (id: string, changes: Partial<Application>) => void
  onUpdateStage: (id: string, stage: Stage, endReason?: EndReason) => void
  onDelete: (id: string) => void
}

export default function DetailDrawer({ app, onClose, onUpdate, onUpdateStage, onDelete }: Props) {
  const [suggestion, setSuggestion] = useState<{ nextAction: string; keyDate?: string } | null>(null)

  useEffect(() => {
    setSuggestion(null)
  }, [app?.id])

  if (!app) return null

  const initial = app.company ? app.company[0] : '?'
  const initStyle = getInitialStyle(app.company)

  function handleStageChange(stage: Stage) {
    if (!app) return
    if (stage === 'ENDED') {
      onUpdateStage(app.id, stage, 'ARCHIVED')
    } else {
      onUpdateStage(app.id, stage)
    }
    const s = getSuggestion(stage)
    if (s && s.nextAction) {
      setSuggestion({
        nextAction: s.nextAction,
        keyDate: s.keyDateOffset != null ? getOffsetDate(s.keyDateOffset) : undefined,
      })
    } else {
      setSuggestion(null)
    }
  }

  function applySuggestion() {
    if (!app || !suggestion) return
    const changes: Partial<Application> = { nextAction: suggestion.nextAction }
    if (suggestion.keyDate) changes.keyDate = suggestion.keyDate
    onUpdate(app.id, changes)
    setSuggestion(null)
  }

  function handleDelete() {
    if (!app) return
    if (confirm('确定删除这条记录？此操作不可撤销。')) {
      onDelete(app.id)
      onClose()
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        {/* Header with avatar */}
        <div className="drawer__header">
          <div className="drawer__header-left">
            <div
              className="drawer__avatar"
              style={{ background: initStyle.bg, color: initStyle.color, borderColor: initStyle.border }}
            >
              {initial}
            </div>
            <div className="drawer__header-info">
              <h3 className="drawer__title">{app.company || '未填写公司'}</h3>
              <p className="drawer__subtitle">
                {[app.position, app.city].filter(Boolean).join(' · ') || '未填写岗位'}
              </p>
            </div>
          </div>
          <div className="drawer__header-right">
            <StageBadge stage={app.stage} />
            <button className="drawer__close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="drawer__body">
          {/* Suggestion banner */}
          {suggestion && (
            <div className="suggestion-banner">
              <span>建议下一步：{suggestion.nextAction}</span>
              {suggestion.keyDate && <span className="suggestion-banner__date">建议日期：{suggestion.keyDate}</span>}
              <div className="suggestion-banner__actions">
                <button className="btn btn--primary btn--sm" onClick={applySuggestion}>采纳</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setSuggestion(null)}>忽略</button>
              </div>
            </div>
          )}

          {/* 基本信息 */}
          <section className="drawer__section">
            <h4 className="drawer__section-title">基本信息</h4>
            <Field label="公司" value={app.company} onChange={v => onUpdate(app.id, { company: v })} placeholder="公司名称" />
            <Field label="岗位" value={app.position} onChange={v => onUpdate(app.id, { position: v })} placeholder="岗位名称" />
            <Field label="城市" value={app.city} onChange={v => onUpdate(app.id, { city: v })} placeholder="如：北京" />
            <Field label="JD 链接" value={app.link} onChange={v => onUpdate(app.id, { link: v })} placeholder="https://..." />
            <Field label="备注" value={app.note} onChange={v => onUpdate(app.id, { note: v })} placeholder="简短备注..." />
          </section>

          {/* 流程信息 */}
          <section className="drawer__section">
            <h4 className="drawer__section-title">流程信息</h4>
            <div className="field">
              <label>阶段</label>
              <select value={app.stage} onChange={e => handleStageChange(e.target.value as Stage)}>
                {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            {app.stage === 'ENDED' && (
              <div className="field">
                <label>结束原因</label>
                <select value={app.endReason ?? 'ARCHIVED'} onChange={e => onUpdate(app.id, { endReason: e.target.value as EndReason })}>
                  {(Object.keys(END_REASON_LABELS) as EndReason[]).map(r => (
                    <option key={r} value={r}>{END_REASON_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            )}
            <Field label="下一步" value={app.nextAction} onChange={v => onUpdate(app.id, { nextAction: v })} />
            <div className="field">
              <label>关键日期</label>
              <input type="date" value={app.keyDate} onChange={e => onUpdate(app.id, { keyDate: e.target.value })} />
            </div>
            <div className="field">
              <label>优先级</label>
              <div className="priority-picker">
                {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(p => (
                  <button
                    key={p}
                    className={`priority-picker__btn ${app.priority === p ? 'priority-picker__btn--active' : ''}`}
                    onClick={() => onUpdate(app.id, { priority: p })}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="渠道" value={app.channel} onChange={v => onUpdate(app.id, { channel: v })} placeholder="如：官网/Boss/猎聘" />
            <Field label="薪资" value={app.salary} onChange={v => onUpdate(app.id, { salary: v })} placeholder="如：15-25K·15薪" />
          </section>

          {/* 材料与联系人 */}
          <section className="drawer__section">
            <h4 className="drawer__section-title">材料与联系人</h4>
            <Field label="简历版本" value={app.resumeVersion} onChange={v => onUpdate(app.id, { resumeVersion: v })} placeholder="如：v2-产品方向" />
            <Field label="简历链接" value={app.resumeLink} onChange={v => onUpdate(app.id, { resumeLink: v })} placeholder="https://..." />
            <Field label="联系人" value={app.contact} onChange={v => onUpdate(app.id, { contact: v })} placeholder="HR姓名/微信" />
          </section>

          {/* 备注 */}
          <section className="drawer__section">
            <h4 className="drawer__section-title">复盘笔记</h4>
            <ComposingTextarea
              value={app.detailNote}
              onChange={v => onUpdate(app.id, { detailNote: v })}
              placeholder="面试复盘、笔记、想法..."
            />
          </section>

          {/* 阶段历史 */}
          <section className="drawer__section">
            <h4 className="drawer__section-title">阶段历史</h4>
            {app.stageHistory.length === 0 ? (
              <p className="drawer__muted">暂无记录</p>
            ) : (
              <div className="timeline">
                {[...app.stageHistory].reverse().map((h, i) => (
                  <div key={i} className="timeline__item">
                    <div
                      className="timeline__dot"
                      style={{ borderColor: STAGE_TIMELINE_COLOR[h.stage] }}
                    />
                    <div className="timeline__content">
                      <span className="timeline__label" style={{ color: STAGE_TIMELINE_COLOR[h.stage] }}>
                        {STAGE_LABELS[h.stage]}
                      </span>
                      <span className="timeline__date">
                        {new Date(h.changedAt).toLocaleString('zh-CN', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="drawer__footer">
          <button className="btn btn--danger" onClick={handleDelete}>删除此记录</button>
          <span className="drawer__meta">
            创建于 {new Date(app.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  )
}

function ComposingTextarea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  const composingRef = useRef(false)

  useEffect(() => {
    if (!composingRef.current) setDraft(value)
  }, [value])

  return (
    <textarea
      className="drawer__textarea"
      value={draft}
      rows={5}
      onChange={e => {
        setDraft(e.target.value)
        if (!composingRef.current) onChange(e.target.value)
      }}
      onCompositionStart={() => { composingRef.current = true }}
      onCompositionEnd={e => {
        composingRef.current = false
        onChange((e.target as HTMLTextAreaElement).value)
      }}
      onBlur={() => { if (draft !== value) onChange(draft) }}
      placeholder={placeholder}
    />
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  const composingRef = useRef(false)

  useEffect(() => {
    if (!composingRef.current) setDraft(value)
  }, [value])

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="text"
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          if (!composingRef.current) onChange(e.target.value)
        }}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={e => {
          composingRef.current = false
          onChange((e.target as HTMLInputElement).value)
        }}
        onBlur={() => { if (draft !== value) onChange(draft) }}
        placeholder={placeholder}
      />
    </div>
  )
}
