import React from "react";
import {clientEnv} from "@/env/client";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Home, RefreshCw, TriangleAlert} from "lucide-react";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {ErrorPageLayout} from "@/lib/client/components/general/ErrorPageLayout";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


interface ErrorComponentProps {
    text: string;
    title: string;
    footerText?: string;
    icon?: React.ReactNode;
}


export const ErrorComponent = ({ title, icon, text, footerText }: ErrorComponentProps) => {
    return (
        <ErrorPageLayout>
            <Empty className="gap-7 border-0 p-0">
                <EmptyHeader className="max-w-3xl gap-5">
                    <EmptyMedia aria-hidden="true" className="relative mb-2 h-44 w-full sm:h-52">
                        <div className="absolute inset-x-0 bottom-0 mx-auto h-px max-w-md bg-linear-to-r from-transparent via-border to-transparent"/>
                        <div className="absolute bottom-0 left-1/2 h-3 w-40 -translate-x-1/2 rounded-[50%] bg-foreground/10 blur-md"/>

                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-2">
                            <div className="flex -rotate-6 items-end gap-1 opacity-70">
                                <span className="h-16 w-3 rounded-sm border border-series/50 bg-series/25"/>
                                <span className="h-20 w-3.5 rounded-sm border border-books/50 bg-books/25"/>
                            </div>
                            <div className="relative flex size-28 items-center justify-center rounded-2xl border border-destructive/40
                            bg-card/90 text-destructive shadow-xl shadow-destructive/10 sm:size-32 [&_svg]:size-10">
                                <div className="absolute inset-2 rounded-xl border border-dashed border-destructive/30"/>
                                {icon ??
                                    <TriangleAlert strokeWidth={1.6}/>
                                }
                            </div>
                            <div className="flex rotate-6 items-end gap-1 opacity-70">
                                <span className="h-20 w-3.5 rounded-sm border border-games/50 bg-games/25"/>
                                <span className="h-16 w-3 rounded-sm border border-movies/50 bg-movies/25"/>
                            </div>
                        </div>
                    </EmptyMedia>

                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-destructive">
                        <span className="h-px w-8 bg-destructive"/>
                        Unexpected error
                        <span className="h-px w-8 bg-destructive"/>
                    </div>
                    <EmptyTitle className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                        <h1>{title}</h1>
                    </EmptyTitle>
                    <EmptyDescription className="max-w-2xl text-base leading-relaxed text-balance sm:text-lg">
                        {text}
                    </EmptyDescription>
                </EmptyHeader>

                <EmptyContent className="max-w-none gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button size="lg" onClick={() => window.location.reload()}>
                            <RefreshCw data-icon="inline-start"/>
                            Try again
                        </Button>
                        <Link to="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                            <Home data-icon="inline-start"/>
                            Back to MyLists
                        </Link>
                    </div>
                    {footerText &&
                        <p className="text-sm text-muted-foreground">
                            {footerText}{" "}
                            <a href={`mailto:${clientEnv.VITE_CONTACT_MAIL}`} className="font-medium text-brand">
                                Contact Me
                            </a>
                        </p>
                    }
                </EmptyContent>
            </Empty>
        </ErrorPageLayout>
    );
};
