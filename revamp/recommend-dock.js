// #region dsh-charlotte recommendation dock
//
// The launcher's inline recommendation surface. It is registered into the
// conversation's `conversation.input.dock` list slot — the one public,
// supported place to render a lightweight card directly above the composer at
// the end of the conversation. No DOM injection, no chat-flow patching.
//
// Behaviour:
//   - the host evaluates the latest user prompt at `agent/pre-step` and parks
//     at most three candidates for the session;
//   - this card asks for that parked result only after the turn settles
//     (running true → false), so it never interrupts an answer;
//   - showing it reports back once, so the host marks it as shown and applies
//     de-duplication / cooldown / frequency caps on its side;
//   - Use runs the same authorized load chain as the management page;
//   - Ignore is persisted on the host for the current task fingerprint.
//
// The dock renders nothing when the host has no candidate, when the feature is
// disabled, or when the user dismissed the current card.

var SK_DOCK_COLLAPSED_KEY = "dsh-charlotte:dock-collapsed";

/**
 * Read the persisted collapsed state of the recommendation card.
 * @returns {boolean} true when the card is collapsed.
 */
function skDockCollapsed() {
  try {
    return window.localStorage.getItem(SK_DOCK_COLLAPSED_KEY) === "1";
  } catch (error) {
    return false;
  }
}

/**
 * Persist the collapsed state of the recommendation card.
 * @param {boolean} collapsed - true to collapse.
 */
function skSetDockCollapsed(collapsed) {
  try {
    window.localStorage.setItem(SK_DOCK_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (error) {
    // The in-memory state still toggles when storage is unavailable.
  }
}

/**
 * Subscribe to one session's running flag.
 * @param {string} sessionId - session id.
 * @param {Function} onChange - receives `running` boolean.
 * @returns {Function} unsubscribe.
 */
function skWatchRunning(sessionId, onChange) {
  var sessions = skService("sessions");
  if (sessions === undefined || sessions === null || sessions.list === undefined || typeof sessions.list.subscribe !== "function") {
    return function () {};
  }
  var read = function () {
    var snapshot = sessions.list.getSnapshot();
    var row = snapshot === null || snapshot === undefined || snapshot.byId === undefined ? undefined : snapshot.byId[sessionId];
    onChange(row !== undefined && row !== null && row.running === true);
  };
  read();
  var dispose = sessions.list.subscribe(read);
  return typeof dispose === "function" ? dispose : function () {};
}

/**
 * Inline recommendation card for the active conversation.
 * @param {{sessionId?: string, t?: Function}} props - slot props.
 * @returns {object|null} card element, or null when there is nothing to show.
 */
function SkRecommendDock(props) {
  var lang = useSkLang();
  var sessionId = typeof props.sessionId === "string" ? props.sessionId : "";
  var itemsState = (0, import_react.useState)([]);
  var items = itemsState[0];
  var setItems = itemsState[1];
  var fingerprintState = (0, import_react.useState)("");
  var fingerprint = fingerprintState[0];
  var setFingerprint = fingerprintState[1];
  var intentState = (0, import_react.useState)("");
  var intent = intentState[0];
  var setIntent = intentState[1];
  var statusState = (0, import_react.useState)(null);
  var status = statusState[0];
  var setStatus = statusState[1];
  var collapsedState = (0, import_react.useState)(skDockCollapsed());
  var collapsed = collapsedState[0];
  var setCollapsed = collapsedState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var runningRef = (0, import_react.useRef)(null);
  var reportedRef = (0, import_react.useRef)("");
  var aliveRef = (0, import_react.useRef)(true);

  var fetchPending = (0, import_react.useCallback)(function () {
    if (sessionId === "") return;
    var workspace = skCurrentWorkspacePath();
    // Fetch the same index the management page reads. The recommendation item
    // carries a match reason, not the skill's own description, so the card must
    // resolve the real record before it renders an intro.
    void Promise.all([skApi.sessionState(sessionId), skApi.index(workspace)]).then(function (results) {
      if (!aliveRef.current) return;
      var result = results[0];
      var indexResult = results[1];
      if (!result.ok) return;
      var pending = result.body.pending;
      if (pending === null || pending === undefined || !Array.isArray(pending.items) || pending.items.length === 0) return;
      var skills = indexResult.ok && indexResult.body !== null && indexResult.body !== undefined && Array.isArray(indexResult.body.skills)
        ? indexResult.body.skills
        : [];
      if (skills.length === 0) {
        // Without the canonical records we cannot show a real intro or verify
        // permissions. Do not fall back to the match reason as a description.
        setItems([]);
        return;
      }
      var entries = skHomeEntriesFromHost(pending.items, skills);
      if (entries.length === 0) {
        setItems([]);
        return;
      }
      setItems(entries);
      setFingerprint(typeof pending.fingerprint === "string" ? pending.fingerprint : "");
      setIntent(typeof pending.intent === "string" ? pending.intent : "");
      setStatus(null);
      for (var index = 0; index < entries.length; index += 1) {
        skRememberRecommendation(entries[index].name, {
          reason: entries[index].reason,
          reasonEn: entries[index].reasonEn,
          category: entries[index].category,
          at: typeof pending.at === "number" ? pending.at : Date.now(),
          sessionId: sessionId
        });
      }
    });
  }, [sessionId]);

  (0, import_react.useEffect)(function () {
    aliveRef.current = true;
    if (sessionId === "") return function () { aliveRef.current = false; };
    fetchPending();
    return function () {
      aliveRef.current = false;
    };
  }, [sessionId, fetchPending]);

  (0, import_react.useEffect)(function () {
    if (sessionId === "") return undefined;
    var dispose = skWatchRunning(sessionId, function (running) {
      var previous = runningRef.current;
      runningRef.current = running;
      if (previous === true && running === false) {
        // One small delay lets the host finish its turn bookkeeping; the
        // candidate itself was computed before the answer started.
        if (typeof window !== "undefined") window.setTimeout(fetchPending, 500);
      }
      if (previous === null && running === false) fetchPending();
    });
    return function () {
      if (typeof dispose === "function") dispose();
    };
  }, [sessionId, fetchPending]);

  (0, import_react.useEffect)(function () {
    if (items.length === 0) return;
    var names = items.map(function (item) { return item.name; });
    var key = sessionId + "|" + names.join("|");
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    void skApi.event({ sessionId: sessionId, name: names[0], phase: "recommended" }).catch(function () {
      // If the host does not accept the shown report, the card still works;
      // the next evaluation simply re-offers within the cooldown.
    });
  }, [items, sessionId]);

  if (sessionId === "" || items.length === 0) return null;

  var toggleCollapsed = function () {
    var next = !collapsed;
    setCollapsed(next);
    skSetDockCollapsed(next);
  };

  var ignore = function (item) {
    if (sessionId !== "") skReportEvent(item.name, "dismissed", "", "", sessionId);
    setItems(items.filter(function (row) { return row.name !== item.name; }));
    void skApi.ignore({ sessionId: sessionId, name: item.name, fingerprint: fingerprint }).catch(function () {
      // Ignoring stays locally honoured even if the write failed.
    });
    setStatus({ kind: "ok", text: skT(lang, "dock.ignored") });
  };

  var use = function (item) {
    if (busy !== "") return;
    setBusy(item.name);
    setStatus({ kind: null, text: skT(lang, "dock.loading") });
    if (sessionId !== "") skReportEvent(item.name, "accepted", "", "", sessionId);
    // Load stages the skill token and nothing else: the user writes the task.
    void skUseSkill(item.name, "", {}).then(function (outcome) {
      if (!aliveRef.current) return;
      setBusy("");
      if (outcome.ok) {
        setStatus({ kind: "ok", text: skT(lang, "dock.loaded") });
        setItems(items.filter(function (row) { return row.name !== item.name; }));
        return;
      }
      if (outcome.cancelled === true) {
        setStatus({ kind: null, text: skT(lang, "notice.cancelled") });
        return;
      }
      setStatus({ kind: "err", text: skT(lang, "dock.failed", { reason: outcome.error ?? "" }) });
    });
  };

  return sk("section", {
    className: "skd_card" + (collapsed ? " skd_collapsed" : ""),
    "data-collapsed": collapsed ? "" : undefined,
    "aria-label": skT(lang, "dock.title")
  }, [
    sk("div", { className: "skd_head" }, [
      sk("span", { className: "skd_headIcon" }, [skH(SkStar, { size: 11, filled: true })]),
      sk("span", null, skT(lang, "dock.title")),
      sk("span", { className: "skd_count" }, skT(lang, "dock.count", { count: items.length })),
      sk("button", {
        className: "skd_toggle",
        type: "button",
        "aria-expanded": collapsed ? "false" : "true",
        "aria-label": skT(lang, collapsed ? "dock.expand" : "dock.collapse"),
        title: skT(lang, collapsed ? "dock.expand" : "dock.collapse"),
        onClick: toggleCollapsed
      }, collapsed ? "▸" : "▾")
    ]),
    collapsed ? null : items.map(function (item) {
      var disabled = busy !== "";
      var category = item.skill?.category ?? item.category;
      return sk("div", { key: "rec-" + item.name, className: "skd_row" }, [
        sk("div", { className: "skd_glyph" }, [skH(SkCatGlyph, { id: category?.id, size: 13 })]),
        sk("div", { className: "skd_main" }, [
          sk("div", { className: "skd_name" }, [
            sk("span", { className: "skd_nameText" }, item.name),
            sk("span", { className: "skd_cat" }, lang === "zh" ? category?.label ?? "" : category?.labelEn ?? "")
          ]),
          sk("div", { className: "skd_intro" }, skSkillIntro(item.skill, lang)),
          item.reason !== undefined && item.reason !== null && item.reason !== ""
            ? sk("div", { className: "skd_why" }, [
              sk("span", { className: "skd_whyLabel" }, skT(lang, "dock.reason")),
              lang === "en" && typeof item.reasonEn === "string" && item.reasonEn !== "" ? item.reasonEn : item.reason
            ])
            : null
        ]),
        sk("div", { className: "skd_actions" }, [
          sk("button", {
            className: "skd_use",
            type: "button",
            disabled: disabled,
            onClick: function () { use(item); }
          }, busy === item.name ? skT(lang, "dock.loading") : skT(lang, "dock.use")),
          sk("button", {
            className: "skd_ignore",
            type: "button",
            disabled: disabled,
            onClick: function () { ignore(item); }
          }, skT(lang, "dock.ignore"))
        ])
      ]);
    }),
    collapsed || status === null ? null : sk("div", { className: "skd_status", "data-kind": status.kind ?? undefined }, status.text)
  ]);
}

/**
 * Register the dock into the conversation input dock slot.
 * @param {object} ctx - client plugin context.
 */
function skRegisterRecommendDock(ctx) {
  if (ctx === null || ctx === undefined || ctx.slots === undefined || typeof ctx.slots.inject !== "function") return;
  try {
    ctx.slots.inject("conversation.input.dock", function () {
      return ctx.slots.register({
        name: "conversation.input.dock",
        id: "charlotte-recommend",
        order: 30,
        inject: function (sessionId) {
          return { sessionId: sessionId };
        }
      }, SkRecommendDock);
    });
  } catch (error) {
    // A shell without the conversation slot simply has no inline card; the
    // launcher page remains fully usable.
  }
}
// #endregion
