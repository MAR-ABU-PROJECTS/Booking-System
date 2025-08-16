"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const emailservice_1 = require("../services/emailservice");
async function processEmailQueue() {
    const emails = await server_1.prisma.emailQueue.findMany({
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
            await server_1.prisma.emailQueue.update({
                where: { id: email.id },
                data: { status: "processing" },
            });
            await emailservice_1.emailService.sendEmail({
                to: email.to,
                subject: email.subject,
                html: email.html,
            });
            await server_1.prisma.emailQueue.update({
                where: { id: email.id },
                data: { status: "sent", attempts: { increment: 1 }, error: null },
            });
        }
        catch (err) {
            await server_1.prisma.emailQueue.update({
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
