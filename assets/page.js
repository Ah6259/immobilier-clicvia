/* Immobilier Tunisie — script commun à toutes les pages : langue (FR / AR), en-tête et pied de page, partage,
   numéros révélés au clic, protection légère contre la copie, service worker prudent, statistiques GoatCounter.
   Aucun script en ligne dans les pages (CSP). */
/* Adresse : immobilier.clicvia.com (racine « / ») ; secours ah6259.github.io/immobilier-tunis/.
   GoatCounter (compteur commun à tous les sites d'Ahmed) : préfixe /immobilier-tunis (nom du dépôt). */
var BASE_SITE = /\.github\.io$/.test(location.hostname) ? "/immobilier-tunis/" : "/";
window.goatcounter = window.goatcounter || {};
window.goatcounter.path = function (p) { return BASE_SITE === "/" ? "/immobilier-tunis" + p : p; };   // préfixe = nom du dépôt (lien du tableau de bord GoatCounter → clicvia.com/immobilier-tunis/… → site)

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
    if (e && !document.getElementById("barre-ia")) {      // 16/10/2026 : sur TOUTES les pages, ia/ comprise (demande d'Ahmed)
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
        '<div class="ia-tuiles">' +
          // 16/10/2026 (Ahmed) : « Voir N annonces » (nombre mis à jour à chaque relevé, data-nb de la page) à côté du prix de vente ;
          // il remplace la carte « Voir les annonces : acheter ou louer » de l'accueil
          '<a class="ia-tuile ia-voir" id="ia-voir" href="' + (racine || "./") + '#liste"><b>' +
            (nb > 0 ? T("Voir " + milliers(nb), "شاهد " + milliers(nb)) : T("Voir les", "شاهد")) + "</b><small>" + T("annonces", "إعلانًا") + "</small></a>" +
          tuile("vendre/", "Prix de vente", "سعر البيع", "de votre bien", "لعقارك") +
          tuile("louer/", "Loyer", "الكراء", "pour votre bien", "لعقارك") +
          tuile("investir/", "Rendement", "المردود", "où investir", "أين تستثمر") +
        "</div>";
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
          '<a href="' + racine + 'vendre/">' + T("Vendre : estimer mon bien (IA)", "البيع: قدّر عقاري (ذكاء اصطناعي)") + '</a>' +
          '<a href="' + racine + 'alertes/">' + T("Alertes gratuites", "تنبيهات مجانية") + '</a>' +
          '<a href="' + racine + 'a-propos/">' + T("À propos et méthode", "من نحن والمنهجية") + '</a>' +
          '<a href="' + racine + '#avis">' + T("Votre avis", "رأيك") + '</a>' +
          '<a href="' + racine + 'video/">' + T("Vidéo de présentation", "الفيديو التقديمي") + '</a>' +
        '<a href="https://clicvia.com/" rel="noopener" target="_blank">' + T("Tous nos services", "كل خدماتنا") + '</a>' +
        '</nav>' +
        '<p>' + T("Annonces publiques de réseaux d’agences immobilières et annonces déposées sur le site. Seuls des faits sont repris (type, lieu, prix, surface, pièces, date), jamais les textes ni les photos ; chaque annonce mène au vendeur.",
                  "إعلانات عمومية لشبكات وكالات عقارية وإعلانات منشورة على الموقع. نأخذ المعطيات فقط (النوع، المكان، السعر، المساحة، الغرف، التاريخ) دون النصوص أو الصور؛ كل إعلان يوصلك إلى البائع.") + '</p>' +
        (majTxt ? '<p>' + T("Dernière mise à jour : ", "آخر تحديث: ") + iso(majTxt) + '</p>' : "") +
        '<p>' + T("Site indépendant et non officiel, informations indicatives : vérifiez toujours auprès du vendeur. Les noms et marques appartiennent à leurs propriétaires.",
                  "موقع مستقل وغير رسمي، معلومات للإرشاد: تحقق دائمًا مع البائع. الأسماء والعلامات ملك لأصحابها.") + '</p>' +
        '<p>© 2026 ' + T("Immobilier Tunisie — tous droits réservés.", "عقارات تونس — جميع الحقوق محفوظة.") + '</p>' +
        // crédits des 4 photos du bandeau de l'accueil (licences CC : auteur + licence ; déplacés ici le 11/10/2026, demande d'Ahmed)
        '<p class="pied-credits">' + T("Photos de l’accueil (Wikimedia Commons) : ", "صور الصفحة الرئيسية (ويكيميديا كومنز): ") +
          [["Belle_villa_hammam_chatt_tunisie_-_panoramio.jpg", "oulad ali abdelrazak", "CC BY-SA 3.0"], ["QuatierLac1_TunisSep2012.jpg", "Citizen59", "CC BY 3.0"],
           ["PortRades_2.jpg", "Citizen59", "CC BY-SA 3.0"], ["Cap_Bon_olive_groves.JPG", "Nicholas.gosse", "CC BY-SA 4.0"]].map(function (x) {
            return '<a href="https://commons.wikimedia.org/wiki/File:' + x[0] + '" rel="noopener" target="_blank">' + x[1] + '</a> (' + x[2] + ')';
          }).join(" · ") + '</p>' +
      '</div>';
    var b = document.querySelectorAll(".langue");
    for (var i = 0; i < b.length; i++) b[i].addEventListener("click", function () { appliquer(html.lang === "ar" ? "fr" : "ar"); });
    var s = document.querySelectorAll(".partager");
    for (var k = 0; k < s.length; k++) s[k].addEventListener("click", partager);
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

  function appliquer(l) {
    html.lang = l; html.dir = l === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("langue-immobilier", l); } catch (e) {}
    cadre(); options();
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
