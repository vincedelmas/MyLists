import React from "react";
import {clientEnv} from "@/env/client";
import {Link} from "@tanstack/react-router";
import {ArrowLeft, Home} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Card, CardContent} from "@/lib/client/components/ui/card";


interface ErrorComponentProps {
    text: string;
    title: string;
    footerText?: string;
    icon?: React.ReactNode;
}


export const ErrorComponent = ({ title, icon, text, footerText }: ErrorComponentProps) => {
    return (
        <div className="flex items-center justify-center p-4 mt-12 h-[calc(100vh-400px)]">
            <Card className="w-full max-w-md">
                <CardContent>
                    <div className="text-center space-y-6">
                        <div className="space-y-6">
                            <div className="flex flex-col justify-center items-center text-3xl font-semibold text-gray-300">
                                <div>{icon}</div>
                                <h2>{title}</h2>
                            </div>
                            <p className="leading-relaxed text-lg max-sm:text-base">
                                {text}
                            </p>
                        </div>
                        <div className="flex justify-center items-center">
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex items-center gap-2"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="size-4"/> Go Back?
                                </Button>
                                <Button asChild className="flex items-center gap-2" variant="emeraldy">
                                    <Link to="/">
                                        <Home className="size-4"/> Home
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="pt-3 border-t">
                            <p className="text-sm text-destructive-foreground">
                                {footerText}{" "}
                                <a href={`mailto:${clientEnv.VITE_CONTACT_MAIL}`} className="font-semibold text-app-accent">
                                    Contact Me
                                </a>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
