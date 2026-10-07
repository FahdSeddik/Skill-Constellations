const MENU_KEY = "skillnet-menu";
const MENU_WIDE = window.matchMedia("(min-width: 721px)");

function setMenu(open, remember) {
  document.body.classList.toggle("menu-open", open);
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", String(open));
  if (remember && MENU_WIDE.matches) writeStore(MENU_KEY, open);
}

function bindSwitch(button, apply) {
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    apply(on);
  });
}

function bindSky(sky) {
  const names = document.querySelector('[data-toggle="names"]');
  const colour = document.querySelector('[data-toggle="colour"]');
  if (!names || !colour) return;
  names.setAttribute("aria-pressed", String(sky.namesOn));
  colour.setAttribute("aria-pressed", String(sky.scene.clumps.coloured));
  bindSwitch(names, (on) => sky.setNames(on));
  bindSwitch(colour, (on) => sky.setColoured(on));
}

function bindMenu() {
  setMenu(MENU_WIDE.matches && !isRecording() && readStore(MENU_KEY) !== false, false);
  document.querySelector(".menu-toggle").addEventListener("click", () => setMenu(true, true));
  document.querySelector(".menu-close").addEventListener("click", () => setMenu(false, true));
  document.querySelector(".menu-picker").addEventListener("change", (event) => {
    window.location.href = event.target.value;
  });
  if (window.skyView) bindSky(window.skyView);
}

bindMenu();
