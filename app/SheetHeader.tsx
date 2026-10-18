"use client";

import type { ReactNode } from "react";
import SFChevronLeft from "sf-symbols-lib/monochrome/SFChevronLeft";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";

/** Shared navigation header. The 30pt glyph sits inside a 44pt hit target. */
export default function SheetHeader({ title, subtitle, onClose, onShare, back = false, backLabel = "返回", className = "", children }: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  onShare?: () => void;
  back?: boolean;
  backLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  return <header className={`sheet-header ios-sheet-header ${back ? "has-back" : ""} ${className}`}>
    {back && onClose && <button className="sheet-back" aria-label={backLabel} onClick={onClose}><SFChevronLeft size="sm" /></button>}
    <div className="sheet-heading-copy"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    <span className="sheet-header-actions">
      {children}
      {onShare && <button aria-label={`分享${title}`} onClick={onShare}><SFSquareAndArrowUp size="sm" /></button>}
      {!back && onClose && <button aria-label={`关闭${title}`} onClick={onClose}><SFXmark size="sm" /></button>}
    </span>
  </header>;
}
