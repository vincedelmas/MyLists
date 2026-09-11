import {Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text} from "@react-email/components";


interface ChangeEmailProps {
    link: string;
    brand?: string;
    newEmail: string;
    username: string;
}


export const ChangeEmail = ({ username, link, newEmail, brand = "MyLists" }: ChangeEmailProps) => {
    const today = new Date().getFullYear();

    return (
        <Html>
            <Head/>
            <Preview>Approve your email address change for {brand}</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-10 mx-auto p-5 max-w-116">
                        <Heading className="text-black text-[24px] font-bold text-center p-0 mt-2 mb-7.5 mx-0">
                            Approve your email address change
                        </Heading>
                        <Text className="text-black text-[14px] leading-6">Hello {username},</Text>
                        <Text className="text-black text-[14px] leading-6">
                            We received a request to change the email address for your {brand} account to <strong>{newEmail}</strong>.
                            Approve this request below, then verify the new address using the link sent to that inbox.
                            Your email address will stay the same until both steps are complete.
                            If you didn't request this change, ignore this email.
                        </Text>
                        <Section className="text-center my-8">
                            <Button
                                href={link}
                                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center
                                px-5 py-3 inline-block cursor-pointer"
                            >
                                Approve Email Change
                            </Button>
                        </Section>
                        <Text className="text-black text-[14px] leading-6">
                            Or copy and paste this URL into your browser:{" "}
                            <Link href={link} className="text-blue-600 no-underline break-all">
                                {link}
                            </Link>
                        </Text>
                        <Section className="mt-4 px-4 py-2 bg-amber-300/50 rounded">
                            <Text className="text-[12px] m-0 font-semibold">
                                This approval link will expire in 1 hour.
                            </Text>
                        </Section>
                        <Text className="text-black text-[14px] leading-6 mt-8">
                            Best regards,
                            <br/>
                            The <strong>{brand}</strong> Team
                        </Text>
                        <Section className="border-t border-solid">
                            <Text className="text-gray-600 text-xs text-center">
                                ©{today} {brand}. All rights reserved.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};


export default ChangeEmail;
