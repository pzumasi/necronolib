// Necronolib — Books & Tomes Atelier
// Entry-Point (ES-Modul). Skeleton — Implementierung folgt nach Projektplan.

Hooks.once("init", () => {
  console.log("Necronolib | init");
});

Hooks.once("ready", () => {
  if (game.user.isGM) console.log("Necronolib | ready");
});
