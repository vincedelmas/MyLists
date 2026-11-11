import {Settings2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";


interface MediaCardEditActionProps {
    label: string;
    onClick: () => void;
}


export const MediaCardEditAction = ({ label, onClick }: MediaCardEditActionProps) => {
    return (
        <Button
            size="bare"
            type="button"
            title={label}
            variant="ghost"
            onClick={onClick}
            aria-label={label}
            className="transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0
            [@media(hover:hover)_and_(pointer:fine)]:pointer-events-none
            group-hover:opacity-100 group-hover:pointer-events-auto
            group-focus-within:opacity-100 group-focus-within:pointer-events-auto motion-reduce:transition-none"
        >
            <Settings2 data-icon="inline-start"/>
        </Button>
    );
};
