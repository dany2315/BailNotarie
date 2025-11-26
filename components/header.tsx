"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Scale, X, Home, Settings, BookOpen, Mail, HelpCircle , FileText, Workflow } from "lucide-react";
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
import Image from "next/image";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/commencer", label: "Créer un bail", icon: FileText },
    { href: "/#avantages", label: "Nos avantages", icon: Workflow },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/#faq", label: "FAQ", icon: HelpCircle },
    { href: "/#contact", label: "Contact", icon: Mail },
  ];

  const handleMenuClick = () => {
    setIsOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center  ">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2  rounded-lg overflow-hidden text-blue-50 ">
            <Image src="/logoLarge.png" alt="BailNotarie" width={100} height={100} className="  w-full" />
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Accueil
            </Link>

            <Link href="/#avantages" className="text-gray-700 hover:text-blue-600 transition-colors">
            Nos avantages
            </Link>
            <Link href="/commencer" className="text-gray-700 hover:text-blue-600 transition-colors">
              Créer un bail
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-blue-600 transition-colors">
              Blog
            </Link>
            <Link href="/#faq" className="text-gray-700 hover:text-blue-600 transition-colors">
              FAQ
            </Link>
            <Link href="/#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <PhoneButton phoneNumber="07 49 38 77 56"  />
          </div>

          {/* Menu Mobile avec Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild >
              <Button variant="ghost" size="icon" className="md:hidden ">
                <Menu className="w-full" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2  rounded-lg text-blue-50 ">
                    <Image src="/logoLarge.png" alt="BailNotarie" width={100} height={100} className="  w-30" />  
                </Link>
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
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                    >
                      <item.icon className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
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

                        <Button variant="link" className="flex items-center space-x-2 text-gray-600 cursor-pointer !pl-0 m-0" onClick={() => {
                          window.open("mailto:contact@bailnotarie.fr", "_blank");
                        }}>
                          <Mail className="h-4 w-4" />
                          <span>contact@bailnotarie.fr</span>
                        </Button>

                    </div>
                    
                    <div className="px-4">
                      <PhoneButton 
                        phoneNumber="07 49 38 77 56" 
                        className="w-full justify-center cursor-pointer"
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