import { log } from 'apify';

const BASE_URL = 'https://registry.terraform.io/v1';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchJson(url, refLabel) {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            if (res.status === 404) return { found: false };

            const body = await res.json().catch(() => null);
            if (res.ok && body && typeof body === 'object') return { found: true, data: body };

            const retryable = res.status === 429 || res.status >= 500 || body === null;
            lastErr = new Error(`Terraform Registry request failed for "${refLabel}": ${res.status} ${res.statusText}`);
            if (!retryable) throw lastErr;
        } catch (err) {
            lastErr = err.name === 'AbortError'
                ? new Error(`Terraform Registry request timed out for "${refLabel}" (attempt ${attempt}/${MAX_ATTEMPTS})`)
                : err;
        }
        if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            log.warning(`Retrying Terraform Registry request for "${refLabel}" in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastErr.message}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

export async function fetchModules(refs) {
    const results = [];
    for (const ref of refs) {
        const parts = typeof ref === 'string' ? ref.split('/').filter(Boolean) : [];
        if (parts.length !== 3) {
            log.warning(`Skipping malformed module ref "${ref}" — expected "namespace/name/provider".`);
            results.push({ type: 'module', ref, found: false, error: 'Malformed ref, expected "namespace/name/provider".' });
            continue;
        }
        const [namespace, name, provider] = parts;
        try {
            const outcome = await fetchJson(`${BASE_URL}/modules/${namespace}/${name}/${provider}`, ref);
            if (!outcome.found) {
                results.push({ type: 'module', ref, found: false });
                continue;
            }
            const m = outcome.data;
            results.push({
                type: 'module',
                ref,
                found: true,
                namespace: m.namespace ?? namespace,
                name: m.name ?? name,
                provider: m.provider ?? provider,
                latestVersion: m.version ?? null,
                description: m.description ?? null,
                downloads: m.downloads ?? null,
                verified: m.verified ?? null,
                publishedAt: m.published_at ?? null,
                sourceUrl: m.source ?? null,
            });
        } catch (err) {
            log.warning(`Skipping module "${ref}" after repeated failures: ${err.message}`);
            results.push({ type: 'module', ref, found: false, error: err.message });
        }
    }
    return results;
}

export async function fetchProviders(refs) {
    const results = [];
    for (const ref of refs) {
        const parts = typeof ref === 'string' ? ref.split('/').filter(Boolean) : [];
        if (parts.length !== 2) {
            log.warning(`Skipping malformed provider ref "${ref}" — expected "namespace/name".`);
            results.push({ type: 'provider', ref, found: false, error: 'Malformed ref, expected "namespace/name".' });
            continue;
        }
        const [namespace, name] = parts;
        try {
            const outcome = await fetchJson(`${BASE_URL}/providers/${namespace}/${name}`, ref);
            if (!outcome.found) {
                results.push({ type: 'provider', ref, found: false });
                continue;
            }
            const p = outcome.data;
            results.push({
                type: 'provider',
                ref,
                found: true,
                namespace: p.namespace ?? namespace,
                name: p.name ?? name,
                latestVersion: p.version ?? null,
                description: p.description ?? null,
                downloads: p.downloads ?? null,
                tier: p.tier ?? null,
                publishedAt: p.published_at ?? null,
                sourceUrl: p.source ?? null,
            });
        } catch (err) {
            log.warning(`Skipping provider "${ref}" after repeated failures: ${err.message}`);
            results.push({ type: 'provider', ref, found: false, error: err.message });
        }
    }
    return results;
}
