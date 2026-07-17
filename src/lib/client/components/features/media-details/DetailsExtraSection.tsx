import {Component, type ErrorInfo, type ReactNode, Suspense} from "react";


interface DetailsExtraSectionProps {
    title: string;
    children: ReactNode;
}


export const DetailsExtraSection = ({ title, children }: DetailsExtraSectionProps) => (
    <DetailsExtraErrorBoundary title={title}>
        <Suspense fallback={<DetailsExtraLoading title={title}/>}>
            {children}
        </Suspense>
    </DetailsExtraErrorBoundary>
);


const DetailsExtraLoading = ({ title }: { title: string }) => {
    return (
        <section
            aria-label={`Loading ${title}`}
            className="min-h-24 animate-pulse rounded-lg border border-app-accent/20 bg-muted/20"
        />
    );
}


const DetailsExtraErrorFallback = ({ title }: { title: string }) => {
    return (
        <section role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
            {title} is temporarily unavailable.
        </section>
    );
}


class DetailsExtraErrorBoundary extends Component<DetailsExtraSectionProps, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(_error: Error, _info: ErrorInfo) {
        // The query layer reports the failure through its configured error toast.
    }

    render() {
        return this.state.failed
            ? <DetailsExtraErrorFallback title={this.props.title}/>
            : this.props.children;
    }
}
