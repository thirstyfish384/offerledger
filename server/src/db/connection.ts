import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ensure data directory exists
const dataDir = path.dirname(config.dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(config.dbPath)

// Performance & safety pragmas
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

// Run schema migration
const schema = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8')
db.exec(schema)

export { db }
