export interface BalanceLine {
  currency: string;
  /** Positive = they owe you. Negative = you owe them. Never summed across currencies. */
  amountMinorUnits: number;
}

export interface CounterpartBalance {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  balances: BalanceLine[];
}
