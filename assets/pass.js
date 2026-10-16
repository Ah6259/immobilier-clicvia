/* Pass Investisseur sur la page web investir/pass/ (14/10/2026, demande d'Ahmed : sans Telegram, un lien mis à jour chaque semaine).
   - PAS D'ESSAI GRATUIT depuis le 15/10/2026 (décision d'Ahmed) : « Prendre le Pass » crée tout de suite le code Pass INV-XXXXXX
     (motif du paiement, gardé dans ce navigateur) ; le contenu s'ouvre quand le code est payé (essais commencés avant : honorés).
   - Code Pass actif (payé) : son identifiant et la clé du tableau (chiffrée avec une clé tirée du code) sont dans acces.json
     (écrit par le robot privé). Le tableau de la semaine (rapport.dat) est CHIFFRÉ (AES-256-GCM) depuis le 17/10/2026 :
     deriver() et dechiffrer() = mêmes calculs que robot/pass_web.py.
   Rien n'est envoyé : la page ne fait que lire ses deux fichiers. */
(function () {
  var zone = document.getElementById("pass-web");
  if (!zone) return;
  var CLE = "pass-immobilier", ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var R = null, ACCES = null, etat = lire();
  function el(id) { return document.getElementById(id); }
  function ar() { return document.documentElement.lang === "ar"; }
  function T2(fr, a) { return ar() ? a : fr; }
  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function nb(x) { return '<bdi dir="ltr">' + Math.round(x).toLocaleString("fr-FR").replace(/[  ]/g, " ") + "</bdi>"; }
  function dt(x) { return nb(x) + (ar() ? " دينار" : " DT"); }
  function pc(x) { return '<bdi dir="ltr">' + Number(x).toFixed(1).replace(".", ",") + " %</bdi>"; }
  function jfr(d) { return d ? '<bdi dir="ltr">' + d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) + "</bdi>" : ""; }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function plus(d, n) { var x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function jours(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }

  // ---- mêmes calculs que robot/pass_web.py (17/10/2026 : VRAI chiffrement, plus de brouillage — audit après l'étude de 9annas)
  // Le tableau (rapport.dat) est chiffré en AES-256-GCM ; sa clé n'est donnée, dans acces.json, que chiffrée avec une clé tirée de
  // chaque CODE PAYÉ (PBKDF2-SHA256, 150 000 tours). Sans un code payé, rien ne s'ouvre ; deviner un code prendrait des années.
  var ITER = 150000, SEL_CODE = "immobilier-pass-v2", TE = new TextEncoder();
  function normaliser(c) {
    c = String(c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, "");
    if (c && c.indexOf("INV-") !== 0) c = "INV-" + c.replace(/^INV/, "");
    return c;
  }
  function octets(b64) { var d = atob(b64), u = new Uint8Array(d.length); for (var i = 0; i < d.length; i++) u[i] = d.charCodeAt(i); return u; }
  function hex(u) { var s = ""; for (var i = 0; i < u.length; i++) s += ("0" + u[i].toString(16)).slice(-2); return s; }
  function deriver(code) {      // -> {id : identifiant dans acces.json, kek : clé qui ouvre la clé du tableau}
    var S = crypto.subtle;
    return S.importKey("raw", TE.encode(normaliser(code)), "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return S.deriveBits({name: "PBKDF2", hash: "SHA-256", salt: TE.encode(SEL_CODE), iterations: ITER}, k, 384);
    }).then(function (b) { var u = new Uint8Array(b); return {id: hex(u.slice(0, 16)), kek: u.slice(16)}; });
  }
  function dechiffrer(cle, b64, contexte) {
    var u = octets(b64);
    return crypto.subtle.importKey("raw", cle, "AES-GCM", false, ["decrypt"]).then(function (k) {
      return crypto.subtle.decrypt({name: "AES-GCM", iv: u.slice(0, 12), additionalData: TE.encode(contexte)}, k, u.slice(12));
    }).then(function (b) { return new Uint8Array(b); });
  }
  window.PASS_IMMO = {normaliser: normaliser, deriver: deriver, dechiffrer: dechiffrer};

  // ---- mémoire de ce navigateur (peut être vide ou refusée : la page marche quand même)
  function lire() { try { var v = JSON.parse(localStorage.getItem(CLE) || "null"); return v && typeof v.code === "string" ? v : null; } catch (e) { return null; } }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* navigation privée */ } }
  function nouveauCode() {
    var t = new Uint8Array(6), c = "INV-";
    try { crypto.getRandomValues(t); } catch (e) { for (var k = 0; k < 6; k++) t[k] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < 6; i++) c += ALPH[t[i] % ALPH.length];
    return c;
  }
  var h = normaliser(decodeURIComponent((location.hash || "").slice(1)));
  if (/^INV-[A-Z0-9]{4,8}$/.test(h)) {                    // lien personnel (#INV-XXXX) : Telegram, ou autre téléphone
    if (!etat || etat.code !== h) etat = {code: h, debut: etat && etat.code === h ? etat.debut : null};
    garder();
  }
  if (/[?&](prendre|essai)\b/.test(location.search) && !etat) { etat = {code: nouveauCode(), debut: null}; garder(); }

  // ---- accès
  // PASS : {code, fin} quand le code de ce navigateur est PAYÉ et que le tableau a pu être déchiffré avec lui (ouvrir())
  var PASS = null, RAPPORT_CHIFFRE = null;
  function acces() {
    var ok = !!(PASS && etat && PASS.code === etat.code && PASS.fin >= aujourdhui());
    return {ok: ok, fin: ok ? PASS.fin : null, quoi: ok ? "pass" : null};
  }
  // un code payé -> sa clé -> la clé du tableau -> le tableau (tout se passe dans ce navigateur, rien n'est envoyé)
  function ouvrir() {
    if (!etat || !ACCES || !RAPPORT_CHIFFRE || !(window.crypto && crypto.subtle)) return Promise.resolve();
    var code = etat.code;
    return deriver(code).then(function (d) {
      var e = (ACCES.codes || {})[d.id];
      if (!e || !e.k || e.fin < aujourdhui()) return null;
      return dechiffrer(d.kek, e.k, "cle").then(function (cle) {
        return dechiffrer(cle, RAPPORT_CHIFFRE, "rapport");
      }).then(function (u) {
        R = JSON.parse(new TextDecoder().decode(u)); PASS = {code: code, fin: e.fin};
      });
    }).catch(function () { /* code faux ou fichier modifié : rien ne s'ouvre */ }).then(tout);
  }
  function lienPerso() { return location.origin + location.pathname + "#" + etat.code; }

  function afficherEtat() {
    var a = acces(), auj = aujourdhui(), boite = el("pass-etat"), h = "";
    el("pass-accueil").hidden = !!etat;
    el("pass-contenu").hidden = !(a.ok && R);
    el("pass-payer").hidden = !etat || a.quoi === "pass";
    if (!etat) { boite.innerHTML = ""; return; }
    if (a.ok) {
      h += a.quoi === "essai"
        ? "<p><b>" + T2("Essai gratuit actif", "التجربة المجانية مفعّلة") + "</b> : " + T2("encore ", "متبقٍّ ") + "<b>" + nb(Math.max(1, jours(auj, a.fin))) + "</b>" + T2(" jour(s), jusqu’au ", " يوم، إلى غاية ") + jfr(a.fin) + "</p>"
        : "<p><b>" + T2("Pass Investisseur actif", "باس المستثمر مفعّل") + "</b> " + T2("jusqu’au ", "إلى غاية ") + jfr(a.fin) + "</p>";
    } else {
      h += "<p><b>" + (etat.debut ? T2("Votre essai gratuit est terminé.", "انتهت تجربتك المجانية.") : T2("Votre code Pass est prêt.", "رمز الباس جاهز.")) + "</b> " +
           T2("Payez le Pass ci-dessous avec ce code en motif : le Pass s’ouvre sur cette page dès que le paiement est reçu, dans la journée.", "ادفع الباس أدناه مع هذا الرمز كسبب للدفع: يُفتح الباس في هذه الصفحة بمجرد وصول الدفع، في نفس اليوم.") + "</p>";
    }
    h += '<p class="pass-code">' + T2("Votre code Pass", "رمز الباس") + ' : <b><bdi dir="ltr">' + esc(etat.code) + "</bdi></b> <small>" +
         T2("(motif du paiement ; il ouvre aussi cette page sur un autre téléphone)", "(سبب الدفع؛ ويفتح هذه الصفحة على هاتف آخر)") + "</small></p>" +
         '<p class="pass-lien">' + T2("Votre lien personnel, à garder dans vos favoris", "رابطك الشخصي، احفظه في المفضلة") + ' : <bdi dir="ltr" class="pass-url">' + esc(lienPerso()) +
         '</bdi> <button type="button" class="pass-copier" id="pass-copier">' + T2("Copier", "نسخ") + "</button></p>";
    boite.innerHTML = h;
    var wa = el("pass-preuve");
    if (wa) { if (!wa.getAttribute("data-base")) wa.setAttribute("data-base", wa.href); wa.href = wa.getAttribute("data-base") + encodeURIComponent(etat.code); }
    var c = el("pass-copier");
    if (c) c.onclick = function () {
      try { navigator.clipboard.writeText(lienPerso()); c.textContent = T2("Copié ✓", "تم النسخ ✓"); } catch (e) { /* ancien navigateur */ }
    };
  }

  // ---- contenu
  function ligneQ(x, i) {
    return '<li class="p-q"><span class="inv-rang">' + i + "</span><div><b>" + esc(ar() ? x.q_ar : x.q_fr) + "</b> <small>" + esc(ar() ? x.g_ar : x.g_fr) +
      ' · <bdi dir="ltr">S+' + x.taille + "</bdi>" + (x.saison ? " · " + T2("zone de vacances", "منطقة عطل") : "") + '</small><span class="pe-note"><bdi dir="ltr">' +
      String(x.note).replace(".", ",") + "/10</bdi></span><br>" + T2("achat ", "شراء ") + dt(x.achat) + iaM(x, "achat") + " · " + T2("loyer ", "كراء ") + dt(x.loyer) + iaM(x, "loyer") + " · <b>" + pc(x.brut) + "</b> " +
      T2("brut", "خام") + " · " + pc(x.net) + " " + T2("net", "صافٍ") + '</div><button type="button" class="p-voir" data-g="' + esc(x.g) + '" data-q="' + esc(x.q) + '">' +
      T2("Fiche", "البطاقة") + '</button><button type="button" class="p-ajout" data-k="' + esc(x.g + "|" + x.q) + '">' + T2("⚖️ Comparer", "⚖️ قارن") + "</button></li>";
  }
  // chiffre estimé par l'IA (quartier avec peu d'annonces, 15/10/2026)
  function iaM(x, k) { return x.ia && x.ia.indexOf(k) >= 0 ? ' <small class="p-ia">(' + T2("estimé par l’IA", "تقدير الذكاء الاصطناعي") + ")</small>" : ""; }
  function classement() {
    var g = el("p-filtre").value, l = R.classement.filter(function (x) { return !g || x.g === g; });
    el("p-liste").innerHTML = l.length ? l.map(function (x, i) { return ligneQ(x, i + 1); }).join("")
      : "<li>" + T2("Pas encore assez d’annonces dans ce gouvernorat pour classer ses quartiers : voyez le tableau des gouvernorats.", "لا توجد بعد إعلانات كافية في هذه الولاية لترتيب أحيائها: انظر جدول الولايات.") + "</li>";
    el("p-liste").classList.remove("tout");
    if (window.limiter) window.limiter(el("p-liste"));
  }
  // listes longues : 10 visibles + tri choisi (page.js, 15/10/2026)
  function retrier(id) {
    var c = el(id), s = document.querySelector('select[data-trier="' + id + '"]');
    if (!c || !window.trier) return;
    if (s) window.trier(c, s.value, s.options[s.selectedIndex].getAttribute("data-sens")); else window.limiter(c);
  }
  // « ⚖️ Comparer » d'une ligne du classement : le quartier va dans le comparateur (case vide, sinon la 3e)
  function ajouterComparer(k) {
    var ids = ["p-c1", "p-c2", "p-c3"], vals = ids.map(function (id) { return el(id).value; });
    if (vals.indexOf(k) < 0) { var i = vals.indexOf(""); el(ids[i < 0 ? 2 : i]).value = k; }
    comparer();
    var dc = el("p-comparer").querySelector("details.pliable"); if (dc) dc.open = true;   // carte repliée par défaut : on l'ouvre
    el("p-comparer").scrollIntoView({behavior: "smooth", block: "start"});
  }
  function fiche(g, q) {
    var l = R.classement.filter(function (x) { return x.g === g && x.q === q; }).sort(function (a, b) { return a.taille - b.taille; });
    if (!l.length) return;
    var h = "<h2>" + T2("Fiche investisseur : ", "بطاقة المستثمر: ") + esc(ar() ? l[0].q_ar : l[0].q_fr) + " <small>" + esc(ar() ? l[0].g_ar : l[0].g_fr) + "</small></h2>";
    if (l.some(function (x) { return x.ia; })) h += '<p class="petit p-ia-note">🤖 ' + T2("Peu d’annonces dans ce quartier : les chiffres marqués « estimé par l’IA » sont calculés par notre modèle d’IA, pas par des annonces du quartier. À vérifier sur place.", "إعلانات قليلة في هذا الحي: الأرقام المعلَّمة « تقدير الذكاء الاصطناعي » يحسبها نموذجنا وليست من إعلانات الحي. تحقّق منها ميدانيًا.") + "</p>";
    if (l[0].saison) h += '<p class="petit">' + T2("Zone de vacances : loyers souvent meublés ou saisonniers.", "منطقة عطل: الكراء غالبًا مفروش أو موسمي.") + "</p>";
    l.forEach(function (x) {
      h += '<div class="p-fiche"><h3>' + T2("Appartement", "شقة") + ' <bdi dir="ltr">S+' + x.taille + '</bdi> <span class="pe-note"><bdi dir="ltr">' + String(x.note).replace(".", ",") + "/10</bdi></span></h3><ul>" +
        "<li>" + T2("Prix d’achat : ", "سعر الشراء: ") + "<b>" + dt(x.achat) + "</b>" + iaM(x, "achat") + " <small>(" + T2("la moitié des annonces de ", "نصف الإعلانات من ") + dt(x.achat_bas) + T2(" à ", " إلى ") + dt(x.achat_haut) + T2(" : visez le bas pour négocier", ": استهدف الأدنى للتفاوض") + ")</small></li>" +
        "<li>" + T2("Loyer : ", "الكراء: ") + "<b>" + dt(x.loyer) + "</b>" + iaM(x, "loyer") + " " + T2("/ mois", "/ شهر") + " <small>(" + dt(x.loyer_bas) + " – " + dt(x.loyer_haut) + ")</small></li>" +
        "<li>" + T2("Rendement : ", "المردود: ") + "<b>" + pc(x.brut) + "</b> " + T2("brut", "خام") + ", " + pc(x.net) + " " + T2("net", "صافٍ") +
        (x.vs_gouv === null || x.vs_gouv === undefined ? "" : " <small>(" + (x.vs_gouv >= 0 ? "+" : "−") + '<bdi dir="ltr">' + String(Math.abs(x.vs_gouv)).replace(".", ",") + "</bdi> " + T2("point(s) par rapport au gouvernorat", "نقطة مقارنة بالولاية") + ")</small>") + "</li>" +
        (x.retour_ans ? "<li>" + T2("Prix remboursé par les loyers nets en ", "يُسترجع السعر بالكراء الصافي في ") + "<b>" + '<bdi dir="ltr">' + String(x.retour_ans).replace(".", ",") + "</bdi> " + T2("ans", "سنة") + "</b></li>" : "") +
        "<li>" + T2("Avec un crédit (20 % d’apport + frais = ", "بقرض (" + "20 % تمويل ذاتي + مصاريف = ") + dt(x.apport) + T2(", 10 %/an, 20 ans) : ", "، 10 % سنويًا، 20 سنة): ") + dt(x.mensualite) + T2(" / mois → ", " / شهر ← ") +
        (x.reste_mois >= 0 ? T2("il vous reste ", "يبقى لك ") : T2("vous ajoutez ", "تضيف ")) + "<b>" + dt(Math.abs(x.reste_mois)) + "</b> " + T2("/ mois", "/ شهر") + "</li>" +
        "<li><small>" + T2("Comparé : ", "للمقارنة: ") + nb(x.nb_ventes) + T2(" ventes et ", " بيع و") + nb(x.nb_locations) + T2(" locations", " كراء") + "</small></li></ul></div>";
    });
    var ba = R.affaires.filter(function (a) { return a.g === g && a.q === q; });
    if (ba.length) h += "<h3>" + T2("Bonnes affaires en ce moment dans ce quartier", "صفقات جيدة الآن في هذا الحي") + "</h3><ul>" + ba.slice(0, 6).map(affaire).join("") + "</ul>";
    var f = el("p-fiche");
    f.innerHTML = h + '<p><button type="button" class="p-fermer" id="p-fermer">' + T2("Fermer la fiche", "أغلق البطاقة") + "</button></p>";
    f.hidden = false;
    el("p-fermer").onclick = function () { f.hidden = true; };
    f.scrollIntoView({behavior: "smooth", block: "start"});
  }
  function affaire(a) {
    return '<li data-pert="' + a.ecart + '" data-prix="' + a.prix + '" data-rdt="' + a.brut + '"><b>' + T2("S+", "S+") + a.taille + " " + esc(ar() ? a.q_ar : a.q_fr) + "</b> : <b>" + dt(a.prix) + "</b> — " + nb(a.ecart) + T2(" % sous le prix du quartier (", " % أقل من سعر الحي (") + dt(a.mediane) +
      ") · " + T2("loyer du quartier ", "كراء الحي ") + dt(a.loyer) + " → <b>" + pc(a.brut) + "</b> " + T2("brut", "خام") +
      (a.ia ? " · " + T2("estimation de l’IA ≈ ", "تقدير الذكاء الاصطناعي ≈ ") + dt(a.ia) : "") +
      ' · <a href="' + esc(a.url) + '" target="_blank" rel="noopener nofollow">' + T2("voir l’annonce", "شاهد الإعلان") + "</a></li>";
  }
  function quartiersUniques() {
    var vus = {}, l = [];
    R.classement.forEach(function (x) { var k = x.g + "|" + x.q; if (!vus[k]) { vus[k] = 1; l.push(x); } });
    return l.sort(function (a, b) { return (a.q_fr > b.q_fr) - (a.q_fr < b.q_fr); });
  }
  function comparer() {
    var ks = ["p-c1", "p-c2", "p-c3"].map(function (id) { return el(id).value; }).filter(Boolean), h = "";
    if (ks.length < 2) { el("p-comp-res").innerHTML = "<p>" + T2("Choisissez 2 ou 3 quartiers.", "اختر حيين أو ثلاثة.") + "</p>"; return; }
    [1, 2, 3].forEach(function (t) {
      var l = ks.map(function (k) { var p = k.split("|"); return R.classement.filter(function (x) { return x.g === p[0] && x.q === p[1] && x.taille === t; })[0] || null; });
      if (l.filter(Boolean).length < 2) return;
      var best = l.filter(Boolean).sort(function (a, b) { return b.note - a.note; })[0];
      h += '<h3><bdi dir="ltr">S+' + t + "</bdi></h3><ul>" + l.map(function (x, i) {
        if (!x) return "<li>" + T2("pas assez d’annonces", "إعلانات غير كافية") + "</li>";
        return "<li>" + (x === best ? "🏆 " : "") + "<b>" + esc(ar() ? x.q_ar : x.q_fr) + '</b> : <bdi dir="ltr">' + String(x.note).replace(".", ",") + "/10</bdi> · " + T2("achat ", "شراء ") + dt(x.achat) +
          " · " + T2("loyer ", "كراء ") + dt(x.loyer) + " · " + pc(x.brut) + " " + T2("brut", "خام") + " · " + T2("avec crédit ", "بالقرض ") + (x.reste_mois >= 0 ? "+" : "−") + dt(Math.abs(x.reste_mois)) + T2("/mois", "/شهر") + "</li>";
      }).join("") + "</ul>";
    });
    el("p-comp-res").innerHTML = h || "<p>" + T2("Pas de taille commune (S+1, S+2, S+3) avec assez d’annonces.", "لا يوجد حجم مشترك بإعلانات كافية.") + "</p>";
  }
  function gouvernorats() {
    var par = {}, ordre = [];
    R.gouvernorats.forEach(function (x) { if (!par[x.g]) { par[x.g] = {}; ordre.push(x); } par[x.g][x.taille] = x; });
    ordre.sort(function (a, b) { return Math.max.apply(null, [1, 2, 3].map(function (t) { return par[b.g][t] ? par[b.g][t].brut : 0; })) - Math.max.apply(null, [1, 2, 3].map(function (t) { return par[a.g][t] ? par[a.g][t].brut : 0; })); });
    el("p-gouv-t").innerHTML = ordre.map(function (x) {
      return '<tr><th scope="row">' + esc(ar() ? x.g_ar : x.g_fr) + "</th>" + [1, 2, 3].map(function (t) { var y = par[x.g][t];
        return y ? "<td><b>" + pc(y.brut) + "</b><small>" + dt(y.achat) + "</small></td>" : '<td class="vide">—</td>'; }).join("") + "</tr>";
    }).join("");
    if (window.limiter) window.limiter(el("p-gouv-t"));
    var f = el("p-filtre"), garde = f.value;
    f.innerHTML = '<option value="">' + T2("Tous les gouvernorats", "كل الولايات") + "</option>" + ordre.filter(function (x) { return R.classement.some(function (q) { return q.g === x.g; }); })
      .map(function (x) { return '<option value="' + esc(x.g) + '">' + esc(ar() ? x.g_ar : x.g_fr) + "</option>"; }).join("");
    var pg = (location.search.match(/[?&]g=([a-z-]+)/) || [])[1];   // venu de « Voir mon résultat complet » (page Où investir)
    if (!garde && pg && !f._pg) { f._pg = 1; garde = pg; var dcl = el("p-classement").querySelector("details.pliable"); if (dcl) dcl.open = true; }
    f.value = garde;
  }
  function autres() {
    var noms = {maison: ["Maison / villa", "منزل / فيلا"], bureau: ["Bureau", "مكتب"], commerce: ["Local commercial", "محل تجاري"], industriel: ["Usine / entrepôt", "مصنع / مستودع"],
                terrain: ["Terrain à bâtir", "أرض للبناء"], terrainind: ["Terrain industriel", "أرض صناعية"], agricole: ["Terrain agricole", "أرض فلاحية"]};
    function n(t) { return (noms[t] || [t, t])[ar() ? 1 : 0]; }
    el("p-m2").innerHTML = R.m2.map(function (x) { return '<li data-pert="' + ((x.nb_ventes || 0) + (x.nb_locations || 0)) + '" data-prix="' + x.prix_m2 + '" data-rdt="' + x.brut + '"><b>' + n(x.type) + "</b> " + esc(ar() ? x.g_ar : x.g_fr) + " (~" + nb(x.surface) + " m²) : " + nb(x.prix_m2) + T2(" DT/m² · loyer ", " دينار/م² · كراء ") +
      '<bdi dir="ltr">' + String(x.loyer_m2).replace(".", ",") + "</bdi>" + T2(" DT/m² · ", " دينار/م² · ") + "<b>" + pc(x.brut) + "</b></li>"; }).join("") +
      R.terrains.map(function (x) { return '<li data-pert="' + x.nb + '" data-prix="' + x.prix_m2 + '"><b>' + n(x.type) + "</b> " + esc(ar() ? x.g_ar : x.g_fr) + " : " + nb(x.prix_m2) + T2(" DT/m² (", " دينار/م² (") + nb(x.nb) + T2(" annonces)", " إعلان)") + "</li>"; }).join("");
    el("p-affaires").innerHTML = R.affaires.length ? R.affaires.map(affaire).join("") : "<li>" + T2("Aucune bonne affaire cette semaine.", "لا صفقات جيدة هذا الأسبوع.") + "</li>";
    retrier("p-affaires"); retrier("p-m2");
    var opts = '<option value="">—</option>' + quartiersUniques().map(function (x) { return '<option value="' + esc(x.g + "|" + x.q) + '">' + esc(ar() ? x.q_ar : x.q_fr) + " (" + esc(ar() ? x.g_ar : x.g_fr) + ")</option>"; }).join("");
    ["p-c1", "p-c2", "p-c3"].forEach(function (id) { var s = el(id), g = s.value; s.innerHTML = opts; s.value = g; });
  }
  function tout() {
    if (R) { el("pass-date").innerHTML = jfr(R.jour); gouvernorats(); classement(); autres(); comparer(); }
    afficherEtat();
  }

  zone.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".p-voir") : null;
    if (b) fiche(b.getAttribute("data-g"), b.getAttribute("data-q"));
    var c = e.target.closest ? e.target.closest(".p-ajout") : null;
    if (c) ajouterComparer(c.getAttribute("data-k"));
  });
  el("p-filtre").addEventListener("change", classement);
  ["p-c1", "p-c2", "p-c3"].forEach(function (id) { el(id).addEventListener("change", comparer); });
  el("pass-commencer").addEventListener("click", function () {
    if (!etat) { etat = {code: nouveauCode(), debut: null}; garder(); }
    tout();
    var p = el("pass-payer"); if (p && !p.hidden) { var d = p.querySelector("details.paiement"); if (d) d.open = true; try { p.scrollIntoView({behavior: "smooth", block: "start"}); } catch (x) { /* ancien navigateur */ } }
  });
  el("pass-code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var c = normaliser(el("pass-code-saisi").value);
    if (!/^INV-[A-Z0-9]{4,8}$/.test(c)) { el("pass-code-msg").textContent = T2("Code inconnu : il ressemble à INV-7K3Q.", "رمز غير معروف: يشبه INV-7K3Q."); return; }
    etat = {code: c, debut: etat && etat.code === c ? etat.debut : null}; garder(); tout();
    el("pass-code-msg").textContent = T2("Vérification du code…", "جارٍ التحقق من الرمز…");
    ouvrir().then(function () { el("pass-code-msg").textContent = acces().ok ? "" : T2("Ce code n’est pas (encore) payé.", "هذا الرمز غير مدفوع (بعد)."); });
  });
  document.addEventListener("langue", tout);
  tout();
  window.PASS_IMMO.pret = Promise.all([   // « prêt » : attendu par les tests
    fetch("rapport.dat", {cache: "no-cache"}).then(function (r) { return r.text(); }).then(function (t) {
      var l = t.split("\n"); if (l[0].trim() === "v2") RAPPORT_CHIFFRE = (l[1] || "").trim();   // tableau chiffré (17/10/2026)
    }),
    fetch("acces.json", {cache: "no-cache"}).then(function (r) { return r.json(); }).then(function (a) { ACCES = a; }).catch(function () { ACCES = {codes: {}}; })
  ]).then(ouvrir).catch(function () {
    el("pass-etat").insertAdjacentHTML("beforeend", "<p>" + T2("Le tableau n’a pas pu être chargé. Réessayez dans un instant.", "تعذّر تحميل الجدول. أعد المحاولة بعد لحظة.") + "</p>");
  });
})();
