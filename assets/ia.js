/* Estimateur « modèle d'IA » de la page investir/ (14/10/2026, demande d'Ahmed).
   Lit donnees/modele-ia.json (fabriqué chaque semaine par robot/modele_ia.py : arbres de décision boostés entraînés sur les
   annonces) et refait ICI exactement le même calcul que estimer() du robot. Rien n'est envoyé : tout se calcule dans le téléphone.
   Un type n'est estimé que si le robot l'a jugé « fiable » (mieux que la méthode simple, précision mesurée). */
(function () {
  var f = document.getElementById("ia-form"), res = document.getElementById("ia-res");
  // 15/10/2026 : le modèle sert aussi à la page vendre/ (assets/vendre.js) : l'API IA_IMMO existe même sans le formulaire d'investir/
  var M = null, racine = document.documentElement.getAttribute("data-racine") || (f && f.getAttribute("data-racine")) || "";
  function el(id) { return document.getElementById(id); }
  function ar() { return document.documentElement.lang === "ar"; }
  function dt(x) { var r = x >= 20000 ? Math.round(x / 1000) * 1000 : Math.round(x / 10) * 10;
    return '<bdi dir="ltr">' + r.toLocaleString("fr-FR").replace(/[  ]/g, " ") + "</bdi>" + (ar() ? " دينار" : " DT"); }
  function famille(t) { return /^(terrain|terrainind|agricole)$/.test(t) ? "terrain" : (t === "appartement" || t === "maison" ? "logement" : "pro"); }
  // version 2 (15/10/2026) : + latitude, longitude (centre du quartier), atouts (1 / 0 / inconnu), étage — comme variables() du robot
  function variables(t, g, q, s, ch, nv, x) {
    var base = nv.base[t], lg = nv.g[g] !== undefined ? nv.g[g] : 0, gf = nv.gf[g + "|" + famille(t)], lq = nv.q[g + "|" + q];
    var geo = nv.geo || {}, c = geo[g + "|" + q] || geo[g + "|"] || null, v = [base === undefined ? null : base, lg, gf === undefined ? lg : gf,
      lq ? lq[0] : lg, lq ? Math.log(lq[1] + 1) : 0, s ? Math.log(s) : null, ch];
    if (!M || M.version < 2) return v;
    return v.concat([c ? c[0] : null, c ? c[1] : null], x);
  }
  // atouts (liste, ou null = inconnus) et étage -> la fin du vecteur (comme extras_de du robot)
  function extras(at, et) {
    var l = (M && M.atouts) || [];
    // « ?nom » = cet atout est inconnu (ex. état du bien non indiqué), comme extras_de() du robot
    return l.map(function (n) { return at === null || at === undefined || at.indexOf("?" + n) >= 0 ? null : (at.indexOf(n) >= 0 ? 1 : 0); })
      .concat([typeof et === "number" && et >= 0 && et <= 40 ? et : null]);
  }
  function arbre(a, x) {
    var k = 0;
    for (;;) {
      var n = a[k];
      if (n.length === 1) return n[0];
      var v = x[n[0]];
      k = (v === null || v === undefined) ? (n[2] ? n[3] : n[4]) : (v <= n[1] ? n[3] : n[4]);
    }
  }
  function estimer(tr, t, g, q, s, ch, at, et) {
    var m = M && M.modeles && M.modeles[tr], pr = m && m.precision && m.precision[t];
    if (!m || m.niveaux.base[t] === undefined || !pr || !pr.fiable) return null;
    if (!s && (M.surface_obligatoire || []).indexOf(t) >= 0) return null;     // maisons et terrains : seulement avec leur surface
    if (m.gt && (m.gt[g + "|" + t] || 0) < (m.min_gt || 10)) return null;     // trop peu d'annonces de ce type dans ce gouvernorat (18/10/2026)
    var p = predireLieu(m, t, g, q || "", s, (t === "appartement" || t === "maison") ? ch : null, extras(at, et));
    return [Math.exp(p), Math.exp(p + pr.bas), Math.exp(p + pr.haut), pr];
  }
  function predire(m, x) { var p = m.depart; for (var i = 0; i < m.arbres.length; i++) p += arbre(m.arbres[i], x); return p; }
  // « Tout le gouvernorat » : moyenne des quartiers pondérée par leur nombre d'annonces (comme predire_lieu du robot)
  function predireLieu(m, t, g, q, s, ch, x) {
    var nv = m.niveaux;
    if (!q || !nv.q[g + "|" + q]) {
      var ks = Object.keys(nv.q).filter(function (k) { return k.split("|")[0] === g; }).sort(), tot = 0, som = 0;
      ks.forEach(function (k) { var n = nv.q[k][1]; tot += n; som += predire(m, variables(t, g, k.slice(g.length + 1), s, ch, nv, x)) * n; });
      if (ks.length) return som / tot;
    }
    return predire(m, variables(t, g, q, s, ch, nv, x));
  }
  var promesse = (typeof fetch === "function" ? fetch(racine + "donnees/modele-ia.json", {cache: "no-cache"}).then(function (r) { return r.json(); })
    : Promise.reject(new Error("fetch"))).then(function (m) { M = m; return m; });
  window.IA_IMMO = {estimer: estimer, pret: function () { return !!M; }, charger: function () { return promesse; }, modele: function () { return M; }};
  if (!f || !res) return;
  function T2(fr, a) { return ar() ? a : fr; }
  function quartiers() {
    var g = el("ia-g").value, sel = el("ia-q"), garde = sel.value, l = (M && M.quartiers && M.quartiers[g]) || [];
    sel.innerHTML = '<option value="">' + T2("Tout le gouvernorat", "كامل الولاية") + "</option>" +
      l.map(function (x) { return '<option value="' + x[0].replace(/"/g, "&quot;") + '">' + (ar() ? x[2] : x[1]).replace(/</g, "&lt;") + "</option>"; }).join("");
    if (l.some(function (x) { return x[0] === garde; })) sel.value = garde;
  }
  function calculer() {
    if (!M) { res.innerHTML = "<p>" + T2("Chargement du modèle…", "تحميل النموذج…") + "</p>"; return; }
    var t = el("ia-t").value, g = el("ia-g").value, q = el("ia-q").value, s = parseFloat((el("ia-s").value || "").replace(",", ".")),
        ch = el("ia-p").value === "" ? null : parseInt(el("ia-p").value, 10);
    s = isFinite(s) && s >= 8 ? s : null;
    el("ia-p-l").hidden = !(t === "appartement" || t === "maison");
    var v = estimer("vente", t, g, q, s, ch), l = estimer("location", t, g, q, s, ch), h = "";
    var pas = '<span class="ia-pas">' + T2("pas encore assez fiable pour ce bien (le modèle apprend à chaque relevé des annonces)", "غير موثوق بعد لهذا العقار (يتعلّم النموذج مع كل تحديث للإعلانات)") + "</span>";
    h += '<p class="ia-ligne"><span>' + T2("Prix de vente estimé", "سعر البيع التقديري") + "</span>" + (v ? "<b>" + dt(v[0]) + "</b><small>" +
         T2("entre ", "بين ") + dt(v[1]) + T2(" et ", " و") + dt(v[2]) + "</small>" : pas) + "</p>";
    h += '<p class="ia-ligne"><span>' + T2("Loyer estimé par mois", "الكراء الشهري التقديري") + "</span>" + (l ? "<b>" + dt(l[0]) + "</b><small>" +
         T2("entre ", "بين ") + dt(l[1]) + T2(" et ", " و") + dt(l[2]) + "</small>" : pas) + "</p>";
    if (v && l) {
      var b = l[0] * 12 / v[0] * 100;
      h += '<p class="ia-ligne ia-rdt"><span>' + T2("Rendement brut estimé", "المردود الخام التقديري") + '</span><b><bdi dir="ltr">' + b.toFixed(1).replace(".", ",") + " %</bdi></b></p>";
    }
    var pr = (v || l || [0, 0, 0, null])[3];
    // pas de pourcentage d'erreur affiché (information interne, décision d'Ahmed du 15/10/2026)
    if (pr) h += '<p class="petit">' + T2("La fourchette montre où se situent la plupart des biens semblables.", "يبيّن المجال أين تقع أغلب العقارات المشابهة.") + "</p>";
    res.innerHTML = h;
  }
  f.addEventListener("input", function (e) { if (e.target.id === "ia-g") quartiers(); calculer(); });
  f.addEventListener("change", function (e) { if (e.target.id === "ia-g") quartiers(); calculer(); });
  document.addEventListener("langue", function () { quartiers(); calculer(); });
  calculer();
  promesse.then(function () {
    quartiers(); calculer();
  }).catch(function () { res.innerHTML = "<p>" + T2("Le modèle n’a pas pu être chargé. Réessayez plus tard.", "تعذّر تحميل النموذج. أعد المحاولة لاحقًا.") + "</p>"; });
})();
