# DASHBOARD — Specifiche di design (da mockup)

*Documento 4 (v2) — Requisiti e scelte emersi nella chat di mockup del 18/09/2026 su Claude.ai. Il mockup interattivo (componente React con dati dimostrativi) esiste solo in quella chat; una versione HTML è nel repo in `mockup/Dashboard_OneHealth_Main.html`.*

## Requisiti dichiarati da Matteo

- Grafica **minimale, tema scuro**. *(02/10/2026: tema chiaro e scuro con interruttore, scelta di Matteo — v. sezione "Dashboard React" in fondo.)*
- **Stile grafico unico a tre colori** su tutta l'interfaccia.
- Tutti i frame/container con **border-radius 10px**. *(02/10/2026: implementato 24 px come flux, da confermare — v. in fondo.)*
- **Mappa** con OpenStreetMap: il territorio diviso in sezioni/zone; per ciascuna zona l'incidenza della qualità dell'aria sulla salute.
- **Selettore di periodo** per vedere come cambiano i valori nel tempo.
- Grafici, tabelle riassuntive e "tutto quello che può servire al supporto alle decisioni".

## Correzione ricevuta sulla prima versione

La prima bozza usava una mappa schematica (8 fasce orizzontali astratte). Matteo l'ha respinta: **la mappa deve avere la forma geografica reale** del territorio e il layout deve essere più leggibile.

## Scelte della seconda versione (approvata come base)

- **Mappa con coordinate reali** della provincia di Lecce (coste adriatica e ionica, capi, confine interno con Brindisi/Taranto), proiezione equirettangolare in SVG, **6 zone cliccabili**:
  1. Lecce e Nord-Est
  2. Nardò–Porto Cesareo
  3. Galatina–Martano
  4. Maglie–Poggiardo
  5. Gallipoli–Casarano
  6. Capo di Leuca
- **Ordine del layout:** header → KPI → mappa + dettaglio zona / barre di confronto → grafico di trend → tabella riassuntiva.
- **Leggibilità:** KPI a 34px, testo a 13-14px, contrasto alto sul testo secondario, etichette di zona con contorno scuro, asse Y etichettato nel trend, colonna delta nella tabella.
- **Tweak dinamici:** colore d'accento e border-radius come proprietà modificabili.
- **Dati:** tutti **dimostrativi**, in attesa dei dataset reali.
- **Disclaimer:** la correlazione aria-salute è sempre etichettata come **esplorativa e non causale**.

## Incongruenze da risolvere prima di implementare

1. **Perimetro geografico — RISOLTO (18/09/2026):** il territorio ufficiale è **"Salento" = Lecce + Taranto + Brindisi**. Il mockup con le sole 6 zone della provincia di Lecce è superato: la dashboard va estesa alle tre province. Resta da verificare quanti distretti copre la prima iterazione dell'MVP.
2. **Criterio di zonizzazione — RISOLTO (18/09/2026):** le zone sono i **distretti socio-sanitari ufficiali** delle ASL di Lecce, Taranto e Brindisi (non cluster di comuni definiti a mano, non le 6 zone del mockup). Le 6 zone del mockup restano solo come riferimento di layout, da rifare sui distretti reali.
3. **Confini reali — RISOLTO (26/09/2026):** i confini distrettuali veri sono stati reperiti e disegnati in `mockup/mockup_mappa_distretti.html` (v. sezione dedicata sotto). Resta da integrare questa mappa con i dati di aria/salute reali (oggi mostra solo dati demografici).

## Mappa distretti — base grafica scelta (`mockup/mockup_mappa_distretti.html`)

*Aggiunto 26/09/2026.* Mockup separato da `Dashboard_OneHealth_Main.html`, adottato come **base grafica per la mappa della dashboard finale**:

- **Leaflet** (non più SVG a mano) con basemap intercambiabile (OSM standard, OSM Bright, Positron, Dark Matter via Geoapify — chiave API non ancora impostata nel file).
  - **Aggiornamento 01/10/2026:** Leaflet è **confermato come libreria definitiva** della dashboard (via `react-leaflet`), ma per il vincolo "tutto gratuito e senza limiti di consumo" i basemap **Geoapify vanno sostituiti con i tile OpenStreetMap standard** (`tile.openstreetmap.org`, nessuna chiave, nessuna quota, attribuzione ODbL obbligatoria). Alternative libere per il tema scuro, da valutare solo nelle varianti senza chiave: Carto Positron / Dark Matter. V. `Architettura.md` §2 e §7.
- **Confini reali** dei distretti socio-sanitari (fonte: anagrafica distretti ASL Puglia, v. `data/dataset/Lista_dataset.md`) e dei comuni (confini ISTAT via openpolis/geojson-italy), disegnati come layer GeoJSON separati (`GEO.distretti`, `GEO.comuni`).
- Copre le **tre province** (Lecce, Brindisi, Taranto), con filtro per provincia e selezione di un distretto per vedere il dettaglio dei comuni afferenti.
- **Dati mostrati oggi: solo demografici** (residenti, superficie, densità, comuni afferenti, quota su provincia/Salento, comune più popoloso) — dati reali, non dimostrativi, dal file dei distretti ASL. **Nessun dato di aria o salute è ancora collegato**: è la struttura/mappa che andrà arricchita con i parametri della sezione successiva.
- Nota territoriale riportata nel mockup: Presicce e Acquarica del Capo, fuse dal 2019 in Presicce-Acquarica, hanno confine unico sulla mappa ma restano separate nell'elenco comuni (dato di origine).

## Parametri di qualità dell'aria

*Deciso 26/09/2026.* Inquinanti di riferimento per la dashboard: **CO, NO2, O3, PM2.5, SO2** (dato "Daily Forecast").

- Si useranno **tutti quelli disponibili** per ciascuna zona/periodo: non è richiesta la disponibilità simultanea di tutti e cinque per mostrare un distretto.
- Dove un inquinante **non è disponibile** per un distretto/stazione/periodo, l'interfaccia deve **indicarlo esplicitamente** (es. "dato non disponibile" o "N/D"), non ometterlo o azzerarlo in silenzio — coerente con la regola già presente di segnalare quando un valore proviene da dato modellato (v. sotto).
- ARPA Puglia monitora anche PM10 e benzene oltre a questi cinque (v. `data/dataset/aria/Lista_dataset_aria.md` e `data/dataset/aria/arpa_puglia/Parametri_Qualita_Aria.md`): non sono nell'elenco dei parametri di riferimento della dashboard, salvo diversa indicazione di Matteo.

## Requisiti impliciti per l'implementazione

- Selettore di periodo che filtra sia la mappa sia i grafici.
- Ogni zona deve esporre: valore aria per ciascuno dei cinque inquinanti di riferimento (dove disponibile), indicatore sanitario, delta rispetto al periodo precedente, numero di stazioni ARPA che la coprono (qualità del dato).
- Se una zona ha copertura stazioni insufficiente, mostrare che il valore proviene da dato modellato (CAMS).
- Se un inquinante non è disponibile per una zona/periodo, mostrarlo come tale invece di ometterlo (v. "Parametri di qualità dell'aria" sopra).

## Dashboard React — stile, struttura e confronti (02/10/2026)

*Aggiunto 02/10/2026.* Prima versione della dashboard in `localhost/dashboard/` (React + Vite + TypeScript, Leaflet, Recharts), alimentata dall'API locale `localhost/server/` (v. `Architettura.md` §6-7). Avvio: `uv run localhost/server/main.py`, poi `npm run dev` in `localhost/dashboard/` → `http://127.0.0.1:5173`.

### Riferimenti grafici (scelte di Matteo)

| Riferimento | Cosa se ne prende | Screenshot nel repo |
|---|---|---|
| **flux** — "Health Monitoring Dashboard UI Design" (Nixtio, Dribbble) | **Stile prevalente** e **colori**: cornice scura, area contenuti grigio chiaro, card bianche piatte e arrotondate, controlli a pillola, accenti lime e lavanda | `mockup/Screenshot 2026-10-02 200255.png` |
| **Nura** — Healthcare Platform UX/UI Dashboard (Behance) | **Font**: Redoneta Regular per il testo, LED Pixel C Unicase per alcuni numeri | `mockup/Screenshot 2026-10-02 200243.png` |

Le pagine originali di Behance e Dribbble rifiutano le richieste automatiche (403 e verifica anti-bot): font e colori vengono dagli screenshot forniti da Matteo e dai nomi dei font indicati da lui, non da una lettura delle pagine.

**Colori dell'interfaccia** (campionati a pixel dallo screenshot di flux): pagina `#E1E1E1`, card `#FFFFFF`, barra laterale e card in evidenza `#222124`, lime `#DAF163`, lavanda `#BBB2F5`, pillola scura `#4C4B4E`, traccia `#F2F2F2`. Il testo secondario di flux (`#747474`, 3,6:1 sulla pagina grigia) è scurito a `#5E5E60` per arrivare a 4,5:1.

### Font

Redoneta e LED Pixel C Unicase sono **a pagamento** (Redoneta: 30 $ a stile su MyFonts, nessuno stile gratuito; LED Pixel: 9 $ a stile secondo i risultati di ricerca, la pagina del rivenditore non è raggiungibile in automatico), quindi incompatibili con il vincolo "tutto gratuito" (`Regole_dei_dati.md` del repository Backend). Matteo ha scelto, da un foglio di confronto con nove alternative libere:

- **Manrope** per tutto il testo;
- **Doto a punti tondi** (asse `ROND` = 100) per i numeri di testa, come i numeri a matrice di punti di Nura.

Entrambi **SIL OFL 1.1**, installati da npm (`@fontsource-variable/*`) e serviti in locale: nessuna chiamata a Google Fonts.

### Tema chiaro e scuro (scelta di Matteo)

Requisito del 18/09 era "tema scuro"; flux è chiaro. Scelta: **entrambi, con interruttore** nella barra laterale. Il primo avvio segue l'impostazione del sistema, la scelta resta nel browser; `?tema=chiaro` o `?tema=scuro` nell'indirizzo la forzano. Il tema scuro deriva dalle card scure di flux (`#222124`, `#2C2B2F`, `#4C4B4E`) con la pagina `#19181B`. Tutti i colori sono variabili in `src/stili/tema.css`.

### Colori dei grafici (validati, non a occhio)

Lime e lavanda pastello su bianco hanno contrasto 1,25:1 e 1,94:1: illeggibili come linee. Le serie usano **le stesse tinte portate nella fascia di luminosità leggibile** (calcolo in OKLCH) e sono verificate con il controllo per daltonismo della skill dataviz (protanopia e deuteranopia, tutte le coppie, entrambi i temi):

| Ruolo | Tema chiaro (su `#FFFFFF`) | Tema scuro (su `#222124`) | Esito |
|---|---|---|---|
| Zone a confronto 1 · 2 · 3 | `#8362EC` lavanda · `#6C7A05` lime scurito · `#E87BA4` magenta | `#8362EC` · `#899A03` · `#D55181` | passa tutti i controlli; il magenta su bianco è sotto 3:1, compensato da legenda, etichette e vista tabella |
| Fonti ARPA · OpenAQ · EEA · CAMS | inchiostro · `#2A78D6` · `#1BAF7A` · `#EDA100` | chiaro · `#3987E5` · `#199E70` · `#C98500` | passa; CAMS sempre **tratteggiato** (dato modellato) |
| Mappa (valore del mese) | scala di 5 passi sulla tinta lavanda, dal chiaro (basso) allo scuro (alto) | stessa scala invertita (alto = più luminoso) | luminosità monotona |

Il terzo colore delle zone (magenta) e i colori delle fonti non sono in flux, che ha solo due tinte: vengono dalla palette di riferimento della skill dataviz, già validata, e si cambiano in `tema.css`.

### Impianto della pagina (scelta di Matteo: come il mockup approvato)

Barra laterale → intestazione con l'avvertenza esplorativa → riga dei filtri (mese, inquinante, fonte; fissa in alto) → zone a confronto → numeri di testa → **mappa** + scheda della zona e classifica dei distretti → andamento giornaliero → fonti a confronto → aria · salute · calore → riepilogo per distretto → fonti e licenze.

### I tre confronti (scelti da Matteo)

| Confronto | Dove | Come |
|---|---|---|
| **Zona con zona** | mappa, classifica, andamento, aria · salute · calore, riepilogo | fino a **tre** zone (distretti o comuni); ogni zona tiene il suo colore finché resta nel confronto (togliendone una le altre non cambiano colore); un solo asse, una sola fonte alla volta |
| **Fonte con fonte** | "Fonti a confronto", sulla zona in primo piano | ARPA in un pannello a sé (statistica propria); OpenAQ, EEA e CAMS insieme come gruppo di validazione diretta; tabella di concordanza per coppia, **senza percentuale** dove le statistiche giornaliere differiscono (es. massimo ARPA contro media delle ore) |
| **Aria ↔ salute ↔ calore** | "Aria, salute e calore" | tre grafici impilati sullo stesso asse dei mesi, con il cursore sincronizzato, a **distretto × mese**; mai due scale sullo stesso grafico; i comuni a confronto restano fuori perché i decessi esistono solo per distretto; il calore è dichiarato "non ancora integrato" |

Non scelto: "periodo con periodo" (stesso indicatore in due periodi sovrapposti).

### Requisiti del 18/09 e del 26/09: come sono resi

- **Nessun valore mancante nascosto:** ogni cella senza valore mostra il suo stato — "N/D" (la fonte non copre la zona) o "non utilizzabile" (la copre ma il valore non è valido) — in mappa (contorno puntinato o grigio tratteggiato), schede, grafici (buchi nella linea, stato nel tooltip), tabelle ed esportazione CSV.
- **Dato modellato:** con la fonte CAMS compaiono il badge "dato modellato", l'avviso sopra la pagina e la linea tratteggiata.
- **Esplorativo, non causale:** l'avvertenza arriva dal payload dell'API ed è ripetuta in testa alla pagina e nel confronto aria ↔ salute.
- **Privacy:** i decessi si vedono solo per distretto e mese; per un comune la scheda lo dice esplicitamente.
- **Copertura:** per ogni valore di distretto, quanti comuni con misura su quanti e la quota di residenti coperta; per un comune, quante stazioni con valore su quante.
- **Delta sul periodo precedente:** nella tabella, solo se il mese precedente ha un dataset aria; altrimenti "N/D".

### Scelte fatte nell'implementazione, da confermare con Matteo 🕐

1. ~~**Raggio delle card: 24 px**~~ — **chiuso il 19/10/2026** (passo 5 anti-slop, scelta di Matteo): raggi con ruoli, card 18 px, contenitori 12, controlli 10, segmenti 6, pillola solo per gli stati (`--raggio-*` in `tema.css`).
2. **Classi della mappa:** cinque classi a intervalli uguali fra il minimo e il massimo del mese, ricalcolate a ogni cambio di inquinante, fonte o livello. Nessuna soglia di legge, perché i limiti si riferiscono a statistiche diverse da fonte a fonte.
3. **Stato iniziale:** distretto LE-51 Lecce a confronto (il mockup preselezionava Lecce), PM2.5, fonte ARPA (fonte primaria), ultimo mese con un dataset aria, livello distretti.
4. **Clic su una zona:** il primo clic la mette in primo piano e nel confronto; un secondo clic sulla zona già in primo piano la toglie dal confronto. La croce sul chip la toglie sempre.
5. **Numeri di testa:** valore più alto fra i distretti; distretti con misura e quota di residenti in un comune con stazione; decessi del mese nel Salento (somma dei distretti) con la variazione sul mese prima; giorni coperti dal dataset aria. *(Rivisti il 19/10/2026, passo 4 anti-slop: una sola scheda, «giorni coperti» tolto e ricoveri respiratori aggiunti.)*
6. **Periodo del confronto fra domini:** 6, 12 o 24 mesi fino al mese scelto (12 all'avvio).

### Barra di progressione giorno per giorno (06/10/2026)

Richiesta di Matteo: la dashboard deve far vedere **come cambia la qualità dell'aria nelle varie zone giorno per giorno**, con una barra di progressione e un selettore che allarga o stringe il periodo.

- **Grana della barra: il giorno.** È la grana nativa del dataset aria (comune × giorno, `Regole_dei_dati.md` del repository Backend). La salute e il calore restano a distretto × mese: la barra muove la mappa dell'aria, non il confronto fra domini, che resta mensile.
- **Finestra di default: 7 giorni.** La mappa non mostra il valore di un singolo giorno ma la **media della finestra** che finisce (o è centrata) sul giorno scelto: un giorno solo è troppo rumoroso e, sulle fonti misurate, basta una centralina ferma per svuotare un comune. L'ampiezza si cambia con il selettore del periodo.
- **Massimo per richiesta: 92 giorni.** Oltre un trimestre l'endpoint rifiuta e la grana giusta torna il mese (`/api/aria/mese`). Resta aperto se cambiare grana da soli (giorno → settimana → mese) quando la finestra cresce —.
- **Buchi dell'archivio visibili.** `/api/aria/calendario` dichiara i periodi che nessun dataset copre: la barra li mostra come vuoti invece di scorrere come se la serie fosse continua.
- **Endpoint:** `GET /api/aria/calendario` per l'asse, `GET /api/aria/finestra?da&a&fonte` per i valori (stessa forma di `/api/aria/mese`, stesse regole di aggregazione, stati `VALORE`/`NULL`/`NO_DATA` fino al frontend).
- **Attenzione, verificata il 06/10/2026:** scorrere su un periodo più recente **non riempie i distretti vuoti**. Le stazioni fisiche sono 47, in 21 comuni su 146 e **12 distretti su 20**, e sono le stesse nel 2024, nel 2025 e nel 2026. Negli altri 8 distretti l'unica serie è **CAMS, modellata**: la barra deve renderlo evidente mentre scorre, non lasciarlo capire dal colore.

Da fare nel frontend: componente della barra, selettore dell'ampiezza, collegamento a mappa e grafici, `npm run tipi` per rigenerare `src/api/schema.d.ts`..

## Riprogettazione della dashboard React (09/10/2026)

Dieci modifiche chieste da Matteo dopo aver usato la prima versione. Sostituiscono l'impianto a scorrimento unico descritto sopra ("Impianto della pagina") con un impianto **a tab**, e portano in interfaccia i tre domini insieme invece del solo aria.

### Impianto nuovo: quattro tab

La barra laterale non elenca più ancore della stessa pagina ma **seleziona una tab**:

| Tab | Contenuto |
|---|---|
| **Mappa** | numeri di testa → pannello di dettaglio (sinistra) + mappa + classifica con "Aggiungi al confronto" (destra) → **barra di progressione** → **grafico multi-dominio** → tabella di confronto fra le zone scelte |
| **Fonti a confronto** | lo stesso confronto fonte con fonte di prima, in **tre parti separate: aria, salute, calore** |
| **Riepilogo** | la tabella per distretto, con aggiunta e rimozione dal confronto da un **pulsante più grande** |
| **Informazioni** | come sono stati presi i dati, metodo, limiti e licenze di ogni fonte |

Le **zone a confronto** escono dalla riga dei filtri e diventano una lista nella **barra laterale, sopra il tasto del tema**. Il massimo passa da **3 a 4** zone (`MAX_ZONE` in `localhost/dashboard/src/stato/zone.ts` e in `localhost/server/main.py`, più un quarto colore in `tema.css` da validare per daltonismo come gli altri tre).

Le note di lettura e i commenti vanno **a fondo pagina**, non accanto ai dati.

### Filtri: due righe, fisse

Erano già `position: sticky` (`app.css`): la modifica è di **chiarezza e ordine**, non di comportamento (da verificare che nessun genitore con `overflow` rompa lo sticky quando la pagina diventa a tab).

1. **Prima riga:** periodo · inquinanti · fonti.
2. **Seconda riga:** decessi · malattie · calore (quali domini mostrare).

### Barra di progressione: due livelli

Il **periodo** scelto nei filtri (default **ultimo anno**) è l'estensione della barra; la **finestra** che scorre (default **7 giorni**) è ciò che la mappa colora. Serve perché `/api/aria/finestra` si ferma a **92 giorni** per richiesta: l'anno di default è l'asse, non la richiesta. I buchi dell'archivio (`/api/aria/calendario`) restano vuoti sulla traccia.

### Mappa: un colore, dettaglio su tutto

La mappa resta colorata su **un indicatore alla volta** (non si sovrappongono tre scale sullo stesso poligono), mentre il **pannello di dettaglio** — spostato **a sinistra** della mappa — mostra, per il comune o il distretto cliccato, tutti i valori del periodo:

- **aria:** ogni inquinante × **ogni fonte**, con il nome della fonte accanto al valore;
- **salute:** decessi (v. sotto) e malattie;
- **calore:** temperatura e fonte.

Dove un dato non copre la zona o il giorno, la cella dice `N/D` col motivo, come già previsto sopra ("Nessun valore mancante nascosto"). Dati: `POST /api/valori`, che già restituisce tutti i domini per `giorno` + `comune|distretto`, **esteso ad accettare una finestra `da`/`a`**.

### Grana diversa dalla giornaliera: la convenzione "~" ✅ 09/10/2026

I dati **mensili** e **annuali** si mostrano come valore giornaliero medio, prefissato da **`~`** (es. `~2,3 decessi/giorno`), con nel tooltip il valore originale e la sua grana.

**Solo presentazione.** Il `~` non entra nei dataset, non entra nelle correlazioni e non cambia la grana del confronto fra domini, che resta **distretto × mese** (decisione del 02/10). Motivo: un totale mensile spalmato sui giorni è una funzione a gradini, e correlarla con l'aria giornaliera gonfia la correlazione apparente. Chiude in parte il punto (k) di `Regole_dei_dati.md` del repository Backend (ripartizione temporale): **sì come etichetta, no come dato**.

### Decessi nel pannello ✅ 09/10/2026

Per un **distretto**: totale del mese e accanto la media giornaliera con il `~`, marcata come valore derivato. Per un **comune**: sempre `N/D` con la nota del perché (§7, privacy: i decessi non si mostrano sotto il distretto né sotto il mese).

### Valori di riferimento e distanza dal rischio ✅ 09/10/2026

La tabella dell'aria confronta il valore misurato con **tre riferimenti**: **D.Lgs. 155/2010** (in vigore), **linee guida OMS 2021** (le più severe, base della letteratura sanitaria) e **direttiva (UE) 2024/2881** (limiti dal 2030). Ogni riferimento va citato in stile Chicago in `documentazione/Bibliografia.md` del repository Presentation, con alcuni studi a sostegno, e ripreso nella tesi.

**Vincolo da rispettare: il riferimento va scelto per statistica.** ARPA pubblica il **massimo** giornaliero per NO2, O3, SO2 e CO; OpenAQ, EEA e CAMS la **media** delle ore. Confrontare una media giornaliera con un limite orario sovrastima la conformità. Quindi:

- valore che è un **massimo** → limite orario o su 8 ore di legge;
- valore che è una **media giornaliera** → linea guida OMS a 24 ore (e, per il particolato, limite giornaliero e media annua);
- statistica che non corrisponde a nessun riferimento → la cella dice **non confrontabile**, senza percentuale.

I campi di `data/dataset/aria/anagrafica/inquinanti.json` vanno estesi: oggi c'è un solo `valore_limite` con `periodo_misurazione`, servono i tre riferimenti ciascuno con la propria statistica e la propria fonte normativa. Supera la nota 2 di "Scelte fatte nell'implementazione" ("nessuna soglia di legge"), che resta vera per **la scala di colore della mappa** ma non per la tabella.

### Grafico multi-dominio sotto la mappa

Una linea per ogni inquinante, una per i decessi, una per le malattie, una per la temperatura e una per ogni dato futuro; ciascuna **nascondibile** dalla legenda. Periodo e zona modificabili; la selezione sulla mappa (provincia, distretto o comune) filtra il grafico; **senza selezione** si vede la media di tutti i distretti, con le regole di aggregazione del 02/10 (pesata sui residenti per le grandezze intensive, somma per i conteggi).

Sostituisce e unifica "andamento giornaliero" e "aria · salute · calore", che erano due riquadri separati.

- **Tre unità sullo stesso grafico** (µg/m³, conteggi, °C): due assi — concentrazioni a sinistra, conteggi e gradi a destra — più un interruttore per la vista normalizzata. Supera la regola "mai due scale sullo stesso grafico" della tabella dei tre confronti, che valeva quando i domini stavano su grafici impilati. Da validare con la skill `dataviz` in fase di implementazione.
- **Endpoint nuovo:** `/api/serie?zona&da&a` multi-dominio e multi-inquinante. `/api/aria/serie` non basta: è un mese, un inquinante, al più 3 zone.

### Confronto fra zone: dalla mappa

Il pulsante "Aggiungi al confronto" sta **a destra della mappa** ed è **più grande** (vale anche per il pulsante nella tabella di riepilogo). Le zone scelte compaiono nella barra laterale; fino a **4**. Sotto il grafico, una tabella le confronta **su tutti i dati disponibili**, nel periodo selezionato.

### Cosa nascerà vuoto

- **Malattie:** **tolte dalla dashboard il 03/11/2026** (scelta di Matteo: si usano solo i dati già nel progetto). Prima: nessuna fonte in dashboard. Il PNE (ricoveri per ASL, annuale) e i CSV di Open Salute restano fuori: la riga dice "non ancora integrato" finché il prof. Patrono non sblocca AReSS. Decisione del 09/10/2026.
- **Calore:** si costruisce **subito** il client ERA5-Land (`api/calore/`), senza aspettare Parsec 3,26, così il pannello e il grafico hanno la temperatura reale per comune. Restano in attesa di Sergio Guglielmi solo le scelte di perimetro (soglie di caldo, SUHI da satellite). Decisione del 09/10/2026.
- **Archivio aria:** completo al 09/10/2026 — **34 mesi**, da gennaio 2024 a ottobre 2026 (mese aperto: 1-7 ottobre), tutti con le quattro fonti. L'ultimo anno di default ha quindi dati su tutta la barra; prima del 2024 l'archivio non è ancora stato costruito.

### Ordine di lavoro

| Passo | Cosa | Dipendenze |
|---|---|---|
| 1 | **Client ERA5-Land** e avvio dei prelievi in background (lenti: vanno messi a scaricare presto) | nessuna |
| 2 | Impianto: tab, filtri su due righe, zone nella barra laterale, `MAX_ZONE` a 4 | solo frontend |
| 3 | Barra di progressione e mappa su `/api/aria/finestra` | back-end già pronto |
| 4 | Pannello di dettaglio multi-dominio a sinistra; `/api/valori` esteso alla finestra | passi 1-3 |
| 5 | Riferimenti di legge e OMS: ricerca, campi in `inquinanti.json`, citazioni, colonna in tabella | nessuna |
| 6 | Grafico multi-dominio e `/api/serie` | passi 1 e 4 |
| 7 | Tab "Fonti a confronto" divisa per dominio, "Riepilogo", "Informazioni", note a fondo pagina | passi 2-6 |

### Stato di avanzamento (09/10/2026)

- **Passo 2 fatto:** quattro tab, filtri su due righe, zone a confronto nella barra laterale, `MAX_ZONE` = 4 (quarto colore `--zona-4` ciano, **da validare per daltonismo**).
- **Passo 3 fatto e rivisto:** la barra di progressione sta **sotto i filtri, dentro il blocco fisso**, visibile in tutte le tab.
  - **Asse = tutto l'archivio aria**, diviso in **anni** (tacche forti con l'anno), **mesi** (con il nome, nascosto sotto i 1100 px) e **settimane** (tacche leggere, dal lunedì); i giorni non coperti restano vuoti.
  - **Finestra** = ciò che tutta la pagina legge: **al più un mese (31 giorni)**. La finestra annuale è stata chiesta e poi fermata da Matteo nella stessa sessione. *Default ultimi 7 giorni fino al 28/10/2026; da allora si apre sull'**ultimo mese coperto per intero da tutti i domini** (`periodo_completo` di `/api/aria/calendario`), con il pulsante «Vai agli ultimi giorni» accanto alle date.*
  - Si sposta trascinando, con « » (una finestra) e ‹ › (un giorno), o dal **calendario** che si apre cliccando sulle date: due mesi affiancati, inizio e fine con due clic, preimpostazioni (ultimi 7/14/30 giorni, mese corrente, mese precedente, stesso mese dell'anno prima) e i dodici mesi di un anno a scelta. Se la scelta supera un mese la fine viene accorciata e lo si dice.
  - Sotto la barra, un **resoconto** dei dati disponibili nella finestra: aria (giorni coperti e fonti), decessi (mesi con dati ISTAT), malattie (N/D), calore (mesi ERA5-Land in cache).
  - Il filtro **"Periodo" è stato tolto**: era ridondante con la barra.
- **Passo 4 fatto, con una scelta diversa dalla spec:** invece di estendere `POST /api/valori` (celle stazione × giorno × fonte: troppo grezze per un pannello su una finestra) è nato **`GET /api/zona/dettaglio?zona&da&a`**, già aggregato per dominio. `/api/valori` resta com'è (un giorno).
  - Il **pannello della zona sta a destra** della mappa. Aria: una riga per inquinante, una colonna per fonte, `max` dove la fonte pubblica il massimo giornaliero, `*` sulle fonti modellate. Decessi: somma dei **mesi toccati** dalla finestra e media giornaliera `~` (comune: sempre N/D). Malattie: N/D. Calore: T media, massima, minima.
  - **Diciture brevi:** ogni dato non disponibile è `N/D`, ogni valore non utilizzabile è **`null`** (in tutta la dashboard), con il perché nel tooltip; la legenda è nella tab Informazioni, raggiungibile anche dal link "come leggere" del pannello.
- **Confronto fra zone sotto la mappa, a tutta larghezza:** classifica su due colonne lette dall'alto in basso, pulsante "Aggiungi al confronto" grande nell'intestazione.
- **Tab Informazioni (anticipata dal passo 7):** stati dei valori (valore, N/D, null, max, `*`, `~`), come leggere la mappa, come usare la barra temporale, come leggere il pannello, **come capire se un inquinante supera i livelli consentiti** (tabella dei valori limite e soglie di allarme del D.Lgs. 155/2010 dall'anagrafica, con la regola della stessa statistica; OMS 2021 e UE 2024/2881 arrivano col passo 5), lettura esplorativa dei dati.
- **Uniformità:** mappa, classifica, numeri di testa, pannello della zona e riepilogo leggono **la stessa finestra**; la variazione del riepilogo è sulla finestra precedente di pari ampiezza. Fanno eccezione, fino ai passi 6-7, i grafici sotto la mappa e la tab "Fonti a confronto", che leggono ancora il mese in cui finisce la finestra.
- **Caricamento non bloccante:** una **rotellina in alto a destra** gira finché c'è una richiesta all'API in corso. Ogni vista tiene i dati precedenti, nitidi e cliccabili, e li sostituisce **solo a caricamento completato** (`keepPreviousData` come default di react-query, dati in memoria 30 minuti): pagina e altre tab restano usabili. Anche titoli ed etichette seguono i dati mostrati, non la nuova scelta. Al primo caricamento, senza dati precedenti, pannello e legenda dicono "in caricamento" invece di N/D. Tolta l'attenuazione grigia delle viste in aggiornamento.
- **Restano:** passo 5 (riferimenti normativi), passo 6 (grafico multi-dominio e `/api/serie`), passo 7 (tab "Fonti a confronto" per dominio, note a fondo pagina); validazione per daltonismo di `--zona-4`.

## Ritocco di densità/leggibilità e indice di salubrità (11/10/2026)

Richiesta di Matteo dopo aver usato la versione a tab: interfaccia più densa, pulsanti più grandi, mappa più ordinata, e un **indice di salubrità dell'aria rispetto ai limiti di legge** (per inquinante e complessivo). Chieste e **decise** quattro cose:

1. **Mappa «incasinata»** — da sistemare: (a) controlli e legenda sparsi → raccolti e snelliti (legenda in **una barra unica** scala + stati, tolto il paragrafo ridondante già in Informazioni); (b) **inquadratura/zoom** → `maxBounds` + `minZoom` sui confini dei distretti, così il Salento resta sempre inquadrato e non ci si perde nel mare; (c) **colori dei poligoni** → rampa lavanda a fascia di luminosità allargata e `fillOpacity`/bordi più marcati. I pallini delle stazioni vanno bene così.
2. **Indice generale** = **peggiore inquinante** (stile EAQI europeo / IQA italiano): niente pesi arbitrari, difendibile in tesi. Non una somma né una media.
3. **Riferimenti** = **tutti e tre** (D.Lgs. 155/2010 + OMS 2021 + direttiva UE 2024/2881), ciascuno con la **propria statistica** (regola del passo 5: un massimo giornaliero si confronta con un limite orario/8h, una media con la linea guida a 24h o la media annua; dove la statistica non corrisponde → «non confrontabile»).
4. **Colore mappa** = **nuova modalità selezionabile**: interruttore «valore» (scala attuale min-max della finestra) / «salubrità» (fasce verde→rosso rispetto ai limiti). La scala attuale **non** viene sostituita.

### Tappa A — fatta l'11/10/2026 (solo frontend, nessun dato nuovo)

- **Densità e dimensioni:** testo base 14→13 px, titolo pagina 36→31, numeri Doto a punti 46→40, card `22/24`→`16/18` padding e gap 16→12, gap pagina 20→14, barra laterale e filtri più compatti. **Pulsanti più grandi** (più padding/area di click): pillole, segmenti, voci di navigazione, chip delle zone, pulsanti del calendario.
- **Pannello della zona = altezza della mappa, sempre:** la riga `.griglia-mappa` è `align-items: stretch`, il pannello è in posizione assoluta nella sua colonna e **scorre al suo interno** se il contenuto supera l'altezza della card mappa (impilato sotto i 1280 px torna nel flusso normale). File: `localhost/dashboard/src/stili/app.css`.
- **Mappa riordinata:** legenda in una barra unica (`App.tsx` `LegendaMappa`), inquadratura stabile con `maxBounds`/`minZoom` (`MappaZone.tsx` `AdattaVista`), rampa allargata (`tema.css`) e `fillOpacity` 0.78→0.9 con bordi più marcati.

### Tappa B — indice di salubrità (è il «passo 5» ampliato)

**Ricerca normativa fatta l'11/10/2026** → `data/dataset/aria/Valori_Riferimento_Normativi.md`: valori limite per PM2.5, PM10, NO2, O3, SO2, CO e benzene nei **tre riferimenti** (D.Lgs. 155/2010, OMS 2021, UE 2024/2881), ciascuno con la sua statistica, verificati da EEA/OMS/GU e citati in Chicago (`documentazione/Bibliografia.md` del repository Presentation, chiavi `dlgs_155_2010`, `who_aqg_2021`, `dir_ue_2024_2881`). Il report elenca anche le **correzioni** da fare in `inquinanti.json` (NO2/O3/SO2 hanno la statistica sbagliata oggi).

#### Backend — fatto il 12/10/2026

- **Dato normativo autorevole nel codice**, non nel JSON fragile: `RIFERIMENTI_NORMATIVI` in `api/aria/anagrafica_aria.py` tiene, per i 7 inquinanti con limiti, la terna legacy (`periodo_misurazione`/`valore_limite`/`soglia_allarme` = D.Lgs. in vigore) e i tre blocchi `riferimenti.{dlgs_155_2010, oms_2021, ue_2024_2881}` + `soglie_acute`. `_applica_riferimenti()` li riapplica a **ogni** salvataggio dell'anagrafica (anche in `aggiorna_descrizioni_inquinanti`, che non prende più i limiti da ARPA), così una rigenerazione non li azzera più. Le colonne `riferimenti`/`soglie_acute` sono nello `SCHEMA_INQUINANTI`. Statistiche: `media_annua | media_24h | massimo_orario | massimo_8h | peak_season | media_10min`.
- **Motore** `localhost/server/salubrita.py` (puro, legge `RIFERIMENTI_NORMATIVI`, non il JSON): confronto **solo a parità di statistica** (map `COMPATIBILITA`). Dato *media giornaliera* → limite *media 24 h* (giorni di superamento) e *media annua* (media della finestra, **indicativa** perché la finestra è ≤ 1 mese); dato *massimo orario del giorno* (ARPA NO2/O3/SO2) → *massimo orario* (giorni col massimo oltre soglia); dato *max 8 h* (ARPA CO) → *max 8 h*. **O3 risulta spesso «non confrontabile»**: i suoi limiti sono su max-8h e peak-season, né la media né il massimo orario li coprono — è un limite metodologico dichiarato (buono per la tesi). Bande: `buona/accettabile/scadente/cattiva/non_confrontabile` (soglie: media/limite ≤0,5/≤1/≤1,5; frazione di giorni oltre 0/≤0,10/≤0,25). Indice per inquinante = **peggiore esito del D.Lgs. 155/2010** (la legge in vigore guida la banda; OMS e UE restano negli esiti); indice di zona = **peggiore inquinante**.
- **Endpoint:** `/api/zona/dettaglio` ora porta `salubrita: SalubritaZona` (per inquinante, con tutti gli esiti per fonte e quadro) calcolata dai **valori giornalieri** della finestra (al più due mesi); `/api/disponibilita` arricchisce ogni inquinante con `riferimenti` e `soglie_acute` (dalla costante, robusti). Verificato su dati reali (BR-01, giugno 2024).

#### Frontend — pannello e Informazioni fatti il 12/10/2026

- `src/api/schema.d.ts` rigenerato (ora porta `SalubritaZona`/`SalubritaInquinante`/`EsitoRiferimento`/`RiferimentoLimite`); tipi esportati in `src/api/client.ts`; helper e metadati delle bande in `src/lib/salubrita.ts` (etichette, ordine, colori, `bandaQuadro`, `descriviEsito`).
- **Pannello** (`DettaglioZona.tsx`): nuova sezione «Salubrità aria» con la **banda di zona** (= peggiore inquinante) in testa e una tabella **inquinante × tre quadri** (D.Lgs./OMS/UE): ogni cella è una pill colorata della banda (peggiore esito di quel quadro) col dettaglio degli esiti nel tooltip; «—» dove non confrontabile.
- **Informazioni** (`Informazioni.tsx`): la card dei limiti è diventata «Salubrità rispetto ai limiti di legge» con la **legenda delle cinque bande**, la nota sull'O3 non confrontabile e la **tabella dei tre quadri** (tutti i limiti per statistica, da `inquinanti.riferimenti`).
- **Bande di colore** in `tema.css` (chiaro/scuro, verde→rosso con luminosità separata per daltonismo) e in `token.tsx` (per la futura mappa).

#### Colore «salubrità» della mappa — fatto il 12/10/2026

- **Endpoint** `GET /api/aria/salubrita?da&a` ([main.py](https://github.com/UniSalento-IDALab-corsoPerfez-25-26/perfez-2526-Backend-Leopizzi/blob/main/localhost/server/main.py), `aria_salubrita`): banda di salubrità (D.Lgs. 155/2010, peggiore inquinante) di **tutte** le zone (20 distretti, 146 comuni) nella finestra, dai valori giornalieri uniti sui mesi toccati. Modello `RispostaSalubritaMappa`/`SalubritaZonaMappa`. Verificato su giugno 2024 (tutte le zone coperte, CAMS incluso).
- **Interruttore «valore»/«salubrità»** nelle azioni della mappa ([App.tsx](../src/App.tsx)); la finestra della salubrità si scarica solo quando la modalità è attiva (`useSalubritaMappa`, `enabled`).
- **`MappaZone.tsx`**: in modalità salubrità i poligoni usano il colore della banda (token risolti, non `var()`), tooltip con banda + inquinante peggiore; «valore» resta la scala relativa min-max. `LegendaMappa` mostra le **cinque bande** in modalità salubrità, la scala e gli stati stazione in modalità valore. Corretti anche due errori Leaflet pre-esistenti (`getBoundsZoom` ← `L.point`), ora `tsc -b` è pulito.

La **Tappa B è completa** (pannello, Informazioni, mappa). Dopo un cambio al server va **riavviato** (`uv run localhost/server/main.py`) per servire i nuovi endpoint.

#### Interazione della mappa cambiata il 12/10/2026

Su richiesta di Matteo: **singolo clic** su una zona = la porta nel **pannello di dettaglio a destra** (focus, senza toccare il confronto); **doppio clic** = aggiunge/toglie la zona dal **confronto** (prima il singolo clic faceva entrambe le cose). Disabilitato lo zoom da doppio clic di Leaflet (`doubleClickZoom={false}`) perché ora il doppio clic serve al confronto. Handler `onDettaglio`/`onConfronto` in `MappaZone.tsx`, `dettaglioZona`/`confrontaZona` in `App.tsx`. Il pannello mostra una **progress bar indeterminata** in cima (`.barra-caricamento`) mentre `useDettaglioZona` sta recuperando i dati (`dettaglio.isFetching`), tenendo visibili i dati precedenti sotto; è del colore del testo (`--testo`: near-nero sul tema chiaro, near-bianco sullo scuro) e **inset** dai bordi arrotondati della card (left/right 18 px, raggio a pillola) così non deborda sugli angoli tondi.

**Visibilità della mappa (12/10/2026):** per far vedere di più la base sotto i colori, l'`fillOpacity` dei poligoni è sceso da 0,9 a **0,72** (NULL 0,4, non confrontabile 0,38). Scelta di Matteo fra le alternative gratuite senza chiave: **restare su OpenStreetMap** schiarendo il filtro in scala di grigi (`--tile-filtro`: `grayscale(1) contrast(0.9) brightness(1.14)` sul chiaro, `invert(1) grayscale(1) brightness(0.74) contrast(1.08)` sullo scuro) invece di passare a CARTO Positron. Così strade e coste restano leggibili sotto il choropleth.

## Tab «Stagionalità»: i periodi dell'anno a confronto (16/10/2026)

Richiesta di Matteo: una sezione che confronti **i periodi dell'anno su tutti i parametri disponibili**, per vedere **cosa è cambiato oggi rispetto agli anni scorsi e cosa resta invariato**, con la classificazione dell'andamento di ogni inquinante e un quadro d'insieme di aria, salute e calore. Domande a cui risponde:

1. quale periodo dell'anno ha **più accessi al pronto soccorso**;
2. quale ha **l'aria più inquinata**;
3. quale è **il più caldo**;
4. quale ha **più decessi**;
5. quale è **il periodo peggiore**, inteso come unione di tutti i problemi.

Strutturata insieme a Matteo nella sessione del 16/10/2026. Le scelte segnate ✅ sono sue, quelle segnate 🕐 sono proposte da confermare.

### Dati disponibili e limiti dichiarati

| Dominio | Copertura oggi | Grana usata qui |
|---|---|---|
| Aria | 2024-01 → 2026-10 (archivio mensile) | zona × mese |
| Calore (ERA5-Land) | 2024, 2025-01 → 05, 2026-01 → 10 (il resto del 2025 è in scaricamento) | zona × mese |
| Decessi ISTAT | 2011-01 → 2026-06 | distretto × mese (privacy §7) |
| **Pronto soccorso** | **nessuna fonte pubblica** a grana mensile (v. `documentazione/Scelte_Progettuali.md` del repository Presentation, riga del 16/10 sugli accessi al PS) | — |

- **La domanda 1 oggi resta senza risposta:** la riga PS si mostra come `N/D` col motivo nel tooltip ("nessuna fonte pubblica degli accessi al PS per mese; in attesa di AReSS") e **non entra nel periodo peggiore** finché non c'è un dato. Quando arriverà, entrerà come quarto dominio senza cambiare la regola.
- **Per l'aria "gli anni scorsi" sono 2024 e 2025:** la classificazione dell'andamento si regge su 1-2 valori per mese ed è dichiarata **indicativa** nell'interfaccia.
- Tutto resta **esplorativo, non causale** (avviso in testa alla tab), e la vista «Tutte» dichiara la quota di **dato modellato** (CAMS).

### Scelte

- ✅ **Unità del periodo = mese** (12 periodi). Coincide con la grana minima dei decessi e con il confronto fra domini già deciso (distretto × mese).
- ✅ **Zona = Salento intero di default + selettore per un distretto.** Niente comuni (privacy dei decessi). Salento = media pesata sui residenti dei 20 distretti per aria e temperatura, somma per i decessi (regole del 02/10).
- ✅ **Fonte aria = vista «Tutte» di default + selettore** per una singola fonte. ARPA resta selezionabile a sé.
- ✅ **Decessi come media giornaliera del mese** (totale ÷ giorni del mese, con la convenzione `~`), così febbraio non risulta "migliore" solo perché è più corto.
- ✅ **Anni del confronto = gli stessi per tutti i domini (dal 2024).** Lo storico dei decessi 2011-2023 compare **solo nel grafico anno su anno**, non nel calcolo dei ranghi.
- ✅ **Periodo peggiore = somma dei ranghi.** Ogni dominio ordina i 12 mesi da 1 (migliore) a 12 (peggiore) sulla media degli anni disponibili; il periodo peggiore è il mese con la somma più alta. Niente pesi né normalizzazioni da difendere in tesi. A pari merito si usa il rango medio. *(Superato il 29/10/2026: v. «Stagionalità più chiara», in fondo.)*
- ✅ **Riga «aria complessiva» = rango medio dei 5 inquinanti di riferimento**, poi riordinato da 1 a 12. Colore della riga e delle celle degli inquinanti:
  - **rosso**: in quel mese è superato un limite del **D.Lgs. 155/2010**, valutato con il motore della salubrità (`localhost/server/salubrita.py`, confronto solo a parità di statistica);
  - **giallo**: è il mese con il rango medio più alto, ma senza limiti superati;
  - gli altri mesi in scala neutra per rango.
- ✅ **Andamento = ±10% sulla media dello stesso mese degli anni precedenti**: sopra +10% è "in aumento", sotto −10% "in calo", altrimenti "stabile". "Storico insufficiente" se manca lo stesso mese negli anni precedenti.
- ✅ **Cosa vuol dire "supera il limite" in un mese** (CO e O3 «non confrontabili» confermato da Matteo il 16/10). Matteo ha chiesto perché non tutti gli inquinanti si possono confrontare (spiegazione qui sotto, "Perché non tutti gli inquinanti hanno un limite confrontabile"). Implementato come proposto: il mese è rosso se almeno un esito del D.Lgs. 155/2010 è superato. Con «Tutte» contano **tutte le fonti reali**, come nel pannello della zona; per il Salento un limite è superato se lo è **in almeno un distretto**, perché una media su tutto il territorio diluirebbe il superamento di una zona. Il confronto della media del mese con un limite annuo è segnato come **indicativo** nel tooltip.
- ✅ **Temperatura: "il periodo più caldo" ordinato sulla media mensile della T massima giornaliera** (esposizione diurna), con la T media nel dettaglio. Per l'andamento la soglia è **±1 °C** invece del ±10%: sui gradi Celsius una percentuale non ha senso (lo zero è convenzionale). Confermato da Matteo il 16/10.
- ✅ **"Oggi" = l'ultimo mese completo di ciascun dominio** (oggi aria e calore settembre 2026, decessi giugno 2026). Il mese in corso, ancora incompleto, resta fuori sia dai ranghi sia dall'andamento. Su richiesta di Matteo i mesi senza dato si **mostrano**: una striscia «copertura» in testa alla tab dice, per dominio, l'ultimo mese completo e i mesi fino a oggi che sono `N/D`, col motivo (ISTAT pubblica con qualche mese di ritardo, ERA5-Land con circa una settimana, il mese d'aria in corso è incompleto, nessuna fonte per il PS). Anche le celle anno × mese senza dato sono `N/D` col motivo, nel grafico e nella sua tabella.
- ✅ **Calcolo: riassunti mensili preparati da uno script e tenuti** (scelta di Matteo). `scripts/dashboard/prepara_stagionalita.py` scrive un JSON per mese e dominio in `data/interim/stagionalita/` (gitignored) e **ricalcola solo i mesi non ancora preparati**, oppure quelli il cui file d'origine è cambiato (firma nome + mtime, come `CacheAria`: in pratica solo il mese d'aria aperto). Il server tiene in memoria i riassunti letti e non calcola mai un mese dentro una richiesta; i mesi da preparare li dichiara in `mesi_da_preparare`, e la tab mostra il comando da lanciare. Prima esecuzione: circa 14 s per mese d'aria, circa 8 minuti per i 34 mesi.

#### Perché non tutti gli inquinanti hanno un limite confrontabile

Ogni valore limite di legge è definito su una **statistica precisa**, cioè su come si fa la media nel tempo: media annua, media sulle 24 ore, massimo orario, massimo della media mobile su 8 ore. Confrontare un dato con un limite ha senso solo se il dato è **la stessa statistica** (regola del 09/10, `Valori_Riferimento_Normativi.md`). Le fonti pubblicano statistiche diverse:

- OpenAQ, EEA, CAMS e la vista «Tutte» danno la **media giornaliera** (media delle ore);
- ARPA dà la media giornaliera per PM10 e PM2.5, il **massimo orario del giorno** per NO2, O3 e SO2, il **massimo della media mobile su 8 ore** per il CO.

| Inquinante | Limiti del D.Lgs. 155/2010 | Media giornaliera (Tutte, OpenAQ, EEA, CAMS) | ARPA |
|---|---|---|---|
| PM2.5 | media annua 25 µg/m³ | ✅ media del mese vs media annua, **indicativo** | ✅ come a sinistra |
| NO2 | media annua 40; orario 200 µg/m³ | ✅ media del mese vs media annua, indicativo | ✅ massimo orario vs 200 |
| SO2 | media 24 h 125; orario 350 µg/m³ | ✅ giorni oltre 125 | ✅ massimo orario vs 350 |
| CO | max media 8 h 10 mg/m³ | ❌ la media delle 24 ore è sempre ≤ del massimo delle 8 ore: il confronto **sottostimerebbe** il superamento | ✅ è la stessa statistica |
| O3 | valore obiettivo sul max media 8 h, 120 µg/m³ (25 giorni/anno su 3 anni) | ❌ l'ozono ha un ciclo giornaliero forte (picco nel pomeriggio, minimo di notte): la media giornaliera è molto più bassa del massimo delle 8 ore | ❌ il massimo orario non è il massimo delle 8 ore (si potrebbe confrontare con la *soglia di informazione* oraria di 180, che però è una soglia d'allerta, non un limite) |

Quindi: con «Tutte» o una sola fonte a media, **CO e O3 non diventano mai rossi**. Il CO lo diventa solo dove c'è ARPA, perché con «Tutte» i limiti si valutano su tutte le fonti reali. L'O3 non è confrontabile con nessuna fonte. Per confrontarlo servirebbe calcolare il massimo della media mobile su 8 ore dalle **misure orarie** (EEA e OpenAQ le danno, e la cache EEA le contiene già): oggi la pipeline le riduce subito alla media del giorno. È un'estensione possibile, non fatta.

Opzioni valutate; **scelta (a)** da Matteo il 16/10/2026 ("per ora CO e O3 restano non confrontabili"), le altre restano come sviluppo possibile:
- (a) lasciare così, con "non confrontabile" dichiarato per CO e O3: **scelta e implementata**;
- (b) usare per CO e O3 la **soglia di informazione** o le linee guida OMS (il CO ha una linea guida OMS sulle 24 ore, 4 mg/m³, confrontabile con la media giornaliera), sapendo che non sono il limite di legge;
- (c) aggiungere alla pipeline aria il **massimo della media mobile su 8 ore** calcolato dalle ore di EEA/OpenAQ, per poter confrontare O3 e CO con la legge.

### Impianto della tab (fatto il 16/10/2026: `localhost/dashboard/src/componenti/Stagionalita.tsx`)

Una nuova voce di navigazione, **«Stagionalità»**, fra Riepilogo e Informazioni. Ha una riga di controlli propria (zona, fonte aria, indicatore del grafico) e **non usa la barra temporale**, perché lavora su tutto l'archivio e non su una finestra.

- **A. Calendario dei problemi**: griglia 12 mesi × righe (CO, NO2, O3, PM2.5, SO2, *aria complessiva*, temperatura, decessi/giorno, PS `N/D`). Ogni cella mostra il valore medio del mese e il suo rango come intensità di colore; il mese peggiore di ogni riga è evidenziato, con rosso o giallo per l'aria come sopra.
- **B. Periodo peggiore**: una riga in fondo alla griglia con la somma dei ranghi e i **tre mesi peggiori** in evidenza, più una frase di sintesi ("Il periodo più critico è …: è il peggiore per … e tra i peggiori per …"). *(Superato il 29/10/2026: v. «Stagionalità più chiara», in fondo.)*
- **C. Oggi rispetto agli anni scorsi**: due elenchi affiancati, **"Cosa è cambiato"** (in aumento / in calo, con Δ%) e **"Cosa resta invariato"** (stabile), una voce per inquinante e dominio, con l'etichetta "indicativo" dove lo storico ha un solo anno.
- **D. Anno su anno**: un grafico a linee sui 12 mesi con una linea per anno per l'indicatore scelto. Per i decessi la linea copre il 2011 → oggi, con gli anni COVID 2020-2022 tratteggiati.

### Lato server (fatto il 16/10/2026: `localhost/server/dati_stagionalita.py`, `GET /api/stagionalita`)

- **Endpoint** `GET /api/stagionalita?zona=SALENTO|<id_distretto>&fonte=<fonte|Tutte>`: per ogni indicatore restituisce i valori anno × mese con stato e nota, la media per mese, i ranghi, l'esito dei limiti per mese, l'andamento dell'ultimo mese completo, e poi la riga "aria complessiva" e la riga "periodo peggiore". Le colonne sono generiche, come in `/api/riepilogo`: un dominio nuovo (il PS) si aggiunge come riga senza toccare il frontend.
- **Costo:** servono gli aggregati di **tutti i mesi** dell'archivio, circa 33 mesi a 8-25 s ciascuno, cioè diversi minuti a freddo. È il caso già previsto il 02/10 ("`prepara_viste.py` resta un'opzione se serviranno molti mesi alla volta"). Proposta: uno script `scripts/dashboard/prepara_stagionalita.py` scrive un riassunto zona × mese in `data/interim/stagionalita/` (gitignored), e il server lo legge e lo ricalcola solo per i mesi il cui file d'archivio è cambiato (stessa firma di `CacheAria`). L'alternativa è calcolarlo in background all'avvio del server, con la tab che dice "in preparazione" finché non è pronto.

### Completamento della tab (16/10/2026)

Richiesta di Matteo: «completa l'implementazione della nuova sezione». Aggiunti:

- **Dettaglio del mese** (`DettaglioMese` in `Stagionalita.tsx`): clic su una colonna o su una cella della griglia → ogni indicatore in quel mese **anno per anno** (2024, 2025, 2026), con media, rango e **Δ** dell'anno più recente completo sulla media dei precedenti (stessa soglia dell'andamento: ±10%, ±1 °C). Le celle senza dato sono `N/D` col motivo, i mesi incompleti «parziale», i limiti toccati col segno rosso «!». Di default il mese è il **periodo peggiore**. Risponde a "cosa è cambiato in questo periodo rispetto agli anni scorsi" per un periodo qualsiasi, non solo per l'ultimo mese.
- **Esporta CSV** in formato lungo (indicatore × anno o «media» × mese, con stato, completezza, rango e limite), come il riepilogo.
- **Legenda nella tab Informazioni** («Come leggere la tab Stagionalità»): mese dell'anno, rango, aria complessiva, rosso/giallo, CO e O3, periodo peggiore, cosa è cambiato, dettaglio del mese, avvertenza esplorativa.
- **Filtri e barra temporale nascosti** in questa tab (non la influenzano); l'avvertenza esplorativa resta una sola, nel piede.
- **Tab nell'indirizzo** (`#stagionalita`, `#riepilogo`, `#info`, ...): una sezione si apre o si condivide direttamente; vale per tutte le tab.
- **Verificata a schermo** (Chrome headless sul tema scuro, Salento, «Tutte»): griglia, copertura, dettaglio, cambiamenti e grafico anno su anno si leggono; lo storico dei decessi 2011-2023 è in grigio con gli anni COVID tratteggiati.

**Aggiornamento dei dati:** dopo ogni `genera_dataset_aria.py --continua` (o un nuovo scarico ERA5-Land) va rilanciato `uv run scripts/dashboard/prepara_stagionalita.py`, che rifà solo il mese aperto o i mesi nuovi; finché non si fa, la tab elenca i mesi da preparare.

### Quando intervenire: le criticità dell'anno (27/10/2026)

Richiesta di Matteo: il primo blocco della tab deve riassumere **le criticità dell'anno su tutti i domini** (affluenza al PS, accessi degli assistiti ADI, temperatura, inquinanti, ...) e dire **in quali mesi bisogna intervenire di più**. Scelte di Matteo fra le opzioni proposte:

- **Criterio:** un mese è **critico** per un tema se è **fra i suoi 3 mesi peggiori** (rango > n − 3: a pari merito entrano tutti; servono almeno 6 mesi con un rango). Scartate la soglia «oltre il 10% sulla media annua» (arbitraria e diversa per ogni unità) e la sola somma dei ranghi (una classifica unica mescola inverno ed estate: luglio usciva terzo).
- **Un indicatore per tema**, sei temi senza pesi: aria complessiva, temperatura massima, decessi, accessi in PS, accessi in PS degli assistiti ADI, ricoveri respiratori (gli ultimi tre **simulati**). Gli altri indicatori (5 inquinanti, PS respiratori e cardiovascolari, ricoveri circolatori, ADI a bassa urgenza e ritorni entro 30 giorni) sono il **dettaglio** dei periodi e non pesano sul conteggio, così il dato simulato non conta otto volte.

Regole derivate: i mesi vicini critici per almeno due temi formano un **periodo** (circolare: dicembre è vicino a gennaio); livello del mese **alta** se è critico per almeno metà dei temi (e almeno 2), **media** per 2 o più, **bassa** per 1, con i colori delle bande di salubrità; i periodi si ordinano per temi nel mese di picco; i mesi critici per un solo tema fuori dai periodi sono «da tenere d'occhio». Lo stesso interruttore «nella sintesi» toglie i simulati anche da qui (allora i temi sono tre). Il «periodo peggiore» (somma dei ranghi) resta com'era in fondo alla griglia; le nuove righe ADI e ricoveri entrano nella griglia ma non nella somma.

Impianto (`localhost/dashboard/src/componenti/CriticitaAnno.tsx`, primo card della tab con i controlli):

1. **Frase di sintesi** (dal server) e avviso giallo sui temi simulati.
2. **Schede dei periodi** affiancate: numero d'ordine, mesi, livello, «a gennaio 5 temi su 6»; per ogni tema critico il mese peggiore nel periodo, valore, scarto sulla media dei 12 mesi (°C per la temperatura, % per gli altri) e posizione (1°-3°); gli inquinanti e gli altri indicatori critici nel periodo; i limiti del D.Lgs. 155/2010 toccati; **«Dove agire»**, spunti da valutare (non prescrizioni) legati ai temi: ADI → telefonate e visite domiciliari (medici di famiglia, volontariato), caldo → contatti con i fragili e protezione civile, PS → turni, ricoveri → posti letto, aria → avvisi alle persone con malattie respiratorie e cardiache.
3. **Da tenere d'occhio**: mesi critici per un solo tema.
4. **Calendario temi × mesi**: i 3 mesi peggiori di ogni tema come segni 1° 2° 3°, le colonne dei periodi su fondo più scuro, in fondo il numero di temi critici per mese col colore del livello. Clic su un mese o sul titolo di un periodo → dettaglio anno per anno.

Lato server: `criticita()` in `localhost/server/dati_stagionalita.py`, campo `criticita` (`CriticitaAnno`) in `GET /api/stagionalita`; i mensili simulati di tutti gli indicatori si leggono in una volta (`INDICATORI_SIMULATI`). Prima risposta ~12 s a freddo, poi < 1 s. Esito sul Salento (scenario «letteratura», «Tutte»): **dicembre–febbraio** (alta: aria, decessi, PS, ADI, ricoveri; 5 temi su 6 a gennaio e febbraio) e **luglio–agosto** (media: temperatura, ADI, aria per O3 e SO2); da tenere d'occhio marzo (aria) e giugno (temperatura). Senza simulati: gennaio–febbraio (aria, decessi) e agosto (aria, temperatura).

---

## Dati sanitari simulati in dashboard: piano (25/10/2026)

**Stato (25/10/2026, sera): fatto**, con le scelte di Matteo sui quattro punti da decidere (in fondo). Differenze dal piano: il selettore dello scenario sta **accanto alle date della barra temporale** (nella riga dei filtri spingeva i domini nel menu «altri…»); in più c'è `GET /api/salute/simulati/finestra` per la tessera dei numeri di testa; il colore del simulato è il **giallo del tema** (`--lime`, quello del quadrato del marchio; `--simulato*` in `tema.css`): card, sezioni, righe e badge su **giallo pieno con la scritta nera**, in entrambi i temi (richiesta di Matteo dopo una prima versione in viola), mai il colore di una serie. Verificato con `curl` (distretto = somma dei comuni, scenari diversi d'estate) e a schermo nel tema chiaro (pannello, tessera, confronto, Riepilogo, Stagionalità); `tsc -b` pulito.

*Piano originale. Richiesta di Matteo: aggiungere ai dati disponibili della dashboard i dati sanitari simulati (`data/dataset/salute/simulati/Dati_Simulati.md`), con un pulsante per scegliere fra scenario **nullo** e scenario **letteratura**, i **due scenari sovrapposti** nel grafico del confronto, la riga **PS** in Stagionalità e una card che spiega tutto nella tab Informazioni.*

### Dati di partenza

- `data/interim/salute/simulati/salute_simulata.parquet` (rigenerato da Matteo il 25/10/2026, modello 1.1): **comune × giorno**, 145 comuni, **2024-01-01 → 2026-09-30**, 2.620.440 celle, due scenari, nessun giorno senza esposizione. Colonne: `scenario, id_comune, id_distretto, data, indicatore, valore, stato, nota`.
- `parametri.json` accanto: versione, seme, periodo, **dicitura** (testo autorevole), indicatori con etichette, parametri con le fonti. La dashboard **legge la dicitura da qui** (tramite il server), non la ricopia.
- Indicatori: `ricoveri_respiratori`, `ricoveri_circolatori`, `ps_accessi`, `ps_respiratori`, `ps_cardiovascolari`, `adi_assistiti` (stock), `adi_accessi_ps`, `adi_accessi_bassa_urgenza`, `adi_ritorni_30g`.
- Restano fuori: le **malattie croniche** (riga `N/D` com'è) e i **decessi**, che restano quelli reali ISTAT.

### Regole di presentazione

1. **Il simulato non si confonde mai col reale**: etichetta «Dato simulato, non reale» su ogni card, sezione o colonna che lo mostra (componente `BadgeSimulato`, come `BadgeModellato`), con la dicitura completa nel tooltip. Nei grafici le serie simulate hanno un **tratto proprio**; decessi e dimissioni HFA restano come sono.
2. **Scenario unico per tutta la pagina** (come la finestra temporale): default **`letteratura`**, lo scenario usato in tesi. Il pulsante sta nella seconda riga dei filtri; in Stagionalità, dove i filtri sono nascosti, c'è un selettore uguale legato allo stesso stato.
3. **Grana**: il dato è sintetico, quindi la regola di privacy dei decessi (§7) non si applica. Pannello e confronto accettano **comuni e distretti**; il distretto è la **somma** dei comuni (conteggi, regola di `api/comune/aggregazione.py`). Nei grafici e nelle tabelle i valori sono **per 100.000 residenti al giorno**, così zone di dimensioni diverse si confrontano; nel pannello c'è anche il totale della finestra.
4. **Convenzione `~`** invariata: il simulato è già giornaliero, quindi niente `~` sui valori giornalieri; `~` solo dove si mostra una media del mese.
5. **Lettura esplorativa**: nello scenario `letteratura` l'effetto di aria e caldo è **imposto da noi**; lo dice la dicitura e lo ripete la card in Informazioni.

### Lato server (`localhost/server/`)

| Passo | Cosa | Dove |
|---|---|---|
| S1 | **`dati_simulati.py`**: `ArchivioSimulato` legge parquet e `parametri.json` e si ricarica se il file cambia (mtime, come `ArchivioDimissioni`); prepara in memoria la somma per distretto e per Salento (comune → distretto) e le medie mensili. Funzioni: `finestra(zona, da, a, scenario)`, `serie_mensile(zone, mesi, indicatore)` (**entrambi gli scenari** in una risposta), `clima_mensile(zona, scenario, indicatore)` per Stagionalità | nuovo modulo |
| S2 | **Modelli**: `InfoSimulati` (disponibile, versione, periodo, scenari, dicitura completa e breve, indicatori con etichetta e unità), `DettaglioSimulati` (scenario, residenti, righe per indicatore: totale della finestra, al giorno, per 100.000 residenti al giorno; per ADI anche assistiti, quota a bassa urgenza, quota di ritorni), `RispostaSerieSimulata` (per zona e indicatore: punti mensili con `nullo`, `letteratura` e differenza %), `simulata: bool` in `ColonnaRiepilogo` e nella riga di Stagionalità | `modelli.py` |
| S3 | **`/api/disponibilita`** + campo `simulati: InfoSimulati`, dicitura compresa: il frontend ha una sola fonte del testo | `main.py` |
| S4 | **`/api/zona/dettaglio`** + parametro `scenario` (default `letteratura`) e campo `simulati: DettaglioSimulati`, per comune e distretto. Fuori dal periodo simulato: `NO_DATA` con nota | `main.py` |
| S5 | **Nuovo `GET /api/salute/simulati/serie?zone&da&a&indicatore`** (mesi `AAAA-MM`, al più 4 zone, comuni ammessi): i due scenari insieme, per 100.000 residenti al giorno | `main.py` |
| S6 | **`/api/riepilogo`** + parametro `scenario` e colonne `sim:*` nel gruppo «Salute simulata»: ricoveri respiratori e circolatori, PS, PS respiratori, accessi ADI, ADI a bassa urgenza (%), ritorni ADI (%), tutte con `simulata: true`. `TabellaRiepilogo.tsx` resta generica | `main.py` |
| S7 | **`/api/stagionalita`** + parametro `scenario`: la riga `pronto_soccorso` passa da `_riga_nd` a una riga vera, accessi in PS al giorno (media del mese) dal simulato, `simulata: true`; resta fuori dal periodo peggiore (v. punti da decidere) | `dati_stagionalita.py`, `main.py` |
| S8 | `npm run tipi` per rigenerare `src/api/schema.d.ts` | dashboard |

Verifica dei passi server: `curl` sui nuovi campi per LE-51 e per un comune (es. 075035 Lecce) su una settimana di luglio 2024. Il PS del distretto deve essere la somma dei suoi comuni, i due scenari diversi d'estate e quasi uguali d'inverno.

### Lato dashboard (`localhost/dashboard/src/`)

| Passo | Cosa | Dove |
|---|---|---|
| D1 | **Stato `scenario`** (`letteratura` o `nullo`, default `letteratura`, ricordato in `localStorage` come la barra laterale); `Domini` + `simulati: boolean` (voce «PS e ADI», con la stessa animazione degli altri interruttori); **selettore dello scenario** accanto, visibile solo se la voce è accesa; hook `useSerieSimulata` e parametro `scenario` in `useDettaglioZona`, `useRiepilogo` e Stagionalità | `App.tsx`, `Filtri.tsx`, `stato/dati.ts`, `api/client.ts` |
| D2 | **`BadgeSimulato`** con la dicitura breve e quella completa nel tooltip; colore proprio nei token, da validare per daltonismo con lo script della skill dataviz come le altre serie | `componenti/comuni.tsx`, `stili/tema.css`, `stato/token.tsx` |
| D3 | **Pannello della zona**: nuova sezione «Ricoveri, PS e ADI» col badge. Righe: ricoveri respiratori e circolatori, PS (totali, respiratori, cardiovascolari) come totale della finestra e per 100.000 al giorno; ADI come assistiti, accessi, quota a bassa urgenza e quota di ritorni entro 30 giorni. Sotto le dimissioni HFA, che restano reali e separate | `DettaglioZona.tsx` |
| D4 | **Confronto sotto la mappa**: nuovo pannello «Ricoveri, PS e ADI» in `ConfrontoDomini`, mese per mese, con selettore dell'indicatore e una linea per zona. **Interruttore «Sovrapponi gli scenari»**: linea piena per lo scenario scelto, tratteggiata per l'altro, stesso colore della zona; il tooltip dà i due valori e la differenza %. Qui entrano **anche i comuni a confronto**, oggi esclusi solo per i decessi. Sotto il grafico, una riga su come leggerlo: la distanza fra le linee è l'effetto imposto, e d'inverno le linee quasi coincidono | `ConfrontoDomini.tsx` |
| D5 | **Riepilogo**: intestazione e celle delle colonne `simulata` col badge e il tooltip; nell'export CSV una colonna `simulato` | `TabellaRiepilogo.tsx` |
| D6 | **Stagionalità**: selettore dello scenario accanto a zona e fonte; la riga PS mostra il badge, i 12 mesi e il dettaglio anno per anno come le altre righe | `Stagionalita.tsx` |
| D7 | **Informazioni**: card «Dati sanitari simulati» e voce «PS» nella legenda di Stagionalità. La card spiega cosa e perché (dati di AReSS e Parsec non arrivati, dati di partenza), i due scenari, come leggere la sovrapposizione, i parametri principali con le fonti (HFA, Annuario SSN, EpiAir2, Michelozzi 2009, Campagna 2021) e i tre risultati della verifica (caldo ritrovato, PM10/NO2 non distinguibili dal caso, correlazione grezza col segno sbagliato). In testa la dicitura completa, letta da `/api/disponibilita` | `Informazioni.tsx` |

Verifica dei passi dashboard: `tsc -b` pulito; a schermo, nei due temi, LE-51 a luglio 2024 con la sovrapposizione (le linee si separano d'estate), un comune nel confronto, Riepilogo e Stagionalità coi badge, card in Informazioni.

### Ordine di lavoro per i dati simulati

1. **S1-S4 + S8**: archivio, modelli, disponibilità, dettaglio della zona (verificabile con `curl`).
2. **D1-D3**: interruttore, badge, pannello: la prima cosa visibile.
3. **S5 + D4**: serie e sovrapposizione degli scenari.
4. **S6 + D5**: riepilogo.
5. **S7 + D6**: Stagionalità.
6. **D7**: tab Informazioni.
7. Documenti: `Regole_dei_dati.md` del repository Backend, `documentazione/Scelte_Progettuali.md` del repository Presentation, `Dati_Simulati.md` §8 (dove si leggono i dati), stato dei passi in questa sezione.

Ritocco al generatore, insieme al passo 1: la nota «esposizione mancante, generato senza effetto» è imprecisa quando manca **una sola** esposizione, perché l'effetto delle altre resta. Va detto quale manca. Oggi non incide: nel parquet dal 2024 non ci sono giorni senza esposizione.

### Punti decisi ✅ (Matteo, 25/10/2026)

- **PS nel «periodo peggiore» di Stagionalità**: **sì**. La riga entra nella somma dei ranghi e cambia la sintesi (che lo dichiara), ma è **evidenziata in giallo** col badge, e l'interruttore **«nella sintesi»** (parametro `simulati_nel_peggiore` di `/api/stagionalita`) la esclude. Nel Salento, col PS incluso, il mese peggiore passa da luglio a febbraio.
- **Unità dei grafici**: **per 100.000 residenti al giorno**.
- **Mappa**: **nessuna vista simulata** in questo giro; la vista ADI dei giorni critici viene dopo.
- **Numeri di testa**: **sì, una tessera simulata** (accessi in PS del Salento per 100.000 al giorno, col totale della finestra), su giallo pieno con scritta nera per distinguerla dalle altre.

## «Fonti a confronto» con tutti i domini (27/10/2026)

Passo 7 della riprogettazione, per la parte «divisa per dominio»: la tab ha ora **tre schede** sulla zona in primo piano (aria, decessi, temperatura). Scelte di Matteo:

| Scheda | Periodo | Confronto | Come |
|---|---|---|---|
| **PM2.5 secondo ogni fonte** (aria) | mese in cui finisce la finestra | gruppo OpenAQ/EEA/CAMS e ARPA a sé | invariata |
| **Decessi secondo ogni fonte** | **anno** in cui finisce la finestra | ISTAT giornaliero ↔ bilancio mensile ISTAT (distretto × mese, 2019-2024); ISTAT giornaliero ↔ Eurostat (provincia × mese, le settimane ISO portate al mese del loro giovedì, per entrambe le fonti) | sempre per distretto; due grafici affiancati: un comune mostra il suo distretto e lo dice; tabella con periodi in comune, identici, entro ±1, differenza totale, correlazione |
| **Temperatura … secondo ogni fonte** | mese della finestra, selettore media/massima/minima | ERA5-Land (tratteggiato) ↔ ARPA meteo | grafico delle due serie della zona; scarto, errore medio e correlazione **solo sulle coppie comune × giorno con entrambe** (i comuni con una stazione), e giorni sopra le soglie di caldo |

- **Dati:** `GET /api/salute/fonti?anno&zona` legge le tabelle che `scripts/salute/valida_decessi.py` scrive in `data/interim/salute/validazione/` (nessuna chiamata a Eurostat dal server: dopo un nuovo rilascio ISTAT va rilanciato lo script); `GET /api/calore/fonti?mese&zona&statistica` legge la cache come gli altri endpoint del calore.
- **Colori:** la palette validata delle fonti, per ente: ARPA nell'inchiostro, Copernicus (ERA5-Land come CAMS) nell'arancio tratteggiato; per i decessi ISTAT giornaliero nell'inchiostro, bilancio mensile nel blu, Eurostat nel verde.
- **Una sola fonte, nessun confronto:** dimissioni HFA e dati simulati, dichiarato in fondo alla scheda dei decessi.
- **Grana di Eurostat ✅ (Matteo, 27/10/2026):** **provincia × mese**, come vuole la regola §7, non la settimana pubblicata da Eurostat. Una settimana ISO può cadere a cavallo di due mesi e non si spezza senza il dato giornaliero: `valida_decessi.py` la assegna al mese del suo **giovedì** (convenzione ISO) sia per Eurostat sia per la somma ISTAT, e scrive `decessi_fonti_provincia_mese.csv`; un mese è un valore solo se tutte le sue 4-5 settimane lo sono. Il mese provinciale quindi non coincide esattamente con il mese di calendario, e la scheda lo dice.
- **Linee sovrapposte:** dove ISTAT ed Eurostat coincidono le linee si coprirebbero; ISTAT giornaliero è disegnato largo e semitrasparente sotto le altre (`primaSotto` di `PannelloFonti`), così resta visibile come un alone.
- **Restano del passo 7:** note a fondo pagina.

## Stagionalità: il consiglio in cima (27/10/2026)

Richiesta di Matteo: la parte superiore della tab diventa un **consiglio riepilogativo**, in un riquadro nel colore dei vassoi dei filtri (`--card-2`) con un **avatar da medico** a sinistra, e deve leggersi come un consiglio sulla base dei dati.

- **Componente:** `ConsiglioStagionalita.tsx` (con `AvatarMedico`, SVG disegnato a mano: camice, divisa nel blu petrolio dell'aria, stetoscopio, sul cerchio lime del marchio; decorativo, `aria-hidden`). Sta dentro la card «Quando intervenire», sotto i controlli e sopra le schede dei periodi.
- **Testo composto dai dati di `criticita`** (`/api/stagionalita`), senza regole nuove: titolo «Prepararsi per <primo periodo>», il perché (temi fra i mesi peggiori nel mese di picco, limiti D.Lgs. 155/2010 toccati), gli altri periodi, **cosa preparare** (gli spunti «dove agire» di tutti i periodi, ognuno una volta sola, col periodo a cui vale), i mesi da tenere d'occhio. Periodi e mesi sono cliccabili (dettaglio anno per anno). In fondo: «spunti da valutare, non prescrizioni», lettura esplorativa, e i dati simulati col badge.
- **Spostati nel consiglio**, per non ripeterli: la frase di sintesi del server (`k.sintesi`, non più mostrata), l'avviso sui dati simulati, «Da tenere d'occhio» e il blocco «Dove agire» di ogni scheda di periodo. Le schede tengono il perché e gli indicatori di dettaglio.
- **Regole anti-slop rispettate:** niente occhiello sopra il titolo, niente «·» nel testo, scala tipografica del tema (titolo di card, corpo, nota). Su telefono l'avatar va sopra il testo.

## Stagionalità più chiara (Fase 5 della revisione, 29/10/2026)

Scelte di Matteo; supera la somma dei ranghi e la griglia descritte sopra (16/10) e il calendario del 27/10.

- **Un solo «mese peggiore»: quello dei temi critici.** È il mese di picco del primo periodo critico (oggi, per il Salento, **gennaio** nel periodo dicembre–febbraio). La riga «Periodo peggiore» con la somma dei ranghi è tolta: dava febbraio mentre il consiglio diceva gennaio. `peggiori` di `/api/stagionalita` = i picchi dei periodi, poi i mesi critici per più temi; da lì si apre il dettaglio anno per anno.
- **Rango 1 = mese peggiore** in tutta la tab, nel server (`_rango(..., alto_peggiore)`) e nel CSV (colonna `rango_1_peggiore`, più `critico`).
- **Una tabella sola, «12 mesi a confronto».** Calendario delle criticità e griglia fusi: una riga per tema (aria complessiva, temperatura massima, decessi, PS, ADI, ricoveri respiratori), «Aria» si apre sui 5 inquinanti (dettaglio, non contano fra i temi); ogni cella ha il valore della media del mese e un **riempimento per rango nella rampa del dominio** (token `--stagione-aria`, `--stagione-calore`, `--stagione-salute`, stessa luminosità per i tre, testo ≥ 5,7:1 in chiaro e ≥ 5,3:1 in scuro sulla cella piena); i **mesi critici** hanno un **contorno d'inchiostro**; l'ultima riga conta i temi critici di ogni mese, sulla campitura del livello; la colonna «Peggiore» dice il mese di rango 1 di ogni riga e, in fondo, il mese peggiore dell'anno.
- **Limite di legge come segno piccolo**: un angolo rosso nell'angolo della cella (`SegnoLimite` in `comuni.tsx`), solo sulle righe degli inquinanti e nel dettaglio; via il bordo rosso, il «!», il bordo giallo e il «▲» del mese peggiore entro i limiti. Il mese scelto per il dettaglio è segnato solo in testata.
- **Anni**: medie, ranghi e andamento sugli anni comuni a tutti i domini, **dal 2024** (`PRIMO_ANNO_CONFRONTO`, come deciso il 16/10; il server partiva dal primo riassunto d'aria preparato e contava il 2020-2023, COVID compreso). `anni_storico` porta gli anni precedenti al dettaglio anno per anno (in grigio, «fuori da medie e ranghi») e al grafico anno su anno.
- **Periodi critici** affiancati e divisi da un filetto, senza riquadro né bordo sinistro colorato; il livello resta nel chip.
- **«Ultimo mese sugli anni precedenti»**: una scheda sola al posto di «Cosa è cambiato» e «Cosa resta invariato», prima le voci in aumento o in calo, poi le stabili; icone disegnate (`IconaAumento`, `IconaCalo`, `IconaStabile`) al posto di ▲ ▼ =; sotto, i mesi fino a oggi senza dato con il motivo (era il blocco «Copertura» sopra la griglia).
- **Spiegazioni solo in Informazioni** (sezione Stagionalità): tolte le note di metodo sotto calendario e griglia, l'avviso sui simulati sopra la griglia (restano la beuta su ogni riga e il filtro dello scenario) e le soglie dai sottotitoli; ogni scheda ha «come leggere». L'avviso dei mesi d'aria non preparati non cita più comandi.
- Parametro `simulati_nel_peggiore` rinominato `simulati_nella_sintesi`; tolti dal contratto `evidenza`, `entra_nel_peggiore` e la riga `peggiore`.

## Stagionalità come sommario (Fase 5bis, 29/10/2026)

Brief e scelte di Matteo.

- **Consiglio = sommario della pagina:** fumetto col dottore a 128 px; titolo «Prepararsi per <periodo>», una frase, cinque punti con etichetta: *Quando* (periodi col picco), *Perché* (temi del primo periodo e limiti superati), *Cosa preparare* (spunti brevi, con il periodo solo se non valgono per tutti, testo esteso nel tooltip), *Sta cambiando* (gli indicatori fuori soglia nell'ultimo mese), *Da tenere d'occhio*. Ogni etichetta scorre al blocco che la spiega.
- **Ordine dei blocchi:** periodi critici → 12 mesi a confronto → anno su anno → il mese anno per anno → cosa sta cambiando.
- **Periodi critici:** una tabellina per periodo (tema, mese, scarto dalla media dei 12 mesi, rango), dettaglio richiudibile, chiuso all'apertura.
- **Anno su anno:** fasce grigie numerate sui mesi dei periodi critici; sopra il grafico la lettura del mese peggiore di ogni anno del confronto e quante volte cade in un periodo critico; il sottotitolo dice a cosa serve.
- **Cosa sta cambiando** (era «Ultimo mese sugli anni precedenti»): barre degli scarti da zero, fascia di stabilità ±10% in grigio, barre piene fuori dalla fascia, una scala per tutti i gruppi di mese e una a parte in °C; i domini in ritardo (es. decessi ISTAT) in una nota.
- **Testo:** anni come intervallo («dal 2024 al 2026», «2020-2023»), unità una volta per gruppo (le righe simulate sotto «Simulati, per 100.000 residenti al giorno»), niente frasi che ripetono una colonna.

## Ridisegno del 02/11/2026

Supera, dove diverge, le sezioni precedenti (ordine del layout, numeri di testa, classifica, dettaglio del mese, ordine dei blocchi di Stagionalità). Dettaglio e motivazioni in `documentazione/Scelte_Progettuali.md` del repository Presentation (righe del 02/11).

- **Mappa:** carta → **Sintesi della finestra** (Aria: numeri e classifica delle zone a confronto, elenco completo a richiesta; Salute del Salento: decessi, ricoveri, PS simulati; note dietro una freccia) → giorno per giorno → Aria e salute per distretto e mese (senza i ricoveri).
- **Stagionalità:** stessa testata fissa della Mappa con i filtri della tab; Quando intervenire → Periodi critici → Cosa sta cambiando → 12 mesi a confronto (con il mese anno per anno nello stesso blocco, tre sintesi aria, calore, salute) → anno su anno → Ricoveri (dimissioni ospedaliere).
- **Barra laterale:** tab in un elenco solo (Mappa, Stagionalità, Fonti a confronto, Riepilogo, Informazioni).
