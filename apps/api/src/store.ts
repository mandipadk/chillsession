import { nanoid } from "nanoid";
import { Pool } from "pg";
import type { Role, RoomInfo } from "@chillspace/protocol";
import { apiConfig } from "./config";

export interface InviteRecord {
  id: string;
  roomId: string;
  token: string;
  expiresAtEpochMs: number;
  createdBy: string;
  roleOverride?: Role;
  usedBy: string[];
  createdAtEpochMs: number;
}

export interface RoomRecord extends RoomInfo {
  hostUserId: string;
}

export interface ModerationAuditRecord {
  id: string;
  roomId: string;
  actorUserId: string;
  action: string;
  targetUserId?: string;
  details?: string;
  createdAtEpochMs: number;
}

const pool = new Pool({
  connectionString: apiConfig.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000
});

const mapRoom = (row: {
  id: string;
  name: string;
  created_by: string;
  created_at_epoch_ms: string | number;
  is_locked: boolean;
  host_user_id: string;
}): RoomRecord => ({
  id: row.id,
  name: row.name,
  createdBy: row.created_by,
  createdAtEpochMs: Number(row.created_at_epoch_ms),
  isLocked: row.is_locked,
  hostUserId: row.host_user_id
});

const mapInvite = (row: {
  id: string;
  room_id: string;
  token: string;
  expires_at_epoch_ms: string | number;
  created_by: string;
  role_override: Role | null;
  used_by: string[];
  created_at_epoch_ms: string | number;
}): InviteRecord => ({
  id: row.id,
  roomId: row.room_id,
  token: row.token,
  expiresAtEpochMs: Number(row.expires_at_epoch_ms),
  createdBy: row.created_by,
  ...(row.role_override ? { roleOverride: row.role_override } : {}),
  usedBy: row.used_by ?? [],
  createdAtEpochMs: Number(row.created_at_epoch_ms)
});

const mapAudit = (row: {
  id: string;
  room_id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  details: string | null;
  created_at_epoch_ms: string | number;
}): ModerationAuditRecord => ({
  id: row.id,
  roomId: row.room_id,
  actorUserId: row.actor_user_id,
  action: row.action,
  ...(row.target_user_id ? { targetUserId: row.target_user_id } : {}),
  ...(row.details ? { details: row.details } : {}),
  createdAtEpochMs: Number(row.created_at_epoch_ms)
});

export const initializeStore = async (): Promise<void> => {
  await pool.query(`
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
  `);
};

class PostgresStore {
  async createRoom(roomName: string, hostName: string): Promise<{
    room: RoomRecord;
    hostInvite: InviteRecord;
  }> {
    const roomId = nanoid(12);
    const hostUserId = nanoid(12);
    const now = Date.now();

    await pool.query(
      `
        INSERT INTO rooms (id, name, created_by, created_at_epoch_ms, is_locked, host_user_id)
        VALUES ($1, $2, $3, $4, FALSE, $5)
      `,
      [roomId, roomName, hostName, now, hostUserId]
    );

    const hostInviteRow = await pool.query(
      `
        INSERT INTO invites (
          id,
          room_id,
          token,
          expires_at_epoch_ms,
          created_by,
          role_override,
          used_by,
          created_at_epoch_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, '{}', $7)
        RETURNING *
      `,
      [
        nanoid(12),
        roomId,
        nanoid(26),
        now + 24 * 60 * 60 * 1000,
        hostUserId,
        "host",
        now
      ]
    );

    const roomRow = await pool.query(
      `
        SELECT *
        FROM rooms
        WHERE id = $1
      `,
      [roomId]
    );

    return {
      room: mapRoom(roomRow.rows[0]),
      hostInvite: mapInvite(hostInviteRow.rows[0])
    };
  }

  async getRoomById(roomId: string): Promise<RoomRecord | null> {
    const result = await pool.query(
      `
        SELECT *
        FROM rooms
        WHERE id = $1
      `,
      [roomId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapRoom(result.rows[0]);
  }

  async createInvite(
    roomId: string,
    createdBy: string,
    ttlMinutes: number,
    roleOverride?: Role
  ): Promise<InviteRecord> {
    const now = Date.now();
    const result = await pool.query(
      `
        INSERT INTO invites (
          id,
          room_id,
          token,
          expires_at_epoch_ms,
          created_by,
          role_override,
          used_by,
          created_at_epoch_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, '{}', $7)
        RETURNING *
      `,
      [
        nanoid(12),
        roomId,
        nanoid(24),
        now + ttlMinutes * 60 * 1000,
        createdBy,
        roleOverride ?? null,
        now
      ]
    );

    return mapInvite(result.rows[0]);
  }

  async getInviteByToken(token: string): Promise<InviteRecord | null> {
    const result = await pool.query(
      `
        SELECT *
        FROM invites
        WHERE token = $1
      `,
      [token]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInvite(result.rows[0]);
  }

  async markInviteUsed(token: string, userId: string): Promise<void> {
    await pool.query(
      `
        UPDATE invites
        SET used_by = array_append(used_by, $2)
        WHERE token = $1
      `,
      [token, userId]
    );
  }

  async appendAudit(record: Omit<ModerationAuditRecord, "id" | "createdAtEpochMs">): Promise<ModerationAuditRecord> {
    const result = await pool.query(
      `
        INSERT INTO moderation_audit (
          id,
          room_id,
          actor_user_id,
          action,
          target_user_id,
          details,
          created_at_epoch_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        nanoid(12),
        record.roomId,
        record.actorUserId,
        record.action,
        record.targetUserId ?? null,
        record.details ?? null,
        Date.now()
      ]
    );

    return mapAudit(result.rows[0]);
  }
}

export const store = new PostgresStore();
