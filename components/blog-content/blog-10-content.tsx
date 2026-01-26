"use client";

import React from 'react';
import { Scale, AlertTriangle, Zap, Shield, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react';

export function Blog10Content() {
  const pointsExpulsion = [
    {
      icon: Scale,
      title: "Contrôle judiciaire obligatoire",
      description: "L'expulsion relève de l'ordre public. L'intervention d'un juge est obligatoire quelle que soit la forme du contrat."
    },
    {
      icon: Clock,
      title: "Délais incompressibles",
      description: "La trêve hivernale et les délais administratifs s'appliquent également aux baux notariés."
    },
    {
      icon: FileText,
      title: "Procédure légale stricte",
      description: "Commandement de payer visant la clause résolutoire, puis assignation au tribunal."
    }
  ];

  const avantagesTitreExecutoire = [
    {
      icon: Zap,
      title: "Action immédiate",
      description: "Mandatement d'un Commissaire de Justice sans attendre l'audience d'expulsion."
    },
    {
      icon: Shield,
      title: "Force de loi",
      description: "L'acte notarié possède force de loi dès sa signature, sans jugement préalable."
    },
    {
      icon: CheckCircle,
      title: "Économie de temps",
      description: "Fait l'économie de la phase déclarative devant le tribunal pour le recouvrement."
    }
  ];

  const actionsCoercitives = [
    {
      title: "Saisies conservatoires",
      description: "Blocage immédiat des comptes bancaires du locataire défaillant."
    },
    {
      title: "Saisies sur rémunérations",
      description: "Prélèvement direct sur le salaire pour sécuriser la trésorerie du propriétaire."
    },
    {
      title: "Effet dissuasif",
      description: "La perspective d'un blocage immédiat incite le débiteur à régulariser sa situation."
    }
  ];

  return (
    <article>
      {/* Introduction */}
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Dans la gestion de patrimoine immobilier, la rédaction du contrat de location est une étape décisive pour la sécurisation des revenus locatifs. Si le <strong>bail notarié</strong> (acte authentique) est souvent plébiscité par les experts, son impact réel sur la procédure d'expulsion locative demeure l'objet de nombreuses idées reçues.
        </p>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Cet article analyse la portée juridique exacte du bail notarié : s'il ne dispense pas d'une décision de justice pour l'expulsion, il constitue le <strong>levier le plus puissant</strong> en matière de recouvrement de créances.
        </p>
      </section>

      {/* Section 1 : Procédure d'expulsion */}
      <section aria-labelledby="expulsion" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-slate-500 rounded-full mr-3"></div>
          <h2 id="expulsion" className="text-xl sm:text-2xl font-bold text-gray-900">
            Procédure d'expulsion : Le cadre légal reste inchangé
          </h2>
        </div>
        
        <p className="text-gray-700 mb-6">
          Il est impératif de préciser un point de droit fondamental : <strong>le bail notarié ne permet pas de s'affranchir du contrôle judiciaire</strong> pour expulser un locataire. En France, l'expulsion relevant de l'ordre public, l'intervention d'un juge est obligatoire quelle que soit la forme du contrat.
        </p>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 my-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-amber-600 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-gray-700">
              <strong>L'acte authentique n'est donc pas un "coupe-file" procédural</strong> pour la reprise physique du logement. Le bailleur doit respecter la procédure légale stricte, débutant par le commandement de payer visant la clause résolutoire et se poursuivant par l'assignation au tribunal.
            </p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          Les délais incompressibles, tels que la trêve hivernale ou les délais administratifs, s'appliquent également aux baux notariés.
        </p>

        <div className="space-y-4 my-6">
          {pointsExpulsion.map((point, index) => {
            const Icon = point.icon;
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start">
                  <Icon className="h-5 w-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{point.title}</h3>
                    <p className="text-sm text-gray-700">{point.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2 : Le Titre Exécutoire */}
      <section aria-labelledby="titre-executoire" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
          <h2 id="titre-executoire" className="text-xl sm:text-2xl font-bold text-gray-900">
            Le Titre Exécutoire : Une force de frappe immédiate
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          L'efficacité redoutable du bail notarié réside dans sa nature de <strong>Titre Exécutoire de plein droit</strong>. Contrairement au bail sous seing privé qui nécessite d'obtenir un jugement pour exiger le paiement forcé, l'acte notarié possède force de loi dès sa signature.
        </p>

        <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200 my-6">
          <div className="flex items-start">
            <Zap className="h-6 w-6 text-emerald-600 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-gray-700">
              Cette spécificité juridique offre un <strong>avantage stratégique majeur</strong> : en cas d'impayé, le bailleur fait l'économie de la phase déclarative devant le tribunal pour le recouvrement. Il peut mandater immédiatement un Commissaire de Justice pour engager des actions coercitives, sans attendre l'audience d'expulsion.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 my-6">
          {avantagesTitreExecutoire.map((avantage, index) => {
            const Icon = avantage.icon;
            return (
              <div key={index} className="bg-emerald-50 rounded-lg border border-emerald-200 p-5">
                <div className="flex items-start">
                  <Icon className="h-5 w-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">{avantage.title}</h3>
                    <p className="text-sm text-gray-700">{avantage.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3 : Sécurisation financière */}
      <section aria-labelledby="securisation" className="my-12">
        <div className="flex items-center mb-6">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
          <h2 id="securisation" className="text-xl sm:text-2xl font-bold text-gray-900">
            Sécurisation financière et effet dissuasif
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          Grâce à ce titre, l'officier ministériel peut procéder sans délai à des <strong>saisies conservatoires</strong> sur les comptes bancaires ou à des <strong>saisies sur rémunérations</strong>. Cette réactivité permet de sécuriser la trésorerie du propriétaire et d'éviter l'accumulation critique de la dette locative durant l'instruction judiciaire.
        </p>

        <div className="space-y-4 my-6">
          {actionsCoercitives.map((action, index) => (
            <div key={index} className="bg-blue-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-700">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 my-6">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-slate-700 mr-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-gray-700">
              Au-delà du recouvrement, cette pression financière légale exerce un <strong>effet dissuasif puissant</strong> sur le locataire défaillant. La perspective d'un blocage immédiat des avoirs incite fréquemment le débiteur à régulariser sa situation ou à libérer les lieux volontairement, rendant de facto la procédure d'expulsion plus rapide.
            </p>
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section aria-labelledby="conclusion" className="my-12">
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-8 border border-slate-200">
          <h2 id="conclusion" className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Conclusion
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Le bail notarié ne remplace pas le juge, mais il arme le bailleur d'une <strong>capacité de réaction immédiate</strong> indispensable pour la protection de ses intérêts financiers.
          </p>
          <p className="text-gray-700 leading-relaxed">
            En permettant un recouvrement accéléré des créances et en exerçant une pression dissuasive efficace, l'acte authentique transforme la gestion des impayés locatifs en un processus sécurisé et optimisé.
          </p>
        </div>
      </section>
    </article>
  );
}

