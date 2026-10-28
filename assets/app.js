/* Immobilier Tunisie — recherche et liste des annonces (accueil, pages de gouvernorat et de lieu).
   Données : donnees/annonces.js (window.ANNONCES) + donnees/lieux.js (window.LIEUX), écrits chaque semaine (le lundi) par le robot.
   Les cartes ont la même forme que celles écrites dans la page par robot/construire_site.py. */
(function () {
  var PAS = 24;
  var ICO_PART = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  var ICO = {
    lieu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    surface: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5"/></svg>',
    chambres: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18v-6.5A2.5 2.5 0 0 1 5.5 9h13a2.5 2.5 0 0 1 2.5 2.5V18M3 15h18M3 18v2M21 18v2M6.5 9V6.5h4.5V9"/></svg>',
    date: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
    lien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h2.7l1.4 4.1-2 1.4a12 12 0 0 0 6.3 6.3l1.4-2 4.1 1.4v2.7a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg>'
  };
  // types de biens (donnees/lieux.js, LIEUX.t : libellé FR, AR, vignette — fabriqués par robot/construire_site.py depuis commun.TYPES)
  var TY = (window.LIEUX && window.LIEUX.t) || {}, TGROUPES = (window.LIEUX && window.LIEUX.tg) || {};
  var VIGNETTE = {}, TYPE_FR = {}, TYPE_AR = {};
  Object.keys(TY).forEach(function (k) { TYPE_FR[k] = k === "autre" ? "Bien immobilier" : TY[k][0]; TYPE_AR[k] = k === "autre" ? "عقار" : TY[k][1]; VIGNETTE[k] = TY[k][2]; });
  function typeVoulu(a, y) { return a.y === y || (TGROUPES[y] || []).indexOf(a.y) >= 0; }   // « pro », « local » : plusieurs types

  function E(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  // audit de sécurité (16/10/2026) : un lien d'annonce n'est jamais « javascript: » ni autre chose que http(s) (3e barrière, après le robot et la CSP)
  function U(u) { u = String(u == null ? "" : u).trim(); return /^https?:\/\//i.test(u) ? E(u) : "#"; }
  function L(fr, ar) { return '<span data-l="fr">' + fr + '</span><span data-l="ar">' + ar + '</span>'; }
  function iso(t) { return "⁦" + t + "⁩"; }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function dfr(d) { return d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : ""; }

  // Avis du modèle d'IA (robot/modele_ia.py, champ « ia » = [estimation, n|b|h]) : même texte que avis_ia_html() du robot
  var ICO_IA = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 10.5h5v3h-5z"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>';
  // Avis EXPLIQUÉ (15/10/2026, remarque d'Ahmed) : référence = annonces semblables du même quartier (vérifiables), puis l'estimation
  // du modèle d'IA ; « Pourquoi ? » dans la carte : annonces comparées, ce qui est pris en compte et ce qui ne l'est pas.
  // Même texte que avis_ia_html() de robot/construire_site.py. a.ia = {v, p, r, z, n, lo, hi, c, e, s, d, dl, m2, x, st}.
  var PAR_ID = null;
  function annonceParId(id) {
    if (!PAR_ID) { PAR_ID = {}; ((window.ANNONCES && window.ANNONCES.a) || []).forEach(function (x) { PAR_ID[x.i] = x; }); }
    return PAR_ID[id];
  }
  // ce que l'IA a pris en compte (15/10/2026 : atouts lus dans le texte, position exacte) : même texte que pris_en_compte() du robot
  var ATOUTS_NOMS = {piscine: ["Piscine", "مسبح"], jardin: ["Jardin", "حديقة"], mer: ["Vue mer / près de la plage", "إطلالة على البحر / قرب الشاطئ"],
    meuble: ["Meublé", "مفروش"], neuf: ["Neuf / haut standing", "جديد / راقٍ"], garage: ["Garage / parking", "مرآب / موقف"], ascenseur: ["Ascenseur", "مصعد"], terrasse: ["Terrasse", "تراس"]};
  function prisEnCompte(x) {
    var at = x.a === undefined ? null : x.a, k = (at || []).filter(function (n) { return ATOUTS_NOMS[n]; });
    var lus = k.map(function (n) { return ATOUTS_NOMS[n][0].toLowerCase(); }).join(", "), lusAr = k.map(function (n) { return ATOUTS_NOMS[n][1]; }).join("، ");
    var fr = "Pris en compte : type de bien, lieu" + (x.gp ? ", position exacte sur la carte" : "") + ", nombre de pièces" + (x.s ? ", surface" : "") +
      (lus ? ", atouts lus dans l’annonce (" + lus + ")" : (at !== null ? ", texte de l’annonce (aucun atout particulier cité)" : "")) +
      ". <b>Non pris en compte</b> : " + (x.s ? "" : "surface (non indiquée), ") + (at !== null ? "" : "atouts (texte non lu), ") + "état réel et finitions — vérifiez-les lors de la visite.";
    var a = "أُخذ بالاعتبار: نوع العقار، المكان" + (x.gp ? "، الموقع الدقيق على الخريطة" : "") + "، عدد الغرف" + (x.s ? "، المساحة" : "") +
      (lusAr ? "، المزايا المذكورة في الإعلان (" + lusAr + ")" : (at !== null ? "، نص الإعلان (دون مزايا خاصة)" : "")) +
      ". <b>لم يُؤخذ بالاعتبار</b>: " + (x.s ? "" : "المساحة (غير مذكورة)، ") + (at !== null ? "" : "المزايا (النص غير مقروء)، ") + "الحالة الحقيقية والتشطيبات — تحقّق منها عند الزيارة.";
    return "<p>" + L(fr, a) + "</p>";
  }
  function avisIA(a, loc, racine) {
    var x = a.ia, LX = window.LIEUX || { g: {}, l: {} }, dt = function (v) { return L(nb(v) + "\u00a0DT", iso(nb(v)) + "\u00a0دينار"); };
    var li = a.l && LX.l[a.g + "/" + a.l], g = LX.g[a.g] || [a.g, a.g];
    // jamais tout le gouvernorat (règle d'Ahmed, 15/10/2026) : même quartier, ou même délégation officielle (x.dl = [FR, AR])
    var ou = x.pr ? L(" à moins de 1,5 km", " على أقل من 1,5 كم") : x.z === "q" ? L(" à " + E(li ? li[0] : (a.n || g[0])), " في " + (li ? li[1] : g[1])) : L(" dans la délégation de " + E((x.dl || [""])[0]), " في معتمدية " + E((x.dl || ["", ""])[1] || (x.dl || [""])[0]));
    // comparaison AU M² quand la surface est connue (15/10/2026) : x.m2 = [ce bien, médiane, bas, haut] en DT/m²
    var m2 = x.m2, m2t = function (v) { return v < 100 ? String(v).replace(".", ",") : nb(v); },
      dm2 = function (v) { return L(m2t(v) + "\u00a0DT/m²", iso(m2t(v)) + "\u00a0دينار/م²"); };
    // sorte du logement (duplex, villas…) : comparé seulement à la même sorte (15/10/2026)
    var SORTES = { etage_villa: ["étages de villa", "طوابق فيلا"], duplex: ["duplex", "دوبلكس"], penthouse: ["penthouses", "بنتهاوس"], studio: ["studios", "ستوديوهات"], villa: ["villas", "فيلات"], maison_trad: ["maisons traditionnelles", "منازل تقليدية"] };
    // meublé comparé à des meublés, non meublé à des non meublés (27/10/2026, x.mb)
    var MB = { m: ["meublées", "مفروشة"], v: ["non meublées", "غير مفروشة"] };
    var prec = [SORTES[x.st], MB[x.mb]].filter(Boolean);
    var ann = L(x.n + " annonces semblables" + (prec.length ? " (" + prec.map(function (p) { return p[0]; }).join(", ") + ")" : ""),
      iso(x.n) + " إعلانات مشابهة" + (prec.length ? " (" + prec.map(function (p) { return p[1]; }).join("، ") + ")" : ""));
    var sembl = x.z === "m" ? L("l’estimation de notre IA (≈ ", "تقدير ذكائنا الاصطناعي (≈ ") + dt(x.r) + ")"
      : m2 ? ann + ou + L(", au m² (la moitié entre ", "، بالمتر المربع (نصفها بين ") + dm2(m2[2]) + L(" et ", " و") + dm2(m2[3]) + ")"
      : ann + ou + " (" + L("de ", "من ") + dt(x.lo) + L(" à ", " إلى ") + dt(x.hi) + ")";
    var quoi = loc ? ["Loyer", "الكراء"] : ["Prix", "السعر"], t, pre = m2 ? dm2(m2[0]) + L(", ", "، ") : "";
    // modèle seul et prix très dispersés (17/10/2026) : pas de verdict, seulement l'estimation
    // estimation DÉDUITE de l'autre marché (22/10/2026, lien vente / location) : estimation prudente avec fourchette, jamais de verdict
    if (x.dx) t = L("Notre IA l’estime à ≈ ", "يقدّره ذكاؤنا الاصطناعي بـ ≈ ") + dt(x.r) + " (" + L("de ", "من ") + dt(x.lo) + L(" à ", " إلى ") + dt(x.hi) + ")" +
      L(" ; trop peu d’annonces semblables ici pour dire si c’est cher ou une bonne affaire", "؛ إعلانات مشابهة قليلة جدًا هنا للحكم إن كان غاليًا أو صفقة جيدة");
    // maison à louer de plus de 500 m² (26/10/2026) : surface = surtout celle du TERRAIN, comparaison par nombre de pièces, jamais de verdict
    else if (x.tr) t = L("Référence : ", "المرجع: ") + sembl + L(" (même nombre de pièces) ; la surface annoncée est surtout celle du terrain : impossible de dire si c’est cher ou une bonne affaire, comparez avec soin",
      " (نفس عدد الغرف)؛ المساحة المعلنة هي غالبًا مساحة الأرض: لا يمكن الحكم إن كان غاليًا أو صفقة جيدة، قارن بعناية");
    else if (x.i) t = L("Notre IA l’estime à ≈ ", "يقدّره ذكاؤنا الاصطناعي بـ ≈ ") + dt(x.r) + L(" ; les prix sont trop différents dans ce secteur pour dire si c’est cher ou une bonne affaire : comparez avec soin", "؛ الأسعار متفاوتة جدًا هنا للحكم إن كان غاليًا أو صفقة جيدة: قارن بعناية");
    else if (x.tv) t = L("Prix très variés ici", "أسعار متفاوتة جدًا هنا") + (m2 ? L(" : ", ": ") + dm2(m2[0]) : "") + L(", comparé à ", "، مقارنة بـ ") + sembl +
      L(" : impossible de dire si c’est cher ou une bonne affaire, comparez avec soin", ": لا يمكن الحكم إن كان غاليًا أو صفقة جيدة، قارن بعناية");   // 22/10/2026
    else if (x.x) t = L("Avis partagé", "رأي متباين") + (m2 ? L(" : ", ": ") + dm2(m2[0]) : "") + L(" : comparé à ", ": مقارنة بـ ") + sembl +
      L(", mais notre modèle d’IA l’estime à ≈ ", "، لكن نموذجنا يقدّره بـ ≈ ") + dt(x.e) + L(" : comparez avec soin", ": قارن بعناية");   // annonces semblables et modèle pas d'accord
    else if (x.v === "n") t = L(quoi[0] + " dans la norme", quoi[1] + " في المعدّل") + (m2 ? L(" : ", ": ") + dm2(m2[0]) : "") + L(", comparé à ", "، مقارنة بـ ") + sembl;
    else if (x.v === "b") t = pre + L(Math.abs(x.p) + "\u00a0% sous ", iso(Math.abs(x.p)) + "\u00a0% أقل من ") + sembl + L(" : peut-être une bonne affaire, vérifiez l’état du bien", ": ربما صفقة جيدة، تحقّق من حالة العقار");
    else t = pre + L(x.p + "\u00a0% au-dessus de ", iso(x.p) + "\u00a0% أعلى من ") + sembl + L(" : de la marge pour négocier, sauf vrais atouts", ": هامش للتفاوض، إلا إن كانت له مزايا حقيقية");
    // BARRE DE PRIX (22/10/2026, Ahmed) : zone foncée = la moitié des annonces semblables, point = cette annonce ; au moins 5
    // annonces semblables (pas de chiffre sans un minimum de données), jamais sur l'estimation du modèle seul
    var barre = "";
    if (!x.i && !x.tr && x.z !== "m" && x.n >= 5) barre = m2 ? barrePrix(m2[0], m2[2], m2[3], dm2) : (x.lo && x.hi ? barrePrix(a.p, x.lo, x.hi, dt) : "");
    // 22/10/2026 (Ahmed : « pourquoi cette annonce n'a pas la barre ? ») : sans annonces semblables, barre sur la FOURCHETTE ESTIMÉE
    // par notre IA, et elle le dit (jamais confondue avec de vraies annonces)
    else if (x.z === "m" && x.lo && x.hi) barre = barrePrix(a.p, x.lo, x.hi, dt, L("Zone foncée : fourchette estimée par notre IA", "المنطقة الداكنة: تقدير ذكائنا الاصطناعي"));
    var comps = (x.c || []).map(annonceParId).filter(Boolean).map(function (c) {
      // 22/10/2026 (Ahmed) : le nom du lieu seulement s'il n'est pas celui de l'annonce (le visiteur sait déjà où il cherche)
      var cl = c.l && c.l !== a.l && LX.l[c.g + "/" + c.l];
      var cm = m2 && c.s ? c.p / c.s : null;
      return "<li>" + dt(c.p) + (c.c != null ? " · " + iso("S+" + c.c) : "") + (c.s ? " · " + L(nb(c.s) + "\u00a0m²", iso(nb(c.s)) + "\u00a0م²") : "") +
        (cm ? " (" + dm2(cm < 100 ? Math.round(cm * 10) / 10 : Math.round(cm)) + ")" : "") +
        (cl ? " · " + L(E(cl[0]), cl[1]) : "") + ' · <a href="' + (c.u ? U(c.u) : E((racine || "") + "annonce/" + idFiche(c) + "/")) + '" target="_blank" rel="noopener nofollow">' + L("voir", "شاهد") + "</a></li>";
    }).join("");
    var quatre = (x.c || []).length === 4 && x.n > 4;
    var plus = (comps ? "<p>" + L("Annonces comparées" + (quatre ? " (la moins chère, deux au milieu, la plus chère)" : "") + " :", "الإعلانات المقارنة" + (quatre ? " (الأرخص، اثنان في الوسط، الأغلى)" : "") + ":") + "</p><ul>" + comps + "</ul>" : "") +
      (x.e && x.z !== "m" ? "<p>" + L("Second avis, notre modèle d’IA : ≈ ", "رأي ثانٍ، نموذج الذكاء الاصطناعي: ≈ ") + dt(x.e) + ".</p>" : "") +
      (x.dx ? "<p>" + (loc ? L("Peu d’annonces de location de ce type dans ce quartier : loyer estimé à partir des prix de vente du quartier (lien entre loyers et prix de vente appris sur les quartiers qui ont les deux), fourchette plus large.", "إعلانات كراء قليلة من هذا النوع في هذا الحي: قُدّر الكراء انطلاقًا من أسعار البيع في الحي (علاقة بين الكراء وأسعار البيع مستخلصة من الأحياء التي فيها الاثنان)، مجال أوسع.")
        : L("Peu d’annonces de vente de ce type dans ce quartier : prix estimé à partir des loyers du quartier (lien entre loyers et prix de vente appris sur les quartiers qui ont les deux), fourchette plus large.", "إعلانات بيع قليلة من هذا النوع في هذا الحي: قُدّر السعر انطلاقًا من أسعار الكراء في الحي (علاقة بين الكراء وأسعار البيع مستخلصة من الأحياء التي فيها الاثنان)، مجال أوسع.")) + "</p>" : "") +
      (x.d ? "<p>" + L("⚠️ Les prix sont très différents dans ce secteur (meublé, saison, standing…) : comparez avec soin.", "⚠️ الأسعار متفاوتة جدًا هنا (مفروش، موسم، مستوى…): قارن بعناية.") + "</p>" : "") +
      prisEnCompte(x);
    // 23/10/2026 (Ahmed) : la carte de l'avis en 3 parties — barre des prix, avis sur le prix, avis sur le bien (blocAvis)
    return { v: x.v, barre: barre, prix: '<div class="an-ia-prix"><p><b>' + L("Sur le prix", "عن السعر") + "</b> : " + t + "</p>" +
      '<details class="an-ia-plus"><summary>' + L("Pourquoi ?", "لماذا؟") + "</summary>" + plus + "</details></div>" };
  }
  /* AVIS DE L'IA SUR LE BIEN (23/10/2026, robot/avis_bien.py, champ « ab ») : comparé aux biens semblables du quartier (ou de la
     délégation) ; points forts / faibles ; verdict seulement si le modèle a passé son contrôle. Même texte que avis_bien_html(). */
  var BIEN_NOM = { n: ["neuf", "جديد"], w: ["rénové", "مجدَّد"], s: ["haut standing", "راقٍ"], x: ["à rénover", "يحتاج ترميمًا"] };
  function nomsAtouts(a) {
    var at = {}, lib = (window.CRITERES && window.CRITERES.libelles) || {}, bas = function (t) { return String(t).charAt(0).toLowerCase() + String(t).slice(1); };
    // tous les codes (caractéristique gardée par la recherche du modèle), puis les cases de ce type (même nom que la recherche)
    Object.keys(lib).forEach(function (c) { at[c] = [bas(lib[c][0]), lib[c][1]]; });
    (window.atoutsDe ? window.atoutsDe(a.t === "v" ? "vente" : "location", a.y) : []).forEach(function (z) { at[z[1]] = [bas(z[2]), z[3]]; });
    return at;
  }
  function pointBien(j, a, at, fort) {
    var k = j.charAt(0), sn = a.c != null && (a.y === "appartement" || a.y === "maison");
    if (k === "a") {
      var c = j.charAt(1), n = j.slice(2), nom = at[c] || [c, c];
      if (fort) return L(nom[0] + " (rare ici : " + n + " biens sur 10)", nom[1] + " (نادر هنا: " + iso(n) + " من 10)");
      var pas = c === "u" ? "non " : /^[aeiouyéèêâh]/i.test(nom[0]) ? "pas d’" : "pas de ";
      return L(pas + nom[0] + " (" + n + " biens sur 10 en ont ici)", (c === "u" ? "غير " : "بلا ") + nom[1] + " (" + iso(n) + " من 10 هنا)");
    }
    if (j === "s+") return sn ? L("grande surface pour un S+" + a.c + " ici", "مساحة كبيرة لـ" + iso("S+" + a.c) + " هنا") : L("grande surface ici", "مساحة كبيرة هنا");
    if (j === "s-") return sn ? L("petite surface pour un S+" + a.c + " ici", "مساحة صغيرة لـ" + iso("S+" + a.c) + " هنا") : L("petite surface ici", "مساحة صغيرة هنا");
    if (j === "eh") return L(a.et + "e étage sans ascenseur", "الطابق " + iso(a.et) + " دون مصعد");
    return BIEN_NOM[j] ? L(BIEN_NOM[j][0], BIEN_NOM[j][1]) : "";
  }
  function avisBien(a) {
    var x = a.ab;
    if (!x) return "";
    var at = nomsAtouts(a), V = verdictsBien(x.z);
    var li = [];
    // ce que le visiteur cherche (atouts cochés dans la recherche) : confirmé sur cette annonce
    var voulu = String(window.FILTRE_AT || "").split("").filter(function (c) { return at[c] && (a.at || "").indexOf(c) >= 0; });
    if (voulu.length) li.push('<li class="ab-fort">✓ ' + L("Votre recherche : " + voulu.map(function (c) { return at[c][0]; }).join(", "), "بحثك: " + voulu.map(function (c) { return at[c][1]; }).join("، ")) + "</li>");
    (x.f || []).forEach(function (j) { var t = pointBien(j, a, at, true); if (t) li.push('<li class="ab-fort">✓ ' + t + "</li>"); });
    (x.w || []).forEach(function (j) { var t = pointBien(j, a, at, false); if (t) li.push('<li class="ab-faible">✗ ' + t + "</li>"); });
    var np = String(x.np || "").split("").filter(function (c) { return at[c]; });
    if (!x.v && !li.length && !np.length) return "";
    return '<div class="an-ia-bien"><p><b>' + L("Sur le bien", "عن العقار") + "</b> : " + (x.v ? L(V[x.v][0], V[x.v][1]) : L("à noter", "للملاحظة")) + "</p>" +
      (li.length ? '<ul class="ab-points">' + li.join("") + "</ul>" : "") +
      (np.length ? '<p class="ab-np">' + L("Non précisé (texte de l’annonce non lu) : " + np.map(function (c) { return at[c][0]; }).join(", "), "غير مذكور (نص الإعلان غير مقروء): " + np.map(function (c) { return at[c][1]; }).join("، ")) + "</p>" : "") +
      '<details class="an-ia-plus"><summary>' + L("Pourquoi ?", "لماذا؟") + "</summary>" + pourquoiBien(a, x, at) + "</details></div>";
  }
  // 23/10/2026 (Ahmed : « l'avis sur le bien doit parler comme un agent immobilier, du bien en général, pas du prix ») ; même texte
  // que verdicts_bien() du robot
  function verdictsBien(z) {
    var q = z === "q";
    return { h: [q ? "un bon bien pour le quartier, mieux équipé que la plupart" : "un bon bien pour la délégation, mieux équipé que la plupart",
                 q ? "عقار جيد بالنسبة للحي، أفضل تجهيزًا من أغلب عقاراته" : "عقار جيد بالنسبة للمعتمدية، أفضل تجهيزًا من أغلب عقاراتها"],
             n: [q ? "un bien classique pour le quartier" : "un bien classique pour la délégation", q ? "عقار عادي بالنسبة للحي" : "عقار عادي بالنسبة للمعتمدية"],
             b: [q ? "un bien moins complet que la plupart du quartier" : "un bien moins complet que la plupart de la délégation",
                 q ? "عقار أقل اكتمالًا من أغلب عقارات الحي" : "عقار أقل اكتمالًا من أغلب عقارات المعتمدية"] };
  }
  // « Pourquoi ? » de l'avis sur le bien (23/10/2026, Ahmed) : comment l'IA juge, et ce que l'annonce dit ou ne dit pas
  function pourquoiBien(a, x, at) {
    var loc = a.t === "l", y = a.y, cases = window.atoutsDe ? window.atoutsDe(loc ? "location" : "vente", y) : [], aat = a.at || "";
    var pres = [], abs = [], inc = [];
    cases.forEach(function (z) { var c = z[1], n = at[c] || [z[2], z[3]]; if (aat.indexOf(c) >= 0) pres.push(n); else if (a.nl) inc.push(n); else abs.push(n); });
    var j = function (l, i) { return l.map(function (n) { return n[i]; }).join(i ? "، " : ", "); };
    var sn = a.c != null && (y === "appartement" || y === "maison");
    var etat = aat.indexOf("n") >= 0 ? ["neuf", "جديد"] : aat.indexOf("w") >= 0 ? ["rénové", "مجدَّد"] : aat.indexOf("x") >= 0 ? ["à rénover", "يحتاج ترميمًا"] : null;
    var lig = function (fr, ar) { return "<li>" + L(fr, ar) + "</li>"; };
    return "<p>" + L("Notre IA juge le bien comme un agent immobilier : elle le compare aux " + x.n + " biens semblables " + (x.z === "q" ? "du quartier" : "de la délégation") +
        " (même type, " + (loc ? "à louer" : "à vendre") + ") et regarde ce qu’il a de rare et ce qui lui manque. Le prix n’est pas pris en compte ici.",
        "يحكم ذكاؤنا الاصطناعي على العقار كوكيل عقاري: يقارنه بـ" + iso(x.n) + " عقارات مشابهة في " + (x.z === "q" ? "الحي" : "المعتمدية") +
        " (نفس النوع، " + (loc ? "للكراء" : "للبيع") + ") وينظر إلى ما هو نادر فيه وما ينقصه. السعر لا يُحتسب هنا.") + "</p>" +
      "<p>" + L("Ce que dit l’annonce :", "ما يذكره الإعلان:") + '</p><ul class="ab-faits">' +
      (a.s ? lig("Surface : " + nb(a.s) + " m²", "المساحة: " + iso(nb(a.s)) + " م²") : lig("Surface : non précisée", "المساحة: غير مذكورة")) +
      (y === "appartement" || y === "maison" ? (sn ? lig("Pièces : S+" + a.c, "الغرف: " + iso("S+" + a.c)) : lig("Pièces : non précisé", "الغرف: غير مذكور")) : "") +
      (y === "appartement" ? (typeof a.et === "number" ? lig("Étage : " + (a.et ? a.et + "e" : "rez-de-chaussée"), "الطابق: " + (a.et ? iso(a.et) : "الأرضي")) : lig("Étage : non précisé", "الطابق: غير مذكور")) : "") +
      (pres.length ? lig("✓ Présents : " + j(pres, 0), "✓ موجود: " + j(pres, 1)) : "") +
      (abs.length ? lig("✗ Absents : " + j(abs, 0), "✗ غير موجود: " + j(abs, 1)) : "") +
      (inc.length ? lig("? Non précisés (texte de l’annonce non lu) : " + j(inc, 0), "? غير مذكور (نص الإعلان غير مقروء): " + j(inc, 1)) : "") +
      lig("État : " + (etat ? etat[0] : "non précisé"), "الحالة: " + (etat ? etat[1] : "غير مذكورة")) + "</ul>";
  }
  // la carte de l'avis : en-tête « Avis de l'IA » + bouton + / − en haut à droite (page.js, choix gardé dans le téléphone)
  function blocAvis(a, loc, racine, court) {
    var p = a.p != null && a.ia && !court ? avisIA(a, loc, racine) : null, b = avisBien(a);
    if (!p && !b) return "";
    return '<div class="an-ia an-ia-' + (p ? p.v : "bien") + '"><div class="an-ia-tete">' + ICO_IA + "<b>" + L("Avis de l’IA", "رأي الذكاء الاصطناعي") + "</b>" +
      '<button type="button" class="an-ia-bascule" aria-expanded="true"><span class="ab-moins" aria-hidden="true">−</span><span class="ab-plus" aria-hidden="true">+</span>' +
      '<span class="lu-seulement">' + L("Ouvrir ou fermer l’avis", "فتح أو غلق الرأي") + "</span></button></div>" +
      '<div class="an-ia-corps">' + (p ? p.barre + p.prix : "") + b + "</div></div>";
  }
  function barrePrix(v, bas, haut, f, note) {
    if (!(haut > bas) || !(v > 0)) return "";
    var e = haut - bas, mn = Math.max(0, Math.min(bas, v) - e * 0.35), mx = Math.max(haut, v) + e * 0.35;
    var p = function (z) { return Math.max(0, Math.min(100, Math.round((z - mn) / (mx - mn) * 20) * 5)); };
    var pl = p(bas), pw = Math.max(5, p(haut) - pl), pv = p(v);
    return '<div class="barre-prix"><span class="bp-bulle bp-l-' + pv + (pv < 40 ? " bp-g" : pv > 60 ? " bp-d" : "") + '">' + L("Cette annonce : ", "هذا الإعلان: ") + f(v) + "</span>" +
      '<div class="bp-axe"><i class="bp-zone bp-l-' + pl + " bp-w-" + Math.min(100 - pl, pw) + '"></i><b class="bp-pt bp-l-' + pv + '"></b></div>' +
      bornesBarre(pl, Math.min(100 - pl, pw), f(bas), f(haut)) + (note ? '<small class="bp-note">' + note + "</small>" : "") + "</div>";
  }
  // 22/10/2026 (Ahmed : « mettre les prix plutôt que moins cher / plus cher ») : prix des DEUX BORDS de la zone foncée, sous ces bords
  // (jamais le plus bas ni le plus haut : souvent des cas à part) ; zone étroite : « bas – haut » au milieu. Même texte que bornes_barre()
  function bornesBarre(pl, pw, tb, th) {
    var cote = function (x) { return x < 15 ? " bp-g" : x > 85 ? " bp-d" : ""; };
    if (pw >= 40) return '<div class="bp-bornes"><span class="bp-b bp-l-' + pl + cote(pl) + '">' + tb + '</span><span class="bp-b bp-l-' + (pl + pw) + cote(pl + pw) + '">' + th + "</span></div>";
    var pm = Math.round((pl + pw / 2) / 5) * 5;
    return '<div class="bp-bornes"><span class="bp-b bp-l-' + pm + cote(pm) + '">' + tb + " – " + th + "</span></div>";
  }
  // pied de chaque carte (22/10/2026, Ahmed) : « Estimer le prix d'un bien avec notre IA » (remplace « Vendeur ? Ajoutez votre numéro »)
  // MENSUALITÉ (25/10/2026 ; plus affichée sous les annonces depuis le 27/10/2026, Ahmed) : mêmes hypothèses que la page « Où investir ? » et robot/investir.py
  // (credit() : APPORT, TAUX_CREDIT, DUREE_CREDIT, FRAIS_ACHAT) ; test croisé dans tools/test_site.mjs (mêmes valeurs, même calcul)
  var CREDIT = { apport: 0.20, taux: 0.10, ans: 20, frais: 1.07, min: 40000, max: 3000000 };
  function mensualite(p) {
    var pret = p * CREDIT.frais - p * CREDIT.apport, r = CREDIT.taux / 12, n = CREDIT.ans * 12;
    return r ? pret * r / (1 - Math.pow(1 + r, -n)) : pret / n;
  }
  // seulement une VENTE d'appartement ou de maison au prix sûr (prix douteux = a.p vide), jamais une location
  function avecCredit(a) { return a.t === "v" && (a.y === "appartement" || a.y === "maison") && a.p != null && !a.lc && a.p >= CREDIT.min && a.p <= CREDIT.max; }
  // ZONE DESSINÉE sur la carte (25/10/2026, Ahmed) : polygone [[lat, lon], …] (assets/carte-prix.js), gardé dans l'adresse
  // (?z=lat,lon;lat,lon… arrondis à 3 décimales) ; une annonce est placée à la position de son quartier (prix/carte.js, CARTE_PRIX.q)
  function lireZone(t) {
    var pts = String(t || "").split(";").map(function (x) { var c = x.split(",").map(Number); return c.length === 2 && isFinite(c[0]) && isFinite(c[1]) && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180 ? c : null; });
    return pts.length >= 3 && pts.length <= 60 && pts.every(Boolean) ? pts : null;
  }
  function ecrireZone(z) { return z.map(function (p) { return (Math.round(p[0] * 1000) / 1000) + "," + (Math.round(p[1] * 1000) / 1000); }).join(";"); }
  function dansPolygone(p, z) {            // rayon horizontal : nombre de côtés traversés impair = dedans
    var x = p[1], y = p[0], dedans = false;
    for (var i = 0, j = z.length - 1; i < z.length; j = i++) {
      var yi = z[i][0], xi = z[i][1], yj = z[j][0], xj = z[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
  }
  var POS = null, POS_DE = null;
  function posDe(a) {                      // position du quartier de l'annonce, ou null (quartier inconnu ou pas encore placé)
    var C = window.CARTE_PRIX;
    if (!C || !C.q) return null;
    if (POS_DE !== C) { POS = {}; POS_DE = C; C.q.forEach(function (x) { if (x.p) POS[x.g + "/" + x.q] = x.p; }); }
    return (a.l && POS[a.g + "/" + a.l]) || null;
  }
  window.ZONE_IMMO = { lire: lireZone, ecrire: ecrireZone, dans: dansPolygone, pos: posDe };
  window.CREDIT_IMMO = { hyp: CREDIT, mensualite: mensualite, avec: avecCredit };   // utilisé par les tests
  function lienEstimer(a, racine) {
    var loc = a.t === "l";
    return '<a class="an-estimer" href="' + (racine || "") + (loc ? "louer/" : "vendre/") + '">' + L(loc ? "Estimer le loyer d’un bien avec notre IA" : "Estimer le prix d’un bien avec notre IA", loc ? "قدّر كراء عقار بذكائنا الاصطناعي" : "قدّر سعر عقار بذكائنا الاصطناعي") + "</a>";
  }
  function carte(a, racine) {
    var LX = window.LIEUX || { g: {}, l: {} };
    var g = LX.g[a.g] || [a.g, a.g];
    var li = a.l && LX.l[a.g + "/" + a.l];
    var lfr = li ? li[0] : a.n, lar = li ? li[1] : (a.n ? iso(E(a.n)) : "");
    if (li && a.k) { var kt = String(a.k).replace(".", ","); lfr += " km " + kt; lar += " كلم " + iso(kt); }   // Sfax : « Route de Mahdia km 4 »
    var loc = a.t === "l";
    var sn = a.c != null && (a.y === "appartement" || a.y === "maison");
    var tfr = (a.pn ? "Programme neuf : " + a.pn + " logements, " : "") + ((a.pn ? (TYPE_FR[a.y] || "bien").toLowerCase() : TYPE_FR[a.y]) || "Bien immobilier") + (sn ? " S+" + a.c : "") + (loc ? " à louer" : " à vendre");
    var tar = (a.pn ? "مشروع جديد: " + iso(a.pn) + " مسكن، " : "") + (TYPE_AR[a.y] || "عقار") + (sn ? " " + iso("S+" + a.c) : "") + (loc ? " للكراء" : " للبيع");
    // location à la nuit / au jour (22/10/2026, Ahmed) : « 120 DT / nuit », jamais d'avis de l'IA (elle juge des loyers au mois)
    var court = loc && (a.lc === "n" || a.lc === "j") && a.p != null;
    var prix = court
      ? '<p class="an-prix"><strong>' + nb(a.p) + '</strong> <span class="dt">DT</span><span class="dt-per">' + (a.lc === "j" ? L(" / jour", " / اليوم") : L(" / nuit", " / الليلة")) + '</span><span class="an-prix-note">' + L("location courte durée", "كراء قصير المدة") + '</span></p>'
      : a.p != null
      ? '<p class="an-prix"><strong>' + nb(a.p) + '</strong> <span class="dt">DT</span><span class="an-prix-note">' + (a.pn ? L("à partir de (programme neuf)", "ابتداءً من (مشروع جديد)") : loc ? L("loyer demandé", "الكراء المطلوب") : L("prix demandé", "السعر المطلوب")) + '</span></p>'
      : '<p class="an-prix sans">' + (loc && a.lc ? L("Location courte durée : prix chez le vendeur", "كراء قصير المدة: السعر لدى البائع") : L("Prix communiqué par le vendeur", "السعر لدى البائع")) + '</p>';
    // prix d'avant (25/10/2026, collecter.baisse_prix : pb = %, pv = prix d'avant), même ligne que carte_annonce() du robot
    if (a.pb && a.pv && a.p != null && !court) prix += '<p class="an-prix-avant">' + L("Avant : " + nb(+a.pv) + "\u00a0DT", "قبل: " + iso(nb(+a.pv)) + "\u00a0دينار") + "</p>";
    prix += blocAvis(a, loc, racine, court);
    var faits = "";
    if (a.s) faits += '<li>' + ICO.surface + L(nb(a.s) + "\u00a0m²", iso(nb(a.s) + "\u00a0م²")) + '</li>';
    if (sn) faits += '<li>' + ICO.chambres + L("S+" + a.c, iso("S+" + a.c)) + '</li>';
    if (a.d) faits += '<li>' + ICO.date + L(dfr(a.d), iso(dfr(a.d))) + '</li>';
    var lieu = lfr ? L(E(lfr) + " · " + E(g[0]), lar + " · " + g[1]) : L(E(g[0]), g[1]);
    // annonce déposée chez nous : titre et texte écrits par la personne elle-même (classe « perso »)
    var depose = a.v === "d" && a.x;
    var titre = depose ? '<span class="perso" dir="auto">' + E(a.x) + '</span>' : L(E(tfr), tar);
    var sous = depose ? '<p class="an-type">' + L(E(tfr), tar) + '</p>' : "";
    var texte = depose && a.z ? '<details class="an-details"><summary>' + L("Lire la description", "قراءة الوصف") + '</summary><p class="perso an-texte" dir="auto">' + E(a.z) + '</p></details>' : "";
    // a.av : annonce MISE EN AVANT (Pass Propriétaire, 15/10/2026), étiquette visible
    // carte façon SeLoger (19/10/2026, Ahmed) : grande photo (lien de l'image chez la source, jamais copiée), étiquette et cœur posés
    // dessus ; sans photo : le dessin du type de bien, même hauteur. Même carte que carte() de robot/construire_site.py
    var media = PHOTO_OK(a.ph)
      ? '<img class="an-img" src="' + E(a.ph) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
      : '<div class="an-vignette v-' + a.y + '">' + (VIGNETTE[a.y] || VIGNETTE.autre || "") + '</div>';
    return '<article class="annonce' + (a.av ? " en-avant" : "") + (PHOTO_OK(a.ph) ? " a-photo" : "") + '" id="a-' + E(a.i) + '" data-t="' + a.t + '" data-y="' + a.y + '" data-v="' + (a.v || "p") + '">' +
      // 27/10/2026 (Ahmed) : les photos de la fiche glissent sur la carte (assets/page.js), même balisage que carte_annonce() du robot
      '<div class="an-media v-' + a.y + '"' + (a.np >= 2 && PHOTO_OK(a.ph) ? ' data-galerie="' + E(idFiche(a)) + '"' : "") + '>' + media +
      (a.np >= 2 && PHOTO_OK(a.ph) ? '<span class="an-nb-ph">📷 1/' + (+a.np) + '</span>' : "") +
      '<div class="an-etiquettes"><span class="an-badge ' + (loc ? "louer" : "vendre") + '">' + (loc ? L("À louer", "للكراء") : L("À vendre", "للبيع")) + '</span>' +
      (a.av ? '<span class="an-badge avant">' + L("⭐ En avant", "⭐ مميّز") + '</span>' : "") +
      (a.fo === "f" ? '<span class="an-badge fonds">' + L("Fonds de commerce", "أصل تجاري") + '</span>' :     // 20/10/2026 (Ahmed)
       a.fo === "mf" ? '<span class="an-badge fonds">' + L("Murs + fonds", "المحل مع الأصل التجاري") + '</span>' : "") + badgesPrix(a, court) + '</div>' +
      // cœur « Ajouter aux favoris » (18/10/2026, IM.15) : assets/page.js (window.FAVORIS), même bouton que bouton_favori() du robot
      // 19/10/2026 (Ahmed : un visiteur voulait envoyer l'annonce à sa femme) : bouton Partager, géré par assets/page.js
      '<button type="button" class="an-partage" data-partage="' + E(a.i) + '" data-g="' + E(a.g) + '" aria-label="Partager l’annonce" title="Partager l’annonce">' + ICO_PART + '</button>' +
      (window.FAVORIS ? window.FAVORIS.bouton(a.i) : "") + '</div>' +
      '<div class="an-corps">' + prix + '<ul class="an-faits">' + faits + '</ul>' +
      '<h3 class="an-titre">' + titre + '</h3>' + sous + '<p class="an-lieu">' + ICO.lieu + lieu + '</p>' +
      // a.an : annonce de plus de 2 mois gardée pour un gouvernorat faible (17/10/2026), même texte que construire_site.py
      (a.an ? '<p class="an-ancienne">' + L("⏳ Annonce de plus de 2 mois : vérifiez qu’elle est toujours disponible.", "⏳ إعلان عمره أكثر من شهرين: تأكّد أنه ما زال متاحًا.") + '</p>' : "") +
      texte + actions(a, racine) + lienEstimer(a, racine) + '</div></article>';
  }
  // « Nouveau » (nw : vue il y a 3 jours au plus) et « Prix baissé de X % » (pb) : calculés par le robot (collecter.py), même texte
  function badgesPrix(a, court) {
    return (a.nw ? '<span class="an-badge nouveau">' + L("Nouveau", "جديد") + "</span>" : "") +
      (a.pb && a.p != null && !court ? '<span class="an-badge baisse">' + L("Prix baissé de " + (+a.pb) + "\u00a0%", "انخفض السعر " + iso((+a.pb) + "\u00a0%")) + "</span>" : "");
  }
  function PHOTO_OK(u) { return /^https:\/\/[^\s"'<>]+$/.test(u || ""); }
  // site léger (27/10/2026) : la liste n'a pas la photo (« ph », lue avec les détails) mais sait si l'annonce en a une (« hp »)
  function aPhoto(a) { return a.ph ? PHOTO_OK(a.ph) : !!a.hp; }

  // Contact (décision d'Ahmed du 11/10/2026) — même logique que robot/construire_site.py, fonction actions()
  // « Description, photos et contact » (26/10/2026, décision d'Ahmed) : fiche ouverte sans quitter le site (assets/page.js)
  // même calcul que id_partage() du robot et window.idPartage (page.js peut être chargé après ce fichier)
  function idFiche(a) { return String(a.i).replace(/[^a-z0-9-]/g, function (c) { return "-x" + c.charCodeAt(0).toString(16) + "-"; }); }
  function boutonFiche(a) {
    return a.fd ? '<button class="an-fiche" type="button" data-fiche="' + E(idFiche(a)) + '" data-url="' + U(a.u) + '">' +
      L("Description et contact", "الوصف والاتصال") + '</button>' : "";   // 27/10/2026 (Ahmed) : les photos glissent sur la carte
  }
  function actions(a, racine) { return boutonFiche(a) + actionsContact(a, racine); }
  function actionsContact(a, racine) {
    var url = U(a.u);
    // 27/10/2026 (Ahmed) : plus de « Voir l'annonce » quand la carte a « Description et contact » (le lien d'origine y est) ; « Appeler »
    // dès qu'un numéro est connu (a.ft : numéro de l'annonceur dans la fiche, lu au toucher). Même logique que actions_contact() du robot
    var origine = a.fd ? "" : '<a class="an-contact" href="' + url + '" target="_blank" rel="noopener nofollow">' + L("Voir l’annonce", "عرض الإعلان") + ICO.lien + '</a>';
    if (a.ft && a.fd && a.v !== "a" && a.v !== "d") origine = '<button class="an-appel an-appel-fiche" type="button" data-fiche="' + E(idFiche(a)) + '">' + ICO.tel + L("Appeler", "اتصل") + '</button>';
    // annonce vue sur Facebook, ajoutée par Ahmed (18/10/2026) : un seul bouton, vers Facebook (nom et numéro y sont, pas chez nous)
    if (/^https:\/\/(www\.|m\.|web\.)?facebook\.com\//.test(a.u || "")) return '<a class="an-contact an-fb" href="' + url + '" target="_blank" rel="noopener nofollow">' + L("Voir l’annonce sur Facebook", "عرض الإعلان على فيسبوك") + ICO.lien + '</a>';
    if (a.v === "a") {
      if (!a.tel) return origine;
      return '<div class="an-actions"><a class="an-appel" href="tel:' + E(a.tel.replace(/ /g, "")) + '" data-num="' + E(a.tel) + '">' + ICO.tel + L("Appeler l’agence", "اتصل بالوكالة") + '</a>' +
        (a.fd ? "" : '<a class="an-voir" href="' + url + '" target="_blank" rel="noopener nofollow">' + L("Voir l’annonce", "عرض الإعلان") + ICO.lien + '</a>') + '</div>';
    }
    if (a.v === "d") {
      if (!a.tel) return "";
      // « Afficher le numéro » puis Appeler + WhatsApp (le vendeur a coché la case) ; jamais de lien vers un autre site
      return '<div class="an-numero-bloc"><button class="an-numero" type="button">' + ICO.tel + L("Afficher le numéro", "إظهار الرقم") + '</button>' +
        '<div class="an-actions" hidden><a class="an-appel revele" href="tel:' + E(a.tel.replace(/ /g, "")) + '">' + E(a.tel) + '</a>' +
        '<a class="an-wa" href="https://wa.me/' + a.tel.replace(/\D/g, "") + '" target="_blank" rel="noopener">' + L("WhatsApp", "واتساب") + '</a></div></div>';
    }
    return origine;   // 22/10/2026 (Ahmed) : plus de « Vendeur ? Ajoutez votre numéro (gratuit) »
  }

  function demarrer() {
    var form = document.getElementById("recherche");
    var zone = document.getElementById("annonces");
    if (!form || !zone || !window.ANNONCES) return;
    var racine = document.documentElement.getAttribute("data-racine") || "";
    var gFixe = form.getAttribute("data-gouv") || "", lFixe = form.getAttribute("data-lieu") || "";
    var tout = window.ANNONCES.a.filter(function (a) { return (!gFixe || a.g === gFixe) && (!lFixe || a.l === lFixe); });
    var plus = document.getElementById("plus"), res = document.getElementById("resultat"), tri = document.getElementById("f-tri");
    var montre = 0, liste = [], sansPrix = 0, sansPos = 0;
    var premier = document.body.getAttribute("data-page") === "accueil" ? 12 : PAS;

    // choix venus de l'adresse (?t=l&y=appartement&g=sousse&p=1500) : liens partageables
    var q = new URLSearchParams(location.search);
    if (q.get("t")) { var r = form.querySelector('input[name="t"][value="' + q.get("t") + '"]'); if (r) r.checked = true; }
    // Gouvernorat -> Délégation -> Localité, comme Tunisie-annonce : listes officielles de La Poste (window.DECOUPAGE,
    // donnees/decoupage.js), avec le nombre d'annonces ; nos quartiers y sont rattachés par LIEUX.o (« g/quartier » -> [délégation, localité]).
    var LX = window.LIEUX || { g: {}, l: {}, o: {} }, DEC = window.DECOUPAGE || {}, OF = LX.o || {};
    var selD = form.querySelector('[name="d"]'), selL = form.querySelector('[name="l"]'), selG = form.querySelector('[name="g"]');
    function slug(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
    function delegDe(a) { if (a.dl) return a.dl; var o = a.l && OF[a.g + "/" + a.l]; return o ? o[0] : ""; }   // a.dl / a.lo : annonces déposées
    // 18/10/2026 (Ahmed : « Djerba, ce sont les délégations Midoun, Houmet Essouk… ») : un nom qui couvre plusieurs délégations
    // officielles (LIEUX.grp) contient leurs annonces + celles qui disent seulement « Djerba »
    var GRP = LX.grp || {};
    function groupe(g, dv) {          // délégations officielles couvertes par la délégation choisie (ou null)
      var k = Object.keys(GRP).filter(function (k) { return k.split("/")[0] === g && OF[k] && slug(OF[k][0]) === dv; })[0];
      return k ? GRP[k].d : null;
    }
    function nomGroupe(g, dv) { var k = Object.keys(GRP).filter(function (k) { return k.split("/")[0] === g && OF[k] && slug(OF[k][0]) === dv; })[0]; return k ? GRP[k] : null; }
    function dansDeleg(a, dv) {
      var d = slug(delegDe(a)), gr;
      return d === dv || !!((gr = groupe(a.g, dv)) && gr.some(function (x) { return slug(x) === d; }));
    }
    window.dansDeleg = dansDeleg;
    function locDe(a) { if (a.lo) return a.lo; var o = a.l && OF[a.g + "/" + a.l]; return o ? o[1] : ""; }
    // 18/10/2026 (retour d'un visiteur : « Ennasr 2, S+5 : aucune annonce, alors que la carte en montre à Ennasr ») : beaucoup d'annonces
    // disent seulement « Ennasr » (sans 1 ou 2). Elles comptent pour « Cité Ennasr 1 » ET « Cité Ennasr 2 » : on ne devine pas lequel,
    // on ne les cache pas non plus (même délégation exigée par le filtre de délégation)
    function dansLoc(a, v) { return a.l === v || (locDe(a) && slug(locDe(a)) === v) || (!locDe(a) && memeNom(a.l, v)); }
    // « ennasr » et « cite-ennasr-2 » : même nom, seuls « cité / résidence » et le numéro changent (jamais « ariana » / « ariana-essoughra »)
    function memeNom(l, v) { if (!l) return false; var w = "-" + v + "-", k = "-" + l + "-"; return w.indexOf(k) >= 0 && /^-(cite-|residence-|hay-)?(\d+-)?$/.test(w.replace(k, "-")); }
    function gCourant() { return gFixe || (selG ? selG.value : ""); }
    // QUARTIERS PROCHES (26/10/2026, idée d'Ahmed vue sur bigdatis.tn) : après le choix d'un quartier, on propose les quartiers à moins
    // de 5 km (position connue : LIEUX.pq, donnees/coords-quartiers.json), avec la distance et le nombre d'annonces ; un toucher les
    // AJOUTE à la recherche (?lx=g/q,g/q). Jamais une distance devinée : quartier sans position = pas de proposition.
    var PQ = LX.pq || {}, PROCHES_KM = 5, proches = {};
    (q.get("lx") || "").split(",").forEach(function (k) { if (PQ[k]) proches[k] = 1; });
    function km(p1, p2) {
      var R = 6371, r = Math.PI / 180, dLat = (p2[0] - p1[0]) * r, dLon = (p2[1] - p1[1]) * r;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(p1[0] * r) * Math.cos(p2[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    window.kmEntre = km;
    function delegs(g) {            // [[nom, nom arabe, [[localité, arabe], …]], …] : officielles + quartiers sans rattachement sûr
      var liste = (DEC[g] || []).slice(), vus = {};
      liste.forEach(function (d) { vus[d[0]] = 1; });
      Object.keys(OF).forEach(function (k) {
        var o = OF[k];
        if (k.split("/")[0] === g && !vus[o[0]]) { vus[o[0]] = 1; liste.push([o[0], (LX.l[k] || [o[0], o[0]])[1], []]); }
      });
      return liste.sort(function (x, y) { return x[0].localeCompare(y[0], "fr"); });
    }
    function option(v, fr, ar, n) {
      var ara = document.documentElement.lang === "ar", c = n === undefined ? "" : " (" + n + ")";
      return '<option value="' + E(v) + '" data-fr="' + E(fr + c) + '" data-ar="' + E((ar || fr) + c) + '">' + E((ara ? ar || fr : fr) + c) + '</option>';
    }
    function premiere(fr, ar) { return '<option value="" data-fr="' + E(fr) + '" data-ar="' + E(ar) + '">' + E(document.documentElement.lang === "ar" ? ar : fr) + '</option>'; }
    function remplirDelegs() {
      if (!selD) return;
      var g = gCourant(), garde = selD.value, n = {};
      tout.forEach(function (a) { if (a.g === g) { var d = delegDe(a); if (d) n[d] = (n[d] || 0) + 1; } });
      var liste = g ? delegs(g) : [];
      liste.forEach(function (d) { var gr = groupe(g, slug(d[0])); if (gr) gr.forEach(function (x) { n[d[0]] = (n[d[0]] || 0) + (n[x] || 0); }); });
      selD.innerHTML = (g ? premiere("Toutes", "الكل") : premiere("Choisissez d’abord le gouvernorat", "اختر الولاية أولًا")) +
        liste.map(function (d) { var ng = nomGroupe(g, slug(d[0])); return option(slug(d[0]), ng ? ng.fr : d[0], ng ? ng.ar : d[1], n[d[0]] || 0); }).join("");
      selD.disabled = !liste.length;
      if (garde && liste.some(function (d) { return slug(d[0]) === garde; })) selD.value = garde;
      if (lFixe) { selD.closest(".champ").hidden = true; if (selL) selL.closest(".champ").hidden = true; }   // page d'un quartier : déjà choisi
    }
    function remplirLocalites() {
      if (!selL) return;
      var g = gCourant(), dv = selD ? selD.value : "", garde = selL.value;
      var d = dv ? delegs(g).filter(function (x) { return slug(x[0]) === dv; })[0] : null;
      var gr = d && groupe(g, dv), ds = !d ? [] : gr ? delegs(g).filter(function (x) { return x === d || gr.indexOf(x[0]) >= 0; }) : [d];
      var n = {}, items = [], pris = {};
      tout.forEach(function (a) {
        if (a.g !== g) return;
        var vus = {};
        if (a.l) { n[a.l] = (n[a.l] || 0) + 1; vus[a.l] = 1; }
        var lo = locDe(a) && slug(locDe(a)); if (lo && !vus[lo]) n[lo] = (n[lo] || 0) + 1;
      });
      if (d) {
        var exact = {};          // localité officielle -> notre quartier du même nom
        ds.forEach(function (d) {     // une délégation, ou toutes celles d'un groupe (Djerba)
          Object.keys(OF).forEach(function (k) { if (k.split("/")[0] === g && OF[k][0] === d[0] && OF[k][1]) exact[OF[k][1]] = k.split("/")[1]; });
          d[2].forEach(function (l) { var v = exact[l[0]] || slug(l[0]); if (!pris[v]) { pris[v] = 1; items.push([v, l[0], l[1]]); } });
          Object.keys(OF).forEach(function (k) {          // nos quartiers de cette délégation qui ne sont pas une localité officielle
            var s = k.split("/")[1], nom = LX.l[k] || [s, s];
            if (k.split("/")[0] === g && OF[k][0] === d[0] && !pris[s] && slug(nom[0]) !== dv) { pris[s] = 1; items.push([s, nom[0], nom[1]]); }
          });
        });
        items.sort(function (x, y) { return x[1].localeCompare(y[1], "fr"); });
      }
      selL.innerHTML = (d ? premiere("Toutes", "الكل") : premiere("D’abord la délégation", "اختر المعتمدية أولًا")) +
        items.map(function (x) { return option(x[0], x[1], x[2], n[x[0]] || 0); }).join("");
      selL.disabled = !items.length;
      if (garde && pris[garde]) selL.value = garde;
    }
    // Case « Où ? » : on tape un lieu (« petite ariana », « ennasr », « المرسى ») et le site remplit gouvernorat, délégation et localité
    // 18/10/2026 (Ahmed : « Jerba et Djerba c'est pareil mais la recherche ne donne pas le même résultat ; vérifie les autres noms qui
    // s'écrivent différemment ») : les noms tunisiens s'écrivent de plusieurs façons en lettres latines -> on compare « au son », le
    // même calcul pour ce qu'on tape et pour la liste : Dj = J (Djerba, Jerba), Ou = W = U (Oued, Wed), Q = K (Kairouan, Qairouan),
    // Sh = Ch, Y = I, Ph = F, lettres doublées (Hammamet, Hamamet), article collé « Es/Et/En… » (Essouk, Souk ; 26/10/2026 : aussi avec une seule lettre, Enasr = Ennasr, Esada = Essaada, Enkhilet = Ennkhilet, Elouata = Ellouata), « el / al / l' »,
    // « e » ou « a » entre deux consonnes (Houmet / Houmt, Ghazela / Ghazala, Mahrès / Mahras) ; « o » = « ou » (26/10/2026 : Essoghra =
    // Essoughra, Sokra = Soukra)
    function son(t) {
      return (" " + t + " ")
        .replace(/ e([bcdfgjklmnpqrstvxz])\1/g, " $1").replace(/dj/g, "j").replace(/sh/g, "ch").replace(/ e([djlnrstz])/g, " $1").replace(/ph/g, "f").replace(/q/g, "k")
        .replace(/ou/g, "u").replace(/o/g, "u").replace(/w/g, "u").replace(/y/g, "i").replace(/([a-z])\1+/g, "$1").replace(/ (el|al|l|le|la|les) /g, " ").replace(/ (el|al|l|le|la|les) /g, " ")
        .replace(/([bcdfghjklmnpqrstvxz])[ea](?=[bcdfghjklmnpqrstvxz])/g, "$1").replace(/ +/g, " ");
    }
    function brut(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").replace(/ +/g, " "); }
    function cle(t) { return son(" " + String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim() + " "); }
    window.cleLieu = cle;
    var INDEX = null;
    function indexLieux() {
      if (INDEX) return INDEX;
      INDEX = [];
      var gs = gFixe ? [gFixe] : Object.keys(DEC);
      gs.forEach(function (g) {
        var G = LX.g[g] || [g, g];
        INDEX.push({ g: g, d: "", l: "", fr: G[0], ar: G[1], sous: ["Gouvernorat", "ولاية"], k: cle(G[0] + " " + G[1]), r: 0 });
        delegs(g).forEach(function (d) {
          var sd = slug(d[0]);
          // 18/10/2026 (capture d'Ahmed : « El Mourouj » deux fois, 264 et 260 annonces) : la DÉLÉGATION El Mourouj contient la LOCALITÉ
          // El Mourouj et d'autres (Cité El Mourouj 3 Bis…) : chaque proposition dit son niveau
          var ng = nomGroupe(g, sd);       // « Djerba – toute l'île » (Houmet Essouk + Midoun + Ajim), 18/10/2026
          INDEX.push(ng ? { g: g, d: sd, l: "", fr: ng.fr, ar: ng.ar, sous: [groupe(g, sd).join(" + ") + " · " + G[0], groupe(g, sd).join(" + ") + " · " + G[1]], k: cle(d[0] + " " + d[1]), r: 0.5 }
            : { g: g, d: sd, l: "", fr: d[0], ar: d[1], sous: ["Délégation entière · " + G[0], "كامل المعتمدية · " + G[1]], k: cle(d[0] + " " + d[1]), r: 1 });
          // code postal de La Poste (18/10/2026, idée d'Ahmed) : taper « 1000 » ou « 2045 » trouve aussi la localité
          d[2].forEach(function (l) { var cp = l[2] ? " · " + l[2] : ""; INDEX.push({ g: g, d: sd, l: slug(l[0]), fr: l[0], ar: l[1], sous: ["Localité · " + d[0] + " · " + G[0] + cp, "منطقة · " + d[1] + " · " + G[1] + cp], k: cle(l[0] + " " + l[1] + " " + (l[2] || "")), r: 2 }); });
        });
        ((LX.al || {})[g] || []).forEach(function (a) {     // autres écritures connues (« Bab Jdid » = Bab Djedid), 18/10/2026
          var sd = a[1] === "quartier" ? slug((OF[g + "/" + a[3]] || [""])[0]) : slug(a[3]);
          INDEX.push({ g: g, d: sd, l: a[1] === "quartier" ? a[3] : (a[1] === "localité" ? slug(a[2]) : ""), fr: a[0], ar: a[0],
                       sous: ["= " + a[2] + " · " + G[0], "= " + a[2] + " · " + G[1]], k: cle(a[0]), r: 2, al: 1 });
        });
        Object.keys(LX.l).forEach(function (k) {            // nos quartiers (ex. Chotrana, Ennasr), avec leur délégation
          if (k.split("/")[0] !== g) return;
          var s = k.split("/")[1], o = OF[k] || [LX.l[k][0], ""], sd = slug(o[0]);
          if (slug(LX.l[k][0]) === sd) return;            // le quartier est la délégation elle-même (déjà dans la liste)
          INDEX.push({ g: g, d: sd, l: s, fr: LX.l[k][0], ar: LX.l[k][1], sous: ["Quartier · " + o[0] + " · " + G[0], "حي · " + o[0] + " · " + G[1]], k: cle(LX.l[k][0] + " " + LX.l[k][1]), r: 2 });
        });
      });
      return INDEX;
    }
    // 27/10/2026 (Ahmed : « 78 annonces » dans la suggestion, « Voir les 51 annonces » sur le bouton) : le nombre d'un lieu proposé
    // compte les annonces qui passent TOUS les autres filtres choisis (Acheter / Louer, type, prix…), comme le bouton
    // 28/10/2026 (Ahmed : « j'écris une lettre, puis la deuxième : le site met du temps à afficher ») : avant, CHAQUE lieu proposé refaisait
    // les filtres sur les ~40 000 annonces ; maintenant les annonces qui passent les autres filtres sont triées UNE fois par gouvernorat
    // (mémorisées tant que les filtres et la liste ne changent pas) et un lieu ne compte que dans son gouvernorat
    var baseCompte = { cle: null, liste: null, parG: null };
    function compter(x, v) {
      v = v || valeurs();
      var cle = JSON.stringify(v) + "|" + tout.length;
      if (baseCompte.cle !== cle) {
        baseCompte.cle = cle; baseCompte.parG = {};
        tout.forEach(function (a) { if (passe(a, v, { g: 1, d: 1, l: 1, compte: false })) (baseCompte.parG[a.g] = baseCompte.parG[a.g] || []).push(a); });
      }
      return (baseCompte.parG[x.g] || []).filter(function (a) { return (!x.d || dansDeleg(a, x.d)) && (!x.l || dansLoc(a, x.l)); }).length;
    }
    function ouChercher() {
      var champ = document.getElementById("f-ou"), boite = document.getElementById("ou-suggestions");
      if (!champ || !boite) return;
      if (lFixe) { champ.closest(".champ-ou").hidden = true; return; }
      var choix = [], actif = -1;
      function fermer() { boite.hidden = true; boite.innerHTML = ""; champ.setAttribute("aria-expanded", "false"); actif = -1; }
      function proposer() {
        var mots = cle(champ.value).trim().split(" ").filter(Boolean);
        // « Elles » (Le Kef) : la clé « au son » enlève l'article « el » et ne laisse rien -> on cherche le texte tapé tel quel
        if ((!mots.length || cle(champ.value).trim().length < 2) && brut(champ.value).trim().length >= 3) mots = brut(champ.value).trim().split(" ");
        if (!mots.length || brut(champ.value).trim().length < 2) { fermer(); return; }
        // mot en cours de frappe : sans « e » final (« Houme » trouve déjà Houmet / Houmt) ; mots collés (« Bousaid » = « Bou Said »)
        // 19/10/2026 (Ahmed : « enna » listait Nabeul, Nebeur…) : jamais une seule lettre (« enna » -> « na » -> « n » = tout ce qui
        // commence par N) ; et ce qui CONTIENT ce qu'on a tapé (Ennasr pour « enna ») passe toujours avant les ressemblances « au son »
        var der = mots[mots.length - 1].replace(/[ea]+$/, "");
        if (der.length >= 2) mots[mots.length - 1] = der;
        var lit = brut(champ.value).trim(), litOk = function (x) { if (x.b === undefined) x.b = " " + brut(x.fr + " " + x.ar);
          return lit.length >= 2 && lit.split(" ").every(function (m) { return x.b.indexOf(" " + m) >= 0; }); };
        // le mot en cours de frappe a été trop raccourci par la clé « au son » (« enna » -> « na ») : le texte tapé décide
        var tape = brut(champ.value).trim().split(" ").pop() || "";
        var faible = mots[mots.length - 1].length < 3 && tape.length >= 3;
        var colle = mots.join("");
        var vu = {}, vOu = valeurs();
        // 19/10/2026 (vérification de 5 210 lieux après « aouina ») : on peut ajouter la ville ou la délégation (« cité erriadh bizerte ») ;
        // le nom écrit EXACTEMENT passe avant tout (« El Aroussa » avant Ben Arous, « Kesra » avant Kasserine)
        var sansEsp = function (t) { return cle(t).replace(/ /g, ""); }, tapeSon = sansEsp(champ.value);
        var nbMots = function (t) { return brut(t).trim().split(" ").length; }, motsTapes = nbMots(champ.value);
        // nom exact = même prononciation ET même nombre de mots ou mots collés (« hamma » n'est pas « El Hamma » ; Sidi Bousaid = Sidi Bou Said) ; un groupe (« Djerba – toute l'île »)
        // compte par son nom ; jamais une autre écriture (alias), et un lieu exact sans annonce passe après un lieu exact qui en a
        // 26/10/2026 : « Ennasser » = « Cité Ennasser » (on tape rarement « Cité / Résidence / Hay » ; nom entre parenthèses ignoré)
        var sansPrefixe = function (t) { return String(t).replace(/^\s*(cit[eé]|r[eé]sidence|hay)\s+/i, "").replace(/\s*\(.*\)\s*$/, ""); };
        var exact = function (x) { var nom = x.fr.split(" – ")[0];
          var pareil = function (n) { return sansEsp(n) === tapeSon && (nbMots(n) === motsTapes || brut(n).replace(/ /g, "") === lit.replace(/ /g, "")); };
          return !x.al && tapeSon.length >= 3 && (pareil(nom) || pareil(sansPrefixe(nom)) || brut(x.ar).trim() === lit); };
        var avecVille = function (x) { if (mots.length < 2 || x.k.indexOf(" " + mots[0]) < 0) return false;
          if (x.kz === undefined) x.kz = cle(x.fr + " " + x.sous[0]);
          return mots.every(function (m) { return x.kz.indexOf(" " + m) >= 0; }); };
        choix = indexLieux().filter(function (x) { return litOk(x) || avecVille(x) || mots.every(function (m) { return x.k.indexOf(" " + m) >= 0; })
            || (colle.length >= 4 && (" " + x.k.trim().split(" ").join("")).indexOf(" " + colle) >= 0)
            || (colle.length >= 4 && x.k.split(" ").some(function (w, i, t) { return w && (w + (t[i + 1] || "") + (t[i + 2] || "")).indexOf(colle) === 0; })); })
          // 19/10/2026 (Ahmed : « aouina » ne montrait que « Cité El Wahat (L'Aouina) ») : pour un même lieu, le VRAI nom passe avant
          // ses autres écritures (sinon le doublon retiré était le vrai nom)
          .sort(function (a, b) { return (a.al || 0) - (b.al || 0); })
          .filter(function (x) { var c = x.g + "/" + x.d + "/" + x.l; if (vu[c]) return false; vu[c] = 1; return true; })
          // 28/10/2026 (Ahmed : « a » puis « aaaaa » : lent) : une ou deux lettres proposent des centaines de lieux ; on garde les 60 plus
          // probables (nom exact, début du nom, délégation avant localité) AVANT de compter leurs annonces
          .sort(function (a, b) { return (exact(b) - exact(a)) || (litOk(b) - litOk(a)) || ((b.k.indexOf(" " + mots[0]) === 0) - (a.k.indexOf(" " + mots[0]) === 0)) || (a.r - b.r); })
          .slice(0, 60)
          .map(function (x) { return { x: x, n: compter(x, vOu), debut: x.k.indexOf(" " + mots[0]) === 0, lit: litOk(x), ex: exact(x) }; })
          // nom exact qui a des annonces (Shotrana = Chotrana), puis lieux avec annonces, puis nom exact sans annonce ; délégation avant localité
          .sort(function (a, b) { return ((b.ex && b.n > 0) - (a.ex && a.n > 0)) || (faible ? (b.lit - a.lit) : 0) || ((b.n > 0) - (a.n > 0)) || (b.ex - a.ex) || (a.x.r - b.x.r) || (b.debut - a.debut) || (b.n - a.n) || a.x.fr.localeCompare(b.x.fr, "fr"); });
        var restants = choix.length - 8;
        choix = choix.slice(0, 8);
        if (!choix.length) {
          boite.innerHTML = '<li class="ou-rien">' + L("Aucun lieu trouvé : vérifiez l’orthographe", "لم نجد هذا المكان: تحقق من الكتابة") + '</li>';
          boite.hidden = false; return;
        }
        var ar = document.documentElement.lang === "ar";
        boite.innerHTML = choix.map(function (c, i) {
          return '<li role="option" id="ou-' + i + '" data-i="' + i + '"><span class="ou-nom">' + E(ar ? c.x.ar || c.x.fr : c.x.fr) + '</span>' +
            '<span class="ou-sous">' + E(c.x.sous[ar ? 1 : 0]) + '</span><span class="ou-n">' + L(c.n + " annonce" + (c.n > 1 ? "s" : ""), iso(c.n) + " إعلان") + '</span></li>';
        }).join("") + (restants > 0 ? '<li class="ou-plus" aria-hidden="true">' + L(restants + " autre" + (restants > 1 ? "s" : "") + " lieu" + (restants > 1 ? "x" : "") +
          " de ce nom : ajoutez la ville (ex. « " + E(champ.value.trim()) + " Sousse »)", iso(restants) + " أماكن أخرى بهذا الاسم: أضف المدينة") + '</li>' : "");
        boite.hidden = false; champ.setAttribute("aria-expanded", "true");
      }
      function choisirLieu(c) {
        proches = {}; prochesTous = 7;
        if (selG && !gFixe) { selG.value = c.x.g; }
        suivreGouv();
        if (selD) { selD.value = c.x.d; suivreGouv(); }
        if (selL) selL.value = c.x.l;
        champ.value = c.x.fr; fermer();
        memoriser(filtrer());
        // 18/10/2026 (Ahmed : « quand on fait une recherche, la carte doit afficher directement cet endroit ») : la carte suit « Où ? »
        // et on la montre (la liste des annonces est juste dessous) ; sans carte sur la page : on va à la liste comme avant
        form.dispatchEvent(new CustomEvent("lieu-choisi", { bubbles: true }));
        // 26/10/2026 : si des quartiers proches sont proposés, on reste sur eux (la carte suit quand même le lieu choisi)
        var bp = document.getElementById("ou-proches");
        if (bp && !bp.hidden) { if (bp.scrollIntoView) bp.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
        var cz = document.getElementById("cp-carte"), l = cz || document.getElementById("liste");
        if (l && l.scrollIntoView) l.scrollIntoView({ behavior: "smooth", block: cz ? "center" : "start" });
      }
      // 27/10/2026 (Ahmed : « j'ai effacé la recherche mais la liste « Ajouter des quartiers proches » est restée ») : champ vidé (croix
      // du téléphone ou effacé à la main) = plus de lieu choisi ni de quartiers proches
      function videLieu() {
        if (champ.value.trim()) return;
        var avait = (selD && selD.value) || (selL && selL.value) || (selG && !gFixe && selG.value) || Object.keys(proches).length;
        if (!avait) return;
        proches = {}; prochesTous = 7;
        if (selG && !gFixe) selG.value = "";
        suivreGouv();
        if (selD) selD.value = ""; if (selL) selL.value = "";
        suivreGouv();
        memoriser(filtrer());
      }
      champ.addEventListener("input", videLieu);
      champ.addEventListener("search", videLieu);
      champ.addEventListener("input", proposer);
      champ.addEventListener("focus", proposer);
      champ.addEventListener("keydown", function (e) {
        var li = boite.querySelectorAll("li[role=option]");
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault(); if (!li.length) return;
          actif = (actif + (e.key === "ArrowDown" ? 1 : -1) + li.length) % li.length;
          for (var i = 0; i < li.length; i++) li[i].classList.toggle("actif", i === actif);
          champ.setAttribute("aria-activedescendant", "ou-" + actif);
        } else if (e.key === "Enter") {
          if (choix.length && !boite.hidden) { e.preventDefault(); choisirLieu(choix[actif >= 0 ? actif : 0]); }
        } else if (e.key === "Escape") fermer();
      });
      boite.addEventListener("mousedown", function (e) { e.preventDefault(); });   // garder le champ actif pendant le clic
      boite.addEventListener("click", function (e) {
        var li = e.target.closest && e.target.closest("li[role=option]");
        if (li) choisirLieu(choix[+li.getAttribute("data-i")]);
      });
      document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".champ-ou")) fermer(); });
      form.addEventListener("reset", function () { fermer(); });
    }
    var dernierG = null, dernierD = null;
    function suivreGouv() {           // le gouvernorat ou la délégation a changé (menu, adresse, bouton Effacer) : nouvelles listes
      var g = selG ? selG.value : "";
      if (g !== dernierG) {
        if (dernierG !== null) { if (selD) selD.value = ""; if (selL) selL.value = ""; }
        dernierG = g; remplirDelegs(); dernierD = null;
      }
      var d = selD ? selD.value : "";
      if (d !== dernierD) {
        if (dernierD !== null && selL) selL.value = "";
        dernierD = d; remplirLocalites();
      }
    }
    var selY = form.querySelector('[name="y"]'), qy = q.get("y");
    if (selY && qy && TGROUPES[qy] && !selY.querySelector('option[value="' + qy + '"]')) {   // ancien lien ?y=local (« Bureau / local ») : choix ajouté
      var oy = document.createElement("option"); oy.value = qy;
      oy.setAttribute("data-fr", "Bureau / local (tous)"); oy.setAttribute("data-ar", "مكتب / محل (الكل)");
      oy.textContent = document.documentElement.lang === "ar" ? "مكتب / محل (الكل)" : "Bureau / local (tous)"; selY.appendChild(oy);
    }
    ["y", "g", "p", "pmin", "smin", "smax", "c", "v", "fo", "du", "et", "nv", "st", "eb"].forEach(function (k) { var c = form.querySelector('[name="' + k + '"]'); if (c && q.get(k) !== null && q.get(k) !== "") c.value = q.get(k); });
    // 21/10/2026 (Ahmed) : atouts COMMUNS avec l'estimation (donnees/criteres.js) : refaits selon le type et l'onglet Acheter / Louer,
    // AVANT la lecture de « ?at=… » et avant chaque nouveau filtrage (phase de capture)
    var contAt = form.querySelector('.cases-atouts[data-atouts="at"]');
    function refaireAtouts() {
      if (!contAt || !window.remplirAtouts) return;
      var t = form.querySelector('input[name="t"]:checked'), tv = t ? t.value : "";
      var n = window.remplirAtouts(contAt, tv === "v" ? "vente" : tv === "l" ? "location" : "", selY ? selY.value : "", "at", false);
      if (contAt.parentNode) contAt.parentNode.hidden = !n;
    }
    refaireAtouts();
    form.addEventListener("change", function (e) { if (e.target === selY || e.target.name === "t") refaireAtouts(); }, true);
    form.addEventListener("reset", function () { setTimeout(refaireAtouts, 0); });
    var casePh = form.querySelector('[name="ph"]'); if (casePh && q.get("ph")) casePh.checked = true;   // ?ph=1 : seulement avec photo
    var casePb = form.querySelector('[name="pb"]'); if (casePb && q.get("pb")) casePb.checked = true;   // ?pb=1 : prix en baisse
    // ATOUTS (20/10/2026, Ahmed : « une maison pied dans l'eau ») : ?at=em -> cases cochées (codes de a.at, robot/collecter.py)
    // 22/10/2026 : « Pied dans l'eau » (e) fusionné dans « Vue ou bord de mer » (m) : un ancien lien ?at=e coche « bord de mer »
    (q.get("at") || "").replace(/e/g, "m").split("").forEach(function (c) { var x = form.querySelector('input[name="at"][value="' + c + '"]'); if (x) x.checked = true; });
    suivreGouv();
    // ?d=raoued&l=… ; un ancien lien avec seulement ?l=<quartier> retrouve sa délégation
    function delegDeLoc(g, l) {      // délégation d'un quartier (LIEUX.o) ou d'une localité officielle (DECOUPAGE)
      if (OF[g + "/" + l]) return slug(OF[g + "/" + l][0]);
      var d = (DEC[g] || []).filter(function (x) { return x[2].some(function (y) { return slug(y[0]) === l; }); })[0];
      return d ? slug(d[0]) : "";
    }
    var qd = q.get("d") || (q.get("l") ? delegDeLoc(gCourant(), q.get("l")) : "");
    if (selD && qd) { selD.value = qd; suivreGouv(); }
    if (selL && q.get("l")) selL.value = q.get("l");
    // recherche simple (18/10/2026, « comme SeLoger ») : « + Plus de filtres » s'ouvre seul si l'adresse contient un de ses filtres,
    // et affiche combien de filtres sont choisis ; un onglet Acheter / Louer déjà choisi se désélectionne d'un 2e toucher ;
    // « Estimer » montre les deux estimations (prix de vente, loyer)
    var plusF = form.querySelector(".plus-filtres"), nbF = form.querySelector(".nb-filtres");
    var CLES_F = ["y", "d", "l", "c", "fo", "pmin", "p", "smin", "smax", "v", "ph", "pb", "at", "et", "nv", "st", "eb"].concat(gFixe ? [] : ["g"]);
    function compterFiltres() {
      var n = CLES_F.filter(function (k) { return [].some.call(form.querySelectorAll('[name="' + k + '"]'), function (c) { return c.type === "checkbox" ? c.checked : c.value; }); }).length;
      if (nbF) { nbF.hidden = !n; nbF.textContent = n; }
      return n;
    }
    if (plusF && (CLES_F.some(function (k) { return q.get(k); }) || compterFiltres())) plusF.open = true;
    form.addEventListener("change", compterFiltres); form.addEventListener("input", compterFiltres);
    form.addEventListener("reset", function () { setTimeout(compterFiltres, 0); });
    // Acheter / Louer (dans l'onglet « Annonces », 22/10/2026) : un choix déjà fait se désélectionne d'un 2e toucher (= tout)
    [].forEach.call(form.querySelectorAll('.seg input[name="t"], .onglet input[name="t"]'), function (r) {
      var avant = false;
      r.parentNode.addEventListener("pointerdown", function () { avant = r.checked; });
      r.addEventListener("click", function () {
        if (avant) { r.checked = false; avant = false; r.dispatchEvent(new Event("change", { bubbles: true })); }
      });
    });
    // 3 onglets (22/10/2026, Ahmed) : « Annonces » (recherche, filtres, bouton « Être alerté ») ou « Estimer votre bien » (prix de
    // vente, loyer ; PAS d'alerte : « le bouton alerte ne doit apparaître que dans la section annonces »)
    // 23/10/2026 (Ahmed) : 4e onglet « Agences » : recherche des agences de l'annuaire (pros.clicvia.com), comme l'onglet Estimer
    var bEst = form.querySelector(".onglet-estimer"), bAnn = form.querySelector(".onglet-annonces"), bAg = form.querySelector(".onglet-agences"),
      bVac = form.querySelector(".onglet-vacances"), bInv = form.querySelector("button.onglet-investir");
    // 27/10/2026 (Ahmed) : onglet « Vacances » = locations à la nuit / au jour, logements seulement (durée et type fixés, jamais choisis) ;
    // onglet « Annonces » = ventes et locations AU MOIS. La durée est gardée dans le champ caché « du » (adresse ?du=c = Vacances).
    var champDu = form.querySelector('[name="du"]'), selTy = form.querySelector('[name="y"]');
    var HABITATION = ["", "appartement", "maison"];
    function typesVacances(on) {
      if (!selTy) return;
      [].forEach.call(selTy.querySelectorAll("optgroup"), function (g) {
        var garde = [].some.call(g.querySelectorAll("option"), function (o) { return HABITATION.indexOf(o.value) > 0; });
        g.hidden = on && !garde;
      });
      [].forEach.call(selTy.querySelectorAll("option"), function (o) { o.hidden = on && HABITATION.indexOf(o.value) < 0; });
      if (on && HABITATION.indexOf(selTy.value) < 0) { selTy.value = ""; selTy.dispatchEvent(new Event("change", { bubbles: true })); }
    }
    function mode(m) {          // "annonces" | "vacances" | "estimer" | "agences" (true / false : ancien appel, estimer ou annonces)
      m = m === true ? "estimer" : m === false ? "annonces" : m;
      var pe = form.querySelector(".panneau-estimer"), pa = form.querySelector(".panneau-agences"), al = document.getElementById("c-alerte"),
        iv = form.querySelector(".info-vacances"), vac = m === "vacances", avant = champDu ? champDu.value : "";
      if (bEst) bEst.setAttribute("aria-pressed", m === "estimer" ? "true" : "false");
      if (bAnn) bAnn.setAttribute("aria-pressed", m === "annonces" ? "true" : "false");
      if (bVac) bVac.setAttribute("aria-pressed", vac ? "true" : "false");
      if (bAg) bAg.setAttribute("aria-pressed", m === "agences" ? "true" : "false");
      if (bInv) bInv.setAttribute("aria-pressed", m === "investir" ? "true" : "false");
      var pinv = form.querySelector(".panneau-investir"); if (pinv) pinv.hidden = m !== "investir";
      form.classList.toggle("mode-estimer", m === "estimer" || m === "agences" || m === "investir"); form.classList.toggle("mode-agences", m === "agences");
      form.classList.toggle("mode-vacances", vac);
      if (pe) pe.hidden = m !== "estimer";
      if (pa) pa.hidden = m !== "agences";
      if (iv) iv.hidden = !vac;
      if (al) (al.closest("nav") || al).hidden = m !== "annonces" && !vac;
      if (m === "annonces" || vac) {
        if (champDu) champDu.value = vac ? "c" : "";
        if (vac) { var rl = form.querySelector('input[name="t"][value="l"]'); if (rl) rl.checked = true; }
        typesVacances(vac);
        if (champDu && champDu.value !== avant) form.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    if (bEst) bEst.addEventListener("click", function () { mode("estimer"); });
    if (bAnn) bAnn.addEventListener("click", function () { mode("annonces"); });
    if (bVac) bVac.addEventListener("click", function () { mode("vacances"); });
    if (bInv) bInv.addEventListener("click", function () { mode("investir"); });
    // « Voir le résultat » (27/10/2026) : la page investir/ s'ouvre avec ces choix (?t=&g=&b=), modifiables là-bas
    var piV = document.getElementById("pi-voir");
    function lienInvestir() {
      if (!piV) return;
      var base = piV.getAttribute("href").split("?")[0].split("#")[0], p = new URLSearchParams();
      [].forEach.call(form.querySelectorAll("[data-investir]"), function (c) { var x = String(c.value || "").trim(); if (x) p.set(c.getAttribute("data-investir"), x); });
      if (document.documentElement.lang === "ar") p.set("lang", "ar");
      piV.setAttribute("href", base + (p.toString() ? "?" + p.toString() : "") + "#inv-resultat");
    }
    [].forEach.call(form.querySelectorAll("[data-investir]"), function (c) { c.addEventListener("change", lienInvestir); c.addEventListener("input", lienInvestir); });
    document.addEventListener("langue", lienInvestir);
    lienInvestir();
    if (q.get("du") === "c") mode("vacances");
    if (bAg) bAg.addEventListener("click", function () { mode("agences"); });
    var agG = form.querySelector('[data-agences="g"]'), agQ = form.querySelector('[data-agences="q"]'), agV = document.getElementById("ag-voir");
    function lienAgences() {
      if (!agV) return;
      var base = agV.getAttribute("href").split("?")[0], p = new URLSearchParams();
      if (agG && agG.value) p.set("g", agG.value);
      if (agQ && agQ.value.trim()) p.set("q", agQ.value.trim().slice(0, 60));
      if (document.documentElement.lang === "ar") p.set("lang", "ar");
      p.set("depuis", "immobilier");          // la page des agences montre alors « ← Immobilier Tunisie by IA »
      agV.setAttribute("href", base + "?" + p.toString());
    }
    if (agG) agG.addEventListener("change", lienAgences);
    if (agQ) { agQ.addEventListener("input", lienAgences); agQ.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); lienAgences(); if (agV) agV.click(); } }); }
    document.addEventListener("langue", lienAgences);
    lienAgences();
    form.addEventListener("reset", function () { setTimeout(function () { dernierG = null; dernierD = null; suivreGouv(); memoriser(filtrer()); }, 0); });
    if (q.get("tri") && tri) tri.value = q.get("tri");
    // champs selon le type APRÈS la lecture de l'adresse (20/10/2026 : ?y=commerce&at=mp gardait les atouts visibles et cochés ;
    // la règle de page.js ne tournait qu'au chargement, avant que le type ne soit relu ici)
    if (window.appliquerChamps) window.appliquerChamps(form);

    function valeurs() {
      var t = form.querySelector('input[name="t"]:checked');
      var g = form.querySelector('[name="g"]');
      var n = function (k) { var x = parseInt((form.querySelector('[name="' + k + '"]') || {}).value, 10); return x > 0 ? x : 0; };
      var val = function (k) { return (form.querySelector('[name="' + k + '"]') || {}).value || ""; };
      var utileY = function (champ) { return !window.champUtile || window.champUtile(champ, val("y")); };
      return { t: t ? t.value : "", y: val("y"), g: g ? g.value : "", d: val("d"), l: val("l"), lx: val("l") ? Object.keys(proches) : [], c: (window.champUtile && !window.champUtile("pieces", val("y"))) ? 0 : n("c"), v: val("v"),
               fo: (window.champUtile && !window.champUtile("fonds", val("y"))) ? "" : val("fo"), du: form.classList.contains("mode-vacances") ? "c" : (val("du") === "m" ? "m" : ""),
               p: n("p"), pmin: n("pmin"), smin: n("smin"), smax: n("smax"), ph: casePh && casePh.checked ? 1 : 0, pb: casePb && casePb.checked ? 1 : 0, tri: tri ? tri.value : "photo",
               at: [].map.call(form.querySelectorAll('input[name="at"]:checked'), function (x) { return x.value; }).join(""),
               // mêmes champs que l'estimation (21/10/2026) : un champ caché pour ce type ne filtre jamais
               et: utileY("etage") ? val("et") : "", nv: utileY("niveaux") ? val("nv") : "", st: utileY("standing") ? val("st") : "", eb: utileY("etat") ? val("eb") : "",
               // zone dessinée : seulement quand la carte (et les positions des quartiers) est chargée
               z: window.CARTE_PRIX && window.ZONE_CARTE && window.ZONE_CARTE.length >= 3 ? window.ZONE_CARTE : null };
    }
    // 22/10/2026 (Ahmed : « Béni Khalled (13) mais Voir les 0 annonces ») : UN seul test d'annonce pour la liste ET pour les nombres
    // des menus ; sauf = filtres à ignorer (le nombre d'une délégation compte les annonces qui passent TOUS les autres filtres)
    function passe(a, v, sauf) {
        if (v.t && a.t !== v.t) return false;
        if (!sauf.y && v.y && !typeVoulu(a, v.y)) return false;
        var proche = !sauf.l && v.l && v.lx && v.lx.length && a.l && v.lx.indexOf(a.g + "/" + a.l) >= 0;   // quartier proche ajouté
        if (!proche) {
          if (!sauf.g && v.g && a.g !== v.g) return false;
          if (!sauf.d && v.d && !dansDeleg(a, v.d)) return false;
          if (!sauf.l && v.l && !dansLoc(a, v.l)) return false;
        }
        if (v.c && (a.c == null || (v.c >= 5 ? a.c < 5 : a.c !== v.c))) return false;
        if (v.fo && a.fo !== v.fo) return false;
        // durée de la location (22/10/2026, Ahmed : « la location par jour, par journée ou par nuit ») : c = à la nuit / au jour /
        // vacances, m = au mois (location habituelle)
        if (v.du === "c" && !(a.t === "l" && a.lc && (a.y === "appartement" || a.y === "maison"))) return false;   // Vacances : logements seulement
        if (v.du === "m" && !(a.t === "l" && !a.lc)) return false;
        if (v.du !== "c" && a.lc) return false;         // onglet « Annonces » (27/10/2026, Ahmed) : jamais une location à la nuit / au jour
        // étage, niveaux, standing, état (21/10/2026, mêmes critères que l'estimation ; codes de robot/criteres.py)
        if (v.et !== "" && a.et !== +v.et) return false;
        if (v.nv && a.nv !== +v.nv) return false;
        var aat = a.at || "";
        if (v.st === "haut" && aat.indexOf("s") < 0) return false;
        if (v.st === "normal" && aat.indexOf("s") >= 0) return false;
        if (v.eb && { neuf: aat.indexOf("n") < 0, renove: aat.indexOf("w") < 0, a_renover: aat.indexOf("x") < 0, bon: aat.indexOf("x") >= 0 }[v.eb]) return false;     // local seul / murs + fonds / fonds de commerce (20/10/2026) ; inconnu : jamais montré sous un choix
        if (v.v && (a.v || "a") !== v.v && !(v.v === "p" && a.v === "d")) return false;   // « Particulier » : aussi les annonces déposées ici
        // un prix à la nuit n'est jamais comparé à un loyer au mois (22/10/2026)
        if (v.p || v.pmin) { if (a.p == null || (a.lc && v.du !== "c")) { if (sauf.compte !== false) sansPrix++; return false; } if ((v.p && a.p > v.p) || (v.pmin && a.p < v.pmin)) return false; }
        if (v.ph && !aPhoto(a)) return false;
        if (v.pb && !(a.pb > 0)) return false;          // « Baisses de prix seulement » (25/10/2026)
        if (v.smin || v.smax) { if (a.s == null) return false; if ((v.smin && a.s < v.smin) || (v.smax && a.s > v.smax)) return false; }
        if (v.at && !v.at.split("").every(function (c) { return (a.at || "").indexOf(c) >= 0; })) return false;   // tous les atouts cochés
        // zone dessinée (en DERNIER : « sans position » compte seulement les annonces qui passent tous les autres filtres)
        if (v.z) { var ps = posDe(a); if (!ps) { if (sauf.compte !== false) sansPos++; return false; } if (!dansPolygone(ps, v.z)) return false; }
        return true;
    }
    // nombres entre parenthèses des menus (gouvernorat, type, délégation, localité) : ceux de la recherche en cours
    function avecNombre(o, n, brut) {     // brut : nombre sans séparateur (menus délégation / localité, comme remplirDelegs)
      var ara = document.documentElement.lang === "ar", nf = brut ? String(n) : nb(n);
      ["fr", "ar"].forEach(function (l) { var x = o.getAttribute("data-" + l); if (x) o.setAttribute("data-" + l, x.replace(/ \([^()]*\)$/, "") + " (" + (l === "ar" ? iso(nf) : nf) + ")"); });
      o.textContent = o.getAttribute(ara ? "data-ar" : "data-fr") || o.textContent;
    }
    function majComptes(v) {
      var sansD = { d: 1, l: 1, compte: false }, sel;
      if ((sel = form.querySelector('[name="g"]')) && sel.tagName === "SELECT") {
        var ng = {}; tout.forEach(function (a) { if (passe(a, v, { g: 1, d: 1, l: 1, compte: false })) ng[a.g] = (ng[a.g] || 0) + 1; });
        [].forEach.call(sel.options, function (o) { if (o.value) avecNombre(o, ng[o.value] || 0); });
      }
      if ((sel = form.querySelector('[name="y"]'))) {
        var base = tout.filter(function (a) { return passe(a, v, { y: 1, compte: false }); });
        [].forEach.call(sel.options, function (o) { if (o.value) avecNombre(o, base.filter(function (a) { return typeVoulu(a, o.value); }).length); });
      }
      if (selD && !selD.disabled) {
        var dans = tout.filter(function (a) { return a.g === gCourant() && passe(a, v, sansD); });
        [].forEach.call(selD.options, function (o) { if (o.value) avecNombre(o, dans.filter(function (a) { return dansDeleg(a, o.value); }).length, 1); });
        if (selL && !selL.disabled) {
          var dansd = v.d ? dans.filter(function (a) { return dansDeleg(a, v.d); }) : dans;
          [].forEach.call(selL.options, function (o) { if (o.value) avecNombre(o, dansd.filter(function (a) { return dansLoc(a, o.value); }).length, 1); });
        }
      }
    }
    function filtrer() {
      suivreGouv();
      var v = valeurs();
      sansPrix = 0; sansPos = 0;
      liste = tout.filter(function (a) { return passe(a, v, {}); });
      majComptes(v);      var cle = { "prix-asc": function (a, b) { return (a.p == null) - (b.p == null) || a.p - b.p; },
                  "prix-desc": function (a, b) { return (a.p == null) - (b.p == null) || b.p - a.p; },
                  "surface": function (a, b) { return (b.s || 0) - (a.s || 0); },
                  // prix au m² le moins cher (20/10/2026) : seulement prix SÛR et surface connue ; les autres à la fin
                  "m2-asc": function (a, b) { var x = a.p && a.s ? a.p / a.s : null, y = b.p && b.s ? b.p / b.s : null; return (x == null) - (y == null) || x - y; },
                  "photo": function (a, b) { return ((b.av || 0) - (a.av || 0)) || (aPhoto(b) - aPhoto(a)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); },
                  "date": function (a, b) { return ((b.av || 0) - (a.av || 0)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); },
                  // 25/10/2026 (Ahmed) : badge « Nouveau » d'abord (nw), ou plus forte baisse de prix d'abord (pb), puis les plus récentes
                  "nouveau": function (a, b) { return ((b.nw || 0) - (a.nw || 0)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); },
                  "baisse": function (a, b) { return ((b.pb || 0) - (a.pb || 0)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); } }[v.tri] || null;
      // 21/10/2026 (Ahmed) : trier par AVIS DE L'IA (le même que sous chaque annonce, avisIA) : les annonces qui ont cet avis d'abord
      // (plus forte baisse ou hausse d'abord), puis les autres, les plus récentes d'abord
      if (!cle && /^avis-[bnhxi]$/.test(v.tri || "")) {
        // (site léger : « ix » = [sorte, écart] écrit par le robot ; sinon calculé sur « ia »)
        var ixDe = function (a) { if (a.ix) return a.ix; var x = a.p != null && a.ia; return !x ? ["", 0] : [x.i ? "i" : x.x ? "x" : x.v, Math.abs(x.p || 0)]; };
        var voulu = v.tri.slice(5), sorte = function (a) { return ixDe(a)[0]; };
        cle = function (a, b) {
          var ma = sorte(a) === voulu, mb = sorte(b) === voulu;
          if (ma !== mb) return ma ? -1 : 1;
          if (ma && (voulu === "b" || voulu === "h")) { var d = ixDe(b)[1] - ixDe(a)[1]; if (d) return d; }
          return a.d < b.d ? 1 : a.d > b.d ? -1 : 0;
        };
      }
      // 23/10/2026 (Ahmed) : « avis de l'IA sur le bien, le meilleur d'abord » : bon bien, puis classique, puis moins complet, puis sans
      // avis ; à verdict égal, le plus de points forts et le moins de points faibles, puis les plus récentes
      if (!cle && v.tri === "bien") {
        // (site léger : « ax » = [verdict, points forts − faibles] écrit par le robot ; sinon calculé sur « ab »)
        var axDe = function (a) { if (a.ax) return a.ax; var x = a.ab; return !x ? null : [x.v, (x.f || []).length - (x.w || []).length]; };
        var rangB = function (a) { var x = axDe(a); return !x ? 9 : { h: 0, n: 1, b: 2 }[x[0]] !== undefined ? { h: 0, n: 1, b: 2 }[x[0]] : 3; };
        var soldeB = function (a) { var x = axDe(a); return x ? x[1] : 0; };
        cle = function (a, b) { return (rangB(a) - rangB(b)) || (soldeB(b) - soldeB(a)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); };
      }
      if (cle) liste.sort(cle);
      window.FILTRE_AT = v.at;      // 23/10/2026 : atouts cherchés, confirmés dans l'avis sur le bien (« Votre recherche : … »)
      montre = 0;
      afficher(premier, true);      // la liste d'avant reste jusqu'à ce que les nouvelles cartes soient prêtes (pas de page blanche)
      var n = liste.length;
      // bouton « Voir les N annonces » de la recherche simple (18/10/2026 : remplace la tuile « Voir N annonces » de la carte IA)
      var nbB = form.querySelector(".nb-annonces");
      if (nbB) nbB.innerHTML = L("les " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") + " ", iso(n) + " ");   // espace fine insécable : le nombre ne se coupe pas
      res.innerHTML = L(n + " annonce" + (n > 1 ? "s" : "") + (sansPrix ? " (" + sansPrix + " sans prix affiché, masquées par le prix maximum)" : ""),
                        iso(n) + " إعلان" + (sansPrix ? " (" + iso(sansPrix) + " دون سعر، أُخفيت بسبب السعر الأقصى)" : ""));
      if (v.z) res.innerHTML += L(" dans la zone dessinée" + (sansPos ? " (" + sansPos + " sans position connue, exclues)" : ""),
                                  " في المنطقة المرسومة" + (sansPos ? " (" + iso(sansPos) + " دون موقع معروف، مستبعدة)" : ""));
      // même nombre sur la carte et dans la liste : la ligne sous la carte est écrite ici, avec le résultat de passe()
      var zi = document.getElementById("cp-zone-info");
      if (zi) {
        zi.hidden = !v.z;
        zi.innerHTML = !v.z ? "" : L("Zone dessinée : <b>" + n + "</b> annonce" + (n > 1 ? "s" : "") + (sansPos ? " · " + sansPos + " sans position connue, exclues" : "") +
          ". Les alertes ne tiennent pas compte de la zone.", "المنطقة المرسومة: <b>" + iso(n) + "</b> إعلان" + (sansPos ? " · " + iso(sansPos) + " دون موقع معروف، مستبعدة" : "") + ". التنبيهات لا تأخذ المنطقة بعين الاعتبار.");
      }
      montrerProches(v);
      if (res.parentNode && res.parentNode.classList) res.parentNode.classList.toggle("long", !!(sansPrix || v.z));   // précision ajoutée : la ligne peut passer à la ligne
      if (!n) {
        // localité ou délégation vide : on propose tout de suite le niveau au-dessus (délégation, puis gouvernorat)
        var plusLarge = "";
        if (v.l && selD && selD.value) plusLarge = ["l", selD.options[selD.selectedIndex].textContent];
        else if (v.d && selG && selG.value && !gFixe) plusLarge = ["d", selG.options[selG.selectedIndex].textContent];
        zone.innerHTML = '<p class="vide-msg">' + L("Aucune annonce ne correspond. Essayez avec moins de filtres.", "لا يوجد إعلان مطابق. جرّب بفلاتر أقل.") +
          (plusLarge ? '<br><button type="button" class="btn-elargir" data-vider="' + plusLarge[0] + '">' + L("Voir toutes les annonces de ", "عرض كل إعلانات ") + E(plusLarge[1].replace(/ \(\d+\)$/, "")) + '</button>' : "") + '</p>';
      }
      return v;
    }
    // liste « Ajouter des quartiers proches ? » sous la case « Où ? » (nombres = ceux de la recherche en cours, sans le lieu)
    var boiteP = document.getElementById("ou-proches"), prochesTous = 7;
    function montrerProches(v) {
      if (!boiteP) return;
      var g = gCourant(), ici = g && v.l ? PQ[g + "/" + v.l] : null;
      var vider = function () { boiteP.hidden = true; boiteP.innerHTML = ""; boiteP.removeAttribute("data-html"); };
      if (!ici || lFixe) { vider(); return; }
      var n = {};
      tout.forEach(function (a) { if (a.l && passe(a, v, { g: 1, d: 1, l: 1, compte: false })) n[a.g + "/" + a.l] = (n[a.g + "/" + a.l] || 0) + 1; });
      // jamais une délégation entière (sa « position » est un centre : la distance ne voudrait rien dire)
      var cands = Object.keys(PQ).filter(function (k) { return k !== g + "/" + v.l && LX.l[k] && n[k] && !(OF[k] && slug(OF[k][0]) === slug(LX.l[k][0])); })
        .map(function (k) { return { k: k, km: km(ici, PQ[k]) }; })
        .filter(function (x) { return x.km <= PROCHES_KM && !(x.k.split("/")[0] === g && memeNom(x.k.split("/")[1], v.l)); })
        .sort(function (x, y) { return x.km - y.km; });
      if (!cands.length) { vider(); return; }
      var ar = document.documentElement.lang === "ar", vus = cands.slice(0, prochesTous);
      cands.forEach(function (x) { if (proches[x.k] && vus.indexOf(x) < 0) vus.push(x); });     // un quartier déjà ajouté reste visible
      var kmT = function (d) { var s = d < 10 ? (Math.round(d * 10) / 10).toFixed(1) : String(Math.round(d)); return s.replace(".", ar ? "٫" : ","); };
      var html = '<p class="pr-titre">' + L("Ajouter des quartiers proches ?", "إضافة أحياء قريبة؟") + '</p><ul class="pr-liste">' +
        vus.map(function (x) {
          var on = !!proches[x.k], nom = LX.l[x.k];
          return '<li><button type="button" class="pr-item" data-k="' + E(x.k) + '" aria-pressed="' + on + '">' +
            '<span class="pr-plus" aria-hidden="true">' + (on ? "✓" : "+") + '</span>' +
            '<span class="pr-km">' + L(kmT(x.km) + "\u00a0km", kmT(x.km) + "\u00a0كم") + '</span>' +
            '<span class="pr-nom">' + E(ar ? nom[1] || nom[0] : nom[0]) + '</span>' +
            '<span class="pr-n">' + (ar ? iso(n[x.k]) : n[x.k]) + '</span></button></li>';
        }).join("") + '</ul>' +
        (cands.length > vus.length ? '<button type="button" class="pr-voir-plus">' + L("Voir plus", "عرض المزيد") + '</button>' : "");
      // pas redessinée si rien ne change : la case « Où ? » qui perd le focus déclenche un filtrage au moment du toucher, et un
      // bouton remplacé entre l'appui et le relâché ne reçoit jamais le clic
      if (boiteP.getAttribute("data-html") !== html) { boiteP.innerHTML = html; boiteP.setAttribute("data-html", html); }
      boiteP.hidden = false;
    }
    if (boiteP) boiteP.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".pr-item, .pr-voir-plus");
      if (!b) return;
      if (b.classList.contains("pr-voir-plus")) prochesTous += 7;
      else { var k = b.getAttribute("data-k"); if (proches[k]) delete proches[k]; else proches[k] = 1; }
      memoriser(filtrer());
    });
    function oublierProches() { proches = {}; prochesTous = 7; }
    if (selL) selL.addEventListener("change", oublierProches, true);
    if (selD) selD.addEventListener("change", oublierProches, true);
    if (selG) selG.addEventListener("change", oublierProches, true);
    form.addEventListener("reset", oublierProches);
    // site léger (27/10/2026) : les détails (avis de l'IA, photo, lien, numéro) des cartes à montrer sont lus d'abord
    // (window.DETAILS_IMMO d'assets/page.js) ; déjà lus : tout de suite. « remplacer » : nouvelle recherche (la liste d'avant reste
    // affichée jusque-là) ; sinon les cartes s'ajoutent à leur place (repère), même si d'autres arrivent avant elles.
    var tour = 0, DET = window.DETAILS_IMMO;
    function afficher(k, remplacer) {
      var bout = liste.slice(montre, montre + k), t = remplacer ? ++tour : tour;
      montre += bout.length;
      if (plus) plus.hidden = montre >= liste.length;
      function poser(ici) {
        var h = bout.map(function (a) { return carte(a, racine); }).join("");
        if (remplacer) zone.innerHTML = h; else if (ici) { ici.insertAdjacentHTML("beforebegin", h); ici.remove(); } else zone.insertAdjacentHTML("beforeend", h);
        if (window.AVIS_IA) window.AVIS_IA.appliquer();       // bouton + / − des nouvelles cartes : même état que les autres
      }
      if (!DET || DET.prets(bout)) { poser(null); window.LISTE_PRETE = Promise.resolve(); return window.LISTE_PRETE; }
      var ici = null;
      if (!remplacer) { ici = document.createElement("span"); ici.className = "an-attente"; ici.hidden = true; zone.appendChild(ici); }
      zone.setAttribute("aria-busy", "true");
      window.LISTE_PRETE = DET.charger(bout).then(function () {
        if (t !== tour || (ici && !ici.isConnected)) return;      // une autre recherche est passée entre-temps
        zone.removeAttribute("aria-busy");
        poser(ici);
      });
      return window.LISTE_PRETE;
    }
    function memoriser(v) {
      var p = new URLSearchParams();
      ["t", "y", "g", "d", "l", "c", "fo", "du", "v", "p", "pmin", "smin", "smax", "ph", "pb", "at", "et", "nv", "st", "eb"].forEach(function (k) { if (v[k] || (k === "et" && v[k] === "0")) p.set(k, v[k]); }); if (v.tri && v.tri !== "photo") p.set("tri", v.tri);
      // zone : écrite telle quelle ; carte pas encore chargée (ZONE_CARTE pas encore lue) : celle de l'adresse est gardée
      var avant = new URLSearchParams(location.search);
      if (v.z) p.set("z", ecrireZone(v.z)); else if (window.ZONE_CARTE === undefined && lireZone(avant.get("z"))) p.set("z", avant.get("z"));
      if (v.lx && v.lx.length) p.set("lx", v.lx.join(","));
      var l = avant.get("lang"); if (l) p.set("lang", l);
      try { history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); } catch (e) {}
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      memoriser(filtrer());
      var l = document.getElementById("liste"); if (l && l.scrollIntoView) l.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("change", function () { memoriser(filtrer()); });
    document.addEventListener("zone-carte", function () { memoriser(filtrer()); });   // zone dessinée ou effacée (carte-prix.js)
    if (tri) tri.addEventListener("change", function () { memoriser(filtrer()); });
    if (plus) plus.addEventListener("click", function () { afficher(PAS); });
    zone.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".btn-elargir");
      if (!b) return;
      if (b.getAttribute("data-vider") === "l") selL.value = ""; else { selD.value = ""; selL.value = ""; }
      memoriser(filtrer());
    });
    ouChercher();
    filtrer();
    // lien d'une annonce partagée (?a=<id>, 19/10/2026) : l'annonce en tête de la liste, avec « Annonce partagée avec vous »
    var qa = q.get("a");
    if (qa && zone) {
      var ann = tout.filter(function (x) { return x.i === qa; })[0];
      if (ann) (DET ? Promise.all([window.LISTE_PRETE, DET.charger([ann])]) : Promise.resolve()).then(function () {
        var ex = document.getElementById("a-" + qa); if (ex) ex.remove();
        zone.insertAdjacentHTML("afterbegin", '<div class="annonce-partagee" id="partagee"><p class="partagee-titre">' +
          L("Annonce partagée avec vous", "إعلان شاركه معك أحدهم") + '</p>' + carte(ann, racine) + '</div>');
        setTimeout(function () { var el = document.getElementById("partagee"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 400);
      }); else Promise.resolve(window.LISTE_PRETE).then(function () {   // après la 1re liste (site léger : elle peut arriver après)
        zone.insertAdjacentHTML("afterbegin", '<p class="vide-msg partagee-absente">' +
          L("Cette annonce n’est plus en ligne. Voici d’autres annonces.", "هذا الإعلان لم يعد متاحًا. إليك إعلانات أخرى.") + '</p>');
      });
    }
  }
  window.carteAnnonce = carte;   // utilisé par les tests
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
/* 25/10/2026 : toucher la photo ouvrait l'annonce d'origine ; RETIRÉ le 27/10/2026 (Ahmed : « maintenant les photos glissent sur notre carte,
   ça ne sert à rien d'ouvrir l'annonce d'origine ») : la photo glisse (assets/page.js), le lien d'origine est dans « Description et contact ». */
