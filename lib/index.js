/**
 * dsh-charlotte host entry — the merged skill hub.
 *
 * Two halves live in one plugin:
 * - the read-only mount provider, which registers external
 *   Claude/Codex/ZCode/Cursor/Gemini skill directories as a dsh SkillProvider
 *   and hot-reloads them;
 * - the station API under `/charlotte/api`, which serves the launcher UI
 *   (writable dsh roots, install/trash management, mounted-skill catalog) and
 *   the unified skill index.
 *
 * On top of that it owns one recommendation engine and one execution observer:
 * `agent/pre-step` is where a skill actually reaches the model, so the plugin
 * records real invocations there instead of trusting a button click.
 */
import { makeApiHandler } from './api.js';
import { SkillIndex } from './catalog.js';
import { resolveRecommendConfig, Recommender } from './recommend.js';
import { LauncherState } from './state.js';
import { resolveConfig } from './mount/config.js';
import { MergedSkillProvider } from './merged-provider.js';
import { OverrideStore } from './overrides.js';

export const name = 'dsh-charlotte';

/** Message text of one model message (string or content parts). */
function messageText(message) {
    const content = message?.content;
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map(part => (typeof part === 'string' ? part : (part?.type === 'text' && typeof part.text === 'string' ? part.text : '')))
        .join('\n');
}

/** Whether one message is a user-authored prompt (not injected context). */
function isPromptMessage(message) {
    if (message?.role !== 'user') return false;
    const kind = message?.source?.kind;
    return kind === undefined || kind === 'user';
}

/**
 * Skill names a step is really invoking.
 *
 * Two sources, in order of authority: the skill-invocation messages the host
 * appended (the exact names dsh-tool-skill injected this step), then `/name`
 * tokens in the user's own prompt text, filtered against the live catalog so a
 * stray slash in prose cannot invent an intent.
 * @param messages - the step's admitted messages.
 * @param byName - current index by name.
 * @returns unique invoked names.
 */
function invokedNames(messages, byName) {
    const names = new Set();
    for (const message of messages) {
        if (message?.source?.kind === 'skill-invocation' && typeof message.source.name === 'string') {
            names.add(message.source.name);
        }
    }
    if (names.size > 0) return [...names];
    for (const message of messages) {
        if (!isPromptMessage(message)) continue;
        for (const match of messageText(message).matchAll(/(?:^|\s)\/([a-z][a-z0-9-]{1,63})(?=\s|$)/g)) {
            const record = byName[match[1]];
            // Only a skill the user may actually run is an invocation; a
            // disabled or model-only name in the prompt is not.
            if (record !== undefined && record.policy.userInvocable && record.policy.disabled !== true) names.add(match[1]);
        }
    }
    return [...names];
}

/**
 * Register the provider, the station API route and the execution observer.
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
    let recommendConfig;
    try {
        recommendConfig = resolveRecommendConfig(config.recommend ?? {});
    }
    catch (error) {
        ctx.logger.warn(`dsh-charlotte: invalid recommend config, recommendations disabled: ${error instanceof Error ? error.message : String(error)}`);
        recommendConfig = { ...resolveRecommendConfig({}), enabled: false };
    }
    if (!resolved.anySourceEnabled) {
        ctx.logger.warn('dsh-charlotte: every external source is off and extraDirs is empty; the sidebar still serves dsh-native skills');
    }
    const overrides = new OverrideStore();
    const state = new LauncherState();
    const provider = new MergedSkillProvider({ config: resolved, logger: ctx.logger, overrides });
    const index = new SkillIndex({ ctx, provider, overrides, state });
    const recommender = new Recommender({ config: recommendConfig, state });
    /** Latest computed recommendation per session, waiting for the client to show it. */
    const pending = new Map();
    /** Latest recommendation per session, kept for the launcher's home page. */
    const latest = new Map();
    /** Skills delivered in the current turn per session, for completion accounting. */
    const turnInvocations = new Map();
    /** Prompt message ids already evaluated, so multi-step turns evaluate once. */
    const seenPrompts = new Map();

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
            handler: makeApiHandler(hostCtx, resolved, provider, {
                index,
                state,
                recommender,
                recommendConfig,
                pending,
                latest,
            }),
        }), 'dsh-charlotte: api route');
        hostCtx.effect(function* () {
            yield async () => {
                await provider.dispose();
            };
        }, 'dsh-charlotte: mounted provider lifecycle');
        // Any provider invalidation (file watch, skill install) drops the
        // merged index; the next reader rebuilds only what changed.
        try {
            hostCtx.on('skills/change', () => {
                index.invalidate();
            });
        }
        catch {
            // The event may not exist in a minimal composition.
        }
    });

    // ---------------------------------------------------------------------
    // Execution observer: the only place the plugin learns that a skill was
    // actually delivered to the model, as opposed to merely staged.
    // ---------------------------------------------------------------------
    listen(ctx, 'agent/pre-step', async (payload, next) => {
        const decision = await next();
        if (decision.kind === 'reject') return decision;
        try {
            const agent = payload.agent;
            const sessionId = agent?.session?.id;
            if (typeof sessionId !== 'string') return decision;
            const workspace = await workingDirectoryOf(ctx, agent, payload.signal);
            const built = await index.build(workspace);
            const names = invokedNames(decision.messages, built.byName);
            if (names.length > 0) {
                const turn = (turnInvocations.get(sessionId) ?? new Set());
                const fresh = names.filter(name => !turn.has(name));
                for (const name of fresh) turn.add(name);
                turnInvocations.set(sessionId, turn);
                for (const name of fresh) await recommender.observe([name], 'invoked');
                if (fresh.length > 0) index.invalidate();
            }
            await maybeRecommend({ ctx, index, recommender, pending, latest, seenPrompts, sessionId, workspace, messages: decision.messages, config: recommendConfig });
        }
        catch (error) {
            ctx.logger.warn(`dsh-charlotte: pre-step observation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return decision;
    });

    // `agent/turn-stopping` is dispatched with `serial`, not `waterfall`: the
    // listener receives the payload only and must not call `next()`.
    listen(ctx, 'agent/turn-stopping', async (payload) => {
        try {
            const sessionId = payload.agent?.session?.id;
            if (typeof sessionId === 'string') {
                const names = turnInvocations.get(sessionId);
                if (names !== undefined && names.size > 0) {
                    await recommender.observe([...names], 'completed');
                    index.invalidate();
                }
                turnInvocations.delete(sessionId);
            }
        }
        catch (error) {
            ctx.logger.warn(`dsh-charlotte: turn accounting failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    listen(ctx, 'agent/request-error', async (payload, next) => {
        const result = await next();
        try {
            const sessionId = payload.agent?.session?.id;
            if (typeof sessionId === 'string') {
                const names = turnInvocations.get(sessionId);
                if (names !== undefined && names.size > 0) {
                    const message = payload.error?.message ?? payload.error?.code ?? 'request failed';
                    await recommender.observe([...names], 'failed', String(message).slice(0, 300));
                    index.invalidate();
                }
            }
        }
        catch (error) {
            ctx.logger.warn(`dsh-charlotte: error accounting failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return result;
    });
}

/**
 * Subscribe to one host event when the composition supports events.
 * Minimal compositions (and the hermetic smoke test) may not expose `on`.
 * @param ctx - host context.
 * @param event - event name.
 * @param handler - listener.
 */
function listen(ctx, event, handler) {
    if (ctx === null || ctx === undefined || typeof ctx.on !== 'function') return;
    try {
        ctx.on(event, handler);
    }
    catch (error) {
        ctx.logger?.warn?.(`dsh-charlotte: cannot listen to ${event}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Resolve the agent's working directory without requiring the service.
 * @param ctx - host context.
 * @param agent - live agent.
 * @param signal - abort signal.
 * @returns absolute path, or empty string when unknown.
 */
async function workingDirectoryOf(ctx, agent, signal) {
    const service = ctx.get('workingDirectory');
    if (service !== undefined) {
        try {
            const path = await service.ensure(agent, signal);
            if (typeof path === 'string' && path.length > 0) return path;
        }
        catch {
            // Fall through to the session's own cwd.
        }
    }
    const cwd = agent?.session?.cwd;
    return typeof cwd === 'string' ? cwd : '';
}

/**
 * Evaluate one new prompt for a recommendation and park the result.
 *
 * The result is only parked: the client asks for it after the assistant turn
 * settles, so a recommendation never interrupts an answer in progress.
 * @param input - evaluation context.
 */
async function maybeRecommend(input) {
    const { ctx, index, recommender, pending, latest, seenPrompts, sessionId, workspace, messages, config } = input;
    if (!config.enabled) return;
    const prompt = [...messages].reverse().find(isPromptMessage);
    if (prompt === undefined) return;
    const id = typeof prompt.id === 'string' ? prompt.id : '';
    const seen = seenPrompts.get(sessionId);
    if (id !== '' && seen === id) return;
    if (id !== '') {
        seenPrompts.set(sessionId, id);
        if (seenPrompts.size > 200) {
            const oldest = seenPrompts.keys().next().value;
            seenPrompts.delete(oldest);
        }
    }
    const text = messageText(prompt).trim();
    if (text.length < config.minIntentChars) return;
    const built = await index.build(workspace);
    const result = await recommender.evaluate({ sessionId, index: built, intent: text });
    if (result.decision !== 'recommend') {
        pending.delete(sessionId);
        // A materially new task replaced the old one; drop the explanation so
        // the management home cannot show a stale recommendation. Cooldown and
        // frequency caps intentionally keep the previous context.
        if (['no-match', 'low-value', 'small-talk', 'intent-too-short', 'disabled'].includes(result.reason)) {
            latest.delete(sessionId);
        }
        return;
    }
    const entry = {
        names: result.items.map(item => item.name),
        fingerprint: result.fingerprint ?? '',
        items: result.items,
        intent: text.slice(0, 400),
        at: Date.now(),
    };
    pending.set(sessionId, entry);
    latest.set(sessionId, entry);
    if (latest.size > 64) {
        const oldest = latest.keys().next().value;
        latest.delete(oldest);
    }
    ctx.logger.debug?.(`dsh-charlotte: parked ${String(result.items.length)} recommendation(s) for session ${sessionId}`);
}
