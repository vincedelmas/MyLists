import {EmailLayout, EmailParagraph} from "./_components/EmailLayout";


interface ChangeEmailProps {
    link: string;
    brand?: string;
    newEmail: string;
    username: string;
}


export const ChangeEmail = ({ username, link, newEmail, brand = "MyLists" }: ChangeEmailProps) => (
    <EmailLayout
        link={link}
        brand={brand}
        username={username}
        action="Approve email change"
        title="Confirm your email change"
        preview={`Approve the change to your ${brand} email address.`}
        notice="This approval link expires in 1 hour. Your address stays the same until both steps are complete."
        footer="If you didn't request this change, ignore this email. Your current address will remain on your account."
    >
        <EmailParagraph>
            We received a request to change the email address for your {brand} account to:
            <br/>
            <strong style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}>{newEmail}</strong>
        </EmailParagraph>
        <EmailParagraph>
            First, approve the change below. Then, follow the verification link we send to your new inbox.
        </EmailParagraph>
    </EmailLayout>
);


ChangeEmail.PreviewProps = {
    username: "Alex",
    newEmail: "alex@example.com",
    link: "https://mylists.info/api/auth/verify-email?token=preview",
} satisfies ChangeEmailProps;


export default ChangeEmail;
