"use client";

import React from 'react';
import { CheckCircle } from 'lucide-react';

export function Blog1Content() {
  const reformePoints = [
    {
      title: "Valeur équivalente à un jugement",
      description: "Le bail notarié a désormais la même valeur qu'un jugement, permettant une exécution directe sans passer par les tribunaux."
    },
    {
      title: "Commandement de payer simplifié",
      description: "Le bailleur peut mandater un commissaire de justice pour envoyer un commandement de payer au locataire défaillant."
    },
    {
      title: "Saisie directe sur salaire",
      description: "Si le locataire ne régularise pas dans un délai d'un mois, le bailleur peut lancer une saisie directe sur le salaire ou les revenus, sans procédure judiciaire longue."
    },
    {
      title: "Réduction des délais et coûts",
      description: "Cela réduit fortement les délais, les coûts, et le risque pour le bailleur par rapport à une procédure judiciaire classique."
    }
  ];

  return (
    <article>
      <section aria-labelledby="definition">
        <h2 id="definition">Qu'est-ce qu'un bail notarié ?</h2>
        <p className="text-lg text-gray-700 mb-4">
          Un <strong>bail notarié</strong> est un contrat de location (logement ou local) établi sous la forme d'un 
          <strong> acte authentique</strong> par un Notaire de France ou un notaire public. Contrairement au bail "classique" 
          sous seing privé (réalisé entre le propriétaire et le locataire ou via agence), ce type de bail bénéficie de la 
          <strong> force probante</strong> et — depuis 2025 — de la <strong>force exécutoire</strong> de l'acte notarié.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <h3 className="font-semibold text-gray-900 mb-3">Caractéristiques de l'acte notarié</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span><strong>Date certaine :</strong> L'acte notarié confère une date certaine à l'accord, ce qui le rend difficilement contestable.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span><strong>Conformité légale :</strong> Il garantit que toutes les clauses légales et réglementaires (diagnostics, obligations locatives, informations locataire, etc.) sont correctement formalisées.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span><strong>Grosse exécutoire :</strong> En cas de litige ou impayé, le bail notarié permet d'obtenir une "grosse exécutoire" — une copie exécutoire — utilisable comme un jugement, sans avoir à passer immédiatement par un tribunal.</span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="avantages" className="my-12">
        <h2 id="avantages">Les avantages du bail notarié</h2>
        
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Sécurité juridique et force exécutoire</h3>
          <p className="text-gray-700 mb-4">
            Le bail notarié fait office d'acte authentique : <strong>date certaine, incontestable, et forte valeur probante</strong>.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Pour le locataire</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Certitude sur le statut légal du bail</li>
                <li>Bonne rédaction du contrat</li>
                <li>Transparence totale</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Pour le bailleur</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Obligations respectées</li>
                <li>Clauses bien formalisées</li>
                <li>Protection contre contestations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="reforme-2025" className="my-12">
        <h2 id="reforme-2025" className="text-2xl font-bold text-gray-900 mb-4">En cas d'impayés : des recours simplifiés (réforme 2025)</h2>
        <p className="text-gray-700 mb-6">
          Depuis le <strong>1ᵉʳ juillet 2025</strong>, une réforme importante a amélioré l'efficacité du bail notarié pour les bailleurs. 
          Si le locataire ne paie plus ses loyers, voici ce que permet maintenant le bail authentique :
        </p>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          {reformePoints.map((point, index) => (
            <div key={index} className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="flex items-start">
                <span className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0 text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{point.title}</h3>
                  <p className="text-gray-700 text-sm">{point.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-300 rounded-lg p-5 my-6">
          <h4 className="font-semibold text-gray-900 mb-2">Processus simplifié</h4>
          <p className="text-sm text-gray-700">
            Le bailleur peut mandater un commissaire de justice pour envoyer un commandement de payer. 
            Si le locataire ne régularise pas dans un délai d'un mois, le bailleur peut lancer une saisie directe 
            sur le salaire (ou revenus) du locataire, sans passer par une longue procédure judiciaire.
          </p>
        </div>
      </section>

      <section aria-labelledby="protection" className="my-12">
        <h2 id="protection" className="text-2xl font-bold text-gray-900 mb-6">Protection renforcée pour bailleurs et locataires</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pour le bailleur</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Meilleure garantie</strong> de percevoir les loyers</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Dissuasion des impayés</strong> grâce à la force exécutoire</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Sécurité</strong> sur les obligations contractuelles</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pour le locataire</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Bail clair</strong> et transparent</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Conforme à la loi</strong> grâce à la validation notariale</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span><strong>Protection de ses droits</strong> par un acte authentique</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="conclusion" className="my-12">
        <h2 id="conclusion" className="text-2xl font-bold text-gray-900 mb-4">Conclusion</h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          Le bail notarié représente une <strong>solution moderne et sécurisée</strong> pour les relations locatives. 
          Avec la réforme de 2025, les avantages sont encore renforcés, notamment en cas d'impayés, où les recours sont 
          désormais simplifiés et accélérés. Que vous soyez bailleur ou locataire, le bail notarié offre une protection 
          juridique maximale et une transparence totale sur vos droits et obligations.
        </p>
      </section>
    </article>
  );
}

