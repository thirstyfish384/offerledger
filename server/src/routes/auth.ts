import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/connection.js'
import { config } from '../config.js'
import { registerSchema, loginSchema } from '../validators/auth.js'
import { authMiddleware } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import type { AuthRequest } from '../types.js'

const router = Router()

function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions)
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const { email, password } = parsed.data

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    throw new AppError(409, '该邮箱已注册')
  }

  const id = uuidv4()
  const passwordHash = bcrypt.hashSync(password, 10)

  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, passwordHash)

  const token = generateToken(id)
  res.status(201).json({ token, user: { id, email } })
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const { email, password } = parsed.data

  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email) as
    { id: string; email: string; password_hash: string } | undefined

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError(401, '邮箱或密码错误')
  }

  const token = generateToken(user.id)
  res.json({ token, user: { id: user.id, email: user.email } })
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const authReq = req as AuthRequest
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(authReq.userId) as
    { id: string; email: string } | undefined

  if (!user) {
    throw new AppError(404, '用户不存在')
  }

  res.json(user)
})

export default router
