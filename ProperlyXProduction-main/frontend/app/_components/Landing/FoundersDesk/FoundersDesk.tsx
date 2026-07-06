"use client"

import Image from "next/image"
import React from "react"

import { ContainerScroll } from "@/components/ui/container-scroll-animation"

export default function FoundersDesk() {
  return (
    <section className="bg-white py-20">
      <ContainerScroll
        titleComponent={
          <>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal text-gray-900 leading-[1.2]">
              Manage your properties <br />
              <span className="text-4xl md:text-[6rem] font-normal mt-1 leading-none text-gray-900">
                with confidence
              </span>
            </h2>
          </>
        }
      >
        <Image
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&h=720&fit=crop"
          alt="property management dashboard"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-center"
          draggable={false}
        />
      </ContainerScroll>
    </section>
  )
}
