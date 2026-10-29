/**
 * Per-skill overrides for mounted external skills.
 *
 * The merged plugin mounts foreign skill directories read-only, so the
 * enable/disable switch cannot go back into the foreign `SKILL.md`. Instead it
 * lives in `$DSH_HOME/charlotte/overrides.json`, keyed by the absolute
 * `SKILL.md` path, and is applied by {@link MergedSkillProvider} when the
 * registry lists or loads the skill.
 *
 * The file only ever holds dsh-side state. No path outside the override file
 * is written by this module.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dshHome } from './roots.js';

/** Current on-disk schema version. */
export const OVERRIDES_VERSION = 1;

/**
 * Absolute path of the overrides file.
 * @returns `$DSH_HOME/charlotte/overrides.json`.
 */
export function overridesPath() {
    return join(dshHome(), 'charlotte', 'overrides.json');
}

/** Serialize writes so two toggles cannot interleave read-modify-write. */
let writeChain = Promise.resolve();

/**
 * Tiny JSON store for mounted-skill overrides.
 */
export class OverrideStore {
    /**
     * @param file - override file path; defaults to {@link overridesPath}.
     */
    constructor(file = overridesPath()) {
        this.file = file;
        this.cache = undefined;
    }

    /**
     * Read and validate the override map.
     * A missing or broken file counts as "no overrides": the plugin must never
     * fail to load because of its own state file.
     * @returns map of absolute skill path to `{disabled: true}`.
     */
    async read() {
        if (this.cache !== undefined)
            return this.cache;
        let raw;
        try {
            raw = await readFile(this.file, { encoding: 'utf8' });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.cache = {};
                return this.cache;
            }
            throw error;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            this.cache = {};
            return this.cache;
        }
        const skills = parsed !== null && typeof parsed === 'object' && parsed.skills !== null && typeof parsed.skills === 'object' && !Array.isArray(parsed.skills)
            ? parsed.skills
            : {};
        const clean = {};
        for (const [key, value] of Object.entries(skills)) {
            if (value !== null && typeof value === 'object' && value.disabled === true)
                clean[key] = { disabled: true };
        }
        this.cache = clean;
        return clean;
    }

    /**
     * Whether a mounted skill is switched off on the dsh side.
     * @param path - absolute path of the skill's `SKILL.md`.
     * @returns true when the override map marks the skill disabled.
     */
    async isDisabled(path) {
        if (typeof path !== 'string' || path.length === 0)
            return false;
        const map = await this.read();
        return map[path]?.disabled === true;
    }

    /**
     * Set or clear one skill's override, then persist atomically.
     * @param path - absolute path of the skill's `SKILL.md`.
     * @param disabled - true to switch off, false to fall back to the file.
     * @returns the persisted override map.
     */
    async setDisabled(path, disabled) {
        const run = async () => {
            const map = { ...(await this.read()) };
            if (disabled)
                map[path] = { disabled: true };
            else
                delete map[path];
            await this.persist(map);
            this.cache = map;
            return map;
        };
        const next = writeChain.then(run, run);
        // Keep the chain alive even if this write rejects.
        writeChain = next.catch(() => undefined);
        return next;
    }

    /**
     * Write the override map, creating the directory on first use.
     * @param map - full override map to store.
     */
    async persist(map) {
        const payload = `${JSON.stringify({
            version: OVERRIDES_VERSION,
            skills: Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right))),
        }, null, 2)}\n`;
        await mkdir(dirname(this.file), { recursive: true });
        const temporary = `${this.file}.${process.pid}.tmp`;
        await writeFile(temporary, payload, { encoding: 'utf8' });
        await rename(temporary, this.file);
    }
}
