export async function sheetSnapHaptic() {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* Haptics are an enhancement; browsers and unsupported devices stay silent. */
  }
}
