import { type ChangeEvent, useState } from 'react'
import type { Filters } from '../App'
import type { Stage, Priority } from '../types'
import { STAGE_ORDER, STAGE_LABELS, PRIORITY_LABELS } from '../types'
import './TopBar.css'

interface Props {
  view: 'table' | 'board'
  onViewChange: (v: 'table' | 'board') => void
  onAdd: () => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
  filterOptions: { cities: string[]; positions: string[]; channels: string[] }
  activeFilterCount: number
  search: string
  onSearchChange: (v: string) => void
  urgentSort: boolean
  onUrgentSortChange: (v: boolean) => void
  onExport: () => void
  onImport: (file: File) => void
  totalCount: number
  activeCount: number
  selectedCount: number
  onBulkStage: () => void
  onBulkDelete: () => void
  onClearSelection: () => void
  // Auth
  userEmail: string | null
  onLoginClick: () => void
  onLogout: () => void
}

export default function TopBar(props: Props) {
  const {
    view, onViewChange, onAdd,
    filters, onFiltersChange, filterOptions, activeFilterCount,
    search, onSearchChange,
    urgentSort, onUrgentSortChange,
    onExport, onImport,
    totalCount, activeCount,
    selectedCount, onBulkStage, onBulkDelete, onClearSelection,
    userEmail, onLoginClick, onLogout,
  } = props

  const [showFilters, setShowFilters] = useState(false)

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
      e.target.value = ''
    }
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function clearAllFilters() {
    onFiltersChange({ activeOnly: filters.activeOnly, stage: '', city: '', position: '', priority: '', channel: '' })
  }

  return (
    <header className="topbar-wrapper">
      {/* 品牌行 */}
      <div className="topbar-brand">
        <div className="topbar-brand__left">
          <svg className="topbar-brand__logo" width="32" height="32" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#2D2650"/>
            <rect x="14" y="44" width="16" height="3" rx="1.5" fill="#534AB7" opacity=".35"/>
            <rect x="14" y="36" width="22" height="3" rx="1.5" fill="#534AB7" opacity=".55"/>
            <rect x="14" y="28" width="28" height="3" rx="1.5" fill="#AFA9EC" opacity=".75"/>
            <rect x="14" y="20" width="22" height="3" rx="1.5" fill="#639922"/>
            <circle cx="42" cy="21.5" r="7" fill="#639922" opacity=".2"/>
            <circle cx="42" cy="21.5" r="4" fill="#639922"/>
            <circle cx="42" cy="21.5" r="2" fill="#C0DD97"/>
          </svg>
          <div className="topbar-brand__divider" />
          <div className="topbar-brand__text">
            <div className="topbar-brand__title-row">
              <h1 className="topbar-brand__title">offer<span className="topbar-brand__accent">ledger</span></h1>
              <span className="topbar-brand__subtitle">求职投递进度追踪工具</span>
            </div>
            <p className="topbar-brand__slogan">有一分热，发一分光。</p>
          </div>
          <div className="topbar-brand__pills">
            <span className="topbar-brand__stats">
              <span className="topbar-brand__stats-dot" />
              <span><strong>{activeCount}</strong> 进行中</span>
            </span>
            <span className="topbar-brand__stats topbar-brand__stats--muted">
              <strong>{totalCount}</strong> 总计
            </span>
          </div>
        </div>
        <div className="topbar-brand__right">
          <label className="topbar__import-label btn btn--ghost btn--icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 5l3-3 3 3M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            导入
            <input type="file" accept=".json" hidden onChange={handleImport} />
          </label>
          <button className="btn btn--ghost btn--icon" onClick={onExport}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 8l3 3 3-3M8 11V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            导出
          </button>
          <div className="topbar__divider-v" />
          {userEmail ? (
            <div className="topbar-user">
              <span className="topbar-user__email">{userEmail}</span>
              <button className="btn btn--ghost" onClick={onLogout}>退出</button>
            </div>
          ) : (
            <button className="btn btn--ghost btn--icon" onClick={onLoginClick}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              登录
            </button>
          )}
        </div>
      </div>

      {/* 操作行 */}
      {selectedCount > 0 ? (
        <div className="topbar-actions topbar-actions--bulk">
          <div className="topbar-actions__left">
            <span className="topbar__bulk-count">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              已选 {selectedCount} 项
            </span>
            <button className="btn btn--secondary" onClick={onBulkStage}>批量修改阶段</button>
            <button className="btn btn--danger-outline" onClick={onBulkDelete}>批量删除</button>
          </div>
          <button className="btn btn--ghost" onClick={onClearSelection}>取消选择</button>
        </div>
      ) : (
        <div className="topbar-actions">
          <div className="topbar-actions__left">
            <button className="btn btn--primary" onClick={onAdd}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              新增机会
            </button>
            <div className="topbar__divider" />
            <button
              className={`btn btn--filter ${filters.activeOnly ? 'btn--filter-active' : ''}`}
              onClick={() => updateFilter('activeOnly', !filters.activeOnly)}
            >
              只看进行中
            </button>
            <button
              className={`btn btn--filter ${urgentSort ? 'btn--filter-active' : ''}`}
              onClick={() => onUrgentSortChange(!urgentSort)}
            >
              按优先级排序
            </button>
            <button
              className={`btn btn--filter ${showFilters || activeFilterCount > 0 ? 'btn--filter-active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2h11l-4 5v4l-3 1.5V7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              筛选
              {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
            </button>
          </div>
          <div className="topbar-actions__right">
            <div className="topbar__search-wrap">
              <svg className="topbar__search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <input
                className="topbar__search"
                type="text"
                placeholder="搜索公司、岗位、备注..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
              />
              {search && (
                <button className="topbar__search-clear" onClick={() => onSearchChange('')}>&times;</button>
              )}
            </div>
            <div className="topbar__view-switch">
              <button
                className={`topbar__view-btn ${view === 'table' ? 'active' : ''}`}
                onClick={() => onViewChange('table')}
                title="表格视图"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 5.5h13M1.5 9.5h13M6 1.5v13" stroke="currentColor" strokeWidth="1.3"/></svg>
              </button>
              <button
                className={`topbar__view-btn ${view === 'board' ? 'active' : ''}`}
                onClick={() => onViewChange('board')}
                title="看板视图"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1.5" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="6" y="1.5" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="1.5" width="4" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      {showFilters && selectedCount === 0 && (
        <div className="filter-panel">
          <div className="filter-panel__row">
            <div className="filter-group">
              <label>阶段</label>
              <select value={filters.stage} onChange={e => updateFilter('stage', e.target.value as Stage | '')}>
                <option value="">全部</option>
                {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>优先级</label>
              <select value={filters.priority} onChange={e => updateFilter('priority', e.target.value as Priority | '')}>
                <option value="">全部</option>
                {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>城市</label>
              <select value={filters.city} onChange={e => updateFilter('city', e.target.value)}>
                <option value="">全部</option>
                {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>岗位</label>
              <select value={filters.position} onChange={e => updateFilter('position', e.target.value)}>
                <option value="">全部</option>
                {filterOptions.positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>渠道</label>
              <select value={filters.channel} onChange={e => updateFilter('channel', e.target.value)}>
                <option value="">全部</option>
                {filterOptions.channels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button className="btn btn--ghost filter-clear" onClick={clearAllFilters}>清除筛选</button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
