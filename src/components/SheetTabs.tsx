import { useState, useRef, useEffect, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Sheet } from '../types'
import './SheetTabs.css'

interface Props {
  sheets: Sheet[]
  activeId: string
  sheetCounts: Record<string, number>
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReorder: (orderedIds: string[]) => void
}

const PRESET_NAMES = ['实习', '秋招', '春招', '校招', '社招', '日常投递']

export default function SheetTabs({ sheets, activeId, sheetCounts, onSelect, onAdd, onRename, onDelete, onReorder }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addMenuPos, setAddMenuPos] = useState({ top: 0, left: 0 })
  const [customInput, setCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  // Drag reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const customRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])
  useEffect(() => { if (customInput) customRef.current?.focus() }, [customInput])

  // Close context menu
  useEffect(() => {
    if (!menuId) return
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.sheet-tab__menu')) return
      setMenuId(null)
    }
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [menuId])

  // Close add menu
  useEffect(() => {
    if (!showAddMenu) return
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.sheet-add-menu')) return
      setShowAddMenu(false); setCustomInput(false); setCustomName('')
    }
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [showAddMenu])

  function openMenu(e: React.MouseEvent, sheetId: string) {
    e.preventDefault(); e.stopPropagation()
    if (menuId === sheetId) { setMenuId(null); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setMenuId(sheetId)
  }

  function startRename(sheet: Sheet) {
    setEditingId(sheet.id); setEditName(sheet.name); setMenuId(null)
  }

  function commitRename() {
    if (editingId && editName.trim()) onRename(editingId, editName.trim())
    setEditingId(null)
  }

  function openAddMenu(e: React.MouseEvent) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - 220 - 12)
    setAddMenuPos({ top: rect.bottom + 4, left })
    setShowAddMenu(true); setCustomInput(false); setCustomName('')
  }

  function pickPreset(name: string) { onAdd(name); setShowAddMenu(false) }

  function commitCustom() {
    const name = customName.trim()
    if (name) { onAdd(name); setShowAddMenu(false); setCustomInput(false); setCustomName('') }
  }

  function handleDelete(id: string) {
    if (sheets.length <= 1) return
    if (confirm('删除表单将同时删除其中所有投递记录，确定继续？')) onDelete(id)
    setMenuId(null)
  }

  // Drag reorder handlers
  function onDragStart(e: DragEvent, idx: number) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // Make the drag image semi-transparent
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.5'
  }

  function onDragEnd(e: DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = ''
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      const ids = sheets.map(s => s.id)
      const [moved] = ids.splice(dragIdx, 1)
      ids.splice(dropIdx, 0, moved)
      onReorder(ids)
    }
    setDragIdx(null)
    setDropIdx(null)
  }

  function onDragOverTab(e: DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropIdx(idx)
  }

  const menuSheet = menuId ? sheets.find(s => s.id === menuId) : null

  return (
    <div className="sheet-tabs">
      <div className="sheet-tabs__list">
        {sheets.map((sheet, idx) => (
          <div
            key={sheet.id}
            className={`sheet-tab ${sheet.id === activeId ? 'sheet-tab--active' : ''} ${dropIdx === idx && dragIdx !== null && dragIdx !== idx ? 'sheet-tab--drop-target' : ''}`}
            draggable={editingId !== sheet.id}
            onDragStart={e => onDragStart(e, idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => onDragOverTab(e, idx)}
            onDragLeave={() => setDropIdx(null)}
            onClick={() => onSelect(sheet.id)}
            onContextMenu={e => openMenu(e, sheet.id)}
          >
            {editingId === sheet.id ? (
              <input
                ref={editRef}
                className="sheet-tab__input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="sheet-tab__drag-handle" title="拖拽排序">⠿</span>
                <span className="sheet-tab__name">{sheet.name}</span>
                <span className={`sheet-tab__count ${sheet.id === activeId ? 'sheet-tab__count--active' : ''}`}>
                  {sheetCounts[sheet.id] ?? 0}
                </span>
                <button className="sheet-tab__menu-btn" onClick={e => openMenu(e, sheet.id)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="2.5" r="1" fill="currentColor"/>
                    <circle cx="6" cy="6" r="1" fill="currentColor"/>
                    <circle cx="6" cy="9.5" r="1" fill="currentColor"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <button className="sheet-tabs__add" onClick={openAddMenu} title="新建表单">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        新建表单
      </button>

      {menuSheet && createPortal(
        <div className="sheet-tab__menu" style={{ top: menuPos.top, left: menuPos.left }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <button className="sheet-tab__menu-item" onClick={() => startRename(menuSheet)}>重命名</button>
          <button className="sheet-tab__menu-item sheet-tab__menu-item--danger"
            onClick={() => handleDelete(menuSheet.id)} disabled={sheets.length <= 1}>
            删除表单
          </button>
        </div>,
        document.body,
      )}

      {showAddMenu && createPortal(
        <div className="sheet-add-menu" style={{ top: addMenuPos.top, left: addMenuPos.left }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <div className="sheet-add-menu__title">选择分类</div>
          <div className="sheet-add-menu__presets">
            {PRESET_NAMES.map(name => (
              <button key={name} className="sheet-add-menu__preset" onClick={() => pickPreset(name)}>{name}</button>
            ))}
          </div>
          <div className="sheet-add-menu__divider" />
          {customInput ? (
            <div className="sheet-add-menu__custom-row">
              <input ref={customRef} className="sheet-add-menu__custom-input" value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitCustom(); if (e.key === 'Escape') { setCustomInput(false); setCustomName('') } }}
                placeholder="输入自定义名称..." />
              <button className="sheet-add-menu__custom-ok" onClick={commitCustom}>确定</button>
            </div>
          ) : (
            <button className="sheet-add-menu__custom-btn" onClick={() => setCustomInput(true)}>自定义名称...</button>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
