# beartify-marketplace

Repo GitHub servant de source à `extensions.js` (proxy-cache serveur Beartify).
Branche utilisée par le serveur : **Projets** (voir `GITHUB_BRANCH` dans `extensions.js`).

## Structure attendue

```
Extensions/
  lightsaber-progress/
    config.json          ✅ généré
    main.js               ✅ généré
    main.css               ✅ généré (référence — le CSS réel est embarqué dans main.js)
    preview.png            ⏳ à fournir (capture de la barre de progression avec un sabre actif)
    sw_saber_ahsoka.png    ⏳ à toi (déjà en ta possession)
    sw_saber_anakin.png    ⏳ à toi
    sw_saber_leia.png      ⏳ à toi
    sw_saber_luke.png      ⏳ à toi
    sw_saber_mace.png      ⏳ à toi
    sw_saber_rey.png       ⏳ à toi
    sw_saber_vader.png     ⏳ à toi
Themes/
Snippets/
Integrations/
```

Seul `Extensions/lightsaber-progress/` est concerné par cette demande ; les
dossiers `Themes/`, `Snippets/`, `Integrations/` existent déjà côté serveur
(voir `CATEGORIES` dans `extensions.js`) et n'ont pas besoin d'être créés
pour que cette extension fonctionne.

## Ce qu'il te reste à faire

1. Créer le dossier `Extensions/lightsaber-progress/` dans ton repo GitHub
   (`PapaOursPolaire/beartify-marketplace`, branche `Projets`).
2. Y déposer les 4 fichiers générés ci-dessus (`config.json`, `main.js`,
   `main.css`) tels quels.
3. Y déposer tes 7 images `sw_saber_*.png` **avec exactement ces noms**
   (ils sont référencés en dur dans `config.json` et `main.js`).
4. Ajouter une `preview.png` (miniature affichée dans la Marketplace —
   n'importe quel visuel représentatif fonctionne, ex. une capture de la
   barre de lecture avec le sabre de Vador actif).
5. Vider le cache serveur si besoin :
   `POST /api/extensions/invalidate` (le cache manifestes expire de
   toute façon tout seul au bout de 10 min).

## Fonctionnement de l'extension

- Au premier affichage, le sabre d'**Ahsoka** est actif par défaut.
- **Cliquer sur l'icône du sabre** (au tout début de la barre de
  progression) fait défiler les 7 personnages dans l'ordre :
  Ahsoka → Anakin → Leïa → Luke → Mace Windu → Rey → Vador → (retour à
  Ahsoka).
- Le choix est mémorisé dans `localStorage`
  (`beartify_ext_lightsaber_choice`) et restauré à chaque activation /
  rechargement.
- Couleurs de lame utilisées :

  | Personnage      | Couleur         |
  |------------------|-----------------|
  | Ahsoka Tano      | Vert → Jaune (dégradé, ses deux sabres) |
  | Anakin Skywalker | Bleu            |
  | Leïa Organa      | Rose            |
  | Luke Skywalker   | Vert            |
  | Mace Windu       | Mauve           |
  | Rey              | Jaune           |
  | Dark Vador       | Rouge           |

- Rien n'est codé en dur ailleurs : toute la logique est isolée dans
  `main.js` / le CSS scopé à `#progressContainer[data-lightsaber="…"]`,
  donc `activate()` / `deactivate()` (appelés par `marketplace.js`) sont
  parfaitement propres et ne laissent aucune trace au retrait.
