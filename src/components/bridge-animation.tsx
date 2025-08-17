"use client"

import { useEffect, useState } from "react"

export function BridgeAnimation() {
  const [animationPhase, setAnimationPhase] = useState<"approach" | "connect" | "transfer" | "complete">(
    "approach",
  )

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase("connect"), 2000)
    const timer2 = setTimeout(() => setAnimationPhase("transfer"), 4000)
    const timer3 = setTimeout(() => setAnimationPhase("complete"), 7000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="relative w-full h-32 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
      {/* Chain A (Left - Ethereum-like) */}
      <div className="absolute bottom-4 left-4">
        <div className="w-12 h-12 rounded-full bg-blue-500 shadow-lg flex items-center justify-center text-white text-2xl font-bold">
          C1
        </div>
      </div>

      {/* Chain B (Right - Solana-like) */}
      <div className="absolute bottom-4 right-4">
        <div className="w-12 h-12 rounded-full bg-purple-500 shadow-lg flex items-center justify-center text-white text-2xl font-bold">
          C2
        </div>
      </div>

      {/* Bridge Connection */}
      <div
        className={`absolute bottom-10 left-1/4 w-1/2 h-2 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full shadow-md transition-transform duration-2000 origin-left ${
          animationPhase === "approach" ? "scale-x-0" : "scale-x-100"
        }`}
      ></div>

      {/* Token Transfer */}
      <div
        className={`absolute transition-all duration-1000 ${
          animationPhase === "approach"
            ? "bottom-12 left-1/4 opacity-0"
            : animationPhase === "connect"
              ? "bottom-8 left-1/4 opacity-100 animate-bounce"
              : animationPhase === "transfer"
                ? "bottom-8 left-3/4 opacity-100"
                : "bottom-12 left-3/4 opacity-0"
        }`}
      >
<div className="w-10 h-10 bg-red-500 rounded-full shadow-xl shadow-red-300/50 flex items-center justify-center text-black text-sm">
          AVAX
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-2 left-2 right-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className={`bg-blue-500 h-1 rounded-full transition-all duration-8000 ease-linear ${
              animationPhase === "complete" ? "w-full" : "w-0"
            }`}
          ></div>
        </div>
      </div>
    </div>
  )
}