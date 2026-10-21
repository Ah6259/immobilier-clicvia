// Page video/ (21/10/2026, Ahmed : « pourquoi la vidéo ne se lance pas toute seule ? ») : les navigateurs interdisent le lancement
// automatique d'une vidéo AVEC le son ; elle se lance donc toute seule SANS le son, et le bouton « Activer le son » la reprend depuis
// le début avec le son. Si le téléphone bloque quand même le lancement (économie de données), le bouton la lance avec le son.
(function () {
  "use strict";
  var v = document.querySelector(".video-lecteur"), b = document.querySelector(".btn-video-son");
  if (!v || !b) return;
  if (v.hasAttribute("muted")) v.muted = true;   // sans le son au départ (certains iPhone ne lisent pas l'attribut seul)
  function cacher() { b.hidden = !v.muted; }
  b.addEventListener("click", function () {
    v.muted = false;
    try { v.currentTime = 0; } catch (e) { /* vidéo pas encore prête */ }
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* lancement refusé : les commandes de la vidéo restent là */ });
    cacher();
  });
  v.addEventListener("volumechange", cacher);   // son activé par les commandes de la vidéo : le bouton disparaît
  var p = v.play();                              // (l'attribut autoplay suffit souvent ; on le redemande pour les navigateurs lents)
  if (p && p.catch) p.catch(function () { /* lancement automatique bloqué : le bouton lance la vidéo avec le son */ });
  cacher();
})();
