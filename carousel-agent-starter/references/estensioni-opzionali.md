# Estensioni opzionali

Il kit base gira **tutto in locale e gratis**. Queste estensioni aggiungono automazione: attivale solo quando il flusso base ti è diventato naturale, una alla volta. Per ognuna trovi il concetto, il costo reale e come chiedere al tuo agente di costruirla.

## 1. Scouting automatico delle news (Apify)

**Cosa aggiunge**: invece di portare tu l'idea, l'agente pesca le notizie fresche del tuo settore e ti propone i caroselli da fare.

- **Servizio**: [Apify](https://apify.com/) — piattaforma di scraper pronti. Quello utile è "Google News scraper" (cerchi per keyword, torna titoli+link+data).
- **Costo reale**: a consumo, ~5 €/mese bastano per un uso quotidiano.
- **Setup**: crea l'account → Settings → API token → mettilo in `.env` come `APIFY_API_TOKEN`.
- **Come attivarla**: di' al tuo agente *"costruisci uno script che interroga il Google News scraper di Apify con le keyword dei miei pilastri (references/piano-editoriale.md) e mi propone 3 idee carosello con fonte"*. Fatelo insieme, testatelo, poi salvatelo come skill (`/idee-oggi`).
- **Regola d'oro**: la notizia va **verificata aprendo la fonte** prima di farci un carosello. Lo scraper trova, non garantisce.

## 2. Anteprima su Telegram

**Cosa aggiunge**: appena renderizzato, il carosello ti arriva sul telefono come album di foto. Approvi da lì, senza stare al computer.

- **Servizio**: un bot Telegram tuo, gratis.
- **Setup**: su Telegram scrivi a **@BotFather** → `/newbot` → ti dà il token (→ `.env`, `TELEGRAM_BOT_TOKEN`). Poi scrivi a **@userinfobot** per avere il tuo chat ID (→ `TELEGRAM_CHAT_ID`). Manda un messaggio qualsiasi al tuo bot per "aprirgli" la chat.
- **Come attivarla**: di' al tuo agente *"scrivi uno script che dopo il render manda le slide come album (sendMediaGroup) al mio bot Telegram usando le variabili in .env"*. L'API è [api.telegram.org](https://core.telegram.org/bots/api#sendmediagroup), non serve nessuna libreria.

## 3. Registro su un database (Airtable o simili)

**Cosa aggiunge**: il piano editoriale passa dal file markdown a un database vero, con viste, filtri e stato — comodo se pubblichi tanto o lavori in team.

- **Servizio**: [Airtable](https://airtable.com/) (gratis fino a 1.000 record per base) o qualsiasi alternativa (Notion, Google Sheets).
- **Setup**: crea una base con una tabella "Caroselli" (campi: ID, Data, Tema, Stato, Link fonte, Caption). Genera un token API personale con permessi di scrittura su quella base.
- **Come attivarla**: di' al tuo agente *"al passo 8 di /nuovo-carosello, invece di aggiornare piano-editoriale.md, crea il record su Airtable via API"*.
- **Consiglio**: parti col file markdown. Il database ha senso da ~20 caroselli in su.

## 4. Versione LinkedIn (già inclusa)

Le stesse slide funzionano su LinkedIn come **document post** (PDF sfogliabile). Lo strumento c'è già nel kit:

```
node renderer/to-pdf.mjs output/<nome-carosello>
```

Due accortezze per LinkedIn: caption più sobria (niente "salva il post", meglio una riga di valore), e se il carosello aveva una slide CTA da Instagram valuta di toglierla dal PDF.

## L'ordine giusto per crescere

1. Prime 2 settimane: **solo il flusso base** (idea → scheda → render → pubblichi a mano).
2. Poi: **Telegram** (è la più semplice e cambia la vita).
3. Quando hai i pilastri chiari: **Apify** per lo scouting.
4. Da ~20 caroselli: **database**.

Ogni estensione che costruisci con l'agente, faglielo salvare come skill in `.claude/skills/`: la prossima volta è un comando.
