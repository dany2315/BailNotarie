"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, Workflow, Shield, Gauge, Building2 } from "lucide-react";

export function Blog12Content() {
  return (
    <article>
      <section aria-labelledby="intro-bailnotarie-infrastructure">
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          <strong>BailNotarie</strong> est une <strong>plateforme digitale</strong> qui simplifie la
          preparation du <strong>bail notarie</strong> et la transmission du dossier au notaire.
        </p>
        <p className="text-gray-700 mb-6">
          La securite juridique est essentielle pour proteger un investissement locatif, mais le
          parcours menant a l'acte authentique reste souvent percu comme complexe. BailNotarie a
          ete concu pour rendre ce processus plus fluide, plus lisible et plus rapide.
        </p>
      </section>

      <section aria-labelledby="positionnement-bailnotarie" className="my-12">
        <h2 id="positionnement-bailnotarie" className="text-2xl font-bold text-gray-900 mb-6">
          1. Notre role : preparer, structurer et fluidifier
        </h2>
        <p className="text-gray-700 mb-4">
          Il est important de preciser notre positionnement : <strong>BailNotarie n'est pas une
          etude notariale</strong>. Nous sommes une plateforme technologique de services.
        </p>
        <p className="text-gray-700 mb-6">
          Notre expertise se situe dans l'ingenierie logicielle, l'organisation documentaire et la
          gestion administrative appliquee au droit locatif. Nous intervenons <strong>en amont de
          l'acte authentique</strong> pour supprimer les frictions qui ralentissent la signature.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ce que nous faisons</h3>
            <ul className="space-y-2 text-gray-700">
              <li>Collecte et verification des pieces</li>
              <li>Structuration du dossier locatif</li>
              <li>Transmission au notaire partenaire</li>
              <li>Suivi de l'avancement jusqu'a la signature</li>
            </ul>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ce que nous ne faisons pas</h3>
            <p className="text-gray-700">
              Nous ne remplacons pas le notaire et nous ne signons pas l'acte. L'authentification
              reste realisee par l'officier public.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="ce-que-bailnotarie-fait" className="my-12">
        <h2 id="ce-que-bailnotarie-fait" className="text-2xl font-bold text-gray-900 mb-6">
          2. Ce que BailNotarie fait concretement pour vous
        </h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Workflow className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Constitution intelligente du dossier
                </h3>
                <p className="text-gray-700">
                  Nous collectons les justificatifs, les diagnostics et les informations utiles
                  pour que le dossier soit complet avant sa transmission.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Structuration juridique</h3>
                <p className="text-gray-700">
                  Nous transformons des informations disperses en un dossier lisible, coherent et
                  exploitable par l'etude notariale.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Building2 className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Interface de liaison</h3>
                <p className="text-gray-700">
                  Nous assurons une transmission fluide du dossier vers nos notaires partenaires,
                  avec moins d'allers-retours et moins de relances.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Gauge className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Suivi en temps reel</h3>
                <p className="text-gray-700">
                  Vous pilotez l'avancement du dossier depuis un point d'entree unique, sans
                  multiplier les echanges epars.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pourquoi-confier" className="my-12">
        <h2 id="pourquoi-confier" className="text-2xl font-bold text-gray-900 mb-6">
          3. Pourquoi confier la preparation de vos baux a BailNotarie ?
        </h2>
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Une expertise de Legal Ops appliquee au bail notarie
            </h3>
            <p className="text-gray-700">
              Nous optimisons la phase operationnelle du dossier. L'objectif est simple : transmettre
              au notaire un dossier plus qualifie, plus propre et plus rapidement exploitable.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Un gain de productivite</h3>
            <p className="text-gray-700">
              Professionnels de l'immobilier, gestionnaires et foncieres peuvent deleguer la charge
              administrative de preparation et se concentrer sur leur coeur de metier.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Un reseau de notaires partenaires reactifs
            </h3>
            <p className="text-gray-700">
              Notre infrastructure est pensee pour faciliter le travail des etudes notariales et
              fluidifier l'instrumentation de l'acte partout en France.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="securite-et-digital" className="my-12">
        <h2 id="securite-et-digital" className="text-2xl font-bold text-gray-900 mb-6">
          4. La securite du bail notarie, l'agilite du digital en plus
        </h2>
        <p className="text-gray-700 mb-6">
          Le <strong>bail notarie</strong> reste l'un des outils les plus protecteurs contre les
          impayes grace a sa <strong>force executoire</strong>. BailNotarie permet d'acceder a cette
          protection sans subir les lourdeurs administratives habituelles.
        </p>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Prevention des risques :</strong> un dossier mieux prepare est un dossier plus solide.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Accessibilite :</strong> l'acte authentique devient plus simple a initier.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Transparence :</strong> chaque etape du dossier est tracee et suivie.</span>
            </li>
          </ul>
        </div>
        <p className="text-gray-700 mt-6">
          Pour comprendre le cadre juridique de fond, consultez aussi notre guide{" "}
          <Link href="/blog/bail-authentique-notaire" className="text-blue-700 hover:underline">
            bail authentique chez le notaire
          </Link>.
        </p>
      </section>

      <section aria-labelledby="a-qui-sadresse" className="my-12">
        <h2 id="a-qui-sadresse" className="text-2xl font-bold text-gray-900 mb-6">
          5. A qui s'adresse notre plateforme ?
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bailleurs prives et institutionnels</h3>
            <p className="text-gray-700 text-sm">
              Pour securiser chaque lot avec un dossier locatif prepare pour l'authentification.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Professionnels de l'immobilier</h3>
            <p className="text-gray-700 text-sm">
              Pour proposer un service premium a leurs clients sans alourdir leur gestion interne.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notaires</h3>
            <p className="text-gray-700 text-sm">
              Pour recevoir des dossiers mieux qualifies, plus lisibles et prets a etre signes.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="conclusion-bailnotarie-infrastructure" className="my-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 id="conclusion-bailnotarie-infrastructure" className="text-2xl font-bold text-gray-900 mb-4">
            Conclusion : un nouveau standard operationnel
          </h2>
          <p className="text-gray-700 mb-4">
            BailNotarie n'est pas un service accessoire : c'est une infrastructure digitale concue
            pour rendre la preparation du bail notarie plus simple, plus fiable et plus pilotable.
          </p>
          <p className="text-gray-700 mb-6">
            En nous confiant la constitution et la transmission de vos dossiers, vous choisissez
            l'efficacite technologique au service de la securite juridique la plus haute.
          </p>
          <Link
            href="/commencer"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Passer au bail notarie nouvelle generation
          </Link>
        </div>
      </section>
    </article>
  );
}
