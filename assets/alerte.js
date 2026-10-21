/* Immobilier Tunisie — « Créer une alerte » : fenêtre qui fabrique un lien Telegram vers @AlerteImmobilierTunisieBot.
   Aucune donnée personnelle n'est demandée ni gardée par le site : les critères sont mis dans le lien (t.me/…?start=CODE),
   la personne appuie sur « Démarrer » dans Telegram, et le robot du dépôt PRIVÉ immobilier-abonnes enregistre l'alerte.

   FORMAT DU CODE (version 1, à garder identique dans le dépôt privé, tools/alertes.py, fonction lire_code) :
     v1_<t>_<y>_<g>_<l>_<p>_<c>      7 parties séparées par « _ », « x » = indifférent
       t : v (acheter) | l (louer) | x
       y : appartement | maison | bureau | commerce | industriel | terrain | terrainind | agricole | autre | pro | local | x
           (forme courte ap, ma, bu, co, in, te, ti, ag, au, pr, lo si le code dépasse 64 caractères ; pro et local = plusieurs types)
       g : gouvernorat (ex. sousse, ben-arous) | x
       l : localité / quartier (ex. hammam-sousse, ariana-essoughra) | « d- » + délégation (ex. d-raoued) | x   (toujours x si g = x)
           (localités et délégations : listes officielles de La Poste, donnees/decoupage.js, 11/10/2026)
       p : prix maximum en DT, 1 à 8 chiffres | x
       c : pièces minimum S+1 à S+5 (1 à 5) | x
     Exemple : v1_l_appartement_sousse_x_1000_2 = louer un appartement à Sousse, 1 000 DT au plus, S+2 ou plus.

   FORMAT VERSION 2 (21/10/2026, Ahmed : « tout ce qui est sélectionné par le client dans le filtre doit être utilisé dans l'alerte ») :
     v2_<t><y>_<g>_<l>_<options>   y en forme courte (ap, ma…), g en 2 lettres (G2), l comme en v1 ;
     options « -<clé><valeur> » : p prix max, n prix min, s surface min, m surface max, c pièces min, a atouts (codes de
     robot/criteres.py), e étage, h niveaux, t standing (h|n), b état (n|r|b|a), v vendeur (a|p), f avec photo, o local (m|b|f).
     Utilisé seulement si une option en plus de la v1 est choisie ; trop long : les options les moins importantes d'abord retirées.
     Lu par tools/alertes.py (lire_code2) du dépôt privé.
   Telegram : 64 caractères au plus, lettres, chiffres, « _ » et « - » seulement. Aucun script en ligne (CSP). */
(function () {
  var ROBOT = "AlerteImmobilierTunisieBot";
  // types (11/10/2026 : aussi bureaux, commerces, usines, terrains industriels et agricoles) ; « pro » = tous les biens professionnels
  var TYPES = [["pro", "Professionnels & industriels (tous)", "المهنيون والصناعيون (الكل)"],
               ["appartement", "Appartement", "شقة"], ["maison", "Maison / villa", "منزل / فيلا"],
               ["bureau", "Bureau", "مكتب"], ["commerce", "Local commercial", "محل تجاري"], ["industriel", "Usine / entrepôt / dépôt", "مصنع / مستودع"],
               ["terrain", "Terrain à bâtir", "أرض للبناء"], ["terrainind", "Terrain industriel / commercial", "أرض صناعية / تجارية"],
               ["agricole", "Terrain agricole / ferme", "أرض فلاحية / ضيعة"], ["autre", "Autre bien", "عقار آخر"],
               ["local", "Bureau / local (tous)", "مكتب / محل (الكل)"]];
  var COURT = { appartement: "ap", maison: "ma", terrain: "te", local: "lo", autre: "au", bureau: "bu", commerce: "co",
                industriel: "in", terrainind: "ti", agricole: "ag", pro: "pr" };
  var SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  var G2 = { "tunis": "tu", "ariana": "an", "ben-arous": "ba", "manouba": "mn", "nabeul": "na", "zaghouan": "za", "bizerte": "bz", "beja": "be",
    "jendouba": "je", "le-kef": "ke", "siliana": "si", "sousse": "so", "monastir": "mo", "mahdia": "md", "sfax": "sf", "kairouan": "ka",
    "kasserine": "ks", "sidi-bouzid": "sb", "gabes": "gb", "medenine": "me", "tataouine": "ta", "gafsa": "gf", "tozeur": "to", "kebili": "kb" };
  // options v2, les plus importantes d'abord : [clé du code, critère, valeur valable]
  var OPTIONS = [["p", "p", /^[1-9]\d{0,7}$/], ["c", "c", /^[1-5]$/], ["a", "at", /^[a-z0-9]{1,27}$/], ["n", "pmin", /^[1-9]\d{0,7}$/],
    ["s", "smin", /^[1-9]\d{0,6}$/], ["m", "smax", /^[1-9]\d{0,6}$/], ["e", "et", /^(\d|10)$/], ["h", "nv", /^([1-9]|10)$/], ["t", "st", /^[hn]$/],
    ["b", "eb", /^[nrba]$/], ["o", "fo", /^[mbf]$/], ["v", "ve", /^[ap]$/], ["f", "ph", /^1$/]];

  function T(fr, ar) { return document.documentElement.lang === "ar" ? ar : fr; }
  function E(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }   // espace insécable : « 1 000 » reste dans l'ordre en arabe

  // critères -> code (v1). Toute valeur inattendue devient « x » (indifférent).
  function code(c, reserve) {      // reserve : place gardée pour la langue (« _ar », 19/10/2026)
    c = c || {}; var max = 64 - (reserve || 0);
    var opts = OPTIONS.filter(function (o) { return o[0] !== "p" && o[0] !== "c" && o[2].test(String(c[o[1]] == null ? "" : c[o[1]])); });
    if (opts.length) return code2(c, max);
    var t = c.t === "v" || c.t === "l" ? c.t : "x";
    var y = COURT[c.y] ? c.y : "x";
    var g = SLUG.test(c.g || "") && String(c.g).length <= 20 ? c.g : "x";
    var dl = g !== "x" && SLUG.test(c.d || "") && String(c.d).length <= 28 ? "d-" + c.d : "x";
    var l = g !== "x" && SLUG.test(c.l || "") && String(c.l).length <= 30 ? c.l : dl;
    var p = parseInt(c.p, 10); p = p > 0 && p <= 99999999 ? String(p) : "x";
    var n = parseInt(c.c, 10); n = n >= 1 && n <= 5 ? String(n) : "x";
    var k = ["v1", t, y, g, l, p, n].join("_");
    if (k.length > max && y !== "x") k = ["v1", t, COURT[y], g, l, p, n].join("_");
    if (k.length > max && l !== dl) k = ["v1", t, y === "x" ? "x" : COURT[y], g, dl, p, n].join("_");   // trop long : la délégation seule
    if (k.length > max) k = ["v1", t, y === "x" ? "x" : COURT[y], g, "x", p, n].join("_");   // dernier recours : sans le quartier
    return k;
  }
  // version 2 (21/10/2026) : tous les filtres de la recherche
  function code2(c, max) {
    var t = c.t === "v" || c.t === "l" ? c.t : "x", y = COURT[c.y] || "x", g = G2[c.g] || "x";
    var dl = g !== "x" && SLUG.test(c.d || "") ? "d-" + c.d : "x";
    var l = g !== "x" && SLUG.test(c.l || "") ? c.l : dl;
    var opts = OPTIONS.filter(function (o) { return o[2].test(String(c[o[1]] == null ? "" : c[o[1]])); }).map(function (o) { return "-" + o[0] + c[o[1]]; });
    var faire = function (ll, n) { return ["v2", t + y, g, ll, opts.slice(0, n).join("")].join("_"); };
    for (var n = opts.length; n >= 0; n--) {                 // trop long : d'abord les options les moins importantes, puis le lieu précis
      if (faire(l, n).length <= max) return faire(l, n);
      if (faire(dl, n).length <= max) return faire(dl, n);
      if (faire("x", n).length <= max) return faire("x", n);
    }
    return faire("x", 0);
  }
  function lien(c) { var sfx = window.suffixeTG ? window.suffixeTG() : ""; return "https://t.me/" + ROBOT + "?start=" + code(c, sfx.length) + sfx; }
  window.codeAlerte = code;      // utilisés par les tests
  window.lienAlerte = lien;

  var fen = null;

  // recherche en cours (formulaire #recherche de la page) -> critères de départ
  function depuisRecherche() {
    var f = document.getElementById("recherche"), c = { t: "", y: "", g: "", d: "", l: "", p: "", c: "" };
    if (!f) return c;
    var val = function (k) { var x = f.querySelector('[name="' + k + '"]'); return x ? x.value || "" : ""; };
    var t = f.querySelector('input[name="t"]:checked');
    c.t = t ? t.value : "";
    c.y = val("y");
    c.g = f.getAttribute("data-gouv") || val("g");
    c.l = f.getAttribute("data-lieu") || val("l");
    c.d = val("d");
    var o = (window.LIEUX && window.LIEUX.o) || {};
    if (!c.d && c.l && o[c.g + "/" + c.l]) c.d = slug(o[c.g + "/" + c.l][0]);   // page d'un quartier : sa délégation
    c.p = val("p");
    c.c = (window.champUtile && !window.champUtile("pieces", c.y)) ? "" : val("c");
    // 21/10/2026 (Ahmed) : TOUS les autres filtres choisis (un champ caché pour ce type ne compte jamais)
    var utile = function (ch) { return !window.champUtile || window.champUtile(ch, c.y); };
    c.pmin = val("pmin"); c.smin = val("smin"); c.smax = val("smax");
    c.at = [].map.call(f.querySelectorAll('input[name="at"]:checked'), function (x) { return x.value; }).filter(function (x) { return /^[a-z0-9]$/.test(x); }).join("");
    c.et = utile("etage") ? val("et") : ""; c.nv = utile("niveaux") ? val("nv") : "";
    c.st = utile("standing") ? ({ haut: "h", normal: "n" }[val("st")] || "") : "";
    c.eb = utile("etat") ? ({ neuf: "n", renove: "r", bon: "b", a_renover: "a" }[val("eb")] || "") : "";
    c.ve = { a: "a", p: "p" }[val("v")] || ""; c.ph = (f.querySelector('[name="ph"]') || {}).checked ? "1" : "";
    c.fo = utile("fonds") ? ({ m: "m", mf: "b", f: "f" }[val("fo")] || "") : "";
    return c;
  }
  var enPlus = {};      // options de la recherche reprises dans l'alerte (la fenêtre ne montre que t, y, g, d, l, p, c)

  function slug(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  // mêmes listes que la recherche (assets/app.js) : délégations officielles + nos quartiers sans rattachement sûr
  function delegsDe(g) {
    var DEC = window.DECOUPAGE || {}, LX = window.LIEUX || {}, OF = LX.o || {}, liste = (DEC[g] || []).slice(), vus = {};
    liste.forEach(function (d) { vus[d[0]] = 1; });
    Object.keys(OF).forEach(function (k) { if (k.split("/")[0] === g && !vus[OF[k][0]]) { vus[OF[k][0]] = 1; liste.push([OF[k][0], ((LX.l || {})[k] || [OF[k][0], OF[k][0]])[1], []]); } });
    return liste.sort(function (x, y) { return x[0].localeCompare(y[0], "fr"); });
  }
  function localitesDe(g, dv) {
    var LX = window.LIEUX || {}, OF = LX.o || {}, d = delegsDe(g).filter(function (x) { return slug(x[0]) === dv; })[0], items = [], pris = {}, exact = {};
    if (!d) return [];
    Object.keys(OF).forEach(function (k) { if (k.split("/")[0] === g && OF[k][0] === d[0] && OF[k][1]) exact[OF[k][1]] = k.split("/")[1]; });
    d[2].forEach(function (l) { var v = exact[l[0]] || slug(l[0]); pris[v] = 1; items.push([v, l[0], l[1]]); });
    Object.keys(OF).forEach(function (k) {
      var s = k.split("/")[1], nom = (LX.l || {})[k] || [s, s];
      if (k.split("/")[0] === g && OF[k][0] === d[0] && !pris[s] && slug(nom[0]) !== dv) { pris[s] = 1; items.push([s, nom[0], nom[1]]); }
    });
    return items.sort(function (x, y) { return x[1].localeCompare(y[1], "fr"); });
  }

  function construire(c) {
    var G = (window.LIEUX && window.LIEUX.g) || {}, ar = document.documentElement.lang === "ar";
    var gouvs = Object.keys(G).sort(function (a, b) { return G[a][0].localeCompare(G[b][0], "fr"); });
    var radio = function (v, fr, a) {
      return '<label><input type="radio" name="at" value="' + v + '"' + (c.t === v ? " checked" : "") + '><span>' + T(fr, a) + '</span></label>';
    };
    fen.innerHTML =
      '<div class="alerte-boite" role="dialog" aria-modal="true" aria-labelledby="alerte-titre">' +
        '<button type="button" class="alerte-fermer" aria-label="' + T("Fermer", "إغلاق") + '">×</button>' +
        '<h2 id="alerte-titre">' + T("Recevoir les nouvelles annonces sur Telegram", "استلم الإعلانات الجديدة على تيليغرام") + '</h2>' +
        '<p class="alerte-intro">' + T("Choisissez vos critères : dès qu’une nouvelle annonce correspond, le robot Telegram vous l’envoie. Gratuit, sans inscription ; le site ne garde aucune donnée personnelle.",
                                       "اختر معاييرك: عند ظهور إعلان جديد مطابق، يرسله لك روبوت تيليغرام. مجانًا ودون تسجيل؛ لا يحتفظ الموقع بأي معطيات شخصية.") + '</p>' +
        '<form class="alerte-form" id="alerte-form">' +
          '<div class="bascule" role="radiogroup" aria-label="' + T("Acheter ou louer", "شراء أو كراء") + '">' +
            radio("", "Tout", "الكل") + radio("v", "Acheter", "شراء") + radio("l", "Louer", "كراء") + '</div>' +
          '<div class="champs">' +
            '<label class="champ"><span>' + T("Type de bien", "نوع العقار") + '</span><select name="ay" data-type-bien><option value="">' + T("Tous les biens", "كل العقارات") + '</option>' +
              TYPES.filter(function (x) { return x[0] !== "local" || c.y === "local"; })
                .map(function (x) { return '<option value="' + x[0] + '"' + (c.y === x[0] ? " selected" : "") + '>' + (ar ? x[2] : x[1]) + '</option>'; }).join("") + '</select></label>' +
            '<label class="champ"><span>' + T("Gouvernorat", "الولاية") + '</span><select name="ag"><option value="">' + T("Toute la Tunisie", "كل تونس") + '</option>' +
              gouvs.map(function (g) { return '<option value="' + E(g) + '"' + (c.g === g ? " selected" : "") + '>' + E(G[g][ar ? 1 : 0]) + '</option>'; }).join("") + '</select></label>' +
            '<label class="champ"><span>' + T("Délégation", "المعتمدية") + '</span><select name="ad"></select></label>' +
            '<label class="champ"><span>' + T("Localité / quartier", "المنطقة / الحي") + '</span><select name="al"></select></label>' +
            '<label class="champ" data-champ="pieces"><span>' + T("Pièces minimum", "أدنى عدد غرف") + '</span><select name="ac"><option value="">' + T("Indifférent", "لا يهم") + '</option>' +
              [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (String(c.c) === String(n) ? " selected" : "") + '>S+' + n + T(" ou plus", " أو أكثر") + '</option>'; }).join("") + '</select></label>' +
            '<label class="champ alerte-prix"><span>' + T("Prix maximum (DT)", "أقصى سعر (د.ت)") + '</span><input name="ap" type="number" inputmode="numeric" min="0" step="50" placeholder="' + T("sans limite", "دون حد") + '" value="' + E(parseInt(c.p, 10) > 0 ? parseInt(c.p, 10) : "") + '"></label>' +
          '</div>' +
        '</form>' +
        '<p class="alerte-resume" id="alerte-resume" aria-live="polite"></p>' +
        '<a class="btn-telegram" id="alerte-lien" href="#" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4L3 11.3l6.2 2.2L19 7l-7.6 8.1.1 4.9 3.1-3.6 4.4 3.3z"/></svg>' + T("Recevoir sur Telegram", "استلم على تيليغرام") + '</a>' +
        '<div class="alerte-ok" id="alerte-ok" role="status" hidden>' +
          '<p class="alerte-ok-titre">' + T("✅ Presque fini : appuyez sur « Démarrer » dans Telegram", "✅ تقريبًا انتهيت: اضغط على « ابدأ » في تيليغرام") + '</p>' +
          '<p>' + T("Dès que vous appuyez sur « Démarrer », votre alerte est enregistrée. Telegram affiche seulement « /start » : c’est normal, vos critères sont bien envoyés.",
                    "بمجرد الضغط على « ابدأ » يُسجَّل تنبيهك. يُظهر تيليغرام « /start » فقط: هذا عادي، معاييرك أُرسلت.") + '</p>' +
          '<p>' + T("Le robot vous écrit la confirmation dans les 2 heures (de 8 h à 22 h), puis vous envoie chaque nouvelle annonce qui correspond.",
                    "يرسل لك الروبوت التأكيد خلال ساعتين (من 8 صباحًا إلى 10 ليلًا)، ثم كل إعلان جديد مطابق.") + '</p>' +
        '</div>' +
        '<ol class="alerte-etapes">' +
          '<li>' + T("Le bouton ouvre Telegram (installez l’application si besoin).", "يفتح الزر تطبيق تيليغرام (ثبّته إن لزم).") + '</li>' +
          '<li>' + T("Appuyez sur « Démarrer » : le robot confirme votre alerte dans les 2 heures (de 8 h à 22 h).", "اضغط على « ابدأ »: يؤكد الروبوت تنبيهك خلال ساعتين (من 8 صباحًا إلى 10 ليلًا).") + '</li>' +
          '<li>' + T("Pour arrêter : envoyez /stop au robot. Au plus 5 alertes par personne.", "للإيقاف: أرسل /stop إلى الروبوت. 5 تنبيهات على الأكثر لكل شخص.") + '</li>' +
        '</ol>' +
        '<p class="alerte-note">' + T("Les annonces sont vérifiées toutes les 2 heures, de 8 h à 22 h. Informations indicatives : vérifiez toujours auprès du vendeur.",
                                      "تُفحص الإعلانات كل ساعتين من 8 صباحًا إلى 10 ليلًا. معلومات للإرشاد: تحقق دائمًا مع البائع.") + '</p>' +
      '</div>';
    remplirDelegs(c.d, c.l);
    if (window.appliquerChamps) window.appliquerChamps(document.getElementById("alerte-form"));   // règle commune des champs (page.js)
    maj();
  }

  function remplirDelegs(gardeD, gardeL) {
    var f = document.getElementById("alerte-form"), g = f.querySelector('[name="ag"]').value, sel = f.querySelector('[name="ad"]'), ar = document.documentElement.lang === "ar";
    var ds = g ? delegsDe(g) : [];
    sel.innerHTML = '<option value="">' + (g ? T("Toutes", "الكل") : T("Choisissez d’abord le gouvernorat", "اختر الولاية أولًا")) + '</option>' +
      ds.map(function (d) { var v = slug(d[0]); return '<option value="' + E(v) + '"' + (gardeD === v ? " selected" : "") + '>' + E(ar ? d[1] || d[0] : d[0]) + '</option>'; }).join("");
    sel.disabled = !ds.length;
    remplirLocalites(gardeL);
  }
  function remplirLocalites(garde) {
    var f = document.getElementById("alerte-form"), g = f.querySelector('[name="ag"]').value, dv = f.querySelector('[name="ad"]').value, sel = f.querySelector('[name="al"]');
    var ar = document.documentElement.lang === "ar", ls = g && dv ? localitesDe(g, dv) : [];
    sel.innerHTML = '<option value="">' + (dv ? T("Toutes", "الكل") : T("D’abord la délégation", "اختر المعتمدية أولًا")) + '</option>' +
      ls.map(function (x) { return '<option value="' + E(x[0]) + '"' + (garde === x[0] ? " selected" : "") + '>' + E(ar ? x[2] || x[1] : x[1]) + '</option>'; }).join("");
    sel.disabled = !ls.length;
  }

  function criteres() {
    var f = document.getElementById("alerte-form"), t = f.querySelector('input[name="at"]:checked');
    var v = function (k) { return f.querySelector('[name="' + k + '"]').value; };
    var c = { t: t ? t.value : "", y: v("ay"), g: v("ag"), d: v("ad"), l: v("al"), p: v("ap"),
             c: (window.champUtile && !window.champUtile("pieces", v("ay"))) ? "" : v("ac") };   // règle commune (assets/page.js)
    // options de la recherche (21/10/2026) : gardées si elles ont encore un sens pour le type choisi dans la fenêtre
    var utile = function (ch) { return !window.champUtile || window.champUtile(ch, c.y); };
    Object.keys(enPlus).forEach(function (k) { c[k] = enPlus[k]; });
    if (!utile("etage")) c.et = ""; if (!utile("niveaux")) c.nv = ""; if (!utile("standing")) c.st = ""; if (!utile("etat")) c.eb = "";
    if (!utile("fonds")) c.fo = "";
    if (c.at && window.atoutsDe) {
      var ok = window.atoutsDe(c.t === "v" ? "vente" : c.t === "l" ? "location" : "", c.y).map(function (a) { return a[1]; });
      c.at = c.at.split("").filter(function (x) { return ok.indexOf(x) >= 0; }).join("");
    }
    return c;
  }

  function resume(c) {
    var G = (window.LIEUX && window.LIEUX.g) || {}, LX = (window.LIEUX && window.LIEUX.l) || {}, ar = document.documentElement.lang === "ar";
    var ty = TYPES.filter(function (x) { return x[0] === c.y; })[0];
    var bouts = [c.t === "v" ? T("À acheter", "للشراء") : c.t === "l" ? T("À louer", "للكراء") : T("Vente et location", "بيع وكراء"),
                 ty ? (ar ? ty[2] : ty[1]) : T("tous les biens", "كل العقارات")];
    var d = c.g && c.d ? delegsDe(c.g).filter(function (x) { return slug(x[0]) === c.d; })[0] : null;
    var lo = d && c.l ? localitesDe(c.g, c.d).filter(function (x) { return x[0] === c.l; })[0] : null;
    var lieu = (lo ? (ar ? lo[2] || lo[1] : lo[1]) + " · " : c.l && LX[c.g + "/" + c.l] ? LX[c.g + "/" + c.l][ar ? 1 : 0] + " · " : "") +
               (d ? (ar ? d[1] || d[0] : d[0]) + " · " : "");
    bouts.push(lieu + (c.g && G[c.g] ? G[c.g][ar ? 1 : 0] : T("toute la Tunisie", "كل تونس")));
    if (parseInt(c.p, 10) > 0) bouts.push(T(nb(parseInt(c.p, 10)) + "\u00a0DT au plus", "⁦" + nb(parseInt(c.p, 10)) + "⁩ د.ت على الأكثر"));
    if (parseInt(c.c, 10) > 0) bouts.push(T("S+" + c.c + " ou plus", "⁦S+" + c.c + "⁩ أو أكثر"));
    // options de la recherche reprises (21/10/2026)
    if (parseInt(c.pmin, 10) > 0) bouts.push(T(nb(parseInt(c.pmin, 10)) + "\u00a0DT au moins", "⁦" + nb(parseInt(c.pmin, 10)) + "⁩ د.ت على الأقل"));
    if (parseInt(c.smin, 10) > 0 || parseInt(c.smax, 10) > 0) bouts.push((c.smin || "0") + (c.smax ? "–" + c.smax : "+") + "\u00a0m²");
    if (c.at && window.CRITERES) {
      var lib = {}; ["vente", "location"].forEach(function (x) { Object.keys(window.CRITERES[x] || {}).forEach(function (y) { (window.CRITERES[x][y] || []).forEach(function (a) { lib[a[1]] = ar ? a[3] : a[2]; }); }); });
      c.at.split("").forEach(function (x) { if (lib[x]) bouts.push(lib[x]); });
    }
    if (c.et !== undefined && c.et !== "") bouts.push(c.et === "0" ? T("rez-de-chaussée", "الطابق الأرضي") : T(c.et + "e étage", "الطابق ⁦" + c.et + "⁩"));
    if (c.nv) bouts.push(T(c.nv + " niveau(x)", "⁦" + c.nv + "⁩ طوابق"));
    if (c.st) bouts.push(c.st === "h" ? T("haut standing", "راقٍ") : T("standing normal", "مستوى عادي"));
    if (c.eb) bouts.push({ n: T("neuf", "جديد"), r: T("rénové", "مجدَّد"), b: T("bon état", "حالة جيدة"), a: T("à rénover", "يحتاج ترميمًا") }[c.eb]);
    if (c.ve) bouts.push(c.ve === "a" ? T("agence", "وكالة") : T("particulier", "خاص"));
    if (c.ph) bouts.push(T("avec photo", "بالصور فقط"));
    if (c.fo) bouts.push({ m: T("local seul", "المحل فقط"), b: T("murs + fonds", "المحل والأصل التجاري"), f: T("fonds de commerce", "أصل تجاري") }[c.fo]);
    return bouts.join(" · ");
  }

  function maj() {
    var c = criteres();
    document.getElementById("alerte-resume").textContent = T("Votre alerte : ", "تنبيهك: ") + resume(c);
    document.getElementById("alerte-lien").href = lien(c);
  }

  function ouvrir(c) {
    if (!fen) {
      fen = document.createElement("div");
      fen.className = "alerte-fond";
      fen.id = "alerte-fenetre";
      document.body.appendChild(fen);
      fen.addEventListener("click", function (e) {
        if (e.target === fen || (e.target.closest && e.target.closest(".alerte-fermer"))) fermer();
        var a = e.target.closest && e.target.closest("#alerte-lien");
        if (a) { var ok = document.getElementById("alerte-ok"); if (ok) ok.hidden = false;
                 try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "alerte" + location.pathname, title: "Alerte Telegram", event: true }); } catch (x) {} }
      });
      fen.addEventListener("change", function (e) { if (e.target.name === "ag") remplirDelegs("", ""); else if (e.target.name === "ad") remplirLocalites(""); maj(); });
      fen.addEventListener("input", maj);
      fen.addEventListener("submit", function (e) { e.preventDefault(); });
    }
    construire(c);
    fen.hidden = false;
    document.documentElement.classList.add("alerte-ouverte");
    var b = fen.querySelector(".alerte-fermer"); if (b && b.focus) b.focus();
  }
  function fermer() {
    if (!fen || fen.hidden) return;
    fen.hidden = true;
    document.documentElement.classList.remove("alerte-ouverte");
    var b = document.querySelector(".btn-alerte"); if (b && b.focus) b.focus();
  }

  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".btn-alerte");
    if (!b) return;
    e.preventDefault();
    var dr = depuisRecherche();
    enPlus = {}; ["pmin", "smin", "smax", "at", "et", "nv", "st", "eb", "ve", "ph", "fo"].forEach(function (k) { if (dr[k] !== undefined && dr[k] !== "") enPlus[k] = dr[k]; });
    ouvrir(dr);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer(); });
  // changement de langue pendant que la fenêtre est ouverte : on la refait dans l'autre langue, avec les mêmes choix
  document.addEventListener("langue", function () { if (fen && !fen.hidden) construire(criteres()); });
})();
