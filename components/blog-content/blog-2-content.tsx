"use client";

import React from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

export function Blog2Content() {
  const piecesObligatoires = [
    "Copie intégrale de l'acte de naissance de moins de 3 mois",
    "Pièce d'identité ou titre de séjour en cours de validité",
    "Livret de famille ou contrat de mariage",
    "Copie du PACS (le cas échéant)",
    "Questionnaire d'état civil complété",
    "RIB signé par le titulaire du compte"
  ];

  const piecesPersonneMorale = [
    "Extrait KBIS récent",
    "Statuts à jour certifiés",
    "Procès-verbal autorisant l'opération",
    "Pièce d'identité des associés",
    "PV de nomination du représentant si applicable"
  ];

  const documentsBien = [
    "Titre de propriété complet",
    "Attestation d'assurance du logement",
    "Règlement de copropriété (si concerné)",
    "Liste du mobilier (logement meublé)",
    "État des lieux contradictoire",
    "Dossier de diagnostics techniques (DPE, électricité, gaz, etc.)"
  ];

  const conditionsBail = [
    "Montant du loyer",
    "Date de paiement",
    "Dépôt de garantie",
    "Mandat de l'agence le cas échéant",
    "Avenants éventuels"
  ];

  const verificationsNotaire = [
    "Contrôle la légalité du contrat",
    "Supprime les clauses abusives",
    "Sécurise les conditions financières",
    "Vérifie les régimes matrimoniaux",
    "Garantit la force exécutoire du bail"
  ];

  const avantagesBailNotarie = [
    "Checklist intelligente de documents",
    "Contrôle automatisé du dossier",
    "Envoi au notaire partenaire",
    "Signature à distance",
    "Suivi personnalisé",
    "Zéro papier inutile"
  ];

  const erreursCourantes = [
    "Oublier un document → rejet du dossier",
    "Mal remplir l'état civil → blocage juridique",
    "Fournir un ancien KBIS",
    "Négliger les diagnostics",
    "Rédiger soi-même un faux \"bail notarié\" (ça n'existe pas)"
  ];

  const etapesResume = [
    { etape: "1", action: "Constitution du dossier" },
    { etape: "2", action: "Vérification juridique" },
    { etape: "3", action: "Transmission au notaire" },
    { etape: "4", action: "Rédaction" },
    { etape: "5", action: "Signature" },
    { etape: "6", action: "Acte exécutoire" }
  ];

  return (
    <article>
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-4">
          Établir un bail notarié, c'est choisir la <strong>sécurité juridique maximale</strong> pour sa location. 
          Contrairement à un bail classique, le bail dressé par un notaire bénéficie de la <strong>force exécutoire</strong> : 
          en cas de litige, il peut être utilisé comme un jugement.
        </p>
        <p className="text-gray-700 mb-6">
          Mais comment se déroule concrètement la procédure ? Quelles pièces fournir ? Et comment éviter les erreurs ? 
          Voici le guide complet, étape par étape.
        </p>
      </section>

      <section aria-labelledby="etape1" className="my-12">
        <h2 id="etape1" className="text-2xl font-bold text-gray-900 mb-4">Étape 1 — Constituer son dossier (la base de tout bail notarié)</h2>
        
        <p className="text-gray-700 mb-6">
          Avant même toute signature, le notaire exige un dossier complet permettant :
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
          <li>d'identifier les parties,</li>
          <li>de vérifier la capacité juridique,</li>
          <li>de sécuriser juridiquement le contrat,</li>
          <li>de garantir l'exécution future du bail.</li>
        </ul>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pièces obligatoires pour TOUS bailleurs et locataires</h3>
          <p className="text-gray-700 mb-4 text-sm">Les documents suivants sont demandés systématiquement :</p>
          <ul className="space-y-2">
            {piecesObligatoires.map((piece, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{piece}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etape2" className="my-12">
        <h2 id="etape2" className="text-2xl font-bold text-gray-900 mb-4">Étape 2 — Cas spécifique : professionnel ou société</h2>
        
        <p className="text-gray-700 mb-6">
          Si le bailleur ou le locataire est une personne morale (société, SCI, entreprise), des pièces supplémentaires sont requises :
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <ul className="space-y-2">
            {piecesPersonneMorale.map((piece, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{piece}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etape3" className="my-12">
        <h2 id="etape3" className="text-2xl font-bold text-gray-900 mb-4">Étape 3 — Documents sur le bien immobilier</h2>
        
        <p className="text-gray-700 mb-6">
          Le notaire exige une vision complète du logement loué :
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <ul className="space-y-2">
            {documentsBien.map((doc, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etape4" className="my-12">
        <h2 id="etape4" className="text-2xl font-bold text-gray-900 mb-4">Étape 4 — Fixation des conditions du bail</h2>
        
        <p className="text-gray-700 mb-6">
          Certaines informations sont juridiquement déterminantes :
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <ul className="space-y-2">
            {conditionsBail.map((condition, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etape5" className="my-12">
        <h2 id="etape5" className="text-2xl font-bold text-gray-900 mb-4">Étape 5 — Vérification juridique par le notaire</h2>
        
        <p className="text-gray-700 mb-6">
          À ce stade, le notaire :
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-6 my-6">
          <ul className="space-y-2">
            {verificationsNotaire.map((verification, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <span className="text-blue-600 mr-2">•</span>
                <span>{verification}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etape6" className="my-12">
        <h2 id="etape6" className="text-2xl font-bold text-gray-900 mb-4">Étape 6 — Signature et création de l'acte authentique</h2>
        
        <p className="text-gray-700 mb-6">
          Une fois validée :
        </p>

        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
          <li>la signature peut se faire à distance,</li>
          <li>le bail devient un acte notarié exécutoire,</li>
          <li>chaque partie reçoit une copie exécutoire.</li>
        </ul>
      </section>

      <section aria-labelledby="etape7" className="my-12">
        <h2 id="etape7" className="text-2xl font-bold text-gray-900 mb-4">Étape 7 — Enregistrement et conservation</h2>
        
        <p className="text-gray-700 mb-6">
          Le bail est :
        </p>

        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>conservé chez le notaire,</li>
          <li>opposable à tous,</li>
          <li>utilisable directement pour recouvrer un loyer impayé,</li>
          <li>juridiquement incontestable.</li>
        </ul>
      </section>

      <section aria-labelledby="bailnotarie" className="my-12">
        <h2 id="bailnotarie" className="text-2xl font-bold text-gray-900 mb-4">Pourquoi choisir BailNotarie.fr pour ces étapes ?</h2>
        
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <p className="text-gray-700 mb-4">
            <strong>La réalité :</strong> Passer directement par un notaire sans préparation = dossiers incomplets, délais rallongés, refus, relances.
          </p>
          <p className="text-gray-700 mb-4">
            BailNotarie.fr structure tout le processus :
          </p>
          <ul className="space-y-2">
            {avantagesBailNotarie.map((avantage, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{avantage}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-700 mt-4">
            Tu fais toutes les étapes en ligne, mais ton bail reste un <strong>acte notarié authentique</strong>.
          </p>
        </div>
      </section>

      <section aria-labelledby="erreurs" className="my-12">
        <h2 id="erreurs" className="text-2xl font-bold text-gray-900 mb-4">Erreurs courantes à éviter</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 my-6">
          <ul className="space-y-2">
            {erreursCourantes.map((erreur, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{erreur}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="resume" className="my-12">
        <h2 id="resume" className="text-2xl font-bold text-gray-900 mb-4">En résumé</h2>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden my-6">
          <table className="w-full border-collapse" role="table" aria-label="Résumé des étapes pour établir un bail notarié">
            <caption className="sr-only">Tableau récapitulatif des étapes pour établir un bail notarié</caption>
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="p-4 font-semibold text-gray-700 text-sm text-left border-b border-gray-200">Étape</th>
                <th scope="col" className="p-4 font-semibold text-gray-700 text-sm text-left border-b border-gray-200">Action</th>
              </tr>
            </thead>
            <tbody>
              {etapesResume.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-b-0">
                  <td className="p-4 font-medium text-gray-900">{item.etape}</td>
                  <td className="p-4 text-gray-700">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="conclusion" className="my-12">
        <h2 id="conclusion" className="text-2xl font-bold text-gray-900 mb-4">Conclusion</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-4">
          Un bail notarié n'est ni complexe ni long… à condition d'être accompagné.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Avec une plateforme comme BailNotarie.fr, tu passes : d'un parcours opaque → à un parcours sécurisé, guidé et juridique.
        </p>
      </section>
    </article>
  );
}

