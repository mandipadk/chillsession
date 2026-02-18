import { z } from "zod";

export const directionSchema = z.enum(["up", "down", "left", "right"]);
export const roleSchema = z.enum(["host", "dj", "member"]);
export const musicSourceSchema = z.enum(["licensed", "spotify", "youtube"]);
export const gameKindSchema = z.enum(["chess", "ttt", "pictionary"]);
export const moderationActionSchema = z.enum([
  "kick",
  "ban",
  "mute",
  "lock",
  "report"
]);

export const createRoomSchema = z.object({
  roomName: z.string().min(3).max(60),
  hostName: z.string().min(2).max(32)
});

export const createInviteSchema = z.object({
  roomId: z.string().min(1),
  createdBy: z.string().min(1),
  ttlMinutes: z.number().int().min(5).max(24 * 60).default(120)
});

export const joinSessionSchema = z.object({
  inviteToken: z.string().min(8),
  userName: z.string().min(2).max(32),
  avatarColor: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/)
    .default("#3B82F6")
});

export const enqueueMusicSchema = z.object({
  roomId: z.string().min(1),
  source: musicSourceSchema,
  itemId: z.string().min(1),
  title: z.string().min(1).max(120),
  requesterUserId: z.string().min(1)
});

export const musicControlSchema = z.object({
  roomId: z.string().min(1),
  requesterUserId: z.string().min(1),
  action: z.enum(["play", "pause", "skip", "seek"]),
  seekPositionMs: z.number().int().min(0).optional()
});

export const moderationActionRequestSchema = z.object({
  roomId: z.string().min(1),
  action: moderationActionSchema,
  actorUserId: z.string().min(1),
  targetUserId: z.string().min(1).optional(),
  details: z.string().max(500).optional()
});

export const moveInputSchema = z.object({
  up: z.boolean(),
  down: z.boolean(),
  left: z.boolean(),
  right: z.boolean()
});

export const chatSendSchema = z.object({
  body: z.string().min(1).max(500)
});

export const websocketAuthSchema = z.object({
  roomId: z.string().min(1),
  token: z.string().min(12)
});
