/**
 * Configuration audit for the merged mount config.
 *
 * The loader already rejects unknown keys and wrong types at startup. This
 * module exists for the cases the loader cannot decide: absolute-path hygiene,
 * duplicate roots, permission breadth, and the product-level risk of mounting
 * project-local skills from repositories the user just cloned.
 */
import { isAbsolute, resolve } from 'node:path';
import { CONFIG_KEYS, SOURCE_IDS, SOURCE_KEYS } from '../mount/config.js';
import { auditMountRoot } from './path-audit.js';
import { ruleFinding } from './rules.js';

// The schema is owned by the loader; the audit imports it directly so the
// accepted keys cannot drift.

/**
 * Audit the raw configuration object before/independently of resolution.
 * @param {object} raw - raw plugin config.
 * @returns {Array<object>} findings.
 */
export function auditRawConfig(raw) {
    if (raw === undefined || raw === null) return [];
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        return [ruleFinding('SEC-CFG-001', {
            target: 'config',
            evidence: { snippet: JSON.stringify(raw).slice(0, 200), reason: 'config is not an object' },
        })];
    }
    const findings = [];
    for (const key of Object.keys(raw)) {
        if (!CONFIG_KEYS.includes(key)) {
            findings.push(ruleFinding('SEC-CFG-001', {
                target: 'config',
                filePath: 'dsh-charlotte config',
                evidence: { field: key, expected: CONFIG_KEYS },
            }));
        }
    }
    const sources = raw.sources;
    if (sources !== undefined && (typeof sources !== 'object' || sources === null || Array.isArray(sources))) {
        findings.push(ruleFinding('SEC-CFG-001', {
            target: 'config',
            filePath: 'dsh-charlotte config',
            evidence: { field: 'sources', reason: 'not an object' },
        }));
    }
    else if (sources !== undefined) {
        for (const [id, option] of Object.entries(sources)) {
            if (!SOURCE_IDS.includes(id)) {
                findings.push(ruleFinding('SEC-CFG-001', { target: 'config', filePath: 'dsh-charlotte config', evidence: { field: `sources.${id}` } }));
                continue;
            }
            if (option !== null && typeof option === 'object' && !Array.isArray(option)) {
                for (const key of Object.keys(option)) {
                    if (!SOURCE_KEYS.includes(key)) {
                        findings.push(ruleFinding('SEC-CFG-001', {
                            target: 'config',
                            filePath: 'dsh-charlotte config',
                            evidence: { field: `sources.${id}.${key}` },
                        }));
                    }
                }
            }
        }
    }
    const extraDirs = raw.extraDirs;
    if (Array.isArray(extraDirs)) {
        extraDirs.forEach((entry, index) => {
            if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return;
            for (const key of Object.keys(entry)) {
                if (!['path', 'label', 'rank'].includes(key)) {
                    findings.push(ruleFinding('SEC-CFG-001', {
                        target: 'config',
                        filePath: 'dsh-charlotte config',
                        evidence: { field: `extraDirs[${String(index)}].${key}` },
                    }));
                }
            }
        });
    }
    return findings;
}

/**
 * Audit a resolved mount configuration.
 * @param {object} input - resolved config and optional raw config.
 * @returns {Promise<{findings: Array<object>, facts: object}>} audit result.
 */
export async function auditConfig(input) {
    const resolved = input.resolved ?? {};
    const findings = [...auditRawConfig(input.raw)];
    const facts = { sources: {}, extraDirs: [] };

    // Relative path overrides resolve against the host process cwd, which is
    // not a stable security boundary. `seen` covers every configured root, so
    // a directory mounted twice (through a source and extraDirs) is reported.
    const seen = new Map();
    for (const id of SOURCE_IDS) {
        const option = resolved.sources?.[id];
        if (option === undefined) continue;
        facts.sources[id] = { enabled: option.enabled === true, project: option.project === true, root: option.root ?? null };
        if (typeof option.root === 'string' && !isAbsolute(option.root)) {
            findings.push(ruleFinding('SEC-CFG-002', {
                target: `config:source:${id}`,
                filePath: option.root,
                severity: 'HIGH',
                evidence: { field: `sources.${id}.root`, snippet: option.root, reason: 'relative path' },
            }));
        }
        if (option.enabled === true && typeof option.root === 'string' && isAbsolute(option.root)) {
            const key = resolve(option.root);
            const previous = seen.get(key);
            if (previous !== undefined) {
                findings.push(ruleFinding('SEC-CFG-006', {
                    target: `config:source:${id}`,
                    filePath: key,
                    evidence: { snippet: key, first: previous, second: `sources.${id}` },
                }));
            }
            else {
                seen.set(key, `sources.${id}`);
            }
            // A source root is mounted exactly like an extra directory, so it
            // gets the same sensitive-path, symlink and permission audit.
            findings.push(...await auditMountRoot(key, `source:${id}`));
        }
        if (option.project === true && option.enabled === true) {
            findings.push(ruleFinding('SEC-CFG-004', {
                target: `config:source:${id}`,
                filePath: option.root ?? null,
                evidence: { field: `sources.${id}.project`, reason: 'project-local skills mounted automatically' },
            }));
        }
    }

    for (const dir of resolved.extraDirs ?? []) {
        if (typeof dir.path !== 'string' || !isAbsolute(dir.path)) {
            findings.push(ruleFinding('SEC-CFG-002', {
                target: `config:extraDir:${dir.label ?? 'custom'}`,
                filePath: dir.path ?? null,
                evidence: { snippet: String(dir.path ?? ''), reason: 'relative extraDirs path' },
            }));
            facts.extraDirs.push({ path: dir.path ?? null, label: dir.label ?? null, absolute: false });
            continue;
        }
        const key = resolve(dir.path);
        const previous = seen.get(key);
        if (previous !== undefined) {
            findings.push(ruleFinding('SEC-CFG-006', {
                target: `config:extraDir:${dir.label ?? 'custom'}`,
                filePath: key,
                evidence: { snippet: key, first: previous, second: dir.label ?? 'custom' },
            }));
        }
        else {
            seen.set(key, dir.label ?? 'custom');
        }
        findings.push(...await auditMountRoot(key, dir.label ?? 'custom'));
        facts.extraDirs.push({ path: key, label: dir.label ?? null, absolute: true });
    }

    const enabled = SOURCE_IDS.filter(id => resolved.sources?.[id]?.enabled === true);
    facts.enabledSources = enabled;
    if (enabled.length === SOURCE_IDS.length) {
        findings.push(ruleFinding('SEC-CFG-005', { target: 'config', evidence: { sources: enabled } }));
    }
    facts.agentCount = enabled.length;
    facts.extraDirCount = (resolved.extraDirs ?? []).length;
    return { findings, facts };
}
