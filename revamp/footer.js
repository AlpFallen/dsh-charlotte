// Localized replacement for the baseline StationFooterButton: the sidebar row
// opens the station drawer, and the drawer carries no title bar or version —
// the browsing surface (hero, More menu, cards) owns the page chrome. The
// close affordance lives inside the station header.
//
// Only one dsh-charlotte entry point is registered; the launcher owns all
// skill discovery, grouping and invocation.

/**
 * Sidebar foot button plus the portal drawer hosting the station.
 * @param {{wide?: boolean}} props - sidebar owner props.
 * @returns {object} React element.
 */
function StationFooterButton(props) {
  var lang = useSkLang();
  var openState = (0, import_react2.useState)(false);
  var open = openState[0];
  var setOpen = openState[1];
  (0, import_react2.useEffect)(function () {
    if (!open) return undefined;
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      // A dialog inside the station owns Escape while it is open.
      if (document.querySelector(".sk_modal") !== null) return;
      if (document.querySelector(".ss_dialog") !== null) return;
      if (document.querySelector(".sk_more") !== null) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  var drawer = open ? sk("div", {
    className: "ss_overlay",
    onClick: function () {
      setOpen(false);
    }
  }, [
    sk("div", {
      className: "ss_panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skT(lang, "panel.title"),
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      skH(StationApp, {
        onRequestClose: function () {
          setOpen(false);
        }
      })
    ])
  ]) : null;
  return sk(import_jsx_runtime2.Fragment, null, [
    sk("button", {
      className: props.wide === false ? "ss_footBtn ss_footBtnRail" : "ss_footBtn",
      type: "button",
      onClick: function () {
        setOpen(function (value) {
          return !value;
        });
      },
      title: "dsh-charlotte"
    }, [
      skH(StationIcon, {}),
      props.wide === false ? null : sk("span", null, "dsh-charlotte")
    ]),
    drawer !== null && typeof document !== "undefined" ? (0, import_react_dom.createPortal)(drawer, document.body) : null
  ]);
}
