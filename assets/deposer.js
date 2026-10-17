/* Page « Déposer une annonce » : formulaire sans compte (OUVERT depuis le 11/10/2026).
   ===========================================================================================
   Envoi : DEPOT_URL = adresse formResponse du Google Forms d'Ahmed ; CHAMPS = ses « entry.xxxx ».
   Publication : le robot depots.yml (toutes les 2 h, 8h-22h) lit l'onglet « public » de la feuille des réponses
   (robot/sources/depot.py : seulement les champs publics, jamais l'e-mail, l'adresse ni le portable ;
   téléphone seulement si la case « afficher » est cochée), vérifie automatiquement, puis publie.
   Pour refermer : DEPOT_URL = "" (formulaire grisé + tampon).
   =========================================================================================== */
(function () {
  var DEPOT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdhNqzJAdS4E-AoDvGcNGBekD6zG7tukOap45e-_jrrU-0t8A/formResponse";
  var CHAMPS = {        // formulaire Google « Déposer une annonce immobilière » d'Ahmed (11/10/2026), vérifié question par question
    transaction: "entry.1665857967",
    type: "entry.1891495509",
    gouvernorat: "entry.1027045496",
    lieu: "entry.1948710513",
    localite: "entry.1034495434",
    adresse: "entry.1529880973",
    prix: "entry.1546241375",
    surface: "entry.1538973856",
    chambres: "entry.18722396",
    titre: "entry.1418331249",
    description: "entry.407043762",
    validite: "entry.1120560717",
    nom: "entry.281442375",
    email: "entry.2093677416",
    telephone: "entry.2033466928",
    portable: "entry.688145880",
    afficher_telephone: "entry.143232233",
    conditions: "entry.577105725",
    ref: "entry.632197041"
  };
  var T = function (fr, ar) { return document.documentElement.lang === "ar" ? ar : fr; };
  var AUTRE = "__autre__";
  function E(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function slug(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function opt(v, fr, ar) { return '<option value="' + E(v) + '">' + E(fr) + (ar ? " · " + E(ar) : "") + '</option>'; }

  // Gouvernorat -> délégations -> localités (window.DECOUPAGE, donnees/decoupage.js, liste de La Poste), comme sur Tunisie-annonce
  function delegations(form) {
    var D = window.DECOUPAGE || {}, g = form.querySelector('[name="gouvernorat"]').value, sel = form.querySelector('[name="lieu"]');
    var liste = D[g] || [];
    sel.innerHTML = '<option value="">' + (g ? T("— Choisissez —", "— اختر —") : T("Choisissez d’abord le gouvernorat", "اختر الولاية أولًا")) + '</option>' +
      liste.map(function (d) { return opt(d[0], d[0], d[1]); }).join("");
    sel.disabled = !liste.length;
    localites(form);
  }
  function localites(form) {
    var D = window.DECOUPAGE || {}, g = form.querySelector('[name="gouvernorat"]').value, d = form.querySelector('[name="lieu"]').value;
    var sel = form.querySelector('[name="localite"]'), autre = form.querySelector('[name="localite_autre"]');
    var deleg = (D[g] || []).filter(function (x) { return x[0] === d; })[0];
    sel.innerHTML = '<option value="">' + (deleg ? T("— Non précisée —", "— غير محددة —") : T("Choisissez d’abord la délégation", "اختر المعتمدية أولًا")) + '</option>' +
      (deleg ? deleg[2].map(function (l) { return opt(l[0], l[0], l[1]); }).join("") + opt(AUTRE, T("Autre (à écrire)", "أخرى (اكتبها)"), "") : "");
    sel.disabled = !deleg;
    if (autre) { autre.hidden = true; autre.value = ""; }
  }
  // lien « Vous êtes le vendeur ? » : ?l=<slug> -> délégation (ou localité) du gouvernorat choisi
  function choisirLieu(form, l) {
    var D = window.DECOUPAGE || {}, g = form.querySelector('[name="gouvernorat"]').value;
    (D[g] || []).some(function (d) {
      if (slug(d[0]) === l) { form.querySelector('[name="lieu"]').value = d[0]; localites(form); return true; }
      var loc = d[2].filter(function (x) { return slug(x[0]) === l; })[0];
      if (loc) { form.querySelector('[name="lieu"]').value = d[0]; localites(form); form.querySelector('[name="localite"]').value = loc[0]; return true; }
      return false;
    });
  }

  // titre fait tout seul pour un lien Facebook : « Appartement S+2 à louer — Ennasr »
  function titreFb(form) {
    var v = function (n) { var c = form.querySelector('[name="' + n + '"]:checked') || form.querySelector('[name="' + n + '"]'); return c ? c.value : ""; };
    var ty = form.querySelector('[name="type"]'), tyt = ty && ty.selectedOptions && ty.selectedOptions[0] ? ty.selectedOptions[0].textContent.split(" · ")[0] : "Bien";
    var ch = v("chambres"), tr = v("transaction"), lieu = v("localite") && v("localite") !== AUTRE ? v("localite") : v("lieu");
    return (tyt + (ch !== "" && /^\d+$/.test(ch) ? " S+" + ch : "") + (tr === "vente" ? " à vendre" : " à louer") + (lieu ? " — " + lieu : "")).slice(0, 70);
  }

  function demarrer() {
    var form = document.getElementById("depot-form");
    if (!form) return;
    // pré-remplissage depuis une annonce reprise (« Vous êtes le vendeur ? Ajoutez votre numéro »)
    var q = new URLSearchParams(location.search);
    var regle = { t: "transaction", y: "type", g: "gouvernorat" };
    Object.keys(regle).forEach(function (k) {
      var v = q.get(k); if (!v) return;
      if (k === "t") v = { v: "vente", l: "location" }[v] || v;
      var c = form.querySelectorAll('[name="' + regle[k] + '"]');
      for (var i = 0; i < c.length; i++) {
        if (c[i].type === "radio") c[i].checked = c[i].value === v; else if (/^[a-z-]+$/.test(v)) c[i].value = v;
      }
    });
    // champ libre « Autre localité » (affiché seulement si « Autre » est choisi)
    var selLoc = form.querySelector('[name="localite"]');
    var autre = document.createElement("input");
    autre.name = "localite_autre"; autre.maxLength = 60; autre.hidden = true; autre.className = "localite-autre";
    autre.placeholder = T("Écrivez la localité", "اكتب المنطقة"); autre.setAttribute("aria-label", T("Autre localité", "منطقة أخرى"));
    selLoc.parentNode.appendChild(autre);
    form.addEventListener("change", function (e) {
      if (e.target.name === "gouvernorat") delegations(form);
      else if (e.target.name === "lieu") localites(form);
      else if (e.target.name === "localite") { autre.hidden = e.target.value !== AUTRE; autre.required = !autre.hidden; if (!autre.hidden) autre.focus(); }
    });
    delegations(form);
    if (q.get("l") && /^[a-z0-9-]{2,60}$/.test(q.get("l"))) choisirLieu(form, q.get("l"));
    // annonce préparée par le Pass Propriétaire (vendre/ et louer/, 15/10/2026) : titre, texte, prix, surface, pièces ;
    // av = jeton de la mise en avant (8 caractères), ajouté à la fin du texte envoyé (« #avant-… », retiré par robot/sources/depot.py)
    [["ti", "titre", 70], ["de", "description", 1100], ["px", "prix", 12], ["s", "surface", 6], ["c", "chambres", 2]].forEach(function (x) {
      var v = q.get(x[0]), c = form.querySelector('[name="' + x[1] + '"]');
      if (!v || !c) return;
      v = v.slice(0, x[2]);
      if (c.tagName === "SELECT") { if ([].some.call(c.options, function (o) { return o.value === v; })) c.value = v; }
      else if (c.type !== "number" || /^\d+$/.test(v)) c.value = v;
    });
    var avant = /^[0-9a-f]{8}$/.test(q.get("av") || "") ? q.get("av") : "";
    if (avant) {
      var note = document.createElement("p");
      note.className = "depot-avant";
      note.textContent = T("⭐ Pass Propriétaire : cette annonce sera MISE EN AVANT (en tête des annonces de votre quartier) pendant votre Pass.",
                           "⭐ باس المالك: سيكون هذا الإعلان مميّزًا (في أعلى إعلانات حيّك) طوال مدة باسك.");
      form.insertBefore(note, form.firstChild);
    }
    if (q.get("ref") && /^[a-z]{2}-[\w-]{1,40}$/.test(q.get("ref"))) {
      var h = document.createElement("input"); h.type = "hidden"; h.name = "ref"; h.value = q.get("ref"); form.appendChild(h);
    }
    // MODE « Ajouter un lien Facebook » (18/10/2026, demande d'Ahmed) : deposer/?fb=1. Ahmed colle le lien d'une annonce vue sur
    // Facebook et tape les faits (prix, lieu, type) ; rien n'est lu sur Facebook. Pas de nom, d'e-mail ni de numéro : le visiteur
    // les verra sur Facebook (bouton « Voir l'annonce sur Facebook »). Le lien part à la fin du texte (« #fb:… », robot/sources/depot.py).
    var fb = q.get("fb") === "1" ? document.createElement("input") : null;
    if (fb) {
      fb.name = "lien_facebook"; fb.type = "url"; fb.required = true; fb.maxLength = 220; fb.className = "lien-facebook";
      fb.pattern = "https://(www\\.|m\\.|web\\.)?facebook\\.com/.+";
      fb.placeholder = "https://www.facebook.com/…";
      var lab = document.createElement("label"); lab.className = "champ champ-fb";
      lab.innerHTML = "<span>" + T("Lien de l’annonce sur Facebook", "رابط الإعلان على فيسبوك") + "</span>";
      lab.appendChild(fb);
      var aide = document.createElement("p"); aide.className = "depot-fb";
      aide.textContent = T("📘 Ajouter une annonce vue sur Facebook : collez son lien, puis le prix, le lieu et le type. Le site montrera « Voir l’annonce sur Facebook » ; aucun nom ni numéro n’est copié. Prix total pour une vente, par mois pour une location, par nuit pour une location de vacances.",
                           "📘 إضافة إعلان شاهدته على فيسبوك: الصق الرابط، ثم السعر والمكان والنوع. سيعرض الموقع « عرض الإعلان على فيسبوك »؛ لا يُنسخ أي اسم أو رقم.");
      form.insertBefore(lab, form.firstChild); form.insertBefore(aide, form.firstChild);
      ["nom", "email", "telephone", "portable", "adresse", "afficher_telephone"].forEach(function (n) {
        var c = form.querySelector('[name="' + n + '"]'); if (!c) return;
        c.required = false; c.value = n === "email" ? "facebook@immobilier.clicvia.com" : "";
        var l = c.closest("label") || c.parentNode; if (l) l.hidden = true;
      });
      var cond = form.querySelector('[name="conditions"]'); if (cond) { cond.checked = true; }
      var ti = form.querySelector('[name="titre"]'); if (ti) { ti.required = false; ti.placeholder = T("(facultatif : fait tout seul)", "(اختياري)"); }
    }
    var ouvert = !!DEPOT_URL;
    document.getElementById("depot-champs").disabled = !ouvert;
    var tampon = document.getElementById("tampon-depot"); if (tampon) tampon.hidden = ouvert;
    var statut = document.getElementById("depot-statut");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!ouvert) return;
      if (!form.checkValidity()) { statut.textContent = T("Vérifiez les champs obligatoires.", "تحقق من الخانات الإجبارية."); return; }
      var d = new FormData();
      Object.keys(CHAMPS).forEach(function (k) {
        var c = form.querySelector('[name="' + k + '"]' + "");
        if (!c || !CHAMPS[k]) return;
        if (c.type === "checkbox") { if (c.checked) d.append(CHAMPS[k], c.value); }
        else if (k === "localite" && c.value === AUTRE) d.append(CHAMPS[k], autre.value.trim());
        else if (k === "description" && fb) d.append(CHAMPS[k], c.value.trim() + "\n#fb:" + fb.value.trim());
        else if (k === "titre" && fb && c.value.trim().length < 5) d.append(CHAMPS[k], titreFb(form));
        else if (k === "email" && fb) d.append(CHAMPS[k], "facebook@immobilier.clicvia.com");
        else if (k === "description" && avant) d.append(CHAMPS[k], c.value.trim() + "\n#avant-" + avant);
        else d.append(CHAMPS[k], c.value);
      });
      statut.textContent = T("Envoi…", "جارٍ الإرسال…");
      fetch(DEPOT_URL, { method: "POST", mode: "no-cors", body: d }).then(function () {
        form.reset();
        delegations(form);
        statut.textContent = T("Merci ! Votre annonce est bien reçue : elle sera en ligne dans environ 2 heures, après vérification automatique.",
                               "شكرًا! وصلنا إعلانك: سيُنشر في حوالي ساعتين بعد التحقق الآلي.");
      }, function () { statut.textContent = T("Échec de l’envoi : vérifiez votre connexion.", "تعذّر الإرسال: تحقق من الاتصال."); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
