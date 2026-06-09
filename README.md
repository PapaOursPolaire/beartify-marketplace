# Beartify Marketplace

Dépôt public des extensions, thèmes, snippets et intégrations pour [Beartify](https://beartify.duckdns.org).

## Structure

```
Extensions/<nom>/
  config.json     ← métadonnées obligatoires
  main.js         ← code de l'extension
  preview.png     ← image d'aperçu (recommandé, 16:9, max 500 KB)
  [autres fichiers]

Themes/<nom>/
  config.json
  main.js
  preview.png

Snippets/<nom>/
  config.json
  main.css        ← les snippets peuvent être CSS-only
  preview.png

Integrations/<nom>/
  config.json
  main.js
  preview.png
```

## config.json

```json
{
  "id":          "mon-extension",
  "name":        "Mon Extension",
  "author":      "TonPseudo",
  "version":     "1.0.0",
  "description": "Description courte affichée dans le Marketplace.",
  "tags":        ["tag1", "tag2"],
  "featured":    false,
  "entry":       "main.js",
  "preview":     "preview.png",
  "accentColor": "#a78bfa",
  "files":       ["main.js", "preview.png"]
}
```

| Champ        | Obligatoire | Description |
|--------------|-------------|-------------|
| `id`         | ✅          | Identifiant unique (kebab-case) |
| `name`       | ✅          | Nom affiché |
| `author`     | ✅          | Ton pseudo |
| `version`    | ✅          | Semver (`1.0.0`) |
| `description`| ✅          | Max ~200 caractères |
| `tags`       | ❌          | Tableau de strings |
| `featured`   | ❌          | `true` pour mise en avant (modéré) |
| `entry`      | ❌          | Fichier principal (défaut: `main.js`) |
| `preview`    | ❌          | Image d'aperçu (défaut: `preview.png`) |
| `accentColor`| ❌          | Couleur hex pour l'UI |
| `files`      | ❌          | Liste de tous les fichiers à télécharger en Tauri |

## API de l'extension (JS)

Chaque `main.js` doit s'enregistrer via :

```js
window.BeartifyExtensions = window.BeartifyExtensions || {};
window.BeartifyExtensions['mon-extension'] = {
  name:    'Mon Extension',
  version: '1.0.0',

  activate() {
    // Appelé quand l'user active l'extension
    // Peut retourner une Promise
  },

  deactivate() {
    // Appelé quand l'user désactive l'extension
    // Doit nettoyer tout ce qu'activate() a créé
  },
};
```

L'`id` dans `window.BeartifyExtensions` doit correspondre exactement à celui du `config.json`.

## Contribuer

1. Fork ce repo
2. Crée un dossier dans la bonne catégorie (`Extensions/`, `Themes/`, `Snippets/`, `Integrations/`)
3. Ajoute `config.json`, `main.js` (ou `main.css`), `preview.png`
4. Ouvre une Pull Request

Les PR sont revues par [@PapaOurs](https://github.com/PapaOurs).  
Critères : pas de code malveillant, `deactivate()` doit nettoyer proprement, preview fournie.
