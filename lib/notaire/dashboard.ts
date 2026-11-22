// Tableau de bord du notaire : ce qu'il a à faire dans les dossiers qui lui sont confiés, et ce qu'il attend des clients.
// Pas de "use server" : lecture appelée par la page /notaire, pour le notaire connecté uniquement.

import { ComplementOrigin, ComplementRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notaireDossiers } from "@/lib/notaire/dossier-list";
import { notaireReviewForBail } from "@/lib/notaire/review";
import { notaireFormWaits, type NotaireFormWait } from "@/lib/notaire/form-reminders";

/** Délai avant de proposer une relance : 2 jours sans réponse depuis la demande ou la dernière relance du notaire. */
export const NOTAIRE_REMIND_AFTER_H = 48;
const HOUR = 3_600_000;

export type NotaireTaskKind = "answers" | "contact" | "verify" | "missing" | "remind" | "provision" | "sign";

export interface NotaireTask {
  key: string;
  kind: NotaireTaskKind;
  assignmentId: string;
  bailId: string;
  address: string;
  /** « Julie Bernard → Paul Martin ». */
  parties: string;
  status: string;
  /** Ce qu'il y a à faire (« Réponse du locataire à vérifier »). */
  title: string;
  detail: string;
  /** Depuis quand (ISO), pour l'ancienneté affichée. */
  since: string;
  /** Relance directe depuis le tableau de bord. */
  remindTarget?: "OWNER" | "TENANT";
  /** Relance d'un formulaire (ou du locataire à indiquer) plutôt que d'une demande de pièces. */
  form?: NotaireFormWait;
  /** Libellé du bouton. */
  action: string;
  /** Lien du bouton (le dossier, éventuellement à sa section). */
  href: string;
}

export interface NotaireWaiting {
  key: string;
  assignmentId: string;
  bailId: string;
  address: string;
  target: "OWNER" | "TENANT";
  recipientName: string;
  pending: number;
  askedAt: string;
  /** Relances faites par ce notaire (jamais celles de l'équipe). */
  reminders: number;
  lastReminderAt: string | null;
  /** Une relance est conseillée. */
  due: boolean;
  /** Attente d'un formulaire (ou du locataire à indiquer) plutôt que d'une demande de pièces. */
  form?: NotaireFormWait;
  /** Une des demandes vient de l'équipe BailNotarie. */
  byTeam?: boolean;
}

export interface NotaireAnswer {
  key: string;
  assignmentId: string;
  address: string;
  who: string;
  recipientName: string;
  submittedAt: string;
  /** Encore à vérifier. */
  toReview: boolean;
}

export interface NotaireDashboard {
  counts: { preparation: number; aContacter: number; contactes: number; provision: number; signes: number; arretes: number };
  todo: NotaireTask[];
  waiting: NotaireWaiting[];
  answers: NotaireAnswer[];
}

const ACTIVE = ["READY_FOR_NOTARY", "CLIENT_CONTACTED", "PROVISION_RECEIVED"];
const WHO = { OWNER: "propriétaire", TENANT: "locataire" } as const;
const day = (d: Date | string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const personName = (p: { firstName?: string | null; lastName?: string | null } | undefined) => [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
function partyName(party: any): string {
  if (!party) return "";
  if (party.entreprise) return party.entreprise.legalName || party.entreprise.name || "Société";
  return (party.persons ?? []).map(personName).filter(Boolean).join(" et ");
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export async function loadNotaireDashboard(userId: string): Promise<NotaireDashboard> {
  const dossiers: any[] = await notaireDossiers(userId);
  const status = (d: any): string => d.bail?.status || "READY_FOR_NOTARY";
  const PREPARATION = ["DRAFT", "AWAITING_TENANT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION"];
  const counts = {
    preparation: dossiers.filter((d) => d.bail?.id && PREPARATION.includes(status(d))).length,
    aContacter: dossiers.filter((d) => status(d) === "READY_FOR_NOTARY").length,
    contactes: dossiers.filter((d) => status(d) === "CLIENT_CONTACTED").length,
    provision: dossiers.filter((d) => status(d) === "PROVISION_RECEIVED").length,
    signes: dossiers.filter((d) => status(d) === "SIGNED").length,
    arretes: dossiers.filter((d) => ["DESISTE", "CLASSE_SANS_SUITE"].includes(status(d))).length,
  };

  const active = dossiers.filter((d) => d.bail?.id && ACTIVE.includes(status(d)));
  const bailIds = active.map((d) => d.bail.id as string);
  const byBail = new Map(active.map((d) => [d.bail.id as string, d]));
  const info = (d: any) => {
    const parties: any[] = d.bail?.parties ?? [];
    const owner = partyName(parties.find((p) => p.profilType === "PROPRIETAIRE")) || partyName(d.client) || "Propriétaire";
    const tenant = partyName(parties.find((p) => p.profilType === "LOCATAIRE"));
    return {
      assignmentId: d.id as string,
      bailId: d.bail.id as string,
      address: d.bail?.property?.fullAddress || d.property?.fullAddress || "Dossier",
      parties: tenant ? `${owner} → ${tenant}` : owner,
      status: status(d),
      href: `/notaire/dossiers?dossierId=${d.id}`,
    };
  };

  const [requests, reminders] = bailIds.length
    ? await Promise.all([
        prisma.complementRequest.findMany({
          where: {
            bailId: { in: bailIds },
            OR: [
              { origin: ComplementOrigin.NOTAIRE, status: { in: [ComplementRequestStatus.OPEN, ComplementRequestStatus.SUBMITTED] } },
              { origin: ComplementOrigin.NOTAIRE, status: ComplementRequestStatus.ACCEPTED, submittedAt: { gte: new Date(Date.now() - 7 * 24 * HOUR) } },
              // Demandes de l'équipe encore sans réponse : le notaire peut aussi relancer.
              { origin: ComplementOrigin.TEAM, status: ComplementRequestStatus.OPEN },
            ],
          },
          orderBy: { createdAt: "asc" },
          include: {
            client: { include: { persons: { orderBy: { isPrimary: "desc" }, take: 1 }, entreprise: true } },
            items: { select: { status: true } },
          },
        }),
        prisma.bailReminder.findMany({
          where: { bailId: { in: bailIds }, createdById: userId, reason: "MISSING_ITEMS", channel: "EMAIL" },
          orderBy: { createdAt: "desc" },
          select: { bailId: true, target: true, createdAt: true },
        }),
      ])
    : [[], []];

  const now = Date.now();
  const todo: NotaireTask[] = [];
  const waiting: NotaireWaiting[] = [];
  const answers: NotaireAnswer[] = [];

  // Demandes du notaire : réponses à vérifier, clients à relancer
  const seenTarget = new Set<string>();
  for (const request of requests) {
    const d = byBail.get(request.bailId);
    if (!d) continue;
    const base = info(d);
    const target = request.target as "OWNER" | "TENANT";
    const recipientName = partyName(request.client) || "";
    if (request.submittedAt && request.status !== ComplementRequestStatus.OPEN) {
      answers.push({
        key: `answer:${request.id}`,
        assignmentId: base.assignmentId,
        address: base.address,
        who: WHO[target],
        recipientName,
        submittedAt: request.submittedAt.toISOString(),
        toReview: request.status === ComplementRequestStatus.SUBMITTED,
      });
    }
    if (request.status === ComplementRequestStatus.SUBMITTED) {
      const received = request.items.filter((i) => i.status === "PROVIDED").length;
      todo.push({
        key: `answers:${request.id}`,
        kind: "answers",
        ...base,
        title: `Réponse du ${WHO[target]} à vérifier`,
        detail: `${recipientName ? `${recipientName} · ` : ""}${plural(received, "élément reçu", "éléments reçus")}`,
        since: (request.submittedAt ?? request.updatedAt).toISOString(),
        action: "Voir les réponses",
        href: `${base.href}#demandes-title`,
      });
    }
    if (request.status === ComplementRequestStatus.OPEN) {
      // Une ligne par personne attendue, même si plusieurs demandes sont ouvertes.
      const groupKey = `${request.bailId}:${target}`;
      const mine = reminders.filter((r) => r.bailId === request.bailId && r.target === target);
      const pending = requests
        .filter((r) => r.bailId === request.bailId && r.target === target && r.status === ComplementRequestStatus.OPEN)
        .reduce((n, r) => n + r.items.filter((i) => i.status === "PENDING").length, 0);
      if (seenTarget.has(groupKey)) continue;
      seenTarget.add(groupKey);
      const lastContact = Math.max(+request.createdAt, mine[0] ? +mine[0].createdAt : 0);
      const due = now - lastContact >= NOTAIRE_REMIND_AFTER_H * HOUR;
      waiting.push({
        key: `waiting:${groupKey}`,
        assignmentId: base.assignmentId,
        bailId: base.bailId,
        address: base.address,
        target,
        recipientName,
        pending,
        askedAt: request.createdAt.toISOString(),
        reminders: mine.length,
        lastReminderAt: mine[0]?.createdAt.toISOString() ?? null,
        due,
        byTeam: requests.some((r) => r.bailId === request.bailId && r.target === target && r.status === ComplementRequestStatus.OPEN && r.origin === ComplementOrigin.TEAM),
      });
      if (due) {
        todo.push({
          key: `remind:${groupKey}`,
          kind: "remind",
          ...base,
          title: `Le ${WHO[target]} n'a pas encore répondu`,
          detail: `${plural(pending, "élément attendu", "éléments attendus")} · demandé le ${day(request.createdAt)}${mine.length > 0 ? ` · vous l'avez relancé ${mine.length} fois, dernière le ${day(mine[0].createdAt)}` : " · jamais relancé"}`,
          since: new Date(lastContact).toISOString(),
          remindTarget: target,
          action: "Relancer",
          href: base.href,
        });
      }
    }
  }

  // État de chaque dossier : prise de contact, vérification, provision, signature
  for (const d of active) {
    const base = info(d);
    const assignedAt = (d.assignedAt ? new Date(d.assignedAt) : new Date()).toISOString();
    const updatedAt = (d.bail?.updatedAt ? new Date(d.bail.updatedAt) : new Date(assignedAt)).toISOString();
    if (base.status === "READY_FOR_NOTARY") {
      todo.push({ key: `contact:${base.assignmentId}`, kind: "contact", ...base, title: "Nouveau dossier : contacter les clients", detail: `Confié le ${day(assignedAt)}`, since: assignedAt, action: "Ouvrir le dossier", href: base.href });
    }
    const review = await notaireReviewForBail(base.bailId).catch(() => null);
    const asking = waiting.some((w) => w.bailId === base.bailId);
    if (review && review.toVerify > 0) {
      todo.push({
        key: `verify:${base.assignmentId}`,
        kind: "verify",
        ...base,
        title: `${plural(review.toVerify, "pièce")} à vérifier`,
        detail: "Votre vérification avant la signature",
        since: assignedAt,
        action: "Vérifier les pièces",
        href: base.href,
      });
    }
    if (review && review.missing > 0 && !asking) {
      todo.push({
        key: `missing:${base.assignmentId}`,
        kind: "missing",
        ...base,
        title: `${plural(review.missing, "pièce obligatoire manquante", "pièces obligatoires manquantes")}`,
        detail: "À demander au client",
        since: assignedAt,
        action: "Demander",
        href: base.href,
      });
    }
    if (base.status === "CLIENT_CONTACTED") {
      todo.push({ key: `provision:${base.assignmentId}`, kind: "provision", ...base, title: "Provision à recevoir", detail: "Clients contactés", since: updatedAt, action: "Ouvrir le dossier", href: base.href });
    }
    if (base.status === "PROVISION_RECEIVED" && review?.done) {
      todo.push({ key: `sign:${base.assignmentId}`, kind: "sign", ...base, title: "Prêt pour la signature", detail: "Pièces vérifiées, provision reçue", since: updatedAt, action: "Ouvrir le dossier", href: base.href });
    }
  }

  // Dossiers confiés avant d'être prêts : ce que les clients doivent encore faire (formulaire, locataire à indiquer).
  const preparing = dossiers.filter((d) => d.bail?.id && PREPARATION.includes(status(d)));
  const forms = await notaireFormWaits(preparing.map((d) => d.bail.id as string), userId);
  for (const form of forms) {
    const d = preparing.find((x) => x.bail.id === form.bailId);
    if (!d) continue;
    const base = info(d);
    const history = form.mine > 0 && form.myLastAt ? `vous l'avez relancé ${form.mine} fois, dernière le ${day(form.myLastAt)}` : "jamais relancé";
    waiting.push({
      key: `form:${form.bailId}:${form.reason}`,
      assignmentId: base.assignmentId,
      bailId: base.bailId,
      address: base.address,
      target: form.target,
      recipientName: form.partyName,
      pending: 0,
      askedAt: form.since,
      reminders: form.mine,
      lastReminderAt: form.myLastAt,
      due: form.due,
      form,
    });
    if (form.due) {
      todo.push({
        key: `form:${form.bailId}:${form.reason}`,
        kind: "remind",
        ...base,
        title:
          form.reason === "TENANT_TO_ADD"
            ? "Le propriétaire n'a pas encore indiqué son locataire"
            : form.reason === "OWNER_FORM"
              ? "Le propriétaire n'a pas terminé son formulaire"
              : "Le locataire n'a pas encore rempli son formulaire",
        detail: `Dossier en préparation · attendu depuis le ${day(form.since)} · ${history}`,
        since: form.myLastAt ?? form.since,
        remindTarget: form.target,
        form,
        action: "Relancer",
        href: base.href,
      });
    }
  }

  const ORDER: NotaireTaskKind[] = ["answers", "contact", "remind", "verify", "missing", "sign", "provision"];
  todo.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.since.localeCompare(b.since));
  waiting.sort((a, b) => Number(b.due) - Number(a.due) || a.askedAt.localeCompare(b.askedAt));
  answers.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return { counts, todo, waiting, answers: answers.slice(0, 8) };
}
