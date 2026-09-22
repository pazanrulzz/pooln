import type { SplitType } from '@pooln/shared';
import { EntityType } from './keys.js';

interface BaseItem {
  PK: string;
  SK: string;
  entityType: (typeof EntityType)[keyof typeof EntityType];
}

export interface UserItem extends BaseItem {
  entityType: 'USER';
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEmailItem extends BaseItem {
  entityType: 'USEREMAIL';
  email: string;
  userId: string;
}

export interface RefreshTokenItem extends BaseItem {
  entityType: 'REFRESHTOKEN';
  tokenHash: string;
  userId: string;
  expiresAt: string;
  // Omitted (not `null`) until actually revoked — a `null` value still
  // counts as "attribute exists" in DynamoDB, which broke
  // attribute_not_exists(revokedAt) conditional revokes.
  revokedAt?: string;
  createdAt: string;
  /** DynamoDB-native TTL, epoch seconds — auto-cleans up long after expiresAt. */
  ttl: number;
}

export interface ExpenseItem extends BaseItem {
  entityType: 'EXPENSE';
  id: string;
  description: string;
  amountMinorUnits: number;
  currency: string;
  splitType: SplitType;
  date: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ExpenseParticipantItem extends BaseItem {
  entityType: 'EXPENSE_PARTICIPANT';
  expenseId: string;
  userId: string;
  paidAmountMinorUnits: number;
  owedAmountMinorUnits: number;
  sharePercentBp: number | null;
  shareUnits: number | null;
  GSI1PK: string;
  GSI1SK: string;
}

export interface SettlementPartyItem extends BaseItem {
  entityType: 'SETTLEMENT';
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  amountMinorUnits: number;
  currency: string;
  note: string | null;
  settledAt: string;
  createdById: string;
  createdAt: string;
  deletedAt?: string;
  GSI1PK: string;
  GSI1SK: string;
}

export interface GroupItem extends BaseItem {
  entityType: 'GROUP';
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Omitted (not `null`) when no invite link has been generated yet — same
  // reasoning as deletedAt/revokedAt elsewhere in this file.
  activeInviteToken?: string;
}

export interface GroupMemberItem extends BaseItem {
  entityType: 'GROUP_MEMBER';
  groupId: string;
  userId: string;
  joinedAt: string;
  GSI1PK: string;
  GSI1SK: string;
}

export interface GroupInviteItem extends BaseItem {
  entityType: 'GROUP_INVITE';
  token: string;
  groupId: string;
  createdById: string;
  createdAt: string;
}
