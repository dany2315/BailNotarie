// PDF « Dossier complet » pour le notaire : la fiche du dossier mise en page, un sommaire cliquable,
// puis toutes les pièces à la suite, avec des signets par partie et par pièce.
// Les PDF sont recopiés tels quels ; les photos JPG/PNG deviennent des pages A4 ; ce qui ne peut pas
// être intégré (PDF protégé, Word, HEIC…) est remplacé par une page qui le signale.

import {
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFPage,
  PDFRef,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import type { DossierDocument, FactSection, NotaireDossierView } from "@/lib/notaire/dossier-view";
import { documentReadUrl } from "@/lib/notaire/dossier-files";

const W = 595.28;
const H = 841.89;
const M = 48;
const PRIMARY = rgb(0.29, 0.36, 0.94);
const INK = rgb(0.13, 0.15, 0.2);
const MUTED = rgb(0.42, 0.45, 0.52);
const LINE = rgb(0.86, 0.87, 0.9);
const SOFT = rgb(0.95, 0.96, 0.98);
const WHITE = rgb(1, 1, 1);

interface Fonts {
  r: PDFFont;
  b: PDFFont;
  /** Caractères que les polices standard savent écrire (WinAnsi). */
  charset: Set<number>;
  /** Pages de pièces créées ici (photos, avertissements) : elles reçoivent un pied de page. */
  generated: Set<PDFPage>;
}

/** Lettres sans équivalent accentué décomposable (noms d'Europe centrale, etc.) et flèches. */
const TRANSLIT: Record<string, string> = {
  Ł: "L", ł: "l", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ı: "i", Ŀ: "L", ŀ: "l", Ŋ: "N", ŋ: "n", Ŧ: "T", ŧ: "t",
  "→": "->", "←": "<-", "≤": "<=", "≥": ">=", "≠": "!=", "✓": "v", "✔": "v",
};

/** Remplace ce que la police standard ne sait pas écrire : espaces fines, lettres d'autres alphabets… */
function clean(text: string, f: Fonts): string {
  let out = "";
  for (const ch of text.replace(/[   ]/g, " ").replace(/[\r\n\t]+/g, " ")) {
    const code = ch.codePointAt(0)!;
    if (f.charset.has(code)) {
      out += ch;
      continue;
    }
    if (TRANSLIT[ch]) {
      out += TRANSLIT[ch];
      continue;
    }
    if (code > 0xffff) continue; // Émoticônes : rien à écrire
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    out += base && [...base].every((c) => f.charset.has(c.codePointAt(0)!)) ? base : "?";
  }
  return out;
}

/** Découpe un texte en lignes qui tiennent dans la largeur donnée. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // Mot plus long que la ligne (adresse e-mail, IBAN) : coupé au caractère.
  return lines.flatMap((l) => {
    if (font.widthOfTextAtSize(l, size) <= width) return [l];
    const parts: string[] = [];
    let cur = "";
    for (const ch of l) {
      if (font.widthOfTextAtSize(cur + ch, size) > width && cur) {
        parts.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) parts.push(cur);
    return parts;
  });
}

function footer(page: PDFPage, f: Fonts, address: string, right: string) {
  page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: LINE });
  const left = clean(`BailNotarie · ${address}`, f);
  const max = W - 2 * M - f.r.widthOfTextAtSize(right, 8) - 20;
  const shown = wrap(left, f.r, 8, max)[0] ?? "";
  page.drawText(shown, { x: M, y: 26, size: 8, font: f.r, color: MUTED });
  page.drawText(right, { x: W - M - f.r.widthOfTextAtSize(right, 8), y: 26, size: 8, font: f.r, color: MUTED });
}

function pieceHeader(page: PDFPage, f: Fonts, groupTitle: string, docTitle: string) {
  f.generated.add(page);
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: SOFT });
  page.drawRectangle({ x: 0, y: H - 70, width: 4, height: 70, color: PRIMARY });
  page.drawText(wrap(clean(groupTitle.toUpperCase(), f), f.b, 8.5, W - 2 * M)[0] ?? "", { x: M, y: H - 32, size: 8.5, font: f.b, color: PRIMARY });
  page.drawText(wrap(clean(docTitle, f), f.b, 16, W - 2 * M)[0] ?? "", { x: M, y: H - 54, size: 16, font: f.b, color: INK });
}

/* -------------------------------------------------------------------------- */
/*                               Fiche du dossier                             */
/* -------------------------------------------------------------------------- */

function drawFiche(doc: PDFDocument, f: Fonts, view: NotaireDossierView): PDFPage[] {
  const pages: PDFPage[] = [];
  let page = doc.addPage([W, H]);
  pages.push(page);

  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: PRIMARY });
  page.drawText("BailNotarie", { x: M, y: H - 50, size: 12, font: f.b, color: WHITE });
  page.drawText("Dossier complet", { x: M, y: H - 88, size: 26, font: f.b, color: WHITE });
  page.drawText(wrap(clean(view.address, f), f.r, 12, W - 2 * M)[0] ?? "", { x: M, y: H - 112, size: 12, font: f.r, color: rgb(0.88, 0.9, 1) });
  const generated = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });
  const subtitle = [view.bailLabel, `Généré le ${generated}`, `${view.documentCount} pièce${view.documentCount > 1 ? "s" : ""}`].filter(Boolean).join(" · ");
  page.drawText(wrap(clean(subtitle, f), f.r, 9, W - 2 * M)[0] ?? "", { x: M, y: H - 132, size: 9, font: f.r, color: rgb(0.88, 0.9, 1) });

  const blocks: Array<{ heading: string; section: FactSection }> = [];
  for (const party of view.parties) {
    const role = party.role === "OWNER" ? "Propriétaire" : "Locataire";
    party.sections.forEach((section) =>
      blocks.push({ heading: `${role} · ${section.title}${section.hint ? ` (${section.hint})` : ""}`, section }),
    );
  }
  view.property.forEach((section) => blocks.push({ heading: `Le bien · ${section.title}`, section }));
  view.bail.forEach((section) => blocks.push({ heading: `Le bail · ${section.title}`, section }));

  let y = H - 190;
  const labelW = 150;
  const valueW = W - 2 * M - labelW;
  const newPage = () => {
    page = doc.addPage([W, H]);
    pages.push(page);
    y = H - 60;
  };
  for (const { heading, section } of blocks) {
    if (section.rows.length === 0) continue;
    if (y < 140) newPage();
    page.drawText(wrap(clean(heading, f), f.b, 12.5, W - 2 * M)[0] ?? "", { x: M, y, size: 12.5, font: f.b, color: PRIMARY });
    y -= 10;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: LINE });
    y -= 17;
    for (const row of section.rows) {
      const lines = wrap(clean(row.value, f), f.b, 9.5, valueW);
      if (y - (lines.length - 1) * 13 < 60) newPage();
      page.drawText(wrap(clean(row.label, f), f.r, 9, labelW - 10)[0] ?? "", { x: M, y, size: 9, font: f.r, color: MUTED });
      lines.forEach((line, i) => page.drawText(line, { x: M + labelW, y: y - i * 13, size: 9.5, font: f.b, color: INK }));
      y -= 13 * lines.length + 5;
    }
    y -= 14;
  }
  return pages;
}

/* -------------------------------------------------------------------------- */
/*                                   Pièces                                   */
/* -------------------------------------------------------------------------- */

/** Orientation EXIF d'un JPEG (photos de téléphone), 1 si absente. */
function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const count = view.getUint16(ifd, little);
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 10 > view.byteLength) break;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00) return 1;
    offset += 2 + length;
  }
  return 1;
}

async function addImagePage(doc: PDFDocument, f: Fonts, bytes: Uint8Array, png: boolean, groupTitle: string, docTitle: string): Promise<PDFPage> {
  const image = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const orientation = png ? 1 : jpegOrientation(bytes);
  const quarter = orientation === 6 || orientation === 8;
  const page = doc.addPage([W, H]);
  pieceHeader(page, f, groupTitle, docTitle);
  // Zone disponible sous l'en-tête, image affichée droite (EXIF appliqué).
  const boxW = W - 2 * M;
  const boxH = H - 70 - 24 - 60;
  const shownW = quarter ? image.height : image.width;
  const shownH = quarter ? image.width : image.height;
  const scale = Math.min(boxW / shownW, boxH / shownH, 1.5);
  const dw = shownW * scale;
  const dh = shownH * scale;
  const bx = M + (boxW - dw) / 2;
  const by = 60 + (boxH - dh);
  const w = image.width * scale;
  const h = image.height * scale;
  if (orientation === 6) page.drawImage(image, { x: bx, y: by + dh, width: w, height: h, rotate: degrees(-90) });
  else if (orientation === 8) page.drawImage(image, { x: bx + dw, y: by, width: w, height: h, rotate: degrees(90) });
  else if (orientation === 3) page.drawImage(image, { x: bx + dw, y: by + dh, width: w, height: h, rotate: degrees(180) });
  else page.drawImage(image, { x: bx, y: by, width: w, height: h });
  return page;
}

function addNoticePage(doc: PDFDocument, f: Fonts, groupTitle: string, docTitle: string, title: string, lines: string[]): PDFPage {
  const page = doc.addPage([W, H]);
  pieceHeader(page, f, groupTitle, docTitle);
  const wrapped = lines.flatMap((l) => (l ? wrap(clean(l, f), f.r, 10, W - 2 * M - 48) : [""]));
  const boxH = 70 + wrapped.length * 17;
  const y = H - 110 - boxH;
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: boxH, color: rgb(1, 0.97, 0.9), borderColor: rgb(0.93, 0.75, 0.35), borderWidth: 1 });
  page.drawText(clean(title, f), { x: M + 24, y: y + boxH - 36, size: 14, font: f.b, color: INK });
  wrapped.forEach((l, i) => page.drawText(l, { x: M + 24, y: y + boxH - 64 - i * 17, size: 10, font: f.r, color: INK }));
  return page;
}

const kindOf = (doc: DossierDocument, bytes: Uint8Array) => {
  const head = String.fromCharCode(...bytes.slice(0, 8));
  if (head.startsWith("%PDF")) return "pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (head.startsWith("\x89PNG")) return "png";
  const mime = doc.mimeType ?? "";
  if (mime.includes("pdf")) return "pdf";
  return "other";
};

const sizeLabel = (size: number | null) =>
  size ? (size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(size / 1024))} Ko`) : null;

/** Ajoute une pièce au PDF ; renvoie sa première page. */
async function addPiece(doc: PDFDocument, f: Fonts, groupTitle: string, piece: DossierDocument): Promise<{ first: PDFPage; skipped: boolean }> {
  const title = piece.who ? `${piece.kind} · ${piece.who}` : piece.kind;
  const notice = (heading: string, reason: string) => ({
    first: addNoticePage(doc, f, groupTitle, title, heading, [
      reason,
      "",
      "Le fichier d'origine est dans le dossier enregistré, le zip, et dans l'espace notaire (rubrique « Pièces »).",
      `Nom du fichier : ${piece.zipName}${sizeLabel(piece.size) ? ` (${sizeLabel(piece.size)})` : ""}`,
    ]),
    skipped: true,
  });

  let bytes: Uint8Array;
  try {
    const response = await fetch(await documentReadUrl(piece));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.error("[notaire pdf] lecture", piece.id, error);
    return notice("Ce fichier n'a pas pu être récupéré", "Le fichier n'a pas pu être lu au moment de préparer ce PDF.");
  }

  const kind = kindOf(piece, bytes);
  if (kind === "pdf") {
    try {
      const source = await PDFDocument.load(bytes, { updateMetadata: false });
      const copied = await doc.copyPages(source, source.getPageIndices());
      if (copied.length === 0) throw new Error("PDF vide");
      copied.forEach((p) => doc.addPage(p));
      return { first: copied[0], skipped: false };
    } catch (error) {
      const encrypted = error instanceof Error && /encrypt/i.test(error.message);
      console.error("[notaire pdf] fusion", piece.id, error);
      return notice(
        "Ce fichier n'a pas pu être intégré",
        encrypted
          ? "Le PDF envoyé est protégé (mot de passe ou restrictions) : il ne peut pas être fusionné dans ce dossier."
          : "Le PDF envoyé n'a pas pu être relu pour être fusionné dans ce dossier.",
      );
    }
  }
  if (kind === "jpg" || kind === "png") {
    try {
      return { first: await addImagePage(doc, f, bytes, kind === "png", groupTitle, title), skipped: false };
    } catch (error) {
      console.error("[notaire pdf] image", piece.id, error);
      return notice("Cette image n'a pas pu être intégrée", "Le format de l'image n'a pas pu être lu.");
    }
  }
  return notice(
    "Ce fichier ne peut pas être affiché ici",
    "Ce format (document Word, photo HEIC ou WebP, tableur…) ne peut pas être intégré dans un PDF.",
  );
}

/* -------------------------------------------------------------------------- */
/*                         Signets, liens et assemblage                       */
/* -------------------------------------------------------------------------- */

interface OutlineItem {
  title: string;
  page: PDFPage;
  children?: OutlineItem[];
}

function destination(doc: PDFDocument, page: PDFPage) {
  return doc.context.obj([page.ref, PDFName.of("XYZ"), PDFNull, PDFNull, PDFNull]);
}

function buildOutline(doc: PDFDocument, tree: OutlineItem[]) {
  const ctx = doc.context;
  const rootRef = ctx.nextRef();
  const build = (items: OutlineItem[], parent: PDFRef) => {
    const refs = items.map(() => ctx.nextRef());
    let count = 0;
    items.forEach((item, i) => {
      const dict = ctx.obj({});
      dict.set(PDFName.of("Title"), PDFHexString.fromText(item.title));
      dict.set(PDFName.of("Parent"), parent);
      dict.set(PDFName.of("Dest"), destination(doc, item.page));
      if (i > 0) dict.set(PDFName.of("Prev"), refs[i - 1]);
      if (i < items.length - 1) dict.set(PDFName.of("Next"), refs[i + 1]);
      if (item.children?.length) {
        const sub = build(item.children, refs[i]);
        dict.set(PDFName.of("First"), sub.first);
        dict.set(PDFName.of("Last"), sub.last);
        dict.set(PDFName.of("Count"), PDFNumber.of(sub.count));
        count += sub.count;
      }
      ctx.assign(refs[i], dict);
      count += 1;
    });
    return { first: refs[0], last: refs[refs.length - 1], count };
  };
  const top = build(tree, rootRef);
  ctx.assign(rootRef, ctx.obj({ Type: "Outlines", First: top.first, Last: top.last, Count: top.count }));
  doc.catalog.set(PDFName.of("Outlines"), rootRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

function addLink(doc: PDFDocument, page: PDFPage, rect: [number, number, number, number], target: PDFPage) {
  const annot = doc.context.register(
    doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], Dest: destination(doc, target) }),
  );
  page.node.addAnnot(annot);
}

export async function buildDossierPdf(view: NotaireDossierView): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Dossier complet - ${view.address}`);
  doc.setAuthor("BailNotarie");
  doc.setLanguage("fr-FR");
  const r = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: Fonts = { r, b, charset: new Set(r.getCharacterSet()), generated: new Set() };

  const fichePages = drawFiche(doc, f, view);
  // Le sommaire tient sur une page jusqu'à ~30 pièces ; au-delà, une seconde page.
  const totalPieces = view.documents.reduce((n, g) => n + g.documents.length, 0);
  const tocPages = [doc.addPage([W, H])];
  if (totalPieces + view.documents.length * 2 > 30) tocPages.push(doc.addPage([W, H]));

  const outline: OutlineItem[] = [
    { title: "Fiche du dossier", page: fichePages[0] },
    { title: "Sommaire des pièces", page: tocPages[0] },
  ];
  const toc: Array<{ title: string; items: Array<{ label: string; page: PDFPage; skipped: boolean }> }> = [];
  for (const group of view.documents) {
    const children: OutlineItem[] = [];
    const items: Array<{ label: string; page: PDFPage; skipped: boolean }> = [];
    for (const piece of group.documents) {
      const { first, skipped } = await addPiece(doc, f, group.title, piece);
      const label = piece.who ? `${piece.kind} · ${piece.who}` : piece.kind === "Pièce jointe" ? `Pièce jointe · ${piece.fileName}` : piece.kind;
      children.push({ title: label, page: first });
      items.push({ label, page: first, skipped });
    }
    if (children.length) {
      outline.push({ title: group.title, page: children[0].page, children });
      toc.push({ title: group.title, items });
    }
  }

  // Sommaire
  const all = doc.getPages();
  const numberOf = (p: PDFPage) => all.indexOf(p) + 1;
  let tocIndex = 0;
  let page = tocPages[0];
  page.drawText("Sommaire des pièces", { x: M, y: H - 80, size: 22, font: b, color: INK });
  page.drawText("Cliquez sur une pièce pour y aller. Les signets du lecteur PDF donnent le même accès.", { x: M, y: H - 102, size: 9.5, font: r, color: MUTED });
  let y = H - 145;
  const room = () => {
    if (y > 70) return;
    tocIndex = Math.min(tocIndex + 1, tocPages.length - 1);
    page = tocPages[tocIndex];
    y = H - 60;
  };
  if (toc.length === 0) page.drawText("Aucune pièce dans ce dossier pour l'instant.", { x: M, y, size: 10.5, font: r, color: MUTED });
  for (const group of toc) {
    room();
    page.drawText(wrap(clean(group.title, f), b, 12, W - 2 * M)[0] ?? "", { x: M, y, size: 12, font: b, color: PRIMARY });
    y -= 22;
    for (const item of group.items) {
      room();
      const num = `p. ${numberOf(item.page)}`;
      const nw = r.widthOfTextAtSize(num, 10.5);
      const text = item.skipped ? `${item.label} (fichier à part)` : item.label;
      const label = wrap(clean(text, f), r, 10.5, W - 2 * M - 16 - nw - 30)[0] ?? "";
      const lw = r.widthOfTextAtSize(label, 10.5);
      page.drawText(label, { x: M + 16, y, size: 10.5, font: r, color: INK });
      let dots = "";
      while (r.widthOfTextAtSize(`${dots} .`, 9) < W - 2 * M - 16 - lw - nw - 16) dots += " .";
      page.drawText(dots, { x: M + 16 + lw + 6, y, size: 9, font: r, color: LINE });
      page.drawText(num, { x: W - M - nw, y, size: 10.5, font: r, color: MUTED });
      addLink(doc, page, [M, y - 4, W - M, y + 12], item.page);
      y -= 20;
    }
    y -= 10;
  }

  // Pieds de page sur les pages créées ici (les PDF des clients restent intacts).
  const ours = new Set<PDFPage>([...fichePages, ...tocPages]);
  fichePages.forEach((p) => footer(p, f, view.address, "Fiche du dossier"));
  tocPages.forEach((p) => footer(p, f, view.address, "Sommaire"));
  all.forEach((p, i) => {
    if (!ours.has(p) && f.generated.has(p)) footer(p, f, view.address, `Page ${i + 1} sur ${all.length}`);
  });

  buildOutline(doc, outline);
  return doc.save();
}
