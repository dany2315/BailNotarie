import { Html, Head, Body, Container, Section, Text, Img, Link, Preview, Row, Column } from "@react-email/components";
import * as React from "react";
import { EMAIL_BASE_URL, EMAIL_LOGO_URL } from "./urls";

/**
 * Mise en page commune des e-mails BailNotarie : en-tête blanc (logo et référence du dossier),
 * contenu, signature et pied de page. Les blocs ci-dessous (étapes, liste numérotée, encadrés,
 * boutons…) gardent le même dessin d'un e-mail à l'autre.
 */

import { PHONE, PHONE_HREF, HELP_REPLY, HELP_REPLY_OR_CALL } from "./contact";

export { PHONE, PHONE_HREF, HELP_REPLY, HELP_REPLY_OR_CALL };

const C = {
  ink: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f8fafc",
  blue: "#1d4ed8",
  blueSoft: "#eff6ff",
  amber: "#b45309",
  amberSoft: "#fff7ed",
  red: "#b91c1c",
  green: "#15803d",
};
const FONT = "Arial, Helvetica, sans-serif";

export function EmailLayout({
  preview,
  reference,
  footerNote,
  children,
}: {
  preview: string;
  /** Une ou deux lignes en haut à droite : « Dossier », l'adresse… */
  reference?: string[];
  /** Pourquoi la personne reçoit cet e-mail. */
  footerNote?: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f1f5f9", fontFamily: FONT, margin: 0, padding: "24px 0" }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${C.line}`,
          }}
        >
          <Section style={{ padding: "20px 32px", borderBottom: `1px solid ${C.line}` }}>
            <Row>
              <Column>
                <Link href={EMAIL_BASE_URL} style={{ textDecoration: "none", color: "#1e3a8a" }}>
                  <Img
                    src={EMAIL_LOGO_URL}
                    alt="BailNotarie"
                    width="34"
                    height="34"
                    style={{ borderRadius: "50%", display: "inline-block", verticalAlign: "middle" }}
                  />
                  <span style={{ marginLeft: "8px", fontSize: "20px", fontWeight: "bold", color: "#1e3a8a", verticalAlign: "middle" }}>
                    BailNotarie
                  </span>
                </Link>
              </Column>
              {reference && reference.length > 0 && (
                <Column align="right" style={{ fontSize: "12px", lineHeight: "17px", color: C.muted, textAlign: "right" }}>
                  {reference.map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </Column>
              )}
            </Row>
          </Section>

          <Section style={{ padding: "32px" }}>{children}</Section>

          <Section style={{ backgroundColor: C.soft, borderTop: `1px solid ${C.line}`, padding: "16px 32px" }}>
            <Text style={{ margin: 0, fontSize: "12px", lineHeight: "19px", color: C.muted }}>
              BailNotarie ·{" "}
              <Link href={PHONE_HREF} style={{ color: C.muted, textDecoration: "none" }}>
                {PHONE}
              </Link>{" "}
              ·{" "}
              <Link href={EMAIL_BASE_URL} style={{ color: C.muted, textDecoration: "none" }}>
                www.bailnotarie.fr
              </Link>
              {footerNote && (
                <>
                  <br />
                  {footerNote}
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Petit titre au-dessus du titre principal (« Bienvenue », « Bonne nouvelle »…). */
export function Kicker({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" | "red" }) {
  const color = tone === "amber" ? C.amber : tone === "red" ? C.red : C.blue;
  return (
    <Text style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", color }}>
      {children}
    </Text>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={{ margin: "0 0 16px", fontSize: "24px", lineHeight: "30px", fontWeight: "bold", color: C.ink }}>{children}</Text>;
}

export function Lead({ children, small = false, strong = false }: { children: React.ReactNode; small?: boolean; strong?: boolean }) {
  return (
    <Text
      style={{
        margin: "0 0 18px",
        fontSize: small ? "14px" : "15px",
        lineHeight: small ? "21px" : "24px",
        color: strong ? C.ink : small ? "#475569" : C.text,
        fontWeight: strong ? "bold" : "normal",
        whiteSpace: "pre-line",
      }}
    >
      {children}
    </Text>
  );
}

/** Barre d'avancement : étapes faites, étape en cours, étapes à venir. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <Section style={{ margin: "0 0 22px" }}>
      <Row>
        {steps.map((label, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <Column key={label} style={{ paddingRight: i < steps.length - 1 ? "6px" : 0, verticalAlign: "top" }}>
              <div style={{ height: "4px", borderRadius: "2px", backgroundColor: done || on ? C.blue : C.line, opacity: on ? 0.55 : 1 }} />
              <Text style={{ margin: "6px 0 0", fontSize: "11px", lineHeight: "14px", color: done || on ? C.ink : "#94a3b8", fontWeight: on ? "bold" : "normal" }}>
                {label}
              </Text>
            </Column>
          );
        })}
      </Row>
    </Section>
  );
}

/** Liste numérotée : un point fort en gras, suivi de son explication. */
export function NumberedList({ items }: { items: Array<{ title: string; text?: string }> }) {
  return (
    <Section style={{ margin: "0 0 20px" }}>
      {items.map((item, i) => (
        <Row key={i} style={{ marginBottom: "10px" }}>
          <Column style={{ width: "34px", verticalAlign: "top" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                lineHeight: "24px",
                borderRadius: "12px",
                backgroundColor: C.blueSoft,
                color: C.blue,
                fontSize: "13px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {i + 1}
            </div>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ margin: 0, fontSize: "15px", lineHeight: "23px", color: C.text }}>
              <b style={{ color: C.ink }}>{item.title}</b>
              {item.text ? ` ${item.text}` : ""}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** Encadré : un intitulé (avec une pastille éventuelle) et une explication. */
export function InfoCard({ label, badge, children }: { label: React.ReactNode; badge?: string; children?: React.ReactNode }) {
  return (
    <Section style={{ backgroundColor: C.soft, border: `1px solid ${C.line}`, borderRadius: "12px", padding: "14px 16px", margin: "0 0 12px" }}>
      <Text style={{ margin: 0, fontSize: "14px", lineHeight: "21px", fontWeight: "bold", color: C.ink }}>
        {label}
        {badge && (
          <span
            style={{
              marginLeft: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              color: C.amber,
              backgroundColor: C.amberSoft,
              borderRadius: "999px",
              padding: "2px 8px",
            }}
          >
            {badge}
          </span>
        )}
      </Text>
      {children && <Text style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: "21px", color: "#475569", whiteSpace: "pre-line" }}>{children}</Text>}
    </Section>
  );
}

/** Tableau à deux colonnes : intitulé / valeur. */
export function KeyValues({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <Section style={{ border: `1px solid ${C.line}`, borderRadius: "12px", margin: "0 0 18px", overflow: "hidden" }}>
      {rows.map(([k, v], i) => (
        <Row key={i}>
          <Column
            style={{
              width: "140px",
              backgroundColor: C.soft,
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: "bold",
              color: C.muted,
              borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none",
              verticalAlign: "top",
            }}
          >
            {k}
          </Column>
          <Column
            style={{
              padding: "10px 14px",
              fontSize: "14px",
              lineHeight: "20px",
              color: C.ink,
              borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none",
              verticalAlign: "top",
            }}
          >
            {v}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** Tableau « Condition / Avant / Maintenant », la nouvelle valeur en bleu. */
export function Compare({ rows }: { rows: Array<{ label: string; before: string; after: string }> }) {
  const cell = (last: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    fontSize: "14px",
    lineHeight: "20px",
    color: C.ink,
    borderBottom: last ? "none" : `1px solid ${C.line}`,
    verticalAlign: "top",
    textAlign: "left",
    width: "33%",
  });
  const head: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "bold",
    color: C.muted,
    backgroundColor: C.soft,
    borderBottom: `1px solid ${C.line}`,
    textAlign: "left",
    width: "33%",
  };
  return (
    <Section style={{ border: `1px solid ${C.line}`, borderRadius: "12px", margin: "0 0 18px", overflow: "hidden" }}>
      <Row>
        <Column style={head}>Condition</Column>
        <Column style={head}>Avant</Column>
        <Column style={head}>Maintenant</Column>
      </Row>
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        return (
          <Row key={i}>
            <Column style={{ ...cell(last), color: C.muted }}>{row.label}</Column>
            <Column style={{ ...cell(last), color: C.muted, textDecoration: "line-through" }}>{row.before}</Column>
            <Column style={{ ...cell(last), color: C.blue, fontWeight: "bold" }}>{row.after}</Column>
          </Row>
        );
      })}
    </Section>
  );
}

export function Quote({ children, author }: { children: React.ReactNode; author?: string }) {
  return (
    <Section style={{ backgroundColor: C.soft, borderRadius: "12px", padding: "14px 16px", margin: "0 0 18px" }}>
      {author && <Text style={{ margin: "0 0 4px", fontSize: "12px", color: C.muted }}>{author}</Text>}
      <Text style={{ margin: 0, fontSize: "15px", lineHeight: "23px", color: C.text, fontStyle: "italic", whiteSpace: "pre-line" }}>{children}</Text>
    </Section>
  );
}

/** Encadré d'alerte (orange). */
export function Warn({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Section style={{ backgroundColor: C.amberSoft, border: "1px solid #fed7aa", borderRadius: "12px", padding: "12px 16px", margin: "0 0 18px" }}>
      <Text style={{ margin: 0, fontSize: "14px", lineHeight: "21px", color: "#7c2d12", whiteSpace: "pre-line" }}>
        {title && <b>{title} </b>}
        {children}
      </Text>
    </Section>
  );
}

/** Bouton principal, et un bouton secondaire facultatif. */
export function Actions({
  primary,
  secondary,
}: {
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  const base: React.CSSProperties = {
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "bold",
    borderRadius: "10px",
    textDecoration: "none",
    margin: "0 8px 8px 0",
  };
  return (
    <Section style={{ margin: "20px 0 4px" }}>
      {primary && (
        <Link href={primary.href} style={{ ...base, backgroundColor: C.blue, color: "#ffffff", padding: "13px 20px" }}>
          {primary.label}
        </Link>
      )}
      {secondary && (
        <Link href={secondary.href} style={{ ...base, backgroundColor: "#ffffff", color: C.blue, border: `1.5px solid ${C.blue}`, padding: "12px 18px" }}>
          {secondary.label}
        </Link>
      )}
    </Section>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: "19px", color: C.muted }}>{children}</Text>;
}

/** Encadré de réassurance (bleu clair). */
export function Trust({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Section style={{ backgroundColor: C.blueSoft, borderRadius: "12px", padding: "14px 16px", margin: "22px 0 0" }}>
      <Text style={{ margin: 0, fontSize: "14px", lineHeight: "21px", color: "#1e3a8a" }}>
        <b>{title}</b>
        {children ? <> {children}</> : null}
      </Text>
    </Section>
  );
}

/** Code de connexion, en grand. */
export function CodeBox({ code, note }: { code: string; note: string }) {
  return (
    <Section style={{ backgroundColor: C.soft, border: `1px solid ${C.line}`, borderRadius: "12px", padding: "18px", margin: "0 0 18px", textAlign: "center" }}>
      <Text style={{ margin: 0, fontSize: "34px", lineHeight: "40px", fontWeight: "bold", letterSpacing: "8px", color: C.ink, fontFamily: "'Courier New', monospace" }}>
        {code}
      </Text>
      <Text style={{ margin: "4px 0 0", fontSize: "13px", color: C.muted }}>{note}</Text>
    </Section>
  );
}

/** Ligne de fichier ou d'élément reçu, avec son état à droite. */
export function FileLine({ name, status }: { name: string; status: string }) {
  return (
    <Section style={{ border: `1px solid ${C.line}`, borderRadius: "10px", padding: "10px 14px", margin: "0 0 8px" }}>
      <Row>
        <Column style={{ fontSize: "14px", fontWeight: "bold", color: C.ink }}>{name}</Column>
        <Column align="right" style={{ fontSize: "13px", color: C.green, textAlign: "right", whiteSpace: "nowrap" }}>
          {status}
        </Column>
      </Row>
    </Section>
  );
}

/** Signature : formule, équipe et une ligne d'aide facultative. */
export function Sign({ closing = "À très vite,", team = "L'équipe BailNotarie", help }: { closing?: string; team?: string; help?: React.ReactNode }) {
  return (
    <Text style={{ margin: "24px 0 0", fontSize: "14px", lineHeight: "22px", color: "#475569" }}>
      {closing}
      <br />
      <b style={{ color: C.ink }}>{team}</b>
      {help && (
        <>
          <br />
          {help}
        </>
      )}
    </Text>
  );
}


/** Lien absolu à partir d'un chemin du site. */
export function absoluteUrl(pathOrUrl: string | null | undefined) {
  const value = (pathOrUrl ?? "").trim();
  if (!value) return EMAIL_BASE_URL;
  if (/^https?:\/\//.test(value)) return value;
  return `${EMAIL_BASE_URL}/${value.replace(/^\//, "")}`;
}
