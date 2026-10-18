"use client";

import { Capacitor } from "@capacitor/core";
import { selectionHaptic } from "./nativeHaptics";

// No changes to journey data are made until the user explicitly confirms.
export async function confirmDestructive(title: string, message: string, action = "删除旅程"): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { ActionSheet, ActionSheetButtonStyle } = await import("@capacitor/action-sheet");
      const { index } = await ActionSheet.showActions({ title, message, options: [
        { title: action, style: ActionSheetButtonStyle.Destructive },
        { title: "取消", style: ActionSheetButtonStyle.Cancel },
      ] });
      return index === 0;
    } catch {
      const { Dialog } = await import("@capacitor/dialog");
      return (await Dialog.confirm({ title, message, okButtonTitle: action, cancelButtonTitle: "取消" })).value;
    }
  }
  // Native HTML dialog supplies focus trapping, Escape cancellation and an inert
  // background on the Web, without a second translucent React sheet underneath.
  return new Promise(resolve => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.createElement("dialog");
    dialog.className = "ios-action-sheet";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-label", title);
    const heading = document.createElement("h2"); heading.textContent = title;
    const description = document.createElement("p"); description.textContent = message;
    const remove = document.createElement("button"); remove.textContent = action; remove.className = "destructive";
    const cancel = document.createElement("button"); cancel.textContent = "取消"; cancel.autofocus = true;
    for (const node of [heading, description, remove, cancel]) dialog.appendChild(node);
    let settled = false;
    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      dialog.close(); dialog.remove(); previous?.focus({ preventScroll: true });
      resolve(confirmed);
    };
    cancel.onclick = () => finish(false);
    remove.onclick = () => finish(true);
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.addEventListener("click", event => { if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) finish(false);
    } });
    document.body.appendChild(dialog); dialog.showModal(); cancel.focus();
  });
}

export async function shareContent(title: string, text: string, url?: string) {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: "分享行程" });
    return;
  }
  if (navigator.share) await navigator.share({ title, text, url });
  else await navigator.clipboard.writeText([text, url].filter(Boolean).join("\n"));
}

export async function connectNativeKeyboard() {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { Keyboard } = await import("@capacitor/keyboard");
  const root = document.documentElement;
  const publish = (height: number, open: boolean) => {
    root.dataset.nativeKeyboardOpen = String(open);
    // Android already resizes the view; iOS uses Keyboard.resize=none.
    root.style.setProperty("--native-keyboard-inset", `${Capacitor.getPlatform() === "ios" ? height : 0}px`);
    window.dispatchEvent(new Event("flighty-native-keyboard-change"));
  };
  const show = await Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => publish(keyboardHeight, true));
  const hide = await Keyboard.addListener("keyboardWillHide", () => publish(0, false));
  return () => {
    void show.remove(); void hide.remove();
    delete root.dataset.nativeKeyboardOpen; root.style.removeProperty("--native-keyboard-inset");
    window.dispatchEvent(new Event("flighty-native-keyboard-change"));
  };
}

export function toggleFeedback() { void selectionHaptic(); }
