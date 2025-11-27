"use client";

import React from 'react';
import { Zap, Shield, FileText, CheckCircle, Lock, AlertCircle, Users, Scale } from 'lucide-react';

export function Blog3Content() {
  const acteAuthentiquePoints = [
    { point: "Date certaine", description: "Preuve de la date de signature, rendant le document difficilement contestable" },
    { point: "Force probante", description: "Valeur juridique particulière conférée par l'authentification notariale" },
    { point: "Opposabilité aux tiers", description: "Le bail peut être opposé à tous, y compris aux créanciers" },
    { point: "Obligations formelles", description: "Les obligations (loyer, charges, réparations, etc.) sont reconnues comme formelles et incontestables" }
  ];

  const beneficesBailleur = [
    { 
      title: "Recouvrement plus rapide des loyers impayés",
      description: "Le bailleur peut faire valoir la 'copie exécutoire' du bail auprès d'un commissaire de justice pour engager le recouvrement : saisie des loyers, des comptes bancaires, voire des revenus du locataire.",
      avantage: "Permet de sauter l'étape judiciaire, réduisant les délais et les frais"
    },
    { 
      title: "Sécurité juridique et risque réduit de contestation",
      description: "Le bail notarié, comme acte authentique, a une date certaine et une force probante élevée. Cela rend beaucoup plus difficile toute contestation de la validité du bail ou de ses clauses.",
      avantage: "Protection renforcée pour le bailleur et le locataire. De plus, le notaire s'assure que le bail respecte toutes les obligations légales (diagnostics, mentions légales, obligations du bail, etc.), ce qui renforce la sécurité du contrat."
    }
  ];

  return (
    <article>
      <section aria-labelledby="definition">
        <h2 id="definition">Qu'est-ce que la "force exécutoire" ?</h2>
        <p className="text-lg text-gray-700 mb-4">
          La <strong>"force exécutoire"</strong> désigne le fait qu'un acte (contrat, jugement, etc.) peut être 
          <strong> immédiatement mis à exécution</strong>, c'est-à-dire que son contenu <strong>obligations, sommes dues, etc.</strong> 
          peut être recouvré ou appliqué sans qu'il soit nécessaire de passer par un nouveau jugement devant un tribunal.
        </p>
        <p className="text-gray-700 mb-6">
          Un bail locatif établi sous la forme d'un <strong>acte authentique</strong> (c'est-à-dire un bail notarié) 
          bénéficie de cette force exécutoire, à condition qu'il soit rédigé correctement.
        </p>

        <div className="bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl p-6 text-accent-foreground my-8">
          <div className="flex items-start">
            <Zap className="h-8 w-8 mr-4 flex-shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-bold mb-2 mt-0">Avantage majeur</h3>
              <p className="leading-relaxed">
                Grâce à la force exécutoire, le bail notarié permet d'agir directement sans passer par les tribunaux, 
                économisant ainsi considérablement du temps et de l'argent en cas de litige ou d'impayés.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pourquoi" className="my-12">
        <h2 id="pourquoi">Pourquoi le bail notarié donne-t-il la force exécutoire ?</h2>
        
        <div className=" rounded-xl p-6 border border-blue-200 my-8">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-blue-600 mr-3 mt-1 flex-shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-0">Parce qu'il s'agit d'un acte authentique</h3>
              <p className="text-gray-700 mb-4">
                Un bail notarié est rédigé et signé devant un notaire <strong>officier public</strong>,
                ce qui en fait un acte authentique. Cela lui confère une valeur juridique particulière : 
                <strong> date certaine, force probante, opposabilité aux tiers</strong>.
              </p>
              <p className="text-gray-700">
                Ainsi, les obligations qu'il contient (loyer, charges, réparations, etc.) sont reconnues comme 
                <strong> formelles et incontestables</strong>.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {acteAuthentiquePoints.map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{item.point}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="benefices-bailleur" className="my-12">
        <h2 id="benefices-bailleur">Quels sont les bénéfices concrets pour le bailleur ?</h2>

        <div className="space-y-6 my-8">
          {beneficesBailleur.map((benefice, index) => (
            <div key={index} className="">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 mt-0">{benefice.title}</h3>
                  <p className="text-gray-700 mb-3">{benefice.description}</p>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 ">
                    <p className="text-sm text-gray-700 ">
                      <strong className="text-green-700">Avantage :</strong> {benefice.avantage}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section aria-labelledby="transparence-locataire" className="my-12">
        <div className="">
          <div className="flex items-start">
            <Users className="h-6 w-6 text-green-600 mr-3 mt-1 flex-shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-0">Transparence et confort pour le locataire</h3>
              <p className="text-gray-700">
                Même si la force exécutoire profite surtout au bailleur, le locataire y trouve aussi un avantage : 
                il sait que le bail est fait dans les règles, que ses droits sont protégés, et que le contrat est 
                <strong> clair et incontestable</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 my-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Important</h4>
              <p className="text-sm text-gray-700">
                Contrairement à un bail sous seing privé pour lequel il faudrait d'abord obtenir un jugement, 
                le bail notarié permet de <strong>sauter l'étape judiciaire</strong>, ce qui réduit les délais et les frais.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="limites" className="my-12">
        <h2 id="limites" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Scale className="h-6 w-6 mr-3 text-orange-600" aria-hidden="true" />
          Limites de la force exécutoire
        </h2>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 my-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 mt-0">L'expulsion reste soumise à une procédure judiciaire</h3>
                <p className="text-gray-700 text-sm">
                  Avoir un bail notarié ne rend pas automatique l'expulsion du locataire. Le bailleur peut lancer un recouvrement, 
                  mais <strong>l'expulsion reste soumise à une procédure judiciaire</strong>.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <section aria-labelledby="conclusion" className="">
        <div className="">
          <h2 id="conclusion" className="text-2xl font-bold mb-4">Conclusion</h2>
          <p className="text-lg leading-relaxed mb-4">
            La force exécutoire — l'une des caractéristiques clés du bail notarié — représente un <strong>avantage majeur</strong>, 
            surtout pour un bailleur soucieux de sécuriser son investissement et d'anticiper les risques.
          </p>
          <p className="text-lg leading-relaxed mb-4">
            Grâce au caractère d'acte authentique, le bail notarié confère une <strong>date certaine</strong>, une 
            <strong> force probante</strong> et une <strong>capacité d'exécution rapide et directe</strong> en cas de manquement du locataire. 
            Cela réduit les délais, les coûts et les incertitudes comparé à un bail sous seing privé.
          </p>
          <p className="text-lg leading-relaxed">
            Pour un bailleur, le bail notarié n'est pas seulement un contrat — <strong>c'est une assurance juridique</strong>. 
            Et dans un contexte de tension locative et d'impayés, cette garantie peut faire la différence.
          </p>
        </div>
      </section>
    </article>
  );
}

