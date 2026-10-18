import { Capacitor } from "@capacitor/core";

export async function sheetSnapHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* Haptics are an enhancement; unsupported devices stay silent. */ }
}

export async function selectionHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try { const { Haptics } = await import("@capacitor/haptics"); await Haptics.selectionChanged(); }
  catch { /* Optional feedback. */ }
}

export async function resultHaptic(success = true) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: success ? NotificationType.Success : NotificationType.Warning });
  } catch { /* Optional feedback. */ }
}
