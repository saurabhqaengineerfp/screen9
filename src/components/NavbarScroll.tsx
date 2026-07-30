"use client";

import { useEffect } from "react";

export default function NavbarScroll() {
  useEffect(() => {
    const nav = document.getElementById("main-navbar");
    if (!nav) return;
    
    const handleScroll = () => {
      if (window.scrollY > 50) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  return null;
}
