import {Settings2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";


interface MediaCardEditActionProps {
    label: string;
    onClick: () => void;
}


export const MediaCardEditAction = ({ label, onClick }: MediaCardEditActionProps) => {
    return (
        <Button size="bare" type="button" title={label} variant="ghost" onClick={onClick} aria-label={label}>
            <Settings2 data-icon="inline-start"/>
        </Button>
    );
};
