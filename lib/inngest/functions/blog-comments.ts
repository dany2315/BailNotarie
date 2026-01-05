import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailBlogComment from "@/emails/mail-blog-comment";

export const sendBlogCommentNotificationEmail = inngest.createFunction(
  { id: "send-blog-comment-notification-email" },
  { event: "email/blog-comment.notification" },
  async ({ event, step }) => {
    await step.run("send-blog-comment-notification-email", async () => {
      await resendSendEmail({
        from: "Support BailNotarie <support@bailnotarie.fr>",
        to: ["david@bailnotarie.fr", "shlomi@bailnotarie.fr"],
        subject: `Nouveau commentaire sur l'article : ${event.data.articleTitle}`,
        react: MailBlogComment({
          commenterName: event.data.commenterName,
          commenterEmail: event.data.commenterEmail,
          commentContent: event.data.commentContent,
          articleTitle: event.data.articleTitle,
          articleUrl: event.data.articleUrl,
          commentDate: event.data.commentDate,
        }),
      });
    });
  }
);

