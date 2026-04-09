import { useState } from 'react'
import { db as dexieDb } from '../db/index.js'
import { importData } from '../api/remoteData.js'
import Modal from './Modal.js'

interface Props {
  localCount: number
  onDone: () => void
  onSkip: () => void
}

export default function MigratePrompt({ localCount, onDone, onSkip }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleMigrate() {
    setLoading(true)
    setError('')
    try {
      const sheets = await dexieDb.sheets.toArray()
      const applications = await dexieDb.applications.toArray()

      await importData({
        schemaVersion: 2,
        sheets: sheets.map(s => ({
          ...s,
          order: s.order ?? 0,
        })),
        applications,
      })

      // Mark migration done
      localStorage.setItem('offerledger_migrated', 'true')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '迁移失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    localStorage.setItem('offerledger_migrated', 'true')
    onSkip()
  }

  return (
    <Modal title="发现本地数据" onClose={handleSkip}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        检测到你有 <strong style={{ color: 'var(--text)' }}>{localCount}</strong> 条本地投递记录。
        是否将它们同步到你的账号？同步后可在任何设备访问。
      </div>
      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={handleSkip} disabled={loading}>暂不同步</button>
        <button className="btn btn--primary" onClick={handleMigrate} disabled={loading} style={{ background: '#2D2650', color: '#fff' }}>
          {loading ? '同步中...' : '同步到云端'}
        </button>
      </div>
    </Modal>
  )
}
