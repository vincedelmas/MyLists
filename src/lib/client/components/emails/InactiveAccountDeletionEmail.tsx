import {EmailLayout, EmailParagraph} from "./_components/EmailLayout";


interface InactiveAccountDeletionEmailProps {
    link: string;
    brand?: string;
    username: string;
    deletionDate: string;
}


export const InactiveAccountDeletionEmail = ({ username, link, deletionDate, brand = "MyLists" }: InactiveAccountDeletionEmailProps) => (
    <EmailLayout
        link={link}
        brand={brand}
        username={username}
        action="Keep my account"
        title="Keep your account"
        preview={`Keep your ${brand} account before ${deletionDate}.`}
        notice={<>Your account is scheduled for deletion on <strong>{deletionDate}</strong>.</>}
        footer={<>You can also keep your account by logging in before {deletionDate}. If you no longer want it, no action is required.</>}
    >
        <EmailParagraph>
            It's been almost 2 years since you last used your {brand} account.
        </EmailParagraph>
        <EmailParagraph>
            If you want to keep your account and lists, use the button below to cancel the scheduled deletion.
        </EmailParagraph>
    </EmailLayout>
);


InactiveAccountDeletionEmail.PreviewProps = {
    username: "Alex",
    deletionDate: "October 12, 2026",
    link: "https://mylists.info/keep-account?token=preview",
} satisfies InactiveAccountDeletionEmailProps;


export default InactiveAccountDeletionEmail;
