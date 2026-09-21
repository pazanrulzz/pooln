/**
 * Single source of truth for the table's key templates. Nothing outside
 * this file should hand-type a PK/SK/GSI1PK/GSI1SK string — see the plan
 * file (single-table design section) for the full item-type table this
 * implements.
 */

export const EntityType = {
  User: 'USER',
  UserEmail: 'USEREMAIL',
  RefreshToken: 'REFRESHTOKEN',
  Expense: 'EXPENSE',
  ExpenseParticipant: 'EXPENSE_PARTICIPANT',
  Settlement: 'SETTLEMENT',
} as const;

// SK/GSI1SK prefixes used in begins_with(...) queries.
export const SK_PARTICIPANT_PREFIX = 'PARTICIPANT#';
export const GSI1SK_EXPENSE_PREFIX = 'EXPENSE#';
export const GSI1SK_SETTLEMENT_PREFIX = 'SETTLEMENT#';

export function userPK(userId: string): string {
  return `USER#${userId}`;
}

export function userKey(userId: string) {
  return { PK: userPK(userId), SK: 'METADATA' };
}

export function userEmailKey(email: string) {
  return { PK: `USEREMAIL#${email}`, SK: 'METADATA' };
}

export function refreshTokenKey(tokenHash: string) {
  return { PK: `REFRESHTOKEN#${tokenHash}`, SK: 'METADATA' };
}

export function expensePK(expenseId: string): string {
  return `EXPENSE#${expenseId}`;
}

export function expenseMetaKey(expenseId: string) {
  return { PK: expensePK(expenseId), SK: 'METADATA' };
}

export function expenseParticipantKey(expenseId: string, userId: string) {
  return { PK: expensePK(expenseId), SK: `${SK_PARTICIPANT_PREFIX}${userId}` };
}

/** GSI1 keys for an expense-participant item — "what expenses is this user in". */
export function userExpenseIndexKeys(userId: string, isoDate: string, expenseId: string) {
  return { GSI1PK: userPK(userId), GSI1SK: `${GSI1SK_EXPENSE_PREFIX}${isoDate}#${expenseId}` };
}

export function settlementPK(settlementId: string): string {
  return `SETTLEMENT#${settlementId}`;
}

export function settlementPartyKey(settlementId: string, partyUserId: string) {
  return { PK: settlementPK(settlementId), SK: `PARTY#${partyUserId}` };
}

/** GSI1 keys for a settlement-party item — "what settlements is this user party to". */
export function userSettlementIndexKeys(userId: string, isoSettledAt: string, settlementId: string) {
  return { GSI1PK: userPK(userId), GSI1SK: `${GSI1SK_SETTLEMENT_PREFIX}${isoSettledAt}#${settlementId}` };
}
