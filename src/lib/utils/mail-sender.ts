import {serverEnv} from "@/env/server";
import type {Options} from "nodemailer/lib/mailer";
import {createServerOnlyFn} from "@tanstack/react-start";


interface EmailOptions {
    to: string;
    link: string;
    subject: string;
    username: string;
    deletionDate?: string;
    template: "resetPassword" | "register" | "inactiveAccountDeletion";
}


export const sendEmail = createServerOnlyFn(() => async (options: EmailOptions) => {
    const [{ default: nodemailer }, { render }, { InactiveAccountDeletionEmail, PasswordResetEmail, RegisterEmail }] = await Promise.all([
        import("nodemailer"),
        import("@react-email/render"),
        import("@/lib/client/components/emails"),
    ]);

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: serverEnv.ADMIN_MAIL_USERNAME,
            pass: serverEnv.ADMIN_MAIL_PASSWORD,
        },
    });

    let htmlContent: string;
    if (options.template === "register") {
        htmlContent = await render(RegisterEmail({ username: options.username, link: options.link }));
    }
    else if (options.template === "inactiveAccountDeletion") {
        htmlContent = await render(InactiveAccountDeletionEmail({
            link: options.link,
            username: options.username,
            deletionDate: options.deletionDate ?? "the scheduled deletion date",
        }));
    }
    else {
        htmlContent = await render(PasswordResetEmail({ username: options.username, link: options.link }));
    }

    const mailOptions: Options = {
        to: options.to,
        html: htmlContent,
        subject: options.subject,
        from: serverEnv.ADMIN_MAIL_USERNAME,
    };

    await transporter.sendMail(mailOptions);
})();
