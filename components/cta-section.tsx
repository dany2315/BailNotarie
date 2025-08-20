import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { ArrowRight, Shield, Clock } from "lucide-react";
import Image from "next/image";

export function CTASection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
      {/* Image de fond avec overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Signature de contrat"
          fill
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-indigo-700/80"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à sécuriser votre location ?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
            Rejoignez les milliers de propriétaires qui ont choisi la tranquillité d'esprit 
            avec un bail notarié. Démarrez votre projet dès aujourd'hui.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <Shield className="h-6 w-6 text-green-300" />
              <span className="font-medium">Sécurité juridique maximale</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <Clock className="h-6 w-6 text-green-300" />
              <span className="font-medium">Processus rapide et simple</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PhoneButton 
              phoneNumber="01 23 45 67 89" 
              size="lg"
              className="text-lg px-8 py-4 bg-green-600 hover:bg-green-700"
            />
            <Button 
              variant="outline" 
              size="lg"
              onClick={scrollToContact}
              className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Demander un devis gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p className="text-sm opacity-75 mt-6">
            Devis gratuit • Sans engagement • Réponse sous 24h
          </p>
        </div>
      </div>
    </section>
  );
}