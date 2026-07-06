import Image from "next/image";
import Link from "next/link";
import React from "react";

const Hero = () => {
  return (
    <div className="relative w-full h-[120vh] sm:h-[100vh]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-800/30 z-[10]" />

      {/* Background Image */}
      <Image
        src="/images/hero.jpg"
        alt="Hero background"
        fill
        priority
        className="object-cover"
      />
      {/* Text content */}
      <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
        <div className="text-center px-4 pointer-events-auto">
          <h1 className="text-[25px] md:text-[35px] lg:text-[45px] tracking-wide text-white font-bold uppercase mb-4 md:mb-0">
            Find Your Dream Property
          </h1>
          <p className="text-lg md:text-base text-white font-normal [word-spacing:3px]">
            Discover homes, apartments, and investments tailored to your lifestyle
          </p>
          
          <div className="mt-8 flex justify-center gap-6">
            <Link
              href="/auth/login"
              className="px-8 py-3.5 rounded-full text-white text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 cursor-pointer inline-block"
            >
              Get Started
            </Link>
            <Link
              href="/#features"
              className="px-8 py-3.5 rounded-full text-white text-base font-semibold bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;