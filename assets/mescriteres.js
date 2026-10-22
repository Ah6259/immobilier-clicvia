/* Immobilier Tunisie — « ⭐ Mes critères » (22/10/2026, « fais » d'Ahmed : « le prix n'est pas ce qui intéresse le plus certains
   visiteurs : un jardin, un ascenseur, un étage bas… »). Le visiteur dit ce qui compte pour lui ; sous chaque annonce, une ligne
   « Pour vous : 4 sur 5 ✓ · manque : ascenseur · non précisé : étage ». Ce n'est PAS un modèle d'IA : une simple comparaison entre
   les FAITS de l'annonce (donnees/annonces.js) et ses choix. L'avis de l'IA sur le prix n'est pas touché (il peut seulement être masqué).

   Gardé DANS LE TÉLÉPHONE (localStorage, clé « criteres-immobilier », même méthode que les favoris de page.js) : rien n'est envoyé,
   aucun compte ; valeurs relues vérifiées (propre) ; mémoire bloquée = marche pendant la visite. Seule l'alerte, si le visiteur la
   crée, passe par Telegram (lien fabriqué par assets/alerte.js, window.lienCriteres, code v2 avec « k1 »).
   Forme gardée : { t: "v"|"l"|"", y: type, b: [budget max, imp], s: [surface min, imp], c: [pièces min, imp],
                    e: ["rdc" | étage max 1-10, imp], at: { code d'atout: imp }, m: 1 = avis sur le prix masqué }
   imp : 2 = indispensable, 1 = ce serait un plus. Atouts : liste COMMUNE de robot/criteres.py (donnees/criteres.js, window.atoutsDe).
   RÈGLE : texte de l'annonce lu sans le mot = « non » ; texte PAS lu (champ « nl » de annonces.js) = « non précisé », jamais « non ».
   Aucun script en ligne (CSP). */
(function () {
  var CLE = "criteres-immobilier", MEM = null, BLOQUE = false;
  var TYPES_OK = ["appartement", "maison", "bureau", "commerce", "industriel", "terrain", "terrainind", "agricole", "autre"];
  // atouts qui se disent « pas … » (adjectifs) ; les autres : « pas de … »
  var ADJ = { u: 1, n: 1, s: 1, w: 1, x: 1, y: 1, l: 1 };

  function T(fr, ar) { return document.documentElement.lang === "ar" ? ar : fr; }
  function E(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function L(fr, ar) { return '<span data-l="fr">' + fr + '</span><span data-l="ar">' + ar + '</span>'; }
  function iso(t) { return "⁦" + t + "⁩"; }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function imp(v) { v = +v; return v === 2 || v === 1 ? v : 0; }
  function entier(v, mn, mx) { v = parseInt(v, 10); return v >= mn && v <= mx ? v : 0; }
  function utile(champ, y) { return !window.champUtile || window.champUtile(champ, y); }
  function trDe(t) { return t === "v" ? "vente" : t === "l" ? "location" : ""; }
  function atouts(t, y) { return window.atoutsDe ? window.atoutsDe(trDe(t), y) : []; }   // [[nom, code, fr, ar, ia], …]

  function vide() { return { t: "", y: "appartement", m: 0, at: {} }; }
  function propre(c) {                  // valeurs relues de la mémoire : jamais de confiance aveugle
    if (!c || typeof c !== "object") return null;
    var o = { t: c.t === "v" || c.t === "l" ? c.t : "", y: TYPES_OK.indexOf(c.y) >= 0 ? c.y : "appartement", m: c.m === 1 ? 1 : 0, at: {} };
    var paire = function (k, mn, mx) { var x = c[k]; if (!Array.isArray(x)) return; var v = entier(x[0], mn, mx), i = imp(x[1]); if (v && i) o[k] = [v, i]; };
    paire("b", 1, 99999999); paire("s", 1, 99999); paire("c", 1, 5);
    if (Array.isArray(c.e) && imp(c.e[1])) {
      var e = c.e[0] === "rdc" ? "rdc" : entier(c.e[0], 1, 10);
      if (e) o.e = [e, imp(c.e[1])];
    }
    if (c.at && typeof c.at === "object") Object.keys(c.at).slice(0, 40).forEach(function (k) { if (/^[a-z0-9]$/.test(k) && imp(c.at[k])) o.at[k] = imp(c.at[k]); });
    return o;
  }
  function lire() {
    if (MEM) return propre(MEM) || vide();
    try { return propre(JSON.parse(localStorage.getItem(CLE) || "null")) || vide(); }
    catch (e) { BLOQUE = true; return vide(); }
  }
  function ecrire(c) {
    c = propre(c) || vide();
    try { localStorage.setItem(CLE, JSON.stringify(c)); MEM = null; }
    catch (e) { BLOQUE = true; MEM = c; }        // mémoire bloquée ou pleine : gardés le temps de la visite
    appliquer();
    try { document.dispatchEvent(new Event("criteres")); } catch (e) {}
  }
  function nombre(c) { c = c || lire(); return (c.b ? 1 : 0) + (c.s ? 1 : 0) + (c.c ? 1 : 0) + (c.e ? 1 : 0) + Object.keys(c.at).length; }

  // ---- comparaison des FAITS de l'annonce et des choix du visiteur
  // liste de { ind, ok (true | false | null = non précisé), nom [fr, ar] (manque / non précisé), non [fr, ar] (« ✗ … ») }
  function evaluer(a, c) {
    c = c || lire();
    var out = [], y = a.y;
    if (c.b) {
      var pb = a.p != null && !a.lc ? a.p <= c.b[0] : null;      // un prix à la nuit n'est jamais comparé à un budget
      out.push({ ind: c.b[1] === 2, ok: pb, nom: pb === null ? ["prix", "السعر"] : ["budget", "الميزانية"], non: ["au-dessus du budget", "فوق الميزانية"] });
    }
    if (c.s) out.push({ ind: c.s[1] === 2, ok: a.s ? a.s >= c.s[0] : null, nom: ["surface", "المساحة"],
                        non: ["moins de " + nb(c.s[0]) + " m²", "أقل من " + iso(nb(c.s[0])) + " م²"] });
    if (c.c && y && utile("pieces", y)) out.push({ ind: c.c[1] === 2, ok: a.c != null ? a.c >= c.c[0] : null, nom: ["pièces", "الغرف"],
                        non: ["moins de S+" + c.c[0], "أقل من " + iso("S+" + c.c[0])] });
    if (c.e && y && utile("etage", y)) {
      var et = typeof a.et === "number" ? a.et : null;
      out.push({ ind: c.e[1] === 2, ok: et === null ? null : c.e[0] === "rdc" ? et === 0 : et <= c.e[0], nom: ["étage", "الطابق"],
                 non: [et ? et + "e étage" : "étage", et ? "الطابق " + iso(et) : "الطابق"] });
    }
    var ats = atouts(a.t, y), aat = a.at || "";
    ats.forEach(function (x) {
      var i = c.at[x[1]];
      if (!i) return;
      var fr = String(x[2]), low = fr.charAt(0).toLowerCase() + fr.slice(1);
      var ok = aat.indexOf(x[1]) >= 0 ? true : (a.nl ? null : false);
      out.push({ ind: i === 2, ok: ok, nom: [low, x[3]],
                 non: [ADJ[x[1]] ? "pas " + low : (/^[aeiouyéèêâh]/i.test(low) ? "pas d’" : "pas de ") + low, (ADJ[x[1]] ? "غير " : "بلا ") + x[3]] });
    });
    return out;
  }
  function ligne(a) {
    var c = lire();
    if (!nombre(c)) return "";                    // aucun critère choisi : rien (le site reste comme avant)
    var ev = evaluer(a, c);
    if (!ev.length) return "";
    var oui = ev.filter(function (x) { return x.ok === true; }).length;
    var non = ev.filter(function (x) { return x.ind && x.ok === false; });
    var manque = ev.filter(function (x) { return !x.ind && x.ok === false; }), np = ev.filter(function (x) { return x.ok === null; });
    var fr = [], ar = [];
    non.forEach(function (x) { fr.push('<b class="pv-non">✗ ' + E(x.non[0]) + "</b>"); ar.push('<b class="pv-non">✗ ' + E(x.non[1]) + "</b>"); });
    fr.push('<b class="pv-oui">' + oui + " sur " + ev.length + " ✓</b>"); ar.push('<b class="pv-oui">' + iso(oui) + " من " + iso(ev.length) + " ✓</b>");
    var court = function (l, i, sep) { return l.slice(0, 3).map(function (x) { return E(x.nom[i]); }).join(sep) + (l.length > 3 ? " +" + (i ? iso(l.length - 3) : l.length - 3) : ""); };
    if (manque.length) { fr.push("manque : " + court(manque, 0, ", ")); ar.push("ينقص: " + court(manque, 1, "، ")); }
    // texte court (« les gens ne veulent pas lire ») : 3 noms au plus, puis « +2 »
    if (np.length) { fr.push("non précisé : " + court(np, 0, ", ")); ar.push("غير مذكور: " + court(np, 1, "، ")); }
    return '<p class="an-pourvous' + (non.length ? " pv-manque" : "") + '">' + L("Pour vous : " + fr.join(" · "), "لك: " + ar.join(" · ")) + "</p>";
  }
  // tri « Correspond le mieux à mes critères » : indispensables d'abord (absents, puis non précisés), puis le nombre de « oui »
  function score(a) {
    var ev = evaluer(a);
    return [ev.filter(function (x) { return x.ind && x.ok === false; }).length, ev.filter(function (x) { return x.ind && x.ok === null; }).length,
            -ev.filter(function (x) { return x.ok === true; }).length, ev.filter(function (x) { return x.ok === null; }).length];
  }

  // ---- page : avis sur le prix masqué ou non, bouton « Mes critères (3) », choix du tri
  function appliquer() {
    var c = lire(), n = nombre(c);
    document.documentElement.classList.toggle("sans-avis", c.m === 1);
    [].forEach.call(document.querySelectorAll(".btn-criteres .nb-crit"), function (s) { s.hidden = !n; s.textContent = n; });
    [].forEach.call(document.querySelectorAll('#f-tri option[value="crit"]'), function (o) { o.hidden = !n; o.disabled = !n; });
  }
  function basculerAvis(m) { var c = lire(); c.m = m ? 1 : 0; ecrire(c); }

  // ---- la fenêtre
  var fen = null;
  function typesListe() {
    var TY = (window.LIEUX && window.LIEUX.t) || {};
    return TYPES_OK.filter(function (k) { return TY[k]; }).map(function (k) { return [k, k === "autre" ? "Autre bien" : TY[k][0], k === "autre" ? "عقار آخر" : TY[k][1]]; });
  }
  function choixImp(nom, v) {
    return '<select class="crit-imp" name="' + nom + '" aria-label="' + T("Importance", "الأهمية") + '">' +
      '<option value="2"' + (v !== 1 ? " selected" : "") + ">" + T("Indispensable", "ضروري") + "</option>" +
      '<option value="1"' + (v === 1 ? " selected" : "") + ">" + T("Ce serait un plus", "يُستحسن") + "</option></select>";
  }
  function lignesAtouts(c) {
    var ats = atouts(c.t, c.y);
    if (!ats.length) return "";
    return '<fieldset class="crit-atouts"><legend>' + T("Atouts", "المميزات") + "</legend>" + ats.map(function (x) {
      var v = c.at[x[1]] || 0;
      return '<label class="crit-ligne crit-ligne-at"><span>' + E(T(x[2], x[3])) + '</span><select name="at-' + x[1] + '" data-code="' + x[1] + '">' +
        '<option value="0"' + (!v ? " selected" : "") + ">—</option>" +
        '<option value="2"' + (v === 2 ? " selected" : "") + ">" + T("Indispensable", "ضروري") + "</option>" +
        '<option value="1"' + (v === 1 ? " selected" : "") + ">" + T("Ce serait un plus", "يُستحسن") + "</option></select></label>";
    }).join("") + "</fieldset>";
  }
  function construire() {
    var c = lire(), radio = function (v, fr, ar) {
      return '<label><input type="radio" name="ct" value="' + v + '"' + (c.t === v ? " checked" : "") + "><span>" + T(fr, ar) + "</span></label>";
    };
    var etage = '<option value="">' + T("Peu importe", "لا يهم") + "</option>" +
      '<option value="rdc"' + (c.e && c.e[0] === "rdc" ? " selected" : "") + ">" + T("Rez-de-chaussée", "الطابق الأرضي") + "</option>" +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) {
        return '<option value="' + n + '"' + (c.e && c.e[0] === n ? " selected" : "") + ">" + T("Jusqu’au " + n + (n === 1 ? "er" : "e") + " étage", "حتى الطابق " + n) + "</option>";
      }).join("");
    var pieces = '<option value="">' + T("Peu importe", "لا يهم") + "</option>" + [1, 2, 3, 4, 5].map(function (n) {
      return '<option value="' + n + '"' + (c.c && c.c[0] === n ? " selected" : "") + ">S+" + n + T(" ou plus", " أو أكثر") + "</option>"; }).join("");
    fen.innerHTML =
      '<div class="alerte-boite crit-boite" role="dialog" aria-modal="true" aria-labelledby="crit-titre">' +
        '<button type="button" class="alerte-fermer" aria-label="' + T("Fermer", "إغلاق") + '">×</button>' +
        '<h2 id="crit-titre">' + T("⭐ Mes critères", "⭐ معاييري") + "</h2>" +
        '<p class="alerte-intro">' + T("Ce qui compte pour vous : chaque annonce dit si elle vous correspond. Gardé dans votre téléphone, rien n’est envoyé.",
                                       "ما يهمّك: كل إعلان يقول إن كان يناسبك. يُحفظ في هاتفك، لا يُرسل شيء.") + "</p>" +
        (BLOQUE ? '<p class="crit-bloque">' + T("Votre navigateur bloque la mémoire : vos critères sont gardés pendant cette visite seulement.", "متصفحك يمنع الحفظ: تُحفظ معاييرك خلال هذه الزيارة فقط.") + "</p>" : "") +
        '<form class="alerte-form crit-form" id="crit-form">' +
          '<div class="bascule" role="radiogroup" aria-label="' + T("Acheter ou louer", "شراء أو كراء") + '">' + radio("", "Tout", "الكل") + radio("v", "Acheter", "شراء") + radio("l", "Louer", "كراء") + "</div>" +
          '<label class="crit-ligne"><span>' + T("Type de bien", "نوع العقار") + '</span><select name="cy" data-type-bien>' +
            typesListe().map(function (x) { return '<option value="' + x[0] + '"' + (c.y === x[0] ? " selected" : "") + ">" + E(T(x[1], x[2])) + "</option>"; }).join("") + "</select></label>" +
          '<div class="crit-ligne"><label for="crit-b">' + T("Budget max (DT)", "أقصى ميزانية (د.ت)") + '</label><input id="crit-b" name="cb" type="number" inputmode="numeric" min="0" step="1000" placeholder="—" value="' + (c.b ? c.b[0] : "") + '">' + choixImp("ib", c.b && c.b[1]) + "</div>" +
          '<div class="crit-ligne"><label for="crit-s">' + T("Surface min (m²)", "أدنى مساحة (م²)") + '</label><input id="crit-s" name="cs" type="number" inputmode="numeric" min="0" step="10" placeholder="—" value="' + (c.s ? c.s[0] : "") + '">' + choixImp("is", c.s && c.s[1]) + "</div>" +
          '<div class="crit-ligne" data-champ="pieces"><label for="crit-c">' + T("Pièces", "الغرف") + '</label><select id="crit-c" name="cc">' + pieces + "</select>" + choixImp("ic", c.c && c.c[1]) + "</div>" +
          '<div class="crit-ligne" data-champ="etage"><label for="crit-e">' + T("Étage", "الطابق") + '</label><select id="crit-e" name="ce">' + etage + "</select>" + choixImp("ie", c.e && c.e[1]) + "</div>" +
          '<div id="crit-at">' + lignesAtouts(c) + "</div>" +
          '<label class="crit-case"><input type="checkbox" name="cm"' + (c.m ? " checked" : "") + "><span>" + T("Masquer l’avis sur le prix", "إخفاء رأي السعر") + "</span></label>" +
        "</form>" +
        '<p class="alerte-resume" id="crit-resume" aria-live="polite"></p>' +
        '<a class="btn-telegram" id="crit-alerte" href="#" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4L3 11.3l6.2 2.2L19 7l-7.6 8.1.1 4.9 3.1-3.6 4.4 3.3z"/></svg>' + T("🔔 Être alerté avec mes critères", "🔔 نبّهني بمعاييري") + "</a>" +
        '<p class="crit-note" id="crit-note" hidden></p>' +
        '<div class="crit-actions"><button type="button" class="btn-effacer crit-effacer">' + T("Effacer mes critères", "مسح معاييري") + '</button>' +
          '<button type="button" class="btn-chercher crit-ok">' + T("Voir les annonces", "عرض الإعلانات") + "</button></div>" +
      "</div>";
    if (window.appliquerChamps) window.appliquerChamps(document.getElementById("crit-form"));
    resume();
  }
  function depuisFenetre() {
    var f = document.getElementById("crit-form"), v = function (k) { var x = f.querySelector('[name="' + k + '"]'); return x ? x.value : ""; };
    var t = f.querySelector('input[name="ct"]:checked'), y = v("cy"), c = { t: t ? t.value : "", y: y, m: f.querySelector('[name="cm"]').checked ? 1 : 0, at: {} };
    if (entier(v("cb"), 1, 99999999)) c.b = [entier(v("cb"), 1, 99999999), +v("ib")];
    if (entier(v("cs"), 1, 99999)) c.s = [entier(v("cs"), 1, 99999), +v("is")];
    if (v("cc") && utile("pieces", y)) c.c = [+v("cc"), +v("ic")];
    if (v("ce") && utile("etage", y)) c.e = [v("ce") === "rdc" ? "rdc" : +v("ce"), +v("ie")];
    var ok = {}; atouts(c.t, y).forEach(function (x) { ok[x[1]] = 1; });       // seulement les atouts de ce type de bien
    [].forEach.call(f.querySelectorAll("select[data-code]"), function (s) { var k = s.getAttribute("data-code"); if (ok[k] && imp(s.value)) c.at[k] = imp(s.value); });
    return propre(c);
  }
  function resume() {
    var c = lire(), n = nombre(c), r = document.getElementById("crit-resume"), a = document.getElementById("crit-alerte"), note = document.getElementById("crit-note");
    if (!r) return;
    var ind = (c.b && c.b[1] === 2 ? 1 : 0) + (c.s && c.s[1] === 2 ? 1 : 0) + (c.c && c.c[1] === 2 ? 1 : 0) + (c.e && c.e[1] === 2 ? 1 : 0) +
      Object.keys(c.at).filter(function (k) { return c.at[k] === 2; }).length;
    r.textContent = n ? T(n + " critère" + (n > 1 ? "s" : "") + " · " + ind + " indispensable" + (ind > 1 ? "s" : ""), "⁦" + n + "⁩ معايير · ⁦" + ind + "⁩ ضرورية")
                      : T("Aucun critère choisi.", "لم تختر أي معيار.");
    var l = n && window.lienCriteres ? window.lienCriteres(c) : null;
    a.hidden = !l;
    if (l) a.href = l.href;
    note.hidden = !(l && !l.complet);
    note.textContent = T("Trop de critères pour le lien Telegram : les « un plus » ne sont pas tous dans l’alerte.", "معايير كثيرة لرابط تيليغرام: ليست كل « يُستحسن » في التنبيه.");
  }
  function ouvrir() {
    if (!fen) {
      fen = document.createElement("div");
      fen.className = "alerte-fond crit-fond"; fen.id = "crit-fenetre";
      document.body.appendChild(fen);
      fen.addEventListener("click", function (e) {
        var t = e.target;
        if (t === fen || (t.closest && t.closest(".alerte-fermer, .crit-ok"))) { fermer(); return; }
        if (t.closest && t.closest(".crit-effacer")) { var m = lire().m; var v = vide(); v.m = m; ecrire(v); construire(); return; }
      });
      var change = function (e) {
        ecrire(depuisFenetre());
        // type ou achat / location changé : nouvelle liste d'atouts (ceux qui existent encore restent choisis) ; toujours refaite
        // (la règle commune des champs de page.js a pu enregistrer le nouveau type juste avant, pendant le même changement)
        if (e && e.target && (e.target.name === "cy" || e.target.name === "ct")) document.getElementById("crit-at").innerHTML = lignesAtouts(lire());
        resume();
      };
      fen.addEventListener("change", change);
      fen.addEventListener("input", function (e) { if (e.target.type === "number") change(e); });
      fen.addEventListener("submit", function (e) { e.preventDefault(); });
    }
    construire();
    fen.hidden = false;
    document.documentElement.classList.add("alerte-ouverte");
    var b = fen.querySelector(".alerte-fermer"); if (b && b.focus) b.focus();
  }
  function fermer() {
    if (!fen || fen.hidden) return;
    fen.hidden = true;
    document.documentElement.classList.remove("alerte-ouverte");
    var b = document.querySelector(".btn-criteres"); if (b && b.focus) b.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".btn-criteres")) { e.preventDefault(); ouvrir(); return; }
    var av = t.closest(".avis-bascule");
    if (av) { e.preventDefault(); basculerAvis(av.classList.contains("avis-masquer")); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer(); });
  document.addEventListener("langue", function () { if (fen && !fen.hidden) construire(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", appliquer); else appliquer();

  window.MESCRITERES = { cle: CLE, lire: lire, ecrire: ecrire, propre: propre, nombre: nombre, evaluer: evaluer, ligne: ligne, score: score,
                         actif: function () { return nombre() > 0; }, masque: function () { return lire().m === 1; }, ouvrir: ouvrir,
                         bloque: function () { lire(); return BLOQUE; } };
})();
