import type {ComponentProps, ReactNode} from "react";
import {Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text} from "@react-email/components";


interface EmailLayoutProps {
    link: string;
    brand: string;
    title: string;
    action: string;
    preview: string;
    username: string;
    notice: ReactNode;
    footer: ReactNode;
    children: ReactNode;
}


export function EmailLayout({ brand, preview, title, username, children, link, action, notice, footer }: EmailLayoutProps) {
    return (
        <Html lang="en">
            <Head/>
            <Preview>{preview}</Preview>
            <Body style={{ margin: 0, padding: "32px 12px", backgroundColor: "#f6f6f6", fontFamily: "Arial, Helvetica, sans-serif", color: "#333333" }}>
                <Container style={{
                    width: "100%",
                    margin: "0 auto",
                    maxWidth: "560px",
                    overflow: "hidden",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e5e5",
                }}>
                    <Section style={{ padding: "24px 24px 20px", borderBottom: "1px solid #eeeeee" }}>
                        <Text style={{ margin: 0, color: "#08754e", fontSize: "18px", lineHeight: "24px", fontWeight: 600 }}>
                            {brand}
                        </Text>
                    </Section>
                    <Section style={{ padding: "24px" }}>
                        <Heading as="h1" style={{
                            fontWeight: 600,
                            color: "#222222",
                            fontSize: "22px",
                            margin: "0 0 24px",
                            lineHeight: "30px",
                            fontFamily: "Arial, Helvetica, sans-serif",
                        }}>
                            {title}
                        </Heading>
                        <EmailParagraph>Hello {username},</EmailParagraph>
                        {children}
                        <Section style={{ margin: "24px 0" }}>
                            <Button href={link} style={{
                                fontWeight: 600,
                                color: "#ffffff",
                                fontSize: "14px",
                                lineHeight: "20px",
                                textAlign: "center",
                                borderRadius: "4px",
                                padding: "12px 20px",
                                textDecoration: "none",
                                backgroundColor: "#08754e",
                            }}>
                                {action}
                            </Button>
                        </Section>
                        <Section style={{ backgroundColor: "#f6f6f6", borderRadius: "4px", padding: "12px 14px" }}>
                            <Text style={{ margin: 0, color: "#555555", fontSize: "13px", lineHeight: "20px" }}>
                                {notice}
                            </Text>
                        </Section>
                        <Text style={{ margin: "24px 0 0", color: "#666666", fontSize: "13px", lineHeight: "21px" }}>
                            {footer}
                        </Text>
                        <Hr style={{ border: "none", borderTop: "1px solid #eeeeee", margin: "24px 0 20px" }}/>
                        <Text style={{ margin: "0 0 8px", color: "#666666", fontSize: "12px", lineHeight: "18px" }}>
                            Button not working? Copy this link into your browser:
                        </Text>
                        <Link href={link} style={{
                            color: "#08754e",
                            display: "block",
                            fontSize: "12px",
                            lineHeight: "20px",
                            wordBreak: "break-all",
                            overflowWrap: "anywhere",
                            textDecoration: "underline"
                        }}>
                            {link}
                        </Link>
                    </Section>
                </Container>
                <Container style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
                    <Text style={{ margin: "20px 0 0", color: "#666666", fontSize: "12px", lineHeight: "20px", textAlign: "center" }}>
                        © {new Date().getFullYear()} {brand}
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}


export function EmailParagraph({ style, ...props }: ComponentProps<typeof Text>) {
    return (
        <Text
            {...props}
            style={{
                color: "#444444",
                fontSize: "15px",
                lineHeight: "24px",
                margin: "0 0 16px",
                ...style,
            }}
        />
    );
}
