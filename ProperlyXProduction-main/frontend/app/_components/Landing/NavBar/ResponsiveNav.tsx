"use client";
import Navbar from './Navbar'
import React, { useState } from 'react'
import MobileNav from './MobileNav'

const ResponsiveNav = () => {
    const [showNav,setShowNav] = useState(false);
    const openNavHandler = () => setShowNav(true);
    const closeNavHandler = () => setShowNav(false);
  return (
    <div>
        <Navbar openNav = {openNavHandler}/>
        <MobileNav showNav = {showNav} closeNav = {closeNavHandler}/>
    </div>
  )
}

export default ResponsiveNav