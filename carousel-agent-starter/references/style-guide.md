# Style guide — come si costruisce una slide

La bibbia del renderer. L'agente la legge **prima di ogni render**.

## Il JSON di un carosello

Un carosello = un file JSON:

```json
{
  "name": "slug-del-carosello",
  "slides": [
    { "type": "cover", "topicLabel": "OCCHIELLO", "hookText": "Il titolo\nsu più righe" },
    { "type": "content", "heading": "Titolo slide", "body": "Testo corrente." },
    { "type": "cta", "ctaText": "Cosa fare adesso.", "ctaSubtext": "Salva il post" }
  ]
}
```

- `name` → le slide finiscono in `output/<name>/slide-01.png ...`
- `handle` (opzionale) → di default usa quello di `brand-kit/brand.json`
- `hideCounter: true` (opzionale, in cima al file) → toglie il contatore `01 / 05` in alto a destra. Serve quando fai **una sola immagine** e non un carosello: su un'immagine singola il contatore non ha senso.
- Render: `node renderer/render.mjs <file.json>` · Anteprima: `node renderer/preview.mjs <file.json>`

## Markup nei testi

Vale in quasi tutti i campi testo:
- `**parola**` → parola colorata col **gradiente brand**. È il segno più forte: una per concetto, mai frasi intere.
- `==testo==` → **evidenziatore** stile marker. Per la frase-conclusione o un numero che deve gridare.
- `__testo__` → **grassetto bianco**. È il segno leggero: serve a marcare le due o tre parole che devono restare in testa a chi scorre. Usalo dentro i paragrafi.
- `\n` → a capo

⚠️ **Non accendere l'albero di Natale.** Gradiente ed evidenziatore sono segni forti: se li usi dentro un paragrafo per marcare i punti chiave, la slide diventa illeggibile. Dentro il testo si usa il grassetto bianco; il gradiente sta nel titolo, l'evidenziatore sulla conclusione.

## Come si scrive il testo delle slide

Il pubblico non è il tuo settore: è chi scorre e non sa niente dell'argomento.

1. **Prima cosa è successo, poi cosa vuol dire per chi legge.** Struttura da cronaca: chi, cosa, quando, e l'effetto pratico. Niente allusioni che si capiscono solo se già conosci la storia.
2. **Ogni parola tecnica si spiega alla prima comparsa, dentro la frase.** Non "usa Gemini", ma "usa Gemini, l'intelligenza artificiale di Google". Vale per ogni sigla, nome di prodotto, termine da addetti ai lavori.
3. **Frasi corte: soggetto, verbo, complemento.** Niente riferimenti impliciti ("il capostipite" → "il primo, quello uscito due anni fa").
4. **Una frase per riga.** Nel `body` mandi a capo con `\n` e spezzi le frasi: si legge molto meglio di un blocco pieno. È il modo di default.
5. **L'elenco con le icone solo se c'è davvero una sequenza** (una cronologia, tre passaggi, una classifica). Su una spiegazione qualsiasi diventa un elenco finto, e si vede.
6. **Se hai un tono ironico, tienilo per la slide di opinione e per la caption.** Nelle slide che spiegano, la chiarezza viene prima: se una battuta rende meno chiaro cosa succede, la battuta salta.

⚠️ **Mandando ogni frase a capo il testo cresce in altezza.** Se la slide si stringe o il renderer segnala "rientrato", **accorcia il testo**: mai lasciare che immagine e corpo si schiaccino. Con un'immagine grande, il testo sta in due righe spezzate, non tre.

## La copertina: il titolo è un gancio, non un'etichetta

Il titolo della slide 1 non dice l'argomento, fa fermare il pollice. Meglio se è il fatto più sorprendente detto in parole povere: "Sembrano tre camere. Era una" batte "Come girare con una camera sola".

- Titolo su **2 righe**, non tre. Se va a tre, accorcialo.
- **Emoji in linea sull'ultima riga, mai da sola.** Se l'ultima riga sfora, l'emoji finisce da sola su una riga in più, gigante. Il renderer non te lo segnala: **guarda sempre la slide 1 dopo il render.**
- Il sottotitolo spiega il contesto in una riga.

## I tipi di slide

| Tipo | A cosa serve | Campi principali |
|------|--------------|------------------|
| `cover` | Slide 1, l'hook | `hookText` (max ~8 parole), `topicLabel` (occhiello), `subhead` (opz.) |
| `content` | Spiegare un concetto | `heading`, `body`, `items` (opz., lista con spunte) |
| `checklist` | Elenco puntato con spunte | `heading`, `items[]`, `variant: "x"` per le ✕ |
| `steps` | How-to numerato | `heading`, `items[]` (il numero lo mette il renderer) |
| `stat` | Un numero che colpisce | `value` (es. "87%"), `label` (la riga che gli dà senso) |
| `quote` | Citazione in grande | `quoteText`, `attribution` |
| `compare` | Prima/dopo, X vs Y | `heading`, `left: {title, items}`, `right: {title, items}` (right = evidenziata) |
| `timeline` | Cronologia di eventi | `heading`, `items: [{date, label, highlight?}]` |
| `sources` | Fonti citate | `heading`, `items: [{name, url}]` |
| `cta` | Ultima slide, l'azione | `ctaText`, `ctaSubtext` (bottone), oppure `ctaKeyword`+`ctaAction`+`ctaReward` per le CTA "commenta X" |

## Tipi avanzati (con immagini)

Quando hai immagini reali (screenshot, foto) da mostrare:

| Tipo / campo | Effetto |
|--------------|---------|
| `screenshot` con `imagePath` + `source` | Immagine incorniciata in una finestra browser brandizzata |
| `screenshot` con `chrome: false` | Card foto pulita senza barra browser |
| `cover` con `bgImagePath` | Cover con immagine full-bleed sotto il titolo (+ scrim automatico) |
| `cover` con `frameImagePath` | Cover "mockup": titolo in alto, immagine nitida incorniciata sotto |
| `story` con `cutoutPath` | Racconto con immagine scontornata + `callout` con freccia a mano |
| qualsiasi slide con `bgImagePath` | Full-bleed: immagine a tutto schermo, testo bold sovrapposto |
| qualsiasi slide con `photoPath` | Foto piccola incorniciata sotto il contenuto |
| qualsiasi slide con `note` | Box informativo in basso (colore `note` del brand kit) |
| `"video": true` sulla slide | La slide diventa un MP4 animato (richiede **ffmpeg** installato) |

I percorsi immagine sono relativi **al file JSON** (o assoluti, o URL http). Se il JSON sta in `output/`, l'immagine `output/foto.png` si scrive `"foto.png"`.

### Quanto alta va un'immagine: la formula

Il campo `imgHeight` decide l'altezza del riquadro. Se sbagli, `object-fit: cover` **taglia i lati** e perdi le parole di bordo.

```
imgHeight = 893 × altezza dell'immagine ÷ larghezza dell'immagine
```

Arrotonda **in giù**. Esempio: immagine 1428×706 → 893 × 706 ÷ 1428 = 441 → metti 380/430, non 480.

### Screenshot che si leggono

Uno screenshot preso da una finestra larga entra nella slide rimpicciolito e diventa illeggibile: la scala dipende **solo** dalla larghezza dell'immagine rispetto al riquadro. Cattura la pagina con una **finestra stretta** (intorno agli 800 px di larghezza), così il titolo va a capo e il testo resta grande. E prima di metterlo in una slide, **guardalo**: capita di catturare una pagina con il banner dei cookie aperto o il messaggio "verifica di essere umano".

## Regole visive (sempre valide)

1. **Una slide, un concetto.** Due idee = due slide.
2. **Max 5-7 righe di testo per slide.** Il vuoto è design, non spreco.
3. **Un solo `**gradiente**` per concetto chiave**, mai frasi intere colorate.
4. **Hook max ~8 parole.** Se non stai sotto le 8, l'idea non è ancora chiara.
5. **Slide 1 = cover, ultima = cta.** Sempre.
6. **6-8 slide** è il formato che regge. Oltre le 10 il completamento crolla.
7. Dopo il render **guarda le slide**: testo tagliato, righe orfane o slide soffocata = correggi il testo e ri-renderizza (mai rimpicciolire il font per farcelo stare).
8. **I fatti invecchiano.** Un carosello gira per mesi: numeri, prezzi e "è appena uscito" si ricontrollano il giorno che lo pubblichi, non il giorno che lo scrivi. E prima di consigliare uno strumento, controlla su che sistema gira: metà del pubblico si arrabbia se alla quarta slide scopre che serve un Mac.

## Le tue regole visive

> Aggiungi qui le regole che scopri strada facendo, così l'agente le rilegge a ogni render.

- [es. "le stat sempre come slide 5, mai prima"]
- [es. "mai due checklist consecutive"]
- [es. "l'evidenziatore solo su date e numeri, mai su parole di opinione"]
