/* Carte des prix (15/10/2026, demandes d'Ahmed : « une carte des prix comme SeLoger, sur notre carte réelle de la Tunisie » puis
   « remplacer l'ancienne carte par la nouvelle ; un gouvernorat sans prix par quartier : un cercle avec son nombre d'annonces »).
   Sur la page prix/, en haut de l'accueil et des pages de gouvernorat (#cp-carte ; data-g = gouvernorat à montrer).
   Données : prix/carte.js (robot/construire_site.py, donnees_carte_prix : prix sûrs, appartements, au moins 3 annonces).
   Carte : Leaflet 1.9.4 (cdnjs) + tuiles OpenStreetMap, comme Points d'eau. Sans elle (pas de réseau), l'ancienne carte reste. */
(function () {
  var racine = document.documentElement.getAttribute("data-racine") || "";
  var COULEURS = ["#2E7D4F", "#7FB33D", "#F2B33D", "#E8793A", "#C0392B"];
  var carte = null, couche = null, mode = "m2", type = "tout", zone = null;   // « Tout » par défaut (demande d'Ahmed, 15/10/2026)
  // appartements, maisons et terrains À PART (15/10/2026, Ahmed : Djerba = surtout des maisons) : champ du prix et de son nombre
  var CHAMP = { appartement: { m2: ["m2", "nv"], loyer: ["loyer", "nl"] }, maison: { m2: ["mm2", "nmv"], loyer: ["ml", "nml"] }, terrain: { m2: ["tm2", "ntv"] } };
  // « Tout » : chaque type garde son prix (jamais mélangés) ; le rond est neutre, sa bulle donne le prix de chaque type
  var TOUT = { m2: [["m2", "nv", "appartement"], ["mm2", "nmv", "maison"], ["tm2", "ntv", "terrain"]], loyer: [["loyer", "nl", "appartement"], ["ml", "nml", "maison"]] };
  function champ() { return type === "tout" ? null : (CHAMP[type][mode] || CHAMP[type].m2)[0]; }
  function nombre(x) { return type === "tout" ? TOUT[mode].reduce(function (s, c) { return s + (x[c[0]] ? x[c[1]] : 0); }, 0) : x[(CHAMP[type][mode] || CHAMP[type].m2)[1]]; }
  function aUnPrix(x) { return type === "tout" ? TOUT[mode].some(function (c) { return x[c[0]]; }) : !!x[champ()]; }
  function ar() { return document.documentElement.lang === "ar"; }
  function T(fr, a) { return ar() ? a : fr; }
  function nb(x) { return Math.round(x).toLocaleString("fr-FR").replace(/[  ]/g, " "); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function bornes(v) {                       // 5 classes de même effectif (quantiles)
    v = v.slice().sort(function (a, b) { return a - b; });
    return [0.2, 0.4, 0.6, 0.8].map(function (f) { return v[Math.min(v.length - 1, Math.floor(v.length * f))]; });
  }
  function classe(x, b) { var i = 0; while (i < b.length && x > b[i]) i++; return i; }
  function unite() { return mode === "m2" ? T(" DT/m²", " دينار/م²") : T(" DT/mois", " دينار/شهر"); }
  // nombre de quartiers avec un prix pour un type de bien (tous modes), dans un gouvernorat (ou partout)
  function compter(t, g) {
    var c = {};
    if (t === "tout") ["m2", "loyer", "mm2", "ml", "tm2"].forEach(function (k) { c[k] = 1; });
    else Object.keys(CHAMP[t]).forEach(function (m) { c[CHAMP[t][m][0]] = 1; });
    return donnees().q.filter(function (x) { return (!g || x.g === g) && Object.keys(c).some(function (k) { return x[k]; }); }).length;
  }
  var NOMS_T = { appartement: ["les appartements", "الشقق"], maison: ["les maisons", "المنازل"], terrain: ["les terrains", "الأراضي"], tout: ["ces biens", "هذه العقارات"] };
  var NOM_1 = { appartement: ["Appartement", "شقة"], maison: ["Maison", "منزل"], terrain: ["Terrain", "أرض"] };
  function boutons() {
    [].forEach.call(document.querySelectorAll(".cp-btn[data-mode]"), function (x) {
      x.classList.toggle("actif", x.getAttribute("data-mode") === mode);
      x.disabled = type === "terrain" && x.getAttribute("data-mode") === "loyer";     // un terrain ne se loue pas
    });
    [].forEach.call(document.querySelectorAll(".cp-btn[data-type]"), function (x) { x.classList.toggle("actif", x.getAttribute("data-type") === type); });
  }
  function nomType() { return { appartement: T("appartements", "شقق"), maison: T("maisons", "منازل"), terrain: T("terrains", "أراضٍ"), tout: T("tous types", "كل الأنواع") }[type]; }
  function donnees() { var D = window.CARTE_PRIX || {}; return { q: D.q || (Array.isArray(D) ? D : []), g: D.g || [] }; }

  function dessiner() {
    var D = donnees(), f = champ(), pts = D.q.filter(aUnPrix);
    var b = f ? bornes(pts.map(function (x) { return x[f]; })) : [];
    // « Tout » : couleur selon le type de bien PRINCIPAL du quartier, comparé aux quartiers du MÊME type (jamais une échelle mélangée ;
    // demande d'Ahmed du 15/10/2026 : garder les couleurs selon le prix)
    var bt = {};
    if (!f) TOUT[mode].forEach(function (k) { var v = pts.filter(function (x) { return x[k[0]]; }).map(function (x) { return x[k[0]]; }); if (v.length) bt[k[0]] = bornes(v); });
    function principal(x) { return TOUT[mode].filter(function (k) { return x[k[0]]; }).sort(function (a, c) { return x[c[1]] - x[a[1]]; })[0]; }
    var avecPrix = {};
    pts.forEach(function (x) { avecPrix[x.g] = 1; });
    if (couche) couche.remove();
    couche = L.layerGroup().addTo(carte);
    // gouvernorats sans quartier avec un prix : un cercle avec leur nombre d'annonces
    D.g.forEach(function (x) {
      if (avecPrix[x.g] || !x.n) return;
      var nom = esc(ar() ? x.ar : x.fr);
      // d'autres types de biens ont des prix ici (Djerba : des maisons, 15/10/2026) : un bouton pour les voir
      var autres = (type === "tout" ? [] : ["appartement", "maison", "terrain"]).filter(function (t) { return t !== type && compter(t, x.g); }).map(function (t) {
        return '<br><button type="button" class="cp-voir-type" data-type="' + t + '" data-g="' + x.g + '">' + T("Voir ", "شاهد ") + NOMS_T[t][ar() ? 1 : 0] +
          " (" + compter(t, x.g) + (compter(t, x.g) === 1 ? T(" quartier)", " حي)") : T(" quartiers)", " أحياء)")) + "</button>";
      }).join("");
      L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv", html: "<span>" + nb(x.n) + "</span>", iconSize: [38, 38] }), title: nom + " · " + nb(x.n) + T(" annonces", " إعلانًا") })
        .bindPopup("<b>" + nom + "</b><br>" + nb(x.n) + T(" annonces", " إعلانًا") + "<br><small>" + T("Pas encore assez de prix pour ", "لا توجد بعد أسعار كافية لـ") + NOMS_T[type][ar() ? 1 : 0] +
                   ".</small>" + autres + '<br><a href="' + racine + x.g + '/#liste">' + T("Voir les " + nb(x.n) + " annonces", "شاهد " + nb(x.n) + " إعلانًا") + "</a>").addTo(couche);
    });
    // quartiers qui ont des annonces mais pas encore de prix pour CE choix (15/10/2026, Ahmed : « la bulle d'Ariana Essoghra
    // n'apparaît pas » : 47 annonces, un loyer, mais pas encore de prix de vente au m²) -> bulle GRISE avec le nombre d'annonces,
    // ce qui est connu (loyer…) et le lien ; jamais de couleur de prix inventée
    var sansPrix = D.q.filter(function (x) { return x.t && x.p && !aUnPrix(x); });
    sansPrix.forEach(function (x) {
      var nom = esc(ar() && x.ar ? x.ar : x.fr), connus = [["m2", "nv", "appartement", "m2"], ["loyer", "nl", "appartement", "loyer"], ["mm2", "nmv", "maison", "m2"],
        ["ml", "nml", "maison", "loyer"], ["tm2", "ntv", "terrain", "m2"]].filter(function (k) { return x[k[0]]; });
      var h = "<b>" + nom + "</b><br>" + nb(x.t) + T(" annonces dans ce quartier", " إعلانًا في هذا الحي") + "<br><small>" +
        T("Pas encore assez d’annonces pour ce prix ici.", "لا توجد بعد إعلانات كافية لهذا السعر هنا.") + "</small>" +
        connus.map(function (k) {
          return "<br>" + T(NOM_1[k[2]][0], NOM_1[k[2]][1]) + " : <b>" + nb(x[k[0]]) + (k[3] === "m2" ? T(" DT/m²", " دينار/م²") : T(" DT/mois", " دينار/شهر")) +
            "</b> <small>(" + T("calculé sur ", "على ") + x[k[1]] + T(" annonces", " إعلانًا") + ")</small>";
        }).join("") +
        '<br><a href="' + racine + x.g + "/" + (x.page ? x.q + "/" : "") + '#liste">' + T("Voir les " + nb(x.t) + " annonces", "شاهد " + nb(x.t) + " إعلانًا") + "</a>";
      L.circleMarker(x.p, { radius: Math.max(6, Math.min(14, 4 + Math.sqrt(x.t) * 1.2)), color: "#fff", weight: 2, fillColor: "#98A2A8", fillOpacity: 0.8, className: "cp-sans-prix" })
        .bindPopup(h).bindTooltip(nom + " · " + nb(x.t) + T(" annonces", " إعلانًا")).addTo(couche);
    });
    pts.forEach(function (x) {
      var n = nombre(x), nom = esc(ar() && x.ar ? x.ar : x.fr), h, bulle;
      // nombre d'annonces dans TOUTES les bulles (Ahmed, 15/10/2026) : toutes celles du quartier, et celles qui donnent le prix
      var tot = x.t ? "<br><small>" + nb(x.t) + T(" annonces dans ce quartier (tous biens)", " إعلانًا في هذا الحي (كل العقارات)") + "</small>" : "";
      if (f) {
        var c = COULEURS[classe(x[f], b)];
        h = "<b>" + nom + "</b><br><span class=\"cp-chiffre\">" + nb(x[f]) + unite() + "</span><br><small>" +
          T("prix calculé sur ", "سعر محسوب على ") + n + T(" annonces", " إعلانًا") + " (" + nomType() + ")</small>" + tot;
        bulle = nom + " · " + nb(x[f]) + unite() + (x.t ? " · " + nb(x.t) + T(" annonces", " إعلانًا") : "");
      } else {                                   // « Tout » : un prix PAR type, côte à côte (jamais une moyenne de types différents)
        var kp = principal(x), c = COULEURS[classe(x[kp[0]], bt[kp[0]])];
        h = "<b>" + nom + "</b>" + TOUT[mode].filter(function (k) { return x[k[0]]; }).map(function (k) {
          return "<br>" + T(NOM_1[k[2]][0], NOM_1[k[2]][1]) + " : <b>" + nb(x[k[0]]) + unite() + "</b> <small>(" + T("calculé sur ", "على ") + x[k[1]] + T(" annonces", " إعلانًا") + ")</small>";
        }).join("") + tot + "<br><small>" + T("Couleur d’après : ", "اللون حسب: ") + T(NOM_1[kp[2]][0].toLowerCase(), NOM_1[kp[2]][1]) + "</small>";
        bulle = nom + (x.t ? " · " + nb(x.t) + T(" annonces", " إعلانًا") : "");
      }
      h += '<br><a href="' + racine + x.g + "/" + (x.page ? x.q + "/" : "") + '#liste">' + (x.t && x.page ? T("Voir les " + nb(x.t) + " annonces", "شاهد " + nb(x.t) + " إعلانًا") : T("Voir les annonces", "شاهد الإعلانات")) + "</a>";
      L.circleMarker(x.p, { radius: Math.max(7, Math.min(18, 5 + Math.sqrt(n) * 1.6)), color: "#fff", weight: 2, fillColor: c, fillOpacity: 0.85 })
        .bindPopup(h).bindTooltip(bulle).addTo(couche);
    });
    var lg = document.getElementById("cp-legende");
    var legGris = sansPrix.length ? '<span class="cp-leg"><i class="cp-gris"></i>' + T("annonces, prix pas encore connu", "إعلانات، السعر غير معروف بعد") + "</span>" : "";
    if (lg && !pts.length) lg.innerHTML = '<span class="cp-unite">' + T("Pas encore assez d’annonces pour ce choix.", "لا توجد بعد إعلانات كافية لهذا الاختيار.") + "</span>";
    if (lg && pts.length && !f) lg.innerHTML = COULEURS.map(function (c, i) { return '<span class="cp-leg"><i class="cp-c' + i + '"></i></span>'; }).join("") +
      '<span class="cp-unite">' + T("du moins cher au plus cher, comparé aux quartiers du même type de bien ; touchez un rond pour les prix", "من الأرخص إلى الأغلى، مقارنة بأحياء نفس نوع العقار؛ المس دائرة للأسعار") +
      '</span><span class="cp-leg"><i class="cp-g"></i>' + T("annonces du gouvernorat", "إعلانات الولاية") + "</span>" + legGris;
    if (lg && pts.length && f) {
      var v = pts.map(function (x) { return x[f]; }), lim = [Math.min.apply(null, v)].concat(b).concat([Math.max.apply(null, v)]);
      lg.innerHTML = COULEURS.map(function (c, i) {
        return '<span class="cp-leg"><i class="cp-c' + i + '"></i>' + nb(lim[i]) + "–" + nb(lim[i + 1]) + "</span>";   // classes : la CSP refuse les styles écrits dans la page
      }).join("") + '<span class="cp-unite">' + unite() + '</span><span class="cp-leg"><i class="cp-g"></i>' + T("annonces du gouvernorat", "إعلانات الولاية") + "</span>" + legGris;
    }
  }
  function cadrer() {
    var D = donnees(), g = zone.getAttribute("data-g");
    var pts = D.q.filter(function (x) { return !g || x.g === g; }).map(function (x) { return x.p; });
    if (g) D.g.forEach(function (x) { if (x.g === g) pts.push(x.p); });
    if (!g) D.g.forEach(function (x) { pts.push(x.p); });
    if (pts.length === 1) carte.setView(pts[0], 10);
    else if (pts.length) carte.fitBounds(pts, { padding: [24, 24], maxZoom: g ? 12 : 8 });
  }
  function demarrer() {
    if (!window.L || !window.CARTE_PRIX) return;
    carte = L.map(zone, { scrollWheelZoom: false, preferCanvas: true }).setView([34.2, 9.6], 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(carte);
    // page d'un gouvernorat : la carte s'ouvre sur le type de bien qui y a le plus de quartiers (Médenine / Djerba : les maisons)
    var gz = zone.getAttribute("data-g");
    if (gz && !compter(type, gz)) {
      type = ["appartement", "maison", "terrain"].sort(function (a, b) { return compter(b, gz) - compter(a, gz); })[0];
      if (type === "terrain") mode = "m2";
      boutons();
    }
    var f = zone.closest && zone.closest(".carte-vivante");
    if (f) f.classList.add("charge");          // la nouvelle carte remplace l'ancienne (gardée seulement si la carte ne charge pas)
    carte.invalidateSize();
    dessiner();
    cadrer();
  }
  // audit de sécurité (16/10/2026) : une bibliothèque venue d'un autre site est vérifiée par son empreinte officielle (SRI) :
  // si le fichier de cdnjs était modifié, le navigateur refuserait de l'exécuter
  var SRI_LEAFLET_JS = "sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==";
  var SRI_LEAFLET_CSS = "sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==";
  function charger(src, integrite) {
    return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; if (integrite) { s.integrity = integrite; s.crossOrigin = "anonymous"; } s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  }
  function lancer() {
    zone = document.getElementById("cp-carte");
    if (!zone) return;
    [].forEach.call(document.querySelectorAll(".cp-btn"), function (bt) {
      bt.addEventListener("click", function () {
        if (bt.getAttribute("data-mode")) mode = bt.getAttribute("data-mode");
        if (bt.getAttribute("data-type")) type = bt.getAttribute("data-type");
        if (type === "terrain") mode = "m2";
        boutons();
        if (carte) dessiner();
        if (window.CARTE_SUIT) { if (bt.getAttribute("data-mode")) CARTE_SUIT("mode", mode); if (bt.getAttribute("data-type")) CARTE_SUIT("type", type); }
      });
    });
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; css.integrity = SRI_LEAFLET_CSS; css.crossOrigin = "anonymous";
    document.head.appendChild(css);
    Promise.all([charger(racine + "prix/carte.js?v=" + ((document.body && (document.body.getAttribute("data-cv") || document.body.getAttribute("data-maj"))) || "")),
                 window.L ? Promise.resolve() : charger("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js", SRI_LEAFLET_JS)])
      .then(demarrer).catch(function () { /* pas de réseau : l'ancienne carte reste affichée */ });
    document.addEventListener("langue", function () { if (carte) dessiner(); });
    // la recherche et la carte vont ensemble (15/10/2026, Ahmed : « si l'un est sélectionné, l'autre doit suivre »)
    var form = document.getElementById("recherche"), lien = false;
    var TYPES_CARTE = { appartement: 1, maison: 1, terrain: 1 };
    window.CARTE_SUIT = function (quoi, v) {                 // appelé quand on touche un bouton de la carte
      if (!form || lien) return;
      lien = true;
      if (quoi === "mode") { var r = form.querySelector('input[name="t"][value="' + (v === "loyer" ? "l" : "v") + '"]'); if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); } }
      if (quoi === "type") { var y = document.getElementById("f-y");
        if (y && [].some.call(y.options, function (o) { return o.value === (v === "tout" ? "" : v); }) && y.value !== (v === "tout" ? "" : v)) {
          y.value = v === "tout" ? "" : v; y.dispatchEvent(new Event("change", { bubbles: true })); } }
      lien = false;
    };
    if (form) form.addEventListener("change", function (e) {   // la recherche change -> la carte suit
      if (lien) return;
      var t = e.target;
      if (t.name === "t" && t.value) { mode = t.value === "l" ? "loyer" : "m2"; if (type === "terrain" && mode === "loyer") type = "tout"; }
      else if (t.id === "f-y") type = TYPES_CARTE[t.value] ? t.value : "tout";
      else if (t.id === "f-g" && carte) { if (t.value) zone.setAttribute("data-g", t.value); else zone.removeAttribute("data-g"); }
      else return;
      if (type === "terrain") mode = "m2";
      boutons();
      if (carte) { dessiner(); if (t.id === "f-g") cadrer(); }
    });
    zone.addEventListener("click", function (e) {             // « Voir les maisons » dans la bulle d'un gouvernorat
      var b = e.target.closest && e.target.closest(".cp-voir-type");
      if (!b || !carte) return;
      type = b.getAttribute("data-type"); if (type === "terrain") mode = "m2";
      boutons(); carte.closePopup(); dessiner();
      var pts = donnees().q.filter(function (x) { return x.g === b.getAttribute("data-g") && x[champ()]; }).map(function (x) { return x.p; });
      if (pts.length) carte.fitBounds(pts, { padding: [30, 30], maxZoom: 11 });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lancer); else lancer();
})();
