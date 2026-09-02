import React from "react";
import {Link} from "@tanstack/react-router";
import {ArrowLeft, Home, SearchX} from "lucide-react";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {ErrorPageLayout} from "@/lib/client/components/general/ErrorPageLayout";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export function NotFound() {
    return (
        <ErrorPageLayout>
            <Empty className="gap-7 border-0 p-0">
                <EmptyHeader className="max-w-3xl gap-5">
                    <EmptyMedia aria-hidden="true" className="relative mb-2 h-48 w-full sm:h-60">
                        <div className="absolute inset-x-0 bottom-0 mx-auto h-px max-w-lg bg-linear-to-r from-transparent via-border to-transparent"/>
                        <div className="absolute bottom-0 left-1/2 h-3 w-44 -translate-x-1/2 rounded-[50%] bg-foreground/10 blur-md sm:w-56"/>

                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center font-black leading-none tracking-[-0.08em]">
                            <span className="text-[8rem] text-foreground/90 sm:text-[11rem]">
                                4
                            </span>
                            <div className="relative mx-2 aspect-2/3 w-20 overflow-hidden rounded-xl border border-brand/40 bg-card/90 shadow-xl shadow-brand/10 sm:w-28">
                                <div className="absolute inset-2 rounded-lg border border-dashed border-brand/30"/>
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand">
                                    <SearchX className="size-7 sm:size-9" strokeWidth={1.6}/>
                                    <span className="text-[0.55rem] font-semibold tracking-[0.22em] sm:text-[0.65rem]">
                                        MISSING
                                    </span>
                                </div>
                            </div>
                            <span className="text-[8rem] text-foreground/90 sm:text-[11rem]">
                                4
                            </span>
                        </div>

                        <div className="absolute bottom-1 left-[calc(50%-8.5rem)] flex -rotate-6 items-end gap-1 opacity-70 sm:left-[calc(50%-12rem)]">
                            <span className="h-8 w-2 rounded-sm border border-series/50 bg-series/25"/>
                            <span className="h-11 w-2.5 rounded-sm border border-anime/50 bg-anime/25"/>
                            <span className="h-9 w-2 rounded-sm border border-books/50 bg-books/25"/>
                        </div>
                        <div className="absolute right-[calc(50%-8.5rem)] bottom-1 flex rotate-6 items-end gap-1 opacity-70 sm:right-[calc(50%-12rem)]">
                            <span className="h-10 w-2.5 rounded-sm border border-games/50 bg-games/25"/>
                            <span className="h-8 w-2 rounded-sm border border-manga/50 bg-manga/25"/>
                            <span className="h-12 w-2.5 rounded-sm border border-movies/50 bg-movies/25"/>
                        </div>
                    </EmptyMedia>

                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                        <span className="h-px w-8 bg-brand"/>
                        Not Found
                        <span className="h-px w-8 bg-brand"/>
                    </div>
                    <EmptyTitle className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                        <h1>This one isn&apos;t on the list.</h1>
                    </EmptyTitle>
                    <EmptyDescription className="max-w-2xl text-base leading-relaxed text-balance sm:text-lg">
                        The page may have been moved, renamed, or never added. Let&apos;s get you back to something worth
                        watching, reading, or playing.
                    </EmptyDescription>
                </EmptyHeader>

                <EmptyContent className="max-w-none">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link to="/" className={buttonVariants({ size: "lg" })}>
                            <Home data-icon="inline-start"/>
                            Back to MyLists
                        </Link>
                        <Button size="lg" variant="outline" onClick={() => window.history.back()}>
                            <ArrowLeft data-icon="inline-start"/>
                            Go back
                        </Button>
                    </div>
                </EmptyContent>
            </Empty>
        </ErrorPageLayout>
    );
}
