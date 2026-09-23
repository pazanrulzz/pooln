import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from './theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// SF Symbol (iOS) / Material Symbol (Android + web) pairs, all verified to
// exist in sf-symbols-typescript and expo-symbols' android registry.
const pair = (ios: string, material: string) => ({ ios, android: material, web: material }) as SymbolName;

export const icons = {
  plus: pair('plus', 'add'),
  chevronRight: pair('chevron.right', 'chevron_right'),
  chevronLeft: pair('chevron.left', 'chevron_left'),
  chevronDown: pair('chevron.down', 'expand_more'),
  xmark: pair('xmark', 'close'),
  check: pair('checkmark', 'check'),
  search: pair('magnifyingglass', 'search'),
  person: pair('person.fill', 'person'),
  people: pair('person.2.fill', 'group'),
  userGroup: pair('person.3.fill', 'groups'),
  personAdd: pair('person.badge.plus', 'person_add'),
  personCircle: pair('person.crop.circle.fill', 'account_circle'),
  activity: pair('bell.fill', 'notifications'),
  gear: pair('gearshape.fill', 'settings'),
  logout: pair('rectangle.portrait.and.arrow.right', 'logout'),
  camera: pair('camera.fill', 'photo_camera'),
  photo: pair('photo', 'image'),
  trash: pair('trash', 'delete'),
  pencil: pair('pencil', 'edit'),
  share: pair('square.and.arrow.up', 'share'),
  link: pair('link', 'link'),
  arrows: pair('arrow.left.arrow.right', 'swap_horiz'),
  arrowRight: pair('arrow.right', 'arrow_forward'),
  arrowUpRight: pair('arrow.up.right', 'north_east'),
  arrowDownLeft: pair('arrow.down.left', 'south_west'),
  envelope: pair('envelope.fill', 'mail'),
  lock: pair('lock.fill', 'lock'),
  eye: pair('eye', 'visibility'),
  eyeSlash: pair('eye.slash', 'visibility_off'),
  banknote: pair('banknote.fill', 'payments'),
  dollar: pair('dollarsign.circle.fill', 'paid'),
  wallet: pair('wallet.bifold.fill', 'account_balance_wallet'),
  calendar: pair('calendar', 'calendar_today'),
  note: pair('note.text', 'notes'),
  clock: pair('clock', 'schedule'),
  globe: pair('globe', 'public'),
  info: pair('info.circle', 'info'),
  receipt: pair('receipt.fill', 'receipt_long'),
  house: pair('house.fill', 'home'),
  list: pair('list.bullet', 'list'),
  checkCircle: pair('checkmark.circle.fill', 'check_circle'),
  circle: pair('circle', 'radio_button_unchecked'),
  sparkles: pair('sparkles', 'auto_awesome'),
  chart: pair('chart.pie.fill', 'pie_chart'),
  shield: pair('checkmark.shield.fill', 'verified_user'),
  help: pair('questionmark.circle', 'help'),
  refresh: pair('arrow.clockwise', 'refresh'),
  tray: pair('tray', 'inbox'),
  warning: pair('exclamationmark.triangle.fill', 'warning'),
  minusCircle: pair('minus.circle.fill', 'remove_circle'),
  ellipsis: pair('ellipsis', 'more_horiz'),
  filter: pair('line.3.horizontal.decrease', 'filter_list'),
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof icons;

interface Props {
  name: IconName | SymbolName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 20, color = colors.label }: Props) {
  const symbol = typeof name === 'string' && name in icons ? icons[name as IconName] : (name as SymbolName);
  return <SymbolView name={symbol} size={size} tintColor={color} />;
}
