import {Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text} from "@react-email/components";


interface InactiveAccountDeletionEmailProps {
    link: string;
    brand?: string;
    username: string;
    deletionDate: string;
}


export const InactiveAccountDeletionEmail = ({ username, link, deletionDate, brand = "MyLists" }: InactiveAccountDeletionEmailProps) => {
    return (
        <Html>
            <Head/>
            <Preview>Your MyLists account is scheduled for deletion</Preview>
            <Tailwind>
                <Body className="bg-white font-sans">
                    <Container className="mx-auto max-w-150 px-6 py-8">
                        <Heading className="text-2xl font-bold text-gray-900">
                            Keep your {brand} account
                        </Heading>
                        <Text className="text-base text-gray-700">
                            Hello {username},
                        </Text>
                        <Text className="text-base text-gray-700">
                            Your account has been inactive for almost 2 years. It is scheduled for deletion on {deletionDate}.
                        </Text>
                        <Text className="text-base text-gray-700">
                            If you want to keep your account, click the button below. This will refresh your activity timer.
                        </Text>
                        <Section className="py-4 text-center">
                            <Button href={link} className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white">
                                Keep my account
                            </Button>
                        </Section>
                        <Text className="text-sm text-gray-500">
                            You can also keep your account by logging in before {deletionDate}.
                        </Text>
                        <Text className="text-sm text-gray-500">
                            If you do not want to keep this account, no action is required.
                        </Text>
                        <Text className="text-xs text-gray-400">
                            If the button does not work, copy this link into your browser:{" "}
                            <Link href={link} className="text-gray-500 underline">
                                {link}
                            </Link>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};


export default InactiveAccountDeletionEmail;
