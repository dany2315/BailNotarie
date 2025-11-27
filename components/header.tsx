"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Scale, X, Home, Settings, BookOpen, Mail, HelpCircle , FileText, Workflow, ChevronDown } from "lucide-react";
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
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import useIsMobile  from "@/hooks/useIsMobile";
import { Badge } from "./ui/badge";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBailNotarieOpen, setIsBailNotarieOpen] = useState(false);
  const isMobile = useIsMobile();

  const bailNotarieSubItems = [
    { href: "/commencer", title: "Démarrer un bail", description: "Créer votre bail en quelques minutes" },
    { href: "/commencer/suivi", title: "Suivi en temps réel", description: "Voir l’état de votre demande instantanément" },    
  ];

  const handleMenuClick = () => {
    setIsOpen(false);
    setIsBailNotarieOpen(false);
  };

  // Réinitialiser le sous-menu quand le Sheet se ferme
  useEffect(() => {
    if (!isOpen) {
      setIsBailNotarieOpen(false);
    }
  }, [isOpen]);

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center  ">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2  rounded-lg overflow-hidden text-blue-50 ">
            <Image src="/logoLarge.png" alt="BailNotarie" width={100} height={100} className="  w-full" />
          </Link>

          {!isMobile && 
          <NavigationMenu>
            <NavigationMenuList>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/">Accueil</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/#avantages">Nos avantages</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>


              <NavigationMenuItem>
                <NavigationMenuTrigger>Bail Notarié <Badge className="bg-[#4373f5] text-white border-0 px-2 py-1 ml-3 text-xs font-medium">En ligne</Badge></NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3 bg-logo ">
                        <NavigationMenuLink asChild>
                          <div
                            className="bg-logo  flex h-full w-full flex-col justify-end rounded-lg  p-4 no-underline outline-hidden overflow-hidden transition-all duration-200 select-none focus:shadow-md md:p-6 relative"
                            
                          >
                          </div>
                        </NavigationMenuLink>
                      </li>
                      {bailNotarieSubItems.map((subItem) => (
                        <ListItem key={subItem.href} href={subItem.href} title={subItem.title} className="py-2 box-content">
                          {subItem.description}
                        </ListItem>
                      ))}
                    </ul>
                </NavigationMenuContent>
              </NavigationMenuItem> 

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/blog">Blog</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/#faq">FAQ</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/#contact">Contact</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>}
        

          {/* CTA Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <PhoneButton withLabel={false} size="sm" phoneNumber="07 49 38 77 56" className="sm:text-lg text-md px-5 py-3 h-auto border-2 border-blue-200/60 bg-background shadow-md text-[#4373f5] rounded-xl hover:bg-blue-200 transition-all duration-200" />
          </div>

          {/* Menu Mobile avec Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild >
              <Button variant="ghost" size="icon" className="md:hidden ">
                <Menu className="w-full" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[350px] sm:w-[400px]">
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
                  {/* Accueil */}
                  <Link
                    href="/"
                    onClick={handleMenuClick}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    <Home className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                    <span className="font-medium">Accueil</span>
                  </Link>

                  {/* Nos avantages */}
                  <Link
                    href="/#avantages"
                    onClick={handleMenuClick}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    <Workflow className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                    <span className="font-medium">Nos avantages</span>
                  </Link>

                  {/* Bail Notarié avec sous-menu */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => setIsBailNotarieOpen(!isBailNotarieOpen)}
                      className="flex items-center justify-between px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                        <span className="font-medium">Bail Notarié</span>
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          isBailNotarieOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    {isBailNotarieOpen && (
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-blue-100 pl-4">
                        {bailNotarieSubItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={handleMenuClick}
                            className="block px-4 py-2 text-sm text-gray-600 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200"
                          >
                            <div className="font-medium">{subItem.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{subItem.description}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blog */}
                  <Link
                    href="/blog"
                    onClick={handleMenuClick}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    <BookOpen className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                    <span className="font-medium">Blog</span>
                  </Link>

                  {/* FAQ */}
                  <Link
                    href="/#faq"
                    onClick={handleMenuClick}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    <HelpCircle className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                    <span className="font-medium">FAQ</span>
                  </Link>

                  {/* Contact */}
                  <Link
                    href="/#contact"
                    onClick={handleMenuClick}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    <Mail className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                    <span className="font-medium">Contact</span>
                  </Link>
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
                        className="w-full justify-center cursor-pointer sm:text-lg text-md px-5 py-3 h-auto border-2 border-blue-200/60 bg-background shadow-md text-[#4373f5] rounded-xl hover:bg-blue-200 transition-all duration-200"
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


function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props} className="hover:bg-accent rounded-lg " >
      <NavigationMenuLink asChild className="w-full h-full">
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}