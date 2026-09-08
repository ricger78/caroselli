# Guida — Costruisci il tuo agente Caroselli con Claude Code

Questa guida ti porta da zero a un agente Claude Code che trasforma un'idea in un **carosello Instagram finito**: slide PNG 1080×1350 col tuo brand, caption inclusa, più la versione PDF per LinkedIn.

L'agente che costruirai è simile per architettura a "CAROSELLO" (il mio) ma con il **tuo** stile, i **tuoi** colori, la **tua** voce. Il kit ti dà l'impalcatura e un renderer già funzionante — l'identità la metti tu.

---

## Aspettative oneste prima di partire

- **Il cuore del kit è gratis.** Scrittura e render girano tutto sul tuo computer: zero API, zero abbonamenti oltre a Claude Code. È la differenza grossa rispetto a quasi ogni altro sistema di contenuti AI.
- **I tuoi primi 3 caroselli saranno tiepidi.** Non per la grafica (quella esce pulita da subito) ma per i testi: la voce si affina carosello dopo carosello, insegnandola all'agente.
- **Il primo carosello ti porterà via 1-2 ore** tra setup e iterazioni. Dal quinto bastano 15-20 minuti.
- **Non è "AI che posta da sola".** L'agente costruisce, tu approvi e pubblichi. Il gusto resta tuo.

---

## Indice

1. [Cosa otterrai](#1-cosa-otterrai)
2. [Glossario](#2-glossario)
3. [Prerequisiti](#3-prerequisiti)
4. [Costi reali](#4-costi-reali)
5. [Installazione passo passo](#5-installazione-passo-passo)
6. [Claude Code 101 — come ci si parla](#6-claude-code-101--come-ci-si-parla)
7. [Primo render demo](#7-primo-render-demo)
8. [Personalizza il tuo brand](#8-personalizza-il-tuo-brand)
9. [Trova la tua voce](#9-trova-la-tua-voce)
10. [Il workflow completo](#10-il-workflow-completo)
11. [Anatomia di un buon carosello](#11-anatomia-di-un-buon-carosello)
12. [La versione LinkedIn](#12-la-versione-linkedin)
13. [Estensioni opzionali](#13-estensioni-opzionali)
14. [Aggiornamenti e backup](#14-aggiornamenti-e-backup)
15. [Troubleshooting](#15-troubleshooting)
16. [Slide che si muovono (video dentro il carosello)](#16-slide-che-si-muovono-video-dentro-il-carosello)
17. [Novità della versione 0.2](#17-novità-della-versione-02)

---

## 1. Cosa otterrai

Un agente Claude Code che, partendo da un'idea o una notizia, produce:

- **6-8 slide PNG 1080×1350** (formato 4:5, feed Instagram) già brandizzate: colori, font, handle, gradiente sulle parole chiave
- la **caption** pronta da incollare
- a richiesta, il **PDF** delle stesse slide per un document post LinkedIn
- a richiesta, singole slide **animate in MP4** (serve ffmpeg)

Il tutto passando per una **scheda di approvazione**: l'agente ti mostra il carosello slide per slide come testo, tu correggi, e solo dopo si renderizza.

**Cosa NON copre il kit**: la pubblicazione automatica su Instagram (pubblichi tu, o la aggiungi dopo come estensione) e la generazione di immagini AI per le slide (le slide sono tipografiche, bellissime senza).

---

## 2. Glossario

| Termine | Cosa vuol dire |
|---------|----------------|
| **Carosello** | Post Instagram a più immagini che si sfogliano (fino a 20 slide) |
| **Slide** | Una singola immagine del carosello |
| **Hook** | La prima slide. Deve fermare il pollice in mezzo secondo |
| **CTA** | "Call to action" — l'ultima slide: cosa deve fare il lettore (salvare, commentare, seguire) |
| **Caption** | Il testo scritto sotto il post |
| **4:5** | Proporzione verticale del feed IG: 1080×1350 pixel |
| **Render** | "Stampare" le slide finali (PNG) a partire dal file di testo |
| **JSON** | Il formato del file che descrive il carosello (testi + tipi di slide). Lo scrive l'agente, non tu |
| **Renderer** | Lo script del kit che trasforma il JSON in PNG |
| **Brand kit** | La cartella con i tuoi colori, font e handle: l'identità visiva |
| **Headless Chrome** | Chrome senza finestra, usato dal renderer per "fotografare" le slide |
| **Playwright** | La libreria che pilota Chrome headless |
| **ffmpeg** | Tool video gratuito: serve solo per slide animate e PDF leggeri |
| **Document post** | Il formato PDF sfogliabile di LinkedIn (il "carosello" di LinkedIn) |
| **Skill / slash command** | Procedura salvata per Claude Code, si attiva con `/nome` |

---

## 3. Prerequisiti

| Tool | Versione min. | Come |
|------|----------------|------|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org/) → installer per il tuo OS |
| Claude Code | latest | `npm install -g @anthropic-ai/claude-code` |
| ffmpeg | 6.x — **opzionale** | Serve solo per slide animate MP4 e PDF compressi. Windows: [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (poi aggiungi al PATH). Mac: `brew install ffmpeg` |

Hardware: **qualsiasi computer degli ultimi 8 anni va bene.** Il render di un carosello richiede pochi secondi, non è un lavoro pesante. Servono ~1 GB di disco per Chromium.

**Verifica rapida.** Apri il terminale (PowerShell su Windows, Terminale su Mac) e lancia:

```bash
node --version       # deve mostrare v20 o superiore
claude --version
```

Se uno dei due non risponde, installalo prima di andare avanti.

**Account**: solo quello per Claude Code (Anthropic). Nessun altro account richiesto per il flusso base.

---

## 4. Costi reali

| Voce | Costo |
|------|-------|
| Renderer (Playwright, Chromium, font) | **0 €** — tutto open source, gira in locale |
| Claude Code | il tuo piano Claude (da ~18 €/mese) o API a consumo (~3-8 €/mese per un uso da 3-4 caroselli/settimana) |
| Estensioni opzionali (Apify, ecc.) | 0-10 €/mese, solo se le attivi |

Se hai già Claude Code per altro, **fare caroselli non ti costa nulla in più**.

---

## 5. Installazione passo passo

### 5.1 Scompatta il kit

Hai scaricato uno ZIP. Scompattalo dove preferisci, per esempio `Documenti/mio-agente-caroselli/`. Da qui in poi tutti i comandi si lanciano **da dentro quella cartella**.

```bash
cd Documenti/mio-agente-caroselli
```

### 5.2 Installa le dipendenze

```bash
npm install
npm run setup
```

Il primo comando scarica le librerie (1 minuto). Il secondo scarica Chromium per il renderer (~150 MB, 2-5 minuti a seconda della connessione). Si fa una volta sola.

### 5.3 Variabili d'ambiente (puoi saltare)

Il flusso base **non ha bisogno di nessuna chiave**. Quando un domani attiverai le estensioni:

```bash
# Windows PowerShell
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 5.4 Verifica Claude Code

```bash
claude
```

Si apre l'agente. Scrivi: "chi sei?". Dovrebbe risponderti che è il tuo agente caroselli. Per uscire: `/exit`.

---

## 6. Claude Code 101 — come ci si parla

### Cos'è Claude Code

È un agente AI da terminale. Lo lanci con `claude` dentro la cartella del progetto. **Ha accesso ai file** di quella cartella: legge, scrive, modifica. Esegue comandi (Node, il renderer) **chiedendoti il permesso**.

### Il file `CLAUDE.md`

È l'**identità persistente** dell'agente: lo legge all'inizio di ogni sessione. Ci trovi scritto chi è, la pipeline, le regole. **Lo modifichi tu** quando vuoi cambiare un comportamento in modo permanente.

### Slash command e skill

Dentro Claude Code scrivi `/nome-comando` per attivare una **skill** (le trovi in `.claude/skills/`). Il kit te ne dà tre:

- `/nuovo-carosello` — la pipeline completa: idea → scheda → render → caption
- `carousel-builder` — lo stampo della scheda (la usa l'agente da solo)
- `voce-brand` — la tua voce scritta (da compilare, vedi sezione 9)

### Come dare feedback efficace

❌ Male: "non mi piace la slide 3"
✅ Bene: "la slide 3 ha troppe righe, tienine 4 e sposta l'esempio in una slide sua"

❌ Male: "fallo più mio"
✅ Bene: "io non direi mai 'performante': cambia in 'che funziona' e salva la regola in voce-brand"

### Cosa committare in git (se usi git)

- ✅ `CLAUDE.md`, `references/`, `brand-kit/` (non i font), `.claude/skills/`, `renderer/`, `package.json`
- ❌ `.env` (segreti!), `output/` (rigenerabile), `node_modules/`

---

## 7. Primo render demo

```bash
npm run demo
```

Il renderer prende `renderer/esempi/riconoscere-ai.json` e sforna 5 slide in `output/riconoscere-ai/`. Aprile: se vedi slide scure ed eleganti con la palette demo (magenta→arancio→oro), funziona tutto.

Poi prova il tour completo dei tipi di slide:

```bash
node renderer/render.mjs renderer/esempi/tour-tipi-slide.json
```

9 slide, una per tipo: è il catalogo visivo di quello che il tuo agente sa impaginare. **Tienile sott'occhio quando pensi un carosello.**

Se qualcosa fallisce → [Troubleshooting](#15-troubleshooting).

---

## 8. Personalizza il tuo brand

Tutta l'identità visiva sta in **`brand-kit/brand.json`**: handle, nome, i 3 colori del gradiente, evidenziatore, fondi, font. Aprilo, leggi i commenti `_doc` e sostituisci i valori. La guida completa campo per campo è in `brand-kit/README.md`.

Il modo più veloce: apri Claude Code e digli

> "Il mio handle è @tizio, i miei colori brand sono #XXXXXX e #YYYYYY: aggiorna brand.json con una palette coerente e ri-renderizza il demo così vedo l'effetto."

Iterate insieme finché le slide non ti somigliano. Due cose da sapere:

- **Il tema è scuro.** I fondi restano scuri (puoi variarne la tinta), i tuoi colori vivono nel gradiente e negli accenti. È quello che rende le slide leggibili e riconoscibili nel feed.
- **Logo e font custom sono opzionali.** Senza logo il renderer disegna un orb gradiente coi tuoi colori. I font inclusi sono open source e già bellissimi. Dettagli in `brand-kit/README.md`.

---

## 9. Trova la tua voce

La grafica è metà del lavoro. L'altra metà è che i testi suonino **tuoi**.

Apri `.claude/skills/voce-brand.md`: è un modulo da compilare (chi sei, tono, regole, parole vietate, esempi). Il modo più efficace:

1. Raccogli 3-5 tuoi post/testi che ti rappresentano davvero.
2. Apri Claude Code e di': *"ecco 5 miei testi: estrai le regole della mia voce e compila voce-brand.md"*.
3. Rileggi e correggi a mano quello che non torna. Sono 10 minuti spesi meglio di qualsiasi altra cosa in questo kit.

Da lì in poi, ogni feedback sulla voce ("questa parola non la userei mai") va ad arricchire quel file.

---

## 10. Il workflow completo

**Sessione tipo:**

```
TU:      /nuovo-carosello
AGENTE:  Idea o notizia di partenza?
TU:      i 4 errori che vedo fare a chi inizia con [il tuo tema]
AGENTE:  [scheda: hook, 6 slide, caption]
TU:      la slide 4 è debole, l'errore vero è X. E l'hook lo voglio più cattivo
AGENTE:  [scheda corretta]
TU:      vai
AGENTE:  [scrive il JSON, renderizza, apre la cartella]
TU:      perfetto. ricorda che gli hook mi piacciono così
AGENTE:  salvato in voce-brand
```

**Pattern d'oro:**
1. **Approva la scheda prima del render.** Correggere testo costa zero.
2. Un feedback alla volta.
3. Regola permanente → "ricorda questo". Vale solo per stavolta → non salvare.
4. Il render è gratis: **itera senza paura**.

---

## 11. Anatomia di un buon carosello

Le regole complete sono in `references/style-guide.md` (visive) e nella skill `carousel-builder` (narrative). Le tre che contano di più:

### L'arco narrativo
Hook → problema → costo → svolta → sistema → prova → CTA. Non servono tutte le tappe, ma l'ordine regge: **tensione prima, valore al centro, azione in fondo**.

### Una slide, un concetto
Se una slide ha due idee, spezzala. Max 5-7 righe per slide. Il lettore sfoglia col pollice: ogni slide deve funzionare in 2 secondi.

### L'ultima slide lavora per te
Sempre una CTA concreta: "salva il post", "commenta [parola]", "seguimi per [promessa]". Un carosello senza CTA è un monologo.

---

## 12. La versione LinkedIn

Le stesse slide funzionano su LinkedIn come document post (PDF sfogliabile):

```bash
node renderer/to-pdf.mjs output/<nome-carosello>
```

Esce un PDF con 1 slide per pagina, pronto da caricare. Accortezze: su LinkedIn la caption è più sobria e la slide CTA "da Instagram" spesso è meglio toglierla. Dettagli in `references/estensioni-opzionali.md`.

**La versione LinkedIn te la prepara uno strumento**, così non riscrivi niente a mano:

```bash
node tools/versione-linkedin.mjs output/<nome-carosello>.json
```

Legge il carosello, toglie la slide finale con la chiamata all'azione (su LinkedIn non c'è l'automazione dei commenti, quindi quella slide è persa) e scrive un file `-linkedin.json` accanto all'originale. Lo renderizzi come sempre.

---

## 13. Estensioni opzionali

Quando il flusso base ti è naturale, puoi aggiungere (una alla volta):

1. **Anteprima su Telegram** — le slide ti arrivano sul telefono come album
2. **Scouting news con Apify** — l'agente ti propone i caroselli dalle notizie del giorno
3. **Registro su Airtable** — il piano editoriale diventa un database

Concetti, costi e istruzioni per costruirle **insieme al tuo agente** in `references/estensioni-opzionali.md`.

---

## 14. Aggiornamenti e backup

```bash
npm update                                    # aggiorna le librerie
npm update -g @anthropic-ai/claude-code       # aggiorna Claude Code
```

**File da non perdere mai** (sono la tua personalizzazione): `CLAUDE.md`, `brand-kit/`, `.claude/skills/` (soprattutto `voce-brand.md`), `references/`. Un backup su Drive/Dropbox o un repo git privato e dormi sereno. L'`output/` è rigenerabile.

---

## 15. Troubleshooting

### `browserType.launch: Executable doesn't exist`
Chromium non è stato scaricato. Lancia `npm run setup` (cioè `npx playwright install chromium`).

### `Cannot find module 'playwright'`
Non hai fatto `npm install` dentro la cartella del kit, o l'hai fatto in un'altra cartella.

### Le slide escono coi colori demo (magenta/arancio) e non i miei
Il renderer non trova o non riesce a leggere `brand-kit/brand.json`. Controlla che il file esista, che sia JSON valido (occhio a virgole finali) e che i colori siano in formato `#RRGGBB`.

### Testo tagliato o slide troppo piena
Non è un bug: c'è troppo testo. Taglia le righe nel JSON (max 5-7 per slide) e ri-renderizza. Mai chiedere di "rimpicciolire il font".

### `ffmpeg non riconosciuto`
Serve solo per slide animate (`"video": true`) e PDF compressi. Installalo e aggiungilo al PATH, oppure evita le slide video: tutto il resto funziona senza.

### Caratteri strani / accenti rotti su Windows
Assicurati che i JSON siano salvati in UTF-8. Se scrivi i file con l'agente, ci pensa lui.

### Quota Claude esaurita
Il render è locale e continua a funzionare sempre. È solo la scrittura assistita che aspetta il reset della quota.

**Regola d'oro**: incolla l'errore esatto in Claude Code. 8 volte su 10 lo risolve lui.

---

## 16. Slide che si muovono (video dentro il carosello)

Instagram accetta i video **dentro** un carosello. Una slide che si muove in mezzo a slide ferme è la cosa che trattiene di più: se stai mostrando uno strumento all'opera, farlo vedere in movimento vale dieci righe di spiegazione.

Il renderer da solo fa immagini. Per incastrare un video dentro una slide c'è `tools/slide-video.mjs`, e si lavora in tre passi.

**Ti serve prima:** `ffmpeg` installato (vedi Prerequisiti) e la libreria che ritaglia le immagini:

```bash
npm install sharp
```

**Passo 1 — il segnaposto.** È un rettangolo magenta delle dimensioni del video, che serve a dire al renderer "qui ci va il filmato":

```bash
node tools/slide-video.mjs --segnaposto=output/segnaposto.png --w=1000 --h=562
```

**Passo 2 — la slide.** Nel JSON la scrivi come uno screenshot normale, mettendo il segnaposto al posto dell'immagine, poi renderizzi il carosello:

```json
{ "type": "screenshot", "heading": "Guardalo muoversi", "imagePath": "segnaposto.png",
  "chrome": false, "imgHeight": 562, "caption": "La clip originale" }
```

**Passo 3 — il montaggio.** Il video entra nel rettangolo, con gli angoli arrotondati e la cornice del tuo colore:

```bash
node tools/slide-video.mjs output/mio/slide-04.png video.mp4 output/mio/slide-04.mp4
```

Poi **cancella il PNG** di quella slide, altrimenti nell'album carichi sia il rettangolo magenta sia il video. Attenzione: se ri-renderizzi il carosello (anche solo per cambiare la copertina) il PNG col magenta torna, e i passi 3 e 4 vanno rifatti.

⚠️ **Il video dimostrativo si mette intero, non tagliato.** Se il valore della clip è far vedere che una cosa dura o che non ci sono stacchi, accorciarla annulla la dimostrazione. Un mp4 da 30 secondi a 1080×1350 pesa circa 4 MB e Instagram lo regge senza problemi.

---

## 17. Novità della versione 0.2

Cosa è cambiato rispetto alla 0.1, e cosa ti conviene farci.

| Novità | Cosa vuol dire | Cosa devi fare |
|---|---|---|
| Grassetto bianco `__testo__` | Un terzo segno, leggero, per marcare le parole dentro un paragrafo | Usalo al posto del gradiente quando devi evidenziare due o tre punti in un blocco di testo |
| Righe più ariose | Le righe dei blocchi di testo respirano di più | Niente, è già così |
| `hideCounter: true` | Toglie il contatore "01 / 05" in alto a destra | Mettilo quando produci **una sola immagine** invece di un carosello (per esempio una creatività singola) |
| Titolo non più incollato all'handle | Nelle slide con screenshot il titolo aveva l'aria di essere appiccicato al nome utente | Niente, è già così |
| `tools/versione-linkedin.mjs` | La versione LinkedIn si genera dal carosello Instagram | Sezione 12 |
| `tools/slide-video.mjs` | Video dentro una slide del carosello | Sezione 16 |
| Regole di scrittura riscritte | La style guide adesso dice **come si scrivono** i testi, non solo come si impagina | Rileggi `references/style-guide.md`: è mezz'ora ben spesa |

Le regole nuove che contano di più, in breve:

- **Scrivi per chi non sa niente.** Prima cosa è successo, poi cosa cambia per chi legge. Ogni parola tecnica spiegata alla prima comparsa, dentro la frase.
- **Una frase per riga** dentro il testo, con i punti chiave in grassetto bianco. L'elenco con le icone solo se c'è davvero una sequenza.
- **Il titolo della copertina è un gancio, non un'etichetta.** E l'emoji non deve mai restare da sola su una riga: guarda sempre la slide 1 dopo il render.

---

## Da dove iniziare adesso

1. Leggi **Glossario** e **Claude Code 101**. 10 minuti.
2. Installa i prerequisiti (sez. 3). 15 minuti.
3. `npm install` + `npm run setup`. 5 minuti.
4. `npm run demo` — se escono le slide, sei dentro.
5. Personalizza `brand-kit/brand.json` col tuo agente (sez. 8). 20 minuti.
6. Compila `voce-brand.md` dandogli 3-5 tuoi testi (sez. 9). 15 minuti.
7. `/nuovo-carosello` sul tema che conosci meglio.
8. Itera, dai feedback, fai salvare le regole.
9. Dopo 5 caroselli, l'agente scrive quasi come te. Dopo 15, il "quasi" si assottiglia.

Buoni caroselli.
