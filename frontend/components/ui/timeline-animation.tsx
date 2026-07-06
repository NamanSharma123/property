/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import { motion, useInView, Variants, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface TimelineContentProps extends Omit<HTMLMotionProps<"div">, "custom"> {
  as?: string
  animationNum?: number
  customVariants?: Variants
  timelineRef?: React.RefObject<HTMLElement>
  children: React.ReactNode
}

export const TimelineContent = ({
  as = "div",
  animationNum = 0,
  customVariants,
  timelineRef,
  className,
  children,
  ...props
}: TimelineContentProps) => {
  const ref = React.useRef<HTMLElement>(null)
  const inView = useInView(ref || timelineRef || { rootMargin: "-100px" }, {
    once: true,
  })

  const defaultVariants: Variants = {
    visible: (i: number = animationNum) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: 20,
      opacity: 0,
    },
  }

  const variants = customVariants || defaultVariants

  const componentMap: Record<string, React.ElementType> = {
    div: motion.div,
    h1: motion.h1,
    h2: motion.h2,
    h3: motion.h3,
    h4: motion.h4,
    h5: motion.h5,
    h6: motion.h6,
    p: motion.p,
    span: motion.span,
    section: motion.section,
    article: motion.article,
    header: motion.header,
    footer: motion.footer,
    main: motion.main,
    nav: motion.nav,
  }

  const MotionComponent = componentMap[as] || motion.div

  return (
    <MotionComponent
      ref={ref as any}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      custom={animationNum}
      className={cn(className)}
      {...(props as any)}
    >
      {children}
    </MotionComponent>
  )
}

