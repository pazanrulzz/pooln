import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export interface ExpenseIcon {
  name: SymbolName;
  color: string;
}

// No category field exists on expenses yet — icons are inferred from the
// description text. Checked in order, first match wins (e.g. "Taxi to
// airport" should read as transport, not travel, so transport is checked
// first).
const RULES: { keywords: string[]; icon: ExpenseIcon }[] = [
  {
    keywords: [
      'grocery', 'groceries', 'supermarket', 'market',
    ],
    icon: { name: { ios: 'cart.fill', android: 'local_grocery_store', web: 'local_grocery_store' }, color: '#34c759' },
  },
  {
    keywords: [
      'dinner', 'lunch', 'breakfast', 'brunch', 'food', 'restaurant', 'meal', 'coffee', 'cafe',
      'pizza', 'sushi', 'chinese', 'thai', 'indian', 'takeout', 'takeaway', 'snack', 'bakery',
      'bar', 'drinks', 'beer', 'wine',
    ],
    icon: { name: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }, color: '#ff9500' },
  },
  {
    keywords: [
      'taxi', 'uber', 'lyft', 'cab', 'bus', 'train', 'subway', 'metro', 'tram', 'commute',
      'parking', 'toll', 'fuel', 'gas', 'petrol', 'car',
    ],
    icon: { name: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' }, color: '#5856d6' },
  },
  {
    keywords: ['rent', 'mortgage', 'housing', 'lease'],
    icon: { name: { ios: 'house.fill', android: 'home', web: 'home' }, color: '#af52de' },
  },
  {
    keywords: [
      'electric', 'electricity', 'water bill', 'utility', 'utilities', 'internet', 'wifi', 'phone bill', 'bill',
    ],
    icon: { name: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' }, color: '#ffcc00' },
  },
  {
    keywords: [
      'movie', 'cinema', 'concert', 'game', 'netflix', 'spotify', 'ticket', 'show', 'party', 'club',
    ],
    icon: { name: { ios: 'popcorn.fill', android: 'local_movies', web: 'local_movies' }, color: '#ff2d55' },
  },
  {
    keywords: ['medicine', 'pharmacy', 'doctor', 'hospital', 'health', 'dentist'],
    icon: { name: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' }, color: '#ff3b30' },
  },
  {
    keywords: ['shop', 'shopping', 'clothes', 'clothing', 'amazon', 'store'],
    icon: { name: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }, color: '#5ac8fa' },
  },
  {
    keywords: ['flight', 'airport', 'airline', 'hotel', 'airbnb', 'trip', 'vacation', 'holiday'],
    icon: { name: { ios: 'airplane', android: 'flight', web: 'flight' }, color: '#007aff' },
  },
];

const DEFAULT_ICON: ExpenseIcon = {
  name: { ios: 'receipt.fill', android: 'receipt_long', web: 'receipt_long' },
  color: '#8e8e93',
};

/** Infers a category icon from an expense's free-text description. There's no
 * explicit category field on expenses, so this is a best-effort keyword match
 * rather than a source of truth — falls back to a generic receipt icon. */
export function getExpenseIcon(description: string): ExpenseIcon {
  const text = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.icon;
  }
  return DEFAULT_ICON;
}

export const SETTLEMENT_ICON: ExpenseIcon = {
  name: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  color: '#34c759',
};
