/* Immobilier Tunisie — script commun à toutes les pages : langue (FR / AR), en-tête et pied de page, partage,
   numéros révélés au clic, protection légère contre la copie, service worker prudent, statistiques GoatCounter.
   Aucun script en ligne dans les pages (CSP). */
/* Adresse : immobilier.clicvia.com (racine « / »).
   Compteur de visites : préfixe /immobilier-tunis (gardé tel quel : continuité des statistiques). */
var BASE_SITE = "/";
window.goatcounter = window.goatcounter || {};
window.goatcounter.path = function (p) { return BASE_SITE === "/" ? "/immobilier-tunis" + p : p; };   // préfixe des statistiques (inchangé)

/* Favoris (18/10/2026, IM.15, « Fais » d'Ahmed) : un cœur sur chaque annonce, page « Mes favoris » (favoris/, assets/favoris.js).
   Gardés DANS LE TÉLÉPHONE du visiteur (localStorage, clé « favoris-immobilier ») : rien n'est envoyé, sans compte. Pour pouvoir montrer
   une annonce retirée du site (« n'est plus en ligne »), chaque favori garde le minimum : titre, prix, lieu, lien, date d'ajout.
   Mémoire bloquée (navigation privée…) : les cœurs marchent pendant la visite (mémoire de la page), sans erreur. */
(function () {
  var CLE = "favoris-immobilier", MAX = 300, MEM = null, BLOQUE = false;
  var COEUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.3 0 5.5 3.1 4.3 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>';
  function T(fr, ar) { return window.T ? window.T(fr, ar) : fr; }
  function E(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function txt(v, n) { return typeof v === "string" ? v.slice(0, n || 200) : ""; }
  function propre(f) {               // valeurs relues de la mémoire : jamais de confiance aveugle
    if (!f || typeof f.i !== "string" || !f.i) return null;
    return { i: f.i.slice(0, 80), tf: txt(f.tf), ta: txt(f.ta), lf: txt(f.lf), la: txt(f.la), p: typeof f.p === "number" && isFinite(f.p) ? f.p : null,
             t: f.t === "l" ? "l" : "v", y: txt(f.y, 20), g: txt(f.g, 30), u: /^https?:\/\//i.test(f.u || "") ? txt(f.u, 500) : "", d: txt(f.d, 10) };
  }
  function lire() {
    if (MEM) return MEM.slice();
    try {
      var v = JSON.parse(localStorage.getItem(CLE) || "[]");
      return Array.isArray(v) ? v.map(propre).filter(Boolean) : [];
    } catch (e) { BLOQUE = true; return []; }
  }
  function ecrire(l) {
    l = l.slice(0, MAX);
    try { localStorage.setItem(CLE, JSON.stringify(l)); MEM = null; }
    catch (e) { BLOQUE = true; MEM = l; }        // mémoire bloquée ou pleine : gardés le temps de la visite
    maj();
    try { document.dispatchEvent(new Event("favoris")); } catch (e) {}
  }
  function est(id) { return lire().some(function (f) { return f.i === id; }); }
  function annonce(id) {
    var a = window.ANNONCES && window.ANNONCES.a;
    if (!a) return null;
    for (var k = 0; k < a.length; k++) if (a[k].i === id) return a[k];
    return null;
  }
  function langues(el) {             // texte FR et AR d'un élément de carte (spans data-l), ou le même texte (titre écrit par le vendeur)
    if (!el) return ["", ""];
    var fr = el.querySelector('[data-l="fr"]'), ar = el.querySelector('[data-l="ar"]');
    var tout = (el.textContent || "").replace(/\s+/g, " ").trim();
    return [fr ? fr.textContent.replace(/\s+/g, " ").trim() : tout, ar ? ar.textContent.replace(/\s+/g, " ").trim() : tout];
  }
  function infos(id, carte) {        // le minimum gardé (pour afficher le favori même si l'annonce a quitté le site)
    var a = annonce(id) || {}, t = carte ? langues(carte.querySelector(".an-titre")) : ["", ""], l = carte ? langues(carte.querySelector(".an-lieu")) : ["", ""];
    var p = a.p != null ? a.p : null;
    if (p == null && carte) { var s = carte.querySelector(".an-prix strong"); var n = s && parseInt(s.textContent.replace(/\D/g, ""), 10); if (n > 0) p = n; }
    var u = a.u || "";
    if (!u && carte) { var lien = carte.querySelector("a.an-contact, a.an-voir, a.an-fb"); u = lien ? lien.href : ""; }
    var j = new Date(), d = j.getFullYear() + "-" + ("0" + (j.getMonth() + 1)).slice(-2) + "-" + ("0" + j.getDate()).slice(-2);
    return propre({ i: id, tf: t[0], ta: t[1], lf: l[0], la: l[1], p: p, t: a.t || (carte && carte.getAttribute("data-t")) || "v",
                    y: a.y || (carte && carte.getAttribute("data-y")) || "", g: a.g || "", u: u, d: d });
  }
  function basculer(id, carte) {
    var l = lire(), avant = l.length;
    l = l.filter(function (f) { return f.i !== id; });
    if (l.length === avant) { var f = infos(id, carte); if (f) l.unshift(f); }
    ecrire(l);
    return l.length > avant;
  }
  function libelle(on) { return on ? T("Retirer des favoris", "إزالة من المفضّلة") : T("Ajouter aux favoris", "أضف إلى المفضّلة"); }
  function maj() {                   // cœurs des cartes + compteur de l'en-tête
    var l = lire(), ids = Object.create(null);
    l.forEach(function (f) { ids[f.i] = 1; });
    [].forEach.call(document.querySelectorAll(".an-fav[data-fav]"), function (b) {
      var on = !!ids[b.getAttribute("data-fav")];
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", libelle(on)); b.title = libelle(on);
    });
    [].forEach.call(document.querySelectorAll(".entete-fav"), function (a) {
      var c = a.querySelector(".fav-compte");
      if (c) { c.textContent = l.length; c.hidden = !l.length; }
      a.setAttribute("aria-label", T("Mes favoris", "مفضّلاتي") + " (" + l.length + ")");
    });
  }
  // un vrai bouton, aussi dans les cartes dessinées par assets/app.js (même forme que bouton_favori() du robot)
  function bouton(id) {
    var on = est(id);
    return '<button type="button" class="an-fav" data-fav="' + E(id) + '" aria-pressed="' + on + '" aria-label="' + libelle(on) + '" title="' + libelle(on) + '">' + COEUR + "</button>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".an-fav[data-fav]");
    if (!b) return;
    e.preventDefault();
    var on = basculer(b.getAttribute("data-fav"), b.closest(".annonce"));
    b.classList.remove("fav-anim"); void b.offsetWidth; if (on) b.classList.add("fav-anim");
  });
  document.addEventListener("langue", maj);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", maj); else maj();
  window.FAVORIS = { cle: CLE, lire: lire, ecrire: ecrire, est: est, basculer: basculer, bouton: bouton, maj: maj, coeur: COEUR,
                     bloque: function () { lire(); return BLOQUE; } };
})();

(function () {
  var html = document.documentElement;
  var racine = html.getAttribute("data-racine") || "";
  // Mémoire du navigateur partagée entre les sites d'Ahmed : clé propre au site, valeur validée (fr ou ar)
  var langue = "fr";
  try {
    var m = localStorage.getItem("langue-immobilier");
    if (m === "fr" || m === "ar") langue = m;
    else if ((navigator.language || "").indexOf("ar") === 0) langue = "ar";
  } catch (e) {}
  var demande = new URLSearchParams(location.search).get("lang");
  if (demande === "ar" || demande === "fr") langue = demande;

  window.T = function (fr, ar) { return html.lang === "ar" ? ar : fr; };
  window.iso = function (t) { return "⁦" + t + "⁩"; };

  var ICO_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var ICO_PARTAGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  function cadre() {
    var e = document.getElementById("entete");
    // téléphone : l'en-tête est plein -> carte « Notre IA calcule pour vous » juste dessous (15/10/2026, demandes d'Ahmed :
    // montrer l'AVANTAGE de l'IA ; modèle B choisi, couleurs du modèle A) : titre -> ia/, 3 tuiles -> vendre/, louer/, investir/
    // 18/10/2026 (Ahmed, capture barrée : « dans la page d'accueil enlever la barre de progression ») : plus de carte IA sur l'accueil
    // (la recherche et le titre « notre modèle IA vous aide » suffisent) ; elle reste sur les autres pages
    var accueil = document.body && document.body.getAttribute("data-page") === "accueil";
    if (accueil && document.getElementById("barre-ia")) document.getElementById("barre-ia").remove();
    if (e && !accueil && !document.getElementById("barre-ia")) {      // 16/10/2026 : sur TOUTES les pages, ia/ comprise (demande d'Ahmed)
      var b = document.createElement("nav");
      b.id = "barre-ia"; b.className = "barre-ia";
      e.parentNode.insertBefore(b, e.nextSibling);
    }
    var bia = document.getElementById("barre-ia");
    if (bia) {
      bia.setAttribute("aria-label", T("Notre IA pour l’immobilier", "الذكاء الاصطناعي للعقار"));
      var nb = +(document.body && document.body.getAttribute("data-nb")) || 0;
      var milliers = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };   // 15 630
      var tuile = function (lien, fr, ar, sfr, sar) {
        return '<a class="ia-tuile" href="' + racine + lien + '"><b>' + T(fr, ar) + '</b><small>' + T(sfr, sar) + "</small></a>";
      };
      // « IA » dans le texte, en blanc dans un carré, comme dans les autres titres du site (demande d'Ahmed, 15/10/2026)
      bia.innerHTML = '<a class="ia-tete" href="' + racine + 'ia/"><span>' +
          T('Notre <span class="mot-ia">IA</span> met à jour les annonces et calcule :', '<span class="mot-ia">ذكاؤنا الاصطناعي</span> يحدّث الإعلانات ويحسب:') +
          '</span><span class="ia-fleche" aria-hidden="true">›</span></a>' +
        // 16/10/2026 (demande d'Ahmed) : barre qui avance + phrase qui change -> le visiteur comprend tout de suite que l'IA travaille
        // 16/10/2026 (Ahmed) : la phrase de l'étape est DANS la barre (impression d'un chargement) ; pas de pourcentage (retiré à sa demande)
        '<div class="ia-pensee" aria-hidden="true"><div class="ia-barre"><i></i><small class="ia-etape"></small></div></div>' +
        // 18/10/2026 (Ahmed : « ça sert à rien de faire les mêmes boutons deux fois ») : là où la recherche simple existe (onglets
        // Acheter / Louer / Estimer / Investir), les tuiles ne sont plus répétées ici
        (document.getElementById("recherche") ? "" :
        '<div class="ia-tuiles">' +
          // 16/10/2026 (Ahmed) : « Voir N annonces » (nombre mis à jour à chaque relevé, data-nb de la page) à côté du prix de vente ;
          // il remplace la carte « Voir les annonces : acheter ou louer » de l'accueil
          '<a class="ia-tuile ia-voir" id="ia-voir" href="' + (racine || "./") + '#liste"><b>' +
            (nb > 0 ? T("Voir " + milliers(nb), "شاهد " + milliers(nb)) : T("Voir les", "شاهد")) + "</b><small>" + T("annonces", "إعلانًا") + "</small></a>" +
          tuile("vendre/", "Prix de vente", "سعر البيع", "de votre bien", "لعقارك") +
          tuile("louer/", "Loyer", "الكراء", "pour votre bien", "لعقارك") +
          tuile("investir/", "Rendement", "المردود", "où investir", "أين تستثمر") +
        "</div>");
    }
    var etape = bia && bia.querySelector(".ia-etape");
    if (etape) {
      var etapes = [T("Lit les nouvelles annonces…", "يقرأ الإعلانات الجديدة…"), T("Compare les quartiers…", "يقارن الأحياء…"),
                    T("Calcule les prix et les loyers…", "يحسب الأسعار والكراء…"), T("Repère les bonnes affaires…", "يكتشف الفرص الجيدة…")];
      var ie = 0, barre = bia.querySelector(".ia-barre i"); etape.textContent = etapes[0];
      var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // 16/10/2026 (Ahmed) : la barre avance LENTEMENT, par petits bonds irréguliers avec des pauses, comme un calcul qui
      // réfléchit (jamais « une lumière qui passe ») ; au bout, l'étape suivante s'affiche et la barre repart de 0
      var pos = 0;
      var avancer = function () {
        if (!barre) return;
        if (pos >= 100) {                                  // étape finie : on la laisse pleine un instant, puis étape suivante
          setTimeout(function () {
            ie = (ie + 1) % etapes.length; etape.textContent = etapes[ie];
            pos = 0; barre.style.transition = "none"; barre.style.width = "0%"; void barre.offsetWidth; barre.style.transition = "";
            setTimeout(avancer, 500);
          }, 900);
          return;
        }
        pos = Math.min(100, pos + 4 + Math.random() * 11);            // bond de 4 à 15 %
        barre.style.width = pos + "%";
        setTimeout(avancer, 350 + Math.random() * 900);               // pause de 0,35 à 1,25 s (« réfléchit »)
      };
      if (!calme && !bia.getAttribute("data-anime")) { bia.setAttribute("data-anime", "1"); avancer(); }
    }
    if (e) e.innerHTML =
      '<div class="wrap">' +
        '<a class="logo" href="' + (racine || "./") + '"><img class="logo-mark" src="' + racine + 'assets/logo.svg" alt="" width="38" height="38">' +
          '<span class="logo-nom">' + T('Immobilier <span class="nom2">Tunisie <span class="logo-by">by</span><span class="mot-ia logo-ia">IA</span></span>', 'عقارات <span class="nom2">تونس <span class="logo-by">by</span><span class="mot-ia logo-ia">IA</span></span>') +
          '<small>' + T("Annonces gratuites · 24 gouvernorats", "إعلانات مجانية · 24 ولاية") + '</small></span></a>' +
        '<div class="entete-boutons">' +
          // bouton doré « IA pour l'immobilier » (15/10/2026, demande d'Ahmed) -> ia/ : vendre, louer votre bien, investir
          '<a class="entete-pass" href="' + racine + 'ia/" aria-label="' + T("IA pour l’immobilier : vendre, louer, investir", "الذكاء الاصطناعي للعقار: البيع، الكراء، الاستثمار") + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 10.5h5v3h-5z"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>' +
            '<span class="long">' + T('<span class="mot-ia">IA</span> pour l’immobilier', '<span class="mot-ia">الذكاء الاصطناعي</span> للعقار') + '</span></a>' +
          '<a class="entete-depot" href="' + racine + 'deposer/" aria-label="' + T("Publier une annonce gratuite", "انشر إعلانًا مجانيًا") + '">' + ICO_PLUS + '<span class="long">' + T("Publier une annonce gratuite", "انشر إعلانًا مجانيًا") + '</span><span class="court">' + T("Publier", "انشر") + '</span></a>' +
          // favoris (18/10/2026, IM.15) : cœur + nombre de favoris gardés dans ce téléphone -> favoris/
          '<a class="entete-fav" href="' + racine + 'favoris/" aria-label="' + T("Mes favoris", "مفضّلاتي") + '" title="' + T("Mes favoris", "مفضّلاتي") + '">' +
            (window.FAVORIS ? window.FAVORIS.coeur : "") + '<span class="long">' + T("Favoris", "المفضّلة") + '</span><span class="fav-compte" hidden></span></a>' +
          '<button class="partager" type="button" aria-label="' + T("Partager cette page", "شارك هذه الصفحة") + '" title="' + T("Partager", "شارك") + '">' + ICO_PARTAGE + '</button>' +
          // bouton court « ع » / « Fr » (demande d'Ahmed 11/10/2026 : plus de place pour le nom du site sur téléphone)
          '<button class="langue" type="button" lang="' + (html.lang === "ar" ? "fr" : "ar") + '" aria-label="' + T("Lire en arabe", "Lire en français") +
            '" title="' + T("العربية", "Français") + '">' + T("ع", "Fr") + '</button>' +
        '</div></div>';
    var p = document.getElementById("pied");
    var maj = document.body.getAttribute("data-maj") || "";
    var majTxt = maj ? maj.slice(8, 10) + "/" + maj.slice(5, 7) + "/" + maj.slice(0, 4) : "";
    if (p) p.innerHTML =
      '<div class="wrap">' +
        '<div class="pied-logo"><img src="' + racine + 'assets/logo.svg" alt="" width="26" height="26"> ' + T("Immobilier Tunisie", "عقارات تونس") + '</div>' +
        '<nav>' +
          '<a href="' + (racine || "./") + '">' + T("Toutes les annonces", "كل الإعلانات") + '</a>' +
          '<a href="' + racine + '#gouvernorats">' + T("Par gouvernorat", "حسب الولاية") + '</a>' +
          '<a href="' + racine + 'deposer/">' + T("Déposer une annonce gratuite", "انشر إعلانًا مجانيًا") + '</a>' +
          '<a href="' + racine + 'investir/">' + T("Où investir ? (rendement par quartier)", "أين تستثمر؟ (المردود حسب الحي)") + '</a>' +
          '<a href="' + racine + 'prix/">' + T("Carte des prix par quartier", "خريطة الأسعار حسب الحي") + '</a>' +
          '<a href="' + racine + 'rapports/">' + T("Rapports du mois (prix par quartier)", "تقارير الشهر (الأسعار حسب الحي)") + '</a>' +
          '<a href="' + racine + 'vendre/">' + T("Vendre : estimer mon bien (IA)", "البيع: قدّر عقاري (ذكاء اصطناعي)") + '</a>' +
          '<a href="' + racine + 'alertes/">' + T("Alertes gratuites", "تنبيهات مجانية") + '</a>' +
          '<a href="' + racine + 'favoris/">' + T("Mes favoris", "مفضّلاتي") + '</a>' +
          '<a href="' + racine + 'a-propos/">' + T("Comment fonctionne le site ?", "كيف يعمل الموقع؟") + '</a>' +
          '<a href="' + racine + '#avis">' + T("Votre avis", "رأيك") + '</a>' +
          '<a href="' + racine + 'video/">' + T("Vidéo de présentation", "الفيديو التقديمي") + '</a>' +
        '<a href="https://clicvia.com/" rel="noopener" target="_blank">' + T("Tous nos services", "كل خدماتنا") + '</a>' +
        '</nav>' +
        '<p>' + T("Annonces publiques de réseaux d’agences immobilières et annonces déposées sur le site. Seuls des faits sont repris (type, lieu, prix, surface, pièces, date), jamais les textes ; la photo s’affiche depuis le site d’origine, sans être copiée ; chaque annonce mène au vendeur.",
                  "إعلانات عمومية لشبكات وكالات عقارية وإعلانات منشورة على الموقع. نأخذ المعطيات فقط (النوع، المكان، السعر، المساحة، الغرف، التاريخ) دون النصوص؛ تظهر الصورة من الموقع الأصلي دون نسخها؛ كل إعلان يوصلك إلى البائع.") + '</p>' +
        (majTxt ? '<p>' + T("Dernière mise à jour : ", "آخر تحديث: ") + iso(majTxt) + '</p>' : "") +
        '<p>' + T("Site indépendant et non officiel, informations indicatives : vérifiez toujours auprès du vendeur. Les noms et marques appartiennent à leurs propriétaires.",
                  "موقع مستقل وغير رسمي، معلومات للإرشاد: تحقق دائمًا مع البائع. الأسماء والعلامات ملك لأصحابها.") + '</p>' +
        '<p>© 2026 ' + T("Immobilier Tunisie — tous droits réservés.", "عقارات تونس — جميع الحقوق محفوظة.") + '</p>' +
      '</div>';
    if (window.FAVORIS) window.FAVORIS.maj();
    var b = document.querySelectorAll(".langue");
    for (var i = 0; i < b.length; i++) b[i].addEventListener("click", function () { appliquer(html.lang === "ar" ? "fr" : "ar"); });
    var s = document.querySelectorAll(".partager");
    for (var k = 0; k < s.length; k++) s[k].addEventListener("click", partager);
    // bloc « Partager ce rapport » (18/10/2026, Ahmed) : clic compté par réseau ; « Copier le lien »
    // UN bouton « Partager ce rapport » : menu de partage du téléphone (Facebook, WhatsApp, LinkedIn…), sinon lien copié.
    // AUCUNE adresse dans le texte (18/10/2026, vu par Ahmed) : Facebook prenait « immobilier.clicvia.com » du texte et montrait l'accueil
    var r = document.querySelectorAll("button[data-partage-rapport]");
    for (var j = 0; j < r.length; j++) r[j].addEventListener("click", function () {
      var bouton = this, lien = bouton.getAttribute("data-partage-rapport"), titre = bouton.getAttribute("data-titre");
      var texte = titre + "\n" + T("Rapport du mois d’Immobilier Tunisie : ", "تقرير الشهر من عقارات تونس: ");
      try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "partage" + location.pathname, title: "Partage", event: true }); } catch (e) {}
      var fini = function () { bouton.classList.add("copie-ok"); setTimeout(function () { bouton.classList.remove("copie-ok"); }, 4000); };
      if (navigator.share) { navigator.share({ title: titre, text: texte, url: lien }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(texte + lien).then(fini, function () { window.prompt(T("Copiez le lien :", "انسخ الرابط:"), lien); }); }
      catch (e) { window.prompt(T("Copiez le lien :", "انسخ الرابط:"), lien); }
    });
  }

  // textes des listes déroulantes (data-fr / data-ar)
  function options() {
    var o = document.querySelectorAll("option[data-fr]");
    for (var i = 0; i < o.length; i++) o[i].textContent = o[i].getAttribute(html.lang === "ar" ? "data-ar" : "data-fr");
    var og = document.querySelectorAll("optgroup[data-fr]");    // titres des groupes (Habitation, Professionnel & industriel…)
    for (var k = 0; k < og.length; k++) og[k].label = og[k].getAttribute(html.lang === "ar" ? "data-ar" : "data-fr");
    var ph = document.querySelectorAll("[data-ph-fr]");      // textes d'exemple des cases (ex. « Où ? »)
    for (var j = 0; j < ph.length; j++) ph[j].placeholder = ph[j].getAttribute(html.lang === "ar" ? "data-ph-ar" : "data-ph-fr");
  }

  // robot Telegram (19/10/2026, Ahmed : « un message dans la langue du site, pas les deux ») : la langue de la page part avec le lien
  // (…?start=CODE_ar) ; le robot répond ensuite en arabe seulement. window.suffixeTG() : pour les liens fabriqués plus tard.
  window.suffixeTG = function () { return html.lang === "ar" ? "_ar" : ""; };
  function liensTelegram() {
    var a = document.querySelectorAll('a[href*="t.me/AlerteImmobilierTunisieBot?start="]');
    for (var i = 0; i < a.length; i++) a[i].href = a[i].getAttribute("href").replace(/_(ar|fr)$/, "") + window.suffixeTG();
  }
  window.liensTelegram = liensTelegram;
  // photo d'une annonce qui ne s'affiche pas (supprimée chez la source, site lent ou qui refuse) : elle est retirée et la carte montre
  // un dessin neutre, jamais une image cassée (19/10/2026). Écouteur global : la règle de sécurité interdit les « onerror » en ligne.
  document.addEventListener("error", function (e) {
    var im = e.target;
    if (!im || im.tagName !== "IMG" || !im.classList || !im.classList.contains("an-img")) return;
    var m = im.parentNode; im.remove();
    if (m) { m.classList.add("photo-ko"); var c = m.closest(".annonce"); if (c) c.classList.remove("a-photo"); }
  }, true);
  function appliquer(l) {
    html.lang = l; html.dir = l === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("langue-immobilier", l); } catch (e) {}
    cadre(); options(); liensTelegram();
    document.dispatchEvent(new Event("langue"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { appliquer(langue); });
  else appliquer(langue);

  // Partager : menu de partage du téléphone, sinon WhatsApp ; clic compté
  function partager() {
    var url = location.href.split("#")[0].replace(/[?&]lang=(fr|ar)/, "");
    var titre = document.title.split(" | ")[0];
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "partage" + location.pathname, title: "Partage", event: true }); } catch (e) {}
    var texte = titre + "\n" + T("Annonces immobilières gratuites en Tunisie : ", "إعلانات عقارية مجانية في تونس: ");
    if (document.body.getAttribute("data-page") === "rapport")  // rapports du mois (18/10/2026) : on dit d'où vient l'article
      texte = titre + "\n" + T("Rapport du mois d’Immobilier Tunisie : ", "تقرير الشهر من عقارات تونس: ");
    if (document.body.getAttribute("data-page") === "video")   // page vidéo : lien de la vidéo + adresse du site
      texte = T("Immobilier Tunisie, la vidéo de présentation. Le site : https://immobilier.clicvia.com/\nLa vidéo : ",
                "عقارات تونس، الفيديو التقديمي. الموقع: https://immobilier.clicvia.com/\nالفيديو: ");
    if (navigator.share) {
      navigator.share({ title: titre, text: texte, url: url }).catch(function () {});
    } else {
      window.open("https://wa.me/?text=" + encodeURIComponent(texte + url), "_blank", "noopener");
    }
  }

  // Bandeau des 4 thèmes (accueil) : sur téléphone, les photos défilent seules de droite à gauche (CSS « themes-defile ») ;
  // on double les 4 photos pour que la boucle soit continue (les copies sont cachées aux lecteurs d'écran et sur ordinateur)
  function bandeauThemes() {
    var ul = document.querySelector(".bande-themes ul");
    if (!ul || ul.querySelector(".copie")) return;
    [].slice.call(ul.children).forEach(function (li) {
      var c = li.cloneNode(true); c.className = "copie"; c.setAttribute("aria-hidden", "true");
      var im = c.querySelector("img"); if (im) im.setAttribute("loading", "lazy");
      ul.appendChild(c);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bandeauThemes); else bandeauThemes();

  // Partager UNE annonce (19/10/2026, Ahmed : un ami voulait envoyer une annonce à sa femme) : menu de partage du téléphone
  // (WhatsApp, Messenger, SMS…), sinon lien copié, sinon WhatsApp. Le lien ouvre notre page du gouvernorat sur l'annonce (?a=<id>).
  window.idPartage = function (i) { return String(i).replace(/[^a-z0-9-]/g, function (c) { return "-x" + c.charCodeAt(0).toString(16) + "-"; }); };   // = id_partage() du robot (jamais deux annonces sur la même page)
  function texteVisible(el) {
    if (!el) return "";
    var s = el.querySelector('[data-l="' + html.lang + '"]');
    return (s || el).textContent.replace(/\s+/g, " ").trim();
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".an-partage[data-partage]");
    if (!b) return;
    e.preventDefault();
    var c = b.closest(".annonce"), id = b.getAttribute("data-partage"), g = b.getAttribute("data-g");
    // page de partage de l'annonce (annonce/<id>/, 19/10/2026) : l'aperçu WhatsApp / Facebook montre SA photo, son titre et son prix,
    // puis elle ouvre la page du gouvernorat sur l'annonce
    var lien = new URL(racine + "annonce/" + window.idPartage(id) + "/", location.href).href;
    var titre = texteVisible(c && c.querySelector(".an-titre")) || document.title;
    var fort = c && c.querySelector(".an-prix strong"), prix = fort ? fort.textContent.trim() + "\u00a0DT" : "";
    // 19/10/2026 (Ahmed : « est-ce important d'avoir ces lignes ? ») : l'aperçu du lien montre déjà photo, titre, prix et lieu ;
    // le message ne répète rien (seulement le lien) ; titre + prix gardés pour la copie du lien (ordinateur, SMS)
    var texte = titre + (prix ? " — " + prix : "") + "\n";
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "partage/annonce", title: "Partage d'une annonce", event: true }); } catch (x) {}
    var wa = function () { window.open("https://wa.me/?text=" + encodeURIComponent(texte + lien), "_blank", "noopener"); };
    if (navigator.share) { navigator.share({ title: titre, url: lien }).catch(function () {}); return; }
    try {
      navigator.clipboard.writeText(texte + lien).then(function () {
        b.classList.add("copie-ok"); b.title = T("Lien copié", "تم نسخ الرابط");
        setTimeout(function () { b.classList.remove("copie-ok"); b.title = T("Partager l’annonce", "شارك الإعلان"); }, 3000);
      }, wa);
    } catch (x) { wa(); }
  });

  // Numéro révélé au clic : 1er clic = le numéro s'affiche (compté), 2e clic = appel
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest(".an-appel");
    if (!a || a.classList.contains("revele")) return;
    e.preventDefault();
    a.classList.add("revele");
    a.textContent = a.getAttribute("data-num");
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "appel" + location.pathname, title: "Numéro affiché", event: true }); } catch (x) {}
  });

  // Annonce déposée chez nous : « Afficher le numéro » -> Appeler + WhatsApp (compté)
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".an-numero");
    if (!b) return;
    var bloc = b.closest(".an-numero-bloc"), act = bloc && bloc.querySelector(".an-actions");
    if (!act) return;
    b.hidden = true; act.hidden = false;
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "appel" + location.pathname, title: "Numéro affiché", event: true }); } catch (x) {}
  });

  // ---- Protection légère contre la copie (sans gêner les visiteurs) ----
  try {
    if (window.top !== window.self && window.top.location.hostname !== location.hostname) window.top.location = location.href;
  } catch (e) { try { window.top.location = location.href; } catch (e2) {} }
  function estImage(t) { return t && t.closest && t.closest("img, svg, .bande-photo, .carte-tn"); }
  document.addEventListener("contextmenu", function (e) { if (estImage(e.target) && !e.target.closest("a, input, textarea, select")) e.preventDefault(); });
  document.addEventListener("dragstart", function (e) { if (estImage(e.target)) e.preventDefault(); });
  document.addEventListener("copy", function (e) {
    var sel = window.getSelection ? String(window.getSelection()) : "";
    var n = window.getSelection && window.getSelection().anchorNode;
    var el = n && (n.nodeType === 1 ? n : n.parentElement);
    if (!sel || !el || !el.closest || !el.closest("main") || el.closest("input, textarea") || !e.clipboardData) return;
    e.clipboardData.setData("text/plain", sel + "\n\nSource : " + location.href.split("#")[0] + " — © Immobilier Tunisie, tous droits réservés.");
    e.preventDefault();
  });
})();

/* Listes longues (15/10/2026, Ahmed : « 10 par défaut, les autres compactes » ; « trier par moins cher, plus pertinent ou meilleur
   rendement ») : window.limiter(liste) laisse 10 lignes visibles et ajoute « Voir les N autres » ; <select data-trier="id"> trie les
   lignes par leur data-pert / data-prix / data-rdt. Et un lien vers une carte repliée (#pass…) l'ouvre. */
(function () {
  // 15/10/2026 (Ahmed) : chaque clic montre les 10 suivantes ; quand tout est affiché, le bouton « Réduire la liste » revient aux 10 premières
  function montrer(c) {
    var items = [].slice.call(c.children), pas = parseInt(c.getAttribute("data-limite"), 10) || 10;
    c._vis = Math.min(items.length, Math.max(pas, c._vis || pas));
    items.forEach(function (x, i) { x.classList.toggle("en-plus", i >= c._vis); });
    c._plus = items.length - c._vis;
    c._total = items.length;
  }
  function texte(b, c) {
    var pas = parseInt(c.getAttribute("data-limite"), 10) || 10;
    b.hidden = (c._total || 0) <= pas;
    b.textContent = c._plus > 0 ? T("▼ Voir " + Math.min(pas, c._plus) + " de plus (" + c._plus + " restantes)", "▼ شاهد " + Math.min(pas, c._plus) + " أخرى (" + c._plus + " متبقية)")
                                : T("▲ Réduire la liste", "▲ تصغير القائمة");
  }
  window.limiter = function (c, n) {
    if (!c) return;
    n = n || parseInt(c.getAttribute("data-limite"), 10) || 10;
    c.setAttribute("data-limite", n);
    c._vis = n;
    montrer(c);
    var ancre = (c.closest && c.closest(".inv-tableau")) || c, b = c._bouton;
    if (!b) {
      b = document.createElement("button");
      b.type = "button"; b.className = "voir-plus";
      ancre.parentNode.insertBefore(b, ancre.nextSibling);
      b.addEventListener("click", function () {
        var pas = parseInt(c.getAttribute("data-limite"), 10) || 10;
        if (c._plus > 0) c._vis += pas;
        else { c._vis = pas; try { ancre.scrollIntoView({block: "start"}); } catch (e) { /* ancien navigateur */ } }
        montrer(c); texte(b, c);
      });
      c._bouton = b;
    }
    texte(b, c);
  };
  window.trier = function (c, cle, sens) {
    if (!c) return;
    var v = function (x) { var a = parseFloat(x.getAttribute("data-" + cle)); return isFinite(a) ? a : null; };
    [].slice.call(c.children).map(function (x, i) { return { x: x, v: v(x), i: i }; })
      .sort(function (a, b) {                      // sans valeur (ex. terrain sans rendement) : à la fin
        if (a.v === null || b.v === null) return (a.v === null) - (b.v === null) || a.i - b.i;
        return (sens === "asc" ? a.v - b.v : b.v - a.v) || a.i - b.i;
      })
      .forEach(function (o) { c.appendChild(o.x); });
    window.limiter(c);
  };
  document.addEventListener("change", function (e) {
    var s = e.target;
    if (!s.getAttribute || !s.getAttribute("data-trier")) return;
    var o = s.options[s.selectedIndex];
    window.trier(document.getElementById(s.getAttribute("data-trier")), s.value, o.getAttribute("data-sens"));
  });
  document.addEventListener("langue", function () {
    [].forEach.call(document.querySelectorAll("[data-limite]"), function (c) { if (c._bouton) texte(c._bouton, c); });
  });
  function ouvrirCible(id) {
    var t = id && document.getElementById(id);
    var d = t && (t.matches && t.matches("details.pliable") ? t : t.querySelector && t.querySelector(":scope > details.pliable"));
    if (d) d.open = true;
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) ouvrirCible(a.getAttribute("href").slice(1));
  });
  function depart() {
    [].forEach.call(document.querySelectorAll("[data-limite]"), function (c) { window.limiter(c); });
    if (location.hash) ouvrirCible(location.hash.slice(1));
    // lien « Voir les annonces » de la carte (#liste, 15/10/2026, Ahmed : « on doit voir directement les annonces ») : la carte et la
    // recherche se dessinent après le chargement et décalent la page -> on revient sur la liste une fois tout dessiné
    if (location.hash === "#liste") setTimeout(function () { var l = document.getElementById("liste"); if (l) l.scrollIntoView(); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", depart); else depart();
})();

/* Installation sur le téléphone : service worker PRUDENT (réseau d'abord). Seulement en https. */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", function () {
    try { navigator.serviceWorker.register(BASE_SITE + "sw.js", { scope: BASE_SITE }).catch(function () {}); } catch (e) {}
  });
}

// ------------------------------------------------------------------ listes en couleurs (19/10/2026, Ahmed : Type de bien, puis toutes)
// La liste native du téléphone ignore les couleurs : pour les <select data-joli>, notre propre liste s'ouvre à la place
// (catégories en bandeau bleu, types en blanc). La liste native reste dans la page (cachée) : la recherche, les alertes et les
// liens lisent toujours sa valeur ; un choix ici change sa valeur et déclenche « change ».
(function () {
  function joli(sel) {
    if (sel.getAttribute("data-joli-fait")) return;
    sel.setAttribute("data-joli-fait", "1");
    sel.classList.add("sj-cache");
    sel.setAttribute("tabindex", "-1");
    sel.setAttribute("aria-hidden", "true");
    var bloc = document.createElement("div"); bloc.className = "sj";
    var bouton = document.createElement("button"); bouton.type = "button"; bouton.className = "sj-bouton"; bouton.setAttribute("aria-haspopup", "listbox"); bouton.setAttribute("aria-expanded", "false");
    var panneau = document.createElement("div"); panneau.className = "sj-panneau"; panneau.setAttribute("role", "listbox"); panneau.hidden = true;
    bloc.appendChild(bouton); bloc.appendChild(panneau);
    sel.parentNode.insertBefore(bloc, sel.nextSibling);
    function texte() {
      var o = sel.options[sel.selectedIndex], t = o ? o.textContent : "";
      if (bouton.textContent !== t) bouton.textContent = t;
      bouton.disabled = sel.disabled;                                  // « Choisissez d'abord la délégation » : grisée comme avant
      if (sel.disabled && !panneau.hidden) fermer();
    }
    function fermer() { panneau.hidden = true; bouton.setAttribute("aria-expanded", "false"); }
    function choisir(v) {
      if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true })); sel.dispatchEvent(new Event("input", { bubbles: true })); }
      texte(); fermer(); bouton.focus();
    }
    function remplir() {
      panneau.innerHTML = "";
      [].forEach.call(sel.children, function (x) {
        if (x.tagName === "OPTGROUP") {
          var t = document.createElement("div"); t.className = "sj-groupe"; t.textContent = x.label; panneau.appendChild(t);
          [].forEach.call(x.children, function (o) { ajouter(o, true); });
        } else ajouter(x, false);
      });
    }
    function ajouter(o, dansGroupe) {
      if (o.disabled || o.hidden) return;
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "option");
      var plat = !dansGroupe && o.value !== "" && !sel.querySelector("optgroup");   // liste sans catégories : lignes normales
      b.className = "sj-choix" + (dansGroupe ? " sj-dans" : "") + (plat ? " sj-plat" : "") + (o.value === sel.value ? " actif" : "");
      b.setAttribute("aria-selected", o.value === sel.value ? "true" : "false");
      b.textContent = o.textContent; b.setAttribute("data-v", o.value);
      b.addEventListener("click", function () { choisir(o.value); });
      panneau.appendChild(b);
    }
    bouton.addEventListener("click", function () {
      if (!panneau.hidden) { fermer(); return; }
      if (sel.disabled) return;
      remplir();
      var r = bloc.getBoundingClientRect();                            // liste à droite de l'écran : elle s'ouvre vers la gauche
      bloc.classList.toggle("sj-droite", r.left > (window.innerWidth || 400) / 2);
      panneau.hidden = false; bouton.setAttribute("aria-expanded", "true");
      var a = panneau.querySelector(".actif"); if (a && a.scrollIntoView) a.scrollIntoView({ block: "nearest" });
    });
    document.addEventListener("click", function (e) { if (!bloc.contains(e.target)) fermer(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer(); });
    sel.addEventListener("change", texte);
    if (window.MutationObserver) new MutationObserver(texte).observe(sel, { attributes: true, attributeFilter: ["disabled"], childList: true, subtree: true });
    if (sel.form) sel.form.addEventListener("reset", function () { setTimeout(texte, 0); });
    texte();
    setInterval(texte, 800);   // valeur changée par le programme (adresse, langue, bouton Effacer) : le bouton suit
  }
  // 19/10/2026 (Ahmed : « fais cette amélioration pour les autres filtres ») : toutes les listes du site (sauf data-joli="non")
  function tous() { [].forEach.call(document.querySelectorAll('select:not([data-joli="non"])'), joli); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tous); else tous();
})();

/* RÈGLE COMMUNE DES CHAMPS SELON LE TYPE DE BIEN (18/10/2026, capture d'Ahmed : « Pièces S+1… S+5 » proposées pour un local
   commercial dans la recherche, alors que la page Estimer les cachait). UNE seule règle pour TOUS les formulaires du site
   (recherche, alerte, dépôt, Estimer, Louer, Investir) : un champ marqué data-champ="…" n'apparaît que pour les types de CHAMPS_TYPE ;
   caché, sa valeur est effacée (un filtre caché ne filtre jamais). Le type de bien du formulaire est marqué data-type-bien.
   Même liste dans robot/modele_ia.py (TYPES_PIECES) : test croisé dans tools/test_site.mjs. */
(function () {
  var CHAMPS_TYPE = { pieces: ["", "appartement", "maison"] };          // "" = « Tous les biens »
  function utile(champ, type) { var l = CHAMPS_TYPE[champ]; return !l || l.indexOf(type || "") >= 0; }
  function appliquer(form) {
    if (!form || !form.querySelector) return;
    var sel = form.querySelector("[data-type-bien]");
    if (!sel) return;
    [].forEach.call(form.querySelectorAll("[data-champ]"), function (b) {
      var ok = utile(b.getAttribute("data-champ"), sel.value);
      b.hidden = !ok;
      if (!ok) [].forEach.call(b.querySelectorAll("select, input"), function (x) {
        if (x.value !== "") { x.value = ""; try { x.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {} }
      });
    });
  }
  window.CHAMPS_TYPE = CHAMPS_TYPE;
  window.champUtile = utile;
  window.appliquerChamps = appliquer;
  // phase de capture : le champ est effacé AVANT que le formulaire ne recalcule ses résultats
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches("[data-type-bien]")) appliquer(t.form || (t.closest && t.closest("form")));
  }, true);
  function tous() { [].forEach.call(document.querySelectorAll("form"), appliquer); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tous); else tous();
})();
