import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useApplications } from './hooks/useApplications'
import { useSheets } from './hooks/useSheets'
import { useAuth } from './contexts/AuthContext'
import type { Application, Stage, Priority } from './types'
import { ACTIVE_STAGES, STAGE_ORDER, STAGE_LABELS } from './types'
import { getSuggestion, getOffsetDate } from './utils/nextActionSuggestions'
import { exportData, downloadJson, parseImportFile } from './utils/importExport'
import TopBar from './components/TopBar'
import SheetTabs from './components/SheetTabs'
import AppTable from './components/AppTable'
import DetailDrawer from './components/DetailDrawer'
import BoardView from './components/BoardView'
import AuthModal from './components/AuthModal'
import MigratePrompt from './components/MigratePrompt'
import Modal from './components/Modal'
import './App.css'

export interface Filters {
  activeOnly: boolean
  stage: Stage | ''
  city: string
  position: string
  priority: Priority | ''
  channel: string
}

const DEFAULT_FILTERS: Filters = {
  activeOnly: true,
  stage: '',
  city: '',
  position: '',
  priority: '',
  channel: '',
}

function App() {
  const { user, isLoggedIn, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMigrate, setShowMigrate] = useState(false)
  const [localCount, setLocalCount] = useState(0)

  // After login, check if local data should be migrated
  useEffect(() => {
    if (isLoggedIn && !localStorage.getItem('offerledger_migrated')) {
      db.applications.count().then(count => {
        if (count > 0) {
          setLocalCount(count)
          setShowMigrate(true)
        } else {
          localStorage.setItem('offerledger_migrated', 'true')
        }
      })
    }
  }, [isLoggedIn])

  const { sheets, ensureDefault, addSheet, renameSheet, deleteSheet, reorderSheets } = useSheets()
  const [activeSheetId, setActiveSheetId] = useState<string>('default')

  useEffect(() => {
    ensureDefault().then(id => setActiveSheetId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sheets.length > 0 && !sheets.find(s => s.id === activeSheetId)) {
      setActiveSheetId(sheets[0].id)
    }
  }, [sheets, activeSheetId])

  const {
    applications, addApplication, updateApplication,
    updateStage, deleteApplication, deleteMany, bulkUpdateStage, importApplications,
  } = useApplications(activeSheetId)

  const [view, setView] = useState<'table' | 'board'>('table')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [urgentSort, setUrgentSort] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [bulkStageModal, setBulkStageModal] = useState(false)
  const [bulkTargetStage, setBulkTargetStage] = useState<Stage>('ENDED')
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(new Set())
    setDetailId(null)
    setFilters(DEFAULT_FILTERS)
  }, [activeSheetId])

  const activeCount = useMemo(
    () => applications.filter(a => ACTIVE_STAGES.includes(a.stage)).length,
    [applications]
  )

  const allApps = useLiveQuery(() => db.applications.toArray(), []) ?? []
  const sheetCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of allApps) {
      counts[a.sheetId] = (counts[a.sheetId] ?? 0) + 1
    }
    return counts
  }, [allApps])

  // Collect unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const cities = new Set<string>()
    const positions = new Set<string>()
    const channels = new Set<string>()
    for (const a of applications) {
      if (a.city) cities.add(a.city)
      if (a.position) positions.add(a.position)
      if (a.channel) channels.add(a.channel)
    }
    return {
      cities: [...cities].sort(),
      positions: [...positions].sort(),
      channels: [...channels].sort(),
    }
  }, [applications])

  const filtered = useMemo(() => {
    let list = applications

    if (filters.stage) {
      list = list.filter(a => a.stage === filters.stage)
    } else if (filters.activeOnly) {
      list = list.filter(a => ACTIVE_STAGES.includes(a.stage))
    }

    if (filters.city) {
      list = list.filter(a => a.city === filters.city)
    }
    if (filters.position) {
      list = list.filter(a => a.position === filters.position)
    }
    if (filters.priority) {
      list = list.filter(a => a.priority === filters.priority)
    }
    if (filters.channel) {
      list = list.filter(a => a.channel === filters.channel)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.company.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        a.note.toLowerCase().includes(q)
      )
    }

    if (urgentSort) {
      const priorityWeight: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }
      list = [...list].sort((a, b) => {
        const pw = priorityWeight[a.priority] - priorityWeight[b.priority]
        if (pw !== 0) return pw
        const da = a.keyDate || '9999'
        const db = b.keyDate || '9999'
        if (da !== db) return da.localeCompare(db)
        return b.updatedAt.localeCompare(a.updatedAt)
      })
    }

    return list
  }, [applications, filters, search, urgentSort])

  const detailApp = useMemo(
    () => applications.find(a => a.id === detailId) ?? null,
    [applications, detailId]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id))
    )
  }, [filtered])

  async function handleAdd() {
    const app = await addApplication('', '')
    setDetailId(app.id)
  }

  async function handleUpdateStage(id: string, stage: Stage) {
    await updateStage(id, stage, stage === 'ENDED' ? 'ARCHIVED' : undefined)
    const s = getSuggestion(stage)
    if (s) {
      const changes: Partial<Application> = { nextAction: s.nextAction }
      if (s.keyDateOffset != null) changes.keyDate = getOffsetDate(s.keyDateOffset)
      await updateApplication(id, changes)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('确定删除这条记录？')) {
      await deleteApplication(id)
      if (detailId === id) setDetailId(null)
    }
  }

  async function handleBulkStage() {
    await bulkUpdateStage([...selected], bulkTargetStage, bulkTargetStage === 'ENDED' ? 'ARCHIVED' : undefined)
    setSelected(new Set())
    setBulkStageModal(false)
  }

  async function handleBulkDelete() {
    if (confirm(`确定删除选中的 ${selected.size} 条记录？此操作不可撤销。`)) {
      await deleteMany([...selected])
      setSelected(new Set())
    }
  }

  function handleExport() {
    const json = exportData(sheets, applications)
    const date = new Date().toISOString().slice(0, 10)
    const sheetName = sheets.find(s => s.id === activeSheetId)?.name ?? 'export'
    downloadJson(json, `job-tracker-${sheetName}-${date}.json`)
  }

  async function handleImport(file: File) {
    const result = await parseImportFile(file)
    if (!result.ok) {
      setImportError(result.error ?? '导入失败')
      return
    }
    if (!confirm('导入将覆盖当前表单的所有数据，此操作不可撤销。建议先导出备份。确定继续？')) {
      return
    }
    await importApplications(result.applications!)
    setSelected(new Set())
  }

  async function handleAddSheet(name: string) {
    const sheet = await addSheet(name)
    setActiveSheetId(sheet.id)
  }

  async function handleDeleteSheet(id: string) {
    await deleteSheet(id)
  }

  // Count active filters (excluding activeOnly)
  const activeFilterCount = [filters.stage, filters.city, filters.position, filters.priority, filters.channel].filter(Boolean).length

  return (
    <div className="app">
      <TopBar
        view={view}
        onViewChange={setView}
        onAdd={handleAdd}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        activeFilterCount={activeFilterCount}
        search={search}
        onSearchChange={setSearch}
        urgentSort={urgentSort}
        onUrgentSortChange={setUrgentSort}
        onExport={handleExport}
        onImport={handleImport}
        totalCount={applications.length}
        activeCount={activeCount}
        selectedCount={selected.size}
        onBulkStage={() => setBulkStageModal(true)}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        userEmail={user?.email ?? null}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={logout}
      />

      <SheetTabs
        sheets={sheets}
        activeId={activeSheetId}
        sheetCounts={sheetCounts}
        onSelect={setActiveSheetId}
        onAdd={handleAddSheet}
        onRename={renameSheet}
        onDelete={handleDeleteSheet}
        onReorder={reorderSheets}
      />

      <main className="main">
        {view === 'table' ? (
          <AppTable
            applications={filtered}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onUpdate={updateApplication}
            onUpdateStage={handleUpdateStage}
            onOpenDetail={setDetailId}
            onDelete={handleDelete}
          />
        ) : (
          <BoardView
            applications={filtered}
            onUpdateStage={handleUpdateStage}
            onOpenDetail={setDetailId}
            onAdd={handleAdd}
          />
        )}
      </main>

      <DetailDrawer
        app={detailApp}
        onClose={() => setDetailId(null)}
        onUpdate={updateApplication}
        onUpdateStage={handleUpdateStage}
        onDelete={handleDelete}
      />

      {bulkStageModal && (
        <Modal title="批量修改阶段" onClose={() => setBulkStageModal(false)}>
          <p style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
            将选中的 {selected.size} 条记录移动到：
          </p>
          <select
            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
            value={bulkTargetStage}
            onChange={e => setBulkTargetStage(e.target.value as Stage)}
          >
            {STAGE_ORDER.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setBulkStageModal(false)}>取消</button>
            <button className="btn btn--primary" onClick={handleBulkStage}>确认</button>
          </div>
        </Modal>
      )}

      {importError && (
        <Modal title="导入失败" onClose={() => setImportError(null)}>
          <p style={{ color: 'var(--danger)' }}>{importError}</p>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={() => setImportError(null)}>知道了</button>
          </div>
        </Modal>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showMigrate && (
        <MigratePrompt
          localCount={localCount}
          onDone={() => { setShowMigrate(false); window.location.reload() }}
          onSkip={() => setShowMigrate(false)}
        />
      )}
    </div>
  )
}

export default App
