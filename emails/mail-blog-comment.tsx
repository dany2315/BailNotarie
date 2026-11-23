import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, Quote, Actions } from "./_shared/layout";

interface MailBlogCommentProps {
  commenterName: string;
  commenterEmail: string;
  commentContent: string;
  articleTitle: string;
  articleUrl: string;
  commentDate: string;
}

/** Un commentaire qui pose une question est une piste : on le signale dès l'objet. */
export function isQuestion(commentContent: string) {
  return (commentContent || "").includes("?");
}

export function blogCommentSubject(commenterName: string, commentContent: string, articleTitle: string) {
  if (isQuestion(commentContent)) {
    const text = commentContent.replace(/\s+/g, " ").trim();
    return `Question sur le blog : « ${text.length > 70 ? `${text.slice(0, 69)}…` : text} »`;
  }
  return `Nouveau commentaire de ${commenterName || "un lecteur"} : ${articleTitle}`;
}

/** Nouveau commentaire publié sous un article du blog, pour l'équipe. */
export default function MailBlogComment({ commenterName, commenterEmail, commentContent, articleTitle, articleUrl, commentDate }: MailBlogCommentProps) {
  const name = (commenterName || "").trim() || "Un lecteur";
  const question = isQuestion(commentContent);
  return (
    <EmailLayout preview={`${name} sur « ${articleTitle} »`} reference={["Blog", commentDate]} footerNote="Notification interne BailNotarie">
      <Kicker tone={question ? "amber" : "blue"}>{question ? "Question d'un lecteur" : "Nouveau commentaire"}</Kicker>
      <Title>{question ? `${name} pose une question` : `${name} a commenté un article`}</Title>
      <Quote>« {(commentContent || "").trim()} »</Quote>
      <Lead>
        Sous l'article « {articleTitle} ».
        {commenterEmail && question ? " Cette personne a laissé son e-mail : c'est un contact potentiel." : ""}
      </Lead>
      <Actions
        primary={{ label: question ? "Répondre sous l'article" : "Voir l'article", href: articleUrl }}
        secondary={commenterEmail ? { label: "Lui écrire", href: `mailto:${commenterEmail}` } : undefined}
      />
    </EmailLayout>
  );
}

MailBlogComment.PreviewProps = {
  commenterName: "Sophie L.",
  commenterEmail: "sophie@exemple.fr",
  commentContent: "Merci pour l'article. Est-ce que le bail notarié est possible pour une colocation ?",
  articleTitle: "Bail notarié ou bail sous seing privé ?",
  articleUrl: "https://www.bailnotarie.fr/blog/exemple",
  commentDate: "22/11/2026 à 9 h 15",
} satisfies MailBlogCommentProps;
