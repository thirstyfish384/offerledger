import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import Modal from './Modal.js'
import './AuthModal.css'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPwd) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={mode === 'login' ? '登录' : '注册'} onClose={onClose}>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}

        <div className="auth-form__field">
          <label>邮箱</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
          />
        </div>

        <div className="auth-form__field">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="至少 6 位"
            required
            minLength={6}
          />
        </div>

        {mode === 'register' && (
          <div className="auth-form__field">
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="再输入一次密码"
              required
              minLength={6}
            />
          </div>
        )}

        <button className="auth-form__submit" type="submit" disabled={loading}>
          {loading ? '请稍候...' : (mode === 'login' ? '登录' : '注册')}
        </button>

        <p className="auth-form__switch">
          {mode === 'login' ? (
            <>还没有账号？<button type="button" onClick={() => { setMode('register'); setError('') }}>去注册</button></>
          ) : (
            <>已有账号？<button type="button" onClick={() => { setMode('login'); setError('') }}>去登录</button></>
          )}
        </p>
      </form>
    </Modal>
  )
}
