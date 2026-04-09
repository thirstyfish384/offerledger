import { api, setToken, clearToken, isLoggedIn } from './client.js'

interface AuthResponse {
  token: string
  user: { id: string; email: string }
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/register', { email, password })
  setToken(res.token)
  return res
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/login', { email, password })
  setToken(res.token)
  return res
}

export function logout() {
  clearToken()
}

export async function getMe(): Promise<{ id: string; email: string } | null> {
  if (!isLoggedIn()) return null
  try {
    return await api.get<{ id: string; email: string }>('/api/auth/me')
  } catch {
    return null
  }
}

export { isLoggedIn }
