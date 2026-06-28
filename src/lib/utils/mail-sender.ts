import {serverEnv} from "@/env/server";
import type {Transporter} from "nodemailer";
import type {Options} from "nodemailer/lib/mailer";
import {createServerOnlyFn} from "@tanstack/react-start";


let transporterPromise: Promise<Transporter> | undefined;


const getTransporter = () => {
    transporterPromise ??= import("nodemailer").then(({ default: nodemailer }) => nodemailer.createTransport({
        pool: true,
        service: "gmail",
        maxMessages: 100,
        maxConnections: 1,
        auth: {
            user: serverEnv.ADMIN_MAIL_USERNAME,
            pass: serverEnv.ADMIN_MAIL_PASSWORD,
        },
    }));

    return transporterPromise;
};


interface EmailOptions {
    to: string;
    link: string;
    subject: string;
    username: string;
    deletionDate?: string;
    template: "resetPassword" | "register" | "inactiveAccountDeletion";
}


export const sendEmail = createServerOnlyFn(() => async (options: EmailOptions) => {
    const [transporter, { render }, { InactiveAccountDeletionEmail, PasswordResetEmail, RegisterEmail }] = await Promise.all([
        getTransporter(),
        import("@react-email/render"),
        import("@/lib/client/components/emails"),
    ]);

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
