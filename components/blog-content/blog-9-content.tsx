"use client";

import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Clock, Home, Zap, Flame, Droplets, Shield, Bug, Plane, AlertCircle, Scale, XCircle } from 'lucide-react';

export function Blog9Content() {
  const diagnosticsIllimites = [
    {
      icon: Shield,
      title: "L'Amiante (État d'amiante / DAPP)",
      concerne: "Permis de construire délivré avant le 1er juillet 1997",
      validite: "Illimitée si le diagnostic (réalisé après le 1er avril 2013) conclut à l'absence d'amiante",
      attention: "Si de l'amiante est détecté, un contrôle périodique est obligatoire tous les 3 ans",
      nuance: "Pour une location en copropriété, le « Dossier Amiante Parties Privatives » (DAPP) doit être tenu à la disposition du locataire sur simple demande"
    },
    {
      icon: FileText,
      title: "Le Plomb (CREP)",
      concerne: "Construits avant le 1er janvier 1949",
      validite: "Illimitée si le constat révèle une absence de plomb ou une concentration inférieure au seuil réglementaire (1 mg/cm²)",
      attention: "Si le seuil est dépassé, la validité tombe à 6 ans pour une location (et 1 an pour une vente). Des travaux peuvent être exigés"
    },
    {
      icon: Home,
      title: "La Loi Carrez (Surface)",
      concerne: "Biens en copropriété",
      validite: "Illimitée, tant qu'aucun travail ne vient modifier la surface (abattre une cloison, agrandissement...)"
    }
  ];

  const diagnosticsTemporaires = [
    {
      icon: Zap,
      title: "Le DPE (Performance Énergétique)",
      validite: "10 ans",
      piège: "Depuis le 1er janvier 2025, tous les DPE réalisés avant le 1er juillet 2021 ne sont plus valables",
      interdictions: [
        "Les logements G sont interdits à la location depuis 2025",
        "Les logements F seront interdits en 2028",
        "Pour les logements F et G, le loyer est gelé (interdiction de l'augmenter)"
      ],
      avantage: "Si vous avez fait des travaux (isolation, pompe à chaleur), un nouveau DPE améliorera votre étiquette"
    },
    {
      icon: Zap,
      title: "Électricité",
      concerne: "Installations intérieures de plus de 15 ans",
      validiteLocation: "6 ans",
      validiteVente: "3 ans",
      bonASavoir: "Une attestation de conformité (type Consuel) de moins de 6 ans peut remplacer le diagnostic"
    },
    {
      icon: Flame,
      title: "Gaz",
      concerne: "Installations intérieures de plus de 15 ans",
      validiteLocation: "6 ans",
      validiteVente: "3 ans",
      bonASavoir: "Une attestation de conformité (type Qualigaz) de moins de 6 ans peut remplacer le diagnostic"
    },
    {
      icon: Droplets,
      title: "Assainissement (Non collectif)",
      concerne: "Maisons non raccordées au tout-à-l'égout",
      validite: "3 ans (obligatoire pour la vente)"
    }
  ];

  const diagnosticsVolatiles = [
    {
      icon: AlertTriangle,
      title: "ERP (État des Risques et Pollutions)",
      validite: "6 mois",
      nouveaute: "Il doit être remis ou présenté au candidat locataire dès la première visite",
      regle: "Si un nouvel arrêté préfectoral tombe (inondation, plan minier), l'ERP doit être refait immédiatement, même s'il a moins de 6 mois"
    },
    {
      icon: Bug,
      title: "Termites",
      validite: "6 mois maximum",
      contexte: "Uniquement pour les zones délimitées par arrêté préfectoral"
    },
    {
      icon: Plane,
      title: "Bruit (ENSA)",
      validite: "6 mois maximum",
      contexte: "Zones proches des aéroports (Plan d'Exposition au Bruit)"
    }
  ];

  const tableauRecap = [
    { diagnostic: "DPE", vente: "10 ans", location: "10 ans", condition: "❌ DPE < Juil. 2021 = Non valable" },
    { diagnostic: "Électricité / Gaz", vente: "3 ans", location: "6 ans", condition: "Installation > 15 ans" },
    { diagnostic: "Amiante", vente: "Illimitée*", location: "Illimitée*", condition: "*Si absence d'amiante" },
    { diagnostic: "Plomb", vente: "Illimitée*", location: "Illimitée*", condition: "*Si absence de plomb" },
    { diagnostic: "Termites / ERP", vente: "6 mois", location: "6 mois", condition: "À jour de l'arrêté préfectoral" },
    { diagnostic: "Loi Carrez", vente: "Illimitée", location: "Non requis", condition: "Sauf travaux modifiant la surface" }
  ];

  const risquesJuridiques = [
    {
      icon: XCircle,
      title: "Annulation ou baisse de prix",
      description: "Si un diagnostic manque ou est erroné (dol), l'acheteur ou le locataire peut demander l'annulation de la transaction ou une baisse significative du prix/loyer."
    },
    {
      icon: AlertCircle,
      title: "Responsabilité Pénale",
      description: "En cas d'accident (électrocution, intoxication au monoxyde de carbone, saturnisme lié au plomb) dans un logement non diagnostiqué, votre responsabilité pénale peut être engagée pour \"mise en danger de la vie d'autrui\"."
    },
    {
      icon: Scale,
      title: "Sanction \"Indécence\"",
      description: "Louer un bien classé G (ou F dès 2028) est illégal. Le locataire peut exiger des travaux de mise en conformité aux frais du propriétaire, avec suspension du loyer en attendant."
    }
  ];

  return (
    <article>
      {/* Introduction */}
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Le <strong>Dossier de Diagnostic Technique (DDT)</strong> est la véritable "carte d'identité" technique de votre logement. 
          Que vous soyez bailleur ou vendeur, la loi ALUR et les décrets récents vous imposent de fournir ces documents pour garantir 
          la sécurité des occupants et la transparence de la transaction.
        </p>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Mais attention : comme les produits frais, les diagnostics immobiliers ont une <strong>date de péremption</strong>.
        </p>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 my-8">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-amber-600 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-gray-700">
              Un diagnostic périmé le jour de la signature peut entraîner <strong>l'annulation du bail</strong> ou le 
              <strong> blocage de la vente</strong>. Pour vous y retrouver en 2026, voici le guide complet des durées de validité, 
              des coûts et des pièges juridiques à éviter.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1 : Diagnostics à validité illimitée */}
      <section aria-labelledby="illimites" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
          <h2 id="illimites" className="text-xl sm:text-2xl font-bold text-gray-900">
            1. Les Diagnostics à Validité "Illimitée" (Sous conditions)
          </h2>
        </div>
        <p className="text-gray-700 mb-6">
          C'est la base solide de votre dossier. Si ces diagnostics ont été réalisés une fois et que les résultats sont conformes, 
          vous êtes tranquille pour longtemps.
        </p>

        <div className="space-y-6">
          {diagnosticsIllimites.map((diag, index) => {
            const Icon = diag.icon;
            return (
              <div key={index} className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
                <div className="flex items-start mb-4">
                  <Icon className="h-6 w-6 text-emerald-600 mr-3 flex-shrink-0 mt-7" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-gray-900">{diag.title}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Logements concernés :</span>
                    <span className="text-gray-700 ml-2">{diag.concerne}</span>
                  </div>
                  <div className="bg-white rounded p-3 border border-emerald-100">
                    <span className="font-medium text-emerald-700">Durée de validité :</span>
                    <span className="text-gray-700 ml-2">{diag.validite}</span>
                  </div>
                  {diag.attention && (
                    <div className="bg-amber-50 rounded p-3 border border-amber-200">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span className="text-gray-700"><strong>Attention :</strong> {diag.attention}</span>
                      </div>
                    </div>
                  )}
                  {diag.nuance && (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <span className="text-gray-700 italic"><strong>La nuance juridique :</strong> {diag.nuance}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2 : Diagnostics temporaires */}
      <section aria-labelledby="temporaires" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
          <h2 id="temporaires" className="text-xl sm:text-2xl font-bold text-gray-900">
            2. Les Diagnostics "Temporaires" (DPE, Élec, Gaz)
          </h2>
        </div>
        <p className="text-gray-700 mb-6">
          C'est le cœur de votre conformité. Ces documents doivent souvent être renouvelés entre deux locataires.
        </p>

        <div className="space-y-6">
          {/* DPE - Section spéciale */}
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
            <div className="flex items-start mb-4">
              <Zap className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-7" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Le DPE (Performance Énergétique) : Le point critique</h3>
                <p className="text-sm text-gray-600">Le DPE est devenu le document le plus surveillé par l'administration et les locataires.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-white rounded p-3 border border-orange-100">
                <span className="font-medium text-orange-700">Durée de validité :</span>
                <span className="text-gray-700 ml-2">{diagnosticsTemporaires[0].validite}</span>
              </div>
              <div className="bg-red-50 rounded p-4 border border-red-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-red-800 mb-2">⚠️ Le piège de 2026 :</p>
                    <p className="text-gray-700">{diagnosticsTemporaires[0].piège}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded p-3 border border-orange-100">
                <p className="text-gray-700">
                  <strong>Pourquoi le refaire avant 10 ans ?</strong> {diagnosticsTemporaires[0].avantage}
                </p>
              </div>
              <div className="bg-slate-50 rounded p-4 border border-slate-200">
                <p className="font-semibold text-gray-900 mb-2">Rappel Interdictions (France Métropolitaine) :</p>
                <ul className="space-y-1 text-gray-700">
                  {diagnosticsTemporaires[0].interdictions.map((interdiction, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{interdiction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Électricité, Gaz, Assainissement */}
          {diagnosticsTemporaires.slice(1).map((diag, index) => {
            const Icon = diag.icon;
            return (
              <div key={index} className="bg-orange-50 rounded-lg border border-orange-200 p-6">
                <div className="flex items-start mb-4">
                  <Icon className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-6" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-gray-900">{diag.title}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {diag.concerne && (
                    <div>
                      <span className="font-medium text-gray-900">Logements concernés :</span>
                      <span className="text-gray-700 ml-2">{diag.concerne}</span>
                    </div>
                  )}
                  {diag.validiteLocation && (
                    <div className="bg-white rounded p-3 border border-orange-100">
                      <div className="grid md:grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium text-orange-700">Validité Location :</span>
                          <span className="text-gray-700 ml-2">{diag.validiteLocation}</span>
                        </div>
                        {diag.validiteVente && (
                          <div>
                            <span className="font-medium text-orange-700">Validité Vente :</span>
                            <span className="text-gray-700 ml-2">{diag.validiteVente}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {diag.validite && (
                    <div className="bg-white rounded p-3 border border-orange-100">
                      <span className="font-medium text-orange-700">Validité :</span>
                      <span className="text-gray-700 ml-2">{diag.validite}</span>
                    </div>
                  )}
                  {diag.bonASavoir && (
                    <div className="bg-blue-50 rounded p-3 border border-blue-200">
                      <span className="text-gray-700"><strong>Bon à savoir :</strong> {diag.bonASavoir}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3 : Diagnostics volatiles */}
      <section aria-labelledby="volatiles" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
          <h2 id="volatiles" className="text-xl sm:text-2xl font-bold text-gray-900">
            3. Les Diagnostics "Volatiles" (Validité &lt; 6 mois)
          </h2>
        </div>
        <p className="text-gray-700 mb-6">
          Ces documents dépendent de l'environnement extérieur (risques naturels, bruit). Ils périment très vite.
        </p>

        <div className="space-y-6">
          {diagnosticsVolatiles.map((diag, index) => {
            const Icon = diag.icon;
            return (
              <div key={index} className="bg-red-50 rounded-lg border border-red-200 p-6">
                <div className="flex items-start mb-4">
                  <Icon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-6" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-gray-900">{diag.title}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white rounded p-3 border border-red-100">
                    <span className="font-medium text-red-700">Validité :</span>
                    <span className="text-gray-700 ml-2">{diag.validite}</span>
                  </div>
                  {diag.nouveaute && (
                    <div className="bg-blue-50 rounded p-3 border border-blue-200">
                      <span className="text-gray-700"><strong>Nouveauté :</strong> {diag.nouveaute}</span>
                    </div>
                  )}
                  {diag.regle && (
                    <div className="bg-amber-50 rounded p-3 border border-amber-200">
                      <span className="text-gray-700"><strong>Règle stricte :</strong> {diag.regle}</span>
                    </div>
                  )}
                  {diag.contexte && (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <span className="text-gray-700"><strong>Contexte :</strong> {diag.contexte}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tableau récapitulatif */}
      <section aria-labelledby="tableau" className="my-12">
        <h2 id="tableau" className="text-2xl font-bold text-gray-900 mb-6">
          📝 Tableau Récapitulatif : Avez-vous le bon dossier ?
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Diagnostic</th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Validité VENTE</th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Validité LOCATION</th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Condition Spéciale</th>
              </tr>
            </thead>
            <tbody>
              {tableauRecap.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{row.diagnostic}</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.vente}</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.location}</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-600 text-sm">{row.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Risques juridiques */}
      <section aria-labelledby="risques" className="my-12">
        <h2 id="risques" className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
         Risques Juridiques : Que risquez-vous en cas d'oubli ?
        </h2>
        <p className="text-gray-700 mb-6">
          Ne prenez pas le DDT à la légère. Les sanctions se sont durcies.
        </p>

        <div className="space-y-4">
          {risquesJuridiques.map((risque, index) => {
            const Icon = risque.icon;
            return (
              <div key={index} className="bg-red-50 rounded-lg border border-red-200 p-6">
                <div className="flex items-start">
                  <Icon className="h-6 w-6 text-red-600 mr-4 flex-shrink-0 mt-6" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{risque.title}</h3>
                    <p className="text-gray-700">{risque.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}



