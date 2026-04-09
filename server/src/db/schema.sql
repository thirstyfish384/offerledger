CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sheets (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sheets_user ON sheets(user_id);

CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sheet_id        TEXT REFERENCES sheets(id) ON DELETE SET NULL,
  company         TEXT NOT NULL DEFAULT '',
  position        TEXT NOT NULL DEFAULT '',
  stage           TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK(stage IN ('DRAFT','APPLIED','ASSESSMENT','INTERVIEWING','WAITING','OFFER','ENDED')),
  end_reason      TEXT CHECK(end_reason IN ('REJECTED','WITHDRAWN','ARCHIVED') OR end_reason IS NULL),
  next_action     TEXT NOT NULL DEFAULT '',
  key_date        TEXT DEFAULT '',
  priority        TEXT NOT NULL DEFAULT 'P2'
                    CHECK(priority IN ('P0','P1','P2','P3')),
  link            TEXT NOT NULL DEFAULT '',
  note            TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',
  channel         TEXT NOT NULL DEFAULT '',
  resume_version  TEXT NOT NULL DEFAULT '',
  resume_link     TEXT NOT NULL DEFAULT '',
  contact         TEXT NOT NULL DEFAULT '',
  detail_note     TEXT NOT NULL DEFAULT '',
  salary          TEXT NOT NULL DEFAULT '',
  stage_history   TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_sheet ON applications(sheet_id);
