interface DashboardHeaderProps {
    heading: string;
    description: string;
}


export function DashboardHeader({ heading, description }: DashboardHeaderProps) {
    return (
        <div className="mb-8">
            <h2 className="font-heading text-2xl md:text-4xl">
                {heading}
            </h2>
            <p className="text-lg text-muted-foreground mt-1">
                {description}
            </p>
        </div>
    );
}
