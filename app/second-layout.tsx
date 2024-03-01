'use client';

import { Noto_Sans_KR } from "next/font/google";
import localforage from "localforage";

import { useState, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

import "./globals.css";

const NotoSansKR = Noto_Sans_KR({ subsets: ["latin"] });

type LSClass = {
  school: {
    name: string,
    code: number
  },
  grade: number,
  classNum: number
};

async function getSiteCodeStatus() {
  return await (await fetch(`/api/checkSiteCode`, { cache: 'no-store' })).json();
}

export default function SecondLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSiteCodeChanged, setIsSiteCodeChanged] = useState(false);
  const [addedClasses, setAddedClasses] = useLocalStorage<Array<LSClass>>("addedClasses", []);

  useEffect(() => {
    getSiteCodeStatus().then((stat) => {
      if (stat.code === 1) {
        setIsSiteCodeChanged(true);
      }
    }).catch(() => {
      setIsSiteCodeChanged(false);
    });
  });
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  useEffect(() => {
    async function registerPeriodicFeedUpdate() {
      const registration = await navigator.serviceWorker.ready;
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName
      });
      if (status.state !== 'granted') return;
      try {
        const tags: Array<string> = await (registration as any).periodicSync.getTags();
        tags.forEach(async tag => {
          if (addedClasses.some((cls) => tag === `timetable-${cls.school.code}-${cls.grade}-${cls.classNum}`)) return;
          await (registration as any).periodicSync.unregister(tag);
        });
        addedClasses.forEach(async cls => {
          if (tags.some((tag) => tag === `timetable-${cls.school.code}-${cls.grade}-${cls.classNum}`)) return;
          await (registration as any).periodicSync.register(`timetable-${cls.school.code}-${cls.grade}-${cls.classNum}`, {
            minInterval: 60 * 60 * 1000
          });
        });
      } catch (e) { }
    }
    registerPeriodicFeedUpdate();
  }, [addedClasses]);
  useEffect(() => {
    localforage.setItem('addedClasses', addedClasses);
  }, [addedClasses]);

  if (isSiteCodeChanged) {
    return (
      <html lang="ko" style={{ fontFamily: NotoSansKR.style.fontFamily }}>
        <body className={NotoSansKR.className}>
          <main className="flex min-h-screen flex-col items-center justify-between p-12">
            <div className="border border-slate-300 rounded p-8">
              <h1 className="text-center text-3xl">데이터를 가져올 수 없음</h1>
              <br />
              <p>컴시간 사이트가 변경되어 데이터를 가져올 수 없습니다.</p>
              <p>관리자에게 문의해주세요.</p>
            </div>
          </main>
        </body>
      </html>
    );
  }
  return (
    <html lang="ko" style={{ fontFamily: NotoSansKR.style.fontFamily }}>
      <body className={NotoSansKR.className}>
        {children}
      </body>
    </html>
  );
}