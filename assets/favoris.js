/* Immobilier Tunisie — page « Mes favoris » (favoris/, 18/10/2026, IM.15).
   Les favoris sont gardés dans le téléphone du visiteur (window.FAVORIS de assets/page.js, clé « favoris-immobilier ») : rien n'est envoyé.
   Annonce encore en ligne (donnees/annonces.js) : carte complète (même carte que les listes, window.carteAnnonce d'assets/app.js).
   Annonce retirée du site : carte courte avec ce qui a été gardé (titre, prix, lieu, lien, date d'ajout) et « n'est plus en ligne ». */
(function () {
  function E(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function L(fr, ar) { return '<span data-l="fr">' + fr + '</span><span data-l="ar">' + ar + '</span>'; }
  function iso(t) { return "⁦" + t + "⁩"; }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }
  function dfr(d) { return /^\d{4}-\d\d-\d\d$/.test(d || "") ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : ""; }

  function demarrer() {
    var F = window.FAVORIS, zone = document.getElementById("fav-liste");
    if (!F || !zone) return;
    var racine = document.documentElement.getAttribute("data-racine") || "";
    var nbEl = document.getElementById("fav-nb"), vide = document.getElementById("fav-vide"), vider = document.getElementById("fav-vider");
    var bloque = document.getElementById("fav-bloque"), hors = document.getElementById("fav-hors");
    var enLigne = null;                       // id -> annonce du jour ; null = liste du jour pas chargée (hors connexion)
    if (window.ANNONCES && window.ANNONCES.a) { enLigne = Object.create(null); window.ANNONCES.a.forEach(function (a) { enLigne[a.i] = a; }); }

    function retiree(f) {                     // annonce qui n'est plus sur le site (ou liste du jour indisponible)
      var plusLa = enLigne !== null;
      var semblables = racine + "?t=" + f.t + (f.y ? "&amp;y=" + encodeURIComponent(f.y) : "") + (f.g ? "&amp;g=" + encodeURIComponent(f.g) : "") + "#liste";
      return '<article class="annonce fav-retiree" id="a-' + E(f.i) + '" data-t="' + f.t + '">' +
        '<div class="an-tete"><div class="an-quoi">' +
          (plusLa ? '<span class="an-badge fav-plus-la">' + L("N’est plus en ligne", "لم يعد متاحًا") + "</span>" : "") +
          '<h3 class="an-titre">' + L(E(f.tf || "Annonce"), E(f.ta || f.tf || "إعلان")) + "</h3>" +
          (f.lf ? '<p class="an-lieu">' + L(E(f.lf), E(f.la || f.lf)) + "</p>" : "") + "</div>" +
          (window.FAVORIS ? window.FAVORIS.bouton(f.i) : "") + "</div>" +
        (f.p != null ? '<p class="an-prix"><strong>' + nb(f.p) + '</strong> <span class="dt">DT</span><span class="an-prix-note">' + L("prix au moment de l’ajout", "السعر عند الحفظ") + "</span></p>" : "") +
        (plusLa ? '<p class="fav-note">' + L("Cette annonce n’est plus en ligne : le bien est peut-être vendu ou loué.", "هذا الإعلان لم يعد متاحًا: ربما بيع العقار أو أُكري.") + "</p>" : "") +
        (f.d ? '<p class="fav-date">' + L("Ajoutée le " + dfr(f.d), "أُضيف في " + iso(dfr(f.d))) + "</p>" : "") +
        '<div class="fav-actions">' +
          (plusLa ? '<a class="fav-semblables" href="' + semblables + '">' + L("Voir des annonces semblables", "عرض إعلانات مشابهة") + "</a>" : "") +
          (f.u ? '<a class="fav-origine" href="' + E(f.u) + '" target="_blank" rel="noopener nofollow">' + L("Page d’origine", "الصفحة الأصلية") + "</a>" : "") +
          '<button type="button" class="fav-retirer" data-fav-retirer="' + E(f.i) + '">' + L("Retirer", "إزالة") + "</button>" +
        "</div></article>";
    }
    function enCours(f, a) {                  // annonce toujours en ligne : la carte du jour (+ prix au moment de l'ajout s'il a changé)
      var h = window.carteAnnonce ? window.carteAnnonce(a, racine) : retiree(f);
      var note = (f.d ? L("Ajoutée le " + dfr(f.d), "أُضيف في " + iso(dfr(f.d))) : "") +
        (f.p != null && a.p != null && a.p !== f.p ? (f.d ? " · " : "") + L("prix à l’ajout : " + nb(f.p) + "\u00a0DT", "السعر عند الحفظ: " + iso(nb(f.p)) + "\u00a0دينار") : "");
      return note ? h.replace(/<\/article>$/, '<p class="fav-date">' + note + "</p></article>") : h;
    }
    function dessiner() {
      var l = F.lire(), n = l.length;
      zone.innerHTML = l.map(function (f) { var a = enLigne && enLigne[f.i]; return a ? enCours(f, a) : retiree(f); }).join("");
      var partis = enLigne ? l.filter(function (f) { return !enLigne[f.i]; }).length : 0;
      if (nbEl) nbEl.innerHTML = L(n + " favori" + (n > 1 ? "s" : "") + (partis ? " (dont " + partis + " plus en ligne)" : ""),
                                   iso(n) + " مفضّلة" + (partis ? " (منها " + iso(partis) + " لم تعد متاحة)" : ""));
      if (vide) vide.hidden = n > 0;
      if (vider) vider.hidden = n === 0;
      if (bloque) bloque.hidden = !F.bloque();
      if (hors) hors.hidden = enLigne !== null || n === 0;
      F.maj();
    }
    zone.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-fav-retirer]");
      if (!b) return;
      var id = b.getAttribute("data-fav-retirer");
      F.ecrire(F.lire().filter(function (f) { return f.i !== id; }));
    });
    if (vider) vider.addEventListener("click", function () {
      var ok = true;
      try { ok = window.confirm(window.T ? window.T("Effacer tous vos favoris ?", "حذف كل المفضّلات؟") : "Effacer tous vos favoris ?"); } catch (e) {}
      if (ok) F.ecrire([]);
    });
    document.addEventListener("favoris", dessiner);   // cœur touché ici ou « Retirer » : la liste suit
    dessiner();
    // site léger (27/10/2026) : photo, avis de l'IA et lien des favoris encore en ligne lus avec leurs détails, puis la liste redessinée
    var DET = window.DETAILS_IMMO, mes = enLigne ? F.lire().map(function (f) { return enLigne[f.i]; }).filter(Boolean) : [];
    if (DET && !DET.prets(mes)) DET.charger(mes).then(dessiner);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
