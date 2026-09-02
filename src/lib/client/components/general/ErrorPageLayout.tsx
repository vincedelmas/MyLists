import React from "react";


export function ErrorPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <section data-error-page className="relative left-[calc(50%-50vw)] isolate min-h-[calc(100svh-4rem)] w-screen">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-background">
                <div className="absolute -left-24 top-24 size-80 rounded-full bg-brand/10 blur-3xl"/>
                <div className="absolute -right-24 top-6 size-96 rounded-full bg-info/10 blur-3xl"/>
                <div className="absolute bottom-0 left-1/2 size-72 -translate-x-1/2 rounded-full bg-movies/10 blur-3xl"/>
            </div>

            <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center px-4 py-12 sm:px-8 sm:py-16">
                {children}
            </div>
        </section>
    );
}
