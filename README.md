# StudyBuddy

Paste your notes and get:

- **A highlighted summary**: the most important sentences, with key terms marked
- **Flashcards**: definitions and key ideas you can flip through and shuffle
- **A quiz**: fill-in-the-missing-word questions with instant feedback and a score

Everything runs in the browser with plain HTML, CSS and JavaScript. There is no server and no account, and your notes stay on your device.

## Run it

Open `index.html` in any browser.

## Publish it with GitHub Pages

1. Create a new repository on GitHub.
2. Upload `index.html`, `style.css`, `script.js` and `README.md`.
3. Go to **Settings > Pages**.
4. Under **Branch**, choose `main` and `/ (root)`, then save.
5. After a minute, your site is live at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## How it works

- **Summary:** each sentence is scored by how often its words appear in your notes (common words like "the" are ignored). The top sentences are kept in their original order.
- **Flashcards:** sentences shaped like "X is Y" become definition cards. If there are few, key terms become cards.
- **Quiz:** the best sentences are turned into questions by hiding one key word. The wrong choices come from other key terms in your notes.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Look and feel, light and dark themes |
| `script.js` | Summary, flashcard and quiz logic |
