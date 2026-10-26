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
  function nb(x) { return Math.round(x).toLocaleString("fr-FR").replace(/[\u00a0\u202f ]/g, "\u202f"); }
  // bulle des gouvernorats (17/10/2026, choix d'Ahmed) : 1 000 et plus -> « 2,9 k », « 16 k » (sur une ligne, lisible) ;
  // le nombre exact reste dans l'infobulle et la fenêtre
  function court(x) {
    x = Math.round(x);
    if (x < 1000) return String(x);
    return (x < 9950 ? (Math.round(x / 100) / 10).toFixed(1).replace(".", ",") : String(Math.round(x / 1000))) + " k";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // fiche des prix (26/10/2026) : définis ici, avant dessiner() qui les utilise
  var NOMS_P = { s1: ["Appart. S+1", "شقة S+1"], s2: ["Appart. S+2", "شقة S+2"], s3: ["Appart. S+3", "شقة S+3"], maison: ["Maison / villa", "منزل / فيلا"], terrain: ["Terrain (au m²)", "أرض (للمتر²)"] };
  var NIVEAUX_P = { g: ["Gouvernorat de ", "ولاية "], d: ["Délégation de ", "معتمدية "], q: ["Quartier : ", "الحي: "] };
  var SURVOL = !!(window.matchMedia && window.matchMedia("(hover: hover)").matches);
  function bornes(v) {                       // 5 classes de même effectif (quantiles)
    v = v.slice().sort(function (a, b) { return a - b; });
    return [0.2, 0.4, 0.6, 0.8].map(function (f) { return v[Math.min(v.length - 1, Math.floor(v.length * f))]; });
  }
  function classe(x, b) { var i = 0; while (i < b.length && x > b[i]) i++; return i; }
  function legBleu() { return [T("annonces du gouvernorat (zoomez : délégations, puis quartiers)", "إعلانات الولاية (قرّب: المعتمديات ثم الأحياء)"),
    T("annonces de la délégation (zoomez : quartiers)", "إعلانات المعتمدية (قرّب: الأحياء)"), T("nombre d’annonces du quartier, couleur = prix", "عدد إعلانات الحي، اللون = السعر")][niveau() - 1]; }
  function unite() { return mode === "m2" ? T("\u00a0DT/m²", "\u00a0دينار/م²") : T("\u00a0DT/mois", "\u00a0دينار/شهر"); }
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
  function donnees() { var D = window.CARTE_PRIX || {}; return { q: D.q || (Array.isArray(D) ? D : []), g: D.g || [], d: D.d || [] }; }
  var NIV_DELEG = 9, NIV_QUARTIER = 12;     // zoom à partir duquel on voit les délégations, puis les quartiers
  function niveau() { var z = carte ? carte.getZoom() : 0; return z >= NIV_QUARTIER ? 3 : z >= NIV_DELEG && donnees().d.length ? 2 : 1; }

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
    // TROIS NIVEAUX selon le zoom (17/10/2026, demande d'Ahmed) : toute la carte -> bulles des GOUVERNORATS ; on zoome -> bulles des
    // DÉLÉGATIONS ; on zoome encore -> bulles des QUARTIERS (nombre d'annonces, couleur = prix)
    var niv = niveau(), avecDeleg = {};
    if (niv === 2) D.d.forEach(function (x) { avecDeleg[x.g] = 1; });
    if (niv === 2) D.d.forEach(function (x) {
      var nom = esc(ar() && x.ar ? x.ar : x.fr), lien = racine + x.g + "/?d=" + encodeURIComponent(x.s) + "#liste";
      if (!x.n) {
        L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv cp-deleg cp-vide", html: "<span>+</span>", iconSize: [28, 28] }), title: nom + T(" : soyez le premier à publier ici", ": كن أول من ينشر هنا") })
          .bindPopup("<b>" + T("Délégation ", "معتمدية ") + nom + "</b><br>" + T("Aucune annonce pour l’instant.", "لا يوجد إعلان حاليًا.") + '<br><a class="cp-publier" href="' + racine + "deposer/?g=" + encodeURIComponent(x.g) + '">' +
                     T("➕ Soyez le premier à publier ici (gratuit)", "➕ كن أول من ينشر هنا (مجانًا)") + "</a>").addTo(couche);
        return;
      }
      lier(L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv cp-deleg", html: "<span>" + court(x.n) + "</span>", iconSize: [34, 34] }), zIndexOffset: -500 }),
           "<b>" + T("Délégation ", "معتمدية ") + nom + "</b><br>" + nb(x.n) + T(" annonces", " إعلانًا") + "<br><small>" + T("Zoomez pour voir les quartiers.", "قرّب لرؤية الأحياء.") + "</small>" +
                   '<br><a href="' + lien + '">' + T("Voir les " + nb(x.n) + " annonces", "شاهد " + nb(x.n) + " إعلانًا") + "</a>", fichePrix(x, "d", nom, nom + " · " + nb(x.n) + T(" annonces", " إعلانًا"))).addTo(couche);
    });
    // 18/10/2026 (Ahmed : « je zoome sur Ajim, ses 5 annonces disparaissent ») : au zoom des QUARTIERS, une délégation dont des annonces
    // ne sont dans aucune bulle de quartier (quartier sans position) garde une bulle avec ce reste (x.r) : aucune annonce ne disparaît
    if (niv === 3) D.d.forEach(function (x) {
      if (!x.r) return;
      var nom = esc(ar() && x.ar ? x.ar : x.fr), lien = racine + x.g + "/?d=" + encodeURIComponent(x.s) + "#liste";
      L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv cp-deleg cp-reste", html: "<span>" + court(x.r) + "</span>", iconSize: [34, 34] }), zIndexOffset: -600,
                      title: nom + " · " + nb(x.r) + T(" annonces", " إعلانًا") })
        .bindPopup("<b>" + T("Délégation ", "معتمدية ") + nom + "</b><br>" + nb(x.r) + T(" annonces sans quartier précis sur la carte", " إعلانًا دون حي محدد على الخريطة") +
                   '<br><a href="' + lien + '">' + T("Voir les " + nb(x.n) + " annonces de la délégation", "شاهد " + nb(x.n) + " إعلانًا في المعتمدية") + "</a>").addTo(couche);
    });
    // annonces du gouvernorat dans aucune bulle de délégation (lieu vague) : une bulle « reste » au centre du gouvernorat, aux zooms 2 et 3
    if (niv >= 2) D.g.forEach(function (x) {
      var r = niv === 3 ? x.r3 : x.r;
      if (!r || (niv === 2 && !avecDeleg[x.g])) return;     // niveau 2 sans délégations : la bulle normale du gouvernorat reste
      var nom = esc(ar() ? x.ar : x.fr);
      L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv cp-reste", html: "<span>" + court(r) + "</span>", iconSize: [34, 34] }), zIndexOffset: -700,
                      title: nom + " · " + nb(r) + T(" annonces", " إعلانًا") })
        .bindPopup("<b>" + nom + "</b><br>" + nb(r) + T(" annonces sans délégation précise", " إعلانًا دون معتمدية محددة") +
                   '<br><a href="' + racine + x.g + '/#liste">' + T("Voir les " + nb(x.n) + " annonces du gouvernorat", "شاهد " + nb(x.n) + " إعلانًا في الولاية") + "</a>").addTo(couche);
    });
    // fiche des prix dans la bulle d'un GOUVERNORAT, d'une DÉLÉGATION ou d'un QUARTIER (26/10/2026, idée d'Ahmed : « 3 niveaux, et dire de quel
    // niveau est le prix ; le tableau n'apparaît que si le visiteur passe la souris dessus ») : mêmes chiffres que la page du gouvernorat (#prix).
    // Sur ordinateur (souris) le tableau est dans l'infobulle de survol ; sur téléphone (pas de survol) il est dans la bulle touchée.
    function lignesPrix(x) {
      return x.tp.map(function (l) {
        var u = l[0] === "terrain" ? T("\u00a0DT/m²", "\u00a0د.ت/م²") : T("\u00a0DT", "\u00a0د.ت");
        return [NOMS_P[l[0]][ar() ? 1 : 0], nb(l[2]) + " – " + nb(l[4]) + u];
      });
    }
    function tableauPrix(x, niveau, nom) {
      var lignes = lignesPrix(x).map(function (r) { return "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>"; }).join("");
      return '<table class="cp-prix"><caption><b>' + T(NIVEAUX_P[niveau][0], NIVEAUX_P[niveau][1]) + nom + "</b><br>" +
        T("À vendre : la moitié des annonces est dans cette fourchette", "للبيع: نصف الإعلانات ضمن هذا المجال") + "</caption>" + lignes + "</table>";
    }
    // pied de la bulle : lien vers la page du niveau + « Partager ces prix » (le texte partagé reprend les chiffres)
    function piedPrix(x, niveau, nom) {
      var lien = niveau === "g" ? x.g + "/#prix" : niveau === "d" ? x.g + "/?d=" + encodeURIComponent(x.s) + "#liste" : x.g + "/" + (x.page ? x.q + "/" : "") + "#liste";
      var titre = T("Prix de l’immobilier : ", "أسعار العقارات: ") + T(NIVEAUX_P[niveau][0], NIVEAUX_P[niveau][1]) + nom;
      var texte = lignesPrix(x).map(function (r) { return r[0] + " : " + r[1]; }).join("\n") + "\n" + T("(Immobilier Tunisie) : ", "(عقارات تونس): ");
      return '<br><a href="' + racine + lien + '">' + (niveau === "g" ? T("Tous les prix (vente et location)", "كل الأسعار (بيع وكراء)") : T("Voir les annonces", "شاهد الإعلانات")) + "</a>" +
        ' · <button type="button" class="cp-partager" data-partage-rapport="' + esc("https://immobilier.clicvia.com/" + lien) + '" data-titre="' + esc(titre) + '" data-texte="' + esc(texte) + '">' + T("Partager ces prix", "شارك هذه الأسعار") + "</button>";
    }
    // à ajouter à une bulle : [html de la bulle, html de l'infobulle de survol (ou null)]
    function fichePrix(x, niveau, nom, infobulle) {
      if (!x.tp || x.tp.length < 2) return ["", infobulle || null];
      var t = tableauPrix(x, niveau, nom);
      return SURVOL ? [piedPrix(x, niveau, nom), (infobulle ? "<b>" + infobulle + "</b><br>" : "") + t] : [t + piedPrix(x, niveau, nom), infobulle || null];
    }
    function lier(m, h, fp) {
      m.bindPopup(h + fp[0]);
      if (SURVOL && fp[1] && fp[0]) m.bindTooltip(fp[1], { className: "cp-info", direction: "top" });   // le tableau n'apparaît qu'au survol (ordinateur)
      else if (fp[1] && !fp[0] && m.options) m.options.title = fp[1].replace(/<[^>]+>/g, "");                       // sans tableau : seulement le nom et le nombre
      return m;
    }
  // gouvernorats sans quartier avec un prix : un cercle avec leur nombre d'annonces
    D.g.forEach(function (x) {
      if (niv === 3 || (niv === 2 && avecDeleg[x.g])) return;     // remplacées par les délégations, puis par les quartiers
      var nom = esc(ar() ? x.ar : x.fr);
      // 17/10/2026 (Ahmed) : CHAQUE gouvernorat garde sa bulle bleu foncé avec son nombre TOTAL d'annonces, même quand ses
      // quartiers ont des prix (les ronds de prix restent dessus)
      if (avecPrix[x.g] && x.n) {
        lier(L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv", html: "<span>" + court(x.n) + "</span>", iconSize: [38, 38] }), zIndexOffset: -500 }),
             "<b>" + nom + "</b><br>" + nb(x.n) + T(" annonces au total", " إعلانًا في المجموع") + "<br><small>" + T("Zoomez pour voir les délégations.", "قرّب لرؤية المعتمديات.") + "</small>" + '<br><a href="' + racine + x.g + '/#liste">' +
                     T("Voir les " + nb(x.n) + " annonces", "شاهد " + nb(x.n) + " إعلانًا") + "</a>", fichePrix(x, "g", nom, nom + " · " + nb(x.n) + T(" annonces", " إعلانًا"))).addTo(couche);
        return;
      }
      if (!x.n) {                                // 17/10/2026 (Ahmed) : un gouvernorat VIDE invite à publier, au lieu de rester vide
        L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv cp-vide", html: "<span>+</span>", iconSize: [34, 34] }), title: nom + T(" : soyez le premier à publier ici", ": كن أول من ينشر هنا") })
          .bindPopup("<b>" + nom + "</b><br>" + T("Aucune annonce pour l’instant.", "لا يوجد إعلان حاليًا.") + '<br><a class="cp-publier" href="' + racine + "deposer/?g=" + encodeURIComponent(x.g) + '">' +
                     T("➕ Soyez le premier à publier ici (gratuit)", "➕ كن أول من ينشر هنا (مجانًا)") + "</a>").addTo(couche);
        return;
      }
      // d'autres types de biens ont des prix ici (Djerba : des maisons, 15/10/2026) : un bouton pour les voir
      var autres = (type === "tout" ? [] : ["appartement", "maison", "terrain"]).filter(function (t) { return t !== type && compter(t, x.g); }).map(function (t) {
        return '<br><button type="button" class="cp-voir-type" data-type="' + t + '" data-g="' + x.g + '">' + T("Voir ", "شاهد ") + NOMS_T[t][ar() ? 1 : 0] +
          " (" + compter(t, x.g) + (compter(t, x.g) === 1 ? T(" quartier)", " حي)") : T(" quartiers)", " أحياء)")) + "</button>";
      }).join("");
      L.marker(x.p, { icon: L.divIcon({ className: "cp-gouv", html: "<span>" + court(x.n) + "</span>", iconSize: [38, 38] }), title: nom + " · " + nb(x.n) + T(" annonces", " إعلانًا") })
        .bindPopup("<b>" + nom + "</b><br>" + nb(x.n) + T(" annonces", " إعلانًا") + "<br><small>" + T("Pas encore assez de prix pour ", "لا توجد بعد أسعار كافية لـ") + NOMS_T[type][ar() ? 1 : 0] +
                   ".</small>" + autres + '<br><a href="' + racine + x.g + '/#liste">' + T("Voir les " + nb(x.n) + " annonces", "شاهد " + nb(x.n) + " إعلانًا") + "</a>").addTo(couche);
    });
    // quartiers qui ont des annonces mais pas encore de prix pour CE choix (15/10/2026, Ahmed : « la bulle d'Ariana Essoghra
    // n'apparaît pas » : 47 annonces, un loyer, mais pas encore de prix de vente au m²) -> bulle GRISE avec le nombre d'annonces,
    // ce qui est connu (loyer…) et le lien ; jamais de couleur de prix inventée
    // niveau des délégations : les ronds des quartiers attendent qu'on zoome (sinon Tunis est illisible : 18 délégations + 60 quartiers)
    var sansPrix = niv === 2 ? [] : D.q.filter(function (x) { return x.t && x.p && !aUnPrix(x); });
    sansPrix.forEach(function (x) {
      var nom = esc(ar() && x.ar ? x.ar : x.fr), connus = [["m2", "nv", "appartement", "m2"], ["loyer", "nl", "appartement", "loyer"], ["mm2", "nmv", "maison", "m2"],
        ["ml", "nml", "maison", "loyer"], ["tm2", "ntv", "terrain", "m2"]].filter(function (k) { return x[k[0]]; });
      var h = "<b>" + nom + "</b><br>" + nb(x.t) + T(" annonces dans ce quartier", " إعلانًا في هذا الحي") + "<br><small>" +
        T("Pas encore assez d’annonces pour ce prix ici.", "لا توجد بعد إعلانات كافية لهذا السعر هنا.") + "</small>" +
        connus.map(function (k) {
          return "<br>" + T(NOM_1[k[2]][0], NOM_1[k[2]][1]) + " : <b>" + nb(x[k[0]]) + (k[3] === "m2" ? T("\u00a0DT/m²", "\u00a0دينار/م²") : T("\u00a0DT/mois", "\u00a0دينار/شهر")) +
            "</b> <small>(" + T("calculé sur ", "على ") + x[k[1]] + T(" annonces", " إعلانًا") + ")</small>";
        }).join("") +
        '<br><a href="' + racine + x.g + "/" + (x.page ? x.q + "/" : "") + '#liste">' + T("Voir les " + nb(x.t) + " annonces", "شاهد " + nb(x.t) + " إعلانًا") + "</a>";
      (niv === 3 ? L.marker(x.p, { icon: L.divIcon({ className: "cp-q cp-qgris", html: "<span>" + court(x.t) + "</span>", iconSize: [30, 30] }) })
        : L.circleMarker(x.p, { radius: Math.max(6, Math.min(14, 4 + Math.sqrt(x.t) * 1.2)), color: "#fff", weight: 2, fillColor: "#98A2A8", fillOpacity: 0.8, className: "cp-sans-prix" }))
        .bindPopup(h).bindTooltip(nom + " · " + nb(x.t) + T(" annonces", " إعلانًا")).addTo(couche);
    });
    (niv === 2 ? [] : pts).forEach(function (x) {
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
      var fq = fichePrix(x, "q", nom, bulle);
      // niveau 3 : bulle du QUARTIER avec son nombre d'annonces, couleur = son prix (classes : la CSP refuse les styles dans la page)
      (niv === 3 ? L.marker(x.p, { icon: L.divIcon({ className: "cp-q cp-qc" + COULEURS.indexOf(c), html: "<span>" + court(x.t || n) + "</span>", iconSize: [30, 30] }) })
        : L.circleMarker(x.p, { radius: Math.max(7, Math.min(18, 5 + Math.sqrt(n) * 1.6)), color: "#fff", weight: 2, fillColor: c, fillOpacity: 0.85 }))
        .bindPopup(h + fq[0]).bindTooltip(fq[1] && fq[0] && SURVOL ? fq[1] : bulle, fq[0] && SURVOL ? { className: "cp-info", direction: "top" } : undefined).addTo(couche);
    });
    var lg = document.getElementById("cp-legende");
    if (lg && niv === 2) { lg.innerHTML = '<span class="cp-leg"><i class="cp-g"></i>' + legBleu() + '</span><span class="cp-unite">' +
      T("zoomez sur une délégation pour voir les prix de ses quartiers", "قرّب على معتمدية لرؤية أسعار أحيائها") + "</span>"; return; }
    var legGris = sansPrix.length ? '<span class="cp-leg"><i class="cp-gris"></i>' + T("annonces, prix pas encore connu", "إعلانات، السعر غير معروف بعد") + "</span>" : "";
    if (lg && !pts.length) lg.innerHTML = '<span class="cp-unite">' + T("Pas encore assez d’annonces pour ce choix.", "لا توجد بعد إعلانات كافية لهذا الاختيار.") + "</span>";
    if (lg && pts.length && !f) lg.innerHTML = COULEURS.map(function (c, i) { return '<span class="cp-leg"><i class="cp-c' + i + '"></i></span>'; }).join("") +
      '<span class="cp-unite">' + T("du moins cher au plus cher, comparé aux quartiers du même type de bien ; touchez un rond pour les prix", "من الأرخص إلى الأغلى، مقارنة بأحياء نفس نوع العقار؛ المس دائرة للأسعار") +
      '</span><span class="cp-leg"><i class="cp-g"></i>' + legBleu() + "</span>" + legGris;
    if (lg && pts.length && f) {
      var v = pts.map(function (x) { return x[f]; }), lim = [Math.min.apply(null, v)].concat(b).concat([Math.max.apply(null, v)]);
      lg.innerHTML = COULEURS.map(function (c, i) {
        return '<span class="cp-leg"><i class="cp-c' + i + '"></i>' + nb(lim[i]) + "–" + nb(lim[i + 1]) + "</span>";   // classes : la CSP refuse les styles écrits dans la page
      }).join("") + '<span class="cp-unite">' + unite() + '</span><span class="cp-leg"><i class="cp-g"></i>' + legBleu() + "</span>" + legGris;
    }
    entourer();
  }
  // 18/10/2026 (Ahmed : « quand gouvernorat, délégation et quartier sont choisis dans le filtre, ils doivent l'être aussi sur la carte :
  // c'est une bonne manière de vérifier que tout est bon ») : la carte va sur la délégation / le quartier choisi et l'entoure
  function slugC(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function choixFiltre() {                   // délégation et localité choisies dans la recherche (vide si rien)
    var f = document.getElementById("recherche"), sd = f && f.querySelector('[name="d"]'), sl = f && f.querySelector('[name="l"]');
    return { d: sd && !sd.disabled ? sd.value : "", l: sl && !sl.disabled ? sl.value : "" };
  }
  function delegsChoisies(g, dv) {           // la délégation choisie, ou les 3 de « Djerba – toute l'île » (LIEUX.grp)
    var LX = window.LIEUX || {}, OF = LX.o || {}, GRP = LX.grp || {}, S = {};
    S[dv] = 1;
    Object.keys(GRP).forEach(function (k) { if (k.split("/")[0] === g && OF[k] && slugC(OF[k][0]) === dv) (GRP[k].d || []).forEach(function (x) { S[slugC(x)] = 1; }); });
    return S;
  }
  var choisis = [];                          // points entourés sur la carte : [[lat, lon], nom]
  function lieuChoisi(D, g) {
    var c = choixFiltre(), OF = (window.LIEUX || {}).o || {};
    if (!g || (!c.d && !c.l)) return null;
    if (c.l) {                               // un quartier (nos bulles) ou une localité officielle rattachée à un de nos quartiers
      var q = D.q.filter(function (x) { return x.g === g && (x.q === c.l || (OF[g + "/" + x.q] && slugC(OF[g + "/" + x.q][1]) === c.l)); });
      if (q.length) return { pts: q.map(function (x) { return [x.p, x.fr]; }), qq: q.map(function (x) { return x.p; }), zoom: NIV_QUARTIER + 1 };
    }
    if (!c.d) return null;
    var S = delegsChoisies(g, c.d);
    var dd = D.d.filter(function (x) { return x.g === g && S[x.s]; }).map(function (x) { return [x.p, x.fr]; });
    var qq = D.q.filter(function (x) { return x.g === g && OF[g + "/" + x.q] && S[slugC(OF[g + "/" + x.q][0])]; }).map(function (x) { return [x.p, x.fr]; });
    var dr = D.d.filter(function (x) { return x.g === g && S[x.s] && x.r; }).map(function (x) { return x.p; });   // bulles « reste » (niveau 3)
    return dd.length || qq.length ? { pts: dd.length ? dd : qq, cadre: dd.concat(qq), dd: dd.map(function (x) { return x[0]; }), qq: qq.map(function (x) { return x[0]; }).concat(dr), zoom: NIV_DELEG + 1 } : null;
  }
  // 18/10/2026 (Ahmed : « ces cercles ne servent à rien » : un anneau vide, sans bulle dedans) : l'anneau entoure seulement une bulle
  // VISIBLE au zoom actuel : bulles des délégations au niveau 2, bulles des quartiers (de la délégation choisie) au niveau 3
  var anneaux = { dd: [], qq: [] };
  function entourer() {
    var n = niveau(), pts = n === 2 ? anneaux.dd : n === 3 ? anneaux.qq : [];
    pts.forEach(function (p) {
      L.circleMarker(p, { radius: 24, color: "#B5532F", weight: 4, fill: false, interactive: false, className: "cp-choisi" }).addTo(couche);
    });
  }
  function cadrer() {
    var fg = document.getElementById("f-g");   // gouvernorat choisi dans la recherche (lien ?g=…, case « Où ? »)
    var D = donnees(), g = zone.getAttribute("data-g") || (fg && fg.value) || null, q = zone.getAttribute("data-q");
    var ch = lieuChoisi(D, g);
    choisis = ch ? ch.pts : [];
    anneaux = { dd: (ch && ch.dd) || [], qq: (ch && ch.qq) || [] };
    zone.setAttribute("data-choisi", choisis.map(function (x) { return x[1]; }).join(" | "));
    if (ch) {
      var tous = (ch.cadre || ch.pts).map(function (x) { return x[0]; });
      if (tous.length === 1) carte.setView(tous[0], ch.zoom);
      else {   // centre et zoom calculés d'un coup (avant : fitBounds animé puis setZoom sur l'ancien centre -> carte au milieu de la Tunisie)
        var bz = L.latLngBounds(tous);
        carte.setView(bz.getCenter(), Math.max(NIV_DELEG, Math.min(ch.zoom + 1, carte.getBoundsZoom(bz, false, L.point(30, 30)))), { animate: false });
      }
      return;
    }
    // page d'un QUARTIER (17/10/2026, Ahmed : « c'est une ancienne version qui est affichée ») : la carte s'ouvre sur le quartier,
    // au niveau des bulles des quartiers ; sinon (quartier pas encore placé) sur son gouvernorat
    var ici = q && D.q.filter(function (x) { return x.g === g && x.q === q; })[0];
    if (ici) { carte.setView(ici.p, NIV_QUARTIER + 1); return; }
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
    // petite carte sans boutons (18/10/2026) : elle part de l'état de la recherche (lien ?t=l&y=maison…)
    var fs = document.getElementById("recherche");
    if (fs && !document.querySelector(".cp-btn[data-mode]")) {
      var rc0 = fs.querySelector('input[name="t"]:checked'), y0 = document.getElementById("f-y");
      if (rc0 && rc0.value === "l") mode = "loyer";
      if (y0 && { appartement: 1, maison: 1, terrain: 1 }[y0.value]) type = y0.value;
      if (type === "terrain") mode = "m2";
    }
    carte.invalidateSize();
    cadrer();                                  // cadrer AVANT de dessiner : le niveau (gouvernorats, délégations, quartiers) dépend du zoom
    // 18/10/2026 (capture d'Ahmed : la carte montrait l'Italie) : la taille de la carte change après son ouverture (recherche, polices
    // qui arrivent) -> Leaflet recalcule sa taille ; tant que le visiteur n'a pas bougé la carte, elle est recadrée sur la Tunisie
    var touchee = false;
    carte.on("dragstart zoomstart", function (e) { if (e && e.hard !== true && !cadrage) touchee = true; });
    var cadrage = false, dernier = [zone.clientWidth, zone.clientHeight];
    var recadrer = function () {
      if (zone.clientWidth === dernier[0] && zone.clientHeight === dernier[1]) return;
      dernier = [zone.clientWidth, zone.clientHeight];
      carte.invalidateSize();
      if (!touchee) { cadrage = true; cadrer(); cadrage = false; }
    };
    if (window.ResizeObserver) new ResizeObserver(recadrer).observe(zone); else window.addEventListener("resize", recadrer);
    dessiner();
    zoneDemarrer();
    var dernierNiv = niveau();
    carte.on("zoomend", function () { if (niveau() !== dernierNiv) { dernierNiv = niveau(); dessiner(); } });
  }
  // DESSINER MA ZONE (25/10/2026, Ahmed) : le visiteur trace un contour au doigt ou à la souris ; la liste ne garde que les annonces
  // dedans (filtre dans passe() d'app.js : liste, nombres des menus et ligne sous la carte = même calcul). Zone gardée dans l'adresse (?z=).
  var zoneCouche = null, trace = null;
  function zoneMontrer(z) {
    if (zoneCouche) { zoneCouche.remove(); zoneCouche = null; }
    if (z) zoneCouche = L.polygon(z, { color: "#B5532F", weight: 3, fillColor: "#B5532F", fillOpacity: 0.08, interactive: false, className: "cp-zone" }).addTo(carte);
    var ef = document.getElementById("cp-zone-effacer"); if (ef) ef.hidden = !z;
  }
  function zoneChoisie(z) {                  // nouvelle zone (ou null) : la liste se refait (app.js écoute « zone-carte »)
    window.ZONE_CARTE = z;
    zoneMontrer(z);
    document.dispatchEvent(new Event("zone-carte"));
  }
  function simplifier(pts) {                 // au plus 40 points, arrondis à 3 décimales (environ 100 m), sans doublons
    var pas = Math.max(1, Math.ceil(pts.length / 40)), out = [];
    pts.forEach(function (p, i) {
      if (i % pas) return;
      var q = [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000], d = out[out.length - 1];
      if (!d || d[0] !== q[0] || d[1] !== q[1]) out.push(q);
    });
    return out;
  }
  function modeDessin(oui) {
    var f = zone.closest && zone.closest(".carte-vivante"), bt = document.getElementById("cp-zone-dessiner");
    if (f) f.classList.toggle("cp-dessin", oui);
    if (bt) bt.setAttribute("aria-pressed", oui ? "true" : "false");
    ["dragging", "touchZoom", "doubleClickZoom", "boxZoom"].forEach(function (k) { if (carte[k]) carte[k][oui ? "disable" : "enable"](); });
    if (!oui && trace) { trace.remove(); trace = null; }
  }
  function zoneDemarrer() {
    var bt = document.getElementById("cp-zone-dessiner"), ef = document.getElementById("cp-zone-effacer");
    if (!bt || !window.ZONE_IMMO) return;
    var z0 = window.ZONE_IMMO.lire(new URLSearchParams(location.search).get("z"));
    window.ZONE_CARTE = z0;                  // null : pas de zone (avant : undefined = carte pas encore chargée)
    if (z0) { zoneMontrer(z0); if (carte.fitBounds) carte.fitBounds(z0, { padding: [20, 20] }); document.dispatchEvent(new Event("zone-carte")); }
    var pts = null;
    function point(e) { var ll = carte.mouseEventToLatLng(e); return [ll.lat, ll.lng]; }
    bt.addEventListener("click", function () { modeDessin(bt.getAttribute("aria-pressed") !== "true"); });
    if (ef) ef.addEventListener("click", function () { modeDessin(false); zoneChoisie(null); });
    zone.addEventListener("pointerdown", function (e) {
      if (bt.getAttribute("aria-pressed") !== "true") return;
      e.preventDefault(); e.stopPropagation();
      try { zone.setPointerCapture(e.pointerId); } catch (x) { /* ancien navigateur */ }
      pts = [point(e)];
      if (trace) trace.remove();
      trace = L.polyline(pts, { color: "#B5532F", weight: 3, interactive: false }).addTo(carte);
    }, true);
    zone.addEventListener("pointermove", function (e) {
      if (!pts) return;
      e.preventDefault(); e.stopPropagation();
      var p = point(e), d = pts[pts.length - 1], a = carte.latLngToContainerPoint(d), b = carte.latLngToContainerPoint(p);
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 6) return;     // un point tous les 6 pixels environ
      pts.push(p); trace.addLatLng(p);
    }, true);
    var finie = 0;
    zone.addEventListener("click", function (e) { if (Date.now() - finie < 500) { e.preventDefault(); e.stopPropagation(); } }, true);   // pas de bulle ouverte par le tracé
    function fin(e) {
      if (!pts) return;
      e.stopPropagation(); finie = Date.now();
      var z = simplifier(pts); pts = null;
      modeDessin(false);
      if (z.length >= 3) zoneChoisie(z);
    }
    zone.addEventListener("pointerup", fin, true);
    zone.addEventListener("pointercancel", fin, true);
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
      // onglet Acheter / Louer (un 2e toucher le désélectionne : alors achat, comme au départ)
      if (t.name === "t") { var rc = form.querySelector('input[name="t"]:checked'); mode = rc && rc.value === "l" ? "loyer" : "m2"; if (type === "terrain" && mode === "loyer") type = "tout"; }
      else if (t.id === "f-y") type = TYPES_CARTE[t.value] ? t.value : "tout";
      else if (t.id === "f-g" && carte) { if (t.value) zone.setAttribute("data-g", t.value); else zone.removeAttribute("data-g"); }
      else if (t.name !== "d" && t.name !== "l") return;
      if (type === "terrain") mode = "m2";
      boutons();
      // délégation / localité : la carte y va et l'entoure (après la mise à jour des listes par app.js)
      // setTimeout : app.js remet d'abord à jour les listes (une nouvelle délégation vide la localité)
      if (carte) { if (t.id === "f-g" || t.name === "d" || t.name === "l") setTimeout(function () { cadrer(); dessiner(); }, 0); else dessiner(); }
    });
    // un lieu choisi dans la case « Où ? » (gouvernorat + délégation + localité remplis d'un coup) : la carte y va et l'entoure
    if (form) form.addEventListener("lieu-choisi", function () {
      if (!carte) return;
      var fg = document.getElementById("f-g");
      if (fg && fg.value) zone.setAttribute("data-g", fg.value); else zone.removeAttribute("data-g");
      cadrer(); dessiner();
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
