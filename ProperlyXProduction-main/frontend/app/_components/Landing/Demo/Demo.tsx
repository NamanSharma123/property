"use client"

import { Laptop, Users } from "lucide-react"
import Image from "next/image"

export default function Demo() {
  return (
    <section className="py-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Text Content */}
          <div className="space-y-8">
            <p className="text-sm text-gray-500 font-normal tracking-wide">
              Find the ideal spot for your next adventure.
            </p>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal text-gray-900 leading-[1.2]">
              Discover the world&apos;s most extraordinary stays with Properly. Whether you&apos;re planning a romantic getaway, a family vacation, or a business trip, we have the perfect space waiting for you.
            </h2>

            <div className="grid sm:grid-cols-2 gap-8 pt-8">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Laptop className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Remote Work Destinations</h3>
                <p className="text-gray-600 leading-relaxed">
                  Quiet spots with fast Wi-Fi, ideal for working in a new setting.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Family getaways</h3>
                <p className="text-gray-600 leading-relaxed">
                  Comfortable spaces perfect for family memories.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button className="bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-md transition-colors font-medium">
                Explore
              </button>
            </div>
          </div>

          {/* Right Side - Image Placeholder */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
              <Image 
                src="/images/house.jpeg" 
                alt="Modern property" 
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
