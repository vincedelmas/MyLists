import {serverEnv} from "@/env/server";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {ProviderRequestError, type ProviderErrorDetails} from "./provider-error";


type Cooldown = { message: string; details: ProviderErrorDetails };
const memoryCooldowns = new Map<string, Cooldown>();
const SET_COOLDOWN = `
    local current = redis.call('GET', KEYS[1])
    if current and cjson.decode(current).details.retryAt >= tonumber(ARGV[2]) then return end
    redis.call('SET', KEYS[1], ARGV[1], 'PXAT', ARGV[2])
`;


export async function checkProviderCooldown(provider: string) {
    let cooldown: Cooldown | undefined;
    if (serverEnv.REDIS_ENABLED) {
        const redis = await getRedisConnection();
        const stored = await redis.get(`provider:cooldown:${provider}`);
        if (stored) cooldown = JSON.parse(stored) as Cooldown;
    }
    else {
        cooldown = memoryCooldowns.get(provider);
        if (cooldown && cooldown.details.retryAt! <= Date.now()) {
            memoryCooldowns.delete(provider);
            cooldown = undefined;
        }
    }

    if (cooldown && cooldown.details.retryAt! > Date.now()) {
        throw new ProviderRequestError(cooldown.message, cooldown.details);
    }
}


export async function setProviderCooldown(error: ProviderRequestError) {
    const { provider, retryAt } = error.details;
    if (!retryAt) return;
    const cooldown: Cooldown = { message: error.message, details: error.details };
    if (serverEnv.REDIS_ENABLED) {
        const redis = await getRedisConnection();
        await redis.eval(SET_COOLDOWN, 1, `provider:cooldown:${provider}`, JSON.stringify(cooldown), retryAt);
    }
    else if ((memoryCooldowns.get(provider)?.details.retryAt ?? 0) < retryAt) {
        memoryCooldowns.set(provider, cooldown);
    }
}
