/* Affiche d'accueil (25/10/2026, Ahmed : « l'affiche doit être au-dessus du site comme une affiche publicitaire, il faut la fermer
   pour voir le site »). Montrée au plus une fois par jour et par téléphone (date gardée dans le téléphone), jamais sur un lien
   partagé (?a=…) ni pour un navigateur automatique (robots, visiteur simulé). Fermée par la croix, le bouton, Échap ou un toucher
   à côté. Aucun script en ligne (CSP). */
(function () {
  var f = document.getElementById("pub-affiche");
  if (!f) return;
  var jour = new Date().toISOString().slice(0, 10), CLE = "affiche-vue";
  var deja = "";
  try { deja = localStorage.getItem(CLE) || ""; } catch (e) { deja = ""; }
  if (deja === jour || /[?&]a=/.test(location.search) || navigator.webdriver) return;
  var avant = document.activeElement;
  function fermer() {
    f.hidden = true;
    document.documentElement.classList.remove("pub-ouverte");
    try { localStorage.setItem(CLE, jour); } catch (e) { /* téléphone sans mémoire : l'affiche reviendra */ }
    document.removeEventListener("keydown", touche);
    if (avant && avant.focus) avant.focus();
  }
  function touche(e) { if (e.key === "Escape") fermer(); }
  f.addEventListener("click", function (e) {
    if (e.target === f || (e.target.closest && e.target.closest("[data-fermer]"))) fermer();
  });
  document.addEventListener("keydown", touche);
  f.hidden = false;
  document.documentElement.classList.add("pub-ouverte");
  var b = f.querySelector(".pub-go");
  if (b) b.focus();
})();
