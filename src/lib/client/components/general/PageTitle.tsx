import React from "react";


interface PageTitleProps {
    onlyHelmet?: boolean;
    children?: React.ReactNode;
    title: string | React.ReactNode;
    subtitle?: string | React.ReactNode;
}


export const PageTitle = ({ children, title, subtitle, onlyHelmet = false }: PageTitleProps) => {
    return (
        <>
            <title>{`${title} - MyLists`}</title>
            {onlyHelmet ?
                children
                :
                <div className="flex flex-col mx-auto mb-8 pt-6">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            {title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                    <div className="mt-6">
                        {children}
                    </div>
                </div>
            }
        </>
    );
};
