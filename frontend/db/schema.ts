import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const inspections = sqliteTable(
  'inspections',
  {
    id: text('id').primaryKey(),
    taskNo: text('task_no').notNull().unique(),
    waybill: text('waybill').notNull(),
    orderNo: text('order_no'),
    scene: text('scene').notNull().default('warehouse'),
    damageTypes: text('damage_types').notNull(),
    confidence: integer('confidence').notNull(),
    aiLevel: integer('ai_level').notNull(),
    reviewLevel: integer('review_level'),
    reviewNote: text('review_note'),
    reviewer: text('reviewer'),
    status: text('status').notNull().default('pending_review'),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    ownerUserId: text('owner_user_id'),
    inferenceMs: integer('inference_ms'),
    feedbackStatus: text('feedback_status'),
  },
  (table) => [index('idx_inspections_status').on(table.status)],
);

export const appUsers = sqliteTable(
  'app_users',
  {
    id: text('id').primaryKey(),
    authUserId: text('auth_user_id').notNull().unique(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_app_users_auth_user_id').on(table.authUserId)],
);
