"use client";

import { useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { DateInput, Field, ResultPanel, Segmented, ToolShell, formatLongDate, parseIsoDate, todayIso } from './tool-shell';

type Rental = 'residence' | 'autre';

// Contrats types du decret du 6 juillet 2026 et notice de l'arrete du 9 octobre 2026.
const NEW_MODEL_FROM = new Date(2026, 9, 1);
const NEW_NOTICE_FROM = new Date(2026, 9, 18);

/**
 * Indique le modele de contrat et la notice a retenir selon la date de
 * conclusion ou de renouvellement du bail d'une residence principale.
 */
export function NouveauBailChecker() {
  const [rental, setRental] = useState<Rental>('residence');
  const [signedOn, setSignedOn] = useState('');

  // Date posee apres le montage pour eviter un ecart d'hydratation.
  useEffect(() => {
    setSignedOn((current) => current || todayIso());
  }, []);

  const date = parseIsoDate(signedOn);
  const newModel = date ? date >= NEW_MODEL_FROM : false;
  const newNotice = date ? date >= NEW_NOTICE_FROM : false;

  return (
    <ToolShell
      id="verifier-modele-bail"
      icon={FileCheck2}
      eyebrow="Vérification gratuite"
      title="Quel modèle de bail et quelle notice pour votre location ?"
      description="Indiquez la date de signature ou de renouvellement du contrat : vous savez quelle version du contrat type et de la notice retenir."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Segmented<Rental>
          label="Type de location"
          value={rental}
          onChange={setRental}
          options={[
            { value: 'residence', label: 'Vide, meublée, coloc.' },
            { value: 'autre', label: 'Mobilité, saisonnier' },
          ]}
        />
        <Field label="Date de conclusion ou de renouvellement">
          {(id) => <DateInput id={id} value={signedOn} onChange={setSignedOn} />}
        </Field>
      </div>

      {rental === 'autre' ? (
        <ResultPanel tone="blocked">
          <p className="text-sm leading-relaxed text-gray-800">
            Les baux mobilité et les locations touristiques ou saisonnières ne suivent pas ces contrats types comme une
            location meublée classique. Faites vérifier le régime applicable à votre contrat.
          </p>
        </ResultPanel>
      ) : date ? (
        <ResultPanel>
          <p className="text-sm font-medium text-blue-800">Bail signé le {formatLongDate(date)}</p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 px-3.5 py-3">
              <dt className="text-gray-500">Contrat type</dt>
              <dd className={`mt-0.5 font-semibold ${newModel ? 'text-emerald-700' : 'text-gray-900'}`}>
                {newModel ? 'Nouveau modèle (décret du 6 juillet 2026)' : 'Modèle antérieur (décret de 2015)'}
              </dd>
            </div>
            <div className="rounded-xl bg-white/80 px-3.5 py-3">
              <dt className="text-gray-500">Notice d’information</dt>
              <dd className={`mt-0.5 font-semibold ${newNotice ? 'text-emerald-700' : 'text-gray-900'}`}>
                {newNotice ? 'Nouvelle notice (arrêté du 9 octobre 2026)' : 'Notice antérieure'}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            {newModel
              ? newNotice
                ? 'Contrôlez la clause résolutoire, les mentions propres au logement et joignez la notice en vigueur depuis le 18 octobre 2026.'
                : 'Entre le 1er et le 17 octobre 2026, le nouveau contrat type s’applique, mais la nouvelle notice n’était pas encore entrée en vigueur.'
              : 'Un bail conclu avant le 1er octobre 2026 n’a pas à être réécrit uniquement parce que le modèle réglementaire a changé.'}
          </p>
        </ResultPanel>
      ) : (
        <ResultPanel tone="blocked">
          <p className="text-sm text-gray-800">Indiquez une date pour lancer la vérification.</p>
        </ResultPanel>
      )}
    </ToolShell>
  );
}
