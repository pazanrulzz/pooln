import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors, radius, shadow, spacing } from './theme';

// App-owned replacements for Alert.alert / ActionSheetIOS / window.confirm:
// those are no-ops or unstyled browser dialogs on react-native-web, and this
// app's primary verification target is web.

type ToastTone = 'success' | 'error' | 'info';

interface DialogRequest {
  kind: 'dialog';
  title: string;
  message?: string;
  confirmLabel: string;
  destructive: boolean;
  resolve: (ok: boolean) => void;
}

export interface SheetOption {
  label: string;
  icon?: IconName;
  destructive?: boolean;
}

interface SheetRequest {
  kind: 'sheet';
  title?: string;
  options: SheetOption[];
  resolve: (index: number | null) => void;
}

interface OverlayState {
  toast: { id: number; message: string; tone: ToastTone } | null;
  modal: DialogRequest | SheetRequest | null;
}

const useOverlayStore = create<OverlayState>(() => ({ toast: null, modal: null }));

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, tone: ToastTone = 'success') {
  clearTimeout(toastTimer);
  useOverlayStore.setState({ toast: { id: Date.now(), message, tone } });
  toastTimer = setTimeout(() => useOverlayStore.setState({ toast: null }), 2600);
}

export function confirmDialog(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    useOverlayStore.setState({
      modal: {
        kind: 'dialog',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        destructive: options.destructive ?? false,
        resolve,
      },
    });
  });
}

export function showActionSheet(options: { title?: string; options: SheetOption[] }): Promise<number | null> {
  return new Promise((resolve) => {
    useOverlayStore.setState({ modal: { kind: 'sheet', title: options.title, options: options.options, resolve } });
  });
}

function closeModal() {
  useOverlayStore.setState({ modal: null });
}

const toastIcon: Record<ToastTone, { icon: IconName; color: string }> = {
  success: { icon: 'checkCircle', color: colors.positive },
  error: { icon: 'warning', color: colors.negative },
  info: { icon: 'info', color: colors.brand },
};

function ToastView() {
  const toast = useOverlayStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(anim, { toValue: toast ? 1 : 0, useNativeDriver: false, friction: 8, tension: 70 }).start();
  }, [toast, anim]);

  if (!toast) return null;
  const t = toastIcon[toast.tone];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastWrap,
        {
          top: insets.top + spacing.sm,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Icon name={t.icon} size={18} color={t.color} />
        <AppText variant="subhead" weight="600" style={styles.toastText} numberOfLines={2}>
          {toast.message}
        </AppText>
      </View>
    </Animated.View>
  );
}

function DialogView({ request }: { request: DialogRequest }) {
  const finish = (ok: boolean) => {
    closeModal();
    request.resolve(ok);
  };

  return (
    <View style={styles.dialogBackdrop}>
      <View style={styles.dialog} accessibilityRole="alert">
        <View style={styles.dialogBody}>
          <AppText variant="headline" align="center">
            {request.title}
          </AppText>
          {request.message && (
            <AppText variant="footnote" tone="secondary" align="center">
              {request.message}
            </AppText>
          )}
        </View>
        <View style={styles.dialogActions}>
          <Pressable style={({ pressed }) => [styles.dialogButton, pressed && styles.pressedFill]} onPress={() => finish(false)}>
            <AppText variant="body" tone="brand">
              Cancel
            </AppText>
          </Pressable>
          <View style={styles.dialogDivider} />
          <Pressable style={({ pressed }) => [styles.dialogButton, pressed && styles.pressedFill]} onPress={() => finish(true)}>
            <AppText variant="body" weight="600" tone={request.destructive ? 'negative' : 'brand'}>
              {request.confirmLabel}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SheetView({ request }: { request: SheetRequest }) {
  const insets = useSafeAreaInsets();
  const finish = (index: number | null) => {
    closeModal();
    request.resolve(index);
  };

  return (
    <Pressable style={styles.sheetBackdrop} onPress={() => finish(null)}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.sheetGroup}>
          {request.title && (
            <AppText variant="footnote" tone="secondary" align="center" style={styles.sheetTitle}>
              {request.title}
            </AppText>
          )}
          {request.options.map((option, i) => (
            <Pressable
              key={option.label}
              onPress={() => finish(i)}
              style={({ pressed }) => [
                styles.sheetOption,
                (i > 0 || request.title) && styles.sheetOptionBorder,
                pressed && styles.pressedFill,
              ]}
            >
              {option.icon && (
                <Icon name={option.icon} size={18} color={option.destructive ? colors.negative : colors.brand} />
              )}
              <AppText variant="body" tone={option.destructive ? 'negative' : 'brand'}>
                {option.label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => finish(null)}
          style={({ pressed }) => [styles.sheetGroup, styles.sheetOption, pressed && styles.pressedFill]}
        >
          <AppText variant="body" weight="600" tone="brand">
            Cancel
          </AppText>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Mount once near the app root. */
export function OverlayHost() {
  const modal = useOverlayStore((s) => s.modal);

  return (
    <>
      <ToastView />
      <Modal
        visible={modal !== null}
        transparent
        animationType={modal?.kind === 'sheet' ? 'slide' : 'fade'}
        onRequestClose={() => {
          if (modal?.kind === 'dialog') modal.resolve(false);
          if (modal?.kind === 'sheet') modal.resolve(null);
          closeModal();
        }}
      >
        {modal?.kind === 'dialog' && <DialogView request={modal} />}
        {modal?.kind === 'sheet' && <SheetView request={modal} />}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadow.raised,
  },
  toastText: { flexShrink: 1 },
  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    padding: spacing.xxl,
  },
  dialog: {
    width: 280,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(250,250,252,0.98)',
    overflow: 'hidden',
    boxShadow: shadow.raised,
  },
  dialogBody: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.xs },
  dialogActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  dialogButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  dialogDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.32)' },
  sheet: { paddingHorizontal: spacing.sm, gap: spacing.sm, width: '100%', maxWidth: 520, alignSelf: 'center' },
  sheetGroup: { borderRadius: radius.lg, backgroundColor: 'rgba(250,250,252,0.98)', overflow: 'hidden' },
  sheetTitle: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  sheetOption: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  sheetOptionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  pressedFill: { backgroundColor: colors.fill },
});
