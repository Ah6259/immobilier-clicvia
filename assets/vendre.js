/* Page vendre/ (15/10/2026, idée d'Ahmed) : « Vous voulez vendre ? Notre modèle d'IA vous donne le meilleur prix ».
   - Gratuit : le prix estimé par le modèle d'IA (assets/ia.js, même calcul que robot/modele_ia.py) et sa fourchette, avec la base
     du calcul (nombre d'annonces comparées, précision mesurée). Si l'IA n'est pas assez fiable pour ce type de bien, on le dit et
     on donne la référence des annonces semblables.
   - Pass Vendeur (analyse complète) : 3 prix, les annonces de référence (les plus proches, avec leur lien), prix au m², concurrence,
     le calcul expliqué. PAS D'ESSAI (Ahmed, 15/10/2026 : un exemple complet le remplace) ; « Prendre le Pass » donne tout
     de suite le code VEN-XXXXXX (motif du paiement) ; code payé = identifiant PBKDF2 dans
     investir/pass/acces.json (écrit par le robot privé immobilier-abonnes, même calcul que assets/pass.js, 17/10/2026).
   Les annonces viennent de donnees/annonces.js (publiques) : rien n'est envoyé, tout se calcule dans le téléphone. */
(function () {
  var form = document.getElementById("v-form"), res = document.getElementById("v-res");
  if (!form || !res) return;
  var CLE = "pass-vendeur", ESSAI = 3, FIN_ESSAIS = "2026-10-15", OFFERTS = 30, ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var racine = document.documentElement.getAttribute("data-racine") || "";
  var ACCES = null, etat = lire(), dernier = null;
  // lien personnel vendre/#VEN-XXXXXX (comme investir/pass/#INV-…) : le code s'ouvre sans rien taper (15/10/2026)
  (function () {
    var h = String(location.hash || "").slice(1).toUpperCase();
    if (/^VEN-[A-Z0-9]{6}$/.test(h) && !(etat && etat.code === h)) { etat = { code: h, debut: null }; try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* navigation privée */ } }
  })();
  function el(id) { return document.getElementById(id); }
  function ar() { return document.documentElement.lang === "ar"; }
  // même page pour LOUER (louer/, data-tr="location", 15/10/2026) : les textes de vente y sont remplacés par ceux de la location
  var LOC = form.getAttribute("data-tr") === "location", TL = LOC ? "l" : "v", TR = LOC ? "location" : "vente";
  var LOC_TXT = {
    "Prix estimé par notre IA": ["Loyer estimé par notre IA", "الكراء الذي يقدّره ذكاؤنا الاصطناعي"],
    "Prix de référence des annonces semblables": ["Loyer de référence des annonces semblables", "كراء المرجع للإعلانات المشابهة"],
    " annonces de vente de ce type à ": [" annonces de location de ce type à ", " إعلان كراء من هذا النوع في "],
    "→ Voir l’analyse complète (3 prix, annonces de référence avec leur lien, prix au m², concurrence)": ["→ Voir l’analyse complète (3 loyers, annonces de référence avec leur lien, loyer au m², concurrence)", "← شاهد التحليل الكامل (3 أسعار كراء، إعلانات المرجع، الكراء بالمتر، المنافسة)"],
    "Pour vendre vite": ["Pour louer vite", "للكراء بسرعة"],
    "en dessous de la plupart des annonces semblables : attire vite les acheteurs": ["en dessous de la plupart des annonces semblables : attire vite les locataires", "أقل من أغلب الإعلانات المشابهة: يجذب المكترين بسرعة"],
    "Le juste prix du marché": ["Le juste loyer du marché", "الكراء العادل في السوق"],
    "Prix haut": ["Loyer haut", "كراء مرتفع"],
    "seulement si votre bien a de vrais atouts (vue, étage, rénové, jardin…) : la vente sera plus longue": ["seulement si votre bien a de vrais atouts (meublé, vue, rénové, jardin…) : la location sera plus longue", "فقط إن كانت لعقارك مزايا حقيقية (مفروش، إطلالة، تجديد، حديقة…): سيطول الكراء"],
    "Votre prix au m²": ["Votre loyer au m²", "كراؤك بالمتر المربع"],
    "Au juste prix : ": ["Au juste loyer : ", "بالكراء العادل: "],
    " biens semblables sont en vente": [" biens semblables sont à louer", " عقارًا مشابهًا معروضًا للكراء"],
    "Plus il y en a, plus un prix juste compte pour vendre.": ["Plus il y en a, plus un loyer juste compte pour louer vite.", "كلما زاد عددها، زادت أهمية الكراء العادل."],
    "Prix": ["Loyer", "الكراء"],
    "Comment ce prix est calculé": ["Comment ce loyer est calculé", "كيف حُسب هذا الكراء"],
    "Pour ce type de bien, notre IA ne fait pas encore mieux qu’une simple comparaison : le juste prix est la médiane des annonces les plus proches du vôtre. ": ["Pour ce type de bien, notre IA ne fait pas encore mieux qu’une simple comparaison : le juste loyer est la médiane des annonces les plus proches du vôtre. ", "لهذا النوع، لا يتفوّق ذكاؤنا الاصطناعي بعد على المقارنة البسيطة: الكراء العادل هو وسيط أقرب الإعلانات إلى عقارك. "],
  };
  function T2(fr, a) { if (LOC && LOC_TXT[fr]) { a = LOC_TXT[fr][1]; fr = LOC_TXT[fr][0]; } return ar() ? a : fr; }
  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function rond(x) { return x >= 20000 ? Math.round(x / 1000) * 1000 : Math.round(x / 10) * 10; }
  function nb(x) { return '<bdi dir="ltr">' + Math.round(x).toLocaleString("fr-FR").replace(/[  ]/g, " ") + "</bdi>"; }
  function dt(x) { return nb(rond(x)) + (ar() ? " دينار" : " DT"); }
  function pc(x) { return '<bdi dir="ltr">' + (x >= 0 ? "+" : "−") + Math.abs(Math.round(x)) + " %</bdi>"; }
  function med(v) { v = v.slice().sort(function (a, b) { return a - b; }); var n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; }
  function quart(v, f) { v = v.slice().sort(function (a, b) { return a - b; }); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * f))] : null; }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function plus(d, n) { var x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function jfr(d) { return d ? '<bdi dir="ltr">' + d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) + "</bdi>" : ""; }

  // ---- identifiant d'un code (même calcul que robot/pass_web.py et assets/pass.js). 17/10/2026 (audit après l'étude de 9annas) :
  // PBKDF2-SHA256, 150 000 tours, au lieu de l'empreinte rapide FNV (1 milliard de codes se testaient en quelques minutes)
  var ITER = 150000, TE = new TextEncoder();
  function normaliser(c) { c = String(c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, ""); if (c && c.indexOf("VEN-") !== 0) c = "VEN-" + c.replace(/^VEN/, ""); return c; }
  function hex(u) { var s = ""; for (var i = 0; i < u.length; i++) s += ("0" + u[i].toString(16)).slice(-2); return s; }
  function pbkdf2(code, sel, bits) {
    var S = crypto.subtle;
    return S.importKey("raw", TE.encode(normaliser(code)), "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return S.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: TE.encode(sel), iterations: ITER }, k, bits);
    }).then(function (b) { return new Uint8Array(b); });
  }
  function identifiant(code) { return pbkdf2(code, "immobilier-pass-v2", 384).then(function (u) { return hex(u.slice(0, 16)); }); }
  // jeton de l'annonce MISE EN AVANT (15/10/2026) : ne révèle pas le code ; même calcul que robot/pass_web.py jeton_avant()
  function jetonAvant(code) { return pbkdf2(code, "immobilier-avant-v2", 32).then(hex); }
  // PAYE : {code, fin} quand le code de ce navigateur est dans acces.json ; JETON : {code, j} (calculés une fois, ils prennent ~0,2 s)
  var PAYE = null, JETON = null;
  function verifierCode() {
    if (!etat || !ACCES || !(window.crypto && crypto.subtle)) return Promise.resolve();
    var code = etat.code;
    return Promise.all([identifiant(code), jetonAvant(code)]).then(function (r) {
      var e = (ACCES.codes || {})[r[0]];
      PAYE = e && e.fin ? { code: code, fin: e.fin } : null;
      JETON = { code: code, j: r[1] };
    }).catch(function () { /* navigateur sans WebCrypto : le Pass ne s'ouvre pas */ }).then(tout);
  }
  function lire() { try { var v = JSON.parse(localStorage.getItem(CLE) || "null"); return v && typeof v.code === "string" ? v : null; } catch (e) { return null; } }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* navigation privée */ } }
  function nouveauCode() {
    var t = new Uint8Array(6), c = "VEN-";
    try { crypto.getRandomValues(t); } catch (e) { for (var k = 0; k < 6; k++) t[k] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < 6; i++) c += ALPH[t[i] % ALPH.length];
    return c;
  }
  function acces() {
    var auj = aujourdhui(), fin = null, quoi = null;
    if (etat && etat.debut && etat.debut < FIN_ESSAIS) { var f = plus(etat.debut, ESSAI - 1); if (f >= auj) { fin = f; quoi = "essai"; } }   // essais commencés avant le 15/10/2026
    var p = etat && PAYE && PAYE.code === etat.code ? PAYE.fin : null;
    if (p && p >= auj && (!fin || p > fin)) { fin = p; quoi = "pass"; }
    // pas encore vendu ou loué au bout des 30 jours payés -> 30 jours de plus offerts, une fois (déclaré par le propriétaire, 15/10/2026)
    if (p && p < auj && etat.offert === p && plus(p, OFFERTS) >= auj) { fin = plus(p, OFFERTS); quoi = "offert"; }
    var offrable = !!(p && p < auj && etat.offert !== p && plus(p, OFFERTS) >= auj);
    return { ok: !!fin, fin: fin, quoi: quoi, paye: p || null, offrable: offrable };
  }

  // ---- noms des lieux
  function nomG(g) { var x = window.LIEUX && LIEUX.g && LIEUX.g[g]; return x ? x[ar() ? 1 : 0] : g; }
  function nomQ(g, q) {
    var M = window.IA_IMMO && IA_IMMO.modele(), l = M && M.quartiers && M.quartiers[g] || [];
    for (var i = 0; i < l.length; i++) if (l[i][0] === q) return l[i][ar() ? 2 : 1];
    var x = window.LIEUX && LIEUX.l && LIEUX.l[g + "/" + q]; return x ? x[ar() ? 1 : 0] : q.replace(/^nom:/, "");
  }
  // ---- lieu : les MÊMES listes officielles que la recherche (La Poste : délégation -> localité, donnees/decoupage.js) ;
  // le quartier utilisé par l'IA (#v-q, caché) est déduit de la localité / délégation choisie (LIEUX.o : quartier -> [délégation,
  // localité]). 15/10/2026, remarque d'Ahmed : « Ariana Essoughra (Petite Ariana) » était dans la recherche mais pas dans l'estimation.
  var OF = (window.LIEUX && LIEUX.o) || {}, DEC = window.DECOUPAGE || {};
  function slugV(x) { return String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function delegsV(g) {
    OF = (window.LIEUX && LIEUX.o) || {}; DEC = window.DECOUPAGE || {};
    var liste = (DEC[g] || []).slice(), vus = {};
    liste.forEach(function (d) { vus[d[0]] = 1; });
    Object.keys(OF).forEach(function (k) {
      var o = OF[k];
      if (k.split("/")[0] === g && o[0] && !vus[o[0]]) { vus[o[0]] = 1; liste.push([o[0], ((window.LIEUX.l || {})[k] || [o[0], o[0]])[1], []]); }
    });
    return liste.sort(function (x, y) { return x[0].localeCompare(y[0], "fr"); });
  }
  function opt(v, fr, a) { return '<option value="' + esc(v) + '" data-fr="' + esc(fr) + '" data-ar="' + esc(a || fr) + '">' + esc(ar() ? (a || fr) : fr) + "</option>"; }
  // 19/10/2026 (Ahmed : « fais la liste en une seule langue ») : un choix montre UNE langue ; ses deux noms sont dans data-fr / data-ar
  function noms(o) { if (!o) return ["", ""]; var t = (o.text || "").replace(/ \(\d{4}\)/g, ""), fr = o.getAttribute("data-fr") || t.split(" · ")[0];
    return [fr.replace(/ \(\d{4}\)/g, ""), (o.getAttribute("data-ar") || t.split(" · ")[1] || fr).replace(/ \(\d{4}\)/g, "")]; }
  function quartiers() {                         // (nom gardé : appelé quand le modèle d'IA est chargé et au changement de langue)
    var g = el("v-g").value, sd = el("v-d"), garde = sd.value;
    var l = delegsV(g);
    sd.innerHTML = opt("", "Toutes", "الكل") + l.map(function (d) { return opt(d[0], d[0], d[1]); }).join("");
    if (l.some(function (d) { return d[0] === garde; })) sd.value = garde;
    localites();
  }
  function localites() {
    var g = el("v-g").value, dv = el("v-d").value, sl = el("v-l"), garde = sl.value;
    var d = dv ? delegsV(g).filter(function (x) { return x[0] === dv; })[0] : null, items = [], vus = {};
    if (d) {
      d[2].forEach(function (x) { vus[slugV(x[0])] = 1; items.push([x[0], x[0] + (x[2] ? " (" + x[2] + ")" : ""), x[1] + (x[2] ? " (" + x[2] + ")" : "")]); });
      Object.keys(OF).forEach(function (k) {       // nos quartiers rattachés à cette délégation sans localité officielle
        var o = OF[k], nom = ((window.LIEUX.l || {})[k] || [k.split("/")[1], k.split("/")[1]]);
        if (k.split("/")[0] === g && o[0] === dv && !vus[slugV(nom[0])]) { vus[slugV(nom[0])] = 1; items.push(["q:" + k.split("/")[1], nom[0], nom[1]]); }
      });
      items.sort(function (x, y) { return x[1].localeCompare(y[1], "fr"); });
    }
    sl.innerHTML = opt("", d ? "Toutes" : "D’abord la délégation", d ? "الكل" : "اختر المعتمدية أولًا") +
      items.map(function (x) { return opt(x[0], x[1], x[2]); }).join("");
    sl.disabled = !d;
    if (items.some(function (x) { return x[0] === garde; })) sl.value = garde;
    memeNom();
    choisirQuartier();
  }
  // 18/10/2026 (capture d'Ahmed : « Ben Arous » en gouvernorat, délégation ET localité) : c'est le découpage officiel (la ville chef-lieu
  // porte le nom du gouvernorat, et son centre aussi) ; une phrase le dit quand deux niveaux choisis portent le même nom
  function memeNom() {
    var p = el("v-meme"); if (!p) return;
    var g = el("v-g"), d = el("v-d"), l = el("v-l"), nom = function (s) { return s && s.value ? slugV(noms(s.options[s.selectedIndex])[0]) : ""; };
    var ng = nom(g), nd = nom(d), nl = nom(l), G = g.value ? noms(g.options[g.selectedIndex])[0] : "";
    var meme = (nd && nd === ng) || (nl && (nl === nd || nl === ng));
    p.hidden = !meme;
    // 18/10/2026 (capture d'Ahmed : « Bab Bhar est la ville chef-lieu » était faux) : « chef-lieu » seulement quand la délégation porte
    // le nom du GOUVERNORAT ; sinon : la localité du même nom est le centre de la délégation
    var D = d.value ? noms(d.options[d.selectedIndex])[0] : "", Lc = l.value ? noms(l.options[l.selectedIndex])[0] : "";
    if (meme) p.textContent = nd && nd === ng
      ? T2("Même nom à plusieurs niveaux : c’est le découpage officiel. La délégation " + D + " est la ville chef-lieu du gouvernorat" +
           (nl === nd ? ", et la localité " + Lc + " est son centre" : "") + ". Choisissez « Toutes » pour toute la délégation.",
           "نفس الاسم في عدة مستويات: هذا هو التقسيم الرسمي. المعتمدية هي مدينة مركز الولاية" + (nl === nd ? "، والمنطقة التي تحمل نفس الاسم هي وسطها" : "") + ". اختر « الكل » لكامل المعتمدية.")
      : T2("Même nom à deux niveaux : c’est le découpage officiel. La localité " + Lc + " est le centre de la délégation " + D + ". Choisissez « Toutes » pour toute la délégation.",
           "نفس الاسم في مستويين: هذا هو التقسيم الرسمي. المنطقة هي وسط المعتمدية التي تحمل نفس الاسم. اختر « الكل » لكامل المعتمدية.");
  }
  function choisirQuartier() {                    // quartier du modèle d'IA le plus proche de la localité / délégation choisie
    var g = el("v-g").value, dv = el("v-d").value, lv = el("v-l").value, M = window.IA_IMMO && IA_IMMO.modele();
    var cles = ((M && M.quartiers && M.quartiers[g]) || []).map(function (x) { return x[0]; }), q = "";
    if (lv.indexOf("q:") === 0) q = cles.indexOf(lv.slice(2)) >= 0 ? lv.slice(2) : "";
    else if (lv) {                               // seulement parmi les quartiers de la délégation choisie (« Ariana Essoughra » est à Raoued, pas à Ariana Ville)
      var memeD = cles.filter(function (k) { var o = OF[g + "/" + k]; return !dv || (o ? o[0] === dv : k.indexOf("nom:") === 0); });
      q = memeD.filter(function (k) { var o = OF[g + "/" + k]; return o && o[1] === lv; })[0] ||
          memeD.filter(function (k) { var s = slugV(k.replace(/^nom:/, "")), sl = slugV(lv); return s && (sl.indexOf(s) >= 0 || s.indexOf(sl) >= 0); })[0] || "";
    }
    if (!q && dv) {
      var dans = cles.filter(function (k) { var o = OF[g + "/" + k]; return o && o[0] === dv; });
      q = dans.filter(function (k) { var s = slugV(k), sd = slugV(dv); return sd.indexOf(s) >= 0 || s.indexOf(sd) >= 0; })[0] || dans[0] || "";
    }
    el("v-q").value = q;
  }
  function lieuChoisi() {                         // nom affiché : la localité ou la délégation choisie (listes officielles)
    var sl = el("v-l"), sd = el("v-d");
    if (sl.value) return sl.options[sl.selectedIndex].text.replace(/ \(\d{4}\)/g, "");   // sans le code postal
    if (sd.value) return sd.options[sd.selectedIndex].text;
    return "";
  }
  function delegA(a) { if (a.dl) return a.dl; var o = a.l && OF[a.g + "/" + a.l]; return o ? o[0] : ""; }

  // standing et état du bien (15/10/2026, Ahmed) -> atouts du modèle ; « ?nom » = non indiqué (inconnu pour l'IA)
  var ETATS = ["neuf", "renove", "a_renover"];
  function etatStanding() {
    var out = [], st = el("v-std") ? el("v-std").value : "", eb = el("v-etb") ? el("v-etb").value : "";
    if (st === "haut") out.push("haut_standing"); else if (!st) out.push("?haut_standing");
    if (!eb) ETATS.forEach(function (n) { out.push("?" + n); }); else if (ETATS.indexOf(eb) >= 0) out.push(eb);
    return out;
  }
  // paramètre utilisé par le modèle d'IA aujourd'hui (la mesure décide chaque jour, décision d'Ahmed du 15/10/2026)
  // v6 (18/10/2026) : paramètres du modèle de CE type de bien (le formulaire ne montre que les cases utiles à ce type)
  function utilise(n, t) {
    t = t || (el("v-t") && el("v-t").value);
    if (window.IA_IMMO && IA_IMMO.params && t) return IA_IMMO.params(TR, t).indexOf(n) >= 0;
    var m = window.IA_IMMO && IA_IMMO.modele && IA_IMMO.modele(); return !!(m && (m.atouts || []).indexOf(n) >= 0);
  }
  // cases utiles au type choisi (Ahmed, 18/10/2026 : pas d'étage pour une villa, pas de piscine pour un bureau…)
  function casesDuType(t) {
    // 18/10/2026 (Ahmed : « local commercial, et en bas je trouve piscine ») : AUCUNE case tant que le type n'est pas choisi, et pour un
    // type que notre IA n'estime pas encore (local commercial…), pas de cases « notre IA en tient compte » du tout
    var pret = window.IA_IMMO && IA_IMMO.pret && IA_IMMO.pret();
    var estime = !!(t && pret && IA_IMMO.estime && IA_IMMO.estime(TR, t));
    var fs = form.querySelector(".v-atouts");
    [].forEach.call(form.querySelectorAll('input[name="atout"]'), function (b) {
      var ok = estime && utilise(b.value, t); b.parentNode.hidden = !ok; if (!ok) b.checked = false;
    });
    if (fs) fs.hidden = !estime || ![].some.call(form.querySelectorAll('input[name="atout"]'), function (b) { return !b.parentNode.hidden; });
    var std = el("v-std"), etb = el("v-etb"), niv = el("v-niv-l");
    if (std) { std.parentNode.hidden = !estime || !utilise("haut_standing", t); if (std.parentNode.hidden) std.value = ""; }
    if (etb) { etb.parentNode.hidden = !estime || !ETATS.some(function (n) { return utilise(n, t); }); if (etb.parentNode.hidden) etb.value = ""; }
    if (niv) niv.hidden = t !== "maison" || !estime;
  }
  function libelleChoix(id) { var x = el(id); if (!x || !x.value) return null; return noms(x.options[x.selectedIndex]); }

  // ---- le calcul
  var MIN_REF = 5;                                // biens comparables (même type, même S+, même zone) au moins pour un chiffre de référence
  function calcul() {
    var t = el("v-t").value, g = el("v-g").value, q = el("v-q").value, s = parseFloat((el("v-s").value || "").replace(",", ".")),
        ch = el("v-p").value === "" ? null : parseInt(el("v-p").value, 10);
    s = isFinite(s) && s >= 8 ? s : null;
    // formulaire vide au départ (15/10/2026, Ahmed) : rien n'est estimé tant que le type et le gouvernorat ne sont pas choisis
    casesDuType(t);
    if (!t || !g) { el("v-p-l").hidden = false; return { vide: true, t: t, g: g, q: q, s: s, ch: ch, ia: null, refPrix: null, at: [], et: null, proches: [], semblables: [], nVentes: 0 }; }
    if (!(t === "appartement" || t === "maison")) ch = null;
    el("v-p-l").hidden = !(t === "appartement" || t === "maison");
    casesDuType(t);
    // sorte de logement (15/10/2026, Ahmed : un duplex ne se compare pas à un S+3 ordinaire) : seulement pour appartement / maison
    var so = el("v-so"), sorte = "";
    if (so) {
      el("v-so-l").hidden = !(t === "appartement" || t === "maison");
      [].forEach.call(so.options, function (o) { var ok = !o.getAttribute("data-t") || o.getAttribute("data-t").split(" ").indexOf(t) >= 0; o.hidden = !ok; o.disabled = !ok; });
      if (so.selectedOptions && so.selectedOptions[0] && so.selectedOptions[0].disabled) so.value = "";
      sorte = el("v-so-l").hidden ? "" : so.value;
    }
    var SPEC = ["etage_villa", "duplex", "penthouse", "studio", "villa", "maison_trad"];
    function memeSorte(a) { var s2 = a.st || ""; return (SPEC.indexOf(sorte) >= 0 || SPEC.indexOf(s2) >= 0) ? s2 === sorte : true; }
    var A = (window.ANNONCES && ANNONCES.a) || [];
    var ventes = A.filter(function (a) { return a.t === TL && a.y === t && a.g === g && a.p != null; });
    var qslug = q.indexOf("nom:") === 0 ? "" : q;
    var dv = el("v-d").value;
    // RÈGLE (Ahmed, 15/10/2026 : « une pomme et une orange ») : lieu choisi -> seulement le même quartier ou la même délégation
    // officielle, et une surface proche ; jamais le reste du gouvernorat. « Tout le gouvernorat » choisi : tout le gouvernorat.
    var dz = dv || (qslug && OF[g + "/" + qslug] ? OF[g + "/" + qslug][0] : "");
    function dansZone(a) { return !(qslug || dz) || (qslug && a.l === qslug) || (dz && delegA(a) === dz); }
    function tailleProche(a) { return !(s && a.s) || (a.s / s >= 2 / 3 && a.s / s <= 1.5); }
    var zone = ventes.filter(function (a) { return dansZone(a) && memeSorte(a); });
    function distance(a) {           // même quartier d'abord, puis même délégation, puis pièces et surface
      var d = (qslug && a.l === qslug) ? 0 : 1;
      d += (ch !== null && a.c != null) ? Math.abs(a.c - ch) : (ch !== null ? 0.7 : 0);
      d += (s && a.s) ? Math.min(3, Math.abs(Math.log(a.s / s)) * 3) : (s ? 0.7 : 0);
      return d;
    }
    // 18/10/2026 (visiteur : deux locaux voisins de 15 m² et 70 m², même loyer de référence 1 310 DT) : surface donnée -> on compare
    // seulement à des biens dont on CONNAÎT la surface, au PRIX AU M² × la surface (jamais le prix total de biens de taille inconnue)
    var base = s ? zone.filter(function (a) { return a.s; }) : zone;
    // même nombre de pièces seulement (18/10/2026, visites simulées : un S+4 comparé à des S+2 donnait un prix plus bas que le S+3)
    if (ch !== null) base = base.filter(function (a) { return a.c === ch; });
    var proches = base.filter(tailleProche).map(function (a) { return { a: a, d: distance(a) }; }).sort(function (x, y) { return x.d - y.d || y.a.d.localeCompare(x.a.d); }).slice(0, 10).map(function (x) { return x.a; });
    if (s && proches.length < MIN_REF) proches = base.map(function (a) { return { a: a, d: distance(a) }; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 10).map(function (x) { return x.a; });
    var trouvees = proches.slice(0, 5);            // annonces semblables trouvées (montrées telles quelles, avec leur lien)
    if (proches.length < MIN_REF) proches = [];   // moins de 5 biens vraiment comparables dans la zone : pas de chiffre de référence
    var refPrix = s && proches.length ? med(proches.map(function (a) { return a.p / a.s; })) * s : med(proches.map(function (a) { return a.p; }));
    var refM2 = !!(s && proches.length);
    // cohérence (18/10/2026, visites simulées : à La Marsa, les annonces de maisons S+2 étaient plus chères que les S+3) : sans surface,
    // la référence d'un S+ ne doit pas être plus basse que celle du S+ plus petit, ni plus haute que celle du S+ plus grand ; sinon
    // « prix trop variés » plutôt qu'un chiffre qui contredit le bon sens
    var tropVaries = false;
    if (refPrix && !refM2 && ch !== null) {
      var refDe = function (c) { var l = zone.filter(function (a) { return a.c === c; }); return l.length >= MIN_REF ? med(l.map(function (a) { return a.p; })) : null; };
      var avant = refDe(ch - 1), apres = refDe(ch + 1);
      if ((avant && refPrix < avant) || (apres && refPrix > apres)) tropVaries = true;   // (appliqué plus bas, seulement sans l'IA)
    }
    // atouts cochés et étage (15/10/2026) : le modèle d'IA en tient compte (robot/atouts.py, mêmes noms)
    var at = [].slice.call(form.querySelectorAll('input[name="atout"]:checked')).map(function (x) { return x.value; });
    at = at.concat(etatStanding().filter(function (x) {           // standing / état : seulement si la case est montrée
      var b = x.replace(/^\?/, ""); return !(b === "haut_standing" ? el("v-std") && el("v-std").parentNode.hidden : el("v-etb") && el("v-etb").parentNode.hidden) || x.charAt(0) === "?";
    }));
    if (["duplex", "etage_villa", "penthouse"].indexOf(sorte) >= 0) at.push(sorte);   // paramètre de l'IA si la mesure l'a gardé
    var et = el("v-e") && el("v-e").value !== "" ? parseInt(el("v-e").value, 10) : null;
    if (el("v-e-l")) el("v-e-l").hidden = !(t === "appartement" || t === "bureau" || t === "commerce");
    // sorte (villa, étage de villa, duplex…) et nombre de niveaux d'une maison : paramètres du modèle de ce type (v6)
    var niv = el("v-niv") && el("v-niv").value !== "" && t === "maison" ? parseInt(el("v-niv").value, 10) : null;
    var plus = {st: (t === "appartement" || t === "maison") ? sorte : null, niveaux: niv};
    var ia = window.IA_IMMO && IA_IMMO.pret() ? IA_IMMO.estimer(TR, t, g, q, s, ch, at, et, plus) : null;
    // RÈGLE d'Ahmed (18/10/2026) : « notre estimation se base sur le modèle, sinon pas d'estimation » -> sans l'IA, AUCUN chiffre
    // (plus de « médiane des annonces les plus proches ») : on montre seulement les annonces trouvées et on le dit
    if (!ia) { refPrix = null; tropVaries = false; } else tropVaries = false;
    var sansSurface = !s && window.IA_IMMO && IA_IMMO.pret() && (((IA_IMMO.modele() || {}).surface_obligatoire || []).indexOf(t) >= 0 || (t === "maison" && ch === null));
    var m2 = function (l) { return med(l.filter(function (a) { return a.s; }).map(function (a) { return a.p / a.s; })); };
    var duQuartier = qslug ? ventes.filter(function (a) { return a.l === qslug; }) : [];
    var semblables = zone.filter(function (a) { return ch === null || a.c == null || Math.abs(a.c - ch) <= 1; });
    return { t: t, g: g, q: q, s: s, ch: ch, ia: ia, at: at, et: et, plus: plus, sansSurface: sansSurface, proches: proches, trouvees: ia ? [] : trouvees, refPrix: refPrix, refM2: refM2, tropVaries: tropVaries, nVentes: ventes.length,
             m2Q: duQuartier.length >= 3 ? m2(duQuartier) : null, m2G: (qslug || dz) ? null : m2(ventes),
             m2D: dz && zone.length >= 3 ? m2(zone) : null, dz: dz, semblables: semblables };
  }

  // précision selon ce qui est rempli : plus le client donne d'informations, plus le résultat est précis (15/10/2026, Ahmed)
  function precision(r) {
    var t = r.t, champs = [
      [!!t, T2("le type de bien", "نوع العقار")], [!!r.g, T2("le gouvernorat", "الولاية")],
      [!!el("v-d").value, T2("la délégation", "المعتمدية")], [!!el("v-l").value, T2("la localité", "المنطقة")],
      [!!r.s, T2("la surface", "المساحة")]];
    // standing / état : seulement s'ils sont montrés pour ce type (jamais « ajoutez le standing » d'un local commercial)
    if (el("v-std") && !el("v-std").parentNode.hidden) champs.push([!!(el("v-std").value && utilise("haut_standing")), T2("le standing", "المستوى")]);
    if (el("v-etb") && !el("v-etb").parentNode.hidden) champs.push([!!el("v-etb").value, T2("l’état du bien", "حالة العقار")]);
    if (!t || t === "appartement" || t === "maison") champs.push([el("v-p").value !== "", T2("le nombre de pièces", "عدد الغرف")]);
    if (t === "appartement" || t === "bureau" || t === "commerce") champs.push([el("v-e").value !== "", T2("l’étage", "الطابق")]);
    if (t === "maison" && el("v-niv")) champs.push([el("v-niv").value !== "", T2("le nombre de niveaux", "عدد الطوابق")]);
    var n = champs.filter(function (c) { return c[0]; }).length, manque = champs.filter(function (c) { return !c[0]; }).map(function (c) { return c[1]; });
    var pts = Math.round(n / champs.length * 5), barre = "";
    for (var i = 0; i < 5; i++) barre += '<span class="pt' + (i < pts ? " plein" : "") + '"></span>';
    return '<p class="v-precision"><span class="v-precision-titre">' + T2("Précision du résultat", "دقة النتيجة") + ' <span class="v-barre" aria-label="' + pts + '/5">' + barre + "</span></span>" +
      (manque.length ? T2("Plus précis avec : ", "أدق مع: ") + manque.join(", ") + (r.vide || (form.querySelector(".v-atouts") || {}).hidden ? "" : T2(" (et les atouts de votre bien).", " (ومزايا عقارك).")) : ((form.querySelector(".v-atouts") || {}).hidden ? T2("✅ Tout est rempli.", "✅ كل شيء معبّأ.") : T2("✅ Tout est rempli : cochez aussi les atouts.", "✅ كل شيء معبّأ: اختر أيضًا المزايا."))) + "</p>";
  }

  function afficherGratuit(r) {
    if (r.vide) {
      res.innerHTML = '<p class="ia-ligne ia-vide"><span>' + T2("Prix estimé par notre IA", "السعر الذي يقدّره ذكاؤنا الاصطناعي") + "</span><b>" + dt(0) + "</b><small>" +
        T2("Commencez par choisir le type de bien et le gouvernorat ", "ابدأ باختيار نوع العقار والولاية ") + '<a href="#estimer">' + T2("dans « 1. À remplir »", "في « 1. للتعبئة »") + "</a>" +
        T2(" : le résultat apparaît ici et change à chaque information ajoutée.", ": تظهر النتيجة هنا وتتغيّر مع كل معلومة تضيفها.") + "</small></p>" + precision(r);
      return;
    }
    var lc = lieuChoisi(), lieu = (lc ? lc + ", " : (r.q ? nomQ(r.g, r.q) + ", " : "")) + nomG(r.g), h = "";
    if (r.sansSurface) h += '<p class="v-surface-svp">📐 ' + (r.t === "maison" ? T2("Indiquez la surface ou le nombre de pièces : notre IA en a besoin pour estimer une maison.", "أدخل المساحة أو عدد الغرف: يحتاجها ذكاؤنا الاصطناعي لتقدير منزل.")
      : T2("Indiquez la surface : pour un terrain, c’est elle qui fait le prix, et notre IA en a besoin pour estimer.", "أدخل المساحة: في الأرض هي التي تحدّد السعر، ويحتاجها ذكاؤنا الاصطناعي للتقدير.")) + "</p>";
    if (r.ia) {
      h += '<p class="ia-ligne"><span>' + T2("Prix estimé par notre IA", "السعر الذي يقدّره ذكاؤنا الاصطناعي") + "</span><b>" + dt(r.ia[0]) + "</b><small>" +
           T2("fourchette probable : ", "المجال المرجّح: ") + dt(r.ia[1]) + " – " + dt(r.ia[2]) + "</small>" +
           (acces().ok ? "" : '<small class="indicatif">' + T2("Estimation gratuite à titre indicatif, non complète.", "تقدير مجاني للاستئناس، غير كامل.") + "</small>") + "</p>";
    } else if (r.refPrix) {
      h += '<p class="ia-ligne"><span>' + T2("Prix de référence des annonces semblables", "سعر المرجع للإعلانات المشابهة") + "</span><b>" + dt(r.refPrix) + "</b><small>" +
           (r.refM2 ? T2("prix au m² des annonces semblables (médiane) × votre surface", "سعر المتر المربع للإعلانات المشابهة (الوسيط) × مساحتك")
                    : T2("médiane des annonces les plus proches (ajoutez la surface pour un résultat au m²)", "وسيط أقرب الإعلانات (أضف المساحة لنتيجة حسب المتر المربع)")) + "</small></p>";
    } else if (r.trouvees && r.trouvees.length) {
      // 18/10/2026 (Ahmed : « améliore ces paragraphes ») : en pleine largeur, court et clair
      h += '<p class="v-pas"><b>' + T2("Trop peu d’annonces ici", "إعلانات قليلة جدًا هنا") + "</b>" +
           '<span class="v-pas-sous">' + T2("Voici les plus proches :", "إليك الأقرب:") + '</span></p><ul class="v-trouvees">' +
           r.trouvees.map(function (x) {
             // UNE ligne par annonce (18/10/2026, Ahmed) : le lieu se coupe (« … ») plutôt que de passer à la ligne
             return "<li><b>" + dt(x.p) + "</b>" + (x.s ? "<span> · " + nb(x.s) + " m²</span>" : "") + (x.c != null ? '<span> · <bdi dir="ltr">S+' + x.c + "</bdi></span>" : "") +
                    '<span class="v-tr-lieu"> · ' + esc(x.l ? nomQ(r.g, x.l) : (x.n || nomG(r.g))) + '</span><span> · <a href="' + esc(x.u) + '" target="_blank" rel="noopener nofollow">' + T2("voir", "شاهد") + "</a></span></li>";
           }).join("") + "</ul>";
    } else if (r.tropVaries) {
      h += "<p>" + T2("Les annonces semblables de cette zone ont des prix trop variés pour donner un chiffre fiable (un plus petit bien y est parfois annoncé plus cher). Ajoutez la surface : la comparaison se fera au m².", "الإعلانات المشابهة في هذه المنطقة أسعارها متفاوتة جدًا لإعطاء رقم موثوق. أضف المساحة: تتم المقارنة حسب المتر المربع.") + "</p>";
    } else {
      h += "<p>" + T2("Pas encore assez d’annonces semblables (même type, même nombre de pièces) près de chez vous pour donner un chiffre fiable. Essayez sans préciser la localité, ou ajoutez la surface.", "لا توجد بعد إعلانات مشابهة كافية (نفس النوع ونفس عدد الغرف) قربك لإعطاء رقم موثوق. جرّب دون تحديد المنطقة، أو أضف المساحة.") + "</p>";
    }
    if (r.ia || r.refPrix) {
      h += '<p class="petit base-calcul"><b>' + T2("Sur quelle base ?", "على أي أساس؟") + "</b> " +
           T2("Comparé à ", "مقارنة بـ ") + nb(r.nVentes) + T2(" annonces de vente de ce type à ", " إعلان بيع من هذا النوع في ") + esc(nomG(r.g)) +
           (r.proches.length ? T2(", dont les ", "، منها ") + nb(r.proches.length) + T2(" plus proches de votre bien", " الأقرب إلى عقارك") + (r.q ? T2(" (" + esc(lieu) + ")", " (" + esc(lieu) + ")") : "") : "") +
           (r.ia ? T2(" ; et notre modèle d’IA", "؛ ونموذج الذكاء الاصطناعي") : "") + ".</p>";
      if (!acces().ok) h += '<p class="petit"><a href="#pass-vendeur">' + T2("→ Voir l’analyse complète (3 prix, annonces de référence avec leur lien, prix au m², concurrence)", "← شاهد التحليل الكامل (3 أسعار، إعلانات المرجع مع روابطها، السعر بالمتر، المنافسة)") + "</a></p>";
    }
    var k = h.indexOf("</p>", h.indexOf('class="ia-ligne"'));          // la précision juste sous le prix
    res.innerHTML = k > 0 ? h.slice(0, k + 4) + precision(r) + h.slice(k + 4) : h + precision(r);
  }

  // sans Pass (15/10/2026, Ahmed) : la carte « 3. Le résultat complet » existe quand même, VERROUILLÉE, avec le tampon EXEMPLE
  // (chiffres fictifs de l'exemple du Pass) et « disponible seulement si vous avez le Pass »
  function afficherVerrou(r, a) {
    var v = el("v-verrou");
    if (!v) return;
    v.hidden = a.ok || !(r.ia || r.refPrix);
    if (v.hidden) { v.innerHTML = ""; return; }
    var ouvert = el("v-verrou-d") ? el("v-verrou-d").open : false, ex = document.querySelector(".exemple-proprio-corps");
    v.innerHTML = '<details class="pliable" id="v-verrou-d"' + (ouvert ? " open" : "") + "><summary><h2>" + T2("🔒 Voir un exemple de l’analyse complète", "🔒 شاهد مثالًا للتحليل الكامل") + "</h2>" +
      '<span class="pli-sous pli-sous-garde"><b>' + T2("Disponible seulement si vous avez le Pass Propriétaire.", "متاح فقط إن كان لديك باس المالك.") + "</b> " +
      T2("Touchez + pour voir un exemple.", "المس + لترى مثالًا.") + "</span></summary>" +
      '<p class="v-pour v-verrou-msg">🔒 <b>' + T2("Disponible seulement si vous avez le Pass Propriétaire", "متاح فقط إن كان لديك باس المالك") + "</b>. " +
      T2("Ci-dessous, un EXEMPLE aux chiffres fictifs : avec le Pass, ce sont les chiffres de VOTRE bien.", "أسفله مثال بأرقام وهمية: مع الباس تظهر أرقام عقارك أنت.") + "</p>" +
      '<div class="verrou-ex">' + (ex ? ex.innerHTML : '<span class="tg-tampon" aria-hidden="true">' + T2("EXEMPLE", "مثال") + "</span>") + "</div>" +
      '<a class="btn-paie" href="#pass-vendeur">' + T2("Prendre le Pass Propriétaire", "خذ باس المالك") + "</a></details>";
  }

  function afficherAnalyse(r) {
    var z = el("v-analyse"), a = acces();
    afficherVerrou(r, a);
    if (!a.ok || !(r.ia || r.refPrix)) { z.hidden = true; z.innerHTML = ""; return; }
    var juste = r.ia ? r.ia[0] : r.refPrix, bas = r.ia ? r.ia[1] : r.refPrix * 0.9, haut = r.ia ? r.ia[2] : r.refPrix * 1.1;
    // carte repliable (15/10/2026, Ahmed : « est-ce un exemple ? il faut l'indiquer ; carte compacte, + pour l'agrandir ») :
    // le résumé dit QUEL bien est analysé (celui du formulaire, pas un exemple) et donne le juste prix
    var ouvert = el("v-analyse-d") ? el("v-analyse-d").open : false;
    var o = noms(el("v-t").options[el("v-t").selectedIndex]), li = lieuxDeux();
    var bien = (ar() ? (o[1] || o[0]) : o[0]) + (r.ch !== null && r.ch !== undefined ? " S+" + r.ch : "") + (r.s ? ", " + nb(r.s) + (ar() ? " م²" : " m²") : "") + ", " + esc(li[ar() ? 1 : 0]);
    var h = '<details class="pliable" id="v-analyse-d"' + (ouvert ? " open" : "") + "><summary><h2>" + T2("📂 Ouvrir votre analyse complète", "📂 افتح تحليلك الكامل") + "</h2>" +
      '<span class="pli-sous pli-sous-garde"><b>' + bien + "</b> · " + (LOC ? T2("juste loyer : ", "الكراء العادل: ") : T2("juste prix : ", "السعر العادل: ")) + "<b>" + dt(juste) + "</b><br>" +
      T2("Touchez + pour voir toute l’analyse.", "المس + لترى كامل التحليل.") + "</span></summary>";
    h += '<p class="v-pour">📌 ' + T2("Ce n’est pas un exemple : c’est l’analyse de VOTRE bien, tel que décrit dans le formulaire au-dessus", "ليس مثالًا: هذا تحليل عقارك أنت كما وصفته في الاستمارة أعلاه") +
      " (" + bien + ")." + (r.s ? "" : " " + T2("Ajoutez la surface pour un calcul plus précis.", "أضف المساحة لحساب أدق.")) + " " + T2("Changez le formulaire : l’analyse se met à jour.", "غيّر الاستمارة: يتحدّث التحليل.") + "</p>";
    h += '<ul class="trois-prix">' +
      "<li><span>" + T2("Pour vendre vite", "للبيع بسرعة") + "</span><b>" + dt(bas) + "</b><small>" + T2("en dessous de la plupart des annonces semblables : attire vite les acheteurs", "أقل من أغلب الإعلانات المشابهة: يجذب المشترين بسرعة") + "</small></li>" +
      '<li class="juste"><span>' + T2("Le juste prix du marché", "السعر العادل في السوق") + "</span><b>" + dt(juste) + "</b><small>" + T2("là où se situe le marché pour un bien comme le vôtre", "حيث يقف السوق لعقار مثل عقارك") + "</small></li>" +
      "<li><span>" + T2("Prix haut", "سعر مرتفع") + "</span><b>" + dt(haut) + "</b><small>" + T2("seulement si votre bien a de vrais atouts (vue, étage, rénové, jardin…) : la vente sera plus longue", "فقط إن كانت لعقارك مزايا حقيقية (إطلالة، طابق، تجديد، حديقة…): سيطول البيع") + "</small></li></ul>";
    if (r.s) {
      h += "<h3>" + T2("Votre prix au m²", "سعرك بالمتر المربع") + "</h3><p>" + T2("Au juste prix : ", "بالسعر العادل: ") + dt(juste / r.s) + T2(" par m²", " للمتر المربع") +
        (r.m2Q ? T2(" · quartier : ", " · الحي: ") + dt(r.m2Q) + " (" + pc((juste / r.s / r.m2Q - 1) * 100) + ")" : "") +
        (r.m2D && r.m2D !== r.m2Q ? T2(" · délégation : ", " · المعتمدية: ") + dt(r.m2D) + " (" + pc((juste / r.s / r.m2D - 1) * 100) + ")" : "") +
        (r.m2G ? T2(" · gouvernorat : ", " · الولاية: ") + dt(r.m2G) + " (" + pc((juste / r.s / r.m2G - 1) * 100) + ")" : "") + "</p>";
    }
    h += valeurAtouts(r);
    var px = r.semblables.map(function (x) { return x.p; });
    h += "<h3>" + T2("La concurrence en ce moment", "المنافسة الآن") + "</h3><p>" + nb(r.semblables.length) +
      T2(" biens semblables sont en vente", " عقارًا مشابهًا معروضًا للبيع") + (px.length >= 4 ? T2(" ; la moitié entre ", "؛ نصفها بين ") + dt(quart(px, 0.25)) + T2(" et ", " و") + dt(quart(px, 0.75)) : "") +
      ". " + T2("Plus il y en a, plus un prix juste compte pour vendre.", "كلما زاد عددها، زادت أهمية السعر العادل للبيع.") + "</p>";
    var logt = r.t === "appartement" || r.t === "maison";   // pièces (S+N) : seulement pour un logement
    if (r.proches.length) {
      h += "<h3>" + T2("Les annonces de référence (les plus proches de votre bien)", "إعلانات المرجع (الأقرب إلى عقارك)") + '</h3><div class="inv-tableau"><table><thead><tr><th>' +
        T2("Prix", "السعر") + "</th><th>" + T2("Surface", "المساحة") + "</th>" + (logt ? "<th>" + T2("Pièces", "الغرف") + "</th>" : "") + "<th>" + T2("Lieu", "المكان") + "</th><th></th></tr></thead><tbody>" +
        r.proches.map(function (x) {
          return "<tr><td><b>" + dt(x.p) + "</b>" + (x.s ? "<small>" + dt(x.p / x.s) + "/m²</small>" : "") + "</td><td>" + (x.s ? nb(x.s) + " m²" : "—") + "</td>" + (logt ? "<td>" + (x.c != null ? '<bdi dir="ltr">S+' + x.c + "</bdi>" : "—") + "</td>" : "") +
            "<td>" + esc(x.l ? nomQ(r.g, x.l) : (x.n || nomG(r.g))) + '</td><td><a href="' + esc(x.u) + '" target="_blank" rel="noopener nofollow">' + T2("voir", "شاهد") + "</a></td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    h += blocAnnonce(r, juste);
    h += "<h3>" + T2("Comment ce prix est calculé", "كيف حُسب هذا السعر") + "</h3><p>" +
      (r.ia ? T2("Notre IA compare votre bien aux annonces semblables du site et tient compte du type de bien, du quartier, de la surface, des pièces et des atouts. ",
                 "يقارن ذكاؤنا الاصطناعي عقارك بالإعلانات المشابهة في الموقع ويأخذ بعين الاعتبار النوع والحي والمساحة والغرف والمزايا. ")
            : T2("Pour ce type de bien, notre IA ne fait pas encore mieux qu’une simple comparaison : le juste prix est la médiane des annonces les plus proches du vôtre. ",
                 "لهذا النوع، لا يتفوّق ذكاؤنا الاصطناعي بعد على المقارنة البسيطة: السعر العادل هو وسيط أقرب الإعلانات إلى عقارك. ")) +
      (LOC ? T2("Les annonces de référence viennent seulement de votre quartier ou de votre délégation, avec une surface proche. Ce sont des loyers DEMANDÉS : un bail se signe souvent un peu plus bas.", "إعلانات المرجع من حيّك أو معتمديتك فقط، بمساحة قريبة. هي أسعار كراء معروضة: يُوقَّع العقد غالبًا بأقل قليلًا.") : T2("Les annonces de référence viennent seulement de votre quartier ou de votre délégation, avec une surface proche. Ce sont des prix DEMANDÉS : une vente se signe souvent 5 à 10 % plus bas.",
         "إعلانات المرجع من حيّك أو معتمديتك فقط، بمساحة قريبة. هي أسعار معروضة: يُوقَّع البيع غالبًا بأقل بـ 5 إلى 10 %.")) + "</p>";
    z.innerHTML = h + "</details>";
    z.hidden = false;
    brancherAnnonce(r, juste);
  }

  // ---- Pass Propriétaire, 4 avantages de plus (15/10/2026, « Fais 1, 2, 3 et 4 » d'Ahmed : pourquoi payer si l'estimation est gratuite ?)
  // (3) ce que chaque atout AJOUTE au prix : le même modèle d'IA, avec et sans l'atout (rien d'inventé : si l'IA ne voit pas de
  //     différence nette, on ne l'affiche pas)
  function nomAtout(b, langue) { var x = b.parentNode.querySelector('[data-l="' + langue + '"]'); return x ? x.textContent : b.value; }
  function valeurAtouts(r) {
    if (!r.ia || !window.IA_IMMO || !IA_IMMO.pret()) return "";
    var lignes = [];
    [].forEach.call(form.querySelectorAll('input[name="atout"]'), function (b) {
      var avec = b.checked ? r.at : r.at.concat([b.value]), sans = r.at.filter(function (x) { return x !== b.value; });
      if (b.parentNode.hidden) return;
      var e1 = IA_IMMO.estimer(TR, r.t, r.g, r.q, r.s, r.ch, avec, r.et, r.plus), e0 = IA_IMMO.estimer(TR, r.t, r.g, r.q, r.s, r.ch, sans, r.et, r.plus);
      if (!e1 || !e0) return;
      var d = e1[0] - e0[0];
      if (d / e0[0] >= 0.02) lignes.push([d, b.checked, nomAtout(b, ar() ? "ar" : "fr")]);
    });
    // standing et état : le même bien en standing normal / bon état, puis haut standing, neuf, rénové
    var base = r.at.filter(function (x) { var n = x.replace(/^\?/, ""); return n !== "haut_standing" && ETATS.indexOf(n) < 0; });
    [["haut_standing", T2("Haut standing", "راقٍ"), el("v-std") && el("v-std").value === "haut"], ["neuf", T2("Neuf", "جديد"), el("v-etb") && el("v-etb").value === "neuf"],
     ["renove", T2("Rénové", "مجدَّد"), el("v-etb") && el("v-etb").value === "renove"]].forEach(function (v) {
      var e1 = IA_IMMO.estimer(TR, r.t, r.g, r.q, r.s, r.ch, base.concat([v[0]]), r.et, r.plus), e0 = IA_IMMO.estimer(TR, r.t, r.g, r.q, r.s, r.ch, base, r.et, r.plus);
      if (e1 && e0 && (e1[0] - e0[0]) / e0[0] >= 0.02) lignes.push([e1[0] - e0[0], !!v[2], v[1]]);
    });
    lignes.sort(function (x, y) { return y[0] - x[0]; });
    var h = "<h3>" + T2("Ce que chaque atout ajoute à votre prix", "ما تضيفه كل ميزة إلى سعرك") + '</h3><ul class="v-atouts-valeur">';
    h += lignes.length ? lignes.map(function (x) {
      return "<li><b>" + esc(x[2]) + "</b> : " + '<span class="plus">+' + dt(x[0]) + "</span>" + (LOC ? T2(" par mois", " شهريًا") : "") +
        (x[1] ? " <small>" + T2("(coché : déjà compté dans votre prix)", "(مختارة: محسوبة في سعرك)") + "</small>" : " <small>" + T2("(si votre bien l’a)", "(إن كانت في عقارك)") + "</small>") + "</li>";
    }).join("") : "<li>" + T2("Dans ce quartier, notre IA ne voit pas de différence nette due aux atouts : c’est surtout le lieu, la surface et les pièces qui font le prix.", "في هذا الحي لا يرى ذكاؤنا الاصطناعي فرقًا واضحًا بسبب المزايا: المكان والمساحة والغرف هي التي تحدّد السعر.") + "</li>";
    return h + '</ul><p class="petit">' + T2("Calcul de notre IA : le même bien, avec et sans l’atout. Cochez vos vrais atouts plus haut : le prix se met à jour.", "حساب ذكائنا الاصطناعي: نفس العقار مع الميزة ودونها. اختر مزاياك الحقيقية أعلاه: يتحدّث السعر.") + "</p>";
  }

  // (2) l'annonce prête à publier (français + arabe), (4) publiée MISE EN AVANT chez nous, (1) suivi Telegram chaque semaine
  var TYPES_L = { appartement: "a", maison: "m", terrain: "t", bureau: "b", commerce: "c" };
  function lieuxDeux() {
    var g = el("v-g").value, dv = el("v-d").value, lv = el("v-l").value, G = (window.LIEUX && LIEUX.g && LIEUX.g[g]) || [g, g], fr = "", a = "";
    var d = dv ? delegsV(g).filter(function (x) { return x[0] === dv; })[0] : null;
    if (lv.indexOf("q:") === 0) { var x = ((window.LIEUX && LIEUX.l) || {})[g + "/" + lv.slice(2)]; if (x) { fr = x[0]; a = x[1]; } }
    else if (lv) { var lo = d && d[2].filter(function (y) { return y[0] === lv; })[0]; fr = lv; a = (lo && lo[1]) || lv; }
    else if (d) { fr = d[0]; a = d[1] || d[0]; }
    return [fr ? fr + " (" + G[0] + ")" : G[0], a ? a + " (" + G[1] + ")" : G[1]];
  }
  function chiffre(x) { return Math.round(x).toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " "); }
  function texteAnnonce(r, prix) {
    var o = noms(el("v-t").options[el("v-t").selectedIndex]), tfr = o[0], tar = o[1] || o[0], li = lieuxDeux();
    var sn = r.ch !== null && r.ch !== undefined ? " S+" + r.ch : "";
    var coches = [].filter.call(form.querySelectorAll('input[name="atout"]'), function (b) { return b.checked; });
    var atFr = coches.map(function (b) { return nomAtout(b, "fr").toLowerCase(); }), atAr = coches.map(function (b) { return nomAtout(b, "ar"); });
    [libelleChoix("v-std"), libelleChoix("v-etb")].forEach(function (c, i) {
      if (c && !(i === 0 && el("v-std").value === "normal")) { atFr.unshift(c[0].toLowerCase()); atAr.unshift(c[1]); }
    });
    var etFr = r.et === null || r.et === undefined ? "" : r.et === 0 ? "Rez-de-chaussée." : "Étage : " + r.et + ".";
    var etAr = r.et === null || r.et === undefined ? "" : r.et === 0 ? "الطابق الأرضي." : "الطابق: " + r.et + ".";
    var titre = (tfr + sn + (r.s ? " " + chiffre(r.s) + " m²" : "") + " – " + li[0].replace(/ \(.*\)$/, "")).slice(0, 70);
    var fr = [(LOC ? "À louer : " : "À vendre : ") + tfr.toLowerCase() + sn + (r.s ? " de " + chiffre(r.s) + " m²" : "") + ", " + li[0] + ".",
              etFr, atFr.length ? "Atouts : " + atFr.join(", ") + "." : "",
              (LOC ? "Loyer : " + chiffre(prix) + " DT par mois." : "Prix : " + chiffre(prix) + " DT."), "Visite sur rendez-vous."].filter(Boolean).join("\n");
    var a = [(LOC ? "للكراء: " : "للبيع: ") + tar + sn + (r.s ? " مساحتها " + chiffre(r.s) + " م²" : "") + "، " + li[1] + ".",
             etAr, atAr.length ? "المزايا: " + atAr.join("، ") + "." : "",
             (LOC ? "الكراء: " + chiffre(prix) + " دينار شهريًا." : "السعر: " + chiffre(prix) + " دينار."), "الزيارة بموعد."].filter(Boolean).join("\n");
    return { titre: titre, fr: fr, ar: a };
  }
  function prixVoulu(juste) { var p = etat && etat.prix ? etat.prix : 0; return p > 0 ? p : rond(juste); }
  function blocAnnonce(r, juste) {
    var p = prixVoulu(juste);
    return "<h3>" + T2("Votre annonce, prête à publier", "إعلانك جاهز للنشر") + "</h3>" +
      '<label class="v-mon-prix">' + T2("Votre prix demandé (DT)", "السعر الذي تطلبه (دينار)") + ' <input id="v-mon-prix" type="number" inputmode="numeric" min="1" step="1" value="' + Math.round(p) + '"></label>' +
      '<p class="petit" id="v-mon-avis"></p>' +
      '<div class="v-texte"><p><b>' + T2("En français", "بالفرنسية") + '</b> <button type="button" class="btn-copier" data-copier="v-texte-fr">' + T2("Copier", "نسخ") + '</button></p><textarea id="v-texte-fr" rows="6" dir="ltr" readonly></textarea></div>' +
      '<div class="v-texte"><p><b>' + T2("En arabe", "بالعربية") + '</b> <button type="button" class="btn-copier" data-copier="v-texte-ar">' + T2("Copier", "نسخ") + '</button></p><textarea id="v-texte-ar" rows="6" dir="rtl" readonly></textarea></div>' +
      '<p class="petit">' + T2("À coller sur les sites d’annonces, sur Facebook ou ailleurs. Relisez-le : vous connaissez votre bien mieux que nous.", "للصقه في مواقع الإعلانات أو فيسبوك أو غيرهما. راجعه: أنت تعرف عقارك أفضل منا.") + "</p>" +
      "<h3>" + T2("⭐ Votre annonce mise en avant sur notre site", "⭐ إعلانك مميّز في موقعنا") + "</h3><p>" +
      T2("Publiez-la ici (gratuit) avec ce texte : pendant votre Pass, elle passe EN TÊTE des annonces de votre quartier et de votre gouvernorat, avec l’étiquette « ⭐ En avant ».", "انشره هنا (مجانًا) بهذا النص: طوال مدة باسك يظهر في أعلى إعلانات حيّك وولايتك مع علامة « ⭐ مميّز ».") +
      '</p><a class="btn-paie" id="v-publier" href="#">' + T2("Publier mon annonce mise en avant", "انشر إعلاني المميّز") + "</a>" +
      "<h3>" + T2("📲 Le suivi de votre concurrence, chaque semaine sur Telegram", "📲 متابعة منافسيك كل أسبوع على تيليغرام") + "</h3><p>" +
      T2("Pendant 30 jours : les nouveaux biens concurrents de votre quartier, leurs baisses de prix, et notre conseil sur votre prix.", "طوال 30 يومًا: العقارات المنافسة الجديدة في حيّك، تخفيضات أسعارها، ونصيحتنا حول سعرك.") +
      '</p><a class="btn-paie" id="v-suivi" href="#" target="_blank" rel="noopener">' + T2("Recevoir le suivi sur Telegram", "استلم المتابعة على تيليغرام") + "</a>";
  }
  function slugL(x) { return slugV(x).slice(0, 40); }
  function brancherAnnonce(r, juste) {
    var champ = el("v-mon-prix");
    if (!champ) return;
    function maj() {
      var p = parseFloat(champ.value) > 0 ? parseFloat(champ.value) : rond(juste), t = texteAnnonce(r, p);
      el("v-texte-fr").value = t.titre + "\n\n" + t.fr; el("v-texte-ar").value = t.ar;
      var ecart = (p / juste - 1) * 100;
      el("v-mon-avis").innerHTML = Math.abs(ecart) < 3 ? T2("✅ Votre prix est au juste prix du marché.", "✅ سعرك هو السعر العادل في السوق.")
        : ecart > 0 ? T2("Votre prix est ", "سعرك أعلى بـ ") + pc(ecart) + T2(" au-dessus du juste prix : gardez-le seulement si votre bien a de vrais atouts.", " من السعر العادل: احتفظ به فقط إن كانت لعقارك مزايا حقيقية.")
        : T2("Votre prix est ", "سعرك أقل بـ ") + pc(ecart) + T2(" sous le juste prix : votre bien partira vite, mais vous pourriez demander plus.", " من السعر العادل: سيذهب عقارك بسرعة، لكن يمكنك طلب أكثر.");
      var lv = el("v-l").value, dv = el("v-d").value;
      var q = new URLSearchParams({ t: TL, y: r.t, g: r.g, l: slugV(lv.indexOf("q:") === 0 ? lv.slice(2) : (lv || dv)), px: String(Math.round(p)),
                                    ti: t.titre, de: t.fr + "\n\n" + t.ar, av: etat && JETON && JETON.code === etat.code ? JETON.j : "" });
      if (r.s) q.set("s", String(Math.round(r.s)));
      if (r.ch !== null && r.ch !== undefined) q.set("c", String(r.ch));
      el("v-publier").href = racine + "deposer/?" + q.toString();
      // lien Telegram : /start p_<code>_<transaction+type>_<gouvernorat>_<pièces>_<prix en base 36>_<quartier> (64 caractères au plus)
      var debut = "p_" + (etat ? etat.code.slice(4) : "") + "_" + TL + (TYPES_L[r.t] || "a") + "_" + r.g + "_" + (r.ch !== null && r.ch !== undefined ? r.ch : "x") + "_" + Math.round(p).toString(36) + "_";
      var sfx = window.suffixeTG ? window.suffixeTG() : "";     // langue de la page (le robot répondra dans cette langue, 19/10/2026)
      el("v-suivi").href = "https://t.me/AlerteImmobilierTunisieBot?start=" + debut + slugL(r.q.replace(/^nom:/, "")).slice(0, Math.max(0, 64 - debut.length - sfx.length)) + sfx;
    }
    champ.addEventListener("input", function () { var v = parseFloat(champ.value); if (etat) { etat.prix = v > 0 ? v : null; garder(); } maj(); });
    maj();
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-copier]");
    if (!b) return;
    var t = el(b.getAttribute("data-copier")), ok = function () { b.textContent = T2("Copié ✓", "تم النسخ ✓"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, function () { t.select(); });
    else { t.select(); try { document.execCommand("copy"); ok(); } catch (x) { /* l'utilisateur copie à la main */ } }
  });

  // cartes repliables (15/10/2026, Ahmed : « chaque carte compacte, le client clique dessus ») : un lien vers une partie repliée
  // l'ouvre ; Pass actif -> l'estimation s'ouvre, l'analyse complète apparaît juste dessous
  function ouvrir(cible) {
    for (var x = cible; x; x = x.parentElement) if (x.tagName === "DETAILS") x.open = true;
    var p = cible.querySelector && cible.querySelector("details.pliable"); if (p) p.open = true;     // lien vers la carte elle-même
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="#"]'), t = a && document.getElementById(a.getAttribute("href").slice(1));
    if (t) ouvrir(t);
  });
  if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))) ouvrir(document.getElementById(location.hash.slice(1)));

  function afficherEtat() {
    var b = el("v-etat"), a = acces(), h = "";
    el("v-prendre").hidden = !!etat;
    if (a.ok && el("estimer-d") && !el("estimer-d").dataset.vu) { el("estimer-d").open = true; el("estimer-d").dataset.vu = "1"; }
    // Pass actif (15/10/2026, Ahmed) : plus le mot « gratuit » ; la carte devient « Analyse complète et détaillée »
    if (el("v-titre")) {
      if (!el("v-titre").dataset.libre) el("v-titre").dataset.libre = el("v-titre").innerHTML;
      el("v-titre").innerHTML = a.ok ? esc(LOC ? T2("Analyse complète et détaillée du loyer de votre bien", "التحليل الكامل والمفصّل لكراء عقارك") : T2("Analyse complète et détaillée de votre bien", "التحليل الكامل والمفصّل لعقارك")) : el("v-titre").dataset.libre;
      el("v-note").hidden = a.ok;   // plus de badge « GRATUIT » sur le formulaire (Ahmed, 15/10/2026 : on le remplit avec ou sans Pass)
      if (!el("v-sous").dataset.libre) el("v-sous").dataset.libre = el("v-sous").innerHTML;
      // carte générale du résultat : avec le Pass, plus de « gratuit » ni de « payant » (15/10/2026, Ahmed)
      if (el("res-titre-a")) {
        ["res-titre-a", "res-titre-b"].forEach(function (id) { if (!el(id).dataset.libre) el(id).dataset.libre = el(id).innerHTML; });
        el("res-titre-a").innerHTML = a.ok ? esc(T2("⚡ Estimation rapide", "⚡ تقدير سريع")) : el("res-titre-a").dataset.libre;
        el("res-titre-b").innerHTML = a.ok ? esc(T2("⭐ Votre analyse complète et détaillée (Pass actif)", "⭐ تحليلك الكامل والمفصّل (الباس مفعّل)")) : el("res-titre-b").dataset.libre;
      }
      if (el("p-ruban")) { if (!el("p-ruban").dataset.libre) el("p-ruban").dataset.libre = el("p-ruban").innerHTML;
        el("p-ruban").innerHTML = a.ok ? esc(T2("✅ Votre Pass est actif", "✅ باسك مفعّل")) : el("p-ruban").dataset.libre; }
      if (el("p-sous")) { if (!el("p-sous").dataset.libre) el("p-sous").dataset.libre = el("p-sous").innerHTML;
        el("p-sous").innerHTML = a.ok ? "✅ " + T2("Votre Pass est actif jusqu’au ", "باسك مفعّل إلى غاية ") + jfr(a.fin) + T2(" inclus. Votre code et le détail du Pass : touchez +.", ". رمزك وتفاصيل الباس: المس +.") : el("p-sous").dataset.libre; }
      el("v-sous").innerHTML = a.ok ? esc(T2("Votre Pass Propriétaire est actif : décrivez votre bien, l’analyse complète s’affiche juste dessous.", "باس المالك مفعّل: صف عقارك، ويظهر التحليل الكامل أسفله.")) : el("v-sous").dataset.libre;
    }
    if (etat) {
      if (a.offrable) h += '<p class="pass-offert"><b>' + T2("Votre bien n’est pas encore vendu ou loué ?", "لم يُبع أو يُكرَ عقارك بعد؟") + "</b> " +
        T2("Nous vous offrons 30 jours de plus, gratuitement.", "نهديك 30 يومًا إضافية مجانًا.") + ' <button type="button" class="btn-paie" id="v-offert">' +
        T2("Pas encore vendu ni loué : prolonger de 30 jours offerts", "لم يُبع ولم يُكرَ: مدّد 30 يومًا مجانًا") + "</button></p>";
      h += a.ok ? "<p><b>" + (a.quoi === "essai" ? T2("Essai gratuit actif", "التجربة المجانية مفعّلة") : a.quoi === "offert" ? T2("30 jours offerts", "30 يومًا هدية") : T2("Pass Propriétaire actif", "باس المالك مفعّل")) + "</b> " + T2("jusqu’au ", "إلى غاية ") + jfr(a.fin) + T2(" inclus — l’analyse complète de votre bien est juste sous l’estimation gratuite.", " — التحليل الكامل لعقارك تحت التقدير المجاني مباشرة.") + "</p>"
                : '<p class="pass-titre"><b>' + (etat.debut ? T2("Votre essai est terminé", "انتهت تجربتك") : T2("Votre code Pass est prêt", "رمز الباس جاهز")) + "</b></p>" +
                  '<ol class="pass-etapes"><li>' + T2("Payez le Pass ci-dessous.", "ادفع الباس أدناه.") + "</li><li>" + T2("Motif du paiement : votre code.", "سبب الدفع: رمزك.") +
                  "</li><li>" + T2("L’analyse s’ouvre ici, le jour même.", "يُفتح التحليل هنا في نفس اليوم.") + "</li></ol>";   // (18/10/2026 : comme investir/pass/)
      h += '<p class="pass-code">' + T2("Code", "الرمز") + ' : <b><bdi dir="ltr">' + esc(etat.code) + "</bdi></b></p>";
      var wa = el("pass-preuve");
      if (wa) { if (!wa.getAttribute("data-base")) wa.setAttribute("data-base", wa.href); wa.href = wa.getAttribute("data-base") + encodeURIComponent(etat.code); }
    }
    b.innerHTML = h;
    var o = el("v-offert");
    if (o) o.onclick = function () { etat.offert = a.paye; garder(); tout(); };
  }

  function tout() {
    if (typeof document === "undefined" || !document) return;   // calcul du Pass (PBKDF2) fini après la fermeture de la page
    var r = calcul();
    dernier = r;
    afficherGratuit(r);
    afficherAnalyse(r);
    afficherEtat();
  }
  window.VENDRE_IMMO = { calcul: calcul, identifiant: identifiant, normaliser: normaliser, jetonAvant: jetonAvant, texteAnnonce: texteAnnonce };

  form.addEventListener("change", function (e) {
    if (e.target.id === "v-g") quartiers(); else if (e.target.id === "v-d") localites(); else if (e.target.id === "v-l") { memeNom(); choisirQuartier(); }
    tout();
  });
  form.addEventListener("input", function () { tout(); });
  el("v-prendre").addEventListener("click", function () {
    if (!etat) { etat = { code: nouveauCode(), debut: null }; garder(); verifierCode(); }
    tout();
    var d = document.querySelector("#pass-vendeur details.paiement"); if (d) ouvrir(d);
    try { el("v-etat").scrollIntoView({ behavior: "smooth", block: "start" }); } catch (x) { /* ancien navigateur */ }
  });
  el("v-code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var c = normaliser(el("v-code").value);
    if (!/^VEN-[A-Z0-9]{6}$/.test(c)) { el("v-code-msg").textContent = T2("Code inconnu : il ressemble à VEN-ABC234.", "رمز غير معروف: يشبه VEN-ABC234."); return; }
    etat = { code: c, debut: etat && etat.code === c ? etat.debut : null }; garder(); tout();
    el("v-code-msg").textContent = T2("Vérification du code…", "جارٍ التحقق من الرمز…");
    verifierCode().then(function () {
      if (typeof document === "undefined" || !document) return;   // page déjà fermée (calcul du code fini après)
      // 15/10/2026 : l'ancien message « Code inconnu » restait affiché après un bon code (Ahmed croyait que ça ne marchait pas)
      el("v-code-msg").textContent = acces().ok ? T2("✅ Code ouvert : votre analyse complète s’affiche sous l’estimation gratuite.", "✅ فُتح الرمز: يظهر تحليلك الكامل تحت التقدير المجاني.")
        : ACCES ? T2("Ce code n’est pas encore activé : il s’ouvre dès que le paiement est reçu (dans la journée).", "هذا الرمز غير مفعّل بعد: يُفتح بمجرد وصول الدفع (في نفس اليوم).") : "";
      if (!acces().ok) return;                   // code ouvert : on montre tout de suite l'analyse (ou le formulaire à remplir)
      try { el(el("v-analyse").hidden ? "estimer" : "v-analyse").scrollIntoView({ behavior: "smooth", block: "start" }); } catch (x) { /* ancien navigateur */ }
    });
  });
  document.addEventListener("langue", function () { quartiers(); tout(); });
  quartiers();                                   // délégations et localités tout de suite (listes officielles, sans attendre l'IA)
  tout();
  var chargements = [window.IA_IMMO ? IA_IMMO.charger().then(quartiers).catch(function () {}) : Promise.resolve(),
    (typeof fetch === "function" ? fetch(racine + "investir/pass/acces.json", { cache: "no-cache" }).then(function (r) { return r.json(); }) : Promise.reject())
      .then(function (a) { ACCES = a; }).catch(function () { ACCES = { codes: {} }; })];
  window.VENDRE_IMMO.pret = Promise.all(chargements).then(verifierCode);   // « prêt » : attendu par les tests
  // les annonces (donnees/annonces.js, « defer ») peuvent arriver après ce script
  if (!window.ANNONCES) window.addEventListener("load", tout);
})();
