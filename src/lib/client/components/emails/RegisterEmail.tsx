import {Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text} from "@react-email/components";


interface RegisterEmailProps {
    link: string;
    brand?: string;
    username: string;
}


export const RegisterEmail = ({ username, link, brand = "MyLists" }: RegisterEmailProps) => {
    const today = new Date().getFullYear();

    return (
        <Html>
            <Head/>
            <Preview>Welcome to {brand}! Please confirm your registration.</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-[#eaeaea] rounded my-10 mx-auto p-5 max-w-116">
                        <Heading className="text-black text-[24px] font-normal text-center p-0 mt-2 mb-7.5 mx-0">
                            Welcome to
                            <Text className="text-[24px]">
                                <strong>{brand}</strong>
                            </Text>
                        </Heading>
                        <Text className="text-black text-[14px] leading-6">
                            Hello <strong>{username}</strong>,
                        </Text>
                        <Text className="text-black text-[14px] leading-6">
                            Thank you for signing up! To complete your registration,
                            please confirm your email address by clicking the button below.
                        </Text>
                        <Section className="text-center my-8">
                            <Button
                                href={link}
                                className="bg-black rounded text-white text-[12px] font-semibold no-underline text-center
                                px-5 py-3 inline-block cursor-pointer"
                            >
                                Confirm Registration
                            </Button>
                        </Section>
                        <Text className="text-black text-[14px] leading-6">
                            Or copy and paste this URL into your browser:{" "}
                            <Link href={link} className="text-blue-600 no-underline break-all">
                                {link}
                            </Link>
                        </Text>
                        <Text className="text-gray-500 text-[12px] leading-6 mt-8">
                            If you didn't create an account with us, please ignore this email.
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


export default RegisterEmail;
