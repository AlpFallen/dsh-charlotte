const CONFIG_KEYS = [
    'providerName',
    'sources',
    'extraDirs',
    'watch',
    'watchUsePolling',
    'watchStabilityThresholdMs',
    'watchPollIntervalMs',
    'watchMaxProjects',
    'slugifyNames',
    'synthesizeDescription',
    // Owned by lib/recommend.js (validated there); accepted here so the mount
    // config resolver does not reject the launcher's own recommendation knob.
    'recommend',
];
const SOURCE_KEYS = ['enabled', 'project', 'root', 'rank'];
const SOURCE_IDS = ['claude', 'codex', 'zcode', 'cursor', 'gemini'];
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function booleanField(source, key) {
    const value = source[key];
    if (value === undefined)
        return undefined;
    if (typeof value !== 'boolean')
        throw new Error(`config field "${key}" must be a boolean, got ${typeof value}`);
    return value;
}
function positiveNumberField(source, key) {
    const value = source[key];
    if (value === undefined)
        return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`config field "${key}" must be a positive finite number`);
    }
    return value;
}
function stringField(source, key) {
    const value = source[key];
    if (value === undefined)
        return undefined;
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`config field "${key}" must be a non-empty string`);
    }
    return value;
}
function resolveSourceOption(id, option) {
    const settings = { enabled: true, project: true };
    if (option === undefined || typeof option === 'boolean') {
        settings.enabled = option !== false;
        return settings;
    }
    if (!isPlainObject(option)) {
        throw new Error(`config sources.${id} must be a boolean or an object`);
    }
    for (const key of Object.keys(option)) {
        if (!SOURCE_KEYS.includes(key)) {
            throw new Error(`unknown config sources.${id} key "${key}" (expected ${SOURCE_KEYS.join(', ')})`);
        }
    }
    const enabled = booleanField(option, 'enabled');
    const project = booleanField(option, 'project');
    const root = stringField(option, 'root');
    const rank = option.rank;
    if (rank !== undefined && (typeof rank !== 'number' || !Number.isFinite(rank))) {
        throw new Error('config sources rank must be a finite number');
    }
    return {
        enabled: enabled ?? true,
        project: project ?? true,
        root,
        rank,
    };
}
function resolveExtraDirs(value) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new Error('config extraDirs must be an array');
    const dirs = [];
    for (const raw of value) {
        if (!isPlainObject(raw))
            throw new Error('config extraDirs entries must be objects like { path, label?, rank? }');
        for (const key of Object.keys(raw)) {
            if (!['path', 'label', 'rank'].includes(key)) {
                throw new Error(`unknown config extraDirs entry key "${key}" (expected path, label, rank)`);
            }
        }
        const path = stringField(raw, 'path');
        if (path === undefined)
            throw new Error('config extraDirs entry requires a non-empty "path"');
        const label = stringField(raw, 'label') ?? 'custom';
        const rank = raw.rank;
        if (rank !== undefined && (typeof rank !== 'number' || !Number.isFinite(rank))) {
            throw new Error('config extraDirs entry rank must be a finite number');
        }
        dirs.push({ path, label, rank: rank ?? 300 });
    }
    return dirs;
}
/**
 * 校验并规范化配置。任何未知键或非法值都会抛错——让错误在插件激活期
 * 暴露，而不是在扫描期被静默吞掉。
 */
export function resolveConfig(input) {
    if (input !== undefined && !isPlainObject(input)) {
        throw new Error('plugin config must be an object');
    }
    const source = input ?? {};
    for (const key of Object.keys(source)) {
        if (!CONFIG_KEYS.includes(key)) {
            throw new Error(`unknown plugin config key "${key}" (expected ${CONFIG_KEYS.join(', ')})`);
        }
    }
    const providerName = stringField(source, 'providerName') ?? 'charlotte';
    if (providerName === 'runtime') {
        throw new Error('config providerName "runtime" is reserved by the dsh skill registry');
    }
    const rawSources = source.sources;
    if (rawSources !== undefined && !isPlainObject(rawSources)) {
        throw new Error(`config sources must be an object with keys ${SOURCE_IDS.join(', ')}`);
    }
    for (const key of Object.keys(rawSources ?? {})) {
        if (!SOURCE_IDS.includes(key)) {
            throw new Error(`unknown config sources key "${key}" (expected ${SOURCE_IDS.join(', ')})`);
        }
    }
    const sources = {
        claude: resolveSourceOption('claude', rawSources?.claude),
        codex: resolveSourceOption('codex', rawSources?.codex),
        zcode: resolveSourceOption('zcode', rawSources?.zcode),
        cursor: resolveSourceOption('cursor', rawSources?.cursor),
        gemini: resolveSourceOption('gemini', rawSources?.gemini),
    };
    const watch = booleanField(source, 'watch') ?? true;
    const watchUsePolling = booleanField(source, 'watchUsePolling') ?? false;
    const watchStabilityThresholdMs = positiveNumberField(source, 'watchStabilityThresholdMs') ?? 200;
    const watchPollIntervalMs = positiveNumberField(source, 'watchPollIntervalMs') ?? 100;
    const watchMaxProjects = positiveNumberField(source, 'watchMaxProjects') ?? 128;
    const slugifyNames = booleanField(source, 'slugifyNames') ?? true;
    const synthesizeDescription = booleanField(source, 'synthesizeDescription') ?? true;
    const extraDirs = resolveExtraDirs(source.extraDirs);
    const anySourceEnabled = SOURCE_IDS.some(id => sources[id].enabled) || extraDirs.length > 0;
    return Object.freeze({
        providerName,
        sources,
        extraDirs: Object.freeze(extraDirs),
        watch,
        watchUsePolling,
        watchStabilityThresholdMs,
        watchPollIntervalMs,
        watchMaxProjects,
        slugifyNames,
        synthesizeDescription,
        anySourceEnabled,
    });
}
