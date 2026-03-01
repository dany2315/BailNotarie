"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Scale, X, Home, Settings, BookOpen, Mail, HelpCircle , FileText, Workflow, ChevronDown, StarIcon, ShieldCheck, PenTool, Phone, LogIn, User } from "lucide-react";
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
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import useIsMobile  from "@/hooks/useIsMobile";
import { Badge } from "./ui/badge";
import { HeaderClientInfo } from "./header-client-info";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  clientId: string | null;
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBailNotarieOpen, setIsBailNotarieOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Récupérer l'utilisateur actuel via l'API
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/user/current");
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentUser();
  }, []);

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


              {currentUser?.role === "UTILISATEUR" && currentUser?.clientId ? (
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/client">Mon espace client</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    Bail Notarié
                    <Badge className="bg-[#4373f5] text-white border-0 px-1 py-1 ml-3 text-xs font-medium">
                      <StarIcon className="w-4 h-4" />
                    </Badge>
                  </NavigationMenuTrigger>
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
              )}

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
            {isLoading ? (
              <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-lg" />
            ) : currentUser?.role === "UTILISATEUR" && currentUser?.clientId ? (
              <HeaderClientInfo />
            ) : (
              <Button
                asChild
                variant="outline"
                className="border-2 border-[#4373f5] text-[#4373f5] hover:bg-[#4373f5] hover:text-white transition-all duration-200"
              >
                <Link href="/client/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter
                </Link>
              </Button>
            )}
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
              
              
                <div className="overflow-y-auto h-auto">
                <nav className="flex flex-col space-y-2  ">
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

                  {/* Bail Notarié / Mon espace client */}
                  {currentUser?.role === "UTILISATEUR" && currentUser?.clientId ? (
                    <Link
                      href="/client"
                      onClick={handleMenuClick}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                    >
                      <User className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                      <span className="font-medium">Mon espace client</span>
                    </Link>
                  ) : (
                    <div className="flex flex-col">
                      <div
                        onClick={() => setIsBailNotarieOpen(!isBailNotarieOpen)}
                        className="flex items-center justify-between px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <PenTool className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors" />
                          <span className="font-medium">Bail Notarié</span>
                          <Badge className="bg-[#4373f5] text-white border-0 px-1 py-1 ml-3 text-xs font-medium">
                            <StarIcon className="w-4 h-4" />
                          </Badge>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                            isBailNotarieOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
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
                  )}

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
                  <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                      <DialogTrigger asChild>
                        <Link 
                          href="#"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-[#4373f5] hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                          onClick={() => setIsContactDialogOpen(true)}
                        >
                          <Mail className="h-5 w-5 text-gray-400 group-hover:text-[#4373f5] transition-colors"/>
                          <span className="font-medium">Contactez-nous</span>
                        </Link>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Contactez-nous</DialogTitle>
                          <DialogDescription>
                            Nous sommes là pour vous aider. Choisissez votre moyen de contact préféré.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Button 
                            variant="outline" 
                            className="w-full flex items-center justify-start space-x-3 text-left h-auto py-3"
                            onClick={() => {
                              window.open("mailto:contact@bailnotarie.fr", "_blank");
                            }}
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">Email</span>
                              <span className="text-sm text-gray-600">contact@bailnotarie.fr</span>
                              <span className="text-xs text-gray-500 mt-1">Réponse sous 24h</span>
                            </div>
                          </Button>

                          <Button 
                            variant="outline" 
                            className="w-full flex items-center justify-start space-x-3 text-left h-auto py-3"
                            onClick={() => {
                              window.open("tel:0749387756", "_blank");
                            }}
                          >
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">Téléphone</span>
                              <span className="text-sm text-gray-600">07 49 38 77 56</span>
                              <span className="text-xs text-gray-500 mt-1">Lun-Ven 9h-18h</span>
                            </div>
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                </nav>
                </div>
                <SheetFooter >
                  {/* Connexion / Client connecté */}
                  <Separator className="my-4" />
                 <div className=" w-full">  
                 {isLoading ? (
                    <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-lg" />
                  ) : currentUser?.role === "UTILISATEUR" && currentUser?.clientId ? (
                    <HeaderClientInfo />
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className="border-2 w-full  border-[#4373f5] text-[#4373f5] hover:bg-[#4373f5] hover:text-white transition-all duration-200"
                    >
                      <Link href="/client/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Se connecter
                      </Link>
                    </Button>
                  )}
                  </div>
                    
                  
                  {/* Footer du menu */}
                  <div className=" pt-4 pb-2 border-t border-gray-200 mt-2 w-full">
                    <div className="px-4 text-center">
                      <p className="text-xs text-gray-500">
                        © 2025 BailNotarie. Tous droits réservés.
                      </p>
                    </div>
                  </div>
                </SheetFooter>

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