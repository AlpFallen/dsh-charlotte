/**
 * dsh-charlotte host entry — the merged skill hub.
 *
 * Two halves live in one plugin:
 * - the read-only mount provider, which registers external
 *   Claude/Codex/ZCode/Cursor/Gemini skill directories as a dsh SkillProvider
 *   and hot-reloads them;
 * - the station API under `/charlotte/api`, which serves the launcher UI
 *   (writable dsh roots, install/trash management, mounted-skill catalog).
 *
 * One scanner, one provider, one install. Mounting replaces importing.
 */
import { makeApiHandler } from './api.js';
import { resolveConfig } from './mount/config.js';
import { MergedSkillProvider } from './merged-provider.js';
import { OverrideStore } from './overrides.js';

export const name = 'dsh-charlotte';

/**
 * Register the provider and the station API route.
 *
 * Waits for both `skills` and `webServer`, so headless compositions load the
 * plugin without mounting anything.
 * @param ctx - host plugin context.
 * @param config - resolved mount configuration from the profile composition.
 */
export function apply(ctx, config = {}) {
    let resolved;
    try {
        resolved = resolveConfig(config);
    }
    catch (error) {
        ctx.logger.warn(`dsh-charlotte disabled: invalid config: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    if (!resolved.anySourceEnabled) {
        ctx.logger.warn('dsh-charlotte: every external source is off and extraDirs is empty; the sidebar still serves dsh-native skills');
    }
    const overrides = new OverrideStore();
    const provider = new MergedSkillProvider({ config: resolved, logger: ctx.logger, overrides });
    ctx.inject(['skills', 'webServer'], (hostCtx) => {
        try {
            hostCtx.skills.registerProvider((control) => {
                provider.attach(control);
                return provider;
            });
        }
        catch (error) {
            hostCtx.logger.warn(`dsh-charlotte provider not registered: ${error instanceof Error ? error.message : String(error)}`);
        }
        hostCtx.effect(() => hostCtx.webServer.register({
            kind: 'prefix',
            path: '/charlotte/api',
            handler: makeApiHandler(hostCtx, resolved, provider),
        }), 'dsh-charlotte: api route');
        hostCtx.effect(function* () {
            yield async () => {
                await provider.dispose();
            };
        }, 'dsh-charlotte: mounted provider lifecycle');
    });
}
