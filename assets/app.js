/* Immobilier Tunisie — recherche et liste des annonces (accueil, pages de gouvernorat et de lieu).
   Données : donnees/annonces.js (window.ANNONCES) + donnees/lieux.js (window.LIEUX), écrits chaque semaine (le lundi) par le robot.
   Les cartes ont la même forme que celles écrites dans la page par robot/construire_site.py. */
(function () {
  var PAS = 24;
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
    var x = a.ia, LX = window.LIEUX || { g: {}, l: {} }, dt = function (v) { return L(nb(v) + " DT", iso(nb(v)) + " دينار"); };
    var li = a.l && LX.l[a.g + "/" + a.l], g = LX.g[a.g] || [a.g, a.g];
    // jamais tout le gouvernorat (règle d'Ahmed, 15/10/2026) : même quartier, ou même délégation officielle (x.dl = [FR, AR])
    var ou = x.pr ? L(" à moins de 1,5 km", " على أقل من 1,5 كم") : x.z === "q" ? L(" à " + E(li ? li[0] : (a.n || g[0])), " في " + (li ? li[1] : g[1])) : L(" dans la délégation de " + E((x.dl || [""])[0]), " في معتمدية " + E((x.dl || ["", ""])[1] || (x.dl || [""])[0]));
    // comparaison AU M² quand la surface est connue (15/10/2026) : x.m2 = [ce bien, médiane, bas, haut] en DT/m²
    var m2 = x.m2, m2t = function (v) { return v < 100 ? String(v).replace(".", ",") : nb(v); },
      dm2 = function (v) { return L(m2t(v) + " DT/m²", iso(m2t(v)) + " دينار/م²"); };
    // sorte du logement (duplex, villas…) : comparé seulement à la même sorte (15/10/2026)
    var SORTES = { etage_villa: ["étages de villa", "طوابق فيلا"], duplex: ["duplex", "دوبلكس"], penthouse: ["penthouses", "بنتهاوس"], studio: ["studios", "ستوديوهات"], villa: ["villas", "فيلات"], maison_trad: ["maisons traditionnelles", "منازل تقليدية"] };
    var so = SORTES[x.st], ann = L(x.n + " annonces semblables" + (so ? " (" + so[0] + ")" : ""), iso(x.n) + " إعلانات مشابهة" + (so ? " (" + so[1] + ")" : ""));
    var sembl = x.z === "m" ? L("l’estimation de notre IA (≈ ", "تقدير ذكائنا الاصطناعي (≈ ") + dt(x.r) + ")"
      : m2 ? ann + ou + L(", au m² (la moitié entre ", "، بالمتر المربع (نصفها بين ") + dm2(m2[2]) + L(" et ", " و") + dm2(m2[3]) + ")"
      : ann + ou + " (" + L("de ", "من ") + dt(x.lo) + L(" à ", " إلى ") + dt(x.hi) + ")";
    var quoi = loc ? ["Loyer", "الكراء"] : ["Prix", "السعر"], t, pre = m2 ? dm2(m2[0]) + L(", ", "، ") : "";
    // modèle seul et prix très dispersés (17/10/2026) : pas de verdict, seulement l'estimation
    if (x.i) t = L("Notre IA l’estime à ≈ ", "يقدّره ذكاؤنا الاصطناعي بـ ≈ ") + dt(x.r) + L(" ; les prix sont trop différents dans ce secteur pour dire si c’est cher ou une bonne affaire : comparez avec soin", "؛ الأسعار متفاوتة جدًا هنا للحكم إن كان غاليًا أو صفقة جيدة: قارن بعناية");
    else if (x.x) t = L("Avis partagé", "رأي متباين") + (m2 ? L(" : ", ": ") + dm2(m2[0]) : "") + L(" : comparé à ", ": مقارنة بـ ") + sembl +
      L(", mais notre modèle d’IA l’estime à ≈ ", "، لكن نموذجنا يقدّره بـ ≈ ") + dt(x.e) + L(" : comparez avec soin", ": قارن بعناية");   // annonces semblables et modèle pas d'accord
    else if (x.v === "n") t = L(quoi[0] + " dans la norme", quoi[1] + " في المعدّل") + (m2 ? L(" : ", ": ") + dm2(m2[0]) : "") + L(", comparé à ", "، مقارنة بـ ") + sembl;
    else if (x.v === "b") t = pre + L(Math.abs(x.p) + " % sous ", iso(Math.abs(x.p)) + " % أقل من ") + sembl + L(" : peut-être une bonne affaire, vérifiez l’état du bien", ": ربما صفقة جيدة، تحقّق من حالة العقار");
    else t = pre + L(x.p + " % au-dessus de ", iso(x.p) + " % أعلى من ") + sembl + L(" : de la marge pour négocier, sauf vrais atouts", ": هامش للتفاوض، إلا إن كانت له مزايا حقيقية");
    var comps = (x.c || []).map(annonceParId).filter(Boolean).map(function (c) {
      var cl = c.l && LX.l[c.g + "/" + c.l];
      var cm = m2 && c.s ? c.p / c.s : null;
      return "<li>" + dt(c.p) + (c.c != null ? " · " + iso("S+" + c.c) : "") + (c.s ? " · " + L(nb(c.s) + " m²", iso(nb(c.s)) + " م²") : "") +
        (cm ? " (" + dm2(cm < 100 ? Math.round(cm * 10) / 10 : Math.round(cm)) + ")" : "") +
        (cl ? " · " + L(E(cl[0]), cl[1]) : "") + ' · <a href="' + U(c.u) + '" target="_blank" rel="noopener nofollow">' + L("voir", "شاهد") + "</a></li>";
    }).join("");
    var quatre = (x.c || []).length === 4 && x.n > 4;
    var plus = (comps ? "<p>" + L("Annonces comparées" + (quatre ? " (la moins chère, deux au milieu, la plus chère)" : "") + " :", "الإعلانات المقارنة" + (quatre ? " (الأرخص، اثنان في الوسط، الأغلى)" : "") + ":") + "</p><ul>" + comps + "</ul>" : "") +
      (x.e && x.z !== "m" ? "<p>" + L("Second avis, notre modèle d’IA : ≈ ", "رأي ثانٍ، نموذج الذكاء الاصطناعي: ≈ ") + dt(x.e) + ".</p>" : "") +
      (x.d ? "<p>" + L("⚠️ Les prix sont très différents dans ce secteur (meublé, saison, standing…) : comparez avec soin.", "⚠️ الأسعار متفاوتة جدًا هنا (مفروش، موسم، مستوى…): قارن بعناية.") + "</p>" : "") +
      prisEnCompte(x) +
      '<p><a href="' + (racine || "") + (loc ? "louer/" : "vendre/") + '">' + L(loc ? "Estimer le loyer d’un bien avec notre IA" : "Estimer le prix d’un bien avec notre IA", loc ? "قدّر كراء عقار بذكائنا الاصطناعي" : "قدّر سعر عقار بذكائنا الاصطناعي") + "</a></p>";
    return '<div class="an-ia an-ia-' + x.v + '">' + ICO_IA + '<div><p><b>' + L("Avis de l’IA", "رأي الذكاء الاصطناعي") + "</b> : " + t + "</p>" +
      '<details class="an-ia-plus"><summary>' + L("Pourquoi ?", "لماذا؟") + "</summary>" + plus + "</details></div></div>";
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
    var prix = a.p != null
      ? '<p class="an-prix"><strong>' + nb(a.p) + '</strong> <span class="dt">DT</span><span class="an-prix-note">' + (a.pn ? L("à partir de (programme neuf)", "ابتداءً من (مشروع جديد)") : loc ? L("loyer demandé", "الكراء المطلوب") : L("prix demandé", "السعر المطلوب")) + '</span></p>'
      : '<p class="an-prix sans">' + L("Prix communiqué par le vendeur", "السعر لدى البائع") + '</p>';
    if (a.p != null && a.ia) prix += avisIA(a, loc, racine);
    var faits = "";
    if (a.s) faits += '<li>' + ICO.surface + L(nb(a.s) + " m²", iso(nb(a.s) + " م²")) + '</li>';
    if (sn) faits += '<li>' + ICO.chambres + L("S+" + a.c, iso("S+" + a.c)) + '</li>';
    if (a.d) faits += '<li>' + ICO.date + L(dfr(a.d), iso(dfr(a.d))) + '</li>';
    var lieu = lfr ? L(E(lfr) + " · " + E(g[0]), lar + " · " + g[1]) : L(E(g[0]), g[1]);
    // annonce déposée chez nous : titre et texte écrits par la personne elle-même (classe « perso »)
    var depose = a.v === "d" && a.x;
    var titre = depose ? '<span class="perso" dir="auto">' + E(a.x) + '</span>' : L(E(tfr), tar);
    var sous = depose ? '<p class="an-type">' + L(E(tfr), tar) + '</p>' : "";
    var texte = depose && a.z ? '<details class="an-details"><summary>' + L("Lire la description", "قراءة الوصف") + '</summary><p class="perso an-texte" dir="auto">' + E(a.z) + '</p></details>' : "";
    // a.av : annonce MISE EN AVANT (Pass Propriétaire, 15/10/2026), étiquette visible
    return '<article class="annonce' + (a.av ? " en-avant" : "") + '" id="a-' + E(a.i) + '" data-t="' + a.t + '" data-y="' + a.y + '" data-v="' + (a.v || "p") + '">' +
      '<div class="an-tete"><div class="an-vignette v-' + a.y + '">' + (VIGNETTE[a.y] || VIGNETTE.autre || "") + '</div>' +
      '<div class="an-quoi"><span class="an-badge ' + (loc ? "louer" : "vendre") + '">' + (loc ? L("À louer", "للكراء") : L("À vendre", "للبيع")) + '</span>' +
      (a.av ? '<span class="an-badge avant">' + L("⭐ En avant", "⭐ مميّز") + '</span>' : "") +
      '<h3 class="an-titre">' + titre + '</h3>' + sous + '<p class="an-lieu">' + ICO.lieu + lieu + '</p></div>' +
      // cœur « Ajouter aux favoris » (18/10/2026, IM.15) : assets/page.js (window.FAVORIS), même bouton que bouton_favori() du robot
      (window.FAVORIS ? window.FAVORIS.bouton(a.i) : "") + '</div>' +
      prix + '<ul class="an-faits">' + faits + '</ul>' +
      // a.an : annonce de plus de 2 mois gardée pour un gouvernorat faible (17/10/2026), même texte que construire_site.py
      (a.an ? '<p class="an-ancienne">' + L("⏳ Annonce de plus de 2 mois : vérifiez qu’elle est toujours disponible.", "⏳ إعلان عمره أكثر من شهرين: تأكّد أنه ما زال متاحًا.") + '</p>' : "") +
      texte + actions(a, racine) + '</article>';
  }

  // Contact (décision d'Ahmed du 11/10/2026) — même logique que robot/construire_site.py, fonction actions()
  function actions(a, racine) {
    var url = U(a.u);
    var origine = '<a class="an-contact" href="' + url + '" target="_blank" rel="noopener nofollow">' + ICO.tel + L("Voir le numéro", "عرض الرقم") + ICO.lien + '</a>';
    // annonce vue sur Facebook, ajoutée par Ahmed (18/10/2026) : un seul bouton, vers Facebook (nom et numéro y sont, pas chez nous)
    if (/^https:\/\/(www\.|m\.|web\.)?facebook\.com\//.test(a.u || "")) return '<a class="an-contact an-fb" href="' + url + '" target="_blank" rel="noopener nofollow">' + L("Voir l’annonce sur Facebook", "عرض الإعلان على فيسبوك") + ICO.lien + '</a>';
    if (a.v === "a") {
      if (!a.tel) return origine;
      return '<div class="an-actions"><a class="an-appel" href="tel:' + E(a.tel.replace(/ /g, "")) + '" data-num="' + E(a.tel) + '">' + ICO.tel + L("Appeler l’agence", "اتصل بالوكالة") + '</a>' +
        '<a class="an-voir" href="' + url + '" target="_blank" rel="noopener nofollow">' + L("Voir l’annonce", "عرض الإعلان") + ICO.lien + '</a></div>';
    }
    if (a.v === "d") {
      if (!a.tel) return "";
      // « Afficher le numéro » puis Appeler + WhatsApp (le vendeur a coché la case) ; jamais de lien vers un autre site
      return '<div class="an-numero-bloc"><button class="an-numero" type="button">' + ICO.tel + L("Afficher le numéro", "إظهار الرقم") + '</button>' +
        '<div class="an-actions" hidden><a class="an-appel revele" href="tel:' + E(a.tel.replace(/ /g, "")) + '">' + E(a.tel) + '</a>' +
        '<a class="an-wa" href="https://wa.me/' + a.tel.replace(/\D/g, "") + '" target="_blank" rel="noopener">' + L("WhatsApp", "واتساب") + '</a></div></div>';
    }
    var q = "?ref=" + encodeURIComponent(a.i) + "&amp;t=" + (a.t === "l" ? "location" : "vente") + "&amp;y=" + a.y + "&amp;g=" + a.g + (a.l ? "&amp;l=" + encodeURIComponent(a.l) : "");
    return origine + '<a class="an-vendeur" href="' + racine + 'deposer/' + q + '">' + L("Vous êtes le vendeur ? <b>Ajoutez votre numéro gratuitement</b>", "أنت البائع؟ <b>أضف رقمك مجانًا</b>") + '</a>';
  }

  function demarrer() {
    var form = document.getElementById("recherche");
    var zone = document.getElementById("annonces");
    if (!form || !zone || !window.ANNONCES) return;
    var racine = document.documentElement.getAttribute("data-racine") || "";
    var gFixe = form.getAttribute("data-gouv") || "", lFixe = form.getAttribute("data-lieu") || "";
    var tout = window.ANNONCES.a.filter(function (a) { return (!gFixe || a.g === gFixe) && (!lFixe || a.l === lFixe); });
    var plus = document.getElementById("plus"), res = document.getElementById("resultat"), tri = document.getElementById("f-tri");
    var montre = 0, liste = [], sansPrix = 0;
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
    function locDe(a) { if (a.lo) return a.lo; var o = a.l && OF[a.g + "/" + a.l]; return o ? o[1] : ""; }
    // 18/10/2026 (retour d'un visiteur : « Ennasr 2, S+5 : aucune annonce, alors que la carte en montre à Ennasr ») : beaucoup d'annonces
    // disent seulement « Ennasr » (sans 1 ou 2). Elles comptent pour « Cité Ennasr 1 » ET « Cité Ennasr 2 » : on ne devine pas lequel,
    // on ne les cache pas non plus (même délégation exigée par le filtre de délégation)
    function dansLoc(a, v) { return a.l === v || (locDe(a) && slug(locDe(a)) === v) || (!locDe(a) && memeNom(a.l, v)); }
    // « ennasr » et « cite-ennasr-2 » : même nom, seuls « cité / résidence » et le numéro changent (jamais « ariana » / « ariana-essoughra »)
    function memeNom(l, v) { if (!l) return false; var w = "-" + v + "-", k = "-" + l + "-"; return w.indexOf(k) >= 0 && /^-(cite-|residence-|hay-)?(\d+-)?$/.test(w.replace(k, "-")); }
    function gCourant() { return gFixe || (selG ? selG.value : ""); }
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
      selD.innerHTML = (g ? premiere("Toutes", "الكل") : premiere("Choisissez d’abord le gouvernorat", "اختر الولاية أولًا")) +
        liste.map(function (d) { return option(slug(d[0]), d[0], d[1], n[d[0]] || 0); }).join("");
      selD.disabled = !liste.length;
      if (garde && liste.some(function (d) { return slug(d[0]) === garde; })) selD.value = garde;
      if (lFixe) { selD.closest(".champ").hidden = true; if (selL) selL.closest(".champ").hidden = true; }   // page d'un quartier : déjà choisi
    }
    function remplirLocalites() {
      if (!selL) return;
      var g = gCourant(), dv = selD ? selD.value : "", garde = selL.value;
      var d = dv ? delegs(g).filter(function (x) { return slug(x[0]) === dv; })[0] : null;
      var n = {}, items = [], pris = {};
      tout.forEach(function (a) {
        if (a.g !== g) return;
        var vus = {};
        if (a.l) { n[a.l] = (n[a.l] || 0) + 1; vus[a.l] = 1; }
        var lo = locDe(a) && slug(locDe(a)); if (lo && !vus[lo]) n[lo] = (n[lo] || 0) + 1;
      });
      if (d) {
        var exact = {};          // localité officielle -> notre quartier du même nom
        Object.keys(OF).forEach(function (k) { if (k.split("/")[0] === g && OF[k][0] === d[0] && OF[k][1]) exact[OF[k][1]] = k.split("/")[1]; });
        d[2].forEach(function (l) { var v = exact[l[0]] || slug(l[0]); pris[v] = 1; items.push([v, l[0], l[1]]); });
        Object.keys(OF).forEach(function (k) {          // nos quartiers de cette délégation qui ne sont pas une localité officielle
          var s = k.split("/")[1], nom = LX.l[k] || [s, s];
          if (k.split("/")[0] === g && OF[k][0] === d[0] && !pris[s] && slug(nom[0]) !== dv) { pris[s] = 1; items.push([s, nom[0], nom[1]]); }
        });
        items.sort(function (x, y) { return x[1].localeCompare(y[1], "fr"); });
      }
      selL.innerHTML = (d ? premiere("Toutes", "الكل") : premiere("D’abord la délégation", "اختر المعتمدية أولًا")) +
        items.map(function (x) { return option(x[0], x[1], x[2], n[x[0]] || 0); }).join("");
      selL.disabled = !items.length;
      if (garde && pris[garde]) selL.value = garde;
    }
    // Case « Où ? » : on tape un lieu (« petite ariana », « ennasr », « المرسى ») et le site remplit gouvernorat, délégation et localité
    function cle(t) { return " " + String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim() + " "; }
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
          INDEX.push({ g: g, d: sd, l: "", fr: d[0], ar: d[1], sous: ["Délégation entière · " + G[0], "كامل المعتمدية · " + G[1]], k: cle(d[0] + " " + d[1]), r: 1 });
          // code postal de La Poste (18/10/2026, idée d'Ahmed) : taper « 1000 » ou « 2045 » trouve aussi la localité
          d[2].forEach(function (l) { var cp = l[2] ? " · " + l[2] : ""; INDEX.push({ g: g, d: sd, l: slug(l[0]), fr: l[0], ar: l[1], sous: ["Localité · " + d[0] + " · " + G[0] + cp, "منطقة · " + d[1] + " · " + G[1] + cp], k: cle(l[0] + " " + l[1] + " " + (l[2] || "")), r: 2 }); });
        });
        ((LX.al || {})[g] || []).forEach(function (a) {     // autres écritures connues (« Bab Jdid » = Bab Djedid), 18/10/2026
          var sd = a[1] === "quartier" ? slug((OF[g + "/" + a[3]] || [""])[0]) : slug(a[3]);
          INDEX.push({ g: g, d: sd, l: a[1] === "quartier" ? a[3] : (a[1] === "localité" ? slug(a[2]) : ""), fr: a[0], ar: a[0],
                       sous: ["= " + a[2] + " · " + G[0], "= " + a[2] + " · " + G[1]], k: cle(a[0]), r: 2 });
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
    function compter(x) {
      return tout.filter(function (a) { return a.g === x.g && (!x.d || slug(delegDe(a)) === x.d) && (!x.l || dansLoc(a, x.l)); }).length;
    }
    function ouChercher() {
      var champ = document.getElementById("f-ou"), boite = document.getElementById("ou-suggestions");
      if (!champ || !boite) return;
      if (lFixe) { champ.closest(".champ-ou").hidden = true; return; }
      var choix = [], actif = -1;
      function fermer() { boite.hidden = true; boite.innerHTML = ""; champ.setAttribute("aria-expanded", "false"); actif = -1; }
      function proposer() {
        var mots = cle(champ.value).trim().split(" ").filter(Boolean);
        if (!mots.length || cle(champ.value).trim().length < 2) { fermer(); return; }
        var vu = {};
        choix = indexLieux().filter(function (x) { return mots.every(function (m) { return x.k.indexOf(" " + m) >= 0; }); })
          .filter(function (x) { var c = x.g + "/" + x.d + "/" + x.l; if (vu[c]) return false; vu[c] = 1; return true; })
          .map(function (x) { return { x: x, n: compter(x), debut: x.k.indexOf(" " + mots[0]) === 0 }; })
          .sort(function (a, b) { return ((b.n > 0) - (a.n > 0)) || (a.x.r - b.x.r) || (b.debut - a.debut) || (b.n - a.n) || a.x.fr.localeCompare(b.x.fr, "fr"); })   // lieux avec annonces, puis délégation avant localité
          .slice(0, 8);
        if (!choix.length) {
          boite.innerHTML = '<li class="ou-rien">' + L("Aucun lieu trouvé : vérifiez l’orthographe", "لم نجد هذا المكان: تحقق من الكتابة") + '</li>';
          boite.hidden = false; return;
        }
        var ar = document.documentElement.lang === "ar";
        boite.innerHTML = choix.map(function (c, i) {
          return '<li role="option" id="ou-' + i + '" data-i="' + i + '"><span class="ou-nom">' + E(ar ? c.x.ar || c.x.fr : c.x.fr) + '</span>' +
            '<span class="ou-sous">' + E(c.x.sous[ar ? 1 : 0]) + '</span><span class="ou-n">' + L(c.n + " annonce" + (c.n > 1 ? "s" : ""), iso(c.n) + " إعلان") + '</span></li>';
        }).join("");
        boite.hidden = false; champ.setAttribute("aria-expanded", "true");
      }
      function choisirLieu(c) {
        if (selG && !gFixe) { selG.value = c.x.g; }
        suivreGouv();
        if (selD) { selD.value = c.x.d; suivreGouv(); }
        if (selL) selL.value = c.x.l;
        champ.value = c.x.fr; fermer();
        memoriser(filtrer());
        var l = document.getElementById("liste"); if (l && l.scrollIntoView) l.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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
    ["y", "g", "p", "pmin", "smin", "smax", "c", "v"].forEach(function (k) { var c = form.querySelector('[name="' + k + '"]'); if (c && q.get(k)) c.value = q.get(k); });
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
    var CLES_F = ["y", "d", "l", "c", "pmin", "p", "smin", "smax", "v"].concat(gFixe ? [] : ["g"]);
    function compterFiltres() {
      var n = CLES_F.filter(function (k) { var c = form.querySelector('[name="' + k + '"]'); return c && c.value; }).length;
      if (nbF) { nbF.hidden = !n; nbF.textContent = n; }
      return n;
    }
    if (plusF && (CLES_F.some(function (k) { return q.get(k); }) || compterFiltres())) plusF.open = true;
    form.addEventListener("change", compterFiltres); form.addEventListener("input", compterFiltres);
    form.addEventListener("reset", function () { setTimeout(compterFiltres, 0); });
    [].forEach.call(form.querySelectorAll('.onglet input[name="t"]'), function (r) {
      var avant = false;
      r.parentNode.addEventListener("pointerdown", function () { avant = r.checked; });
      r.addEventListener("click", function () {
        if (avant) { r.checked = false; avant = false; r.dispatchEvent(new Event("change", { bubbles: true })); }
        form.classList.remove("mode-estimer");
        var b = form.querySelector(".onglet-estimer"), pe = form.querySelector(".panneau-estimer");
        if (b) b.setAttribute("aria-pressed", "false"); if (pe) pe.hidden = true;
      });
    });
    var bEst = form.querySelector(".onglet-estimer");
    if (bEst) bEst.addEventListener("click", function () {
      var on = bEst.getAttribute("aria-pressed") !== "true", pe = form.querySelector(".panneau-estimer");
      bEst.setAttribute("aria-pressed", on ? "true" : "false"); form.classList.toggle("mode-estimer", on); if (pe) pe.hidden = !on;
      if (on) [].forEach.call(form.querySelectorAll('input[name="t"]'), function (r) { r.checked = false; });
    });
    form.addEventListener("reset", function () { setTimeout(function () { dernierG = null; dernierD = null; suivreGouv(); memoriser(filtrer()); }, 0); });
    if (q.get("tri") && tri) tri.value = q.get("tri");

    function valeurs() {
      var t = form.querySelector('input[name="t"]:checked');
      var g = form.querySelector('[name="g"]');
      var n = function (k) { var x = parseInt((form.querySelector('[name="' + k + '"]') || {}).value, 10); return x > 0 ? x : 0; };
      var val = function (k) { return (form.querySelector('[name="' + k + '"]') || {}).value || ""; };
      return { t: t ? t.value : "", y: val("y"), g: g ? g.value : "", d: val("d"), l: val("l"), c: n("c"), v: val("v"),
               p: n("p"), pmin: n("pmin"), smin: n("smin"), smax: n("smax"), tri: tri ? tri.value : "date" };
    }
    function filtrer() {
      suivreGouv();
      var v = valeurs();
      sansPrix = 0;
      liste = tout.filter(function (a) {
        if (v.t && a.t !== v.t) return false;
        if (v.y && !typeVoulu(a, v.y)) return false;
        if (v.g && a.g !== v.g) return false;
        if (v.d && slug(delegDe(a)) !== v.d) return false;
        if (v.l && !dansLoc(a, v.l)) return false;
        if (v.c && (a.c == null || (v.c >= 5 ? a.c < 5 : a.c !== v.c))) return false;
        if (v.v && (a.v || "a") !== v.v && !(v.v === "p" && a.v === "d")) return false;   // « Particulier » : aussi les annonces déposées ici
        if (v.p || v.pmin) { if (a.p == null) { sansPrix++; return false; } if ((v.p && a.p > v.p) || (v.pmin && a.p < v.pmin)) return false; }
        if (v.smin || v.smax) { if (a.s == null) return false; if ((v.smin && a.s < v.smin) || (v.smax && a.s > v.smax)) return false; }
        return true;
      });
      var cle = { "prix-asc": function (a, b) { return (a.p == null) - (b.p == null) || a.p - b.p; },
                  "prix-desc": function (a, b) { return (a.p == null) - (b.p == null) || b.p - a.p; },
                  "surface": function (a, b) { return (b.s || 0) - (a.s || 0); },
                  "date": function (a, b) { return ((b.av || 0) - (a.av || 0)) || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0); } }[v.tri] || null;
      if (cle) liste.sort(cle);
      montre = 0; zone.innerHTML = "";
      afficher(premier);
      var n = liste.length;
      // bouton « Voir les N annonces » de la recherche simple (18/10/2026 : remplace la tuile « Voir N annonces » de la carte IA)
      var nbB = form.querySelector(".nb-annonces");
      if (nbB) nbB.innerHTML = L("les " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") + " ", iso(n) + " ");   // espace fine insécable : le nombre ne se coupe pas
      res.innerHTML = L(n + " annonce" + (n > 1 ? "s" : "") + (sansPrix ? " (" + sansPrix + " sans prix affiché, masquées par le prix maximum)" : ""),
                        iso(n) + " إعلان" + (sansPrix ? " (" + iso(sansPrix) + " دون سعر، أُخفيت بسبب السعر الأقصى)" : ""));
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
    function afficher(k) {
      var bout = liste.slice(montre, montre + k);
      zone.insertAdjacentHTML("beforeend", bout.map(function (a) { return carte(a, racine); }).join(""));
      montre += bout.length;
      if (plus) plus.hidden = montre >= liste.length;
    }
    function memoriser(v) {
      var p = new URLSearchParams();
      ["t", "y", "g", "d", "l", "c", "v", "p", "pmin", "smin", "smax"].forEach(function (k) { if (v[k]) p.set(k, v[k]); }); if (v.tri && v.tri !== "date") p.set("tri", v.tri);
      var l = new URLSearchParams(location.search).get("lang"); if (l) p.set("lang", l);
      try { history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); } catch (e) {}
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      memoriser(filtrer());
      var l = document.getElementById("liste"); if (l && l.scrollIntoView) l.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("change", function () { memoriser(filtrer()); });
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
  }
  window.carteAnnonce = carte;   // utilisé par les tests
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
