import {EmailLayout, EmailParagraph} from "./_components/EmailLayout";


interface PasswordResetEmailProps {
    link: string;
    brand?: string;
    username: string;
}


export const PasswordResetEmail = ({ username, link, brand = "MyLists" }: PasswordResetEmailProps) => (
    <EmailLayout
        link={link}
        brand={brand}
        username={username}
        action="Reset password"
        title="Reset your password"
        notice="This password reset link expires in 1 hour."
        preview={`Reset your ${brand} password. This link expires in 1 hour.`}
        footer="If you didn't request a password reset, ignore this email. Your password will stay the same."
    >
        <EmailParagraph>
            We received a request to reset the password for your {brand} account.
            Use the button below to choose a new one.
        </EmailParagraph>
    </EmailLayout>
);


PasswordResetEmail.PreviewProps = {
    username: "Alex",
    link: "https://mylists.info/reset-password?token=preview",
} satisfies PasswordResetEmailProps;


export default PasswordResetEmail;
