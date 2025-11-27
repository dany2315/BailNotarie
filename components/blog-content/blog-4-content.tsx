"use client";

import React from 'react';
import Image from 'next/image';
import { CheckCircle, Clock, Scale, Shield } from 'lucide-react';

export function Blog4Content() {
  const comparisonPoints = [
    { feature: "Force exécutoire renforcée", classic: false, notarial: true },
    { feature: "Délai d'expulsion", classic: "12-18 mois", notarial: "Procédures accélérées" },
    { feature: "Protection juridique", classic: "Limitée", notarial: "Maximale" },
    { feature: "Procédures simplifiées", classic: false, notarial: true },
    { feature: "Recours en cas d'impayés", classic: "Long et coûteux", notarial: "Rapide et efficace" },
    { feature: "Coût initial", classic: "Faible", notarial: "Modéré" },
    { feature: "Coût en cas de litige", classic: "Élevé (procédure judiciaire)", notarial: "Faible (force exécutoire)" }
  ];

  return (
    <>
      <h2>Bail sous seing privé : simplicité et coût</h2>
      <p>Le bail sous seing privé reste la solution la plus courante. Il présente l'avantage d'être simple à mettre en place et moins coûteux. Cependant, en cas de litige, il nécessite une procédure judiciaire complète.</p>
      
      <h2>Bail notarié : sécurité et efficacité</h2>
      <p>Le bail notarié offre :</p>
      <ul>
        <li>Une force exécutoire immédiate</li>
        <li>Une sécurité juridique renforcée</li>
        <li>Des délais d'expulsion réduits</li>
        <li>Une protection maximale du propriétaire</li>
      </ul>
      
      {/* Section de comparaison détaillée */}
      <section aria-label="Comparaison détaillée entre bail notarié et bail classique">
        <h2 className=" font-bold mb-10  mt-10">
            Bail notarié vs bail classique
        </h2>

        <div className=" sm:bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-0 sm:p-8 lg:p-4 my-8">
          <div className="grid grid-cols-1 gap-12 items-center">
            {/* Tableau de comparaison */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full border-collapse min-w-[400px]" role="table" aria-label="Tableau comparatif entre bail notarié renforcé et bail classique">
                  <caption className="sr-only">Comparaison détaillée des caractéristiques entre le bail notarié renforcé et le bail classique</caption>
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="p-4 font-semibold text-gray-700 text-sm text-left">Critère</th>
                      <th scope="col" className="p-4 font-semibold text-gray-700 text-sm text-center">Bail classique</th>
                      <th scope="col" className="p-4 font-semibold text-gray-700 text-sm text-center">Bail notarié renforcé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonPoints.map((point, index) => {
                      const isCostRow = point.feature.includes("Coût");
                      return (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                            isCostRow ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <th scope="row" className={`p-4 font-medium ${isCostRow ? 'text-gray-900 font-semibold' : 'text-gray-900'} text-left`}>
                            {point.feature}
                          </th>
                          <td className="p-4 text-center">
                            {typeof point.classic === 'boolean' ? (
                              point.classic ? (
                                <CheckCircle className="h-5 w-5 text-green-600 mx-auto" aria-label="Disponible" />
                              ) : (
                                <div className="w-5 h-5 bg-red-100 rounded-full mx-auto flex items-center justify-center" aria-label="Non disponible">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                </div>
                              )
                            ) : (
                              <span className={`${isCostRow ? 'font-semibold' : ''} text-gray-600`}>{point.classic}</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {typeof point.notarial === 'boolean' ? (
                              point.notarial ? (
                                <CheckCircle className="h-5 w-5 text-green-600 mx-auto" aria-label="Disponible" />
                              ) : (
                                <div className="w-5 h-5 bg-red-100 rounded-full mx-auto flex items-center justify-center" aria-label="Non disponible">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                </div>
                              )
                            ) : (
                              <span className={`text-green-600 ${isCostRow ? 'font-bold' : 'font-semibold'}`}>{point.notarial}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>


            {/* Image avec overlay informatif */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Balance de la justice symbolisant l'équité entre bail notarié renforcé et bail classique"
                  width={500}
                  height={400}
                  className="object-cover w-full h-[400px]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Overlay avec points clés */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-white">
                      <Scale className="h-6 w-6" aria-hidden="true" />
                      <span className="font-semibold">Force exécutoire renforcée</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <Clock className="h-6 w-6" aria-hidden="true" />
                      <span className="font-semibold">Procédures accélérées</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <Shield className="h-6 w-6" aria-hidden="true" />
                      <span className="font-semibold">Protection juridique maximale</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Badge flottant */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                Recommandé
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <h2>Quand choisir le bail notarié ?</h2>
      <p>Le bail notarié est particulièrement recommandé pour :</p>
      <ul>
        <li>Les propriétaires souhaitant une <span className="font-bold">sécurité maximale</span></li>
        <li>Avoir une tranquillité d'esprit</li>
        <li>Être en conformité avec la loi</li>
        <li>Les propriétaires souhaitant une <span className="font-bold">gestion simplifiée</span></li>
      </ul>
      
      <h2>Conclusion</h2>
      <p>Le choix dépend de votre situation et de votre appétence au risque. 
        <span className="font-bold">Pour une sécurité maximale, le bail notarié reste le choix le plus judicieux.</span></p>
    </>
  );
}

