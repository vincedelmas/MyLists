import {spawn} from "node:child_process";


export interface ImportDrainStarter {
    start(): Promise<void>;
}


export class NoopImportDrainStarter implements ImportDrainStarter {
    async start() {
    }
}


export class SystemdImportDrainStarter implements ImportDrainStarter {
    constructor(
        private serviceName: string,
        private userMode = true,
        private spawnProcess: typeof spawn = spawn,
    ) {
    }

    async start() {
        const args = [...(this.userMode ? ["--user"] : []), "start", this.serviceName];

        const child = this.spawnProcess("systemctl", args, {
            detached: true,
            stdio: "ignore",
        });

        child.unref();
    }
}
