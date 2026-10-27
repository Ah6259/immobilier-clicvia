/* Page « Où investir ? » : calculateur de rendement (brut, net estimé) et de crédit (mensualité, reste chaque mois).
   Même méthode que robot/investir.py : net = loyer × 11 mois × 85 % ÷ (prix × 1,07). Rien n'est envoyé : tout se calcule ici. */
(function () {
  var f = document.getElementById("calc"), res = document.getElementById("calc-res");
  if (!f || !res) return;
  // lien « crédit indicatif » d'une carte d'annonce (investir/#calculateur, 25/10/2026) : le calculateur s'ouvre
  if (location.hash === "#calculateur" && f.closest && f.closest("details")) f.closest("details").open = true;
  function n(id) { var v = parseFloat((document.getElementById(id).value || "").replace(",", ".")); return isFinite(v) ? v : 0; }
  function dt(x) { return Math.round(x).toLocaleString("fr-FR").replace(/[\u00a0\u202f ]/g, "\u202f") + (document.documentElement.lang === "ar" ? "\u00a0دينار" : "\u00a0DT"); }
  function pc(x) { return x.toFixed(1).replace(".", ",") + "\u00a0%"; }
  function ligne(fr, ar, val, cls) {
    return '<p class="' + (cls || "") + '"><span>' + T(fr, ar) + '</span><b><bdi dir="ltr">' + val + "</bdi></b></p>";
  }
  function calculer() {
    var prix = n("c-prix"), loyer = n("c-loyer"), pret = Math.min(n("c-pret"), prix * 1.07), taux = n("c-taux") / 100, ans = n("c-duree");
    if (prix < 1000 || loyer <= 0) { res.innerHTML = "<p>" + T("Tapez un prix d’achat et un loyer.", "أدخل سعر الشراء والكراء.") + "</p>"; return; }
    var brut = loyer * 12 / prix * 100, net = loyer * 11 * 0.85 / (prix * 1.07) * 100;
    var h = ligne("Rendement brut", "المردود الخام", pc(brut), "fort") + ligne("Rendement net estimé", "المردود الصافي التقديري", pc(net)) +
            ligne("Frais d’achat estimés (7 %)", "مصاريف الشراء التقديرية (7 %)", dt(prix * 0.07)) +
            ligne("Années pour rembourser le prix avec les loyers nets", "سنوات استرجاع السعر بالكراء الصافي", (100 / net).toFixed(1).replace(".", ","));
    if (pret > 0 && ans > 0) {
      var m = ans * 12, r = taux / 12, mens = r ? pret * r / (1 - Math.pow(1 + r, -m)) : pret / m;
      var reste = loyer * 11 / 12 * 0.85 - mens;
      h += ligne("Mensualité du crédit", "قسط القرض الشهري", dt(mens)) +
           ligne(reste >= 0 ? "Il vous reste chaque mois (loyer net − crédit)" : "Vous ajoutez chaque mois (crédit − loyer net)",
                 reste >= 0 ? "يبقى لك كل شهر (الكراء الصافي − القرض)" : "تضيف كل شهر (القرض − الكراء الصافي)", dt(Math.abs(reste)), reste >= 0 ? "bon" : "mauvais");
    }
    res.innerHTML = h;
  }
  f.addEventListener("input", calculer);
  document.addEventListener("langue", calculer);
  calculer();
})();

/* « 1. À remplir » -> « 2. Votre résultat » (15/10/2026, Ahmed : la page Où investir comme Vendre et Louer). Données GRATUITES de
   zones.json (prix d'achat, loyer, rendement brut médians : les mêmes que la carte des prix) ; la note sur 10, le net, la fiche et les
   bonnes affaires restent dans le Pass Investisseur (partie verrouillée, avec un lien vers le Pass sur le même choix). */
(function () {
  var f = document.getElementById("inv-form"), res = document.getElementById("inv-res"), comp = document.getElementById("inv-complet");
  if (!f || !res) return;
  var Z = null, ar = function () { return document.documentElement.lang === "ar"; };
  var NOMS = {a1: ["Appartement S+1", "شقة S+1"], a2: ["Appartement S+2", "شقة S+2"], a3: ["Appartement S+3", "شقة S+3"], maison: ["Maison / villa", "منزل / فيلا"],
              bureau: ["Bureau", "مكتب"], commerce: ["Local commercial", "محل تجاري"], industriel: ["Usine / entrepôt", "مصنع / مستودع"],
              terrain: ["Terrain à bâtir", "أرض للبناء"], terrainind: ["Terrain industriel", "أرض صناعية"], agricole: ["Terrain agricole", "أرض فلاحية"]};
  function el(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function nb(x) { return Math.round(x).toLocaleString("fr-FR").replace(/[\u00a0\u202f ]/g, "\u202f"); }
  function dt(x) { return '<bdi dir="ltr">' + nb(x) + "</bdi>" + T("\u00a0DT", "\u00a0دينار"); }
  function pc(x) { return '<bdi dir="ltr">' + String(x).replace(".", ",") + "\u00a0%</bdi>"; }   // « 6,9 % » jamais coupé
  function nom(a) { return a[ar() ? 1 : 0]; }
  function escT(t) { return esc(t).replace(/S\+\d/, '<bdi dir="ltr">$&</bdi>'); }   // « S+2 » dans une phrase arabe
  function nomG(g) { for (var i = 0; i < Z.g.length; i++) if (Z.g[i][0] === g) return ar() ? Z.g[i][2] : Z.g[i][1]; return ""; }
  function remplirTypes() {
    // 27/10/2026 (Ahmed : « pourquoi pas les mêmes types que le filtre des annonces ? ») : TOUS les types, toujours dans le même ordre ;
    // un type sans assez d'annonces reste proposé et la page le dit (« Pas encore assez d'annonces pour ce type de bien »)
    var t = el("inv-t"), garde = t.value || "a2", dispo = ["a1", "a2", "a3", "maison", "bureau", "commerce", "industriel", "terrain", "terrainind", "agricole"];
    t.innerHTML = dispo.map(function (k) { return '<option value="' + k + '">' + esc(nom(NOMS[k] || [k, k])) + "</option>"; }).join("");
    t.value = dispo.indexOf(garde) >= 0 ? garde : "a2";
  }
  function lignes() {                         // lignes de la zone pour le type choisi : [g, g_fr, g_ar, achat|prix_m2, loyer|loyer_m2, brut, nb, peu]
    var t = el("inv-t").value, a = /^a\d$/.test(t) ? +t.slice(1) : 0;
    if (a) return Z.g.filter(function (x) { return x[3] === a; }).map(function (x) { return [x[0], x[1], x[2], x[4], x[5], x[6], x[7] + x[8], 0]; });
    var m = Z.m2.filter(function (x) { return x[0] === t; }).map(function (x) { return [x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8]]; });
    if (m.length) return m;
    return Z.t.filter(function (x) { return x[0] === t; }).map(function (x) { return [x[1], x[2], x[3], x[4], null, null, x[5], x[6]]; });
  }
  function remplirLieux() {
    var g = el("inv-g"), q = el("inv-q"), gg = g.value, gq = q.value, t = el("inv-t").value, a = /^a\d$/.test(t) ? +t.slice(1) : 0;
    var L = lignes().slice();
    if (a) (Z.v || []).forEach(function (x) {                 // gouvernorat aux prix trop variés pour cette taille : proposé, avec le message
      if (!x[1] && x[2] === a && !L.some(function (y) { return y[0] === x[0]; })) L.push([x[0], x[3], x[4]]);
    });
    L.sort(function (x, y) { return x[1].localeCompare(y[1]); });
    g.innerHTML = '<option value="">' + T("Toute la Tunisie", "كامل تونس") + "</option>" + L.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(ar() ? x[2] : x[1]) + "</option>"; }).join("");
    g.value = L.some(function (x) { return x[0] === gg; }) ? gg : "";
    var Q = a && g.value ? Z.q.filter(function (x) { return x[0] === g.value && x[4] === a && !x[10]; }) : [];
    // quartiers aux prix trop variés pour cette taille (IM.16) : proposés quand même, la page dit pourquoi il n'y a pas de chiffre
    if (a && g.value) (Z.v || []).forEach(function (x) { if (x[0] === g.value && x[1] && x[2] === a) Q.push([x[0], x[1], x[3], x[4]]); });
    Q.sort(function (x, y) { return x[2].localeCompare(y[2]); });
    q.innerHTML = '<option value="">' + T("Tous", "الكل") + "</option>" + Q.map(function (x) { return '<option value="' + esc(x[1]) + '">' + esc(ar() ? x[3] : x[2]) + "</option>"; }).join("");
    q.value = Q.some(function (x) { return x[1] === gq; }) ? gq : "";
    el("inv-q-l").hidden = !Q.length;
  }
  function varie(g, q, a) { return (Z.v || []).some(function (x) { return x[0] === g && x[1] === (q || "") && x[2] === a; }); }
  function msgVarie(nomZ, nomT) {
    return '<h4 class="res-zone">' + esc(nomZ) + " <small>" + escT(nomT) + "</small></h4><p class=\"res-varie\">" +
      T("Prix trop variés ici pour cette taille : les annonces des tailles voisines se contredisent (un appartement plus grand moins cher). Pas de chiffre plutôt qu’un chiffre faux.",
        "الأسعار متفاوتة جدًا هنا لهذا الحجم: إعلانات الأحجام المجاورة تتناقض (شقة أكبر بسعر أقل). لا رقم أفضل من رقم خاطئ.") + "</p>";
  }
  function ligneRes(fr, ar_, val, cls) { return '<p class="' + (cls || "") + '"><span>' + T(fr, ar_) + "</span><b>" + val + "</b></p>"; }
  function calculer() {
    if (!Z) return;
    var t = el("inv-t").value, a = /^a\d$/.test(t) ? +t.slice(1) : 0, g = el("inv-g").value, q = el("inv-q").value, b = +el("inv-b").value || 0;
    var L = lignes(), h = "", nomT = nom(NOMS[t] || [t, t]), terrain = L.length && L[0][4] === null;
    var zg = L.filter(function (x) { return x[0] === g; })[0];
    if (a) {
      var zq = q ? Z.q.filter(function (x) { return x[0] === g && x[1] === q && x[4] === a; })[0] : null;
      var nq = q ? (Z.v || []).filter(function (x) { return x[0] === g && x[1] === q && x[2] === a; })[0] : null;
      if (nq) h += msgVarie(ar() ? nq[4] : nq[3], nomT);
      else if (!q && g && varie(g, "", a)) h += msgVarie((Z.v.filter(function (x) { return x[0] === g && !x[1] && x[2] === a; })[0] || [])[ar() ? 4 : 3] || g, nomT);
      else if (zq) {
        h += '<h4 class="res-zone">' + esc(ar() ? zq[3] : zq[2]) + " <small>" + escT(nomT) + "</small></h4>" + ligneRes("Prix d’achat médian", "سعر الشراء الوسط", dt(zq[5])) +
             ligneRes("Loyer médian par mois (non meublé)", "الكراء الوسط في الشهر (غير مفروش)", dt(zq[6])) + ligneRes("Rendement brut", "المردود الخام", pc(zq[7]), "fort") +
             '<p class="petit">' + T(zq[8] + " ventes et " + zq[9] + " locations comparées", zq[8] + " بيع و" + zq[9] + " كراء للمقارنة") +
             (zq[11] ? T(" · peu d’annonces : chiffre indicatif", " · إعلانات قليلة: رقم للاستئناس") : "") + "</p>";
      } else if (zg) {
        h += '<h4 class="res-zone">' + esc(ar() ? zg[2] : zg[1]) + " <small>" + escT(nomT) + "</small></h4>" + ligneRes("Prix d’achat médian", "سعر الشراء الوسط", dt(zg[3])) +
             ligneRes("Loyer médian par mois (non meublé)", "الكراء الوسط في الشهر (غير مفروش)", dt(zg[4])) + ligneRes("Rendement brut", "المردود الخام", pc(zg[5]), "fort");
      }
      var top = Z.q.filter(function (x) { return x[4] === a && (!g || x[0] === g) && !x[10] && !x[11] && (!b || x[5] <= b); })
        .sort(function (x, y) { return y[7] - x[7]; }).slice(0, 3);
      h += "<h4>" + T("Les 3 meilleurs quartiers", "أفضل 3 أحياء") + (b ? T(" dans votre budget", " في ميزانيتك") : "") + " · " + escT(nomT) + "</h4>";
      // 19/10/2026 (Ahmed : « une seule ligne ») : nom à gauche (coupé par « … » si trop long), chiffres à droite, une ligne par quartier
      if (top.length) h += '<p class="petit rt-legende">' + T("Rendement brut · prix d’achat médian", "المردود الخام · سعر الشراء الوسط") + "</p>";
      h += top.length ? "<ol class=\"res-top\">" + top.map(function (x) { return '<li><span class="rt-l"><span class="rt-nom"><b>' + esc(ar() ? x[3] : x[2]) + "</b> <small>" + esc(nomG(x[0])) + '</small></span><span class="rt-val">' + pc(x[7]) + " · " + dt(x[5]) + "</span></span></li>"; }).join("") + "</ol>"
        : "<p>" + T("Aucun quartier assez sûr" + (b ? " sous ce budget" : "") + " pour ce choix : élargissez la région" + (b ? " ou le budget" : "") + ".", "لا يوجد حي موثوق بما يكفي" + (b ? " ضمن هذه الميزانية" : "") + " لهذا الاختيار: وسّع الجهة" + (b ? " أو الميزانية" : "") + ".") + "</p>";
    } else if (L.length) {
      var Lz = g ? L.filter(function (x) { return x[0] === g; }) : L.slice().sort(function (x, y) { return terrain ? x[3] - y[3] : y[5] - x[5]; }).slice(0, 3);
      if (!g) h += "<h4>" + escT(nomT) + " : " + (terrain ? T("les 3 gouvernorats les moins chers", "أرخص 3 ولايات") : T("les 3 meilleurs gouvernorats", "أفضل 3 ولايات")) + "</h4>";
      h += Lz.map(function (x) {
        return '<div class="res-ligne"><h4 class="res-zone">' + esc(ar() ? x[2] : x[1]) + " <small>" + escT(nomT) + "</small></h4>" + ligneRes("Prix d’achat au m²", "سعر الشراء بالمتر المربع", dt(x[3]) + T("/m²", "/م²")) +
          (terrain ? "" : ligneRes("Loyer au m² par mois", "الكراء بالمتر المربع في الشهر", '<bdi dir="ltr">' + String(x[4]).replace(".", ",") + "</bdi>" + T("\u00a0DT/m²", "\u00a0دينار/م²")) + ligneRes("Rendement brut", "المردود الخام", pc(x[5]), "fort")) +
          (b ? ligneRes("Avec votre budget, environ", "بميزانيتك، تقريبًا", '<bdi dir="ltr">' + nb(b / x[3]) + "</bdi>" + T("\u00a0m²", "\u00a0م²")) : "") +
          '<p class="petit">' + T(x[6] + " annonces comparées", x[6] + " إعلان للمقارنة") + (x[7] ? T(" · peu d’annonces : chiffre indicatif", " · إعلانات قليلة: رقم للاستئناس") : "") + "</p></div>";
      }).join("");
    } else h = "<p>" + T("Pas encore assez d’annonces pour ce type de bien.", "لا توجد بعد إعلانات كافية لهذا النوع.") + "</p>";
    res.innerHTML = h || "<p>" + T("Pas encore assez d’annonces ici : choisissez « Toute la Tunisie ».", "لا توجد إعلانات كافية هنا: اختر « كامل تونس ».") + "</p>";
    complet(a, g);
  }
  function aPass() { try { var v = JSON.parse(localStorage.getItem("pass-immobilier") || "null"); return v && v.code ? v.code : ""; } catch (e) { return ""; } }
  function complet(a, g) {
    if (!comp) return;
    var zg = g ? lignes().filter(function (x) { return x[0] === g; })[0] : null, ou = zg ? (ar() ? zg[2] : zg[1]) : T("toute la Tunisie", "كامل تونس");
    var l = a ? [T("La <b>note sur 10</b> de chaque quartier de " + esc(ou) + " (rendement net, prix d’entrée, fiabilité, demande)", "<b>العدد من 10</b> لكل حي في " + esc(ou) + " (المردود الصافي، سعر الدخول، الموثوقية، الطلب)"),
                 T("Le <b>rendement net</b> et ce qui reste chaque mois <b>avec un crédit</b>", "<b>المردود الصافي</b> وما يبقى كل شهر <b>بالقرض</b>"),
                 T("La <b>fiche</b> de chaque quartier : prix bas et haut, loyers, apport", "<b>بطاقة</b> كل حي: السعر الأدنى والأعلى، الكراء، المساهمة"),
                 T("Les <b>bonnes affaires</b> de la semaine (ventes sous le prix du quartier)", "<b>الصفقات الجيدة</b> لهذا الأسبوع (بيوع تحت سعر الحي)"),
                 T("Le <b>comparateur</b> de 2 ou 3 quartiers", "<b>المقارنة</b> بين حيين أو ثلاثة")]
            : [T("Le tableau complet au m² de <b>tous les gouvernorats</b>, trié comme vous voulez", "الجدول الكامل بالمتر المربع لـ<b>كل الولايات</b>، مرتّب كما تريد"),
               T("Le <b>rendement net</b> et le calcul <b>avec un crédit</b>", "<b>المردود الصافي</b> والحساب <b>بالقرض</b>"),
               T("Les <b>bonnes affaires</b> de la semaine", "<b>الصفقات الجيدة</b> لهذا الأسبوع")];
    var code = aPass(), lien = "pass/" + (g ? "?g=" + encodeURIComponent(g) : "") + (code ? "#" + code : "");
    // 27/10/2026 (Ahmed : « je ne vois pas le résultat complet alors que j'ai le Pass ») : Pass gardé dans le téléphone -> « ✅ Pass
    // actif » et un gros bouton ; sans Pass : ce que contient le résultat (🔒), l'exemple, le prix, et « J'ai déjà un code Pass »
    comp.innerHTML = code
      ? '<p class="inv-pass-actif">✅ ' + T("Votre Pass est actif (" + esc(code) + ")", "الباس مفعّل (" + esc(code) + ")") + "</p>" +
        '<ul class="res-inclus">' + l.map(function (x) { return "<li>✓ " + x + "</li>"; }).join("") + "</ul>" +
        '<p><a class="btn-paie btn-paie-grand" href="' + lien + '">' + T("Voir mon résultat complet", "شاهد نتيجتي الكاملة") + "</a></p>"
      : '<ul class="res-verrou">' + l.map(function (x) { return "<li>🔒 " + x + "</li>"; }).join("") + "</ul>" +
        '<p class="v-pour">🔒 <b>' + T("Disponible avec le Pass Investisseur", "متاح مع باس المستثمر") + "</b>.</p>" +
        '<p class="res-boutons"><a class="btn-exemple" href="exemple/">' + T("👀 Voir l’exemple complet", "👀 شاهد المثال الكامل") + '</a> <a class="btn-paie" href="#pass">' + T("Voir le prix du Pass", "شاهد سعر الباس") + "</a></p>" +
        '<p class="inv-deja"><a href="pass/">' + T("🔑 J’ai déjà un code Pass", "🔑 لديّ رمز باس") + "</a></p>";
  }
  function tout() { remplirLieux(); calculer(); }
  f.addEventListener("change", function (e) { if (e.target.id === "inv-t" || e.target.id === "inv-g") remplirLieux(); calculer(); });
  f.addEventListener("input", function (e) { if (e.target.id === "inv-b") calculer(); });
  document.addEventListener("langue", function () { if (Z) { remplirTypes(); tout(); } });
  // 27/10/2026 (Ahmed) : choix faits sur l'accueil (onglet « Investir » -> « Voir le résultat ») : ?t=&g=&q=&b=, toujours modifiables ici
  function choixAdresse() {
    var p = new URLSearchParams(location.search), mis = false;
    var t = p.get("t"), g = p.get("g"), q = p.get("q"), b = p.get("b");
    if (t && el("inv-t").querySelector('option[value="' + esc(t) + '"]')) { el("inv-t").value = t; mis = true; }
    remplirLieux();
    if (g && el("inv-g").querySelector('option[value="' + esc(g) + '"]')) { el("inv-g").value = g; mis = true; remplirLieux(); }
    if (q && el("inv-q").querySelector('option[value="' + esc(q) + '"]')) { el("inv-q").value = q; mis = true; }
    if (b && +b > 0) { el("inv-b").value = String(Math.round(+b)); mis = true; }
    return mis;
  }
  fetch("zones.json", {cache: "no-cache"}).then(function (r) { return r.json(); }).then(function (z) {
    Z = z; remplirTypes();
    var mis = choixAdresse(); calculer();
    var r2 = el("inv-resultat");
    if (mis && r2 && r2.scrollIntoView && location.hash === "#inv-resultat") r2.scrollIntoView({ block: "start" });
  })
    .catch(function () { res.innerHTML = "<p>" + T("Les chiffres n’ont pas pu être chargés : réessayez plus tard.", "تعذّر تحميل الأرقام: أعد المحاولة لاحقًا.") + "</p>"; });
})();
