"use client"

import dynamic from "next/dynamic"

const GiftPlayer = dynamic(() => import("./gift-player"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-[#efe7d8] text-[#201b18]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-11 w-11 animate-spin rounded-full border-2 border-[#201b18]/20 border-t-[#201b18]" />
        <p className="text-sm">Opening the record…</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <GiftPlayer />
}
