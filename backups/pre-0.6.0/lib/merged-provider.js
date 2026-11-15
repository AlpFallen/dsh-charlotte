/**
 * The merged plugin's single SkillProvider.
 *
 * It wraps the read-only mount provider (Claude Code /
 * Codex / ZCode / Cursor / Gemini skill directories, hot reload, frontmatter
 * mapping) and applies the dsh-side override map on top. Everything the dsh
 * registry sees — list(), get(), the provider name and rank — goes through
 * that single scanner, which is why the station's old copy-import scanner was
 * retired.
 */
import { MountSkillProvider } from './mount/provider.js';

/**
 * Apply the override map to one registry candidate or loaded skill.
 * A disabled skill stays listed (so the sidebar can switch it back on) but is
 * hidden from model invocation, mirroring `disable-model-invocation: true`.
 * @param skill - candidate or loaded skill record.
 * @param store - override store.
 * @returns a copy with `invocation.modelInvocable` false when disabled.
 */
function applyOverride(skill, disabled) {
    if (!disabled)
        return skill;
    return {
        ...skill,
        invocation: { ...skill.invocation, modelInvocable: false },
    };
}

/**
 * SkillProvider registered with `ctx.skills`, decorated with UI overrides.
 */
export class MergedSkillProvider {
    /**
     * @param options.config - resolved mount config.
     * @param options.logger - host logger.
     * @param options.overrides - override store instance.
     */
    constructor(options) {
        this.inner = new MountSkillProvider(options.config, options.logger);
        this.overrides = options.overrides;
        this.name = options.config.providerName;
        /** Last listing, so the sidebar can resolve a detail by absolute path. */
        this.lastCandidates = new Map();
    }

    /**
     * Hand the provider to the registry; called exactly once by the factory.
     * @param control - registry control handle (invalidate / lifecycle).
     */
    attach(control) {
        this.inner.attach(control);
    }

    /**
     * List every mounted skill with overrides applied.
     * @param options - registry options (cwd, scope, signal).
     * @returns registry candidates.
     */
    async list(options) {
        const candidates = await this.inner.list(options);
        const map = await this.overrides.read();
        const decorated = candidates.map(candidate => applyOverride(candidate, map[candidate.path]?.disabled === true));
        this.lastCandidates = new Map(decorated.map(candidate => [candidate.path, candidate]));
        return decorated;
    }

    /**
     * Load one mounted skill's body with overrides applied.
     * @param candidate - registry candidate from {@link list}.
     * @param options - registry options.
     * @returns the loaded skill, or undefined when it vanished.
     */
    async get(candidate, options) {
        const resolved = await this.inner.get(candidate, options);
        if (resolved === undefined)
            return undefined;
        const disabled = await this.overrides.isDisabled(resolved.path ?? candidate.path);
        return applyOverride(resolved, disabled);
    }

    /**
     * Find a candidate by absolute `SKILL.md` path.
     * @param path - absolute path.
     * @returns the cached candidate, or undefined.
     */
    candidateByPath(path) {
        return this.lastCandidates.get(path);
    }

    /**
     * Persist one mounted skill's switch and refresh the registry.
     * @param path - absolute path of the skill's `SKILL.md`.
     * @param disabled - true to switch off, false to fall back to the file.
     * @returns the new disabled state.
     */
    async setDisabled(path, disabled) {
        await this.overrides.setDisabled(path, disabled);
        const cached = this.lastCandidates.get(path);
        if (cached !== undefined)
            this.lastCandidates.set(path, applyOverride(cached, disabled));
        this.invalidate();
        return disabled;
    }

    /**
     * Refresh the registry after an override changed.
     */
    invalidate() {
        this.inner.control?.invalidate();
    }

    /**
     * Stop watchers and mark the provider disposed.
     */
    async dispose() {
        this.lastCandidates.clear();
        await this.inner.dispose();
    }
}
