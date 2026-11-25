/* Réglage du module COMMUN du parcours d'achat des Pass (PASS.1, règle commune § 70.8, 25/11/2026) pour Immobilier Tunisie.
   Le parcours (vérifications du formulaire, code au formulaire, Formspree mwlpakqj, e-mail automatique UNE fois par commande, piège
   anti-robot, mémoire « pass-commande » sans donnée personnelle) est dans assets/pass-commun.js : COPIE EXACTE du module de
   projets-ahmed (outils communs/pass-commun, `synchroniser.py`) — ne jamais la modifier ici.
   Ce fichier garde le nom window.achatPass(form, o) appelé par les deux Pass (même appel qu'avant) :
   - assets/pass.js : Pass Investisseur (investir/pass/, formulaire #pass-achat, codes INV-XXXXXX, mémoire « pass-immobilier ») ;
   - assets/vendre.js : Pass Propriétaire (vendre/, louer/, formulaire #v-achat-form, codes VEN-XXXXXX, mémoire « pass-vendeur ») ;
   o = { code: function () -> code complet (le Pass le crée ou reprend le sien : même format, même calcul qu'avant),
         fini: function (code, formule, nom) (le Pass écrit la « Dernière étape » : window.commandePass.html d'assets/page.js) }.
   La formule est la valeur FRANÇAISE exacte de la liste (= clés « immobilier » de email-clients/sites.json), même sur les pages arabes. */
(function () {
  var iso = function (t) { return "⁦" + t + "⁩"; };
  window.achatPass = function (form, o) {
    if (!form || !form.id || !window.PassCommun || form.getAttribute("data-branche")) return;
    var cp = window.commandePass || {};
    window.PassCommun.brancher({
      site: "immobilier",
      type: "pass-code",                       // Formspree en panne : on reste sur le formulaire, même code au nouvel essai
      langues: ["fr", "ar"],
      nomSite: { fr: "Immobilier Tunisie", ar: "Immobilier Tunisie" },
      emailAuto: !!cp.EMAIL_AUTO,              // interrupteur unique : commandePass.EMAIL_AUTO (assets/page.js)
      // pas de bandeau ni de page « Dernière étape » du module : c'est le Pass qui les écrit (ids absents de la page)
      ids: { form: form.id, statut: form.id + "-statut", apres: form.id + "-sans-apres", attente: form.id + "-sans-attente", nouvelle: form.id + "-sans-nouvelle" },
      classeStatut: "achat-statut",
      code: {
        fournir: function () { return o.code(); },
        format: /^(INV-[A-Z0-9]{4,8}|VEN-[A-Z0-9]{6})$/   // commande gardée : codes des DEUX Pass (même mémoire sur toutes les pages)
      },
      textes: {
        telephone: { fr: "Téléphone : 8 chiffres, par exemple 24 321 390.", ar: "الهاتف: " + iso("8") + " أرقام، مثال " + iso("24321390") + "." },
        emailInvalide: { fr: "E-mail invalide, par exemple nom@exemple.com.", ar: "البريد الإلكتروني غير صحيح، مثال " + iso("nom@exemple.com") + "." },
        conditions: { fr: "Cochez « J’accepte les conditions du Pass ».", ar: "يجب الموافقة على شروط الباس." },
        merci: { fr: "Merci ! Votre demande est envoyée. Dernière étape : le paiement.", ar: "شكرًا! تم إرسال طلبك. الخطوة الأخيرة: الدفع." }
      },
      // e-mail automatique en service : l'étiquette dit ce qu'on y reçoit (jamais avant : la promesse serait fausse)
      brancher: function (p) {
        var e = p.champ("email"), etq = e && e.id ? p.form.querySelector('label[for="' + e.id + '"]') : null;
        if (cp.EMAIL_AUTO && etq) etq.appendChild(document.createTextNode(document.documentElement.lang === "ar" ? " (يصلك عليه رمزك وخطوات الدفع)" : " (vous y recevez votre code et les étapes du paiement)"));
      },
      formspree: function (d, c) {
        d.set("email", c.email);
        var x = c.champ("code"); if (x) x.value = c.code;   // champ caché « code » du formulaire (le module met aussi « code » dans l'envoi)
      },
      // ligne prête à recopier pour activer le Pass (bouton « activer-investisseur » du dépôt privé : le code suffit)
      pourActiver: function (c) { return "code: " + c.code + " ; formule: " + c.formule + " ; nom: " + c.nom + " ; telephone: " + c.tel + " ; email: " + c.email; },
      derniereEtape: function (x) { o.fini(x.code, x.formule, x.nom); }
    });
  };
})();
