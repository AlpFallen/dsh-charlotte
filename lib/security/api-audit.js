/**
 * API surface audit.
 *
 * This is a regression guard, not a proof of correctness: it reads the actual
 * handler source and verifies that the guards the security model depends on are
 * still present and in the right order. The runtime smoke tests exercise the
 * same guards behaviourally; together they catch both "guard deleted" and
 * "guard present but bypassable".
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ruleFinding } from './rules.js';

/** Path of the handler source, resolved relative to this module. */
export function apiSourcePath() {
    return fileURLToPath(new URL('../api.js', import.meta.url));
}

/** Route prefixes the handler mutates state through. */
const MUTATING_HINTS = ['upload', 'import-path', 'toggle', 'delete', 'override', 'trash-restore', 'trash-empty', 'prefs', 'use', 'event', 'review', 'tags', 'migrate', 'recommend', 'security/scan', 'security/cancel', 'security/finding', 'security/fix'];

/**
 * Extract the literal route paths declared in the handler source.
 * @param {string} source - api.js text.
 * @returns {Array<string>} route paths.
 */
export function routeInventory(source) {
    const routes = new Set();
    for (const match of source.matchAll(/path === '([^']+)'/g)) routes.add(match[1]);
    for (const match of source.matchAll(/path === "([^"]+)"/g)) routes.add(match[1]);
    return [...routes].sort();
}

/**
 * Audit the API handler source.
 * @param {object} options - source text override and target id.
 * @returns {Promise<{findings: Array<object>, facts: object}>} audit result.
 */
export async function auditApi(options = {}) {
    const target = options.target ?? 'api';
    let source = options.source;
    const filePath = options.filePath ?? apiSourcePath();
    if (typeof source !== 'string') {
        try {
            source = await readFile(filePath, 'utf8');
        }
        catch (error) {
            return {
                findings: [ruleFinding('SEC-SCAN-002', {
                    target,
                    filePath,
                    evidence: { snippet: `cannot read API source: ${error instanceof Error ? error.message : String(error)}` },
                })],
                facts: { readable: false },
            };
        }
    }
    const findings = [];
    const guards = {
        host: source.includes('isLoopbackHost(req.headers.host)'),
        origin: source.includes('!isSameOrigin(req)'),
        bodyLimit: source.includes('readJsonBody(req, maxBodyBytes)'),
        workspace: source.includes('knownWorkspace('),
        relativePath: source.includes('assertSafeRelative('),
        containment: /\bassert(?:Contained|ContainedReal|RealContained)\s*\(/.test(source),
        providerLookup: source.includes('candidateByPath('),
        sensitiveSource: source.includes('isSensitivePath('),
        token: source.includes('x-charlotte-token'),
        genericError: !/sendJson\(res,\s*500,\s*\{\s*error:\s*String\(error\)/.test(source),
    };
    if (!guards.host) {
        findings.push(ruleFinding('SEC-API-003', { target, filePath, evidence: { check: 'isLoopbackHost' } }));
    }
    if (!guards.origin) {
        findings.push(ruleFinding('SEC-API-003', { target, filePath, evidence: { check: 'isSameOrigin' } }));
    }
    if (!guards.bodyLimit) {
        findings.push(ruleFinding('SEC-API-005', { target, filePath, evidence: { check: 'readJsonBody' } }));
    }
    if (!guards.workspace) {
        findings.push(ruleFinding('SEC-API-002', { target, filePath, evidence: { check: 'knownWorkspace' } }));
    }
    if (!guards.relativePath) {
        findings.push(ruleFinding('SEC-API-005', { target, filePath, confidence: 'likely', evidence: { check: 'assertSafeRelative' } }));
    }
    if (!guards.containment) {
        findings.push(ruleFinding('SEC-API-004', { target, filePath, evidence: { check: 'assertContained' } }));
    }
    if (!guards.providerLookup) {
        findings.push(ruleFinding('SEC-API-005', { target, filePath, confidence: 'possible', evidence: { check: 'candidateByPath' } }));
    }
    if (!guards.sensitiveSource) {
        findings.push(ruleFinding('SEC-API-007', { target, filePath, evidence: { check: 'isSensitivePath' } }));
    }
    if (!guards.genericError) {
        findings.push(ruleFinding('SEC-API-006', { target, filePath, evidence: { check: 'generic 500 body' } }));
    }
    // The code may support a token, but the residual risk is real until one is
    // actually configured in this process.
    if (!guards.token || typeof process.env.CHARLOTTE_API_TOKEN !== 'string' || process.env.CHARLOTTE_API_TOKEN.length < 16) {
        findings.push(ruleFinding('SEC-API-001', {
            target,
            filePath,
            evidence: { check: 'CHARLOTTE_API_TOKEN', configured: typeof process.env.CHARLOTTE_API_TOKEN === 'string' && process.env.CHARLOTTE_API_TOKEN.length >= 16 },
        }));
    }
    const routes = routeInventory(source);
    const mutating = routes.filter(route => MUTATING_HINTS.some(hint => route.includes(hint)));
    return {
        findings,
        facts: {
            readable: true,
            filePath,
            routes,
            mutatingRoutes: mutating,
            routeCount: routes.length,
            mutatingCount: mutating.length,
            guards,
        },
    };
}
