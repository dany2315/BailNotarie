"use client";

import Link from "next/link";
import { Scale, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="space-y-4">
            <Link href="/" className=" w-auto rounded-lg overflow-hidden bg-white ">
              <Image src="/logoLarge.png" alt="BailNotarie" width={100} height={100} className="  w-30" />
            </Link>
            <div className="text-gray-400 text-sm">
              Bailnotarie est une plateforme de constitution de dossier de bail notarié en ligne, en 48h avec force exécutoire immédiate, pour les propriétaires bailleurs.

              <br />
              <br />
              <p>Bailnotarie n'est pas un notaire, nous sommes un service de facilitation pour les notaires.</p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Accueil</Link></li>
              <li><Link href="/commencer" className="hover:text-white transition-colors">Créer un bail notarié</Link></li>
              <li><Link href="/#process" className="hover:text-white transition-colors">Processus</Link></li>
              {/*<li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>*/}
              <li><Link href="/#avantages" className="hover:text-white transition-colors">Nos avantages</Link></li>
              <li><Link href="/#contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="font-semibold mb-4">Informations</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link href="/politique-confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="/cgv" className="hover:text-white transition-colors">CGV</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <Button variant="link" className="flex items-center space-x-2 text-white cursor-pointer" onClick={() => window.open('tel:0123456789', '_blank')}>
                <Phone className="h-4 w-4" />
                <span>07 49 38 77 56</span>
              </Button>
              <Button variant="link" className="flex items-center space-x-2 text-white cursor-pointer" onClick={() => window.open('mailto:contact@bailnotarie.fr', '_blank')}>
                <Mail className="h-4 w-4" />
                <span>contact@bailnotarie.fr</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 BailNotarie. Tous droits réservés.</p>
        </div>  
      </div>
    </footer>
  );
}