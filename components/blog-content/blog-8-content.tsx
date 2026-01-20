"use client";

import React from 'react';
import { FileText, Scale, Clock, AlertCircle, CheckCircle, Zap, Briefcase, ArrowRight } from 'lucide-react';

export function Blog8Content() {
  const etapesProcessus = [
    {
      numero: 1,
      title: "Le Commandement de Payer",
      description: "Muni de la copie exécutoire de son Bail Notarié, le bailleur mandate un Commissaire de Justice qui signifie au locataire un commandement de payer aux fins de saisie des rémunérations.",
      details: [
        { label: "Objet", value: "Purge la dette (loyers, charges, frais) et informe officiellement le débiteur." },
        { label: "Effet", value: "Ouvre un délai de forclusion de 15 jours pour régularisation." }
      ]
    },
    {
      numero: 2,
      title: "La Saisine du Commissaire Répartiteur",
      description: "À l'expiration du délai, et en l'absence de régularisation, l'huissier saisit le Commissaire Répartiteur désigné par le Tribunal Judiciaire.",
      details: [
        { label: "Copie exécutoire", value: "Du Bail Notarié" },
        { label: "Commandement", value: "De payer signifié" },
        { label: "Décompte", value: "Actualisé de la dette" }
      ]
    },
    {
      numero: 3,
      title: "Le Procès-Verbal de Saisie",
      description: "Le Commissaire Répartiteur dresse un procès-verbal de saisie qu'il notifie à l'employeur du locataire (le Tiers Saisi).",
      details: [
        { label: "Obligation 1", value: "Déclarer la situation du salarié (contrat, autres saisies)" },
        { label: "Obligation 2", value: "Procéder aux retenues sur salaire dès le versement suivant" }
      ]
    },
    {
      numero: 4,
      title: "Le Flux Financier",
      description: "L'employeur verse mensuellement les sommes saisies au Commissaire Répartiteur qui reverse les fonds au bailleur jusqu'à extinction de la dette.",
      details: []
    }
  ];

  const pointsCles = [
    {
      icon: FileText,
      title: "Bail sous seing privé",
      description: "Le bailleur doit d'abord obtenir une condamnation du locataire par le tribunal pour disposer d'un titre.",
      type: "warning"
    },
    {
      icon: Scale,
      title: "Bail Notarié",
      description: "Acte authentique revêtu de la formule exécutoire de plein droit. Accès direct à la procédure sans phase judiciaire.",
      type: "success"
    }
  ];

  return (
    <article>
      {/* Introduction */}
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Le recouvrement des loyers impayés a connu une évolution majeure avec l'entrée en vigueur, le <strong>1er juillet 2025</strong>, du 
          <strong> décret n° 2025-125</strong> relatif à la procédure de saisie des rémunérations. Cette réforme consacre la 
          <strong> déjudiciarisation</strong> de la mesure : l'intervention préalable du Juge est supprimée au profit d'une gestion directe 
          par les Commissaires de Justice.
        </p>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Pour le bailleur, cette réforme est une opportunité de <strong>réduire drastiquement les délais d'encaissement</strong>. Cependant, 
          elle est conditionnée à la détention d'un <strong>Titre Exécutoire</strong>. C'est ici que le Bail Notarié s'avère déterminant.
        </p>

        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 my-8">
          <div className="flex items-start">
            <Zap className="h-6 w-6 text-slate-700 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-gray-700">
              <strong>Le Bail Notarié</strong> est le seul instrument contractuel permettant d'activer la procédure de saisie sur salaire 
              <strong> immédiatement</strong>, sans phase judiciaire préalable — économisant ainsi les <strong>6 à 18 mois</strong> d'une procédure classique.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1 : Le Titre Exécutoire */}
      <section aria-labelledby="titre-executoire" className="my-12">
        <h2 id="titre-executoire" className="text-2xl font-bold text-gray-900 mb-6">
          1. La Clé de Voûte : Le Titre Exécutoire Notarié
        </h2>
        <p className="text-gray-700 mb-6">
          La saisie sur rémunérations est une voie d'exécution forcée strictement encadrée par le Code des procédures civiles d'exécution. 
          Elle ne peut être initiée que si la créance est constatée par un <strong>Titre Exécutoire</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          La distinction procédurale est fondamentale :
        </p>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          {pointsCles.map((point, index) => {
            const Icon = point.icon;
            return (
              <div 
                key={index} 
                className={`rounded-lg p-5 border ${
                  point.type === 'warning' 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-start">
                  <Icon 
                    className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                      point.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                    }`} 
                    aria-hidden="true" 
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{point.title}</h3>
                    <p className="text-sm text-gray-700">{point.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2 : Le Processus Opérationnel */}
      <section aria-labelledby="processus" className="my-12">
        <h2 id="processus" className="text-2xl font-bold text-gray-900 mb-6">
          2. Le Processus Opérationnel en 4 Étapes
        </h2>
        <p className="text-gray-700 mb-8">
          Depuis la réforme de 2025, la procédure est pilotée intégralement par les Commissaires de Justice (Huissiers), 
          selon un séquençage précis.
        </p>

        <div className="space-y-6">
          {etapesProcessus.map((etape, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0 border border-slate-200">
                    <span className="text-slate-700 font-semibold">{etape.numero}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{etape.title}</h3>
                    <p className="text-gray-700 mb-4">{etape.description}</p>
                    
                    {etape.details.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {etape.details.map((detail, idx) => (
                          <div key={idx} className="flex items-start text-sm">
                            <span className="font-medium text-gray-900 min-w-[100px]">{detail.label} :</span>
                            <span className="text-gray-600 ml-2">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {index < etapesProcessus.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowRight className="h-5 w-5 text-gray-300 rotate-90" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 : La Quotité Saisissable */}
      <section aria-labelledby="quotite" className="my-12">
        <h2 id="quotite" className="text-2xl font-bold text-gray-900 mb-6">
          3. Le Calibrage Financier : La Quotité Saisissable
        </h2>
        <p className="text-gray-700 mb-6">
          Le montant recouvré chaque mois n'est pas laissé à la discrétion du bailleur. Il est déterminé par le 
          <strong> Code du travail</strong> afin de garantir au débiteur un minimum vital.
        </p>

        <div className="space-y-4 my-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Scale className="h-5 w-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Le Barème progressif</h3>
                <p className="text-sm text-gray-700">
                  Le salaire net est découpé en tranches, auxquelles s'appliquent des taux de saisie progressifs 
                  (de 1/20ème pour les bas revenus à la totalité pour les tranches supérieures).
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Briefcase className="h-5 w-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Le Solde Bancaire Insaisissable (SBI)</h3>
                <p className="text-sm text-gray-700">
                  Le salarié conserve obligatoirement une somme forfaitaire équivalente au montant du RSA pour une personne seule 
                  (<strong>646,52 € au 1er avril 2025</strong>).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 my-6">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">L'avantage du Bail Notarié</h4>
              <p className="text-sm text-gray-700">
                En permettant de déclencher la saisie tôt (dès les premiers incidents de paiement), le Bail Notarié permet de 
                <strong> capter la capacité de remboursement</strong> du locataire avant que sa situation ne se dégrade, 
                optimisant ainsi le taux de recouvrement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section aria-labelledby="conclusion" className="my-12">
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-8 border border-slate-200">
          <h2 id="conclusion" className="text-2xl font-bold text-gray-900 mb-4">
            Conclusion : Une exécution sans délai
          </h2>
          <p className="text-gray-700 mb-4">
            La réforme du <strong>1er juillet 2025</strong> a transformé la saisie sur salaire en un outil de recouvrement administratif 
            d'une grande efficacité.
          </p>
          <p className="text-gray-700 mb-4">
            Toutefois, pour l'investisseur immobilier, cette célérité procédurale reste théorique sans la détention d'un 
            <strong> titre exécutoire</strong>. Le Bail Notarié s'impose donc comme le <strong>prérequis indispensable</strong> pour 
            transformer cette opportunité législative en sécurité financière réelle.
          </p>
          <p className="text-gray-700">
            Il supprime l'aléa judiciaire et aligne le temps de la procédure sur le temps de l'économie.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section aria-labelledby="cta" className="my-8">
        <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-emerald-600 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-gray-900 font-medium">
                Optimisez la sécurité de vos actifs.
              </p>
              <p className="text-gray-700 mt-1">
                L'établissement d'un <strong>Bail Notarié</strong> est la garantie d'une action immédiate en cas d'impayé.
              </p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}



