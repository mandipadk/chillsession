CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at_epoch_ms BIGINT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  host_user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at_epoch_ms BIGINT NOT NULL,
  created_by TEXT NOT NULL,
  role_override TEXT,
  used_by TEXT[] NOT NULL DEFAULT '{}',
  created_at_epoch_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS moderation_audit (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  details TEXT,
  created_at_epoch_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_room_id ON invites(room_id);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_room_id ON moderation_audit(room_id);
