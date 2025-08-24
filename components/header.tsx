"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Scale, X, Home, Briefcase, Settings, BookOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "#services", label: "Services", icon: Briefcase },
    { href: "#process", label: "Processus", icon: Settings },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/#contact", label: "Contact", icon: Mail },
  ];

  const handleMenuClick = () => {
    setIsOpen(false);
  };

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
            <Link href="/#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <PhoneButton phoneNumber="01 23 45 67 89" />
          </div>

          {/* Menu Mobile avec Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                  <Scale className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">BailNotarie</span>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  Votre partenaire pour les baux notariés sécurisés
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex flex-col h-full justify-between">
                <nav className="flex flex-col space-y-2 ">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleMenuClick}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                    >
                      <item.icon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </nav>
                <div className="  ">
                  <Separator className="my-6" />
                  
                  {/* Section contact */}
                  <div className="space-y-6">
                    <div className="px-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Contactez-nous</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>contact@bailnotarie.fr</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">📍</span>
                          <span>123 Rue de la Paix, 75001 Paris</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4">
                      <PhoneButton 
                        phoneNumber="01 23 45 67 89" 
                        className="w-full justify-center"
                        onClick={handleMenuClick}
                      />
                    </div>
                  </div>
                  
                  {/* Footer du menu */}
                  <div className=" py-6 border-t border-gray-200 mt-6">
                    <div className="px-4 text-center">
                      <p className="text-xs text-gray-500">
                        © 2024 BailNotarie. Tous droits réservés.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}