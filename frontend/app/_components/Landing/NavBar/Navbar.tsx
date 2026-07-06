"use client";
import { navItems } from "./Links";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { HiBars3BottomRight } from "react-icons/hi2";

type NavbarProps = {
  openNav: () => void;
};

const Navbar = ({ openNav }: NavbarProps) => {
  const [navBg, setNavBg] = useState(false);

  useEffect(() => {
    const handler = () => {
      setNavBg(window.scrollY >= 40);
    };
    window.addEventListener("scroll", handler);
    return () => {
      window.removeEventListener("scroll", handler);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-300
      ${
        navBg
          ? "bg-black/80 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.6)]"
          : "bg-black/40 backdrop-blur-lg"
      }`}
    >
      {/* Neon background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 h-full w-[220px] sm:w-[260px] bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-transparent blur-2xl" />
      </div>

      {/* NAVBAR */}
      <nav className="relative flex items-center justify-between h-[70px] sm:h-[80px] max-w-7xl mx-auto px-4 sm:px-6">

        {/* -------- LOGO -------- */}
        <Link href="/" className="flex items-center space-x-2">
          <h1 className="text-white text-xl sm:text-2xl font-bold tracking-wide uppercase">
            properly
          </h1>
        </Link>

        {/* -------- DESKTOP NAV -------- */}
        <div className="hidden lg:flex items-center space-x-8 xl:space-x-10">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.url}
              className="
                text-white/70 text-sm font-medium tracking-wide 
                relative group transition-all
              "
            >
              {item.label}

              {/* Hover Underline */}
              <span
                className="
                  absolute left-0 -bottom-1 h-[2px] w-full rounded-full 
                  bg-cyan-300/80 scale-x-0 group-hover:scale-x-100 
                  transition-transform duration-300 origin-left
                "
              />
            </Link>
          ))}
        </div>

        {/* -------- RIGHT SIDE -------- */}
        <div className="flex items-center space-x-4 sm:space-x-6">

          

          {/* Login Button (Only desktop) */}
          <div className="hidden lg:flex items-center space-x-4"> 
            <Link
              href="/auth/login"
              className="
                px-5 sm:px-6 py-2 rounded-full text-white text-sm font-semibold bg-white/10 shadow-[0_0_15px_rgba(0,0,0,0.4)] hover:shadow-white transition-all duration-300">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Icon */}
          <HiBars3BottomRight
            onClick={openNav}
            className="
              lg:hidden w-7 h-7 sm:w-8 sm:h-8 text-white cursor-pointer hover:text-cyan-300 transition"/>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
