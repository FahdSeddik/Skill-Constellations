function bootSky() {
  window.skyView = new Sky(document.getElementById("sky"), JSON.parse(document.getElementById("scene").textContent));
}

bootSky();
