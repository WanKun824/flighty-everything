"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const FlightyApp = lazy(() => import("./FlightyApp"));

function BootScreen() {
  return (
    <main className="flighty-page">
      <section className="flighty-device" aria-label="flighty Everything 正在启动">
        <div className="flighty-boot-screen">
          <strong>flighty <em>Everything</em></strong>
          <span>我的行程</span>
          <button className="visually-hidden" aria-label="打开机场资料与收藏" disabled />
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!mounted) return <BootScreen />;
  return <Suspense fallback={<BootScreen />}><FlightyApp /></Suspense>;
}
