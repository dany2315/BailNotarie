"use client";

import React from 'react';
import { CheckCircle, Video, Shield, FileText, Users, Clock } from 'lucide-react';

export function Blog7Content() {
  const casUsage = [
    "Le propriétaire ou le locataire réside à l'étranger.",
    "Une des parties ne peut pas se libérer aux horaires de l'étude.",
    "La signature est urgente et les agendas ne concordent pas.",
    "Il y a plusieurs signataires (colocataires, garants) dispersés géographiquement."
  ];

  const processus = [
    {
      icon: FileText,
      title: "Nous préparons tout",
      description: "Nous constituons et vérifions l'intégralité de votre dossier."
    },
    {
      icon: Users,
      title: "Nous transmettons",
      description: "Nous envoyons le dossier conforme à notre notaire partenaire."
    },
    {
      icon: Shield,
      title: "Le notaire sécurise",
      description: "Il prend le relais uniquement pour la signature de la procuration en vidéo avec vous."
    }
  ];

  return (
    <article>
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Vous devez signer un <strong>bail notarié</strong> mais vous ne pouvez pas vous déplacer ? Que vous soyez 
          <strong> expatrié</strong>, en <strong>voyage</strong> ou retenu par le travail, la distance n'est plus un obstacle.
        </p>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          La solution juridique existe : la <strong>procuration notariée</strong>. Elle permet de valider votre bail à distance 
          avec la même sécurité qu'un rendez-vous physique. Voici l'essentiel à savoir.
        </p>
      </section>

      <section aria-labelledby="definition" className="my-12">
        <h2 id="definition" className="text-2xl font-bold text-gray-900 mb-6">
          Qu'est-ce qu'une procuration notariée ?
        </h2>
        <p className="text-gray-700 mb-4">
          La <strong>procuration</strong> est l'acte par lequel vous donnez pouvoir à une tierce personne (souvent un collaborateur du notaire) 
          de signer le bail en votre nom.
        </p>
        <p className="text-gray-700 mb-6">
          Est-ce fiable ? <strong>Oui</strong>. Lorsqu'elle est établie par un notaire, la procuration garantit au bail la même 
          <strong> valeur juridique</strong> qu'une signature en présentiel. Aujourd'hui, tout se fait à distance :
        </p>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <Video className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Visioconférence</strong> pour vérifier votre identité.</span>
            </li>
            <li className="flex items-start">
              <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Signature électronique sécurisée</strong>.</span>
            </li>
            <li className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Conservation numérique</strong> de l'acte.</span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="cas-usage" className="my-12">
        <h2 id="cas-usage" className="text-2xl font-bold text-gray-900 mb-6">
          Dans quels cas est-elle utilisée ?
        </h2>
        <p className="text-gray-700 mb-6">
          C'est la solution idéale pour gagner en <strong>flexibilité</strong>. On l'utilise quand :
        </p>

        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 my-6">
          <ul className="space-y-3">
            {casUsage.map((cas, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{cas}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cout" className="my-12">
        <h2 id="cout" className="text-2xl font-bold text-gray-900 mb-6">
          Combien ça coûte ?
        </h2>
        <p className="text-gray-700 mb-4">
          Le prix est <strong>réglementé</strong> et reste très accessible. Il faut compter environ 
          <strong> 40 €</strong> pour l'établissement de la procuration.
        </p>
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 my-6">
          <p className="text-gray-700 text-sm italic">
            <strong>Note :</strong> Ce coût est indépendant des honoraires du bail et de légers frais techniques peuvent s'ajouter 
            pour la plateforme de signature.
          </p>
        </div>
      </section>

      <section aria-labelledby="notre-service" className="my-12">
        <h2 id="notre-service" className="text-2xl font-bold text-gray-900 mb-6">
          Comment notre service simplifie vos démarches ?
        </h2>
        <p className="text-gray-700 mb-6">
          Signer à distance est simple, mais préparer le dossier juridique peut être complexe. C'est là que nous intervenons 
          pour vous offrir une <strong>solution clé en main</strong> :
        </p>

        <div className="space-y-4 my-6">
          {processus.map((etape, index) => {
            const Icon = etape.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{etape.title}</h3>
                    <p className="text-gray-700">{etape.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 my-6">
          <p className="text-gray-700">
            <strong>Résultat :</strong> Vous ne gérez aucune paperasse. Tout est encadré par notre équipe et validé par l'officier public.
          </p>
        </div>
      </section>

      <section aria-labelledby="a-retenir" className="my-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
          <h2 id="a-retenir" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="h-6 w-6 text-blue-600 mr-3" aria-hidden="true" />
            À retenir
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <strong className="text-gray-900">100 % à distance :</strong>
                <span className="text-gray-700 ml-2">Aucune présence physique requise.</span>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <strong className="text-gray-900">Sécurité juridique :</strong>
                <span className="text-gray-700 ml-2">Identique à une signature à l'étude.</span>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <strong className="text-gray-900">Coût faible :</strong>
                <span className="text-gray-700 ml-2">Environ 40 € supplémentaires.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

