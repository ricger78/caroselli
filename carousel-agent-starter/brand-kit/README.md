# Brand kit — la verità assoluta sul tuo look

Tutto quello che rende i caroselli **tuoi** sta in questa cartella. Il renderer legge questi file a ogni render: cambi qui, cambia ovunque.

## `brand.json` — il file da compilare

È l'unico file **obbligatorio** da personalizzare. Contiene:

| Chiave | Cosa controlla |
|--------|----------------|
| `handle` | Lo username mostrato in alto a sinistra su ogni slide (es. `@iltuonome`) |
| `authorName` | Il nome usato nelle firme (byline delle slide-opinione) |
| `colors.primary / secondary / accent` | Il **gradiente brand**: colora le parole in `**grassetto**`, i bottoni, i pallini delle liste, le cornici. `accent` colora anche frecce e callout |
| `colors.highlight` | L'evidenziatore `==testo==` (marker acceso, il testo sopra è scuro: scegli un colore chiaro) |
| `colors.note` | Il colore del box informativo opzionale "note" |
| `colors.background / backgroundDark` | I fondi delle slide. Il tema è **scuro**: restano scuri, puoi solo variarne la tinta |
| `typography.display / body / handwritten` | I tre font: titoli, testo corrente, firme a mano |

Regole:
1. **Non cambiare i nomi delle chiavi** e non cancellarne: il renderer li cerca esattamente così.
2. Dopo ogni modifica, ri-renderizza un esempio (`npm run demo`) per vedere l'effetto.
3. Scegli 3 colori del gradiente che stiano bene **in sequenza** (primary → secondary → accent): il renderer li sfuma uno nell'altro.

## `logo.png` — opzionale

Se metti qui un file `logo.png` (PNG con sfondo trasparente, quadrato o quasi), il renderer lo usa come brand mark accanto allo username. Se non c'è, disegna un **orb gradiente** coi tuoi colori: elegante e a costo zero. Parti senza logo, aggiungilo dopo se vuoi.

## Font custom — opzionale (avanzato)

I font di default sono già inclusi nel kit e sono open source: **Plus Jakarta Sans** (titoli), **Space Grotesk** (testo), **Caveat** (scritte a mano). Vanno benissimo per iniziare.

Per usare i tuoi:
1. Scarica i file font (`.woff2` o `.ttf`) — occhio alla **licenza**: deve permettere l'uso commerciale (Google Fonts è sempre ok).
2. Crea un file `brand-kit/fonts.css` con i tuoi `@font-face`, con i font **embeddati in base64** (chiedi al tuo agente Claude Code: "convertimi questi font in un fonts.css base64", lo fa lui).
3. Scrivi i nomi esatti delle famiglie in `brand.json` → `typography`.

Se `brand-kit/fonts.css` esiste, il renderer usa quello al posto dei font di default. Attenzione: a quel punto i default non ci sono più, quindi il tuo fonts.css deve coprire tutte e tre le famiglie che dichiari in `typography`.

## Cosa NON mettere qui

Chiavi API, password, dati personali. Questa cartella finisce nei backup e magari su git: solo estetica.
