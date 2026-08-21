import { Actor, log } from 'apify';
import { fetchModules, fetchProviders } from './terraform.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { modules = ['terraform-aws-modules/vpc/aws'], providers = [] } = input;

if (!Array.isArray(modules) || !Array.isArray(providers) || (modules.length === 0 && providers.length === 0)) {
    throw new Error('At least one of "modules" or "providers" must be a non-empty array.');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const REGISTRY_LOOKUP_EVENT = 'registry-lookup';

const [moduleResults, providerResults] = await Promise.all([
    fetchModules(modules),
    fetchProviders(providers),
]);
const results = [...moduleResults, ...providerResults];

for (const result of results) {
    await Actor.pushData(result);
}

await Actor.charge({ eventName: REGISTRY_LOOKUP_EVENT });

log.info(`Pushed ${results.length} record(s)`);

await Actor.exit();
