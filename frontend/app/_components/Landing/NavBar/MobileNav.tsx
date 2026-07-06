"use client";
import React from "react";
import { navItems } from "./Links";
import Link from "next/link";
import { CgClose } from "react-icons/cg";

type Props = {
  showNav: boolean;
  closeNav: () => void;
};

const MobileNav = ({ closeNav, showNav }: Props) => {
  const sidebar = showNav ? "translate-x-0" : "translate-x-full";
  const overlay = showNav ? "opacity-70 pointer-events-auto" : "opacity-0 pointer-events-none";

  return (
    <div>
      {/* Overlay */}
      <div
        onClick={closeNav}
        className={`fixed inset-0 z-[1000] bg-black/70 transition-all duration-500 ${overlay}`}
      ></div>

      {/* Sidebar (RIGHT SIDE) */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[100%] 
          backdrop-blur-2xl
          border-l border-white/20
          shadow-[0_0_25px_rgba(0,0,0,0.4)]
          text-white z-[1000]
          flex flex-col px-6 py-10
          transform transition-transform duration-500
          ${sidebar}
        `}
      >

        {/* HEADER (Logo + Close Button) */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" onClick={closeNav}>
            <h1 className="text-white text-2xl font-bold tracking-wide uppercase">
              Properly
            </h1>
          </Link>

          <CgClose
            onClick={closeNav}
            className="w-7 h-7 text-white cursor-pointer"
          />
        </div>

        {/* NAV LINKS */}
        <div className="space-y-5">
          {navItems.map((item) => (
            <Link key={item.id} href={item.url} onClick={closeNav}>
              <p className="flex flex-col items-center justify-center text-[20px] sm:text-[30px] border-b pt-2 pb-2 border-white/40 font-medium hover:text-cyan-200">
                {item.label}
              </p>
            </Link>
          ))}
        </div>

        {/* BOTTOM SECTION */}
        <div className="space-y-6 mt-auto pt-6 border-t border-white/25">
          

          {/* Signup Button */}
          <Link
            href="/auth/login"
            onClick={closeNav}
            className="
              block w-full text-center 
              py-3 rounded-lg 
               text-white text-sm font-semibold
                bg-gray-600 shadow-[0_0_15px_rgba(0,0,0,0.4)]
                transition-all duration-300
            "
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
