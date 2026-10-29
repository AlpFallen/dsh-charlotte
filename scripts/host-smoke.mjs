/**
 * Host-side smoke test for the merged plugin — no dsh runtime needed.
 *
 * Exercises the pieces the browser smoke cannot reach:
 * - merged config (five sources, fail-fast validation);
 * - root resolution order (dsh ranks and the union of sources);
 * - the vendored mount provider + override map (list/get, switch, no source writes);
 * - the station API (`/catalog`, `/catalog-skill`, `/registry-skill`, `/skills.registry`, `/override`, retired routes).
 *
 * Everything runs in a temporary directory; the real home is never touched.
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { makeApiHandler } from '../lib/api.js';
import { apply as applyPlugin, name as pluginName } from '../lib/index.js';
import { resolveConfig } from '../lib/mount/config.js';
import { resolveRoots } from '../lib/mount/roots.js';
import { MergedSkillProvider } from '../lib/merged-provider.js';
import { OverrideStore } from '../lib/overrides.js';

const results = [];
/**
 * Run one async check, then record it.
 * @param {string} label - check description.
 * @param {Function} fn - async assertion body.
 * @returns {Promise<void>} resolves after the check passes.
 */
async function check(label, fn) {
    await fn();
    results.push(label);
    console.log(`PASS  ${label}`);
}
const logger = { warn() {}, info() {}, debug() {} };
const skillText = `---
name: demo-skill
description: A demo skill used by the host smoke test.
---

# Demo skill

Body line.
`;

const workRoot = await mkdtemp(join(tmpdir(), 'dsh-charlotte-smoke-'));
try {
    const claudeRoot = join(workRoot, 'claude-skills');
    const codexRoot = join(workRoot, 'codex-skills');
    const zcodeRoot = join(workRoot, 'zcode-skills');
    const cursorRoot = join(workRoot, 'cursor-skills');
    const geminiRoot = join(workRoot, 'gemini-skills');
    const extraRoot = join(workRoot, 'extra-skills');
    const skillDir = join(claudeRoot, 'demo-skill');
    const skillFile = join(skillDir, 'SKILL.md');
    await mkdir(skillDir, { recursive: true });
    await writeFile(skillFile, skillText, 'utf8');
    for (const root of [codexRoot, zcodeRoot, cursorRoot, geminiRoot, extraRoot]) {
        await mkdir(root, { recursive: true });
    }

    // --- config ---------------------------------------------------------------
    await check('defaults enable all five sources under the merged provider name', () => {
        const defaults = resolveConfig({});
        assert.equal(defaults.providerName, 'charlotte');
        assert.deepEqual(Object.keys(defaults.sources), ['claude', 'codex', 'zcode', 'cursor', 'gemini']);
        for (const id of ['claude', 'codex', 'zcode', 'cursor', 'gemini']) {
            assert.equal(defaults.sources[id].enabled, true, `${id} enabled`);
        }
        assert.equal(defaults.anySourceEnabled, true);
    });

    await check('invalid config fails fast instead of mounting something odd', () => {
        assert.throws(() => resolveConfig({ sources: { nope: true } }), /unknown config sources key/);
        assert.throws(() => resolveConfig({ watch: 'yes' }), /must be a boolean/);
        assert.throws(() => resolveConfig({ providerName: 'runtime' }), /reserved/);
    });

    const config = resolveConfig({
        sources: {
            claude: { root: claudeRoot },
            codex: { root: codexRoot },
            zcode: { root: zcodeRoot },
            cursor: { root: cursorRoot },
            gemini: { root: geminiRoot },
        },
        extraDirs: [{ path: extraRoot, label: 'extra-smoke', rank: 300 }],
        watch: false,
    });

    // --- roots ----------------------------------------------------------------
    await check('root resolution unions the sources in rank order', async () => {
        const roots = await resolveRoots(config, undefined);
        const paths = roots.map(root => root.path);
        assert.deepEqual([...paths].sort(), [claudeRoot, codexRoot, cursorRoot, extraRoot, geminiRoot, zcodeRoot].sort());
        const rankOf = (path) => roots.find(root => root.path === path)?.rank;
        assert.ok(rankOf(extraRoot) < rankOf(claudeRoot), 'extra dirs rank above user roots');
        assert.ok(rankOf(claudeRoot) < rankOf(codexRoot) && rankOf(codexRoot) < rankOf(zcodeRoot), 'claude < codex < zcode');
        assert.ok(rankOf(zcodeRoot) < rankOf(cursorRoot) && rankOf(cursorRoot) < rankOf(geminiRoot), 'zcode < cursor < gemini');
    });

    // --- override store -------------------------------------------------------
    const overrideFile = join(workRoot, 'state', 'overrides.json');
    const overrides = new OverrideStore(overrideFile);

    await check('override store starts empty and round-trips one switch', async () => {
        assert.equal(await overrides.isDisabled(skillFile), false);
        await overrides.setDisabled(skillFile, true);
        assert.equal(await overrides.isDisabled(skillFile), true);
        const persisted = JSON.parse(await readFile(overrideFile, 'utf8'));
        assert.equal(persisted.version, 1);
        assert.equal(persisted.skills[skillFile].disabled, true);
        await overrides.setDisabled(skillFile, false);
        assert.equal(await overrides.isDisabled(skillFile), false);
        assert.deepEqual(JSON.parse(await readFile(overrideFile, 'utf8')).skills, {});
    });

    // --- provider -------------------------------------------------------------
    const provider = new MergedSkillProvider({ config, logger, overrides });

    await check('provider lists mounted skills and applies the switch', async () => {
        const listed = await provider.list({});
        assert.equal(listed.length, 1);
        const candidate = listed[0];
        assert.equal(candidate.name, 'demo-skill');
        assert.equal(candidate.invocation.modelInvocable, true);
        assert.equal(candidate.provider, 'charlotte');
        assert.equal(provider.candidateByPath(skillFile)?.name, 'demo-skill');

        await provider.setDisabled(skillFile, true);
        const disabled = (await provider.list({}))[0];
        assert.equal(disabled.invocation.modelInvocable, false, 'switch hides the skill from the model');
        assert.equal(disabled.invocation.userInvocable, true, 'user invocation survives');
        const loaded = await provider.get(provider.candidateByPath(skillFile), {});
        assert.equal(loaded?.invocation.modelInvocable, false, 'get() honours the switch');
        assert.ok(loaded?.content.includes('# Demo skill'), 'body is returned');
        assert.equal(await readFile(skillFile, 'utf8'), skillText, 'mounted source file is never modified');

        await provider.setDisabled(skillFile, false);
        const restored = (await provider.list({}))[0];
        assert.equal(restored.invocation.modelInvocable, true, 'switch clears');
    });

    // --- API ------------------------------------------------------------------
    const registrySummary = {
        name: 'plugin-skill',
        description: 'A skill supplied by a plugin provider.',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'bundled',
        provider: 'demo-plugin',
        path: join(workRoot, 'virtual', 'plugin-skill', 'SKILL.md'),
    };
    const registryDetail = {
        ...registrySummary,
        content: '# Plugin skill\n\nBody line.\n',
        resourceBase: { kind: 'directory', path: join(workRoot, 'virtual', 'plugin-skill') },
    };
    const skillRegistry = {
        list: async () => [registrySummary],
        get: async (name) => name === 'plugin-skill' ? registryDetail : undefined,
    };
    const ctx = { get: (service) => service === 'skills' ? skillRegistry : undefined };
    const handler = makeApiHandler(ctx, config, provider);
    const callApi = async (method, path, body) => {
        const res = {
            status: 0,
            body: '',
            writeHead(status) {
                this.status = status;
            },
            end(chunk) {
                this.body = chunk === undefined ? '' : String(chunk);
            },
        };
        const request = body === undefined
            ? { method, url: path, headers: { host: '127.0.0.1:1' } }
            : Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), {
                method,
                url: path,
                headers: { host: '127.0.0.1:1', origin: 'http://127.0.0.1:1', 'content-type': 'application/json' },
            });
        await handler(request, res);
        return { status: res.status, json: res.body === '' ? {} : JSON.parse(res.body) };
    };

    await check('GET /catalog returns the mounted catalog plus source labels', async () => {
        const catalog = await callApi('GET', '/charlotte/api/catalog');
        assert.equal(catalog.status, 200);
        assert.equal(catalog.json.skills.length, 1);
        assert.equal(catalog.json.skills[0].name, 'demo-skill');
        assert.deepEqual(catalog.json.skills.map(skill => skill.source), ['claude-code']);
        assert.deepEqual(catalog.json.sources.map(source => source.id), ['claude', 'codex', 'zcode', 'cursor', 'gemini']);
    });

    await check('GET /catalog-skill reads the mounted SKILL.md for the detail dialog', async () => {
        const detail = await callApi('GET', `/charlotte/api/catalog-skill?path=${encodeURIComponent(skillFile)}`);
        assert.equal(detail.status, 200);
        assert.equal(detail.json.kind, 'mounted');
        assert.equal(detail.json.source, 'claude-code');
        assert.ok(detail.json.content.includes('name: demo-skill'));
        assert.ok(Array.isArray(detail.json.files) && detail.json.files.includes('SKILL.md'));
    });

    await check('GET /skills carries plugin registry summaries without disturbing writable roots', async () => {
        const listed = await callApi('GET', '/charlotte/api/skills');
        assert.equal(listed.status, 200);
        assert.equal(listed.json.registry.length, 1);
        assert.equal(listed.json.registry[0].name, 'plugin-skill');
        assert.equal(listed.json.registry[0].provider, 'demo-plugin');
        assert.ok(Array.isArray(listed.json.groups), 'writable-root groups are still present');
    });

    await check('GET /registry-skill reads a plugin provider skill for the details dialog', async () => {
        const detail = await callApi('GET', '/charlotte/api/registry-skill?name=plugin-skill');
        assert.equal(detail.status, 200);
        assert.equal(detail.json.name, 'plugin-skill');
        assert.equal(detail.json.provider, 'demo-plugin');
        assert.ok(detail.json.content.includes('# Plugin skill'));
        const missing = await callApi('GET', '/charlotte/api/registry-skill?name=nope');
        assert.equal(missing.status, 404);
    });

    await check('POST /override flips the dsh-side switch and never the source file', async () => {
        const response = await callApi('POST', '/charlotte/api/override', { path: skillFile, disabled: true });
        assert.equal(response.status, 200);
        assert.equal(response.json.disabled, true);
        assert.equal(await readFile(skillFile, 'utf8'), skillText);
        const reflected = await callApi('GET', '/charlotte/api/catalog');
        assert.equal(reflected.json.skills[0].invocation.modelInvocable, false);
        await callApi('POST', '/charlotte/api/override', { path: skillFile, disabled: false });
        const back = await callApi('GET', '/charlotte/api/catalog');
        assert.equal(back.json.skills[0].invocation.modelInvocable, true);
    });

    await check('POST /override rejects paths that are not mounted skills', async () => {
        const response = await callApi('POST', '/charlotte/api/override', { path: join(workRoot, 'nope', 'SKILL.md'), disabled: true });
        assert.equal(response.status, 400);
        assert.match(response.json.error, /not a mounted skill/);
    });

    await check('catalog dedupes sources that resolve to the same real skill', async () => {
        const linkPath = join(codexRoot, 'demo-skill');
        await symlink(skillDir, linkPath, 'dir');
        try {
            const catalog = await callApi('GET', '/charlotte/api/catalog');
            const matches = catalog.json.skills.filter(skill => skill.name === 'demo-skill');
            assert.equal(matches.length, 1, 'one card per real file');
            assert.equal(matches[0].source, 'claude-code', 'the higher-priority source wins');
        } finally {
            await rm(linkPath, { force: true });
        }
    });

    await check('the retired copy-import routes are gone', async () => {
        const scan = await callApi('POST', '/charlotte/api/scan', {});
        assert.equal(scan.status, 405);
        const imported = await callApi('POST', '/charlotte/api/import', { items: [] });
        assert.equal(imported.status, 405);
        const rootsResponse = await callApi('GET', '/charlotte/api/roots');
        assert.equal(rootsResponse.status, 200);
        assert.equal(rootsResponse.json.sources.length, 5);
    });

    await check('provider follows symlinked skill directories', async () => {
        // Real setups symlink skills into ~/.claude/skills (sync tools,
        // dotfile managers); the scanner must mount those too.
        const realDir = join(workRoot, 'linked-source', 'linked-skill');
        await mkdir(realDir, { recursive: true });
        await writeFile(join(realDir, 'SKILL.md'), `---
name: linked-skill
description: mounted through a symlink.
---

# Linked
`, 'utf8');
        const linkPath = join(claudeRoot, 'linked-skill');
        await symlink(realDir, linkPath, 'dir');
        try {
            const listed = await provider.list({});
            const linked = listed.find(candidate => candidate.name === 'linked-skill');
            assert.ok(linked, 'symlinked skill is mounted');
            assert.equal(linked.locator.path, join(linkPath, 'SKILL.md'));
            const loaded = await provider.get(linked, {});
            assert.ok(loaded?.content.includes('# Linked'), 'body loads through the link');
        } finally {
            await rm(linkPath, { force: true });
            await rm(join(workRoot, 'linked-source'), { recursive: true, force: true });
        }
    });

    await check('apply registers the merged provider and the station route', () => {
        assert.equal(pluginName, 'dsh-charlotte');
        const registered = { providers: [], routes: [] };
        const ctx = {
            logger: { warn() {} },
            inject: (services, callback) => {
                assert.deepEqual(services, ['skills', 'webServer']);
                callback({
                    logger: { warn() {} },
                    skills: {
                        registerProvider: (factory) => {
                            registered.providers.push(factory({ invalidate() {} }));
                        },
                    },
                    webServer: {
                        register: (route) => {
                            registered.routes.push(route);
                            return () => {};
                        },
                    },
                    effect: (install) => {
                        const disposer = install();
                        if (disposer !== undefined && typeof disposer.next === 'function') disposer.next();
                    },
                });
            },
        };
        applyPlugin(ctx, {});
        assert.equal(registered.providers.length, 1);
        assert.equal(registered.providers[0].name, 'charlotte');
        assert.equal(registered.routes.length, 1);
        assert.equal(registered.routes[0].path, '/charlotte/api');
        assert.equal(registered.routes[0].kind, 'prefix');
        assert.equal(typeof registered.routes[0].handler, 'function');
    });

    await check('invalid config disables the plugin with a warning instead of throwing', () => {
        let warnings = 0;
        applyPlugin({
            logger: { warn() { warnings += 1; } },
            inject: () => { throw new Error('must not inject on invalid config'); },
        }, { bogusKey: 1 });
        assert.equal(warnings, 1);
    });

    await provider.dispose();
} finally {
    await rm(workRoot, { recursive: true, force: true });
}

console.log(`\n${results.length} host smoke checks passed`);
