"use client"
import { useEffect, useState } from "react"

export function BridgeAnimation() {
  const [animationPhase, setAnimationPhase] = useState<"car-moving" | "dropping" | "bike-moving" | "complete">(
    "car-moving",
  )

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase("dropping"), 2000)
    const timer2 = setTimeout(() => setAnimationPhase("bike-moving"), 4000)
    const timer3 = setTimeout(() => setAnimationPhase("complete"), 7000)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="relative w-full h-32 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
      {/* Road */}
      <div className="absolute bottom-0 w-full h-4 bg-gray-400 dark:bg-gray-600">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </div>

      {/* Red Cybertruck-style Car */}
      <div
        className={`absolute bottom-4 transition-all duration-2000 ease-in-out ${
          animationPhase === "car-moving" ? "left-0" : "left-1/3"
        }`}
      >
        <div className="relative">
          <div className="w-20 h-10 relative">
            {/* Main body with angular shape */}
            <div
              className="absolute bottom-0 w-full h-6 bg-gradient-to-r from-red-600 to-red-400 shadow-xl"
              style={{
                clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            {/* Car roof with angular shape */}
            <div
              className="absolute bottom-3 left-4 w-12 h-5 bg-gradient-to-r from-red-700 to-red-500 shadow-md"
              style={{
                clipPath: "polygon(10% 0%, 90% 0%, 95% 100%, 5% 100%)",
              }}
            ></div>
            {/* Windshield with angular shape */}
            <div
              className="absolute bottom-4 left-6 w-8 h-3 bg-gradient-to-r from-blue-300 to-blue-200 opacity-90"
              style={{
                clipPath: "polygon(15% 0%, 85% 0%, 95% 100%, 5% 100%)",
              }}
            ></div>
            {/* Front grille with angular metallic look */}
            <div
              className="absolute bottom-0 right-0 w-3 h-4 bg-gradient-to-r from-gray-700 to-gray-800 shadow-sm"
              style={{
                clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            {/* Headlights with glow */}
            <div className="absolute bottom-2 right-1 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_8px_2px_rgba(255,255,0,0.8)]"></div>
            <div className="absolute bottom-4 right-1 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_8px_2px_rgba(255,255,0,0.8)]"></div>
            {/* Wheels with 3D effect and rotation */}
            <div className="absolute -bottom-1 left-3 w-4 h-4 bg-gray-900 rounded-full shadow-md animate-[spin_2s_linear_infinite]">
              <div className="absolute inset-0.5 bg-gradient-to-br from-gray-500 to-gray-300 rounded-full"></div>
            </div>
            <div className="absolute -bottom-1 right-3 w-4 h-4 bg-gray-900 rounded-full shadow-md animate-[spin_2s_linear_infinite]">
              <div className="absolute inset-0.5 bg-gradient-to-br from-gray-500 to-gray-300 rounded-full"></div>
            </div>
            {/* Side mirrors */}
            <div
              className="absolute bottom-5 left-2 w-1.5 h-1.5 bg-red-600"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            <div
              className="absolute bottom-5 right-2 w-1.5 h-1.5 bg-red-600"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Money Bag */}
      <div
        className={`absolute transition-all duration-1000 ${
          animationPhase === "car-moving"
            ? "bottom-12 left-16 opacity-0"
            : animationPhase === "dropping"
            ? "bottom-4 left-1/2 opacity-100 animate-bounce"
            : animationPhase === "bike-moving"
            ? "bottom-12 left-1/2 opacity-0"
            : "bottom-12 right-16 opacity-0"
        }`}
      >
        <div className="w-6 h-8 relative">
          <div className="absolute inset-0 bg-green-600 rounded-t-full shadow-md"></div>
          <div className="absolute top-1 left-1 w-4 h-2 bg-green-400"></div>
          <div className="absolute top-0 left-2 w-2 h-1 bg-yellow-400 rounded"></div>
          <div className="absolute top-3 left-2 w-2 h-3 text-white text-xs font-bold flex items-center justify-center">
            $
          </div>
        </div>
      </div>

      {/* Blue Cybertruck-style Car */}
      <div
        className={`absolute bottom-4 transition-all duration-2000 ease-in-out ${
          animationPhase === "bike-moving" || animationPhase === "complete" ? "right-0" : "right-1/3"
        }`}
      >
        <div className="relative">
          <div className="w-20 h-10 relative">
            {/* Main body with angular shape */}
            <div
              className="absolute bottom-0 w-full h-6 bg-gradient-to-r from-blue-600 to-blue-400 shadow-xl"
              style={{
                clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            {/* Car roof with angular shape */}
            <div
              className="absolute bottom-3 left-4 w-12 h-5 bg-gradient-to-r from-blue-700 to-blue-500 shadow-md"
              style={{
                clipPath: "polygon(10% 0%, 90% 0%, 95% 100%, 5% 100%)",
              }}
            ></div>
            {/* Windshield with angular shape */}
            <div
              className="absolute bottom-4 left-6 w-8 h-3 bg-gradient-to-r from-blue-300 to-blue-200 opacity-90"
              style={{
                clipPath: "polygon(15% 0%, 85% 0%, 95% 100%, 5% 100%)",
              }}
            ></div>
            {/* Front grille with angular metallic look */}
            <div
              className="absolute bottom-0 left-0 w-3 h-4 bg-gradient-to-r from-gray-700 to-gray-800 shadow-sm"
              style={{
                clipPath: "polygon(0% 0%, 80% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            {/* Headlights with glow */}
            <div className="absolute bottom-2 left-1 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_8px_2px_rgba(255,255,0,0.8)]"></div>
            <div className="absolute bottom-4 left-1 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_8px_2px_rgba(255,255,0,0.8)]"></div>
            {/* Side mirrors */}
            <div
              className="absolute bottom-5 left-2 w-1.5 h-1.5 bg-blue-600"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            <div
              className="absolute bottom-5 right-2 w-1.5 h-1.5 bg-blue-600"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            ></div>
            {/* Wheels with 3D effect and rotation */}
            <div className="absolute -bottom-1 left-3 w-4 h-4 bg-gray-900 rounded-full shadow-md animate-[spin_2s_linear_infinite]">
              <div className="absolute inset-0.5 bg-gradient-to-br from-gray-500 to-gray-300 rounded-full"></div>
            </div>
            <div className="absolute -bottom-1 right-3 w-4 h-4 bg-gray-900 rounded-full shadow-md animate-[spin_2s_linear_infinite]">
              <div className="absolute inset-0.5 bg-gradient-to-br from-gray-500 to-gray-300 rounded-full"></div>
            </div>
          </div>
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

      {/* Transfer Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          {animationPhase === "car-moving" && "Initiating Transfer"}
          {animationPhase === "dropping" && "Processing"}
          {animationPhase === "bike-moving" && "Finalizing"}
          {animationPhase === "complete" && "Transfer Complete"}
        </div>
      </div>
    </div>
  )
}