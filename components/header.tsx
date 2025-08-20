"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">BailNotarie</span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Accueil
            </Link>
            <Link href="#services" className="text-gray-700 hover:text-blue-600 transition-colors">
              Services
            </Link>
            <Link href="#process" className="text-gray-700 hover:text-blue-600 transition-colors">
              Processus
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-blue-600 transition-colors">
              Blog
            </Link>
            <Link href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <PhoneButton phoneNumber="01 23 45 67 89" />
          </div>

          {/* Menu Mobile avec Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className=" p-4  md:hidden">
                <Menu className="" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] px-8 pb-10 h-screen sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-2">
                  <Scale className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">BailNotarie</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-6 mt-8">
                <nav className="flex flex-col space-y-4">
                  <Link 
                    href="/" 
                    className="text-lg text-gray-700 hover:text-blue-600 transition-colors py-2 border-b border-gray-100"
                  >
                    Accueil
                  </Link>
                  <Link 
                    href="#services" 
                    className="text-lg text-gray-700 hover:text-blue-600 transition-colors py-2 border-b border-gray-100"
                  >
                    Services
                  </Link>
                  <Link 
                    href="#process" 
                    className="text-lg text-gray-700 hover:text-blue-600 transition-colors py-2 border-b border-gray-100"
                  >
                    Processus
                  </Link>
                  <Link 
                    href="/blog" 
                    className="text-lg text-gray-700 hover:text-blue-600 transition-colors py-2 border-b border-gray-100"
                  >
                    Blog
                  </Link>
                  <Link 
                    href="#contact" 
                    className="text-lg text-gray-700 hover:text-blue-600 transition-colors py-2 border-b border-gray-100"
                  >
                    Contact
                  </Link>
                </nav>
                <div className="pt-4 border-t border-gray-200">
                  <PhoneButton phoneNumber="01 23 45 67 89" className="w-full" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}