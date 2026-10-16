/* Accueil (15/10/2026, demande d'Ahmed : « facile à lire quand on ouvre le site pour la première fois »).
   Les outils de recherche sont repliés sous les 5 cartes ; les cartes « Acheter ou louer » et « Bureaux, commerces… » les ouvrent
   (la 2e choisit les biens professionnels). La recherche reste ouverte quand l'adresse contient déjà des choix (lien partagé,
   retour arrière) ou si JavaScript ne tourne pas (elle n'est repliée QUE par ce script). */
(function () {
  var zone = document.getElementById("zone-recherche");
  if (!zone) return;
  // 16/10/2026 (Ahmed) : la recherche n'est plus repliée : elle est visible par défaut (sous la carte des prix sur téléphone,
  // à sa gauche sur ordinateur) ; la tuile « Voir N annonces » mène à la liste
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("#c-chercher, #c-pro, #ia-voir") : null;   // #ia-voir : tuile « Voir N annonces » (16/10/2026)
    if (!a) return;
    e.preventDefault();
    zone.classList.remove("replie");
    var y = document.getElementById("f-y");
    if (y) {
      y.value = a.getAttribute("data-y") || "";
      y.dispatchEvent(new Event("change", { bubbles: true }));
      y.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var cartes = document.querySelectorAll(".choix-accueil a");
    for (var i = 0; i < cartes.length; i++) cartes[i].classList.toggle("actif", cartes[i] === a);
    var cible = a.id === "ia-voir" ? (document.getElementById("liste") || zone) : zone;
    try { cible.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (x) { /* ancien navigateur */ }
  });
})();
