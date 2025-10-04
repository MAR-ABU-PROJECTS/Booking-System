import { prisma } from "../server";
import { emailService } from "../services/emailservice";

async function processEmailQueue() {
  const emails = await prisma.emailQueue.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  for (const email of emails) {
    try {
      // Mark as processing to avoid duplicate workers
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: "processing" },
      });

      await emailService.sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
      });

      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: "sent", attempts: { increment: 1 }, error: null },
      });
    } catch (err) {
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          error: String(err),
        },
      });
    }
  }
}

// Run every minute (or use node-cron for more control)
setInterval(processEmailQueue, 60 * 1000);
