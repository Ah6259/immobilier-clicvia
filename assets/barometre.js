/* Immobilier Tunisie — BAROMÈTRE IMMOBILIER (01/11/2026, Ahmed : « comprendre l'évolution du marché et anticiper les prochains mois »).
   Page « Où investir ? » (#barometre). Données : donnees/barometre.js (window.BAROMETRE, aperçu GRATUIT : niveau actuel, évolution
   4 semaines, tendance, 3 derniers points) ; avec un Pass Investisseur payé (assets/pass.js, PASS_IMMO.charger) : séries complètes +
   prévisions 6 / 12 mois dans le tableau chiffré (R.barometre). Jusqu'à 5 quartiers, 3 / 6 / 12 mois, deux graphiques SVG (prix de
   vente au m², loyer au m²), dessinés ici (aucun script extérieur : CSP). Choix gardés dans le lien (#barometre?z=…) : partageables.
   Rien n'est inventé : une zone sans assez de recul le dit ; la prévision n'apparaît qu'avec MIN points de vraies semaines. */
(function () {
  var sec = document.getElementById("barometre");
  if (!sec) return;
  var B = window.BAROMETRE || { zones: {} }, Z = B.zones || {};
  var COULEURS = ["#2C5872", "#B4532F", "#4F6B4A", "#B57E12", "#7A4E8E"];
  var MAX = 5;
  var choisis = [], periode = 6, R = null;
  function T(fr, ar) { return document.documentElement.lang === "ar" ? ar : fr; }
  function ar() { return document.documentElement.lang === "ar"; }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function nb(x, d) { return Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }).replace(/[   ]/g, " "); }
  function m2(x, tr) { return '<bdi dir="ltr">' + nb(x, tr === "l" ? 1 : 0) + "</bdi>" + T(" DT/m²" + (tr === "l" ? "/mois" : ""), " دينار/م²" + (tr === "l" ? "/شهر" : "")); }
  function pc(x) { var s = (x > 0 ? "+" : "") + String(Math.round(x * 10) / 10).replace(".", ","); return '<bdi dir="ltr">' + s + " %</bdi>"; }
  function nom(z) { var x = Z[z]; if (!x) return z; var n = ar() ? x.ar : x.fr, g = ar() ? x.g_ar : x.g_fr; return z.indexOf("g:") === 0 ? n : n + " · " + g; }
  function el(id) { return document.getElementById(id); }
  function sem(s) { return s.slice(8, 10) + "/" + s.slice(5, 7); }

  // ---- liste des zones (quartiers d'abord, puis gouvernorats), recherche « au son » simple
  var cles = Object.keys(Z).filter(function (z) { return z.indexOf("d:") !== 0 && (Z[z].v || Z[z].l); });
  function sansAccent(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function remplirListe() {
    var dl = el("baro-liste"); if (!dl) return;
    dl.innerHTML = cles.sort(function (a, b) { return nom(a).localeCompare(nom(b), "fr"); }).map(function (z) { return '<option value="' + esc(nom(z)) + '">'; }).join("");
  }
  function trouver(texte) {
    var t = sansAccent(texte).trim(); if (!t) return null;
    var exact = cles.filter(function (z) { return sansAccent(nom(z)) === t || sansAccent(Z[z].fr) === t || sansAccent(Z[z].ar) === t; })[0];
    if (exact) return exact;
    var l = cles.filter(function (z) { return sansAccent(nom(z)).indexOf(t) >= 0; });
    return l.length === 1 ? l[0] : (l.length && t.length >= 3 ? l.sort(function (a, b) { return (Z[b].v ? Z[b].v.n : 0) - (Z[a].v ? Z[a].v.n : 0); })[0] : null);
  }

  // ---- choix gardés dans l'adresse (#barometre?z=q:tunis/la-marsa,q:ariana/ennasr&p=6)
  function lireAdresse() {
    var m = /[?&]z=([^&#]+)/.exec(location.hash) || /[?&]z=([^&#]+)/.exec(location.search), p = /[?&]bp=(3|6|12)/.exec(location.hash + location.search);
    if (m) choisis = decodeURIComponent(m[1]).split(",").filter(function (z) { return Z[z]; }).slice(0, MAX);
    if (p) periode = +p[1];
    if (!choisis.length) {       // au départ : les 3 quartiers les plus fournis en ventes
      choisis = cles.filter(function (z) { return z.indexOf("q:") === 0 && Z[z].v; }).sort(function (a, b) { return Z[b].v.n - Z[a].v.n; }).slice(0, 3);
    }
  }
  function ecrireAdresse() {
    var h = "#barometre?z=" + encodeURIComponent(choisis.join(",")) + "&bp=" + periode;
    // replaceState : sans saut de page ni entrée d'historique ; refusé pour une page ouverte en fichier local (tests) -> location.hash
    try { history.replaceState(null, "", location.pathname + location.search + h); } catch (e) { try { location.hash = h; } catch (e2) {} }
  }

  // ---- partie gratuite : niveaux actuels, évolution 4 semaines, tendance
  function fleche(t) { return t === "+" ? "↗" : t === "-" ? "↘" : "→"; }
  function niveaux() {
    var z0 = el("baro-niveaux"); if (!z0) return;
    if (!choisis.length) { z0.innerHTML = "<p>" + T("Ajoutez un quartier ci-dessus.", "أضف حيًّا أعلاه.") + "</p>"; return; }
    z0.innerHTML = '<div class="baro-cartes">' + choisis.map(function (z, i) {
      var x = Z[z], h = '<div class="baro-carte" style="--c:' + COULEURS[i] + '"><h4><i class="baro-puce"></i>' + esc(nom(z)) + "</h4>";
      [["v", "Prix de vente", "سعر البيع"], ["l", "Loyer", "الكراء"]].forEach(function (k) {
        var r = x[k[0]];
        if (!r) { h += "<p class=\"petit\">" + T(k[1] + " : pas assez d’annonces avec surface.", k[2] + ": إعلانات بمساحة غير كافية.") + "</p>"; return; }
        h += '<p class="baro-niv"><span>' + T(k[1], k[2]) + "</span><b>" + m2(r.actuel, k[0]) + "</b></p>" +
          '<p class="baro-evo">' + (r.evolution_4s == null ? T("4 semaines : pas encore de recul", "4 أسابيع: لا رجعة بعد") : T("4 semaines : ", "4 أسابيع: ") + pc(r.evolution_4s)) +
          ' · <span class="baro-tend baro-t' + (r.tendance === "+" ? "h" : r.tendance === "-" ? "b" : "n") + '">' + fleche(r.tendance) + " " + (r.tendance === "+" ? T("en hausse", "في ارتفاع") : r.tendance === "-" ? T("en baisse", "في انخفاض") : T("stable", "مستقر")) + "</span>" +
          ' <small>(' + T(r.n + " annonces · " + r.points + " semaine" + (r.points > 1 ? "s" : "") + " de recul", r.n + " إعلان · " + r.points + " أسبوع") + ")</small></p>";
      });
      return h + "</div>";
    }).join("") + "</div>";
  }

  // ---- graphiques SVG (prix, loyers) : une courbe par zone, mêmes zones sur les deux
  function graphique(tr, series) {
    var W = 640, H = 240, ml = 54, mr = 10, mt = 14, mb = 28;
    var pts = [], semaines = {};
    series.forEach(function (s) { s.pts.forEach(function (p) { semaines[p[0]] = 1; pts.push(p[1]); }); });
    var xs = Object.keys(semaines).sort();
    if (!xs.length) return "<p class=\"petit\">" + T("Pas encore de courbe pour ces quartiers sur cette période.", "لا منحنى بعد لهذه الأحياء في هذه الفترة.") + "</p>";
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts); if (mx === mn) { mx = mn * 1.05 + 1; mn = mn * 0.95; }
    var pad = (mx - mn) * 0.1; mn -= pad; mx += pad; if (mn < 0) mn = 0;
    var ix = {}; xs.forEach(function (s, i) { ix[s] = i; });
    var X = function (s) { return ml + (xs.length === 1 ? (W - ml - mr) / 2 : ix[s] * (W - ml - mr) / (xs.length - 1)); };
    var Y = function (v) { return mt + (H - mt - mb) * (1 - (v - mn) / (mx - mn)); };
    var h = '<svg class="baro-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + (tr === "v" ? T("Prix de vente au m²", "سعر البيع بالمتر المربع") : T("Loyer au m²", "الكراء بالمتر المربع")) + '">';
    for (var k = 0; k <= 4; k++) { var v = mn + (mx - mn) * k / 4, y = Y(v); h += '<line class="baro-grille" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '"/><text class="baro-axe" x="' + (ml - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + nb(v, tr === "l" ? 1 : 0) + "</text>"; }
    var pas = Math.max(1, Math.ceil(xs.length / 8));
    xs.forEach(function (s, i) { if (i % pas === 0 || i === xs.length - 1) h += '<text class="baro-axe" x="' + X(s) + '" y="' + (H - 8) + '" text-anchor="middle">' + sem(s) + "</text>"; });
    series.forEach(function (s, i) {
      var d = s.pts.map(function (p, j) { return (j ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" ");
      h += '<path class="baro-courbe" d="' + d + '" stroke="' + COULEURS[i] + '"/>' + s.pts.map(function (p) { return '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3" fill="' + COULEURS[i] + '"><title>' + esc(nom(s.z)) + " · " + sem(p[0]) + " : " + nb(p[1], tr === "l" ? 1 : 0) + " (" + p[2] + " " + T("annonces", "إعلان") + ")</title></circle>"; }).join("");
      if (s.prev) {   // prévision : trait pointillé jusqu'à 6 mois, zone claire = fourchette
        var x0 = X(s.pts[s.pts.length - 1][0]), x1 = W - mr, y0 = Y(s.pts[s.pts.length - 1][1]);
        h += '<path class="baro-prev" d="M' + x0.toFixed(1) + " " + y0.toFixed(1) + " L" + x1 + " " + Y(s.prev.prevu).toFixed(1) + '" stroke="' + COULEURS[i] + '"/>';
      }
    });
    return h + "</svg>";
  }
  function depuis(pts, mois) {
    if (!pts || !pts.length) return [];
    var fin = pts[pts.length - 1][0], d = new Date(fin + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - mois * 30);
    var deb = d.toISOString().slice(0, 10);
    return pts.filter(function (p) { return p[0] >= deb; });
  }

  // ---- partie Pass : courbes complètes, comparaison, prévisions
  function fiab(f) { return { bonne: T("fiabilité bonne", "موثوقية جيدة"), moyenne: T("fiabilité moyenne", "موثوقية متوسطة"), faible: T("fiabilité faible", "موثوقية ضعيفة") }[f] || ""; }
  function prevLigne(z, tr, p, mois) {
    if (!p) return "<li><b>" + esc(nom(z)) + "</b> : " + T("pas encore assez de recul (" + (B.min_points_prevision || 8) + " semaines de données nécessaires)", "لا رجعة كافية بعد (" + (B.min_points_prevision || 8) + " أسابيع من البيانات لازمة)") + "</li>";
    return "<li><b>" + esc(nom(z)) + "</b> : " + T("aujourd’hui ", "اليوم ") + m2(p.actuel, tr) + " → " + T("dans " + mois + " mois ≈ ", "بعد " + mois + " أشهر ≈ ") + m2(p.prevu, tr) +
      " (" + pc(p.evolution) + ", " + T("fourchette ", "مجال ") + m2(p.bas, tr) + " – " + m2(p.haut, tr) + ") · <span class=\"baro-fiab baro-f" + p.fiabilite.charAt(0) + '">' + fiab(p.fiabilite) + "</span></li>";
  }
  function complet() {
    var c = el("baro-complet"); if (!c) return;
    var code = aPass();
    if (!code) {
      c.innerHTML = '<ul class="res-verrou"><li>🔒 ' + T("Courbes complètes des prix et des loyers au m² (jusqu’à 12 mois)", "منحنيات كاملة للأسعار والأكرية بالمتر المربع (حتى 12 شهرًا)") + "</li><li>🔒 " +
        T("Comparaison de 5 quartiers sur les mêmes graphiques", "مقارنة 5 أحياء على نفس الرسوم") + "</li><li>🔒 " + T("Prévisions à 6 et 12 mois, avec fourchette et fiabilité", "توقعات 6 و12 شهرًا، مع المجال والموثوقية") + "</li><li>🔒 " +
        T("Potentiel de chaque quartier : prix déjà élevé ou marge de hausse", "إمكانات كل حي: سعر مرتفع أصلًا أم هامش ارتفاع") + "</li></ul>" +
        '<p class="inv-deja"><a class="btn-paie" href="pass/?prendre">' + T("Prendre le Pass", "خذ الباس") + '</a> <a href="pass/">' + T("🔑 J’ai déjà un code Pass", "🔑 لديّ رمز باس") + "</a></p>";
      return;
    }
    // R : null = pas encore lu ; false = code non payé ; objet = tableau du Pass (le test « !R » prenait « non payé » pour « en cours », 02/11/2026)
    if (R === null) { c.innerHTML = "<p>" + T("Ouverture de vos courbes…", "جارٍ فتح منحنياتك…") + "</p>"; charger(code); return; }
    if (R === false) { c.innerHTML = "<p>" + T("Votre code " + esc(code) + " n’est pas (encore) payé : les courbes s’ouvrent dès que le paiement est reçu.", "رمزك " + esc(code) + " غير مدفوع (بعد): تُفتح المنحنيات بمجرد وصول الدفع.") + "</p>"; return; }
    var BZ = (R.barometre && R.barometre.zones) || {};
    var h = '<p class="inv-pass-actif">✅ ' + T("Votre Pass est actif", "الباس مفعّل") + "</p>";
    [["v", "Prix de vente au m²", "سعر البيع بالمتر المربع"], ["l", "Loyer au m² par mois", "الكراء بالمتر المربع في الشهر"]].forEach(function (k) {
      var series = choisis.map(function (z) { var d = BZ[z] && BZ[z][k[0]]; return d ? { z: z, pts: depuis(d.serie, periode), prev: d.p6 } : { z: z, pts: [] }; });
      h += "<h4>" + T(k[1], k[2]) + " <small>" + T(periode + " mois", periode + " أشهر") + "</small></h4>" + graphique(k[0], series) +
        '<ul class="baro-legende">' + choisis.map(function (z, i) { return '<li><i class="baro-puce" style="--c:' + COULEURS[i] + '"></i>' + esc(nom(z)) + "</li>"; }).join("") + "</ul>";
      h += "<h4>" + T("Prévision à 6 mois", "توقع 6 أشهر") + "</h4><ul class=\"baro-prevs\">" + choisis.map(function (z) { return prevLigne(z, k[0], BZ[z] && BZ[z][k[0]] ? BZ[z][k[0]].p6 : null, 6); }).join("") + "</ul>";
      h += "<h4>" + T("Prévision à 12 mois", "توقع 12 شهرًا") + "</h4><ul class=\"baro-prevs\">" + choisis.map(function (z) { return prevLigne(z, k[0], BZ[z] && BZ[z][k[0]] ? BZ[z][k[0]].p12 : null, 12); }).join("") + "</ul>";
    });
    // potentiel : loyer / prix (rendement brut au m²) et écart entre la prévision et le niveau actuel
    h += "<h4>" + T("Potentiel des quartiers choisis", "إمكانات الأحياء المختارة") + "</h4><ul class=\"baro-prevs\">" + choisis.map(function (z) {
      var d = BZ[z] || {}, v = d.v && d.v.serie && d.v.serie.length ? d.v.serie[d.v.serie.length - 1][1] : null, l = d.l && d.l.serie && d.l.serie.length ? d.l.serie[d.l.serie.length - 1][1] : null;
      var rdt = v && l ? l * 12 / v * 100 : null, p = d.v && d.v.p12;
      return "<li><b>" + esc(nom(z)) + "</b> : " + (rdt ? T("rendement brut au m² ≈ ", "المردود الخام بالمتر ≈ ") + pc(rdt).replace("+", "") : T("rendement : loyers ou prix manquants", "المردود: أكرية أو أسعار ناقصة")) +
        (p ? " · " + (p.evolution > 2 ? T("tendance de hausse : marge possible", "اتجاه ارتفاع: هامش ممكن") : p.evolution < -2 ? T("tendance de baisse : prix peut-être déjà élevés", "اتجاه انخفاض: ربما الأسعار مرتفعة أصلًا") : T("tendance stable", "اتجاه مستقر")) : "") + "</li>";
    }).join("") + "</ul>";
    h += '<p class="petit">' + T("Prévisions statistiques (droite de tendance sur les semaines passées, à annonces constantes), jamais des certitudes : prix demandés, pas signés. Historique depuis le " + (B.debut || "").split("-").reverse().join("/") + ".",
                                "توقعات إحصائية (خط اتجاه على الأسابيع الماضية، بإعلانات ثابتة)، وليست يقينًا: أسعار معروضة لا موقّعة. السجل منذ " + (B.debut || "").split("-").reverse().join("/") + ".") + "</p>";
    c.innerHTML = h;
  }
  function aPass() { try { var v = JSON.parse(localStorage.getItem("pass-immobilier") || "null"); return v && v.code ? v.code : ""; } catch (e) { return ""; } }
  var attente = null;
  function charger(code) {
    if (attente) return attente;
    attente = (window.PASS_IMMO && window.PASS_IMMO.charger ? window.PASS_IMMO.charger(code, "pass/") : Promise.resolve(null))
      .then(function (x) { R = x ? x.R : false; attente = null; complet(); });
    window.BAROMETRE_PASS = attente;      // attendu par les tests
    return attente;
  }

  // ---- la liste des zones choisies (ajout / retrait) et le dessin
  function choisisHtml() {
    var ul = el("baro-choisis"); if (!ul) return;
    ul.innerHTML = choisis.map(function (z, i) { return '<li style="--c:' + COULEURS[i] + '"><i class="baro-puce"></i>' + esc(nom(z)) + ' <button type="button" class="baro-retirer" data-z="' + esc(z) + '" aria-label="' + T("Retirer", "إزالة") + '">×</button></li>'; }).join("") +
      (choisis.length >= MAX ? "<li class=\"petit\">" + T("5 quartiers au plus.", "5 أحياء على الأكثر.") + "</li>" : "");
  }
  function tout() { choisisHtml(); niveaux(); complet(); ecrireAdresse(); }
  function ajouter(z) { if (!z || choisis.indexOf(z) >= 0 || choisis.length >= MAX) return; choisis.push(z); tout(); }
  sec.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".baro-retirer"); if (b) { choisis = choisis.filter(function (z) { return z !== b.getAttribute("data-z"); }); tout(); } });
  sec.addEventListener("change", function (e) {
    if (e.target.name === "bp") { periode = +e.target.value; tout(); }
    if (e.target.id === "baro-ou") { var z = trouver(e.target.value); if (z) { ajouter(z); e.target.value = ""; } }
  });
  sec.addEventListener("keydown", function (e) { if (e.target.id === "baro-ou" && e.key === "Enter") { e.preventDefault(); var z = trouver(e.target.value); if (z) { ajouter(z); e.target.value = ""; } } });
  document.addEventListener("langue", function () { remplirListe(); tout(); });
  remplirListe(); lireAdresse();
  var r = sec.querySelector('input[name="bp"][value="' + periode + '"]'); if (r) r.checked = true;
  tout();
  window.BAROMETRE_UI = { choisis: function () { return choisis.slice(); }, ajouter: ajouter, periode: function () { return periode; }, trouver: trouver };
})();
