"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ReactNode, useEffect, useRef } from "react"
import { ArrowRight } from "lucide-react"

interface HorizontalMarqueeProps {
  children: ReactNode
  pauseOnHover?: boolean
  reverse?: boolean
  className?: string
  speed?: number
}

function HorizontalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 40,
}: HorizontalMarqueeProps) {
  return (
    <div
      className={cn("group flex overflow-hidden", className)}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 animate-marquee",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 animate-marquee",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  )
}

const marqueeItems = [
  "Property Managers",
  "Real Estate Investors",
  "Property Owners",
  "Property Management Companies",
  "Landlords",
]

export default function CTA() {
  const marqueeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const marqueeContainer = marqueeRef.current
    if (!marqueeContainer) return

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll(".marquee-item-horizontal")
      const containerRect = marqueeContainer.getBoundingClientRect()
      const centerX = containerRect.left + containerRect.width / 2

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect()
        const itemCenterX = itemRect.left + itemRect.width / 2
        const distance = Math.abs(centerX - itemCenterX)
        const maxDistance = containerRect.width / 2
        const normalizedDistance = Math.min(distance / maxDistance, 1)
        const opacity = 1 - normalizedDistance * 0.75
        ;(item as HTMLElement).style.opacity = opacity.toString()
      })
    }

    const animationFrame = () => {
      updateOpacity()
      requestAnimationFrame(animationFrame)
    }

    const frame = requestAnimationFrame(animationFrame)

    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl"></div>
      
      <div className="w-full relative z-10">
        <div className="flex flex-col gap-16 lg:gap-20">
          {/* Top Content */}
          <div className="space-y-10 max-w-5xl mx-auto text-center px-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
              Who wants to reach the top must make one choice:
              <br />
              <span className="text-orange-400">Start moving.</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-4xl mx-auto">
              With strategy, with automation, and with someone who knows the way. 
              Step by step, we pave the path to property management excellence.
            </p>

            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Whether it&apos;s operations, finances, or tenant management → With a tailored platform 
              from Properly, you effortlessly swing to the top of the property management space.
            </p>

            <p className="text-2xl md:text-3xl font-semibold text-white mt-8">
              When are you coming to the top with us?
            </p>

            <div className="flex flex-wrap gap-5 justify-center pt-6">
              <Button 
                asChild 
                className="group relative px-8 py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <Link href="/auth/signup" className="relative z-10 flex items-center gap-2">
                  I want to dominate, not be dominated!
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <div className="pt-4 text-white/60 text-sm">
              Schedule a call. Get clarity on your current situation. Recognize potentials and 
              learn how you can successfully leverage them.
            </div>
          </div>

          {/* Bottom Marquee */}
          <div ref={marqueeRef} className="relative w-full">
            <div className="relative">
              <HorizontalMarquee speed={30} pauseOnHover={true}>
                {marqueeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light tracking-tight px-12 marquee-item-horizontal whitespace-nowrap text-white/40"
                  >
                    {item}
                  </div>
                ))}
              </HorizontalMarquee>

              {/* Left vignette */}
              <div className="pointer-events-none absolute top-0 left-0 bottom-0 w-64 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent z-10"></div>

              {/* Right vignette */}
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-64 bg-gradient-to-l from-slate-900 via-slate-900/50 to-transparent z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
