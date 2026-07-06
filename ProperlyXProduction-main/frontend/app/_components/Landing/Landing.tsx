"use client"

import Hero from "./Hero/Hero"
import Demo from "./Demo/Demo"
import Testimonials from "./Testimonials/Testimonials"
import CTA from "./CTA/CTA"
import Features from "./Features/Features"
import Counter from "./Counter/Counter"
import ResponsiveNav from "./NavBar/ResponsiveNav"
import Footer from "./Footer/Footer"



export default function Landing() {
  return (
    <main className="min-h-screen bg-white relative">
      <ResponsiveNav />
      <div className="relative z-10">
        <Hero />
        <Demo />
        <Features />
        <Counter />
        <Testimonials />
        <CTA />
      </div>
      <Footer />
    </main>
  )
}