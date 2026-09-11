import {EmailLayout, EmailParagraph} from "./_components/EmailLayout";


interface RegisterEmailProps {
    link: string;
    brand?: string;
    username: string;
}


export const RegisterEmail = ({ username, link, brand = "MyLists" }: RegisterEmailProps) => (
    <EmailLayout
        link={link}
        brand={brand}
        username={username}
        action="Verify email address"
        title="Verify your email address"
        notice="This verification link expires in 1 hour."
        preview={`Verify your email address for ${brand}.`}
        footer="If you didn't request this email, you can safely ignore it."
    >
        <EmailParagraph>
            Please use the button below to verify your email address for {brand}.
        </EmailParagraph>
    </EmailLayout>
);


RegisterEmail.PreviewProps = {
    username: "Alex",
    link: "https://mylists.info/api/auth/verify-email?token=preview",
} satisfies RegisterEmailProps;


export default RegisterEmail;
