"use client";

import React from 'react';
import { FileText, CheckCircle, Shield, AlertCircle, Users, Clock } from 'lucide-react';

export function Blog5Content() {
  const obligationsCommunes = [
    "Décrire clairement le logement : adresse, type (meublé / vide), surfaces, diagnostics obligatoires (électricité, gaz, état des risques, performance énergétique, etc.)",
    "Mentionner les informations du bailleur, du locataire, la durée du bail, le loyer, les charges, le dépôt de garantie (si applicable), les modalités de révision du loyer, modalités de paiement, conditions de renouvellement ou d'indexation",
    "Indiquer les droits et devoirs de chaque partie : entretien, réparations, obligations du locataire, obligations du bailleur, inventaire si logement meublé, etc.",
    "Prévoir les cas de résiliation, les délais de préavis, les conditions de restitution du dépôt de garantie, état des lieux d'entrée et de sortie, etc."
  ];

  const obligationsNotarie = [
    {
      title: "Rédaction & publicité via notaire",
      points: [
        "Le notaire est chargé de rédiger l'acte, de vérifier l'identité des parties, de s'assurer que les clauses légales sont bien respectées, et de donner au contrat une valeur d'acte authentique",
        "Cela garantit : la date certaine de signature, l'opposabilité du bail, la conformité aux obligations légales, la sécurité juridique"
      ]
    },
    {
      title: "Clairité, lisibilité et conformité aux normes légales",
      points: [
        "Le bail notarié doit comporter toutes les mentions obligatoires : informations sur le logement, loyer, charges, obligations, diagnostics, etc.",
        "Le notaire veille à ce que rien ne soit oublié, ce qui réduit les risques d'erreur ou de clause illégale"
      ]
    },
    {
      title: "Conservation de l'acte authentique",
      points: [
        "L'original est conservé par le notaire, et chaque partie peut obtenir une copie exécutoire",
        "En cas de litige, le bailleur peut la produire ce qui simplifie les recours"
      ]
    },
    {
      title: "Respect des formalités en cas de modifications",
      points: [
        "Si le contrat de location change (durée, loyer, garanties, etc.), toute modification doit être formalisée correctement (avenant, acte, signatures, etc.) pour rester valable",
        "Le notaire peut assurer cette mise à jour"
      ]
    }
  ];

  const avantages = [
    {
      icon: Shield,
      title: "Sécurité juridique maximale",
      description: "Un bail notarié conforme aux obligations légales offre une protection élevée : en cas de litige, l'acte authentique fait foi. Contestation difficile, forte valeur probatoire, opposabilité — un vrai gage de sérénité."
    },
    {
      icon: Users,
      title: "Transparence et clarté pour les deux parties",
      description: "Le bail locataire-bailleur est clair, exhaustif, et conforme à la loi. Le locataire sait exactement ce qu'il engage. Le bailleur sait qu'il ne pourra pas être attaqué sur des absences de mentions ou des erreurs de rédaction."
    },
    {
      icon: Clock,
      title: "Gain de temps & simplification des recours",
      description: "En cas d'impayés, de dégradations, ou de litige, le bail notarié permet un recours plus direct (copie exécutoire, constat, actions). Moins de marge de contentieux, moins d'incertitude."
    },
    {
      icon: FileText,
      title: "Sécurité en matière de preuve et opposabilité",
      description: "Parce qu'un acte authentique a date certaine et valeur légale, il est plus difficile pour le locataire de contester la validité du bail ou certaines clauses. Ce type de bail protège le propriétaire comme le locataire."
    }
  ];

  const casUsage = [
    "Les propriétaires bailleurs souhaitant sécuriser leur investissement et minimiser les risques",
    "Les logements de valeur, ou les locations longues / meublées, où la stabilité et la protection juridique sont primordiales",
    "Les cas où le bailleur souhaite un contrat clair, solide, opposable, avec des garanties maximales",
    "Les situations à risques (profil locataire incertain, garanties faibles, anticipation d'impayés…)"
  ];

  return (
    <article>
      <section aria-labelledby="definition">
        <h2 id="definition">Qu'est-ce qu'un bail notarié</h2>
        <p className="text-lg text-gray-700 mb-4">
          Un <strong>bail notarié</strong> est un contrat de location établi sous la forme d'un 
          <strong> acte authentique</strong>, signé devant un notaire. Cela signifie que le document a une valeur juridique forte : 
          <strong> date certaine, force probante et opposabilité aux tiers</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          Un bail notarié n'échappe pas aux règles du droit locatif, et doit respecter un certain nombre d'obligations légales,
          ce qui en fait un contrat sécurisé pour le bailleur comme pour le locataire.
        </p>
      </section>

      <section aria-labelledby="obligations-communes" className="my-12">
        <h2 id="obligations-communes" className="text-2xl font-bold text-gray-900 mb-6">Obligations communes à tout bail (classique ou notarié)</h2>
        <p className="text-gray-700 mb-6">
          Même un bail notarié doit respecter les obligations légales applicables à la location résidentielle en France :
        </p>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <ul className="space-y-4">
            {obligationsCommunes.map((obligation, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-700">{obligation}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-gray-600 text-sm italic mt-4">
          Ces obligations légales sont communes à tous les baux — qu'ils soient sous seing privé ou notariés.
        </p>
      </section>

      <section aria-labelledby="obligations-notarie" className="my-12">
        <h2 id="obligations-notarie" className="text-2xl font-bold text-gray-900 mb-6">Obligations supplémentaires / renforcées pour un bail notarié</h2>
        <p className="text-gray-700 mb-6">
          Un bail notarié, en tant qu'acte authentique, doit en plus respecter certaines formes et formalités qui le différencient :
        </p>

        <div className="space-y-6 my-6">
          {obligationsNotarie.map((obligation, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                {obligation.title}
              </h3>
              <ul className="space-y-2">
                {obligation.points.map((point, pointIndex) => (
                  <li key={pointIndex} className="flex items-start text-gray-700">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="pourquoi-difference" className="my-12">
        <h2 id="pourquoi-difference" className="text-2xl font-bold text-gray-900 mb-6">Pourquoi ces obligations font la différence</h2>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          {avantages.map((avantage, index) => {
            const Icon = avantage.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">{avantage.title}</h3>
                    <p className="text-gray-700 text-sm">{avantage.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="attention" className="my-12">
        <h2 id="attention" className="text-2xl font-bold text-gray-900 mb-6">Ce à quoi il faut faire attention (et les limites)</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 my-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Même un bail notarié doit respecter la loi un contrat mal rédigé, incomplet ou avec des clauses illégales peut être contesté.
              </span>
            </li>
            <li className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Toute modification doit être formalisée correctement (avenant, acte authentique ou convention) un simple accord verbal ou informel ne vaut rien.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="pour-qui" className="my-12">
        <h2 id="pour-qui" className="text-2xl font-bold text-gray-900 mb-6">Pour qui le bail notarié est réellement utile</h2>
        <p className="text-gray-700 mb-6">
          Le bail notarié est particulièrement adapté pour :
        </p>

        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 my-6">
          <ul className="space-y-3">
            {casUsage.map((cas, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{cas}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="conclusion" className="">
        <div className="">
          <h2 id="conclusion" className="text-2xl font-bold text-gray-900 mb-4">Conclusion</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Un bail notarié n'est pas seulement un bail "plus formel". C'est un contrat juridiquement renforcé, bâti sur l'acte authentique, 
            qui oblige bailleur et locataire à respecter toutes les exigences légales. Grâce à la rigueur du notaire et à la force exécutoire, 
            il offre une <strong>sécurité juridique</strong>, une <strong>transparence totale</strong> et une 
            <strong> meilleure protection en cas de litige</strong> un vrai atout pour un bail sécurisé.
          </p>
        </div>
      </section>
    </article>
  );
}

