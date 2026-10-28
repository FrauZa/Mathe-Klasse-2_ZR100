/* ============================================
   Mathe Klasse 2 – Zahlenraum bis 100
   Stationen-Engine + Stationen 1–4
   ============================================ */

/* ============================================
   1. Zentrale Navigation (SPA Logik)
   ============================================ */
function showScreen(screenId) {
    stopStationTimer();
    stopKonfetti();
    stopSprache();
    if (autoAdvanceTimeout) { clearTimeout(autoAdvanceTimeout); autoAdvanceTimeout = null; }
    stopDurchlaufPause();
    rnTimerStoppen();
    erkTimerStoppen();
    krSpickzettelSchliessen();
    // Wer die Übung verlässt (Zurück, Tabs), beendet damit auch den Durchlauf
    if (screenId !== 'stationScreen') durchlauf = null;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

/* ============================================
   2. Kleine Helfer
   ============================================ */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const ZAHLWORTE = {
    10: 'zehn', 20: 'zwanzig', 30: 'dreißig', 40: 'vierzig', 50: 'fünfzig',
    60: 'sechzig', 70: 'siebzig', 80: 'achtzig', 90: 'neunzig', 100: 'einhundert'
};

/* ============================================
   Silben der Zahlwörter
   Die Silben werden abwechselnd eingefärbt – wie in der
   Silbenschrift, die die Kinder aus dem Lesen kennen.
   ============================================ */
const SILBEN = {
    ein: ['ein'], eins: ['eins'], zwei: ['zwei'], drei: ['drei'],
    vier: ['vier'], 'fünf': ['fünf'], sechs: ['sechs'], sieben: ['sie', 'ben'],
    acht: ['acht'], neun: ['neun'],

    elf: ['elf'], 'zwölf': ['zwölf'],
    dreizehn: ['drei', 'zehn'], vierzehn: ['vier', 'zehn'], 'fünfzehn': ['fünf', 'zehn'],
    sechzehn: ['sech', 'zehn'], siebzehn: ['sieb', 'zehn'], achtzehn: ['acht', 'zehn'],
    neunzehn: ['neun', 'zehn'],

    zehn: ['zehn'], zwanzig: ['zwan', 'zig'], 'dreißig': ['drei', 'ßig'],
    vierzig: ['vier', 'zig'], 'fünfzig': ['fünf', 'zig'], sechzig: ['sech', 'zig'],
    siebzig: ['sieb', 'zig'], achtzig: ['acht', 'zig'], neunzig: ['neun', 'zig'],
    einhundert: ['ein', 'hun', 'dert'],

    und: ['und']
};

/* Zerlegt ein Zahlwort in seine Silben. Zusammengesetzte Wörter wie
   "siebenundvierzig" werden am "und" getrennt und dann Teil für Teil zerlegt. */
function silbenListe(wort) {
    if (SILBEN[wort]) return SILBEN[wort];

    const teile = wort.split('und');
    if (teile.length === 2 && SILBEN[teile[0]] && SILBEN[teile[1]]) {
        return SILBEN[teile[0]].concat(['und'], SILBEN[teile[1]]);
    }
    return [wort];   // unbekannt: lieber ungefärbt als falsch getrennt
}

/* Das Zahlwort als HTML mit abwechselnd gefärbten Silben */
function silbenHTML(wort) {
    return silbenListe(wort)
        .map((silbe, i) => '<span class="silbe silbe-' + (i % 2) + '">' + silbe + '</span>')
        .join('');
}

/* Erzeugt Antwort-Optionen: die richtige Zahl + Ablenker aus dem Zehnerraum */
function buildNumberOptions(correct, count, min, max) {
    const options = [correct];
    let guard = 0;
    while (options.length < count && guard++ < 200) {
        const candidate = randomInt(min / 10, max / 10) * 10;
        if (!options.includes(candidate)) options.push(candidate);
    }
    return shuffle(options);
}

/* Ablenker dicht am Zielwert - anders als buildNumberOptions() sind das
   keine Zehnerzahlen, sondern Nachbarn wie beim Ablesen am Zahlenstrahl.
   ausschluss verhindert, dass eine in der Aufgabe schon sichtbare Zahl
   (z.B. die vorgegebene Zahl oder ein Rand) zufällig auch als Ablenker
   auftaucht - das würde nur verwirren. */
function nahOptionen(ziel, anzahl, min, max, ausschluss) {
    const gesperrt = ausschluss || [];
    const werte = [ziel];
    let guard = 0;
    while (werte.length < anzahl && guard++ < 200) {
        const kandidat = ziel + pick([-3, -2, -1, 1, 2, 3]);
        if (kandidat >= min && kandidat <= max && werte.indexOf(kandidat) === -1 &&
            gesperrt.indexOf(kandidat) === -1) {
            werte.push(kandidat);
        }
    }
    return shuffle(werte);
}

/* ============================================
   3. Zehnerstangen-Darstellung
   ============================================ */
/* Eine Zehnerstange mit 10 sichtbaren Feldern.
   variant: 'a' (dunkel) oder 'b' (hell) – für Plusaufgaben zweifarbig.
   crossed: true zeichnet einen Strich durch (für Minusaufgaben). */
function zehnerstangeHTML(variant, crossed, extraClass) {
    let felder = '';
    for (let i = 0; i < 10; i++) felder += '<span class="zs-feld"></span>';
    return '<div class="zehnerstange zs-' + (variant || 'a') +
           (crossed ? ' zs-crossed' : '') +
           (extraClass ? ' ' + extraClass : '') + '">' + felder + '</div>';
}

/* Reihe aus Zehnerstangen. parts: [{count, variant, crossed}]
   Nach der 5. Stange kommt eine größere Lücke – so bleibt die
   Fünfereinteilung ("Kraft der 5") auf einen Blick sichtbar. */
function zehnerstangenHTML(parts) {
    let html = '<div class="zs-reihe">';
    let nummer = 0; // Position der Stange in der gesamten Reihe
    parts.forEach(part => {
        for (let i = 0; i < part.count; i++) {
            nummer++;
            html += zehnerstangeHTML(part.variant, part.crossed,
                nummer === 6 ? 'zs-nach-luecke' : '');
        }
    });
    return html + '</div>';
}

/* Stellentafel Z | E */
function stellentafelHTML(zahl) {
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;
    return '<div class="stellentafel">' +
           '<div class="st-kopf"><span>Z</span><span>E</span></div>' +
           '<div class="st-werte"><span>' + z + '</span><span>' + e + '</span></div>' +
           '</div>';
}

/* ============================================
   3b. Konfetti zum Abschluss einer Übung
   ============================================ */
const KONFETTI_FARBEN = ['#66BB6A', '#42A5F5', '#FF9800', '#9C27B0', '#EF5350', '#FFD54F'];

function startKonfetti(anzahl) {
    const box = document.getElementById('konfetti');
    if (!box) return;

    box.innerHTML = '';
    const stueck = anzahl || 70;

    for (let i = 0; i < stueck; i++) {
        const teil = document.createElement('div');
        teil.className = 'konfetti-teil';
        teil.style.left = randomInt(0, 100) + '%';
        teil.style.background = pick(KONFETTI_FARBEN);
        teil.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
        teil.style.animationDuration = (2 + Math.random() * 1.5).toFixed(2) + 's';
        teil.style.width = randomInt(7, 13) + 'px';
        teil.style.height = randomInt(10, 18) + 'px';
        if (Math.random() < 0.4) teil.style.borderRadius = '50%';
        box.appendChild(teil);
    }

    // Nach der Animation wieder aufräumen
    if (konfettiTimeout) clearTimeout(konfettiTimeout);
    konfettiTimeout = setTimeout(stopKonfetti, 5000);
}

function stopKonfetti() {
    const box = document.getElementById('konfetti');
    if (box) box.innerHTML = '';
    if (konfettiTimeout) { clearTimeout(konfettiTimeout); konfettiTimeout = null; }
}

/* ============================================
   4. Stationen-Engine
   ============================================ */
const STATION_ZEIT = 120; // Sekunden pro Station

let aktiverBereich = 0;
let currentStationIndex = 0;
let currentSubIndex = 0;
let stationModus = 'zeit';      // 'zeit' oder 'tempo'
let pendingStationIndex = 0;    // Auswahl auf dem Modus-Bildschirm
let pendingSubIndex = 0;
let stationScore = 0;
let stationAufgabe = 0;   // wievielte Aufgabe der laufenden Runde
let timeLeft = STATION_ZEIT;
let stationTimerInterval = null;
let autoAdvanceTimeout = null;
let konfettiTimeout = null;
let earnedStars = [];
let answerLocked = false;

/* Nach einem Fehlversuch darf noch einmal geraten werden - erst der
   zweite Fehler löst die Aufgabe auf. Aufgaben mit nur zwei Antworten
   nehmen sich davon aus: dort wäre der zweite Versuch geschenkt. */
const MAX_VERSUCHE = 2;
let versuche = 0;

function stopStationTimer() {
    if (stationTimerInterval) {
        clearInterval(stationTimerInterval);
        stationTimerInterval = null;
    }
}

function startStationTimer() {
    stopStationTimer();
    stationTimerInterval = setInterval(() => {
        timeLeft--;
        updateStationTimerDisplay();
        if (timeLeft <= 0) {
            stopStationTimer();
            endStationRound();
        }
    }, 1000);
}

function updateStationTimerDisplay() {
    const anzeige = document.getElementById('stationTimerDisplay');

    if (stationModus === 'tempo') {
        anzeige.innerText = '🐢 Eigenes Tempo';
        return;
    }

    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    anzeige.innerText = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

/* ============================================
   Auswahl vor jedem Aufgabenmodul:
   1. Unterkategorie (nur wenn die Station welche hat)
   2. Übungsmodus (eigenes Tempo oder auf Zeit)
   ============================================ */
/* Einstieg aus dem Hauptmenü und aus den Tabs */
function openStation(index) {
    if (!stationOffen(index)) return;
    aktiverBereich = bereichVon(index);
    if (STATIONS[index].subStations) showSubStationScreen(index);
    else showModeScreen(index, 0);
}

function showSubStationScreen(index) {
    pendingStationIndex = index;

    const station = STATIONS[index];
    const titel = document.getElementById('subTitle');
    titel.innerText = stationTitel(index);
    titel.className = 'exercise-title ' + station.color + '-color';

    const grid = document.getElementById('subButtonGrid');
    grid.innerHTML = '';
    // Stationen mit Erkläraufgabe oder Arbeitsblatt bieten das vor dem Üben an
    const einstieg = erkEinstiegHTML(index) + abEinstiegHTML(index);
    document.getElementById('subErklaerung').innerHTML = einstieg
        ? '<div class="button-area erk-einstieg">' + einstieg + '</div><div id="abAuswahl"></div>'
        : '';

    station.subStations.forEach((sub, i) => {
        grid.innerHTML +=
            '<button class="operation-btn ' + station.color + '" ' +
            'onclick="showModeScreen(' + index + ', ' + i + ')">' +
            '<span class="emoji">' + (sub.emoji || station.emoji) + '</span>' +
            '<span class="text">' + (i + 1) + '. ' + sub.name + '</span>' +
            (sub.hinweis ? '<span class="hinweis">' + sub.hinweis + '</span>' : '') +
            '</button>';
    });

    showScreen('subScreen');
}

/* Zurück vom Modus-Bildschirm: zur Unterkategorie oder ins Hauptmenü */
function backFromMode() {
    const station = STATIONS[pendingStationIndex];
    if (station && station.subStations) showSubStationScreen(pendingStationIndex);
    else backToBereich();
}

function showModeScreen(index, subIndex) {
    pendingStationIndex = index;
    pendingSubIndex = subIndex || 0;

    const station = STATIONS[index];
    const sub = station.subStations ? station.subStations[pendingSubIndex] : null;

    document.getElementById('modeTitle').innerText =
        sub ? stationTitel(index) + ' – ' + sub.name : stationTitel(index);
    document.getElementById('modeTitle').className = 'exercise-title ' + station.color + '-color';
    document.getElementById('modeTempoBtn').className = 'operation-btn ' + station.color;
    document.querySelector('#modeZeitBtn .hinweis').innerText =
        stationZeit(index) / 60 + ' Minuten – schaffst du viele Punkte?';
    document.getElementById('modeZeitBtn').className = 'operation-btn ' + station.color;

    showScreen('modeScreen');
}

function startStationWithMode(modus) {
    startStation(pendingStationIndex, pendingSubIndex, modus);
}

/* Hauptmenü, Tabs und Sterne aus der STATIONS-Liste aufbauen */
function buildStationUI() {
    const grid = document.getElementById('bereichButtonGrid');
    const stars = document.getElementById('stationStars');
    const resultStars = document.getElementById('resultStars');

    grid.innerHTML = '';
    stars.innerHTML = '';
    resultStars.innerHTML = '';

    grid.innerHTML = MENUE.map((eintrag, i) => menueKachelHTML(eintrag, String(i))).join('');

    // Ein Stern pro offener Station – der Gesamtfortschritt der App
    offeneStationen().forEach(i => {
        stars.innerHTML += '<span id="stationStar' + i + '">☆</span>';
        resultStars.innerHTML += '<span style="color: gold; text-shadow: 0 0 15px rgba(255,215,0,0.8);">⭐</span>';
    });

    earnedStars = STATIONS.map(() => false);
}

/* Zu sehen, aber noch nicht zu öffnen: das Thema war noch nicht dran.
   Gilt für Gruppen, Bereiche und einzelne Stationen. sperrHinweis
   ersetzt den Standardtext, etwa wenn das Thema schon vorbei ist. */
function gesperrtKachelHTML(name, color, sperrHinweis) {
    return '<button class="operation-btn ' + color + ' bereich-zu" disabled>' +
           '<span class="emoji">🔒</span>' +
           '<span class="text">' + name + '</span>' +
           '<span class="hinweis">' + (sperrHinweis || 'Das hatten wir noch nicht – kommt später.') + '</span>' +
           '</button>';
}

/* Kachel eines Bereichs - auf dem Startbildschirm oder in einer Gruppe */
function bereichKachelHTML(i) {
    const bereich = BEREICHE[i];
    if (bereich.gesperrt) return gesperrtKachelHTML(bereich.name, bereich.color);
    return '<button class="operation-btn ' + bereich.color + '" onclick="showBereich(' + i + ')">' +
           '<span class="emoji">' + bereich.emoji + '</span>' +
           '<span class="text">' + bereich.name + '</span>' +
           '<span class="hinweis">' + bereich.hinweis + '</span>' +
           '</button>';
}

/* Eine Kachel im Menü: entweder ein Bereich oder eine Gruppe.
   pfad sagt, wo die Gruppe im Menü steht: "0" ist die erste Gruppe
   des Startbildschirms, "0.0" die erste Gruppe darin. */
function menueKachelHTML(eintrag, pfad) {
    if (eintrag.bereich !== undefined) return bereichKachelHTML(eintrag.bereich);
    if (eintrag.gesperrt) return gesperrtKachelHTML(eintrag.name, eintrag.color, eintrag.sperrHinweis);
    return '<button class="operation-btn ' + eintrag.color + '" onclick="showGruppe(\'' + pfad + '\')">' +
           '<span class="emoji">' + eintrag.emoji + '</span>' +
           '<span class="text">' + eintrag.name + '</span>' +
           '<span class="hinweis">' + eintrag.hinweis + '</span>' +
           '</button>';
}

function gruppeNachPfad(pfad) {
    let liste = MENUE, gruppe = null;
    pfad.split('.').forEach(i => { gruppe = liste[Number(i)]; liste = gruppe.inhalt; });
    return gruppe;
}

/* In welcher Gruppe steht ein Bereich? '' heißt: direkt im Menü */
function pfadVonBereich(bereichIndex, liste, pfad) {
    const eintraege = liste || MENUE;
    for (let i = 0; i < eintraege.length; i++) {
        const e = eintraege[i];
        if (e.bereich === bereichIndex) return pfad || '';
        if (e.inhalt) {
            const gefunden = pfadVonBereich(bereichIndex, e.inhalt, (pfad ? pfad + '.' : '') + i);
            if (gefunden !== null) return gefunden;
        }
    }
    return null;
}

let aktiveGruppe = '';

/* Den Inhalt einer Gruppe zur Auswahl anbieten */
function showGruppe(pfad) {
    aktiveGruppe = pfad;
    const gruppe = gruppeNachPfad(pfad);
    const titel = document.getElementById('gruppeTitle');
    titel.innerText = gruppe.name;
    titel.className = 'exercise-title ' + gruppe.color + '-color';
    document.getElementById('gruppeButtonGrid').innerHTML =
        gruppe.inhalt.map((eintrag, i) => menueKachelHTML(eintrag, pfad + '.' + i)).join('');
    showScreen('gruppeScreen');
}

/* Zurück aus einer Gruppe: eine Ebene höher */
function backFromGruppe() {
    const oben = aktiveGruppe.split('.').slice(0, -1).join('.');
    if (oben) showGruppe(oben);
    else showScreen('startScreen');
}

/* Zurück aus einem Bereich: in seine Gruppe - steht er allein, ins Menü */
function backFromBereich() {
    const pfad = pfadVonBereich(aktiverBereich);
    if (pfad) showGruppe(pfad);
    else showScreen('startScreen');
}

/* Überschrift einer Station. Die Nummer steht nicht in der Liste,
   sondern ergibt sich aus der Reihenfolge - so stimmt sie auch, wenn
   Stationen in einen anderen Bereich umziehen. Beim Rechnen zählen
   stattdessen die Stufen. */
function stationTitel(index) {
    const station = STATIONS[index];
    if (station.stufe) return 'Stufe ' + station.stufe + ': ' + station.title;
    if (station.ohneNummer) return station.title;
    return 'Station ' + (index + 1) + ': ' + station.title;
}

/* Kurzform für Knöpfe und Reiter: "3. Paare finden" oder "Stufe 2: Zehnerzahlen" */
function stationKurz(index) {
    const station = STATIONS[index];
    if (station.stufe) return 'Stufe ' + station.stufe + ': ' + station.name;
    if (station.ohneNummer) return station.name;
    return (index + 1) + '. ' + station.name;
}

/* Zu welchem Bereich gehört eine Station? */
function bereichVon(stationIndex) {
    return BEREICHE.findIndex(b => b.stationen.indexOf(stationIndex) !== -1);
}

/* Ein gesperrter Bereich steht im Menü, lässt sich aber nicht öffnen.
   Seine Stationen zählen darum auch nicht für die Sterne und die
   Auswertung mit - sonst wäre die App nie zu schaffen. */
function bereichGesperrt(bereichIndex) {
    const bereich = BEREICHE[bereichIndex];
    return !!(bereich && bereich.gesperrt) || gruppeGesperrt(bereichIndex);
}

/* Steht der Bereich in einer gesperrten Gruppe - auch weiter oben? */
function gruppeGesperrt(bereichIndex) {
    const pfad = pfadVonBereich(bereichIndex);
    if (!pfad) return false;
    const teile = pfad.split('.');
    return teile.some((t, i) => gruppeNachPfad(teile.slice(0, i + 1).join('.')).gesperrt);
}

function stationOffen(index) {
    return !STATIONS[index].gesperrt && !bereichGesperrt(bereichVon(index));
}

function offeneStationen() {
    return STATIONS.map((station, i) => i).filter(stationOffen);
}

function alleSterneVerdient() {
    return offeneStationen().every(i => earnedStars[i]);
}

/* Die Stationen eines Bereichs zur Auswahl anbieten */
function showBereich(bereichIndex) {
    if (bereichGesperrt(bereichIndex)) return;

    aktiverBereich = bereichIndex;
    const bereich = BEREICHE[bereichIndex];

    const titel = document.getElementById('bereichTitle');
    titel.innerText = bereich.name;
    titel.className = 'exercise-title ' + bereich.color + '-color';
    document.getElementById('allesBtn').className = 'check-btn alles-btn ' + bereich.color + '-color';

    const grid = document.getElementById('stationButtonGrid');
    grid.innerHTML = '';
    bereich.stationen.forEach(index => {
        const station = STATIONS[index];
        if (station.gesperrt) {
            grid.innerHTML += gesperrtKachelHTML(stationKurz(index), station.color, station.sperrHinweis);
            return;
        }
        grid.innerHTML +=
            '<button class="operation-btn ' + station.color + '" onclick="openStation(' + index + ')">' +
            '<span class="emoji">' + station.emoji + '</span>' +
            '<span class="text">' + stationKurz(index) + '</span>' +
            '</button>';
    });

    showScreen('bereichScreen');
}

/* Zurück aus Unterkategorie oder Übung: in den Bereich der Station */
function backToBereich() {
    showBereich(aktiverBereich);
}

/* Tab-Reihe: nur die Stationen des aktuellen Bereichs */
function buildStationTabs(bereichIndex) {
    const tabs = document.getElementById('stationTabs');
    tabs.innerHTML = '';
    BEREICHE[bereichIndex].stationen.filter(stationOffen).forEach(index => {
        tabs.innerHTML +=
            '<div class="tab" id="stationTab' + index + '" onclick="openStation(' + index + ')" ' +
            'style="cursor: pointer;">' + stationKurz(index) + '</div>';
    });
}

/* Zweite Tab-Reihe für die Unterstationen der aktiven Station.
   Stationen ohne subStations blenden die Reihe aus. */
function buildSubTabs(station) {
    const row = document.getElementById('stationSubTabs');

    if (!station.subStations) {
        row.style.display = 'none';
        row.innerHTML = '';
        return;
    }

    row.innerHTML = '';
    station.subStations.forEach((sub, i) => {
        row.innerHTML +=
            '<div class="tab" id="stationSubTab' + i + '" onclick="switchSubStation(' + i + ')" ' +
            'style="cursor: pointer;">' + (i + 1) + '. ' + sub.name + '</div>';
    });
    row.style.display = 'flex';
    markSubTabs(station);
}

function markSubTabs(station) {
    if (!station.subStations) return;
    station.subStations.forEach((sub, i) => {
        const tab = document.getElementById('stationSubTab' + i);
        if (!tab) return;
        tab.className = (i === currentSubIndex) ? 'tab active' : 'tab';
        tab.style.color = (i === currentSubIndex) ? 'var(--color-' + station.color + ')' : '#888';
    });
}

/* Wechsel innerhalb einer Station: Punkte und Zeit starten neu */
function switchSubStation(subIndex) {
    showModeScreen(currentStationIndex, subIndex);
}

/* Die meisten Stationen dauern 2 Minuten, das Kopfrechnen 3 - so lang
   war die Runde schon in "Mathe Klasse 2". */
function stationZeit(index) {
    return STATIONS[index].zeit || STATION_ZEIT;
}

function startStation(index, subIndex, modus) {
    currentStationIndex = index;
    currentSubIndex = subIndex || 0;
    stationModus = modus || 'zeit';
    stationScore = 0;
    stationAufgabe = 0;
    timeLeft = stationZeit(index);
    krRundeZuruecksetzen();
    answerLocked = false;

    const station = STATIONS[index];
    aktiverBereich = bereichVon(index);
    buildStationTabs(aktiverBereich);
    buildSubTabs(station);

    document.getElementById('stationScore').innerText = '0';
    updateStationTimerDisplay();

    STATIONS.forEach((s, i) => {
        const tab = document.getElementById('stationTab' + i);
        if (!tab) return;
        tab.className = (i === index) ? 'tab active' : 'tab';
        tab.style.color = (i === index) ? 'var(--color-' + s.color + ')' : '#888';
    });

    // Farbe der aktiven Station auf Titel und Buttons übertragen
    document.getElementById('stationTitle').className = 'exercise-title ' + station.color + '-color';
    document.getElementById('stationNextBtn').className = 'next-btn ' + station.color + '-color';
    document.getElementById('stationProceedBtn').className = 'check-btn ' + station.color + '-color';
    document.getElementById('stationCompleteTitle').className = 'exercise-title ' + station.color + '-color';
    document.getElementById('stationOptions').className = station.color + '-opts';

    document.getElementById('stationBody').style.display = 'block';
    document.getElementById('stationComplete').style.display = 'none';

    // Im eigenen Tempo läuft keine Uhr – dafür beendet das Kind selbst
    document.getElementById('stationFinishBtn').style.display =
        (stationModus === 'tempo') ? 'block' : 'none';

    showScreen('stationScreen');
    newStationTask();

    if (stationModus === 'zeit') startStationTimer();
}

/* Neue Aufgabe der aktuellen Station */
function newStationTask() {
    if (autoAdvanceTimeout) { clearTimeout(autoAdvanceTimeout); autoAdvanceTimeout = null; }
    stopSprache();
    markierungenAufraeumen();
    answerLocked = false;
    versuche = 0;
    stationAufgabe++;   // Aufgaben, die eine Runde füllen, zählen mit

    const station = STATIONS[currentStationIndex];
    const sub = station.subStations ? station.subStations[currentSubIndex] : null;

    document.getElementById('stationTitle').innerText =
        sub ? stationTitel(currentStationIndex) + ' – ' + sub.name
            : stationTitel(currentStationIndex);
    document.getElementById('stationTaskArea').innerHTML = '';
    document.getElementById('stationOptions').innerHTML = '';

    const feedback = document.getElementById('stationFeedback');
    feedback.style.visibility = 'hidden';
    feedback.className = 'feedback-area';
    feedback.querySelector('.feedback-text').innerText = '';

    document.getElementById('stationNextBtn').style.visibility = 'hidden';

    (sub ? sub.newTask : station.newTask)();
}

function nextStationTask() {
    newStationTask();
}

/* Von den Stationen aufgerufen, sobald das Kind geantwortet hat.

   Rückgabe: true, wenn die Aufgabe damit erledigt ist - dann darf die
   Station ihre Lösung zeigen. false heißt: es ist noch ein Versuch
   offen, die Lösung bleibt verdeckt und die Station lässt das Kind
   weiterarbeiten.

   sofortAufloesen überspringt den zweiten Versuch. Das ist für Aufgaben
   mit nur zwei Antwortmöglichkeiten gedacht, bei denen die zweite Wahl
   zwangsläufig die richtige wäre.

   tipp steht nach dem ersten Fehlversuch da, statt nur "nochmal" -
   so wie im Kopfrechentrainer. Er darf den Weg zeigen, aber nicht die
   Lösung verraten. */
function submitAnswer(isCorrect, hinweis, sofortAufloesen, tipp) {
    if (answerLocked) return true;

    const feedback = document.getElementById('stationFeedback');
    const text = feedback.querySelector('.feedback-text');
    feedback.style.visibility = 'visible';

    if (isCorrect) {
        answerLocked = true;
        stationScore++;
        document.getElementById('stationScore').innerText = stationScore;
        feedback.className = 'feedback-area correct';
        text.innerText = pick(['Super! 🎉', 'Richtig! 👍', 'Genau! ⭐', 'Klasse! 🌟']);
        // etwas Zeit, um die vollständige Lösung noch zu lesen - beim
        // Kopfrechnen kürzer, dort zählt der Fluss
        autoAdvanceTimeout = setTimeout(newStationTask, STATIONS[currentStationIndex].weiterNach || 1800);
        return true;
    }

    versuche++;

    if (!sofortAufloesen && versuche < MAX_VERSUCHE) {
        // Der Hinweis verrät die Lösung - er kommt erst beim zweiten Fehler
        feedback.className = 'feedback-area nochmal';
        text.innerText = tipp ? tipp : pick(['Noch nicht ganz – versuch es nochmal! 🔁',
                               'Fast! Probier es noch einmal. 🔁',
                               'Schau nochmal genau hin, du hast noch einen Versuch. 🔁']);
        return false;
    }

    answerLocked = true;
    feedback.className = 'feedback-area wrong';
    text.innerText = hinweis ? 'Nicht ganz. ' + hinweis : 'Nicht ganz – schau nochmal genau hin.';
    document.getElementById('stationNextBtn').style.visibility = 'visible';
    return true;
}

/* Bei mehrschrittigen Aufgaben zählt der Versuch pro Schritt: wer die
   erste Lücke im zweiten Anlauf trifft, soll bei der nächsten nicht
   schon ohne Netz dastehen. */
function neuerSchritt() {
    versuche = 0;

    // Der Schritt ist geschafft - die Aufforderung "versuch es nochmal"
    // soll nicht über der nächsten Lücke stehen bleiben
    const feedback = document.getElementById('stationFeedback');
    if (feedback && feedback.classList.contains('nochmal')) {
        feedback.style.visibility = 'hidden';
        feedback.className = 'feedback-area';
        feedback.querySelector('.feedback-text').innerText = '';
    }
}

/* Eine falsch gewählte Karte leuchtet kurz rot und wird dann wieder
   normal. Gesperrt wird sie nicht: dieselbe Zahl kann an einer anderen
   Stelle der Aufgabe durchaus noch die richtige sein. */
let falschTimeouts = [];

function markierungLoesen(el, klasse) {
    if (!el) return;
    const k = klasse || 'karte-falsch';
    falschTimeouts.push(setTimeout(() => el.classList.remove(k), 1200));
}

function markierungenAufraeumen() {
    falschTimeouts.forEach(clearTimeout);
    falschTimeouts = [];
}

function endStationRound() {
    stopStationTimer();
    stopSprache();   // Ansage und wartende Selbstprüfung beenden
    if (autoAdvanceTimeout) { clearTimeout(autoAdvanceTimeout); autoAdvanceTimeout = null; }

    earnedStars[currentStationIndex] = true;
    const star = document.getElementById('stationStar' + currentStationIndex);
    if (star) {
        star.innerText = '⭐';
        star.classList.add('star-earned');
        star.style.color = 'gold';
    }

    document.getElementById('stationBody').style.display = 'none';
    document.getElementById('stationFinishBtn').style.display = 'none';
    document.getElementById('stationCompleteTitle').innerText =
        (stationModus === 'tempo' ? 'Geschafft! ' : 'Zeit abgelaufen! ') +
        'Du hast ' + stationScore + ' Punkte gesammelt.';
    // Das Kopfrechnen zeigt zusätzlich, wie viel mit und ohne Spickzettel ging
    document.getElementById('stationAuswertung').innerHTML =
        STATIONS[currentStationIndex].auswertung ? krAuswertungHTML() : '';
    document.getElementById('stationComplete').style.display = 'block';
    startKonfetti(70);

    const bigStar = document.getElementById('stationNewStarIcon');
    if (bigStar) {
        bigStar.style.transform = 'scale(0)';
        setTimeout(() => { bigStar.style.transform = 'scale(1)'; }, 100);
    }

    if (durchlauf) {
        durchlaufRundeEnde();
        return;
    }

    document.getElementById('stationProceedBtn').innerText =
        alleSterneVerdient() ? 'Zur Auswertung' : 'Zur nächsten Station';
}

/* ============================================
   "Alles ausprobieren": alle Aufgaben des gewählten Bereichs der
   Reihe nach, jede Unterstation einzeln, jeweils eine Runde auf Zeit.
   ============================================ */
const DURCHLAUF_PAUSE = 6;   // Sekunden zwischen zwei Aufgaben

let durchlauf = null;        // { liste: [{station, sub}], pos, bereich }
let durchlaufPauseInterval = null;

function startDurchlauf() {
    const bereich = aktiverBereich;
    if (bereichGesperrt(bereich)) return;

    const liste = [];
    BEREICHE[bereich].stationen.filter(stationOffen).forEach(index => {
        const subs = STATIONS[index].subStations;
        const anzahl = subs ? subs.length : 1;
        for (let sub = 0; sub < anzahl; sub++) liste.push({ station: index, sub: sub });
    });
    if (liste.length === 0) return;

    durchlaufStarten(liste, 0);
}

function durchlaufStarten(liste, pos) {
    const eintrag = liste[pos];
    startStation(eintrag.station, eintrag.sub, 'zeit');   // setzt durchlauf zurück
    durchlauf = { liste: liste, pos: pos };
}

function durchlaufName(eintrag) {
    const station = STATIONS[eintrag.station];
    const sub = station.subStations ? station.subStations[eintrag.sub] : null;
    return station.name + (sub ? ' – ' + sub.name : '');
}

function stopDurchlaufPause() {
    if (durchlaufPauseInterval) {
        clearInterval(durchlaufPauseInterval);
        durchlaufPauseInterval = null;
    }
}

/* Runde vorbei: kurz feiern, dann geht es von selbst weiter */
function durchlaufRundeEnde() {
    const btn = document.getElementById('stationProceedBtn');
    const naechste = durchlauf.liste[durchlauf.pos + 1];
    const zaehler = ' (' + (durchlauf.pos + 2) + ' von ' + durchlauf.liste.length + ')';

    let rest = DURCHLAUF_PAUSE;
    const beschriften = () => {
        btn.innerText = (naechste ? 'Weiter: ' + durchlaufName(naechste) + zaehler
                                  : 'Fertig – zurück zu ' + BEREICHE[aktiverBereich].name) +
                        ' … ' + rest;
    };
    beschriften();

    stopDurchlaufPause();
    durchlaufPauseInterval = setInterval(() => {
        rest--;
        if (rest <= 0) proceedToNextStation();
        else beschriften();
    }, 1000);
}

function proceedToNextStation() {
    stopDurchlaufPause();
    const bigStar = document.getElementById('stationNewStarIcon');
    if (bigStar) bigStar.style.transform = 'scale(0)';

    if (durchlauf) {
        const pos = durchlauf.pos + 1;
        if (pos < durchlauf.liste.length) {
            durchlaufStarten(durchlauf.liste, pos);
        } else {
            // Bereich geschafft: zurück zur Auswahl (beendet auch den Durchlauf)
            showBereich(aktiverBereich);
            startKonfetti(150);
        }
        return;
    }

    if (alleSterneVerdient()) {
        showScreen('resultScreen');
        startKonfetti(150);   // alle offenen Stationen geschafft
        return;
    }

    // Reihum durch die offenen Stationen bis zur nächsten ohne Stern
    const offen = offeneStationen();
    const start = offen.indexOf(currentStationIndex);
    let next = offen[0];
    for (let i = 1; i <= offen.length; i++) {
        next = offen[(start + i) % offen.length];
        if (!earnedStars[next]) break;
    }
    openStation(next);   // auch hier darf neu gewählt werden
}

/* ============================================
   5. Antwort-Bausteine für die Stationen
   ============================================ */
/* Options-Buttons erzeugen.
   values: Array der Auswahlmöglichkeiten
   correct: der richtige Wert – oder eine Prüf-Funktion, wenn mehrere
            Antworten richtig sein können (z. B. "30 > ?").
   onAnswer: wird nach der Antwort aufgerufen – z. B. um die Lücke in der
             Aufgabe zu füllen, damit die Lösung einmal komplett dasteht. */
function renderOptions(values, correct, labelFn, hinweis, onAnswer) {
    const area = document.getElementById('stationOptions');
    const istRichtig = (typeof correct === 'function')
        ? correct
        : (v) => v === correct;
    area.innerHTML = '';

    values.forEach(value => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        // textContent, damit Zeichen wie < und > sicher dargestellt werden
        if (labelFn) btn.innerHTML = labelFn(value);
        else btn.textContent = value;
        btn.onclick = () => {
            if (answerLocked) return;
            const ok = istRichtig(value);

            // Bei nur zwei Antworten wäre der zweite Versuch geschenkt
            if (!submitAnswer(ok, hinweis, values.length < 3)) {
                // Noch ein Versuch: nur diese Antwort ist verbraucht
                btn.disabled = true;
                btn.style.backgroundColor = '#ffcdd2';
                btn.style.boxShadow = '0 5px 0 #c62828';
                return;
            }

            markOptionButtons(btn, istRichtig, values);
            if (onAnswer) onAnswer(value, ok);
        };
        area.appendChild(btn);
    });
}

/* Optionen einfärben und sperren. Bei mehreren richtigen Lösungen
   werden alle passenden Antworten grün markiert. */
function markOptionButtons(clickedBtn, istRichtig, values) {
    const area = document.getElementById('stationOptions');
    Array.from(area.children).forEach((btn, i) => {
        btn.disabled = true;
        if (istRichtig(values[i])) {
            btn.style.backgroundColor = '#c8e6c9';
            btn.style.boxShadow = '0 5px 0 #2e7d32';
        } else if (btn === clickedBtn) {
            btn.style.backgroundColor = '#ffcdd2';
            btn.style.boxShadow = '0 5px 0 #c62828';
        }
    });
}

/* Prüf-Button (für Aufgaben ohne Antwort-Optionen) */
function renderCheckButton(label, onCheck) {
    const area = document.getElementById('stationOptions');
    const btn = document.createElement('button');
    btn.className = 'check-btn ' + STATIONS[currentStationIndex].color + '-color';
    btn.innerText = label;
    btn.onclick = () => {
        if (answerLocked) return;
        btn.disabled = true;
        // Der Knopf wird durchgereicht: bleibt ein Versuch offen, macht
        // ihn die Station selbst wieder klickbar.
        onCheck(btn);
    };
    area.appendChild(btn);
}

function setInstruction(text) {
    document.getElementById('stationInstruction').innerHTML = text;
}

function setTaskArea(html) {
    document.getElementById('stationTaskArea').innerHTML = html;
}

/* Füllt eine Lücke in der Aufgabe mit der Lösung, damit die
   vollständige Aussage einmal komplett dasteht.
   richtig = true färbt grün, sonst blau ("so wäre es richtig"). */
function fillLuecke(id, loesung, richtig) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = loesung;
    el.classList.remove('luecke');
    el.classList.add(richtig ? 'karte-geloest' : 'karte-loesung');
}

/* Hilfe-Schalter: blendet zu einer schriftlichen Aufgabe die
   Zehnerstangen-Darstellung ein. Standardmäßig ausgeblendet –
   das Kind entscheidet selbst, ob es die Hilfe braucht. */
function rechenHilfeHTML(stangenHTML) {
    // Der Schalter übernimmt die Farbe der aktuellen Station
    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + farbe + ';">' +
           '<button class="hilfe-btn" id="rechenHilfeBtn" onclick="toggleRechenHilfe()">' +
           '🧱 Mit Zehnerstangen zeigen</button>' +
           '<div class="hilfe-inhalt" id="rechenHilfe">' + stangenHTML + '</div>' +
           '</div>';
}

function toggleRechenHilfe() {
    const box = document.getElementById('rechenHilfe');
    const btn = document.getElementById('rechenHilfeBtn');
    if (!box || !btn) return;

    const zeigen = !box.classList.contains('sichtbar');
    box.classList.toggle('sichtbar', zeigen);
    btn.classList.toggle('aktiv', zeigen);
    btn.textContent = zeigen ? '🧱 Zehnerstangen ausblenden' : '🧱 Mit Zehnerstangen zeigen';
}

/* ============================================
   6. Station 1: Zehnerzahlen finden
   Arbeitsblatt: Bild → Zehnerzahl, Zahl → Zehnerstangen legen, Zuordnen
   ============================================ */
let s1BuildCount = 0;
let s1Wortzahl = 0;   // Zahl der aktuellen Zahlwort-Karte, für die Vorlesehilfe

function station1NewTask() {
    const typ = pick(['bild2zahl', 'zahl2bild', 'zuordnen']);
    if (typ === 'bild2zahl') station1BildZuZahl();
    else if (typ === 'zahl2bild') station1ZahlZuBild();
    else station1Zuordnen();
}

function station1BildZuZahl() {
    const anzahl = randomInt(1, 10);
    const zahl = anzahl * 10;

    setInstruction('Schreibe zu dem Bild die Zehnerzahl auf.');
    setTaskArea(zehnerstangenHTML([{ count: anzahl, variant: 'a' }]));
    renderOptions(buildNumberOptions(zahl, 4, 10, 100), zahl, null,
        'Zähle die Zehnerstangen – jede Stange ist 10.');
}

function station1ZahlZuBild() {
    const anzahl = randomInt(2, 9);
    const zahl = anzahl * 10;
    s1BuildCount = 0;

    setInstruction('Lege <strong>' + zahl + '</strong> mit Zehnerstangen. Tippe auf die Felder.');

    let slots = '<div class="zs-reihe zs-bau" id="s1BauArea">';
    for (let i = 1; i <= 10; i++) {
        slots += '<div class="zs-slot' + (i === 6 ? ' zs-nach-luecke' : '') +
                 '" id="s1Slot' + i + '" onclick="station1SetBuild(' + i + ')"></div>';
    }
    slots += '</div><p class="zs-bau-info">Gelegt: <strong id="s1BauAnzeige">0</strong> Zehnerstangen</p>';
    setTaskArea(slots);

    renderCheckButton('Fertig', (btn) => {
        const ok = (s1BuildCount * 10 === zahl);
        // Bleibt ein Versuch offen, darf weiter gelegt und neu geprüft werden
        if (!submitAnswer(ok, zahl + ' sind ' + anzahl + ' Zehnerstangen.')) btn.disabled = false;
    });
}

function station1SetBuild(n) {
    if (answerLocked) return;
    // Nochmal auf die gleiche Stange tippen = wieder wegnehmen
    s1BuildCount = (s1BuildCount === n) ? n - 1 : n;

    for (let i = 1; i <= 10; i++) {
        const slot = document.getElementById('s1Slot' + i);
        if (!slot) continue;
        slot.innerHTML = (i <= s1BuildCount) ? zehnerstangeHTML('a') : '';
        slot.classList.toggle('gefuellt', i <= s1BuildCount);
    }
    document.getElementById('s1BauAnzeige').innerText = s1BuildCount;
}

/* Hilfe zur Zahlwort-Karte: das Wort vorlesen lassen. Sie muss jedes Mal
   neu angetippt werden – wer das Wort selbst lesen kann, braucht sie nicht. */
function station1VorleseHilfeHTML() {
    if (!spracheVerfuegbar()) return '';
    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + farbe + ';">' +
           '<button class="hilfe-btn" onclick="station1Vorlesen()">🔊 Wort vorlesen</button>' +
           '</div>';
}

function station1Vorlesen() {
    sprichZahl(s1Wortzahl, false);
}

function station1Zuordnen() {
    const anzahl = randomInt(1, 10);
    const zahl = anzahl * 10;
    const darstellung = pick(['zahlwort', 'zehner', 'stellentafel', 'stangen']);

    let html;
    if (darstellung === 'zahlwort') {
        s1Wortzahl = zahl;
        html = '<div class="zuordnen-karte">' + silbenHTML(ZAHLWORTE[zahl]) + '</div>' +
               station1VorleseHilfeHTML();
    } else if (darstellung === 'zehner') {
        html = '<div class="zuordnen-karte">' + anzahl + ' Z</div>';
    } else if (darstellung === 'stellentafel') {
        html = '<div class="zuordnen-karte karte-blank">' + stellentafelHTML(zahl) + '</div>';
    } else {
        html = zehnerstangenHTML([{ count: anzahl, variant: 'a' }]);
    }

    setInstruction('Welche Zahl passt dazu?');
    setTaskArea(html);
    renderOptions(buildNumberOptions(zahl, 4, 10, 100), zahl, null,
        anzahl + ' Zehner sind ' + zahl + '.');
}
/* ============================================
   7. Station 2: Zehnerzahlen ordnen
   Vier Unterstationen:
   1. Größer/Kleiner  – das Zeichen einsetzen
   2. Kleinste zuerst – aufsteigend ordnen
   3. Größte zuerst   – absteigend ordnen
   4. Zahl einsetzen  – Zahl und Zeichen sind vorgegeben
   ============================================ */
let s2OrderTarget = [];
let s2OrderPicked = [];

/* --------------------------------------------
   2.1 Setze größer oder kleiner ein
   -------------------------------------------- */
function station2Vergleich() {
    const a = randomInt(1, 10) * 10;
    let b = randomInt(1, 10) * 10;
    while (b === a) b = randomInt(1, 10) * 10;

    const richtig = (a < b) ? '<' : '>';

    setInstruction('Setze das Zeichen &lt; oder &gt; passend ein.');
    setTaskArea('<div class="vergleich-aufgabe">' +
                '<span class="zahl-karte">' + a + '</span>' +
                '<span class="zahl-karte luecke" id="s2Zeichen">?</span>' +
                '<span class="zahl-karte">' + b + '</span>' +
                '</div>');
    renderOptions(['<', '>'], richtig, null,
        'Die geöffnete Seite zeigt immer zur größeren Zahl.',
        // Zeichen einblenden: die Aussage steht danach komplett da
        (wert, ok) => fillLuecke('s2Zeichen', richtig, ok));
}

/* --------------------------------------------
   2.2 / 2.3 Der Größe nach ordnen
   Die ersten beiden Zahlen stehen schon da. So sehen auch Kinder,
   die die Anweisung nicht lesen können, sofort die Richtung.
   -------------------------------------------- */
function station2OrdnenKleinste() { station2Ordnen(true); }
function station2OrdnenGroesste() { station2Ordnen(false); }

function station2Ordnen(aufsteigend) {
    const zahlen = shuffle([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]).slice(0, 5);

    s2OrderTarget = zahlen.slice().sort((a, b) => aufsteigend ? a - b : b - a);
    s2OrderPicked = s2OrderTarget.slice(0, 2);   // Orientierungshilfe
    const vorrat = s2OrderTarget.slice(2);

    setInstruction(aufsteigend
        ? 'Ordne der Größe nach. Beginne mit der <strong>kleinsten</strong> Zahl. ⬆️'
        : 'Ordne der Größe nach. Beginne mit der <strong>größten</strong> Zahl. ⬇️');

    let html = '<div class="ordnen-vorrat">';
    shuffle(vorrat).forEach(z => {
        html += '<button class="zahl-karte klickbar" id="s2Karte' + z + '" onclick="station2Pick(' + z + ')">' + z + '</button>';
    });
    html += '</div><div class="ordnen-ziel" id="s2Ziel"></div>';
    setTaskArea(html);
    station2RenderZiel();
}

/* Zielreihe zeichnen: gesetzte Zahlen + offene Plätze */
function station2RenderZiel() {
    const zeichen = (s2OrderTarget[0] < s2OrderTarget[1]) ? '&lt;' : '&gt;';
    const karten = [];

    s2OrderTarget.forEach((z, i) => {
        karten.push(i < s2OrderPicked.length
            ? '<span class="zahl-karte' + (i < 2 ? ' karte-vorgabe' : '') + '">' + s2OrderPicked[i] + '</span>'
            : '<span class="zahl-karte luecke">?</span>');
    });

    document.getElementById('s2Ziel').innerHTML =
        karten.join('<span class="vergleich-zeichen">' + zeichen + '</span>');
}

function station2Pick(zahl) {
    if (answerLocked) return;

    const erwartet = s2OrderTarget[s2OrderPicked.length];
    const karte = document.getElementById('s2Karte' + zahl);

    if (zahl !== erwartet) {
        if (karte) karte.classList.add('karte-falsch');
        if (!submitAnswer(false, 'Die richtige Reihenfolge wäre: ' + s2OrderTarget.join(' – '))) {
            // Noch ein Versuch: die Karte wird nach kurzem Rot wieder normal,
            // denn sie kann für einen späteren Platz noch gebraucht werden
            markierungLoesen(karte);
        }
        return;
    }

    s2OrderPicked.push(zahl);
    neuerSchritt();
    if (karte) {
        karte.disabled = true;
        karte.classList.add('karte-verbraucht');
    }
    station2RenderZiel();

    if (s2OrderPicked.length === s2OrderTarget.length) {
        submitAnswer(true);
    }
}

/* --------------------------------------------
   2.4 Zahl und Zeichen sind vorgegeben,
       eine passende Zahl einsetzen.
       Es gibt mehrere richtige Lösungen – alle zählen.
   -------------------------------------------- */
function station2ZahlEinsetzen() {
    const zeichen = pick(['<', '>']);
    const linksLeer = Math.random() < 0.5;
    const gegeben = randomInt(3, 8) * 10;

    const wahr = (kandidat) => {
        const links = linksLeer ? kandidat : gegeben;
        const rechts = linksLeer ? gegeben : kandidat;
        return zeichen === '<' ? links < rechts : links > rechts;
    };

    const alle = [];
    for (let z = 1; z <= 10; z++) alle.push(z * 10);

    // Zwei passende und zwei unpassende Zahlen zur Auswahl stellen
    const passend = shuffle(alle.filter(wahr)).slice(0, 2);
    const unpassend = shuffle(alle.filter(z => !wahr(z))).slice(0, 4 - passend.length);
    const options = shuffle(passend.concat(unpassend));

    const luecke = '<span class="zahl-karte luecke" id="s2Zahl">?</span>';
    const karte = '<span class="zahl-karte">' + gegeben + '</span>';
    const links = linksLeer ? luecke : karte;
    const rechts = linksLeer ? karte : luecke;

    setInstruction('Setze eine passende Zahl ein. Es gibt mehrere Lösungen!');
    setTaskArea('<div class="vergleich-aufgabe">' + links +
                '<span class="vergleich-zeichen">' + zeichen + '</span>' + rechts + '</div>');

    const hinweis = linksLeer
        ? (zeichen === '<' ? 'Gesucht ist eine Zahl kleiner als ' + gegeben + '.'
                           : 'Gesucht ist eine Zahl größer als ' + gegeben + '.')
        : (zeichen === '<' ? 'Gesucht ist eine Zahl größer als ' + gegeben + '.'
                           : 'Gesucht ist eine Zahl kleiner als ' + gegeben + '.');

    renderOptions(options, wahr, null, hinweis,
        // Zahl einblenden: bei einer falschen Antwort eine passende zeigen
        (wert, ok) => fillLuecke('s2Zahl', ok ? wert : pick(passend), ok));
}

/* ============================================
   8. Station 3: Mit Zehnerzahlen rechnen 1 (Plus)
   ============================================ */
/* Immer nur die schriftliche Aufgabe – die Zehnerstangen holt sich das
   Kind bei Bedarf über den Hilfe-Schalter dazu. */
function station3NewTask() {
    station3Rechnen();
}

/* Die beiden Mengen sind farbig getrennt: erste Menge blau, zweite orange.
   Die Zahlen in der Aufgabe haben dieselbe Farbe wie ihre Stangen. */
function mengeHTML(zahl, menge) {
    return '<span class="menge-' + menge + '">' + zahl + '</span>';
}

function station3Rechnen() {
    const a = randomInt(1, 8);
    const b = randomInt(1, 10 - a);
    const summe = (a + b) * 10;

    setInstruction('Löse die Aufgabe.');
    setTaskArea(
        '<div class="rechen-aufgabe gross">' + mengeHTML(a * 10, 'a') + ' + ' + mengeHTML(b * 10, 'b') +
        ' = <span class="zahl-karte luecke" id="s3Ergebnis">?</span></div>' +
        // Hilfe-Schalter: zeigt dieselbe Aufgabe als Zehnerstangen
        rechenHilfeHTML(zehnerstangenHTML([
            { count: a, variant: 'a' },
            { count: b, variant: 'b' }
        ]))
    );
    renderOptions(buildNumberOptions(summe, 4, 10, 100), summe, null,
        'Rechne in Zehnern: ' + a + ' + ' + b + ' = ' + (a + b) + ', also ' + summe + '.',
        (wert, ok) => fillLuecke('s3Ergebnis', summe, ok));
}

/* ============================================
   9. Station 4: Mit Zehnerzahlen rechnen 2 (Minus)
   ============================================ */
/* Wie Station 3: nur die schriftliche Aufgabe, Anschauung auf Wunsch. */
function station4NewTask() {
    station4Rechnen();
}

function station4Rechnen() {
    const gesamt = randomInt(3, 10);
    const weg = randomInt(1, gesamt - 1);
    const rest = (gesamt - weg) * 10;

    setInstruction('Löse die Aufgabe.');
    setTaskArea(
        '<div class="rechen-aufgabe gross">' + (gesamt * 10) + ' − ' + (weg * 10) +
        ' = <span class="zahl-karte luecke" id="s4Ergebnis">?</span></div>' +
        // Hilfe-Schalter: Gesamtmenge, davon der weggenommene Teil durchgestrichen
        rechenHilfeHTML(zehnerstangenHTML([
            { count: gesamt - weg, variant: 'a' },
            { count: weg, variant: 'a', crossed: true }
        ]))
    );
    renderOptions(buildNumberOptions(rest, 4, 10, 100), rest, null,
        'Rechne in Zehnern: ' + gesamt + ' − ' + weg + ' = ' + (gesamt - weg) + ', also ' + rest + '.',
        (wert, ok) => fillLuecke('s4Ergebnis', rest, ok));
}

/* ============================================
   9b. Station 5: Zahlen hören
   Die Zahl wird vorgelesen, das Kind tippt sie über
   ein Tastenfeld ein. Drei Unterstationen mit
   wachsendem Zahlenraum.
   ============================================ */
let s5Zahl = 0;
let s5Eingabe = '';

/* Die Zahl, die die Sprachausgabe gerade ansagt. Station 5 und Station 7
   teilen sich den ganzen Ansage-Apparat; welche Zahl dran ist, steht
   deshalb hier und nicht bei einer der beiden Stationen. */
let ansageZahl = 0;
let s5SprechTimeout = null;
let s5AnsageTimeout = null;
let s5PruefTimeout = null;

/* Die laufende Ansage wird festgehalten: Chrome räumt eine nur örtlich
   gehaltene Utterance mitten im Sprechen weg – die Sprachausgabe bleibt
   danach stumm hängen. */
let s5Ansage = null;

/* Hat die Sprachausgabe versagt, wird das Zahlwort geschrieben – die
   Aufgabe bleibt lösbar. Ein einzelner Aussetzer soll sie aber nicht
   gleich für die ganze Sitzung abschalten. */
let s5SpracheDefekt = false;
let s5Fehlversuche = 0;

/* Zwei misslungene Ansagen hintereinander bedeuten: Dieses Gerät
   spricht nicht. Ein einzelner Aussetzer darf die Sprachausgabe nicht
   gleich für die ganze Sitzung abschalten – der gefährliche Fall
   (Firefox) ist oben schon ausgenommen. */
const S5_MAX_FEHLVERSUCHE = 2;

/* Steht überall dort, wo das Zahlwort geschrieben statt gesprochen wird */
const S5_HINWEIS = 'Dieser Browser liest nicht vor – die Zahl steht als Wort da. '
                 + 'Mit Chrome oder Edge geöffnet wird sie vorgelesen.';

/* Firefox meldet unter Windows kein onend, wenn seine Sprachausgabe
   hängen bleibt – auf Ereignisse allein ist also kein Verlass. Ein
   Wachhund misst die Zeit: Ist die Ansage nach der Wachfrist nicht
   beendet, gilt sie als gescheitert. Das längste Zahlwort dauert auch
   langsam gesprochen keine zwei Sekunden. */
let s5Watchdog = null;
const S5_WACHFRIST = 6000;

/* Die zuletzt abgeschickte Ansage. Meldet sie bis zur nächsten weder
   Beginn noch Ende noch Fehler, hat die Sprachausgabe sie verschluckt.
   Der Wachhund allein genügt dafür nicht: Bei jedem Aufgabenwechsel
   wird er entschärft, und eine hängende Sprachausgabe meldet nie. */
let s5LetzteAnsage = null;

/* Die Stimmenliste einmal holen statt bei jeder Ansage. */
let s5Stimmen = null;

/* Zahlwort für 1–100 – wird der Sprachausgabe übergeben, damit auch
   Stimmen ohne deutsche Zahlenregeln richtig vorlesen. */
const S5_EINER = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const S5_TEENS = {
    11: 'elf', 12: 'zwölf', 13: 'dreizehn', 14: 'vierzehn', 15: 'fünfzehn',
    16: 'sechzehn', 17: 'siebzehn', 18: 'achtzehn', 19: 'neunzehn'
};

/* Der Einer so, wie er im zusammengesetzten Zahlwort steht:
   "einundzwanzig" – nicht "einsundzwanzig". */
function einerBaustein(e) {
    return (e === 1) ? 'ein' : S5_EINER[e];
}

function zahlwortDE(zahl) {
    if (S5_TEENS[zahl]) return S5_TEENS[zahl];
    if (ZAHLWORTE[zahl]) return ZAHLWORTE[zahl];
    if (zahl < 10) return S5_EINER[zahl];

    const e = zahl % 10;
    const z = zahl - e;
    return einerBaustein(e) + 'und' + ZAHLWORTE[z];
}

/* ---- Sprachausgabe ---------------------------------------------- */
/* Die Sprachausgabe ist der empfindlichste Teil der App: Auf manchen
   Geräten fehlt sie, auf anderen wirft sie oder bleibt hängen. Darum
   ist hier jeder Zugriff abgesichert, und wenn zwei Ansagen hinter-
   einander nicht zu Ende kommen, tritt das geschriebene Zahlwort an
   die Stelle des Lautsprecher-Knopfs. Die Aufgabe bleibt so in jedem
   Fall lösbar.

   Ein Wachhund misst dabei die Zeit, statt sich auf onerror zu
   verlassen: Eine hängende Sprachausgabe meldet gar nichts mehr. */
function spracheVerfuegbar() {
    if (s5SpracheDefekt) return false;
    try {
        return typeof window.speechSynthesis !== 'undefined' &&
               window.speechSynthesis !== null &&
               typeof window.SpeechSynthesisUtterance === 'function';
    } catch (e) {
        return false;
    }
}

/* Steht die Aufgabe überhaupt noch? Nach Ablauf der Zeit oder einem
   Wechsel dürfen nachlaufende Timer nichts mehr auslösen. */
function stationAktiv() {
    const screen = document.getElementById('stationScreen');
    const body = document.getElementById('stationBody');
    return !!screen && screen.classList.contains('active') &&
           !!body && body.style.display !== 'none';
}

/* ---- Stimmen ----------------------------------------------------- */
/* Die Liste steht beim ersten Aufruf oft noch nicht bereit und wird
   dann über 'voiceschanged' nachgereicht. Bleibt sie leer, kann dieser
   Browser nicht sprechen – dann wird auch nicht gesprochen. */
function stimmenLaden() {
    if (!spracheVerfuegbar()) return [];
    try {
        const stimmen = window.speechSynthesis.getVoices() || [];
        if (stimmen.length) s5Stimmen = stimmen;
        return stimmen;
    } catch (e) {
        return [];
    }
}

function deutscheStimme() {
    const stimmen = s5Stimmen || [];
    return stimmen.find(s => s.lang && s.lang.toLowerCase().indexOf('de') === 0) || null;
}

/* ---- Ausfall ------------------------------------------------------ */
/* Eine Ansage ist fehlgeschlagen. Beim zweiten Mal hintereinander gilt:
   dieses Gerät spricht nicht. */
function ansageGescheitert() {
    s5Fehlversuche++;
    if (s5Fehlversuche >= S5_MAX_FEHLVERSUCHE) spracheAufgeben();
}

/* Sprachausgabe aufgeben: das Zahlwort tritt an die Stelle des
   Lautsprecher-Knopfs, damit die Aufgabe lösbar bleibt. */
function spracheAufgeben() {
    if (s5SpracheDefekt) return;
    s5SpracheDefekt = true;
    watchdogStoppen();

    const bereich = document.querySelector('.hoer-bereich');
    if (!bereich) return;

    const knopf = bereich.querySelector('.hoer-btn');
    if (knopf && knopf.parentNode) {
        const ersatz = document.createElement('div');
        ersatz.className = 'hoer-ersatz';
        ersatz.innerHTML = silbenHTML(zahlwortDE(ansageZahl));
        knopf.parentNode.replaceChild(ersatz, knopf);
    }

    const hilfe = bereich.querySelector('.hilfe-bereich');
    if (hilfe && hilfe.parentNode) hilfe.parentNode.removeChild(hilfe);

    // Nicht jeder Browser kann vorlesen. Das soll man wissen, statt zu
    // rätseln, warum kein Ton kommt.
    if (!bereich.querySelector('.hoer-hinweis')) {
        const notiz = document.createElement('div');
        notiz.className = 'hoer-hinweis';
        notiz.textContent = S5_HINWEIS;
        bereich.appendChild(notiz);
    }
}

/* ---- Ansagen ------------------------------------------------------ */
function watchdogStoppen() {
    if (s5Watchdog) { clearTimeout(s5Watchdog); s5Watchdog = null; }
}

function sprichZahl(zahl, langsam) {
    if (!spracheVerfuegbar()) return;

    if (s5AnsageTimeout) { clearTimeout(s5AnsageTimeout); s5AnsageTimeout = null; }

    try {
        // Nur abbrechen, wenn wirklich etwas läuft: ein cancel() im Leerlauf
        // bringt die Sprachausgabe mancher Browser aus dem Tritt.
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
    } catch (e) { /* dann eben ohne Abbruch */ }

    // Erst abbrechen, dann in einem eigenen Schritt sprechen – direkt nach
    // cancel() gestartete Ansagen verschlucken manche Browser.
    s5AnsageTimeout = setTimeout(() => {
        s5AnsageTimeout = null;
        if (zahl !== ansageZahl || !stationAktiv()) return;
        ansageStarten(zahl, langsam);
    }, 120);
}

function ansageStarten(zahl, langsam) {
    if (!spracheVerfuegbar()) return;

    // Steht die Stimmenliste noch nicht bereit, wird trotzdem gesprochen –
    // dann eben mit der Standardstimme des Browsers.
    if (!s5Stimmen || !s5Stimmen.length) stimmenLaden();

    // Hat die vorige Ansage sich nie gerührt, war sie ein Fehlversuch.
    if (s5LetzteAnsage && !s5LetzteAnsage.gemeldet) {
        s5LetzteAnsage = null;
        ansageGescheitert();
        if (!spracheVerfuegbar()) return;
    }

    try {
        // Nach einem Tabwechsel steht die Sprachausgabe pausiert da und
        // verschluckt jede weitere Ansage.
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();

        const text = new SpeechSynthesisUtterance(zahlwortDE(zahl));
        text.lang = 'de-DE';
        text.rate = langsam ? 0.6 : 0.9;
        const stimme = deutscheStimme();
        if (stimme) text.voice = stimme;

        // Jede Rückmeldung zählt: Die Sprachausgabe lebt.
        text.gemeldet = false;
        text.onstart = () => { text.gemeldet = true; };

        // Eine sauber beendete Ansage ist der Beweis, dass es geht.
        text.onend = () => {
            text.gemeldet = true;
            watchdogStoppen();
            s5Fehlversuche = 0;
        };

        // 'interrupted' und 'canceled' sind unsere eigenen Abbrüche –
        // die zählen nicht als Fehler.
        text.onerror = (ereignis) => {
            text.gemeldet = true;
            watchdogStoppen();
            const grund = ereignis && ereignis.error;
            if (grund !== 'interrupted' && grund !== 'canceled') ansageGescheitert();
        };

        s5Ansage = text;   // Referenz halten, sonst räumt Chrome sie weg
        s5LetzteAnsage = text;
        window.speechSynthesis.speak(text);

        // Regel 3: Kommt kein Ende, ist die Sprachausgabe kaputt.
        watchdogStoppen();
        s5Watchdog = setTimeout(() => {
            s5Watchdog = null;
            ansageGescheitert();
        }, S5_WACHFRIST);
    } catch (e) {
        ansageGescheitert();
    }
}

/* Räumt alles auf, was von Station 5 nachlaufen könnte: die Ansage und
   die wartende Selbstprüfung. */
function stopSprache() {
    if (s5SprechTimeout) { clearTimeout(s5SprechTimeout); s5SprechTimeout = null; }
    if (s5AnsageTimeout) { clearTimeout(s5AnsageTimeout); s5AnsageTimeout = null; }
    if (s5PruefTimeout)  { clearTimeout(s5PruefTimeout);  s5PruefTimeout = null; }
    watchdogStoppen();
    s5Ansage = null;

    if (!spracheVerfuegbar()) return;
    try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
    } catch (e) { /* nichts zu tun */ }
}


/* ---- Bausteine, die alle Aufgabentypen nutzen -------------------- */
/* Lautsprecher-Knopf – ohne Sprachausgabe steht das Zahlwort geschrieben
   da, zusammen mit dem Hinweis, woran es liegt. */
function station5HoerkopfHTML() {
    if (spracheVerfuegbar()) {
        return '<button class="hoer-btn" onclick="station5Vorlesen(false)">🔊 Nochmal hören</button>';
    }
    return '<div class="hoer-ersatz">' + silbenHTML(zahlwortDE(ansageZahl)) + '</div>' +
           '<div class="hoer-hinweis">' + S5_HINWEIS + '</div>';
}

/* Hilfe: noch einmal langsam vorlesen – startet bei jeder Aufgabe neu */
function station5LangsamHTML(farbe) {
    if (!spracheVerfuegbar()) return '';
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + farbe + ';">' +
           '<button class="hilfe-btn" onclick="station5Vorlesen(true)">🐌 Langsam vorlesen</button>' +
           '</div>';
}

/* ---- Die Unterstationen ------------------------------------------ */
function station5Bis100()  { station5Aufgabe(1, 100); }

/* Einstellige Zahlen kommen nur selten dran – gehört und getippt werden
   sollen vor allem die zweistelligen Zahlen. */
function station5Zufallszahl(min, max) {
    if (max > 9 && min <= 9 && Math.random() > 0.12) return randomInt(10, max);
    return randomInt(min, max);
}

function station5Aufgabe(min, max) {
    s5Zahl = station5Zufallszahl(min, max);
    ansageZahl = s5Zahl;
    s5Eingabe = '';

    setInstruction('Höre gut zu und tippe die Zahl ein.');

    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';

    document.getElementById('stationOptions').classList.remove('bild-opts');

    let html = '<div class="hoer-bereich" style="--hoer-farbe: ' + farbe + ';">';
    html += station5HoerkopfHTML();
    html += '<div class="hoer-anzeige zahl-karte luecke" id="s5Anzeige">?</div>';

    html += '<div class="tastenfeld" id="s5Tastenfeld">';
    for (let i = 1; i <= 9; i++) {
        html += '<button class="taste" onclick="station5Tippe(\'' + i + '\')">' + i + '</button>';
    }
    html += '<button class="taste taste-loeschen" onclick="station5Loeschen()">←</button>';
    html += '<button class="taste" onclick="station5Tippe(\'0\')">0</button>';
    html += '</div>';

    html += station5LangsamHTML(farbe);
    html += '</div>';
    setTaskArea(html);

    renderCheckButton('Prüfen ✓', station5Pruefen);
    station5FertigAktualisieren();

    // Kurz warten, damit das Kind die Aufgabe erst sieht und dann hört
    if (s5SprechTimeout) clearTimeout(s5SprechTimeout);
    s5SprechTimeout = setTimeout(() => sprichZahl(s5Zahl, false), 500);
}

function station5Vorlesen(langsam) {
    if (answerLocked) return;
    sprichZahl(s5Zahl, langsam);
}

/* Die gelöste Zahl leuchtet kurz grün auf – dann kommt die nächste Ansage */
function leuchteGruen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('leuchtet');
}

/* ---- Eingabe ---------------------------------------------------- */
function station5Tippe(ziffer) {
    if (answerLocked) return;
    if (s5Eingabe.length >= 3) return;
    if (s5Eingabe === '' && ziffer === '0') return;   // keine führende Null

    const neu = s5Eingabe + ziffer;
    if (parseInt(neu, 10) > 100) return;              // Zahlenraum bis 100

    s5Eingabe = neu;
    station5AnzeigeAktualisieren();
}

function station5Loeschen() {
    if (answerLocked) return;
    s5Eingabe = s5Eingabe.slice(0, -1);
    station5AnzeigeAktualisieren();
}

function station5AnzeigeAktualisieren() {
    const anzeige = document.getElementById('s5Anzeige');
    if (!anzeige) return;
    anzeige.textContent = s5Eingabe === '' ? '?' : s5Eingabe;
    anzeige.classList.toggle('luecke', s5Eingabe === '');
    station5FertigAktualisieren();

    // Steht die Zahl vollständig da, wird sofort geprüft – kein Extra-Tipp nötig.
    // Mindestens zwei Ziffern, damit die erste Ziffer einer zweistelligen
    // Zahl nicht schon als Antwort gewertet wird.
    if (s5Eingabe.length >= Math.max(2, String(s5Zahl).length)) {
        const getippt = s5Eingabe;
        // kurze Pause, damit die letzte Ziffer noch zu sehen ist
        if (s5PruefTimeout) clearTimeout(s5PruefTimeout);
        s5PruefTimeout = setTimeout(() => {
            s5PruefTimeout = null;
            // In dieser Pause kann die Zeit abgelaufen sein – dann zählt
            // die Eingabe nicht mehr.
            if (answerLocked || s5Eingabe !== getippt || !stationAktiv()) return;
            station5Pruefen();
        }, 350);
    }
}

/* Der Knopf wird meist nicht mehr gebraucht – er bleibt für den Fall,
   dass eine kürzere Zahl als erwartet eingetippt wurde.
   Gesperrt, solange noch nichts dasteht. */
function station5FertigAktualisieren() {
    const btn = document.querySelector('#stationOptions .check-btn');
    if (btn) btn.disabled = (s5Eingabe === '');
}

function station5Pruefen() {
    if (answerLocked || s5Eingabe === '') return;
    stopSprache();

    const pruefBtn = document.querySelector('#stationOptions .check-btn');
    if (pruefBtn) pruefBtn.disabled = true;

    const ok = (parseInt(s5Eingabe, 10) === s5Zahl);

    if (!submitAnswer(ok, 'Das war die ' + s5Zahl + ' (' + zahlwortDE(s5Zahl) + ').')) {
        // Noch ein Versuch: die Eingabe wird geleert, das Tastenfeld bleibt
        // offen. station5AnzeigeAktualisieren schaltet den Prüfknopf mit.
        s5Eingabe = '';
        station5AnzeigeAktualisieren();
        return;
    }

    fillLuecke('s5Anzeige', s5Zahl, ok);
    if (ok) leuchteGruen('s5Anzeige');

    const feld = document.getElementById('s5Tastenfeld');
    if (feld) Array.from(feld.children).forEach(b => b.disabled = true);
}

/* ---- Zahlbild: Zehnerstangen + Einerwürfel ---------------------- */
/* Die Einer stehen in Fünferspalten, damit sie – wie die Stangen –
   auf einen Blick erfassbar bleiben. */
function einerHTML(anzahl) {
    if (!anzahl) return '';

    let html = '<div class="einer-block">';
    let rest = anzahl;
    while (rest > 0) {
        const inSpalte = Math.min(5, rest);
        html += '<div class="einer-spalte">';
        for (let i = 0; i < inSpalte; i++) html += '<span class="einer-wuerfel"></span>';
        html += '</div>';
        rest -= inSpalte;
    }
    return html + '</div>';
}

function zahlbildHTML(zahl) {
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;

    return '<div class="zahlbild">' +
           (z ? zehnerstangenHTML([{ count: z, variant: 'a' }]) : '') +
           einerHTML(e) +
           '</div>';
}

/* ---- Unterstation "Bild finden" --------------------------------- */
/* Die Ablenker sind die typischen Hörfehler: Zehner und Einer
   vertauscht, ein Zehner daneben, ein Einer daneben. */
function station5BildOptionen(zahl) {
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;

    const vertauscht = e * 10 + z;   // 47 hören, 74 legen

    const weitere = [];
    if (z < 9) weitere.push((z + 1) * 10 + e);
    if (z > 1) weitere.push((z - 1) * 10 + e);
    if (e < 9) weitere.push(z * 10 + e + 1);
    if (e > 1) weitere.push(z * 10 + e - 1);

    const ablenker = shuffle(weitere)
        .filter(w => w !== zahl && w !== vertauscht)
        .slice(0, 2);

    return shuffle([zahl, vertauscht].concat(ablenker));
}

function station5Bild() {
    // Zehner und Einer verschieden, damit das Vertauschen sichtbar wird
    const z = randomInt(1, 9);
    let e = randomInt(1, 9);
    while (e === z) e = randomInt(1, 9);

    s5Zahl = z * 10 + e;
    ansageZahl = s5Zahl;
    s5Eingabe = '';

    setInstruction('Höre gut zu. Welches Bild zeigt die Zahl?');

    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';
    setTaskArea(
        '<div class="hoer-bereich" style="--hoer-farbe: ' + farbe + ';">' +
        station5HoerkopfHTML() +
        '<div class="hoer-anzeige zahl-karte luecke" id="s5BildZahl">?</div>' +
        station5LangsamHTML(farbe) +
        '</div>'
    );

    const opts = document.getElementById('stationOptions');
    opts.classList.add('bild-opts');

    renderOptions(station5BildOptionen(s5Zahl), s5Zahl, zahlbildHTML,
        zahlwortDE(s5Zahl) + ' sind ' + z + ' Zehner und ' + e + ' Einer.',
        // Die gehörte Zahl danach als Ziffern zeigen
        (wert, ok) => {
            fillLuecke('s5BildZahl', s5Zahl, ok);
            if (ok) leuchteGruen('s5BildZahl');
        });

    if (s5SprechTimeout) clearTimeout(s5SprechTimeout);
    s5SprechTimeout = setTimeout(() => sprichZahl(s5Zahl, false), 500);
}

/* Am Rechner darf auch die Tastatur benutzt werden */
function station5Tastatur(e) {
    if (!document.getElementById('s5Tastenfeld') || answerLocked) return;
    // Das Tastenfeld bleibt im Hintergrund stehen, wenn das Kind die
    // Station verlässt – dann darf die Tastatur nichts mehr auslösen.
    if (!stationAktiv()) return;

    if (e.key >= '0' && e.key <= '9') {
        station5Tippe(e.key);
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        station5Loeschen();
        e.preventDefault();
    } else if (e.key === 'Enter' && s5Eingabe !== '') {
        const btn = document.querySelector('#stationOptions .check-btn');
        if (btn && !btn.disabled) btn.click();
        e.preventDefault();
    }
}

document.addEventListener('keydown', station5Tastatur);

/* Stimmenliste vorwärmen – manche Browser laden sie erst nachträglich */
try {
    if (spracheVerfuegbar() && typeof window.speechSynthesis.addEventListener === 'function') {
        stimmenLaden();
        window.speechSynthesis.addEventListener('voiceschanged', stimmenLaden);
    }
} catch (e) { /* ohne vorgewärmte Stimmenliste weiter */ }

/* Tablets sprechen nur, wenn die Sprachausgabe einmal während einer
   Berührung begonnen hat. Unsere Ansagen kommen aber aus einem Timer –
   darum beim ersten Antippen einmal lautlos sprechen und so freischalten.
   In Firefox nachgemessen: Diese leere Ansage endet nach gut 100 ms und
   stört die folgenden nicht. */
let s5Freigeschaltet = false;

function spracheFreischalten() {
    if (s5Freigeschaltet || !spracheVerfuegbar()) return;
    s5Freigeschaltet = true;
    try {
        const leer = new SpeechSynthesisUtterance(' ');
        leer.volume = 0;
        window.speechSynthesis.speak(leer);
    } catch (e) { /* ohne Freischaltung weiter */ }
}

document.addEventListener('pointerdown', spracheFreischalten, { once: true });
document.addEventListener('touchstart', spracheFreischalten, { once: true });

/* Wird die App weggeklickt, bleibt eine laufende Ansage sonst hängen und
   verschluckt alle folgenden. */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSprache();
});

/* ============================================
   9c. Station 6: Zahlwörter bauen
   Die Zahl steht als Ziffern da. Links die Einerwörter,
   in der Mitte "und", rechts die Zehnerwörter – das Kind
   klickt die beiden Bausteine an.
   Das übt genau die deutsche Besonderheit: erst die Einer,
   dann die Zehner (47 → siebenundvierzig).
   ============================================ */
let s6Zahl = 0;
let s6Einer = null;    // angeklickte Einerzahl (1–9)
let s6Zehner = null;   // angeklickte Zehnerzahl (10–90)
/* Das "und" wird mitgeklickt: es gehört zum Zahlwort dazu und stand
   vorher nur als Deko zwischen den Spalten. */
let s6Und = false;

function station6NewTask() {
    // Ab 20: elf, zwölf, dreizehn … sind Sonderformen und lassen sich
    // nicht aus "ein/zwei/drei + und + zehn" zusammensetzen.
    const z = randomInt(2, 9);
    const e = randomInt(1, 9);

    s6Zahl = z * 10 + e;
    s6Einer = null;
    s6Zehner = null;
    s6Und = false;

    setInstruction('Aus welchen Wörtern besteht die Zahl? Klicke alle drei an.');

    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';

    let einerSpalte = '<div class="wort-spalte">';
    for (let i = 1; i <= 9; i++) {
        einerSpalte += '<button class="wort-btn" id="s6E' + i + '" ' +
                       'onclick="station6Waehle(\'einer\', ' + i + ')">' +
                       silbenHTML(einerBaustein(i)) + '</button>';
    }
    einerSpalte += '</div>';

    let zehnerSpalte = '<div class="wort-spalte">';
    for (let i = 1; i <= 9; i++) {
        zehnerSpalte += '<button class="wort-btn" id="s6Z' + (i * 10) + '" ' +
                        'onclick="station6Waehle(\'zehner\', ' + (i * 10) + ')">' +
                        silbenHTML(ZAHLWORTE[i * 10]) + '</button>';
    }
    zehnerSpalte += '</div>';

    setTaskArea(
        '<div class="wortbau-bereich" style="--wort-farbe: ' + farbe + ';">' +
        '<div class="zahl-gross">' + s6Zahl + '</div>' +
        '<div class="wortbau">' + einerSpalte +
        '<button class="wort-btn wort-und" id="s6Und" onclick="station6Waehle(\'und\')">und</button>' +
        zehnerSpalte + '</div>' +
        '<div class="wort-ergebnis" id="s6Ergebnis"></div>' +
        '</div>'
    );

    station6Markieren();
}

function station6Waehle(spalte, wert) {
    if (answerLocked) return;

    if (spalte === 'einer') s6Einer = wert;
    else if (spalte === 'zehner') s6Zehner = wert;
    else s6Und = true;

    station6Markieren();

    // Sobald alle drei Bausteine stehen, wird von selbst geprüft
    if (s6Einer !== null && s6Zehner !== null && s6Und) {
        const stand = s6Einer + '-' + s6Zehner;
        setTimeout(() => {
            if (!answerLocked && (s6Einer + '-' + s6Zehner) === stand) station6Pruefen();
        }, 350);
    }
}

/* Angeklickte Wörter hervorheben und die Ergebniszeile mitschreiben */
function station6Markieren() {
    for (let i = 1; i <= 9; i++) {
        const eBtn = document.getElementById('s6E' + i);
        const zBtn = document.getElementById('s6Z' + (i * 10));
        if (eBtn) eBtn.classList.toggle('gewaehlt', s6Einer === i);
        if (zBtn) zBtn.classList.toggle('gewaehlt', s6Zehner === i * 10);
    }

    const uBtn = document.getElementById('s6Und');
    if (uBtn) uBtn.classList.toggle('gewaehlt', s6Und);

    const zeile = document.getElementById('s6Ergebnis');
    if (!zeile) return;

    const teil = (wort) => wort
        ? '<span class="wort-teil">' + silbenHTML(wort) + '</span>'
        : '<span class="wort-teil offen">?</span>';

    zeile.innerHTML = teil(s6Einer ? einerBaustein(s6Einer) : null) +
                      (s6Und ? '<span class="wort-teil-und">und</span>'
                             : '<span class="wort-teil offen">?</span>') +
                      teil(s6Zehner ? ZAHLWORTE[s6Zehner] : null);
}

function station6Pruefen() {
    if (answerLocked || s6Einer === null || s6Zehner === null || !s6Und) return;

    const ok = (s6Zehner + s6Einer === s6Zahl);

    if (!submitAnswer(ok, s6Zahl + ' heißt ' + zahlwortDE(s6Zahl) +
                          ' – im Deutschen zuerst die Einer, dann die Zehner.')) {
        // Noch ein Versuch: die gewählten Wörter bleiben stehen und
        // können einzeln ausgetauscht werden
        return;
    }

    const richtigE = s6Zahl % 10;
    const richtigZ = s6Zahl - richtigE;

    // Wörter sperren, die richtigen grün, ein falscher Klick rot
    for (let i = 1; i <= 9; i++) {
        const eBtn = document.getElementById('s6E' + i);
        const zBtn = document.getElementById('s6Z' + (i * 10));
        if (eBtn) {
            eBtn.disabled = true;
            if (i === richtigE) eBtn.classList.add('wort-richtig');
            else if (i === s6Einer) eBtn.classList.add('wort-falsch');
        }
        if (zBtn) {
            zBtn.disabled = true;
            if (i * 10 === richtigZ) zBtn.classList.add('wort-richtig');
            else if (i * 10 === s6Zehner) zBtn.classList.add('wort-falsch');
        }
    }

    // Das "und" steht in jedem Zahlwort - es ist immer richtig
    const uBtn = document.getElementById('s6Und');
    if (uBtn) { uBtn.disabled = true; uBtn.classList.add('wort-richtig'); }

    // Das vollständige Zahlwort steht danach einmal komplett da
    const zeile = document.getElementById('s6Ergebnis');
    if (zeile) {
        zeile.innerHTML = '<span class="wort-loesung">' + silbenHTML(zahlwortDE(s6Zahl)) + '</span>';
        zeile.classList.add(ok ? 'ergebnis-richtig' : 'ergebnis-loesung');
        if (ok) leuchteGruen('s6Ergebnis');
    }
}

/* ============================================
   9d. Station 7: Paare finden
   Oben steht die gesuchte Zahl als Zahlwort in Silbenfarben, daneben
   ein Lautsprecher - wer mag, hört sie sich zusätzlich an. Auf dem
   Tisch liegen die Zahlenkarten und die Strichbilder. Beide Karten zur
   gesuchten Zahl müssen gefunden werden, erst dann kommt die nächste
   Zahl dran.

   Vom Wort zur Zahl statt umgekehrt: Im Deutschen wird 47 als
   "siebenundvierzig" gesprochen, der Einer also zuerst. Wer das Wort
   vor sich hat und die Ziffern suchen muss, kommt an dieser Umkehrung
   nicht vorbei. Darum liegt in jeder Runde auch ein Zahlendreher-Paar
   auf dem Tisch - 47 und 74 nebeneinander.

   Strichbild: ein Strich = ein Zehner, ein Punkt = ein Einer.
   ============================================ */
const S7_ZAHLEN = 4;   // Zahlen pro Runde

/* Jedes gefundene Pärchen bekommt seine eigene Farbe: das erste grün,
   das zweite orange, dann blau und lila. So ist auf einen Blick zu
   sehen, welche Karten zusammengehören und wie viel schon steht. */
const S7_FARBEN = [
    { rand: '#2E7D32', flaeche: '#C8E6C9' },   // grün
    { rand: '#E65100', flaeche: '#FFE0B2' },   // orange
    { rand: '#1565C0', flaeche: '#BBDEFB' },   // blau
    { rand: '#6A1B9A', flaeche: '#E1BEE7' }    // lila
];

let s7Karten = [];   // { id, typ: 'zahl' | 'bild', zahl, gepaart, farbe }
let s7Reihe = [];    // die Zahlen in der Reihenfolge, in der gefragt wird
let s7Schritt = 0;   // welche Zahl gerade gesucht wird

/* Strichdarstellung: Zehner als Striche, Einer als Punkte in Fünferspalten */
function strichbildHTML(zahl) {
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;

    // Gebündelt wie in der Strichliste: je fünf Zehner zusammen,
    // der fünfte Strich liegt quer über den ersten vier.
    let html = '<div class="strichbild"><div class="strich-gruppe">';
    let restZ = z;
    while (restZ > 0) {
        const imBuendel = Math.min(5, restZ);
        html += '<div class="strich-buendel">';
        for (let i = 0; i < (imBuendel === 5 ? 4 : imBuendel); i++) {
            html += '<span class="zehner-strich"></span>';
        }
        if (imBuendel === 5) html += '<span class="quer-strich"></span>';
        html += '</div>';
        restZ -= imBuendel;
    }
    html += '</div>';

    if (e) {
        html += '<div class="punkt-gruppe">';
        let rest = e;
        while (rest > 0) {
            const inSpalte = Math.min(5, rest);
            html += '<div class="punkt-spalte">';
            for (let i = 0; i < inSpalte; i++) html += '<span class="einer-punkt"></span>';
            html += '</div>';
            rest -= inSpalte;
        }
        html += '</div>';
    }
    return html + '</div>';
}

/* Die Zahlen einer Runde: ein Zahlendreher-Paar und zwei weitere.
   Der Dreher ist der Kern der Übung - er kommt nicht dem Zufall
   überlassen, sondern liegt in jeder Runde dabei. */
/* Die Zahlen einer Runde: ein Zahlendreher-Paar und zwei weitere.
   Der Dreher ist der Kern der Übung - er bleibt nicht dem Zufall
   überlassen, sondern liegt in jeder Runde dabei. */
function station7Zahlen() {
    const z = randomInt(1, 9);
    let e = randomInt(1, 9);
    while (e === z) e = randomInt(1, 9);

    const zahlen = [z * 10 + e, e * 10 + z];
    while (zahlen.length < S7_ZAHLEN) {
        const zahl = randomInt(11, 99);
        if (zahlen.indexOf(zahl) === -1) zahlen.push(zahl);
    }
    return zahlen;
}

/* Die gesuchte Zahl über dem Kartenfeld: das Zahlwort in Silbenfarben.
   Der Lautsprecher daneben ist ein Angebot - gelesen werden kann es
   auch ohne ihn. Kann der Browser nicht vorlesen, bleibt er einfach weg. */
function station7VorgabeZeigen() {
    const feld = document.getElementById('s7Vorgabe');
    if (!feld) return;

    const zahl = s7Reihe[s7Schritt];
    ansageZahl = zahl;   // der Lautsprecher sagt immer die gesuchte Zahl an

    feld.innerHTML =
        '<span class="paar-such-wort">' + silbenHTML(zahlwortDE(zahl)) + '</span>' +
        (spracheVerfuegbar()
            ? '<button class="paar-hoer-btn" onclick="station7Vorlesen()" ' +
              'title="Zahlwort vorlesen">🔊</button>'
            : '');
}

function station7Vorlesen() {
    ansageZahl = s7Reihe[s7Schritt];
    sprichZahl(ansageZahl, false);
}

function station7NewTask() {
    const zahlen = station7Zahlen();

    s7Karten = [];
    zahlen.forEach((zahl, i) => {
        s7Karten.push({ id: 'z' + i, typ: 'zahl', zahl: zahl, gepaart: false, farbe: 0 });
        s7Karten.push({ id: 'b' + i, typ: 'bild', zahl: zahl, gepaart: false, farbe: 0 });
    });
    s7Karten = shuffle(s7Karten);
    s7Reihe = shuffle(zahlen.slice());
    s7Schritt = 0;

    setInstruction('Lies das Zahlwort – oder hör es dir an. ' +
                   'Finde die Zahl und das passende Bild dazu.');

    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';
    let html = '<div class="paar-suche" style="--paar-farbe: ' + farbe + ';">' +
               '<span class="paar-such-label">Gesucht:</span>' +
               '<span id="s7Vorgabe" class="paar-such-karte"></span>' +
               '</div>';

    html += '<div class="paar-feld" style="--paar-farbe: ' + farbe + ';">';
    s7Karten.forEach(karte => {
        // leichte Drehung, damit die Karten wie hingelegt wirken
        const dreh = randomInt(-40, 40) / 10;
        html += '<button class="paar-karte paar-' + karte.typ + '" id="s7' + karte.id + '" ' +
                'style="--dreh: ' + dreh + 'deg;" ' +
                'onclick="station7Tippe(\'' + karte.id + '\')">' +
                '<span class="paar-punkt"></span>' +
                (karte.typ === 'zahl'
                    ? '<span class="paar-wert">' + karte.zahl + '</span>'
                    : strichbildHTML(karte.zahl)) +
                '<span class="paar-loesung" id="s7L' + karte.id + '"></span>' +
                '</button>';
    });
    setTaskArea(html + '</div>');

    station7VorgabeZeigen();
}

function station7Tippe(id) {
    if (answerLocked) return;

    const karte = s7Karten.find(k => k.id === id);
    if (!karte || karte.gepaart) return;

    const ziel = s7Reihe[s7Schritt];
    if (karte.zahl !== ziel) { station7Fehler(karte, ziel); return; }

    karte.gepaart = true;
    karte.farbe = s7Schritt;   // beide Karten eines Pärchens tragen dieselbe
    station7Markieren();

    // Erst wenn beide Karten zur gesuchten Zahl liegen, ist sie geschafft
    if (s7Karten.some(k => k.zahl === ziel && !k.gepaart)) {
        neuerSchritt();
        return;
    }

    s7Schritt++;
    if (s7Schritt >= s7Reihe.length) {
        submitAnswer(true);   // die letzte Zahl: die Runde ist geschafft
        return;
    }

    // Zahlen zwischendurch zählen sofort einen Punkt
    neuerSchritt();
    stationScore++;
    document.getElementById('stationScore').innerText = stationScore;
    station7VorgabeZeigen();
}

function station7Fehler(karte, ziel) {
    const el = document.getElementById('s7' + karte.id);
    if (el) el.classList.add('paar-falsch');

    const z = Math.floor(ziel / 10);
    const e = ziel % 10;

    if (!submitAnswer(false, 'Gesucht ist ' + zahlwortDE(ziel) + ', also die ' + ziel +
                             ': ' + z + ' Zehner und ' + e + ' Einer.')) {
        // Noch ein Versuch: die Karte wird wieder normal
        markierungLoesen(el, 'paar-falsch');
        return;
    }

    // Aufgelöst: die beiden gesuchten Karten heben sich hervor ...
    s7Karten.forEach(k => {
        if (k.zahl !== ziel) return;
        const treffer = document.getElementById('s7' + k.id);
        if (treffer) treffer.classList.add('paar-gesucht');
    });

    // ... und auf jeder offenen Bildkarte steht ihre Zahl
    s7Karten.forEach(k => {
        if (k.typ !== 'bild' || k.gepaart) return;
        const loesung = document.getElementById('s7L' + k.id);
        if (loesung) loesung.textContent = k.zahl;
    });
}

/* Gefundene Karten in der Farbe ihres Pärchens färben und sperren */
function station7Markieren() {
    s7Karten.forEach(karte => {
        const el = document.getElementById('s7' + karte.id);
        if (!el) return;

        if (karte.gepaart) {
            const farbe = S7_FARBEN[karte.farbe % S7_FARBEN.length];
            el.style.setProperty('--fund-rand', farbe.rand);
            el.style.setProperty('--fund-flaeche', farbe.flaeche);
        }
        el.classList.toggle('paar-gefunden', karte.gepaart);
        el.disabled = karte.gepaart;
    });
}

/* ============================================
   9e. Station 8: Zahlen zerlegen
   Zwei Zahlenkarten wie im Heft: blau die Zehner, rot die Einer.
   Darunter die Gleichung 84 = 80 + 4 mit drei Lücken.
   Das Kind legt die Karten der Reihe nach hinein - so entsteht
   die Zerlegung Schritt für Schritt und nicht als fertiger Satz.
   ============================================ */
let s8Zahl = 0;
let s8Ziele = [];    // die drei richtigen Werte: Zahl, Zehner, Einer
let s8Schritt = 0;   // welche Lücke als nächste dran ist

/* Die Auswahlkarten: die drei richtigen Zahlen und daneben genau die
   Verwechslungen, um die es geht - vertauschte Ziffern (48), der
   Zehner als bloße Ziffer (8), der Einer als Zehner (40). */
function station8Karten(z, e) {
    const karten = s8Ziele.slice();
    const kandidaten = [e * 10 + z, z, e * 10, z * 10 + (e < 9 ? e + 1 : e - 1)];

    kandidaten.forEach(k => {
        if (karten.length < 6 && k > 0 && karten.indexOf(k) === -1) karten.push(k);
    });
    return shuffle(karten);
}

function station8NewTask() {
    const z = randomInt(1, 9);
    const e = randomInt(1, 9);   // ohne Null: sonst hieße die Aufgabe 80 = 80 + 0

    s8Zahl = z * 10 + e;
    s8Ziele = [s8Zahl, z * 10, e];
    s8Schritt = 0;

    setInstruction('Zerlege die Zahl: erst die ganze Zahl, dann die Zehner, dann die Einer.');

    const karten = station8Karten(z, e).map(wert =>
        '<button class="zahl-karte klickbar" id="s8K' + wert + '" ' +
        'onclick="station8Pick(' + wert + ', this)">' + wert + '</button>').join('');

    setTaskArea(
        '<div class="zerlegen-bereich" style="--karte-farbe: var(--color-' +
        STATIONS[currentStationIndex].color + ');">' +

        /* Die Zehnerkarte trägt die ganze Zehnerzahl und ist darum doppelt
           so lang wie die Einerkarte. Die Einerkarte liegt genau auf der
           Null - dass dort eine Zehnerzahl steht, soll das Kind selbst
           herausfinden, nicht ablesen. */
        '<div class="stellenkarten">' +
        '<span class="stellenkarte zehner">' +
        '<span class="stelle">' + z + '</span><span class="stelle">0</span>' +
        '</span>' +
        '<span class="stellenkarte einer">' + e + '</span>' +
        '</div>' +

        '<div class="zerlegen-gleichung">' +
        '<span class="zahl-karte luecke dran" id="s8L0">?</span>' +
        '<span class="zerlegen-zeichen">=</span>' +
        '<span class="zahl-karte luecke" id="s8L1">?</span>' +
        '<span class="zerlegen-zeichen">+</span>' +
        '<span class="zahl-karte luecke" id="s8L2">?</span>' +
        '</div>' +

        '<div class="zerlegen-karten">' + karten + '</div>' +
        // Hilfe: dieselbe Zahl als Zehnerstangen und Einerwürfel
        rechenHilfeHTML(zahlbildHTML(s8Zahl)) +
        '</div>'
    );
}

/* Die nächste offene Lücke hervorheben - das Kind sieht, wo es
   weitergeht, ohne die Anweisung noch einmal zu lesen. */
function station8Markieren() {
    for (let i = 0; i < 3; i++) {
        const el = document.getElementById('s8L' + i);
        if (el) el.classList.toggle('dran', i === s8Schritt);
    }
}

function station8Pick(wert, btn) {
    if (answerLocked) return;

    if (wert !== s8Ziele[s8Schritt]) {
        btn.classList.add('karte-falsch');
        if (!submitAnswer(false, s8Zahl + ' = ' + s8Ziele[1] + ' + ' + s8Ziele[2] +
                                 '. Die blaue Karte sind die Zehner, die rote die Einer.')) {
            markierungLoesen(btn);
            return;
        }
        // Die vollständige Zerlegung steht danach einmal komplett da
        for (let i = s8Schritt; i < 3; i++) fillLuecke('s8L' + i, s8Ziele[i], false);
        station8Markieren();
        return;
    }

    neuerSchritt();
    fillLuecke('s8L' + s8Schritt, wert, true);
    btn.disabled = true;
    btn.classList.add('karte-verbraucht');

    s8Schritt++;
    station8Markieren();

    if (s8Schritt === 3) submitAnswer(true);
}

/* ============================================
   9f. Station 9: Zahlen vergleichen
   Zwischen zwei Zahlen fehlt das Zeichen < = >.
   Die Paare sind bewusst gemischt: mal entscheiden die Zehner,
   mal die Einer – und immer wieder kommt die Falle, bei der die
   kleinere Zahl die größeren Einer hat (38 < 41).
   ============================================ */
let s9Links = 0;
let s9Rechts = 0;

/* Liefert zwei Zahlen bis 100. Reiner Zufall brächte fast nur
   Aufgaben, bei denen schon die Zehner alles entscheiden – die
   lehrreichen Fälle müssen deshalb absichtlich vorkommen. */
function station9Paar() {
    const art = randomInt(1, 10);

    // Gleiche Zehner: jetzt entscheiden die Einer (43 – 47)
    if (art <= 3) {
        const z = randomInt(1, 9);
        const e1 = randomInt(0, 9);
        let e2 = randomInt(0, 9);
        while (e2 === e1) e2 = randomInt(0, 9);
        return [z * 10 + e1, z * 10 + e2];
    }

    // Die Falle: die kleinere Zahl hat die größeren Einer (38 – 41)
    if (art <= 6) {
        const z = randomInt(1, 8);
        return [z * 10 + randomInt(5, 9), (z + 1) * 10 + randomInt(0, 4)];
    }

    // Zwei gleiche Zahlen, damit das = nicht nur Deko ist
    if (art === 7) {
        const zahl = randomInt(11, 99);
        return [zahl, zahl];
    }

    let a = randomInt(11, 99);
    let b = randomInt(11, 99);
    while (b === a) b = randomInt(11, 99);
    return [a, b];
}

function station9NewTask() {
    const paar = shuffle(station9Paar());
    s9Links = paar[0];
    s9Rechts = paar[1];

    const richtig = (s9Links < s9Rechts) ? '<' : (s9Links > s9Rechts) ? '>' : '=';

    setInstruction('Welches Zeichen passt zwischen die beiden Zahlen?');

    setTaskArea(
        '<div class="vergleich-aufgabe">' +
        '<span class="zahl-karte">' + s9Links + '</span>' +
        '<span class="zahl-karte luecke" id="s9Zeichen">?</span>' +
        '<span class="zahl-karte">' + s9Rechts + '</span>' +
        '</div>' +
        // Hilfe: beide Zahlen als Zehnerstangen nebeneinander
        rechenHilfeHTML(
            '<div class="vergleich-bilder">' +
            '<div class="vergleich-bild">' + zahlbildHTML(s9Links) + '</div>' +
            '<div class="vergleich-bild">' + zahlbildHTML(s9Rechts) + '</div>' +
            '</div>')
    );

    renderOptions(['<', '=', '>'], richtig, null,
        'Vergleiche zuerst die Zehner. Sind sie gleich, entscheiden die Einer. ' +
        'Die offene Seite zeigt zur größeren Zahl.',
        // Zeichen einblenden: die Aussage steht danach komplett da
        (wert, ok) => fillLuecke('s9Zeichen', richtig, ok));
}

/* ============================================
   9g. Station 10: Wäscheleine
   Die Zahlen werden der Größe nach an die Leine gehängt.
   Die Plätze sind nummeriert, die erste Zahl hängt schon –
   so ist die Richtung auch ohne Lesen zu erkennen.
   ============================================ */
const S10_PLAETZE = 6;

let s10Ziel = [];       // richtige Reihenfolge
let s10Gehaengt = [];   // schon aufgehängte Zahlen
let s10Vorrat = [];     // Karten im Korb, feste Reihenfolge
let s10Dreh = [];       // leichte Drehung je Platz
let s10Aufsteigend = true;

function station10Aufsteigend() { station10Aufgabe(true); }
function station10Absteigend()  { station10Aufgabe(false); }

function station10Aufgabe(aufsteigend) {
    s10Aufsteigend = aufsteigend;

    const zahlen = [];
    while (zahlen.length < S10_PLAETZE) {
        const zahl = randomInt(11, 99);
        if (zahlen.indexOf(zahl) === -1) zahlen.push(zahl);
    }

    s10Ziel = zahlen.slice().sort((a, b) => aufsteigend ? a - b : b - a);
    s10Gehaengt = s10Ziel.slice(0, 1);          // Orientierungshilfe
    s10Vorrat = shuffle(s10Ziel.slice(1));
    s10Dreh = s10Ziel.map(() => randomInt(-30, 30) / 10);

    setInstruction(aufsteigend
        ? 'Hänge die Zahlen der Größe nach auf. Beginne mit der <strong>kleinsten</strong> Zahl. ⬆️'
        : 'Hänge die Zahlen der Größe nach auf. Beginne mit der <strong>größten</strong> Zahl. ⬇️');

    station10Zeichnen();
}

/* Über der Leine hängt Wäsche, die von Platz zu Platz größer (oder
   kleiner) wird. So sieht das Kind die Richtung, bevor es einen Satz
   liest - der Pfeil in der Aufgabe allein reicht vielen nicht. */
function station10BandHTML() {
    let html = '<div class="groessen-band" aria-hidden="true">';
    for (let i = 0; i < S10_PLAETZE; i++) {
        const stufe = s10Aufsteigend ? i : (S10_PLAETZE - 1 - i);
        const groesse = (0.85 + stufe * 0.33).toFixed(2);
        html += '<span class="groessen-feld"><span class="groessen-bild" ' +
                'style="font-size: ' + groesse + 'rem;">👕</span></span>';
    }
    return html + '</div>';
}

function station10Zeichnen() {
    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';

    let plaetze = '';
    for (let i = 0; i < S10_PLAETZE; i++) {
        const zahl = s10Gehaengt[i];
        const istDran = (i === s10Gehaengt.length);

        plaetze += '<div class="leine-platz">' +
                   '<span class="platz-nr">' + (i + 1) + '</span>';

        if (zahl !== undefined) {
            plaetze += '<div class="waesche-karte' + (i === 0 ? ' karte-vorgabe' : '') +
                       '" style="--dreh: ' + s10Dreh[i] + 'deg;">' +
                       '<span class="klammer"></span>' + zahl + '</div>';
        } else {
            plaetze += '<div class="waesche-platzhalter' + (istDran ? ' dran' : '') + '">' +
                       '<span class="klammer klammer-leer"></span></div>';
        }
        plaetze += '</div>';
    }

    let korb = '';
    s10Vorrat.forEach(zahl => {
        const haengt = (s10Gehaengt.indexOf(zahl) !== -1);
        korb += '<button class="vorrat-karte' + (haengt ? ' karte-verbraucht' : '') + '" ' +
                'id="s10V' + zahl + '"' + (haengt ? ' disabled' : '') +
                ' onclick="station10Pick(' + zahl + ')">' + zahl + '</button>';
    });

    setTaskArea(
        '<div class="leine-bereich" style="--leine-farbe: ' + farbe + ';">' +
        station10BandHTML() +
        '<div class="leine"><div class="leine-seil"></div>' +
        '<div class="leine-reihe">' + plaetze + '</div></div>' +
        '<div class="waesche-korb">' + korb + '</div>' +
        '</div>'
    );
}

function station10Pick(zahl) {
    if (answerLocked) return;
    if (s10Gehaengt.indexOf(zahl) !== -1) return;

    const erwartet = s10Ziel[s10Gehaengt.length];

    if (zahl !== erwartet) {
        const karte = document.getElementById('s10V' + zahl);
        if (karte) karte.classList.add('karte-falsch');
        if (!submitAnswer(false, 'Die richtige Reihenfolge wäre: ' + s10Ziel.join(' – '))) {
            markierungLoesen(karte);
        }
        return;
    }

    neuerSchritt();
    s10Gehaengt.push(zahl);
    station10Zeichnen();

    if (s10Gehaengt.length === S10_PLAETZE) submitAnswer(true);
}

/* ============================================
   9h. Stationen 11-13: Hunderterfeld und Hundertertafel
   Drei Sichtweisen auf dasselbe Hundert:
   - Station 11: das Punktefeld zeigt eine Menge ("wie viele sind es?")
   - Station 12: die Tafel zeigt, wo jede Zahl wohnt
   - Station 13: Ausschnitte, Nachbarn und Wege in der Tafel
   Die drei Stationen teilen sich die Bausteine dieses Abschnitts -
   Aufgaben mit Lücken laufen alle über htPick().
   ============================================ */

/* ---------- Baustein: Punktefeld (Hunderterfeld) ---------- */

/* 100 Punkte in 10 Reihen. Nach dem fünften Punkt und nach der fünften
   Reihe kommt eine größere Lücke - so bleibt die Fünfereinteilung
   ("Kraft der 5") sichtbar und das Kind muss nicht einzeln abzählen. */
function hunderterfeldHTML(zahl) {
    let html = '<div class="hunderterfeld">';
    for (let reihe = 0; reihe < 10; reihe++) {
        html += '<div class="hf-reihe">';
        for (let spalte = 0; spalte < 10; spalte++) {
            const nummer = reihe * 10 + spalte + 1;
            html += '<span class="hf-punkt' + (nummer <= zahl ? ' hf-voll' : '') + '"></span>';
        }
        html += '</div>';
    }
    return html + '</div>';
}

/* Zehner-Marken am Rand: 10, 20, 30 ... als Zählhilfe.
   Beziffert werden nur die vollen Reihen - dann steht dort genau die
   Zehnerzahl, zu der die letzten Punkte noch dazukommen. Die leeren
   Marken bleiben stehen, damit die Reihen ausgerichtet bleiben. */
function hunderterMarkenHTML(zahl) {
    let html = '<div class="hf-marken" aria-hidden="true">';
    for (let i = 1; i <= 10; i++) {
        html += '<span class="hf-marke">' + (i * 10 <= zahl ? (i * 10) : '') + '</span>';
    }
    return html + '</div>';
}

function hunderterfeldBereichHTML(zahl) {
    return '<div class="hf-bereich" id="hfBereich">' +
           hunderterfeldHTML(zahl) + hunderterMarkenHTML(zahl) + '</div>';
}

function hunderterHilfeHTML() {
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + htFarbe() + ';">' +
           '<button class="hilfe-btn" id="hfHilfeBtn" onclick="toggleHunderterHilfe()">' +
           '🔢 Zehner zeigen</button></div>';
}

/* Die Marken sind zu Beginn jeder Aufgabe wieder aus: erst selbst in
   Reihen denken, die Hilfe nur bei Bedarf dazuschalten. */
function toggleHunderterHilfe() {
    const bereich = document.getElementById('hfBereich');
    const btn = document.getElementById('hfHilfeBtn');
    if (!bereich || !btn) return;

    const zeigen = !bereich.classList.contains('marken-sichtbar');
    bereich.classList.toggle('marken-sichtbar', zeigen);
    btn.classList.toggle('aktiv', zeigen);
    btn.textContent = zeigen ? '🔢 Zehner ausblenden' : '🔢 Zehner zeigen';
}

/* Nach der Antwort die Marken einblenden - dann steht neben dem Feld,
   warum es genau diese Zahl war. */
function hunderterMarkenZeigen() {
    const bereich = document.getElementById('hfBereich');
    if (bereich && !bereich.classList.contains('marken-sichtbar')) toggleHunderterHilfe();
}

/* Ablenker sind genau die Verwechslungen, um die es beim Ablesen geht:
   Ziffern vertauscht (74 statt 47), eine Reihe zu viel oder zu wenig,
   ein Punkt daneben. */
function hunderterOptionen(zahl) {
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;
    const optionen = [zahl];

    const vertauscht = e * 10 + z;
    if (vertauscht >= 1 && vertauscht !== zahl) optionen.push(vertauscht);

    shuffle([zahl + 10, zahl - 10, zahl + 1, zahl - 1]).forEach(k => {
        if (optionen.length < 4 && k >= 1 && k <= 100 && optionen.indexOf(k) === -1) {
            optionen.push(k);
        }
    });
    return shuffle(optionen);
}

/* ---------- Baustein: Hundertertafel ---------- */

/* Die Tafel ist zeilenweise gefüllt: 1-10, 11-20, ... 91-100.
   Zeile und Spalte werden ab 1 gezählt, wie das Kind sie abzählt. */
function htZeile(zahl)  { return Math.ceil(zahl / 10); }
function htSpalte(zahl) { return ((zahl - 1) % 10) + 1; }

function htFarbe() {
    return 'var(--color-' + STATIONS[currentStationIndex].color + ')';
}

/* Die Tafel mit 100 Feldern. zelleFn bestimmt, wie ein einzelnes Feld
   aussieht - so bauen alle Aufgaben dieselbe Tafel unterschiedlich auf. */
function htTafelHTML(zelleFn) {
    let zellen = '';
    for (let zahl = 1; zahl <= 100; zahl++) zellen += zelleFn(zahl);
    return '<div class="hundertertafel">' + zellen + '</div>';
}

function htSchlichteTafelHTML() {
    return htTafelHTML(zahl => '<span class="ht-zelle">' + zahl + '</span>');
}

function htBereichHTML(inhalt) {
    return '<div class="ht-bereich" style="--ht-farbe: ' + htFarbe() + ';">' + inhalt + '</div>';
}

/* Die gesuchte Zahl groß neben der Tafel. Beim Abzählen von Zeile und
   Spalte soll das Kind nicht in den Aufgabentext zurückspringen müssen -
   und schon gar nicht die Zahl aus dem Gedächtnis holen. */
function htTafelMitZahlHTML(tafel, zahl, label) {
    return '<div class="ht-mit-zahl">' + tafel +
           '<div class="ht-suchzahl">' +
           '<span class="ht-suchzahl-label">' + (label || 'Gesucht') + '</span>' +
           '<span class="ht-suchzahl-wert">' + zahl + '</span>' +
           '</div></div>';
}

/* Zuschaltbare Hilfe im Stil der Zehnerstangen-Hilfe. Die Beschriftung
   steckt am Knopf, damit der Umschalter für jede Hilfe derselbe ist. */
function htHilfeHTML(inhalt, ausLabel, anLabel) {
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + htFarbe() + ';">' +
           '<button class="hilfe-btn" id="htHilfeBtn" data-aus="' + ausLabel + '" ' +
           'data-an="' + anLabel + '" onclick="htHilfeToggle()">' + ausLabel + '</button>' +
           '<div class="hilfe-inhalt" id="htHilfe">' + inhalt + '</div></div>';
}

function htHilfeToggle() {
    const box = document.getElementById('htHilfe');
    const btn = document.getElementById('htHilfeBtn');
    if (!box || !btn) return;

    const zeigen = !box.classList.contains('sichtbar');
    box.classList.toggle('sichtbar', zeigen);
    btn.classList.toggle('aktiv', zeigen);
    btn.textContent = zeigen ? btn.dataset.an : btn.dataset.aus;
}

/* ---------- Baustein: der Lerncoach ---------- */

/* Der Coach sagt nichts vor - er legt das leere Raster der
   Hundertertafel daneben, in dem das Kind Zeilen und Spalten abzählt.
   Zwei Schalter legen die Zählhilfe in die Tafel: die erste Reihe
   1 bis 10 und die letzte Spalte 10 bis 100. Die volle Tafel gibt es
   erst bei der Auflösung - vorher stünde die Antwort schon da. */
let coachEiner = false;    // erste Reihe 1 bis 10
let coachZehner = false;   // letzte Spalte 10 bis 100
let coachZeichnen = null;  // die Aufgabe mit der Tafel zeichnet sich selbst neu

/* Zu Beginn jeder Aufgabe ist der Coach wieder zu - erst selbst
   überlegen, das Raster nur bei Bedarf dazuholen. */
function coachZuruecksetzen() {
    coachEiner = false;
    coachZehner = false;
    coachZeichnen = null;
}

/* Die Tafel im Coach bleibt leer: sie ist ein Raster zum Abzählen und
   kein Nachschlagewerk - mit allen Zahlen darin stünde die Antwort
   schon da. Dazuschalten lässt sich die Zählhilfe, und zwar in der
   Tafel selbst: die erste Reihe 1 bis 10, an der sich die Spalte
   abzählen lässt, und die letzte Spalte 10 bis 100 für die Zeile.
   Eine zweite Beschriftung außerhalb der Tafel bräuchte es dann nicht -
   sie sagte dasselbe noch einmal, nur einen Schritt weiter weg. */
function coachTafelHTML(zelleFn) {
    const zeichne = zelleFn || ((zahl, hilfe) =>
        '<span class="ht-zelle' + (hilfe ? ' ht-hilfszahl' : '') + '">' + hilfe + '</span>');

    return htTafelHTML(zahl => zeichne(zahl, coachHilfszahl(zahl)));
}

/* Steht diese Zahl gerade als Zählhilfe in der Tafel? Ergibt die Zahl
   als Text, sonst nichts - so kann jede Aufgabe selbst entscheiden, wie
   sie die Hilfszahl in ihrem Feld unterbringt. */
function coachHilfszahl(zahl) {
    const hilft = (coachEiner && htZeile(zahl) === 1) ||
                  (coachZehner && htSpalte(zahl) === 10);
    return hilft ? String(zahl) : '';
}

/* Die Tafel steht dort, wo die Aufgabe in ihr gelöst wird: sie ist
   keine Hilfe zum Dazuholen, sondern das Blatt, auf dem gearbeitet
   wird. zelleFn bestimmt, was in den Feldern steht - so lässt sich
   darin auch markieren und färben. */
function coachDauerHTML(zelleFn) {
    return '<div class="coach coach-dauer" style="--coach-farbe: ' + htFarbe() + ';">' +
           '<div class="coach-panel">' + coachInhaltHTML(zelleFn) + '</div></div>';
}

function coachInhaltHTML(zelleFn) {
    let hinweis = '';
    if (coachEiner) {
        hinweis += 'Die <strong>erste Reihe</strong> steht jetzt in der Tafel: 1 bis 10. ' +
                   'An ihr zählst du die Spalte ab. ';
    }
    if (coachZehner) {
        hinweis += 'Die <strong>letzte Spalte</strong> steht jetzt in der Tafel: ' +
                   '10, 20, 30 … 100. An ihr zählst du die Zeile ab.';
    }

    return '<p class="coach-text">Zähle im Raster nach: die <strong>Zeilen</strong> ' +
           'von oben, die <strong>Spalten</strong> von links.</p>' +
           '<div class="coach-schalter-reihe">' +
           '<button class="coach-schalter' + (coachEiner ? ' aktiv' : '') + '" ' +
           'onclick="coachEinerToggle()">1️⃣ Einer ' +
           (coachEiner ? 'ausblenden' : 'zeigen') + '</button>' +
           '<button class="coach-schalter' + (coachZehner ? ' aktiv' : '') + '" ' +
           'onclick="coachZehnerToggle()">🔟 Zehner ' +
           (coachZehner ? 'ausblenden' : 'zeigen') + '</button>' +
           '</div>' +
           (hinweis ? '<p class="coach-hinweis">' + hinweis + '</p>' : '') +
           coachTafelHTML(zelleFn);
}

function coachEinerToggle() {
    coachEiner = !coachEiner;
    coachAktualisieren();
}

function coachZehnerToggle() {
    coachZehner = !coachZehner;
    coachAktualisieren();
}

/* Ein Schalter ändert nur die Tafel: die Aufgabe zeichnet sich selbst
   neu, damit Markierungen und gefärbte Felder stehen bleiben. */
function coachAktualisieren() {
    if (coachZeichnen) coachZeichnen();
}

/* ---------- Baustein: Lücken füllen mit Kartenvorrat ---------- */

let htFragen = [];      // fehlende Zahlen, in der Reihenfolge, in der gefragt wird
let htGefuellt = [];    // schon richtig eingesetzte Zahlen
let htSchritt = 0;      // welche Lücke gerade dran ist
let htKarten = [];      // Vorrat unter der Aufgabe
let htZeichnen = null;  // Ansicht der aktuellen Aufgabe
let htAufgeloest = false;

function htStart(fragen, karten, zeichnen) {
    htFragen = fragen;
    htKarten = karten;
    htGefuellt = [];
    htSchritt = 0;
    htAufgeloest = false;
    htZeichnen = zeichnen;
}

function htKartenHTML() {
    let html = '<div class="ht-vorrat">';
    htKarten.forEach(zahl => {
        const weg = (htGefuellt.indexOf(zahl) !== -1);
        html += '<button class="ht-karte' + (weg ? ' karte-verbraucht' : '') +
                '" id="htK' + zahl + '"' + (weg ? ' disabled' : '') +
                ' onclick="htPick(' + zahl + ')">' + zahl + '</button>';
    });
    return html + '</div>';
}

/* Wie eine Lücke aussieht: noch offen, gerade gefragt, selbst gefüllt
   oder nach einem Fehler aufgelöst. */
function htLueckeHTML(zahl) {
    if (htGefuellt.indexOf(zahl) !== -1) {
        return '<span class="ht-zelle ht-gefuellt">' + zahl + '</span>';
    }
    if (htAufgeloest) {
        return '<span class="ht-zelle ht-loesung">' + zahl + '</span>';
    }
    const dran = (zahl === htFragen[htSchritt]);
    return '<span class="ht-zelle ht-luecke' + (dran ? ' ht-dran' : '') + '">' +
           (dran ? '?' : '') + '</span>';
}

function htPick(zahl) {
    if (answerLocked) return;
    if (htGefuellt.indexOf(zahl) !== -1) return;

    const gesucht = htFragen[htSchritt];

    if (zahl !== gesucht) {
        if (!submitAnswer(false, 'In das gesuchte Feld gehört die ' + gesucht + '.')) {
            // Noch ein Versuch: die Karte leuchtet nur kurz rot und bleibt im
            // Vorrat - sie kann für eine andere Lücke die richtige sein
            markierungLoesen(document.getElementById('htK' + zahl));
            return;
        }
        // Alle offenen Lücken auflösen: die Aufgabe steht danach einmal vollständig da
        htAufgeloest = true;
        htZeichnen();
        const karte = document.getElementById('htK' + zahl);
        if (karte) karte.classList.add('karte-falsch');
        return;
    }

    htGefuellt.push(zahl);
    htSchritt++;
    htZeichnen();

    if (htSchritt === htFragen.length) {
        submitAnswer(true);
    } else {
        // Jede gefüllte Lücke zählt sofort - eine Aufgabe hat mehrere davon
        neuerSchritt();
        stationScore++;
        document.getElementById('stationScore').innerText = stationScore;
    }
}

/* Ablenker für den Vorrat: Nachbarn der gesuchten Zahlen, die selbst
   nicht in der Aufgabe stehen - also genau die Zahlen, die man um eins,
   um einen Zehner oder schräg daneben greift. */
function htStoerer(belegt, luecken, anzahl) {
    const kandidaten = [];
    luecken.forEach(zahl => {
        [zahl - 11, zahl - 10, zahl - 9, zahl - 1,
         zahl + 1, zahl + 9, zahl + 10, zahl + 11].forEach(k => kandidaten.push(k));
    });

    const stoerer = [];
    shuffle(kandidaten).forEach(k => {
        if (stoerer.length < anzahl && k >= 1 && k <= 100 &&
            belegt.indexOf(k) === -1 && stoerer.indexOf(k) === -1) {
            stoerer.push(k);
        }
    });
    return stoerer;
}

/* ============================================
   Station 11: Hunderterfeld
   ============================================ */

/* ---------- Welche Zahl ist dargestellt? ---------- */

function station11Ablesen() {
    const zahl = randomInt(11, 99);
    const z = Math.floor(zahl / 10);
    const e = zahl % 10;

    setInstruction('Welche Zahl ist im Hunderterfeld dargestellt?');
    setTaskArea(hunderterfeldBereichHTML(zahl) + hunderterHilfeHTML());

    const hinweis = (e === 0)
        ? 'Es sind ' + z + ' volle Reihen, also ' + zahl + '.'
        : 'Es sind ' + z + ' volle Reihen (' + (z * 10) + ') und ' + e +
          ' Punkte mehr, also ' + zahl + '.';

    renderOptions(hunderterOptionen(zahl), zahl, null, hinweis, hunderterMarkenZeigen);
}

/* ---------- Zahl selbst legen ---------- */

/* Gebaut wird mit +10 und +1, nicht Punkt für Punkt: so entsteht die
   Zahl aus Zehnern und Einern und nicht durch Abzählen. */
let s11Ziel = 0;
let s11Gelegt = 0;

function station11Legen() {
    s11Ziel = randomInt(11, 99);
    s11Gelegt = 0;

    setInstruction('Lege die Zahl <strong>' + s11Ziel + '</strong> im Hunderterfeld.');
    setTaskArea(
        hunderterfeldBereichHTML(0) +
        '<div class="hf-tasten">' +
        '<button class="hf-taste" onclick="station11LegenSchritt(10)">+10</button>' +
        '<button class="hf-taste" onclick="station11LegenSchritt(1)">+1</button>' +
        '<button class="hf-taste" onclick="station11LegenSchritt(-1)">−1</button>' +
        '<button class="hf-taste" onclick="station11LegenSchritt(-10)">−10</button>' +
        '</div>' + hunderterHilfeHTML()
    );

    renderCheckButton('Fertig ✓', station11LegenPruefen);
}

/* Nur die Punkte umfärben statt das Feld neu zu bauen - sonst würde bei
   jedem Tastendruck die eingeblendete Zehner-Hilfe wieder verschwinden. */
function station11LegenSchritt(delta) {
    if (answerLocked) return;
    s11Gelegt = Math.min(100, Math.max(0, s11Gelegt + delta));
    station11LegenAktualisieren();
}

function station11LegenAktualisieren() {
    document.querySelectorAll('#hfBereich .hf-punkt').forEach((el, i) => {
        el.classList.toggle('hf-voll', i < s11Gelegt);
    });
    document.querySelectorAll('#hfBereich .hf-marke').forEach((el, i) => {
        const zehner = (i + 1) * 10;
        el.textContent = (zehner <= s11Gelegt) ? zehner : '';
    });
}

function station11LegenPruefen(btn) {
    const richtig = (s11Gelegt === s11Ziel);
    const gelegt = s11Gelegt;

    if (!submitAnswer(richtig, 'Du hast ' + gelegt + ' gelegt, gesucht war ' + s11Ziel + '.')) {
        // Noch ein Versuch: das Gelegte bleibt stehen und kann mit den
        // Tasten verbessert werden
        if (btn) btn.disabled = false;
        return;
    }

    // Bei einem Fehler das Feld auf die gesuchte Zahl bringen,
    // damit die richtige Darstellung einmal dasteht
    if (!richtig) {
        s11Gelegt = s11Ziel;
        station11LegenAktualisieren();
    }
    hunderterMarkenZeigen();
}

/* ============================================
   Station 12: Hundertertafel
   ============================================ */

/* ---------- Wo wohnt die Zahl? ---------- */

/* Die Tafel ist leer bis auf die vier Eckzahlen - so wie die leere
   Hundertertafel im Heft. Über die Ecken findet das Kind die Zeile
   und die Spalte, in der die Zahl stehen muss. */
const HT_ECKEN = [1, 10, 91, 100];

let s12Ziel = 0;
let s12Getippt = 0;
let s12Falsch = [];        // im ersten Anlauf danebengetippte Felder
let s12ZehnerAn = false;   // Zählhilfe: die Zehnerzahlen am rechten Rand
let s12EinerAn = false;    // Zählhilfe: die erste Reihe 1 bis 10

/* Gesucht wird nie eine Zahl der Zehnerspalte und keine der ersten
   Reihe: dort bliebe mit eingeschalteter Hilfe genau ein Feld frei und
   verriete die Lösung. */
function station12Wohnort() {
    do {
        s12Ziel = randomInt(1, 100);
    } while (HT_ECKEN.indexOf(s12Ziel) !== -1 || htSpalte(s12Ziel) === 10 ||
             htZeile(s12Ziel) === 1);
    s12Getippt = 0;
    s12Falsch = [];
    s12ZehnerAn = false;   // beide Hilfen starten bei jeder Aufgabe wieder aus
    s12EinerAn = false;

    setInstruction('Wo wohnt diese Zahl in der Hundertertafel? Tippe das Feld an.');
    station12WohnortZeichnen();
}

/* Sichtbar sind die vier Eckzahlen - und auf Wunsch die Zehnerzahlen am
   rechten Rand, an denen sich die Zeile abzählen lässt, sowie die erste
   Reihe 1 bis 10 für die Spalte. */
function station12WohnortZeichnen() {
    const html = htTafelHTML(zahl => {
        // Danebengetippt: das Feld bleibt rot stehen und zeigt seine Zahl.
        // Das ist die eigentliche Lehre des Fehlversuchs - hier wohnt eben
        // die 63 und nicht die 89.
        if (s12Falsch.indexOf(zahl) !== -1) {
            return '<span class="ht-zelle ht-daneben">' + zahl + '</span>';
        }

        if (s12Getippt) {
            if (zahl === s12Ziel) {
                return '<span class="ht-zelle ' +
                       (s12Getippt === s12Ziel ? 'ht-gefuellt' : 'ht-loesung') + '">' + zahl + '</span>';
            }
            if (zahl === s12Getippt) {
                return '<span class="ht-zelle ht-daneben">' + zahl + '</span>';
            }
        }

        const vorgegeben = HT_ECKEN.indexOf(zahl) !== -1 ||
                           (s12ZehnerAn && htSpalte(zahl) === 10) ||
                           (s12EinerAn && htZeile(zahl) === 1);
        if (vorgegeben) return '<span class="ht-zelle ht-hilfszahl">' + zahl + '</span>';

        if (!s12Getippt) {
            return '<button class="ht-zelle ht-feld" ' +
                   'onclick="station12WohnortTippe(' + zahl + ')"></button>';
        }
        return '<span class="ht-zelle"></span>';
    });

    setTaskArea(htBereichHTML(htTafelMitZahlHTML(html, s12Ziel)) +
        '<div class="hilfe-bereich" style="--hilfe-farbe: ' + htFarbe() + ';">' +
        '<button class="hilfe-btn' + (s12EinerAn ? ' aktiv' : '') +
        '" onclick="station12WohnortEinerToggle()">1️⃣ Erste Reihe ' +
        (s12EinerAn ? 'ausblenden' : 'zeigen') + '</button>' +
        '<button class="hilfe-btn' + (s12ZehnerAn ? ' aktiv' : '') +
        '" onclick="station12ZehnerToggle()">🔟 Zehnerzahlen ' +
        (s12ZehnerAn ? 'ausblenden' : 'zeigen') + '</button></div>');
}

function station12ZehnerToggle() {
    s12ZehnerAn = !s12ZehnerAn;
    station12WohnortZeichnen();
}

function station12WohnortEinerToggle() {
    s12EinerAn = !s12EinerAn;
    station12WohnortZeichnen();
}

function station12WohnortTippe(zahl) {
    if (answerLocked) return;

    const hinweis = 'Die ' + s12Ziel + ' steht in Zeile ' + htZeile(s12Ziel) +
                    ' und Spalte ' + htSpalte(s12Ziel) + '.';

    if (!submitAnswer(zahl === s12Ziel, hinweis)) {
        // Noch ein Versuch: das gesuchte Feld bleibt verdeckt
        if (s12Falsch.indexOf(zahl) === -1) s12Falsch.push(zahl);
        station12WohnortZeichnen();
        return;
    }

    s12Getippt = zahl;
    station12WohnortZeichnen();
}

/* ---------- Fehlende Zahlen ergänzen ---------- */

const HT_TAFEL_LUECKEN = 6;

function station12Luecken() {
    const luecken = [];
    while (luecken.length < HT_TAFEL_LUECKEN) {
        const zahl = randomInt(1, 100);
        if (luecken.indexOf(zahl) === -1) luecken.push(zahl);
    }

    // Gefragt wird bewusst nicht der Reihe nach: sonst könnte das Kind die
    // Karten einfach der Größe nach ablegen, ohne in die Tafel zu schauen.
    htStart(luecken, shuffle(luecken), station12LueckenZeichnen);

    setInstruction('In der Hundertertafel fehlen Zahlen. ' +
                   'Welche Zahl gehört in das Feld mit dem <strong>?</strong>');
    station12LueckenZeichnen();
}

function station12LueckenZeichnen() {
    const html = htTafelHTML(zahl => (htFragen.indexOf(zahl) === -1)
        ? '<span class="ht-zelle">' + zahl + '</span>'
        : htLueckeHTML(zahl));
    setTaskArea(htBereichHTML(html + htKartenHTML()));
}

/* ---------- Zahlen färben ---------- */

/* Beide Färb-Aufgaben arbeiten gleich: vorgegebene Zahlen, eine Tafel
   ohne Ziffern, und aus den gefärbten Feldern entsteht ein Muster.
   Ein Fehlgriff beendet die Aufgabe nicht - bei zwanzig Tipps pro Bild
   soll ein Verrutschen nicht alles kosten. Das Feld leuchtet kurz rot
   und wird wieder frei; gezählt wird jedes richtig gefärbte Feld. */
/* Eine Aufgabe kann aus mehreren Teilen bestehen - beim Färben 1 sind es
   sechs Linien nacheinander. Jeder Teil ist für sich eine Aufgabe und
   beginnt auf einer frischen, leeren Tafel: so steht am Ende jede Zeile
   und jede Spalte einmal ungestört für sich da. */
let malProgramm = [];     // [{ frage, zahlen }] - die Teile der Aufgabe
let malSchritt = 0;       // welcher Teil gerade dran ist
let malGefaerbt = [];     // gefärbte Felder des laufenden Teils
let malMitCoach = false;  // Einer und Zehner zuschaltbar?
let malAbschluss = null;  // was geschieht, wenn das Bild fertig ist

function malStart(programm, mitCoach, abschluss) {
    // Der Größe nach: so steht der Zettel in derselben Ordnung da,
    // in der das Kind die Zahlen in der Tafel findet
    malProgramm = programm.map(teil => ({
        frage: teil.frage,
        zahlen: teil.zahlen.slice().sort((a, b) => a - b)
    }));
    malSchritt = 0;
    malGefaerbt = [];
    malMitCoach = mitCoach;
    malAbschluss = abschluss || null;

    coachZuruecksetzen();
    if (mitCoach) coachZeichnen = malZeichnen;   // die Schalter zeichnen die Aufgabe neu

    malSchrittZeigen();
}

function malZiel() {
    return malProgramm[malSchritt].zahlen;
}

function malSchrittZeigen() {
    setInstruction(malProgramm[malSchritt].frage);
    malZeichnen();
}

/* Fertig ist ein Teil, wenn alle seine Zahlen gefärbt sind - auch die,
   die schon von einer früheren Linie her stehen (dort, wo Zeile und
   Spalte sich kreuzen). */
function malTeilFertig() {
    return malZiel().every(zahl => malGefaerbt.indexOf(zahl) !== -1);
}

/* Die Liste der vorgegebenen Zahlen: keine Karten zum Antippen, sondern
   ein Zettel zum Abhaken - gefärbt wird in der Tafel. */
function malListeHTML() {
    let html = '';

    // Bei mehreren Teilen soll zu sehen sein, wie weit die Aufgabe ist
    if (malProgramm.length > 1) {
        html += '<p class="mal-schritt">Linie ' + (malSchritt + 1) +
                ' von ' + malProgramm.length + '</p>';
    }

    html += '<div class="mal-liste">';
    malZiel().forEach(zahl => {
        const fertig = (malGefaerbt.indexOf(zahl) !== -1);
        html += '<span class="mal-zahl' + (fertig ? ' mal-zahl-fertig' : '') + '">' +
                zahl + '</span>';
    });
    return html + '</div>';
}

/* hilfe ist die Zahl der Zählhilfe, falls sie hier gerade steht. Sie
   bleibt auch auf dem gefärbten Feld sichtbar - sonst verschwände beim
   Färben der ersten Reihe genau das Lineal, an dem abgezählt wird. */
function malZelleHTML(zahl, hilfe) {
    if (malGefaerbt.indexOf(zahl) !== -1) {
        return '<span class="ht-zelle ht-gefaerbt">' + hilfe + '</span>';
    }
    return '<button class="ht-zelle ht-feld' + (hilfe ? ' ht-hilfszahl' : '') +
           '" id="mal' + zahl + '" onclick="malTippe(' + zahl + ')">' + hilfe + '</button>';
}

function malZeichnen() {
    const tafel = malMitCoach
        ? coachDauerHTML(malZelleHTML)
        : htBereichHTML(htTafelHTML(zahl => malZelleHTML(zahl, '')));
    setTaskArea(malListeHTML() + tafel);
}

function malTippe(zahl) {
    if (answerLocked) return;
    if (malGefaerbt.indexOf(zahl) !== -1) return;

    // Danebengetippt: kurz rot, dann wieder frei. Die Tafel wird dafür
    // nicht neu gezeichnet, sonst wäre das Aufleuchten sofort wieder weg.
    if (malZiel().indexOf(zahl) === -1) {
        const feld = document.getElementById('mal' + zahl);
        if (feld) {
            feld.classList.add('ht-daneben');
            markierungLoesen(feld, 'ht-daneben');
        }
        return;
    }

    malGefaerbt.push(zahl);

    // Das letzte Feld des letzten Teils beendet die Aufgabe - den Punkt
    // dafür vergibt submitAnswer
    if (malTeilFertig() && malSchritt + 1 >= malProgramm.length) {
        malZeichnen();
        submitAnswer(true);
        if (malAbschluss) malAbschluss();
        return;
    }

    // Jedes gefärbte Feld zählt sofort - ein Bild hat viele davon
    stationScore++;
    document.getElementById('stationScore').innerText = stationScore;

    if (malTeilFertig()) {
        // Weiter zur nächsten Linie - und zwar auf einer leeren Tafel:
        // die neue Aufgabe soll nicht im Bild der alten stehen
        malSchritt++;
        malGefaerbt = [];
        neuerSchritt();
        malSchrittZeigen();
        return;
    }

    malZeichnen();
}

/* Für Aufgaben, die eine ganze Runde füllen: statt einer neuen Aufgabe
   kommt der Abschluss der Station. Das fertige Bild bleibt noch einen
   Moment stehen - es ist der Lohn der Arbeit und will angesehen werden. */
function malRundeBeenden() {
    if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = setTimeout(endStationRound, 2600);
}

/* Zahlen färben 1: drei Zeilen und drei Spalten, eine nach der anderen,
   jede auf einer leeren Tafel. Welche Linie gemeint ist, steht in der
   Aufgabe - die zehn Zahlen muss das Kind trotzdem einzeln in der leeren
   Tafel finden. Nach der sechsten Linie ist die Runde vorbei.
   Die Randhilfen des Coachs stehen zur Verfügung. */
const MAL_LINIEN = 3;   // je drei Zeilen und drei Spalten in einer Aufgabe

function malLinieTeil(nummer, nachZeile) {
    const zahlen = [];
    for (let i = 1; i <= 10; i++) {
        zahlen.push(nachZeile ? (nummer - 1) * 10 + i : (i - 1) * 10 + nummer);
    }

    return {
        frage: '<span class="frage-gross">Färbe die ' +
               '<span class="frage-wort">' + nummer + '. ' +
               (nachZeile ? 'Zeile' : 'Spalte') + '</span>' +
               '<span class="frage-pfeil">' + (nachZeile ? '➡' : '⬇') + '</span>' +
               '</span>',
        zahlen: zahlen
    };
}

function station12Faerben1() {
    const nummern = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const teile = [];

    shuffle(nummern.slice()).slice(0, MAL_LINIEN)
        .forEach(nummer => teile.push(malLinieTeil(nummer, true)));
    shuffle(nummern.slice()).slice(0, MAL_LINIEN)
        .forEach(nummer => teile.push(malLinieTeil(nummer, false)));

    // Gemischt: sonst kämen immer erst die Zeilen und dann die Spalten.
    // Mit der sechsten Linie ist nicht nur diese Linie fertig, sondern
    // die ganze Runde.
    malStart(shuffle(teile), true, malRundeBeenden);
}

/* Zahlen färben 2: aus den Feldern wird ein Bild. Die Muster liegen in
   den Zeilen 2 bis 9, damit rundherum ein Rand bleibt und die Form gut
   zu erkennen ist. Die Randhilfen des Coachs lassen sich zuschalten -
   sie starten aus, damit erst einmal selbst abgezählt wird. */
const MAL_MUSTER = [
    { name: 'ein H', felder: [13, 23, 33, 43, 53, 63, 73, 83,
                              44, 45, 46, 47,
                              18, 28, 38, 48, 58, 68, 78, 88] },
    { name: 'ein T', felder: [12, 13, 14, 15, 16, 17, 18, 19,
                              25, 26, 35, 36, 45, 46, 55, 56,
                              65, 66, 75, 76, 85, 86] },
    { name: 'ein L', felder: [13, 14, 23, 24, 33, 34, 43, 44,
                              53, 54, 63, 64, 73, 74,
                              83, 84, 85, 86, 87, 88] },
    { name: 'ein O', felder: [14, 15, 16, 17,
                              23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78,
                              84, 85, 86, 87] },
    { name: 'ein Herz ❤️', felder: [23, 24, 27, 28,
                                    33, 34, 35, 36, 37, 38,
                                    43, 44, 45, 46, 47, 48,
                                    54, 55, 56, 57,
                                    65, 66] },
    { name: 'ein Kreuz ✚', felder: [15, 16, 25, 26, 35, 36,
                                    43, 44, 45, 46, 47, 48,
                                    53, 54, 55, 56, 57, 58,
                                    65, 66, 75, 76, 85, 86] }
];

const FAERBEN2_BILDER = 3;   // drei Bilder sind eine Runde

function station12Faerben2() {
    const muster = pick(MAL_MUSTER);

    // Was entsteht, bleibt geheim: die Neugier trägt durch das Abzählen,
    // und raten lässt sich das Bild aus der Hälfte der Felder auch nicht.
    // Verraten wird es erst, wenn es fertig dasteht.
    malStart([{
        frage: '<span class="frage-gross">Färbe diese Zahlen. ' +
               'Was wohl daraus wird?</span>',
        zahlen: muster.felder
    }], true, () => {
        setInstruction('<span class="frage-gross">Fertig – es ist ' +
                       '<span class="frage-wort">' + muster.name + '</span>!</span>');

        // Nach dem dritten Bild ist die Station zu Ende
        if (stationAufgabe >= FAERBEN2_BILDER) malRundeBeenden();
    });
}

/* ---------- Zeile und Spalte ---------- */

/* Ein kleines Schaubild, das immer dasteht: links eine Zeile quer,
   rechts eine Spalte senkrecht - eingefärbt wie später die Auflösung
   in der großen Tafel. Die gerade gefragte Seite ist hervorgehoben,
   die andere bleibt zum Vergleich sichtbar. */
function zeileSpalteBildHTML(nachZeile) {
    const spalten = 5;
    const reihen = 4;

    function mini(quer) {
        let felder = '';
        for (let r = 0; r < reihen; r++) {
            for (let s = 0; s < spalten; s++) {
                // die zweite Zeile bzw. die vierte Spalte ist die eingefärbte
                const markiert = quer ? (r === 1) : (s === 3);
                felder += '<span class="zsp-feld' + (markiert ? ' zsp-markiert' : '') + '"></span>';
            }
        }
        return '<div class="zsp-mini" style="--zsp-spalten: ' + spalten + ';">' + felder + '</div>';
    }

    function karte(quer) {
        const aktiv = (quer === nachZeile);
        return '<div class="zsp-karte' + (aktiv ? ' zsp-aktiv' : '') + '">' +
               mini(quer) +
               '<span class="zsp-label">' + (quer ? 'Zeile' : 'Spalte') + '</span>' +
               '<span class="zsp-pfeil">' + (quer ? '➡' : '⬇') + '</span>' +
               '<span class="zsp-wie">' + (quer ? 'quer' : 'von oben nach unten') + '</span>' +
               '</div>';
    }

    return '<div class="zsp-erklaerung">' + karte(true) + karte(false) + '</div>';
}

/* Die Aufgabe hat zwei Schritte: erst die Zahl in der leeren Tafel
   markieren, dann ihre Zeile oder Spalte benennen. Gefragt wird also
   nicht mehr im Kopf, sondern am eigenen Kreuz - das Kind zählt in der
   Tafel ab, die dafür dauerhaft dasteht und nicht erst aufgeklappt
   werden muss. */
let s12ZsZahl = 0;
let s12ZsNachZeile = true;
let s12ZsMarkiert = 0;       // 0, solange die Zahl noch nicht sitzt
let s12ZsFalsch = [];        // danebengetippte Felder
let s12ZsAufgeloest = false; // nach dem zweiten Fehlversuch im ersten Schritt

function station12ZeileSpalte() {
    // Nicht die erste Reihe und nicht die letzte Spalte: dort stünde die
    // gesuchte Zahl mit eingeschalteter Zählhilfe schon fertig da
    do {
        s12ZsZahl = randomInt(1, 100);
    } while (htZeile(s12ZsZahl) === 1 || htSpalte(s12ZsZahl) === 10);

    s12ZsNachZeile = (Math.random() < 0.5);
    s12ZsMarkiert = 0;
    s12ZsFalsch = [];
    s12ZsAufgeloest = false;

    coachZuruecksetzen();
    coachZeichnen = station12ZeileSpalteZeichnen;   // die Schalter zeichnen die Aufgabe neu

    station12ZeileSpalteZeichnen();
}

function station12ZeileSpalteZeichnen() {
    if (s12ZsMarkiert) {
        // Worauf es ankommt, steht hervorgehoben in der Frage - und der Pfeil
        // dahinter zeigt gleich, wie die Zeile bzw. die Spalte läuft.
        setInstruction('<span class="frage-gross">In welcher ' +
                       '<span class="frage-wort">' + (s12ZsNachZeile ? 'Zeile' : 'Spalte') + '</span>' +
                       '<span class="frage-pfeil">' + (s12ZsNachZeile ? '➡' : '⬇') + '</span>' +
                       ' steht dein Feld?</span>');
    } else {
        setInstruction('<span class="frage-gross">Markiere die ' +
                       '<span class="frage-wort">' + s12ZsZahl + '</span>' +
                       ' in der Hundertertafel.</span>');
    }

    // Das Schaubild kommt erst zur zweiten Frage dazu: beim Markieren
    // geht es noch gar nicht um Zeile oder Spalte.
    setTaskArea('<div class="zahl-gross">' + s12ZsZahl + '</div>' +
                (s12ZsMarkiert ? zeileSpalteBildHTML(s12ZsNachZeile) : '') +
                coachDauerHTML(station12ZeileSpalteZelle));
}

function station12ZeileSpalteZelle(zahl, hilfe) {
    // Danebengetippt: das Feld bleibt rot stehen und zeigt seine Zahl -
    // hier wohnt eben die 63 und nicht die 89.
    if (s12ZsFalsch.indexOf(zahl) !== -1) {
        return '<span class="ht-zelle ht-daneben">' + zahl + '</span>';
    }

    if (zahl === s12ZsZahl && (s12ZsMarkiert || s12ZsAufgeloest)) {
        return '<span class="ht-zelle ' +
               (s12ZsMarkiert ? 'ht-gefuellt' : 'ht-loesung') + '">' + zahl + '</span>';
    }

    if (s12ZsMarkiert || s12ZsAufgeloest) {
        return '<span class="ht-zelle' + (hilfe ? ' ht-hilfszahl' : '') + '">' + hilfe + '</span>';
    }

    return '<button class="ht-zelle ht-feld' + (hilfe ? ' ht-hilfszahl' : '') +
           '" onclick="station12ZeileSpalteTippe(' + zahl + ')">' + hilfe + '</button>';
}

function station12ZeileSpalteTippe(zahl) {
    if (answerLocked || s12ZsMarkiert) return;

    const hinweis = 'Die ' + s12ZsZahl + ' steht in Zeile ' + htZeile(s12ZsZahl) +
                    ' und Spalte ' + htSpalte(s12ZsZahl) + '.';

    if (zahl !== s12ZsZahl) {
        if (s12ZsFalsch.indexOf(zahl) === -1) s12ZsFalsch.push(zahl);
        // Beim zweiten Fehlversuch ist die Aufgabe vorbei: dann zeigt die
        // Tafel, wo die Zahl gewohnt hätte
        if (submitAnswer(false, hinweis)) s12ZsAufgeloest = true;
        station12ZeileSpalteZeichnen();
        return;
    }

    // Der erste Schritt zählt sofort - die Frage nach Zeile oder Spalte
    // ist der zweite, und dafür beginnen die Versuche neu.
    s12ZsMarkiert = zahl;
    neuerSchritt();
    stationScore++;
    document.getElementById('stationScore').innerText = stationScore;

    station12ZeileSpalteZeichnen();
    station12ZeileSpalteFrage();
}

function station12ZeileSpalteFrage() {
    const richtig = s12ZsNachZeile ? htZeile(s12ZsZahl) : htSpalte(s12ZsZahl);

    // Ablenker aus der Nachbarschaft der richtigen Linie. Die Kandidaten
    // reichen nach beiden Seiten weit genug, damit auch am Rand (Zeile 1,
    // Spalte 10) noch vier Antworten zusammenkommen.
    const optionen = [richtig];
    shuffle([richtig - 1, richtig + 1, richtig - 2, richtig + 2,
             richtig - 3, richtig + 3, richtig - 4, richtig + 4]).forEach(k => {
        if (optionen.length < 4 && k >= 1 && k <= 10 && optionen.indexOf(k) === -1) {
            optionen.push(k);
        }
    });

    const hinweis = 'Die ' + s12ZsZahl + ' steht in Zeile ' + htZeile(s12ZsZahl) +
                    ' und Spalte ' + htSpalte(s12ZsZahl) + '.';

    renderOptions(shuffle(optionen), richtig, null, hinweis,
        () => station12LinieZeigen(s12ZsZahl, s12ZsNachZeile));
}

/* Nach der Antwort die Tafel mit der gesuchten Zeile oder Spalte -
   dann sieht das Kind, warum die Zahl genau dort steht. */
function station12LinieZeigen(zahl, nachZeile) {
    const linie = nachZeile ? htZeile(zahl) : htSpalte(zahl);
    const html = htTafelHTML(n => {
        if (n === zahl) return '<span class="ht-zelle ht-gefuellt">' + n + '</span>';
        const aufLinie = (nachZeile ? htZeile(n) : htSpalte(n)) === linie;
        return '<span class="ht-zelle' + (aufLinie ? ' ht-linie' : '') + '">' + n + '</span>';
    });
    setTaskArea(htBereichHTML(html));
}

/* ---------- Zahlendreher ---------- */

/* Zwei Felder sind markiert: eines gehört der Zahl, das andere ihrem
   Zahlendreher (47 und 74). Beide liegen weit auseinander - in der
   leeren Tafel muss das Kind Zeile und Spalte wirklich abzählen und
   kann nicht nach den bekannten Ziffern schauen.
   Die Tafel ist ganz leer. Wer eine Leitlinie zum Abzählen braucht,
   schaltet sie sich dazu: die Einerzahlen 1-10 als erste Reihe oben,
   die Zehnerzahlen 10-100 als Spalte rechts außen. */
let s12DreherZahl = 0;
let s12DreherDreh = 0;
let s12DreherFelder = [];   // [{ marke, zahl }] - A und B in zufälliger Zuordnung
let s12DreherGetippt = 0;
let s12DreherEiner = false;    // die erste Reihe: 1 bis 10
let s12DreherZehner = false;   // die rechte Spalte: 10 bis 100

function station12Dreher() {
    const z = randomInt(1, 9);
    let e = randomInt(1, 9);
    while (e === z) e = randomInt(1, 9);   // sonst wären beide Felder dasselbe

    s12DreherZahl = z * 10 + e;
    s12DreherDreh = e * 10 + z;
    s12DreherGetippt = 0;
    s12DreherEiner = false;    // beide Hilfen starten bei jeder Aufgabe wieder aus
    s12DreherZehner = false;

    // Die Buchstaben werden gemischt: sonst wäre A immer die kleinere Zahl
    s12DreherFelder = shuffle([s12DreherZahl, s12DreherDreh])
        .map((zahl, i) => ({ marke: (i === 0) ? 'A' : 'B', zahl: zahl }));

    setInstruction('Zwei Felder sind markiert. In welchem steht diese Zahl?');
    station12DreherZeichnen();
}

function station12DreherZeichnen() {
    const html = htTafelHTML(zahl => {
        const feld = s12DreherFelder.find(f => f.zahl === zahl);

        if (feld) {
            if (!s12DreherGetippt) {
                return '<button class="ht-zelle ht-markiert" ' +
                       'onclick="station12DreherTippe(' + zahl + ')">' + feld.marke + '</button>';
            }
            let klasse = (zahl === s12DreherZahl) ? 'ht-gefuellt'
                       : (zahl === s12DreherGetippt) ? 'ht-daneben' : 'ht-loesung';
            return '<span class="ht-zelle ' + klasse + '">' + zahl + '</span>';
        }

        // Zahlen stehen nur da, wo eine Hilfe eingeschaltet ist
        const sichtbar = (s12DreherEiner && zahl <= 10) ||
                         (s12DreherZehner && htSpalte(zahl) === 10);
        return '<span class="ht-zelle' + (sichtbar ? ' ht-hilfszahl' : '') + '">' +
               (sichtbar ? zahl : '') + '</span>';
    });

    setTaskArea(
        htBereichHTML(htTafelMitZahlHTML(html, s12DreherZahl)) +
        '<div class="hilfe-bereich" style="--hilfe-farbe: ' + htFarbe() + ';">' +
        '<div class="hilfe-tasten">' +
        '<button class="hilfe-btn' + (s12DreherEiner ? ' aktiv' : '') +
        '" onclick="station12DreherEinerToggle()">1️⃣ Einerzahlen ' +
        (s12DreherEiner ? 'ausblenden' : 'zeigen') + '</button>' +
        '<button class="hilfe-btn' + (s12DreherZehner ? ' aktiv' : '') +
        '" onclick="station12DreherZehnerToggle()">🔟 Zehnerzahlen ' +
        (s12DreherZehner ? 'ausblenden' : 'zeigen') + '</button>' +
        '</div></div>'
    );
}

function station12DreherEinerToggle() {
    s12DreherEiner = !s12DreherEiner;
    station12DreherZeichnen();
}

function station12DreherZehnerToggle() {
    s12DreherZehner = !s12DreherZehner;
    station12DreherZeichnen();
}

function station12DreherTippe(zahl) {
    if (answerLocked) return;
    s12DreherGetippt = zahl;
    station12DreherZeichnen();
    // true: von zwei Feldern wäre das zweite zwangsläufig das richtige
    submitAnswer(zahl === s12DreherZahl,
        'Die ' + s12DreherZahl + ' steht in Zeile ' + htZeile(s12DreherZahl) +
        ' und Spalte ' + htSpalte(s12DreherZahl) + '. Im anderen Feld steht die ' +
        s12DreherDreh + ' – da sind die Ziffern vertauscht.', true);
}

/* ---------- Zahlenkönig ---------- */

/* Nach dem Arbeitsblatt: In einer fast leeren Hundertertafel sitzen
   Bilder auf einzelnen Feldern. Unten sammelt eine Legende zu jedem
   Bild die Zahl - das Kind muss das Bild also erst finden und sich
   von den wenigen vorgegebenen Zahlen aus zu ihm durchzählen. */
const KOENIG_BILDER = ['🐞', '🦋', '🌸', '🐭', '🍒', '🌳', '🐦', '🥄', '🎲', '🐌', '🦔', '🍐'];
const S12_KOENIG_BILDER = 5;
const S12_KOENIG_ANKER = 5;   // verstreute Zahlen zusätzlich zur ersten Reihe

let s12Bilder = [];       // [{ emoji, zahl }]
let s12Vorgaben = [];     // Zahlen, die in der Tafel stehen
let s12KoenigZehner = false;

function station12Koenig() {
    const zahlen = [];
    while (zahlen.length < S12_KOENIG_BILDER) {
        const zahl = randomInt(11, 100);
        if (zahlen.indexOf(zahl) === -1) zahlen.push(zahl);
    }
    const bilder = shuffle(KOENIG_BILDER);
    s12Bilder = zahlen.map((zahl, i) => ({ emoji: bilder[i], zahl: zahl }));

    // Die erste Reihe steht immer da - an ihr zählt das Kind die Spalte ab.
    s12Vorgaben = [];
    for (let i = 1; i <= 10; i++) s12Vorgaben.push(i);

    let schutz = 0;
    while (s12Vorgaben.length < 10 + S12_KOENIG_ANKER && schutz++ < 300) {
        const zahl = randomInt(11, 100);
        if (s12Vorgaben.indexOf(zahl) === -1 && zahlen.indexOf(zahl) === -1) {
            s12Vorgaben.push(zahl);
        }
    }

    s12KoenigZehner = false;   // die Hilfe startet bei jeder Aufgabe wieder aus
    htStart(shuffle(zahlen),
            shuffle(zahlen.concat(htStoerer(zahlen.concat(s12Vorgaben), zahlen, 2))),
            station12KoenigZeichnen);

    setInstruction('Jedes Bild sitzt auf einem Feld der Hundertertafel. ' +
                   'Welche Zahl gehört zu dem Bild mit dem <strong>?</strong>');
    station12KoenigZeichnen();
}

function station12KoenigZeichnen() {
    const html = htTafelHTML(zahl => {
        const bild = s12Bilder.find(b => b.zahl === zahl);
        if (bild) {
            const fertig = (htGefuellt.indexOf(zahl) !== -1) || htAufgeloest;
            return '<span class="ht-zelle ht-bild' + (fertig ? ' ht-bild-fertig' : '') + '">' +
                   bild.emoji + '</span>';
        }
        const sichtbar = s12Vorgaben.indexOf(zahl) !== -1 ||
                         (s12KoenigZehner && htSpalte(zahl) === 10);
        return '<span class="ht-zelle' + (sichtbar ? ' ht-hilfszahl' : '') + '">' +
               (sichtbar ? zahl : '') + '</span>';
    });

    setTaskArea(
        htBereichHTML(html + station12KoenigLegendeHTML() + htKartenHTML()) +
        '<div class="hilfe-bereich" style="--hilfe-farbe: ' + htFarbe() + ';">' +
        '<button class="hilfe-btn' + (s12KoenigZehner ? ' aktiv' : '') +
        '" onclick="station12KoenigZehnerToggle()">' +
        (s12KoenigZehner ? '🔢 Zehnerzahlen ausblenden' : '🔢 Zehnerzahlen zeigen') +
        '</button></div>'
    );
}

function station12KoenigZehnerToggle() {
    s12KoenigZehner = !s12KoenigZehner;
    station12KoenigZeichnen();
}

/* Die Legende unter der Tafel: zu jedem Bild ein Kasten. Der Kasten mit
   dem ? sagt, welches Bild gerade gesucht ist. */
function station12KoenigLegendeHTML() {
    let html = '<div class="koenig-legende">';
    s12Bilder.forEach(bild => {
        const dran = (bild.zahl === htFragen[htSchritt]) && !htAufgeloest &&
                     htGefuellt.indexOf(bild.zahl) === -1;
        let klasse, inhalt;
        if (htGefuellt.indexOf(bild.zahl) !== -1) {
            klasse = 'ht-gefuellt';
            inhalt = bild.zahl;
        } else if (htAufgeloest) {
            klasse = 'ht-loesung';
            inhalt = bild.zahl;
        } else if (dran) {
            klasse = 'ht-luecke ht-dran';
            inhalt = '?';
        } else {
            klasse = 'ht-luecke';
            inhalt = '';
        }
        html += '<div class="koenig-paar' + (dran ? ' koenig-dran' : '') + '">' +
                '<span class="koenig-bild">' + bild.emoji + '</span>' +
                '<span class="ht-zelle ' + klasse + '">' + inhalt + '</span></div>';
    });
    return html + '</div>';
}

/* ============================================
   Station 13: Ausschnitte und Wege
   ============================================ */

/* Die Formen sitzen in einem Fenster von 3 x 3 Feldern.
   zellen: [Reihe, Spalte] - alles andere ist weggeschnitten. */
const HT_FORMEN = [
    { name: 'O',     zellen: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]] },
    { name: 'L',     zellen: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
    { name: 'T',     zellen: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
    { name: 'U',     zellen: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]] },
    { name: 'Z',     zellen: [[0,0],[0,1],[0,2],[1,1],[2,0],[2,1],[2,2]] },
    { name: 'Kreuz', zellen: [[0,1],[1,0],[1,1],[1,2],[2,1]] }
];

/* Für die schwere Fassung: kleine Stücke, damit aus einer einzigen
   Vorgabe nicht sieben Lücken werden. */
const HT_FORMEN_KLEIN = [
    { name: 'Quadrat', zellen: [[0,0],[0,1],[1,0],[1,1]] },
    { name: 'Treppe',  zellen: [[0,0],[0,1],[1,1],[1,2]] },
    { name: 'L',       zellen: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
    { name: 'T',       zellen: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
    { name: 'Kreuz',   zellen: [[0,1],[1,0],[1,1],[1,2],[2,1]] }
];

const HT_STUECK_LUECKEN = 3;

let s13Form = null;
let s13Anker = 0;   // Zahl im Feld links oben des Fensters

function s13Wert(reihe, spalte) {
    return s13Anker + reihe * 10 + spalte;
}

/* Ein Fenster, das ganz in die Tafel passt: höchstens ab Reihe 8, Spalte 8 */
function s13ZufallsAnker() {
    return randomInt(0, 7) * 10 + randomInt(0, 7) + 1;
}

function s13Werte() {
    return s13Form.zellen.map(z => s13Wert(z[0], z[1]));
}

/* ---------- Ausschnitte (mehrere Zahlen vorgegeben) ---------- */

function station13Ausschnitt() {
    s13Form = pick(HT_FORMEN);
    s13Anker = s13ZufallsAnker();

    const werte = s13Werte();
    const luecken = shuffle(werte).slice(0, HT_STUECK_LUECKEN);

    htStart(luecken,
            shuffle(luecken.concat(htStoerer(werte, luecken, 2))),
            station13AusschnittZeichnen);

    setInstruction('Ein Stück aus der Hundertertafel, Form <strong>' + s13Form.name +
                   '</strong>. Welche Zahl gehört in das Feld mit dem <strong>?</strong>');
    station13AusschnittZeichnen();
}

/* ---------- Nur eine Zahl steht da ---------- */

function station13NurEine() {
    s13Form = pick(HT_FORMEN_KLEIN);
    s13Anker = s13ZufallsAnker();

    const werte = s13Werte();
    const vorgabe = pick(werte);
    const luecken = shuffle(werte.filter(w => w !== vorgabe));

    htStart(luecken,
            shuffle(luecken.concat(htStoerer(werte, luecken, 2))),
            station13AusschnittZeichnen);

    setInstruction('Nur eine Zahl steht auf diesem Stück. ' +
                   'Welche Zahl gehört in das Feld mit dem <strong>?</strong>');
    station13AusschnittZeichnen();
}

/* ---------- Nachbarzahlen ---------- */

/* Dieselbe Ansicht wie beim Ausschnitt: das Kreuz mit der Zahl in der
   Mitte. Zehner und Einer liegen hier bewusst zwischen 2 und 8, damit
   es alle vier Nachbarn wirklich gibt. */
function station13Nachbarn() {
    const mitte = randomInt(1, 8) * 10 + randomInt(2, 9);
    const nachbarn = [mitte - 10, mitte - 1, mitte + 1, mitte + 10];

    s13Form = HT_FORMEN[HT_FORMEN.length - 1];   // Kreuz
    s13Anker = mitte - 11;                       // Feld links oben des Fensters

    htStart(shuffle(nachbarn),
            shuffle(nachbarn.concat(htStoerer([mitte].concat(nachbarn), nachbarn, 2))),
            station13AusschnittZeichnen);

    setInstruction('Trage die Nachbarn der <strong>' + mitte + '</strong> ein: ' +
                   'darüber, links, rechts und darunter. ' +
                   'Welche Zahl gehört in das Feld mit dem <strong>?</strong>');
    station13AusschnittZeichnen();
}

function station13AusschnittZeichnen() {
    let zellen = '';
    for (let reihe = 0; reihe < 3; reihe++) {
        for (let spalte = 0; spalte < 3; spalte++) {
            const gehoertDazu = s13Form.zellen.some(z => z[0] === reihe && z[1] === spalte);
            if (!gehoertDazu) {
                zellen += '<span class="ht-zelle ht-leer"></span>';
                continue;
            }
            const wert = s13Wert(reihe, spalte);
            zellen += (htFragen.indexOf(wert) === -1)
                ? '<span class="ht-zelle ht-vorgabe">' + wert + '</span>'
                : htLueckeHTML(wert);
        }
    }
    setTaskArea(htBereichHTML('<div class="ht-ausschnitt">' + zellen + '</div>' + htKartenHTML()));
}

/* ---------- Pfeilwege ---------- */

/* Ein Schritt nach rechts ist +1, ein Schritt nach unten +10 - genau
   das macht die Tafel sichtbar. */
const WEG_RICHTUNGEN = [
    { pfeil: '→', dr: 0,  dc: 1  },
    { pfeil: '←', dr: 0,  dc: -1 },
    { pfeil: '↓', dr: 1,  dc: 0  },
    { pfeil: '↑', dr: -1, dc: 0  }
];

/* Würfelt einen Weg aus, der in der Tafel bleibt. Er darf nicht sofort
   zurücklaufen und nicht wieder am Start enden - sonst wäre die Aufgabe
   entweder doppelt oder gar keine. */
function s13WegWuerfeln() {
    for (let versuch = 0; versuch < 50; versuch++) {
        let reihe = randomInt(1, 8);
        let spalte = randomInt(2, 9);
        const pfad = [reihe * 10 + spalte];
        const pfeile = [];
        let letzte = null;

        for (let i = 0; i < randomInt(3, 4); i++) {
            const moeglich = WEG_RICHTUNGEN.filter(r => {
                const nr = reihe + r.dr;
                const ns = spalte + r.dc;
                if (nr < 0 || nr > 9 || ns < 1 || ns > 10) return false;
                return !(letzte && r.dr === -letzte.dr && r.dc === -letzte.dc);
            });
            const richtung = pick(moeglich);
            reihe += richtung.dr;
            spalte += richtung.dc;
            pfeile.push(richtung.pfeil);
            pfad.push(reihe * 10 + spalte);
            letzte = richtung;
        }

        if (pfad[pfad.length - 1] !== pfad[0]) return { pfad: pfad, pfeile: pfeile };
    }
    // Sollte nie vorkommen; lieber ein einfacher Weg als gar keine Aufgabe
    return { pfad: [44, 45], pfeile: ['→'] };
}

function station13Wege() {
    const weg = s13WegWuerfeln();
    const start = weg.pfad[0];
    const ziel = weg.pfad[weg.pfad.length - 1];

    setInstruction('Gehe in der Hundertertafel los. Wo kommst du an?');
    setTaskArea(
        '<div class="weg-aufgabe">' +
        '<span class="zahl-karte">' + start + '</span>' +
        weg.pfeile.map(p => '<span class="weg-pfeil">' + p + '</span>').join('') +
        '<span class="weg-gleich">=</span>' +
        '<span class="zahl-karte weg-ziel">?</span>' +
        '</div>' +
        htHilfeHTML(htSchlichteTafelHTML(),
                    '🔢 Hundertertafel zeigen', '🔢 Hundertertafel ausblenden')
    );

    const optionen = [ziel];
    shuffle([ziel - 1, ziel + 1, ziel - 10, ziel + 10, ziel - 9, ziel + 11]).forEach(k => {
        if (optionen.length < 4 && k >= 1 && k <= 100 && optionen.indexOf(k) === -1) {
            optionen.push(k);
        }
    });

    renderOptions(shuffle(optionen), ziel, null,
        'Der Weg führt über ' + weg.pfad.join(' → ') + '.',
        () => station13WegZeigen(weg.pfad));
}

/* Nach der Antwort der Weg in der Tafel - ein Pfeil auf dem Papier
   sagt weniger als die Spur durch die Zahlen. */
function station13WegZeigen(pfad) {
    const html = htTafelHTML(zahl => {
        const platz = pfad.indexOf(zahl);
        if (platz === -1) return '<span class="ht-zelle">' + zahl + '</span>';
        const klasse = (platz === 0) ? 'ht-start'
                     : (zahl === pfad[pfad.length - 1]) ? 'ht-gefuellt' : 'ht-weg';
        return '<span class="ht-zelle ' + klasse + '">' + zahl + '</span>';
    });
    setTaskArea(htBereichHTML(html));
}

/* ============================================
   9i. Station 12: Zahlenstrahl ablesen
   9i'. Station 13: Zahlenstrahl einordnen
   Zwei eigenständige Stationen statt Unterstationen - beide teilen sich
   denselben Zahlenstrahl-Baustein (zsPunktHTML/zsRahmenHTML):
   - Zahl ablesen: ein Pfeil zeigt auf einen Strich, das Kind liest ab.
   - Zahl einordnen: das Kind tippt selbst den richtigen Strich an.
   ============================================ */
let zsVon = 0;
let zsBis = 0;
let zsZiel = 0;
let zsFalsch = [];
let zsGetippt = 0;

/* Ein Strich mit passendem Zehner-Label darunter. Drei Strichstärken
   markieren Zehner, Fünfer und Einer - so lässt sich zum nächsten
   Zehner oder Fünfer hochzählen, ohne jeden Strich einzeln zu zählen.
   Präfix "zst-" (nicht "zs-"), damit es sich nicht mit den
   Zehnerstangen-Klassen ("zs-...") aus Abschnitt 3 verwechselt. */
function zsPunktHTML(i, inhalt) {
    const istZehner = (i % 10 === 0);
    const istFuenfer = (!istZehner && i % 5 === 0);
    const strichKlasse = istZehner ? ' zst-strich-zehner' : (istFuenfer ? ' zst-strich-fuenfer' : '');
    return '<div class="zst-punkt">' + (inhalt || '') +
           '<div class="zst-strich' + strichKlasse + '"></div>' +
           (istZehner ? '<div class="zst-zahl">' + i + '</div>' : '') +
           '</div>';
}

function zsRahmenHTML(innen) {
    return '<div class="zahlenstrahl" style="--zst-farbe: var(--color-' +
           STATIONS[currentStationIndex].color + ');"><div class="zst-linie">' +
           innen + '</div></div>';
}

/* Für "Zahl einordnen": ein Kasten um den ganzen Zahlenstrahl mit der
   gesuchten Zahl groß darüber. Wer den Aufgabentext noch nicht flüssig
   liest, sieht trotzdem sofort, welche Zahl gesucht ist und wo überall
   getippt werden darf. */
function zsZielKastenHTML(innen) {
    return '<div class="zst-kasten" style="--zst-farbe: var(--color-' +
           STATIONS[currentStationIndex].color + ');">' +
           '<span class="zst-ziel-zahl">' + zsZiel + '</span>' +
           '<div class="zst-linie">' + innen + '</div>' +
           '</div>';
}

function stationZsAblesen() {
    const basis = randomInt(0, 8) * 10;
    zsVon = basis;
    zsBis = basis + 20;
    zsZiel = randomInt(zsVon + 1, zsBis - 1);

    setInstruction('Auf welche Zahl zeigt der Pfeil?');

    let innen = '';
    for (let i = zsVon; i <= zsBis; i++) {
        innen += zsPunktHTML(i, i === zsZiel ? '<span class="zst-pfeil">▼</span>' : '');
    }
    setTaskArea(zsRahmenHTML(innen));

    const optionen = nahOptionen(zsZiel, 4, zsVon, zsBis);
    renderOptions(optionen, zsZiel, null,
        'Zähle vom Zehner ' + (Math.floor(zsZiel / 10) * 10) + ' aus weiter.');
}

function stationZsEinordnen() {
    const basis = randomInt(0, 8) * 10;
    zsVon = basis;
    zsBis = basis + 10;
    zsZiel = randomInt(zsVon + 1, zsBis - 1);
    zsFalsch = [];
    zsGetippt = 0;

    setInstruction('Tippe die Stelle an, an der die ' + zsZiel + ' auf dem Zahlenstrahl steht.');
    zsEinordnenZeichnen();
}

function zsEinordnenZeichnen() {
    let innen = '';
    for (let i = zsVon; i <= zsBis; i++) {
        let inhalt = '';
        if (zsFalsch.indexOf(i) !== -1) {
            inhalt = '<span class="zst-daneben">' + i + '</span>';
        } else if (zsGetippt && i === zsZiel) {
            inhalt = '<span class="zst-treffer">' + i + '</span>';
        } else if (!zsGetippt && i !== zsVon && i !== zsBis) {
            inhalt = '<button class="zst-tick-btn" onclick="zsEinordnenTippe(' + i + ')" ' +
                     'aria-label="' + i + '"></button>';
        }
        innen += zsPunktHTML(i, inhalt);
    }
    setTaskArea(zsZielKastenHTML(innen));
}

function zsEinordnenTippe(zahl) {
    if (answerLocked) return;

    const hinweis = 'Die ' + zsZiel + ' liegt zwischen ' + zsVon + ' und ' + zsBis + '.';
    if (!submitAnswer(zahl === zsZiel, hinweis)) {
        // Falsch getippt: das Feld bleibt stehen, gesucht wird weiter
        if (zsFalsch.indexOf(zahl) === -1) zsFalsch.push(zahl);
        zsEinordnenZeichnen();
        return;
    }

    zsGetippt = zahl;
    zsEinordnenZeichnen();
}

/* ============================================
   9j. Station 16: Nachbarzahlen
   9j'. Station 17: Nachbarzehner
   Zwei eigenständige Stationen rund um die Nachbarn einer Zahl:
   Vorgänger/Nachfolger und Nachbarzehner.
   ============================================ */

/* ---------- Vorgänger und Nachfolger ---------- */
let vnZahl = 0, vnVor = 0, vnNach = 0, vnSchritt = 0;

function stationVorgaengerNachfolger() {
    vnZahl = randomInt(1, 99);
    vnVor = vnZahl - 1;
    vnNach = vnZahl + 1;
    vnSchritt = 0;
    vnZeichnen();
}

/* Die schon gelöste Lücke muss als gelöst gezeichnet werden - setTaskArea()
   ersetzt beim Schrittwechsel die ganze Aufgabe, ein fillLuecke() von vorhin
   wäre also gleich wieder weg. */
function vnZeichnen() {
    setInstruction(vnSchritt === 0
        ? 'Welche Zahl kommt vor der ' + vnZahl + '?'
        : 'Welche Zahl kommt nach der ' + vnZahl + '?');

    const vorHTML = (vnSchritt === 0)
        ? '<span class="zahl-karte luecke dran" id="vnVor">?</span>'
        : '<span class="zahl-karte karte-geloest" id="vnVor">' + vnVor + '</span>';
    const nachHTML = (vnSchritt === 1)
        ? '<span class="zahl-karte luecke dran" id="vnNach">?</span>'
        : '<span class="zahl-karte luecke" id="vnNach">?</span>';

    setTaskArea(
        '<div class="vergleich-aufgabe">' + vorHTML +
        '<span class="zahl-karte">' + vnZahl + '</span>' + nachHTML +
        '</div>'
    );

    const ziel = vnSchritt === 0 ? vnVor : vnNach;
    const optionen = nahOptionen(ziel, 4, 0, 100, [vnZahl]);
    const area = document.getElementById('stationOptions');
    area.innerHTML = optionen.map(wert =>
        '<button class="option-btn" onclick="vnPick(' + wert + ', this)">' + wert + '</button>'
    ).join('');
}

function vnPick(wert, btn) {
    if (answerLocked) return;
    const ziel = vnSchritt === 0 ? vnVor : vnNach;

    if (wert !== ziel) {
        const hinweis = 'Der Vorgänger der ' + vnZahl + ' ist ' + vnVor +
                        ', der Nachfolger ist ' + vnNach + '.';
        if (!submitAnswer(false, hinweis)) {
            btn.disabled = true;
            btn.style.backgroundColor = '#ffcdd2';
            btn.style.boxShadow = '0 5px 0 #c62828';
            return;
        }
        // Endgültig falsch: beide Lücken jetzt vollständig zeigen
        fillLuecke('vnVor', vnVor, false);
        fillLuecke('vnNach', vnNach, false);
        Array.from(document.getElementById('stationOptions').children).forEach(b => b.disabled = true);
        return;
    }

    neuerSchritt();

    if (vnSchritt === 0) {
        vnSchritt = 1;
        vnZeichnen();   // zeichnet den Vorgänger jetzt gelöst und fragt den Nachfolger
        return;
    }

    fillLuecke('vnNach', ziel, true);
    submitAnswer(true);   // beide Lücken richtig - Aufgabe geschafft
}

/* ---------- Nachbarzehner ---------- */
let nzZahl = 0, nzVZ = 0, nzNZ = 0, nzSchritt = 0;

function stationNachbarzehner() {
    // Nur Zahlen, die selbst kein Zehner sind - sonst gibt es nichts zu suchen
    do {
        nzZahl = randomInt(1, 99);
    } while (nzZahl % 10 === 0);

    nzVZ = Math.floor(nzZahl / 10) * 10;
    nzNZ = nzVZ + 10;
    nzSchritt = 0;
    nzZeichnen();
}

/* Ablenker: die Nachbarzehner links und rechts daneben - keine
   beliebigen Zahlen, sonst würde schon das Raten reichen. */
function nzOptionen(ziel) {
    const kandidaten = [ziel, ziel - 10, ziel + 10, ziel + 20, ziel - 20];
    const eindeutig = [];
    kandidaten.forEach(w => { if (w >= 0 && w <= 100 && eindeutig.indexOf(w) === -1) eindeutig.push(w); });
    return shuffle(eindeutig.slice(0, 4));
}

/* Wie bei vnZeichnen(): die schon gelöste Lücke wird als gelöst
   mitgezeichnet, weil setTaskArea() die Aufgabe beim Schrittwechsel
   komplett neu aufbaut. */
function nzZeichnen() {
    setInstruction(nzSchritt === 0
        ? 'Welcher Zehner kommt vor der ' + nzZahl + '?'
        : 'Welcher Zehner kommt nach der ' + nzZahl + '?');

    const vorHTML = (nzSchritt === 0)
        ? '<span class="zahl-karte luecke dran" id="nzVor">?</span>'
        : '<span class="zahl-karte karte-geloest" id="nzVor">' + nzVZ + '</span>';
    const nachHTML = (nzSchritt === 1)
        ? '<span class="zahl-karte luecke dran" id="nzNach">?</span>'
        : '<span class="zahl-karte luecke" id="nzNach">?</span>';

    setTaskArea(
        '<div class="vergleich-aufgabe">' + vorHTML +
        '<span class="zahl-karte">' + nzZahl + '</span>' + nachHTML +
        '</div>'
    );

    const ziel = nzSchritt === 0 ? nzVZ : nzNZ;
    const area = document.getElementById('stationOptions');
    area.innerHTML = nzOptionen(ziel).map(wert =>
        '<button class="option-btn" onclick="nzPick(' + wert + ', this)">' + wert + '</button>'
    ).join('');
}

function nzPick(wert, btn) {
    if (answerLocked) return;
    const ziel = nzSchritt === 0 ? nzVZ : nzNZ;

    if (wert !== ziel) {
        const hinweis = 'Die Nachbarzehner der ' + nzZahl + ' sind ' + nzVZ + ' und ' + nzNZ + '.';
        if (!submitAnswer(false, hinweis)) {
            btn.disabled = true;
            btn.style.backgroundColor = '#ffcdd2';
            btn.style.boxShadow = '0 5px 0 #c62828';
            return;
        }
        fillLuecke('nzVor', nzVZ, false);
        fillLuecke('nzNach', nzNZ, false);
        Array.from(document.getElementById('stationOptions').children).forEach(b => b.disabled = true);
        return;
    }

    neuerSchritt();

    if (nzSchritt === 0) {
        nzSchritt = 1;
        nzZeichnen();   // zeichnet den Vorgängerzehner jetzt gelöst und fragt den nächsten
        return;
    }

    fillLuecke('nzNach', ziel, true);
    submitAnswer(true);
}

/* ============================================
   9c. Rechnen bis 100
   Sechs Stufen, die aufeinander aufbauen. Jede Stufe ist eine Station,
   ihre Aufgabenarten sind die Unterstationen. Alle Aufgabenarten teilen
   sich dieselbe Übung: Aufgabe, Ziffernblock und drei Hilfen auf Abruf -
   Zehnerstangen, (in Stufe 2) die kleine Aufgabe und der Lerncoach.

   Abkürzungen wie in der Planung:
   ZZ = Zehnerzahl (10 … 90), ZE = Zehner und Einer mit Einer ≠ 0,
   E = Einer (1 … 9).
   ============================================ */

/* Stellen einer Zahl, damit Lerncoach und Erkläraufgabe einzelne
   Ziffern ansprechen können - z. B. nur die Einer der 46. */
function rnStellen(zahl) {
    const ziffern = String(zahl).split('');
    const namen = { 1: ['einer'], 2: ['zehner', 'einer'], 3: ['hunderter', 'zehner', 'einer'] }[ziffern.length];
    return ziffern.map((ziffer, i) => ({ ziffer: ziffer, stelle: namen[i] }));
}

function rnZehner(zahl) { return Math.floor(zahl / 10); }
function rnEiner(zahl)  { return zahl % 10; }

/* ---------- Die Aufgabenarten ----------
   neu:      würfelt a, op und b. Die Bedingungen stehen direkt in den
             Grenzen der Zufallszahlen - so kann keine Aufgabe aus dem
             Zahlenraum fallen, und es braucht keine Wiederholschleife.
   luecke:   'b' heißt: gesucht ist die zweite Zahl (Ergänzen).
   hinweis:  steht nach dem zweiten Fehlversuch da und zeigt den Weg.
   coach:    die Schritte des Lerncoachs zu genau dieser Aufgabe.
             ziele = was das Kind markiert, feld = Kästchen im
             Rechenweg, das es selbst einträgt.
   strich:   Sprünge am Rechenstrich (nur Stufe 5 und 6).
   analogie: die kleine Aufgabe ohne Null (nur Stufe 2).
   materialNachStelle: die Zehnerstangen sind immer blau, die Würfel
             immer grün - auch ohne farbliche Unterstützung. */
const RN_TYPEN = {
    /* ---- Stufe 1 ---- */
    zzPlusE: {
        neu: () => ({ a: randomInt(1, 9) * 10, op: '+', b: randomInt(1, 9) }),
        hinweis: t => rnZehner(t.a) + ' Zehner und ' + t.b + ' Einer sind ' + t.erg + '.',
        coach: t => ({
            schritte: [
                { frage: 'Markiere die Zehner.', ziele: ['a.zehner'],
                  antwort: t.a + ' sind ' + rnZehner(t.a) + ' Zehner.' },
                { frage: 'Markiere die Einer, die dazukommen.', ziele: ['b'],
                  antwort: t.b + ' Einer kommen dazu.' },
                { frage: rnZehner(t.a) + ' Zehner und ' + t.b + ' Einer. Wie heißt die Zahl? Tippe sie ein.' }
            ]
        })
    },
    zeMinusEZ: {
        /* Es wird genau der Einer abgezogen: 46 − 6 */
        neu: () => {
            const e = randomInt(1, 9);
            return { a: randomInt(1, 9) * 10 + e, op: '−', b: e };
        },
        hinweis: t => 'Alle ' + t.b + ' Einer gehen weg. Es bleiben ' + t.erg + '.',
        coach: t => ({
            schritte: [
                { frage: 'Markiere die Einer der ' + t.a + '.', ziele: ['a.einer'],
                  antwort: 'Die ' + t.a + ' hat ' + rnEiner(t.a) + ' Einer.' },
                { frage: 'Markiere, was weggeht.', ziele: ['b'],
                  antwort: 'Alle ' + t.b + ' Einer gehen weg.' },
                { frage: 'Was bleibt übrig? Tippe es ein.' }
            ]
        })
    },

    /* ---- Stufe 2 ---- */
    zzPlusZz: {
        neu: () => {
            const x = randomInt(1, 9);
            return { a: x * 10, op: '+', b: randomInt(1, 10 - x) * 10 };
        },
        hinweis: t => 'Rechne in Zehnern: ' + rnAnalogieText(t) + ', also ' + t.erg + '.',
        analogie: true,
        coach: t => rnCoachZehnerzahlen(t)
    },
    zzMinusZz: {
        /* Hier darf auch die 100 vorne stehen: 100 − 30. Abgezogen wird
           aber höchstens eine 90 - 100 − 100 wäre keine Zehnerzahl-Aufgabe. */
        neu: () => {
            const x = randomInt(1, 10);
            return { a: x * 10, op: '−', b: randomInt(1, Math.min(x, 9)) * 10 };
        },
        hinweis: t => 'Rechne in Zehnern: ' + rnAnalogieText(t) + ', also ' + t.erg + '.',
        analogie: true,
        coach: t => rnCoachZehnerzahlen(t)
    },

    /* ---- Stufe 3 ---- */
    zehnerDazu: {
        /* Die Zahl mit Einern steht mal vorne (45 + 30), mal hinten
           (40 + 26) - das Kind soll in beiden Fällen sehen, welche
           Einer stehen bleiben. */
        neu: () => {
            const z = randomInt(1, 8);
            const ze = z * 10 + randomInt(1, 9);
            const zz = randomInt(1, 9 - z) * 10;
            return Math.random() < 0.5 ? { a: ze, op: '+', b: zz } : { a: zz, op: '+', b: ze };
        },
        hinweis: t => rnHinweisZehnerDazu(t),
        coach: t => rnCoachZehnerDazu(t, rnEiner(t.a) ? 'a' : 'b'),
        /* Hier geht es darum, Zehner zu Zehnern zu legen - darum zeigt
           das Material Zehner und Einer statt erster und zweiter Zahl. */
        materialNachStelle: true
    },
    zeMinusZz: {
        /* Die Einer der ersten Zahl bleiben stehen - das Ergebnis ist
           darum nie kleiner als 1, auch bei 65 − 60. */
        neu: () => {
            const z = randomInt(1, 9);
            return { a: z * 10 + randomInt(1, 9), op: '−', b: randomInt(1, z) * 10 };
        },
        hinweis: t => rnHinweisZehnerDazu(t),
        coach: t => rnCoachZehnerDazu(t, 'a')
    },

    /* ---- Stufe 4 ---- */
    zePlusE: {
        /* Die Einer zusammen bleiben bei höchstens 9 */
        neu: () => {
            const e = randomInt(1, 8);
            return { a: randomInt(1, 9) * 10 + e, op: '+', b: randomInt(1, 9 - e) };
        },
        hinweis: t => 'Der Zehner wartet: ' + rnEiner(t.a) + ' + ' + t.b + ' = ' + (rnEiner(t.a) + t.b) +
                      ', also ' + t.erg + '.',
        coach: t => rnCoachEinerOhne(t)
    },
    zeMinusE: {
        /* Weg geht weniger, als Einer da sind: 38 − 5 */
        neu: () => {
            const e = randomInt(2, 9);
            return { a: randomInt(1, 9) * 10 + e, op: '−', b: randomInt(1, e - 1) };
        },
        hinweis: t => 'Der Zehner wartet: ' + rnEiner(t.a) + ' − ' + t.b + ' = ' + (rnEiner(t.a) - t.b) +
                      ', also ' + t.erg + '.',
        coach: t => rnCoachEinerOhne(t)
    },

    /* ---- Stufe 5 ---- */
    zeBisZehner: {
        neu: () => {
            const e = randomInt(1, 9);
            return { a: randomInt(1, 9) * 10 + e, op: '+', b: 10 - e };
        },
        hinweis: t => rnEiner(t.a) + ' + ' + t.b + ' = 10 – du landest genau bei ' + t.erg + '.',
        coach: t => ({
            schritte: [
                { frage: 'Markiere die Einer der ' + t.a + '.', ziele: ['a.einer'],
                  antwort: 'Die ' + t.a + ' hat ' + rnEiner(t.a) + ' Einer.' },
                { frage: 'Wie viel sind ' + rnEiner(t.a) + ' Einer und ' + t.b + ' Einer? Trage ein.', feld: 'k',
                  antwort: rnEiner(t.a) + ' + ' + t.b + ' = 10. Ein neuer Zehner ist voll.' },
                { frage: 'Du landest beim nächsten Zehner. Tippe das Ergebnis ein.' }
            ],
            weg: [[rnEiner(t.a), '+', t.b, '=', { feld: 'k' }]],
            werte: { k: 10 }
        }),
        strich: (t, zustand) => [
            { von: t.a, nach: t.erg, text: '+' + t.b, ende: zustand.geloest ? t.erg : '?' }
        ]
    },
    ergaenzen: {
        neu: () => {
            const e = randomInt(1, 9);
            return { a: randomInt(1, 9) * 10 + e, op: '+', b: 10 - e, luecke: 'b' };
        },
        anweisung: 'Wie viele fehlen bis zum Zehner? Tippe die Zahl ein.',
        hinweis: t => 'Von ' + t.a + ' bis ' + t.erg + ' fehlen ' + t.b + ', denn ' +
                      rnEiner(t.a) + ' + ' + t.b + ' = 10.',
        coach: t => ({
            schritte: [
                { frage: 'Markiere die Zahl, bei der du startest.', ziele: ['a'],
                  antwort: 'Du startest bei ' + t.a + '.' },
                { frage: 'Markiere die Zahl, zu der du willst.', ziele: ['erg'],
                  antwort: 'Du willst zur ' + t.erg + '.' },
                { frage: 'Wie viele fehlen von ' + rnEiner(t.a) + ' bis 10? Zähle am Rechenstrich mit und tippe ein.' }
            ]
        }),
        strich: (t, zustand) => [
            { von: t.a, nach: t.erg, text: zustand.geloest ? '+' + t.b : '?',
              offen: !zustand.geloest, ende: t.erg }
        ]
    },
    zzMinusE: {
        neu: () => ({ a: randomInt(2, 9) * 10, op: '−', b: randomInt(1, 9) }),
        hinweis: t => 'Ein Zehner wird aufgemacht: 10 − ' + t.b + ' = ' + (10 - t.b) + '. ' +
                      (rnZehner(t.a) - 1) + ' Zehner bleiben ganz – zusammen ' + t.erg + '.',
        coach: t => ({
            schritte: [
                { frage: 'Markiere die Zehner der ' + t.a + '.', ziele: ['a.zehner'],
                  antwort: t.a + ' sind ' + rnZehner(t.a) + ' Zehner. Einer sind keine da.' },
                { frage: 'Ein Zehner wird aufgemacht. Rechne 10 − ' + t.b + '. Trage ein.', feld: 'k',
                  antwort: '10 − ' + t.b + ' = ' + (10 - t.b) + '. Vom Zehner bleiben ' + (10 - t.b) + ' Einer.' },
                { frage: (rnZehner(t.a) - 1) + ' Zehner bleiben ganz. Tippe das Ergebnis ein.' }
            ],
            weg: [[10, '−', t.b, '=', { feld: 'k' }]],
            werte: { k: 10 - t.b }
        }),
        strich: (t, zustand) => [
            { von: t.a, nach: t.erg, text: '−' + t.b, ende: zustand.geloest ? t.erg : '?' }
        ]
    },

    /* ---- Stufe 6 ---- */
    zePlusEUeber: {
        /* Die Einer zusammen sind mindestens 11 - genau 10 wäre Stufe 5 */
        neu: () => {
            const e = randomInt(2, 9);
            return { a: randomInt(1, 8) * 10 + e, op: '+', b: randomInt(11 - e, 9) };
        },
        hinweis: t => {
            const w = rnUeberWeg(t);
            return 'Erst bis zum Zehner: ' + t.a + ' + ' + w.m + ' = ' + w.zehner +
                   '. Dann der Rest: ' + w.zehner + ' + ' + w.r + ' = ' + t.erg + '.';
        },
        coach: t => rnCoachUeber(t),
        strich: (t, zustand) => rnStrichUeber(t, zustand)
    },
    zeMinusEUeber: {
        /* Weg geht mehr, als Einer da sind: 42 − 5 */
        neu: () => {
            const e = randomInt(1, 8);
            return { a: randomInt(1, 9) * 10 + e, op: '−', b: randomInt(e + 1, 9) };
        },
        hinweis: t => {
            const w = rnUeberWeg(t);
            return 'Erst zurück bis zum Zehner: ' + t.a + ' − ' + w.m + ' = ' + w.zehner +
                   '. Dann der Rest: ' + w.zehner + ' − ' + w.r + ' = ' + t.erg + '.';
        },
        coach: t => rnCoachUeber(t),
        strich: (t, zustand) => rnStrichUeber(t, zustand)
    }
};

/* ---- Bausteine, die sich mehrere Aufgabenarten teilen ---- */

/* Stufe 2: die Aufgabe ohne Nullen. 100 − 30 wird zu 10 − 3. */
function rnAnalogieText(t) {
    const x = t.a / 10, y = t.b / 10;
    return x + ' ' + t.op + ' ' + y + ' = ' + (t.erg / 10);
}

function rnCoachZehnerzahlen(t) {
    const x = t.a / 10, y = t.b / 10;
    const plus = t.op === '+';
    /* Bei der 100 steht der Zehner nicht an einer eigenen Stelle - die
       ganze Zahl wird markiert, und der Coach sagt, wie viele es sind. */
    const ersteZiele = t.a === 100 ? ['a', 'b.zehner'] : ['a.zehner', 'b.zehner'];
    return {
        schritte: [
            { frage: 'Markiere die Zehner von beiden Zahlen.', ziele: ersteZiele,
              antwort: t.a + ' sind ' + x + ' Zehner. ' + y + ' Zehner ' +
                       (plus ? 'kommen dazu.' : 'gehen weg.') },
            { frage: 'Rechne die kleine Aufgabe: ' + x + ' ' + t.op + ' ' + y + '. Trage ein.', feld: 'k',
              antwort: x + ' ' + t.op + ' ' + y + ' = ' + (t.erg / 10) + '.' },
            { frage: (t.erg / 10) + ' Zehner – wie heißt die Zahl? Tippe sie ein.' }
        ],
        weg: [[x, t.op, y, '=', { feld: 'k' }]],
        wegZehner: true,
        werte: { k: t.erg / 10 }
    };
}

/* Stufe 3: nur die Zehner rechnen, die Einer bleiben stehen. */
function rnHinweisZehnerDazu(t) {
    const k = rnZehner(t.erg);
    const einer = rnEiner(t.a) || rnEiner(t.b);
    return 'Nur die Zehner rechnen: ' + rnZehner(t.a) + ' ' + t.op + ' ' + rnZehner(t.b) + ' = ' + k +
           ' Zehner. Die ' + einer + ' Einer bleiben: ' + t.erg + '.';
}

/* mitEinern: welche der beiden Zahlen die Einer mitbringt */
function rnCoachZehnerDazu(t, mitEinern) {
    const za = rnZehner(t.a), zb = rnZehner(t.b), k = rnZehner(t.erg);
    const einer = rnEiner(t[mitEinern]);
    const plus = t.op === '+';
    return {
        schritte: [
            { frage: 'Markiere die Zehner von beiden Zahlen.', ziele: ['a.zehner', 'b.zehner'],
              antwort: za + ' Zehner und ' + zb + ' Zehner.' },
            { frage: 'Wie viele Zehner sind es ' + (plus ? 'zusammen' : 'noch') + '? Trage ein.', feld: 'k',
              antwort: za + ' ' + t.op + ' ' + zb + ' = ' + k + ' Zehner.' },
            { frage: 'Markiere die Einer. Sie bleiben gleich.', ziele: [mitEinern + '.einer'],
              antwort: 'Die ' + einer + ' Einer bleiben.' },
            { frage: k + ' Zehner und ' + einer + ' Einer. Tippe das Ergebnis ein.' }
        ],
        weg: [[za, t.op, zb, '=', { feld: 'k' }]],
        wegZehner: true,
        werte: { k: k }
    };
}

/* Stufe 4: der Zehner wartet, nur die Einer rechnen. */
function rnCoachEinerOhne(t) {
    const e = rnEiner(t.a);
    const k = t.op === '+' ? e + t.b : e - t.b;
    return {
        schritte: [
            { frage: t.op === '+' ? 'Markiere die Einer von beiden Zahlen.'
                                  : 'Markiere die Einer der ' + t.a + ' und die Einer, die weggehen.',
              ziele: ['a.einer', 'b'],
              antwort: e + ' Einer und ' + t.b + ' Einer.' },
            { frage: 'Der Zehner wartet. Rechne nur die Einer: ' + e + ' ' + t.op + ' ' + t.b + '. Trage ein.',
              feld: 'k', antwort: e + ' ' + t.op + ' ' + t.b + ' = ' + k + '.' },
            { frage: 'Der Zehner kommt wieder dazu. Tippe das Ergebnis ein.' }
        ],
        weg: [[e, t.op, t.b, '=', { feld: 'k' }]],
        werte: { k: k }
    };
}

/* Stufe 6: bis zum Zehner (m), dann der Rest (r).
   37 + 5: m = 3, r = 2, zehner = 40
   42 − 5: m = 2, r = 3, zehner = 40 */
function rnUeberWeg(t) {
    const plus = t.op === '+';
    const m = plus ? 10 - rnEiner(t.a) : rnEiner(t.a);
    return { m: m, r: t.b - m, zehner: plus ? t.a + m : t.a - m };
}

function rnCoachUeber(t) {
    const w = rnUeberWeg(t);
    const plus = t.op === '+';
    return {
        schritte: [
            { frage: plus ? 'Wie viele fehlen von ' + t.a + ' bis ' + w.zehner + '? Trage ein.'
                          : 'Wie viele gehen von ' + t.a + ' zurück bis ' + w.zehner + '? Trage ein.',
              feld: 'm', antwort: t.a + ' ' + t.op + ' ' + w.m + ' = ' + w.zehner + '. Der Zehner ist erreicht.' },
            { frage: 'Die ' + t.b + ' ist ' + w.m + ' und …? Trage den Rest ein.', feld: 'r',
              antwort: 'Die ' + t.b + ' ist ' + w.m + ' und ' + w.r + '.' },
            { frage: 'Rechne ' + w.zehner + ' ' + t.op + ' ' + w.r + '. Tippe das Ergebnis ein.' }
        ],
        weg: [[t.a, t.op, { feld: 'm' }, t.op, { feld: 'r' }, '=', '?']],
        werte: { m: w.m, r: w.r }
    };
}

function rnStrichUeber(t, zustand) {
    const w = rnUeberWeg(t);
    const hatM = zustand.weg.m !== undefined || zustand.geloest;
    const hatR = zustand.weg.r !== undefined || zustand.geloest;
    return [
        { von: t.a, nach: w.zehner, text: hatM ? t.op + w.m : '?', offen: !hatM, ende: w.zehner },
        { von: w.zehner, nach: t.erg, text: hatR ? t.op + w.r : '?', offen: !hatR,
          ende: zustand.geloest ? t.erg : '?' }
    ];
}

/* ---------- Zustand der laufenden Aufgabe ---------- */
let rnKey = '';
let rnTask = null;          // { a, op, b, erg, luecke, soll }
let rnEingabe = '';
let rnGeloest = null;       // null, solange offen - sonst { richtig }
let rnLetzte = {};          // je Aufgabenart die letzte Aufgabe
let rnHilfen = {};          // offene Hilfen dieser Aufgabe
let rnCoachAn = false;
let rnCoach = null;         // Schritte, Rechenweg und Werte
let rnCoachSchritt = 0;
let rnCoachBestaetigt = false;
let rnCoachMarkiert = [];
let rnWeg = {};             // schon eingetragene Kästchen des Rechenwegs
let rnWegEingabe = '';
let rnTimer = null;
let rnPruefTimer = null;

function rnTimerStoppen() {
    if (rnTimer) { clearTimeout(rnTimer); rnTimer = null; }
    if (rnPruefTimer) { clearTimeout(rnPruefTimer); rnPruefTimer = null; }
}

/* Zwei gleiche Aufgaben hintereinander gibt es nicht - auch nicht als
   Tauschaufgabe: auf 40 + 26 folgt nicht 26 + 40. */
function rnSchluessel(t) {
    if (t.op === '+') return Math.min(t.a, t.b) + '+' + Math.max(t.a, t.b);
    return t.a + '−' + t.b;
}

function rnNeueAufgabe(key) {
    const typ = RN_TYPEN[key];
    let t, guard = 0;
    do {
        t = typ.neu();
    } while (rnSchluessel(t) === rnLetzte[key] && guard++ < 50);
    rnLetzte[key] = rnSchluessel(t);

    t.erg = t.op === '+' ? t.a + t.b : t.a - t.b;
    t.luecke = t.luecke || 'erg';
    t.soll = t.luecke === 'b' ? t.b : t.erg;
    return t;
}

/* Einstieg aus der Stationen-Liste: jede Unterstation ruft das mit
   ihrer Aufgabenart auf. */
function rnAufgabe(key) {
    rnTimerStoppen();
    rnKey = key;
    rnTask = rnNeueAufgabe(key);
    rnEingabe = '';
    rnGeloest = null;
    /* Hilfen und Coach starten bei jeder Aufgabe wieder zu: das Kind
       soll es zuerst selbst versuchen. */
    rnHilfen = {};
    rnCoachAn = false;
    rnCoach = null;

    setInstruction(RN_TYPEN[key].anweisung || 'Rechne. Tippe das Ergebnis ein.');
    rnZeichnen();
    renderCheckButton('Prüfen ✓', rnPruefen);
    rnPruefknopfAktualisieren();
}

function rnFarbe() {
    return 'var(--color-' + STATIONS[currentStationIndex].color + ')';
}

/* Die ganze Aufgabe wird bei jeder Änderung neu gezeichnet. Das ist
   bei so wenig Inhalt schneller gemacht als jede Stelle einzeln
   nachzuführen - und es kann nichts aus dem Tritt geraten. */
function rnZeichnen() {
    setTaskArea(
        '<div class="rn-bereich' + (rnHilfen.farbe ? ' rn-farbig' : '') + '" ' +
        'style="--hoer-farbe: ' + rnFarbe() + '; --rn-farbe: ' + rnFarbe() + ';">' +
        rnAufgabeHTML() +
        rnHilfenHTML() +
        rnCoachHTML() +
        rnTastenHTML() +
        '</div>'
    );
}

/* Die Ziffern einer Zahl, jede mit ihrer Stelle als Namen. Daran
   hängen der Coach ("Markiere die Einer der 46") und die farbliche
   Unterstützung (Hunderter rot, Zehner blau, Einer grün).
   laenge: so viele Stellen hat die fertige Zahl. Beim Eintippen ist die
   erste Ziffer von 46 schon ein Zehner, obwohl erst "4" dasteht - sonst
   würde sie grün und beim zweiten Tipp plötzlich blau. */
function rnZiffernHTML(zahl, laenge) {
    const text = String(zahl);
    const namen = rnStellen(Math.pow(10, Math.max(laenge || 0, text.length) - 1)).map(s => s.stelle);
    return text.split('').map((ziffer, i) =>
        '<span class="rn-ziffer" data-stelle="' + namen[i] + '">' + ziffer + '</span>').join('');
}

/* Ein Platz der Aufgabe */
function rnZahlHTML(platz, zahl, klasse) {
    return '<span class="rn-platz' + (klasse ? ' ' + klasse : '') + '" data-platz="' + platz + '">' +
           rnZiffernHTML(zahl) + '</span>';
}

/* Eine kleine Rechnung als Text mit gefärbten Ziffern. zehner: die
   Zahlen zählen Zehner (3 + 4 = 7 bei 30 + 40) und werden darum ganz
   blau - eine grüne 3 sagte sonst "Einer". */
function rnRechnungHTML(teile, zehner) {
    return '<span class="rn-rechnung' + (zehner ? ' rn-zehnerzeile' : '') + '">' +
           teile.map(t => typeof t === 'number' ? rnZiffernHTML(t) : t).join(' ') + '</span>';
}

function rnLueckeHTML() {
    const t = rnTask;
    if (rnGeloest) {
        return '<span class="zahl-karte ' + (rnGeloest.richtig ? 'karte-geloest leuchtet' : 'karte-loesung') +
               ' rn-eingabe" id="rnEingabe" data-platz="' + t.luecke + '">' + rnZiffernHTML(t.soll) + '</span>';
    }
    const dran = rnAktivesFeld() ? '' : ' dran';
    return '<span class="zahl-karte luecke rn-eingabe' + dran + '" id="rnEingabe" data-platz="' + t.luecke + '">' +
           (rnEingabe === '' ? '?' : rnZiffernHTML(rnEingabe, String(t.soll).length)) + '</span>';
}

function rnAufgabeHTML() {
    const t = rnTask;
    /* Ohne Hilfe sind alle Zahlen schwarz. Mit Zehnerstangen haben die
       beiden Zahlen beim Plus die Farben ihrer Stangen (blau und orange).
       Die farbliche Unterstützung färbt stattdessen nach der Stelle -
       dann auch das Material, damit Zahl und Bild zusammenpassen.
       Färbt eine Aufgabenart ihr Material immer nach der Stelle, bleiben
       die Zahlen ohne Farbhilfe schwarz. */
    const mengen = t.op === '+' && rnHilfen.material && !rnHilfen.farbe &&
                   !RN_TYPEN[rnKey].materialNachStelle;
    const a = rnZahlHTML('a', t.a, mengen ? 'menge-a' : '');
    const b = t.luecke === 'b' ? rnLueckeHTML() : rnZahlHTML('b', t.b, mengen ? 'menge-b' : '');
    const erg = t.luecke === 'erg' ? rnLueckeHTML() : rnZahlHTML('erg', t.erg);
    const markieren = rnCoachWartetAufMarkierung() ? ' markieren' : '';
    return '<div class="rechen-aufgabe gross rn-aufgabe' + markieren + '" id="rnAufgabe" onclick="rnMarkiere(event)">' +
           a + '<span class="rn-zeichen">' + t.op + '</span>' + b +
           '<span class="rn-zeichen">=</span>' + erg + '</div>';
}

/* ---------- Hilfen auf Abruf ---------- */
function rnHilfenHTML() {
    const typ = RN_TYPEN[rnKey];
    if (typ.kopfrechnen) return krHilfenHTML();
    const knopf = (name, an, aus, ein) =>
        '<button class="hilfe-btn' + (ein ? ' aktiv' : '') + '" onclick="rnHilfeToggle(\'' + name + '\')">' +
        (ein ? an : aus) + '</button>';

    let html = '<div class="hilfe-bereich" style="--hilfe-farbe: ' + rnFarbe() + ';"><div class="hilfe-tasten">' +
        knopf('farbe', '🎨 Farben ausblenden', '🎨 Farbliche Unterstützung', rnHilfen.farbe) +
        knopf('material', '🧱 Zehnerstangen ausblenden', '🧱 Mit Zehnerstangen zeigen', rnHilfen.material) +
        (typ.analogie ? knopf('analogie', '🔍 Kleine Aufgabe ausblenden', '🔍 Kleine Aufgabe zeigen', rnHilfen.analogie) : '') +
        knopf('coach', '🧑‍🏫 Lerncoach schließen', '🧑‍🏫 Lerncoach', rnCoachAn) +
        '</div>';
    if (typ.analogie && rnHilfen.analogie) {
        const t = rnTask;
        html += '<div class="hilfe-inhalt sichtbar rn-analogie">' +
                '<span class="rn-analogie-klein">' +
                rnRechnungHTML([t.a / 10, t.op, t.b / 10, '=', t.erg / 10], true) + '</span>' +
                '<span class="rn-analogie-pfeil">➜</span>' +
                rnRechnungHTML([t.a, t.op, t.b, '=', '?']) + '</div>';
    }
    if (rnHilfen.material) {
        html += '<div class="hilfe-inhalt sichtbar">' + rnMaterialHTML(rnTask, rnHilfen.farbe || !!RN_TYPEN[rnKey].materialNachStelle) + '</div>';
    }
    return html + '</div>';
}

function rnHilfeToggle(name) {
    if (name === 'coach') {
        rnCoachAn = !rnCoachAn;
        if (rnCoachAn) rnCoachStarten();
        else rnTimerStoppen();
    } else {
        rnHilfen[name] = !rnHilfen[name];
    }
    rnZeichnen();
}

/* ---------- Material: Zehnerstangen und Einerwürfel ---------- */
/* Eine Stange, bei der oben einzelne Felder weggenommen sind - so
   sieht man bei 40 − 6, dass ein Zehner aufgemacht wird. */
function rnStangeHTML(variant, wegFelder, wegGanz, extraClass) {
    let felder = '';
    for (let i = 0; i < 10; i++) {
        felder += '<span class="zs-feld' + (i < wegFelder ? ' feld-weg' : '') + '"></span>';
    }
    return '<div class="zehnerstange zs-' + variant + (wegGanz ? ' zs-crossed' : '') +
           (extraClass ? ' ' + extraClass : '') + '">' + felder + '</div>';
}

/* Würfel in Fünferspalten wie in Station 5. liste enthält je Würfel
   seine Zusatzklasse ('einer-a', 'einer-weg', 'einer-leer' …). */
function rnWuerfelHTML(liste) {
    if (!liste.length) return '';
    let html = '<div class="einer-block">';
    for (let i = 0; i < liste.length; i += 5) {
        html += '<div class="einer-spalte">' +
                liste.slice(i, i + 5).map(k => '<span class="einer-wuerfel ' + k + '"></span>').join('') +
                '</div>';
    }
    return html + '</div>';
}

/* Eine Zahl als Bild. opts:
   leer       - leere Plätze, die die Einer zum Zehner auffüllen (Ergänzen)
   wegStangen - so viele Stangen von hinten sind weggenommen
   wegWuerfel - so viele Würfel von hinten sind weggenommen
   wegFelder  - so viele Felder der letzten ganzen Stange sind weg
   nachStelle - Farben nach der Stelle: Stangen blau, Würfel grün */
function rnBildHTML(zahl, variant, opts) {
    const o = opts || {};
    const wuerfelKlasse = o.nachStelle ? 'gruen' : variant;
    if (o.nachStelle) variant = 'a';
    const z = rnZehner(zahl), e = rnEiner(zahl);
    let stangen = '';
    for (let i = 0; i < z; i++) {
        const ganzWeg = i >= z - (o.wegStangen || 0);
        const letzteGanze = i === z - (o.wegStangen || 0) - 1;
        stangen += rnStangeHTML(variant, letzteGanze ? (o.wegFelder || 0) : 0, ganzWeg,
                                i === 5 ? 'zs-nach-luecke' : '');
    }
    const wuerfel = [];
    for (let i = 0; i < e; i++) wuerfel.push('einer-' + wuerfelKlasse + (i >= e - (o.wegWuerfel || 0) ? ' einer-weg' : ''));
    for (let i = 0; i < (o.leer || 0); i++) wuerfel.push('einer-leer');

    return '<div class="rn-bild">' +
           (stangen ? '<div class="zs-reihe">' + stangen + '</div>' : '') +
           rnWuerfelHTML(wuerfel) + '</div>';
}

/* nachStelle: die farbliche Unterstützung ist an */
function rnMaterialHTML(t, nachStelle) {
    if (t.op === '+') {
        /* Beim Ergänzen gibt es keine zweite Menge zu zeigen - sie ist
           ja gesucht. Stattdessen stehen leere Plätze da, bis der
           Zehner voll ist. */
        if (t.luecke === 'b') {
            return '<div class="rn-material">' + rnBildHTML(t.a, 'a', { leer: t.b, nachStelle: nachStelle }) + '</div>';
        }
        return '<div class="rn-material">' + rnBildHTML(t.a, 'a', { nachStelle: nachStelle }) +
               '<span class="rn-material-zeichen">+</span>' +
               rnBildHTML(t.b, 'b', { nachStelle: nachStelle }) + '</div>';
    }
    /* Minus: eine Menge, das Weggenommene ist durchgestrichen. Reichen
       die Einer nicht, wird aus der nächsten Stange weggenommen. */
    const e = rnEiner(t.a);
    const wegZehner = rnZehner(t.b), wegEiner = rnEiner(t.b);
    const opts = wegEiner <= e
        ? { wegStangen: wegZehner, wegWuerfel: wegEiner }
        : { wegStangen: wegZehner, wegWuerfel: e, wegFelder: wegEiner - e };
    opts.nachStelle = nachStelle;
    return '<div class="rn-material">' + rnBildHTML(t.a, 'a', opts) + '</div>';
}

/* ---------- Rechenstrich ---------- */
/* Ein Strich ohne Maßstab-Anspruch, aber mit Sprüngen in passender
   Größe. spruenge: [{ von, nach, text, ende, offen }]
   offen zeichnet den Bogen gestrichelt: dieser Sprung ist noch nicht
   bekannt. ende ist die Beschriftung am Landepunkt ('?' oder Zahl). */
function rnStrichHTML(spruenge) {
    const B = 480, H = 132, Y = 92;
    const werte = [];
    spruenge.forEach(s => { werte.push(s.von, s.nach); });
    const lo = Math.min.apply(null, werte), hi = Math.max.apply(null, werte);
    const x = v => hi === lo ? B / 2 : 50 + (v - lo) * (B - 100) / (hi - lo);

    let svg = '<line class="rn-strich-linie" x1="12" y1="' + Y + '" x2="' + (B - 12) + '" y2="' + Y + '"/>';
    const punkt = (v, text) =>
        '<line class="rn-strich-marke" x1="' + x(v) + '" y1="' + (Y - 9) + '" x2="' + x(v) + '" y2="' + (Y + 9) + '"/>' +
        '<text class="rn-strich-zahl' + (text === '?' ? ' offen' : '') + '" x="' + x(v) + '" y="' + (Y + 33) + '">' + text + '</text>';

    svg += punkt(spruenge[0].von, spruenge[0].von);
    spruenge.forEach(s => {
        const x1 = x(s.von), x2 = x(s.nach);
        const h = 62, cx = (x1 + x2) / 2, cy = Y - h;
        svg += '<path class="rn-strich-bogen' + (s.offen ? ' offen' : '') + '" d="M ' + x1 + ' ' + (Y - 4) +
               ' Q ' + cx + ' ' + cy + ' ' + x2 + ' ' + (Y - 4) + '"/>';
        /* Pfeilspitze in Richtung der Kurve am Landepunkt */
        const dx = x2 - cx, dy = (Y - 4) - cy, len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len, uy = dy / len;
        const bx = x2 - ux * 12, by = (Y - 4) - uy * 12;
        svg += '<polygon class="rn-strich-spitze" points="' + x2 + ',' + (Y - 4) + ' ' +
               (bx - uy * 6) + ',' + (by + ux * 6) + ' ' + (bx + uy * 6) + ',' + (by - ux * 6) + '"/>';
        svg += '<text class="rn-strich-text' + (s.text === '?' ? ' offen' : '') + '" x="' + cx + '" y="' + (Y - h / 2 - 12) + '">' +
               s.text + '</text>';
        svg += punkt(s.nach, s.ende);
    });
    return '<div class="rn-strich"><svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Rechenstrich">' +
           svg + '</svg></div>';
}

/* ---------- Lerncoach ---------- */
function rnCoachStarten() {
    rnCoach = RN_TYPEN[rnKey].coach(rnTask);
    rnCoachSchritt = 0;
    rnCoachBestaetigt = false;
    rnCoachMarkiert = [];
    rnWeg = {};
    rnWegEingabe = '';
}

function rnCoachAktuell() {
    return rnCoach ? rnCoach.schritte[rnCoachSchritt] : null;
}

/* Ist der aktuelle Schritt erledigt? Markieren: wenn alles gefunden
   ist. Eintragen: wenn das Kästchen gefüllt ist. Der letzte Schritt
   ist nur eine Aufforderung - die Antwort gibt das Kind unten ein. */
function rnCoachSchrittFertig() {
    const s = rnCoachAktuell();
    if (!s) return false;
    if (s.feld) return rnWeg[s.feld] !== undefined;
    if (s.ziele) return rnCoachBestaetigt;
    return true;
}

function rnCoachWartetAufMarkierung() {
    const s = rnCoachAn && !rnGeloest ? rnCoachAktuell() : null;
    return !!(s && s.ziele && !rnCoachBestaetigt);
}

/* In welches Kästchen gehen die Ziffern gerade? Steht der Coach bei
   einem Kästchen, das noch leer ist, dann dorthin - sonst ins Ergebnis. */
function rnAktivesFeld() {
    const s = rnCoachAn && !rnGeloest ? rnCoachAktuell() : null;
    return s && s.feld && rnWeg[s.feld] === undefined ? s.feld : null;
}

function rnCoachHTML() {
    if (!rnCoachAn || !rnCoach) return '';
    const s = rnCoachAktuell();
    const fertig = rnCoachSchrittFertig();
    const letzter = rnCoachSchritt === rnCoach.schritte.length - 1;
    const text = fertig && s.antwort
        ? '<strong>Genau:</strong> ' + s.antwort
        : '<strong>Denke kurz nach:</strong> ' + s.frage;

    let html = '<div class="rn-coach">' +
        '<div class="rn-coach-kopf"><span class="rn-coach-avatar">🧑‍🏫</span>' +
        '<p class="rn-coach-text" id="rnCoachText">' + text + '</p></div>';

    if (rnCoach.weg) html += rnWegHTML();
    const typ = RN_TYPEN[rnKey];
    if (typ.strich) html += rnStrichHTML(typ.strich(rnTask, { weg: rnWeg, geloest: !!rnGeloest }));

    html += '<div class="rn-coach-knoepfe">' + vorleseKnopfHTML("lesVorAus('rnCoachText')") +
        '<button class="coach-zurueck-btn" onclick="rnCoachZurueck()"' + (rnCoachSchritt === 0 ? ' disabled' : '') +
        '>← Zurück</button>' +
        (letzter ? '' : '<button class="coach-weiter-btn" onclick="rnCoachWeiter()">' +
                        (fertig ? 'Weiter →' : 'Zeig es mir') + '</button>') +
        '</div></div>';
    return html;
}

/* Der Rechenweg unter der Frage: Zahlen, Zeichen und Kästchen, die das
   Kind mit dem Ziffernblock füllt. */
function rnWegHTML() {
    const aktiv = rnAktivesFeld();
    const zehner = rnCoach.wegZehner ? ' rn-zehnerzeile' : '';
    return rnCoach.weg.map(zeile => '<div class="rn-weg' + zehner + '">' + zeile.map(teil => {
        if (teil && teil.feld) {
            const name = teil.feld;
            const laenge = String(rnCoach.werte[name]).length;
            if (rnWeg[name] !== undefined) return '<span class="rn-weg-kasten gefuellt">' + rnZiffernHTML(rnWeg[name]) + '</span>';
            if (name === aktiv) {
                return '<span class="rn-weg-kasten aktiv">' +
                       (rnWegEingabe ? rnZiffernHTML(rnWegEingabe, laenge) : '') + '</span>';
            }
            return '<span class="rn-weg-kasten"></span>';
        }
        if (teil === '?') return '<span class="rn-weg-luecke"></span>';
        if (typeof teil === 'number') return '<span>' + rnZiffernHTML(teil) + '</span>';
        return '<span>' + teil + '</span>';
    }).join('') + '</div>').join('');
}

/* Markierungen in der Aufgabe setzen. Ein Ziel ist ein ganzer Platz
   ('b') oder eine Stelle darin ('a.einer'). */
function rnMarkierungenSetzen() {
    if (!rnCoachAn || !rnCoach) return;
    const s = rnCoachAktuell();
    const ziele = s.ziele ? (rnCoachBestaetigt ? s.ziele : rnCoachMarkiert) : [];
    ziele.forEach(ziel => {
        const teile = ziel.split('.');
        const platz = document.querySelector('#rnAufgabe [data-platz="' + teile[0] + '"]');
        if (!platz) return;
        const el = teile[1] ? platz.querySelector('[data-stelle="' + teile[1] + '"]') : platz;
        if (el) el.classList.add('rn-mark');
    });
}

function rnMarkiere(event) {
    if (!rnCoachWartetAufMarkierung() || answerLocked) return;
    const platz = event.target.closest ? event.target.closest('[data-platz]') : null;
    if (!platz) return;
    const ziffer = event.target.closest('[data-stelle]');
    const name = platz.dataset.platz;
    const gewaehlt = ziffer ? name + '.' + ziffer.dataset.stelle : name;

    /* Ist ein ganzer Platz gesucht, zählt auch ein Tipp auf eine seiner
       Ziffern. Ist eine Stelle gesucht, muss es genau die sein. */
    const s = rnCoachAktuell();
    const treffer = s.ziele.find(ziel => ziel === gewaehlt || ziel === name);
    if (!treffer) {
        rnWackeln(ziffer || platz);
        return;
    }
    if (rnCoachMarkiert.indexOf(treffer) < 0) rnCoachMarkiert.push(treffer);
    if (rnCoachMarkiert.length >= s.ziele.length) {
        rnCoachBestaetigt = true;
        rnWeiterNachPause();
    }
    rnNeuZeichnen();
}

function rnWackeln(el) {
    if (!el) return;
    el.classList.add('rn-wackeln');
    setTimeout(() => el.classList.remove('rn-wackeln'), 450);
}

/* Erledigt: kurz stehen lassen, dann stellt der Coach die nächste
   Frage. Die Aufgabennummer verhindert, dass ein alter Timer in die
   nächste Aufgabe hineinfunkt. */
function rnWeiterNachPause() {
    if (!rnCoach || rnCoachSchritt >= rnCoach.schritte.length - 1) return;
    if (rnTimer) clearTimeout(rnTimer);
    const beiSchritt = rnCoachSchritt, beiAufgabe = rnTask;
    rnTimer = setTimeout(() => {
        rnTimer = null;
        if (!stationAktiv() || rnTask !== beiAufgabe || !rnCoachAn || rnCoachSchritt !== beiSchritt) return;
        rnCoachWeiter();
    }, 1500);
}

/* "Zeig es mir" erledigt den offenen Schritt für das Kind, "Weiter"
   geht zum nächsten. Niemand bleibt hängen. */
function rnCoachWeiter() {
    if (!rnCoach) return;
    if (rnTimer) { clearTimeout(rnTimer); rnTimer = null; }
    const s = rnCoachAktuell();
    if (!rnCoachSchrittFertig()) {
        if (s.feld) { rnWeg[s.feld] = rnCoach.werte[s.feld]; rnWegEingabe = ''; }
        if (s.ziele) { rnCoachMarkiert = s.ziele.slice(); rnCoachBestaetigt = true; }
        rnNeuZeichnen();
        return;
    }
    if (rnCoachSchritt < rnCoach.schritte.length - 1) {
        rnCoachSchritt++;
        rnCoachBestaetigt = false;
        rnCoachMarkiert = [];
        rnWegEingabe = '';
    }
    rnNeuZeichnen();
}

/* Zurück führt auf einen Schritt, der schon erledigt ist. */
function rnCoachZurueck() {
    if (!rnCoach || rnCoachSchritt === 0) return;
    if (rnTimer) { clearTimeout(rnTimer); rnTimer = null; }
    rnCoachSchritt--;
    rnCoachBestaetigt = true;
    rnWegEingabe = '';
    rnNeuZeichnen();
}

function rnNeuZeichnen() {
    rnZeichnen();
    rnMarkierungenSetzen();
}

/* ---------- Ziffernblock ---------- */
function rnTastenHTML() {
    const gesperrt = rnGeloest ? ' disabled' : '';
    let html = '<div class="tastenfeld rn-tastenfeld" id="rnTastenfeld">';
    for (let i = 1; i <= 9; i++) {
        html += '<button class="taste" onclick="rnTippe(\'' + i + '\')"' + gesperrt + '>' + i + '</button>';
    }
    html += '<button class="taste taste-loeschen" onclick="rnLoeschen()"' + gesperrt + '>←</button>';
    html += '<button class="taste" onclick="rnTippe(\'0\')"' + gesperrt + '>0</button>';
    return html + '</div>';
}

function rnTippe(ziffer) {
    if (answerLocked || rnGeloest) return;
    if (rnAktivesFeld()) { rnWegTippe(ziffer); return; }

    /* Eine Null allein ist erlaubt (70 − 70 = 0), eine führende Null
       vor weiteren Ziffern nicht. */
    if (rnEingabe === '0') return;
    if (rnEingabe.length >= 3) return;
    const neu = rnEingabe + ziffer;
    if (parseInt(neu, 10) > 100) return;   // Zahlenraum bis 100

    rnEingabe = neu;
    rnNeuZeichnen();
    rnPruefknopfAktualisieren();

    /* Steht die Zahl vollständig da, wird gleich geprüft - mit einer
       kurzen Pause, damit die letzte Ziffer noch zu sehen ist. */
    if (rnEingabe.length >= String(rnTask.soll).length) {
        const getippt = rnEingabe, beiAufgabe = rnTask;
        if (rnPruefTimer) clearTimeout(rnPruefTimer);
        rnPruefTimer = setTimeout(() => {
            rnPruefTimer = null;
            if (answerLocked || rnTask !== beiAufgabe || rnEingabe !== getippt || !stationAktiv()) return;
            rnPruefen();
        }, 350);
    }
}

function rnLoeschen() {
    if (answerLocked || rnGeloest) return;
    if (rnAktivesFeld()) rnWegEingabe = rnWegEingabe.slice(0, -1);
    else rnEingabe = rnEingabe.slice(0, -1);
    rnNeuZeichnen();
    rnPruefknopfAktualisieren();
}

/* Eine Ziffer für das Kästchen im Rechenweg. Falsch kostet nichts:
   das Kästchen wackelt und bleibt offen. */
function rnWegTippe(ziffer) {
    const name = rnAktivesFeld();
    const soll = String(rnCoach.werte[name]);
    if (rnWegEingabe === '' && ziffer === '0' && soll !== '0') {
        rnWackeln(document.querySelector('.rn-weg-kasten.aktiv'));
        return;
    }
    rnWegEingabe += ziffer;
    if (rnWegEingabe.length < soll.length) {
        rnNeuZeichnen();
        return;
    }
    const eingabe = rnWegEingabe;
    rnWegEingabe = '';
    if (eingabe !== soll) {
        rnNeuZeichnen();
        rnWackeln(document.querySelector('.rn-weg-kasten.aktiv'));
        return;
    }
    rnWeg[name] = Number(soll);
    rnWeiterNachPause();
    rnNeuZeichnen();
}

function rnPruefknopfAktualisieren() {
    const btn = document.querySelector('#stationOptions .check-btn');
    if (btn) btn.disabled = (rnEingabe === '' || !!rnGeloest);
}

function rnPruefen() {
    if (answerLocked || rnGeloest || rnEingabe === '') return;
    if (rnPruefTimer) { clearTimeout(rnPruefTimer); rnPruefTimer = null; }

    const ok = parseInt(rnEingabe, 10) === rnTask.soll;
    const typ = RN_TYPEN[rnKey];
    if (!submitAnswer(ok, typ.hinweis(rnTask), false, typ.tipp ? typ.tipp(rnTask) : null)) {
        /* Noch ein Versuch: die Eingabe wird geleert, alles andere -
           auch ein offener Coach - bleibt, wie es ist. */
        rnEingabe = '';
        rnNeuZeichnen();
        rnPruefknopfAktualisieren();
        return;
    }
    rnTimerStoppen();
    rnGeloest = { richtig: ok };
    if (typ.kopfrechnen) krZaehlen(ok);
    rnNeuZeichnen();
    rnPruefknopfAktualisieren();
}

/* Am Rechner darf auch die Tastatur benutzt werden */
function rnTastatur(e) {
    if (!document.getElementById('rnTastenfeld') || answerLocked || !stationAktiv()) return;
    if (e.key >= '0' && e.key <= '9') {
        rnTippe(e.key);
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        rnLoeschen();
        e.preventDefault();
    } else if (e.key === 'Enter' && rnEingabe !== '' && !rnAktivesFeld()) {
        rnPruefen();
        e.preventDefault();
    }
}

document.addEventListener('keydown', rnTastatur);

/* ---------- Vorlesen von Sätzen ----------
   Station 5 liest nur Zahlen vor und überwacht dafür die Sprachausgabe
   genau. Hier genügt weniger: das Kind tippt selbst auf den Knopf, und
   kommt kein Ton, ist der Text ja trotzdem zu lesen. */
function vorleseKnopfHTML(aufruf) {
    if (!spracheVerfuegbar()) return '';
    return '<button type="button" class="rn-vorlesen" onclick="' + aufruf + '" ' +
           'aria-label="Vorlesen" title="Vorlesen">🔊</button>';
}

function sprechbar(text) {
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/−/g, ' minus ')
        .replace(/\+/g, ' plus ')
        .replace(/=/g, ' ist ')
        .replace(/…\?/g, ' wie viel?')
        .replace(/[✓➜]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function lesVorAus(id) {
    const el = document.getElementById(id);
    if (el) lesVor(el.innerHTML);
}

function lesVor(html) {
    if (!spracheVerfuegbar()) return;
    try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
        if (!s5Stimmen || !s5Stimmen.length) stimmenLaden();
    } catch (e) { /* dann eben ohne Abbruch */ }

    // Wie bei den Zahlen: nach cancel() in einem eigenen Schritt sprechen
    setTimeout(() => {
        try {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
            const text = new SpeechSynthesisUtterance(sprechbar(html));
            text.lang = 'de-DE';
            text.rate = 0.9;
            const stimme = deutscheStimme();
            if (stimme) text.voice = stimme;
            s5Ansage = text;   // Referenz halten, sonst räumt Chrome sie weg
            window.speechSynthesis.speak(text);
        } catch (e) { /* ohne Ton bleibt der Text zu lesen */ }
    }, 120);
}

/* ============================================
   9d. Erkläraufgabe (Rechnen bis 100)
   Aufbau wie in "Mathe Klasse 2": eine feste Beispielaufgabe, das Kind
   beantwortet jeden Schritt selbst - es tippt eine Stelle an oder
   wählt aus drei Antworten. Nach dem ersten Fehlversuch kommt ein
   Tipp, nach dem zweiten löst sich der Schritt auf. Punkte gibt es
   hier keine: die Erkläraufgabe soll zeigen, nicht prüfen.

   Schema einer Variante (station.erklaerung ist eine Liste davon):
   label     - Aufschrift auf dem Auswahlknopf, die Aufgabe selbst
   aufgabe   - { a, op, b, luecke } für das Material
   zeilen    - [{ teile, gesucht, folgt, ab }]
               teile: Zahlen und Zeichen. Zahlen heißen der Reihe nach
               a, b, c - die Zahl nach "=" heißt erg.
               gesucht: { erg: 3 } - steht als "?" da, bis Schritt 3
               erledigt ist. folgt: füllt sich mit, zeigt aber nie
               ein "?" (es soll nur eine Frage zugleich sichtbar sein).
               ab: die Zeile erscheint erst mit diesem Schritt.
               zehner: die Zahlen der Zeile zählen Zehner (3 + 4 = 7
               bei 30 + 40) - mit Farbhilfe werden sie ganz blau.
   schritte  - [{ frage, pick | wahl + antwort, tipp, kurz, satz,
                  zeigt, mitFrage }]
               pick: Ziele zum Antippen wie im Coach ('a.zehner').
               Ein Ziel mit Zeilennummer ('1:b') meint nur diese Zeile.
               kurz: steht nach dem Schritt unter der Aufgabe,
               satz: kommt in die Liste der erledigten Schritte.
               zeigt: was danach leuchtet (sonst: die pick-Ziele).
               mitFrage: zeigt leuchtet schon während der Frage.
   strich    - erledigt => Sprünge am Rechenstrich (optional)
   merksatz  - steht klein unter der Aufgabe
   materialNachStelle - Stangen blau, Würfel grün, wie in der Übung
   ============================================ */
let erkStation = 0;
let erkVariante = null;     // Index in station.erklaerung
let erkSchritt = 0;         // 0 = Beispielansicht, danach 1 … n
let erkFertig = false;      // ist der aktuelle Schritt beantwortet?
let erkVersuche = 0;
let erkGetroffen = [];
let erkTipp = '';
let erkSelbst = false;      // selbst gefunden oder aufgedeckt?
let erkMaterial = false;
let erkFarbe = false;
let erkTimer = null;

function erkTimerStoppen() {
    if (erkTimer) { clearTimeout(erkTimer); erkTimer = null; }
}

/* Knopf über den Unterstationen - nur bei Stationen mit Erkläraufgabe */
function erkEinstiegHTML(index) {
    if (!STATIONS[index].erklaerung) return '';
    return '<button class="check-btn ' + STATIONS[index].color +
           '-color" onclick="openErklaerung(' + index + ')">📖 So geht\'s – Erkläraufgabe</button>';
}

function openErklaerung(index) {
    erkStation = index;
    const station = STATIONS[index];
    const titel = document.getElementById('erkTitel');
    titel.innerText = stationTitel(index);
    titel.className = 'exercise-title ' + station.color + '-color';
    document.getElementById('erkInhalt').style.setProperty('--rn-farbe', 'var(--color-' + station.color + ')');
    document.getElementById('erkInhalt').style.setProperty('--hilfe-farbe', 'var(--color-' + station.color + ')');

    /* Mit nur einer Variante gibt es nichts zu wählen */
    erkVariante = station.erklaerung.length === 1 ? 0 : null;
    erkNeuStart();
    showScreen('erklaerScreen');
}

function backFromErklaerung() {
    showSubStationScreen(erkStation);
}

function erkDaten() {
    return erkVariante === null ? null : STATIONS[erkStation].erklaerung[erkVariante];
}

function erkNeuStart() {
    erkTimerStoppen();
    erkSchritt = 0;
    erkFertig = false;
    erkVersuche = 0;
    erkGetroffen = [];
    erkTipp = '';
    erkSelbst = false;
    erkMaterial = false;   // Hilfen auf Abruf: starten aus
    erkFarbe = false;
    erkZeichnen();
}

function erkVarianteWaehlen(i) {
    erkVariante = i;
    erkNeuStart();
}

function erkMaterialToggle() {
    erkMaterial = !erkMaterial;
    erkZeichnen();
}

function erkFarbeToggle() {
    erkFarbe = !erkFarbe;
    erkZeichnen();
}

/* Wie viele Schritte sind schon erledigt? */
function erkErledigt() {
    if (erkSchritt === 0) return 0;
    return erkFertig ? erkSchritt : erkSchritt - 1;
}

function erkAktuell() {
    const d = erkDaten();
    return d && erkSchritt > 0 ? d.schritte[erkSchritt - 1] : null;
}

function erkZeichnen() {
    const d = erkDaten();
    const knopfMaterial = document.getElementById('erkMaterialBtn');
    const knopfFarbe = document.getElementById('erkFarbeBtn');
    const weiter = document.getElementById('erkWeiter');
    const zurueck = document.getElementById('erkZurueck');

    if (!d) {
        /* Auswahl: auf den Knöpfen steht die Aufgabe selbst - das Kind
           wählt etwas, das es sehen kann. */
        document.getElementById('erkFortschritt').innerText = 'Was willst du anschauen?';
        document.getElementById('erkBalken').style.width = '0%';
        document.getElementById('erkBild').innerHTML = '';
        document.getElementById('erkListe').innerHTML = '';
        document.getElementById('erkAuswahl').innerHTML = '<div class="erk-wahl">' +
            STATIONS[erkStation].erklaerung.map((v, i) =>
                '<button class="erk-wahl-btn erk-variante" onclick="erkVarianteWaehlen(' + i + ')">' + v.label + '</button>'
            ).join('') + '</div>';
        knopfMaterial.hidden = true;
        knopfFarbe.hidden = true;
        zurueck.disabled = true;
        weiter.hidden = true;
        return;
    }

    const n = d.schritte.length;
    /* Jeder Schritt zählt doppelt: Frage gelesen, Frage erledigt */
    const halb = erkSchritt === 0 ? 0 : (erkSchritt - 1) * 2 + (erkFertig ? 2 : 1);
    document.getElementById('erkFortschritt').innerText = erkSchritt === 0 ? 'Beispiel' : 'Schritt ' + erkSchritt + ' von ' + n;
    document.getElementById('erkBalken').style.width = (halb / (n * 2) * 100) + '%';

    knopfMaterial.hidden = false;
    knopfMaterial.classList.toggle('aktiv', erkMaterial);
    knopfMaterial.innerText = erkMaterial ? '🧱 Zehnerstangen ausblenden' : '🧱 Zehnerstangen zeigen';
    knopfFarbe.hidden = false;
    knopfFarbe.classList.toggle('aktiv', erkFarbe);
    knopfFarbe.innerText = erkFarbe ? '🎨 Farben ausblenden' : '🎨 Farbliche Unterstützung';

    erkBildZeichnen(d);
    erkAuswahlZeichnen();
    erkListeZeichnen(d);

    /* Mit mehreren Varianten führt Zurück vom Beispiel wieder zur Wahl */
    zurueck.disabled = erkSchritt === 0 && STATIONS[erkStation].erklaerung.length === 1;
    weiter.hidden = false;
    const fragt = erkSchritt > 0 && !erkFertig;
    if (erkSchritt === 0) weiter.innerText = "Los geht's →";
    else if (fragt) weiter.innerText = 'Zeig es mir';
    else if (erkSchritt >= n) weiter.innerText = 'Von vorn ↺';
    else weiter.innerText = 'Weiter →';
    weiter.classList.toggle('is-secondary', fragt);
}

/* Namen der Plätze einer Zeile: a, b, c … und erg nach dem "=" */
function erkPlatzNamen(teile) {
    const namen = [];
    let zaehler = 0, nachGleich = false;
    teile.forEach(teil => {
        if (teil === '=') { nachGleich = true; namen.push(null); return; }
        if (typeof teil === 'number') {
            namen.push(nachGleich ? 'erg' : 'abc'[zaehler++]);
        } else {
            namen.push(null);
        }
    });
    return namen;
}

function erkBildZeichnen(d) {
    const s = erkAktuell();
    const erledigt = erkErledigt();
    const tippen = !!(s && s.pick && !erkFertig);

    /* Was leuchtet? Nach der Antwort das, was der Schritt zeigt. Bei
       einer Auswahlfrage bleibt die Markierung des vorigen Schritts
       stehen - bei "Wie viele sind es zusammen?" muss man sehen, was
       gemeint ist. Vor einer Tipp-Frage wird gelöscht, sonst zeigte
       die alte Markierung schon auf die Antwort. */
    let leuchtet = [];
    const zeigtVon = schritt => schritt ? [].concat(schritt.zeigt || schritt.pick || []) : [];
    if (s && erkFertig) leuchtet = zeigtVon(s);
    else if (s && s.mitFrage) leuchtet = zeigtVon(s);
    else if (s && !s.pick && erkSchritt > 1) leuchtet = zeigtVon(d.schritte[erkSchritt - 2]);
    if (tippen) leuchtet = leuchtet.concat(erkGetroffen);

    const zeilen = d.zeilen.filter(z => erkSchritt >= (z.ab || 0));

    /* Fragt gerade ein Platz? Dann ist er der einzige mit "?". */
    const fragtGerade = (z, name) => !erkFertig && erkSchritt > 0 && z.gesucht && z.gesucht[name] === erkSchritt;
    const jemandFragt = zeilen.some(z => z.gesucht && Object.keys(z.gesucht).some(name => fragtGerade(z, name)));

    const gleichungen = zeilen.map((z, zi) => {
        const namen = erkPlatzNamen(z.teile);
        const istMarkiert = (name, stelle) => leuchtet.some(ziel => {
            let zz = String(ziel);
            const doppel = zz.indexOf(':');
            if (doppel > 0) {
                if (Number(zz.slice(0, doppel)) !== zi) return false;
                zz = zz.slice(doppel + 1);
            } else if (zi > 0) {
                return false;   // ohne Zeilennummer ist die erste Zeile gemeint
            }
            return zz === name || (stelle && zz === name + '.' + stelle);
        });

        const fragtHier = Object.keys(z.gesucht || {}).some(name => fragtGerade(z, name));
        const aktiv = zeilen.length > 1 && jemandFragt ? (fragtHier ? ' erk-zeile-aktiv' : ' erk-zeile-still') : '';

        const html = z.teile.map((teil, ti) => {
            const name = namen[ti];
            if (!name) return '<span class="erk-zeichen">' + teil + '</span>';
            const offenBis = (z.gesucht && z.gesucht[name]) || (z.folgt && z.folgt[name]);
            const klick = tippen ? ' erk-tippbar" onclick="erkTippe(event, ' + zi + ')' : '';
            const wert = ' data-platz="' + name + '"';

            if (offenBis && erledigt < offenBis) {
                /* Nur eine Frage zugleich: ein anderer offener Platz steht
                   als Strich da, so wie die Lücke im Heft. */
                const gesucht = z.gesucht && z.gesucht[name];
                const zeigeFrage = gesucht && (!jemandFragt || fragtGerade(z, name));
                return '<span class="erk-platz erk-offen' + (istMarkiert(name) ? ' rn-mark' : '') + klick + '"' + wert + '>' +
                       (zeigeFrage ? '?' : '<span class="erk-luecke"></span>') + '</span>';
            }
            const ganz = istMarkiert(name);
            const ziffern = rnStellen(teil).map(st =>
                '<span class="rn-ziffer' + (!ganz && istMarkiert(name, st.stelle) ? ' rn-mark' : '') +
                '" data-stelle="' + st.stelle + '">' + st.ziffer + '</span>').join('');
            const gefunden = offenBis ? ' erk-gefunden' : '';
            return '<span class="erk-platz' + gefunden + (ganz ? ' rn-mark' : '') + klick + '"' + wert + '>' + ziffern + '</span>';
        }).join('');
        return '<div class="erk-gleichung' + aktiv + (z.zehner ? ' rn-zehnerzeile' : '') + '">' + html + '</div>';
    }).join('');

    /* Genau eine Ansage unter der Aufgabe: die Frage, solange sie offen
       ist - danach die kurze Rechnung als Bestätigung. */
    let ansage;
    if (erkSchritt === 0) {
        ansage = '<span class="erk-ansage-intro">Schau dir die Aufgabe an. Dann gehst du Schritt für Schritt vor – und machst selbst mit.</span>';
    } else if (!erkFertig) {
        ansage = s.frage;
    } else {
        ansage = (erkSelbst ? '<span class="erk-haken">✓</span>' : '') +
                 '<span class="erk-ansage-ergebnis">' + s.kurz + '</span>';
    }

    let html = '<div class="erk-gleichungen' + (erkFarbe ? ' rn-farbig' : '') + '">' + gleichungen + '</div>' +
        '<div class="erk-ansage"><span id="erkAnsageText">' + ansage + '</span>' +
        vorleseKnopfHTML("lesVorAus('erkAnsageText')") + '</div>';
    if (d.strich) html += rnStrichHTML(d.strich(erledigt));
    if (erkMaterial) html += rnMaterialHTML(d.aufgabe, erkFarbe || !!d.materialNachStelle);
    html += '<small class="erk-merksatz">' + d.merksatz + '</small>';

    document.getElementById('erkBild').innerHTML = html;
}

function erkAuswahlZeichnen() {
    const box = document.getElementById('erkAuswahl');
    const s = erkAktuell();
    if (!s || erkFertig) { box.innerHTML = ''; return; }
    const wahl = s.wahl
        ? '<div class="erk-wahl">' + s.wahl.map((w, i) =>
            '<button class="erk-wahl-btn" onclick="erkWahl(' + i + ', this)">' + w + '</button>').join('') + '</div>'
        : '';
    box.innerHTML = wahl + '<p class="erk-tipp' + (erkTipp ? ' falsch' : '') + '" id="erkTipp">' + erkTipp + '</p>';
}

/* In der Liste stehen nur die erledigten Schritte - was noch kommt,
   bleibt verborgen, sonst liest das Kind die Lösung, bevor es selbst
   gedacht hat. */
function erkListeZeichnen(d) {
    const zahl = erkErledigt();
    document.getElementById('erkListe').innerHTML = d.schritte.slice(0, zahl).map((s, i) =>
        '<div class="erk-schritt' + (i === zahl - 1 && erkFertig ? ' aktuell' : '') + '">' +
        '<span>✓</span><p>' + s.satz + '</p></div>').join('');
}

function erkTippe(event, zeile) {
    const s = erkAktuell();
    if (!s || !s.pick || erkFertig) return;
    const platz = event.currentTarget;
    const ziffer = event.target.closest ? event.target.closest('[data-stelle]') : null;
    const vorsatz = zeile > 0 ? zeile + ':' : '';
    const name = vorsatz + platz.dataset.platz;
    const gewaehlt = ziffer ? name + '.' + ziffer.dataset.stelle : name;

    const treffer = s.pick.find(ziel => ziel === gewaehlt || ziel === name);
    if (!treffer) { erkDaneben(ziffer || platz); return; }
    if (erkGetroffen.indexOf(treffer) < 0) erkGetroffen.push(treffer);
    if (erkGetroffen.length >= s.pick.length) erkGeloest(true);
    else erkZeichnen();
}

function erkWahl(i, btn) {
    const s = erkAktuell();
    if (!s || erkFertig) return;
    if (String(s.wahl[i]) === String(s.antwort)) { erkGeloest(true); return; }
    btn.disabled = true;
    erkDaneben(btn);
}

/* Nach dem ersten Fehlversuch ein Tipp, nach dem zweiten die Lösung -
   Kinder sollen nicht vor einer verschlossenen Tür sitzen bleiben. */
function erkDaneben(el) {
    erkVersuche++;
    rnWackeln(el);
    if (erkVersuche >= 2) { erkGeloest(false); return; }
    erkTipp = erkAktuell().tipp || 'Noch nicht ganz. Versuch es noch einmal.';
    /* Nur den Tipp nachtragen - neu zeichnen nähme dem Knopf sein Wackeln */
    const tipp = document.getElementById('erkTipp');
    if (tipp) { tipp.innerText = erkTipp; tipp.classList.add('falsch'); }
}

/* Selbst gefunden: nach einem Moment zum Lesen geht es von allein
   weiter. Aufgedeckt: das Kind liest und klickt selbst weiter. */
function erkGeloest(selbst) {
    erkTimerStoppen();
    erkFertig = true;
    erkSelbst = selbst;
    erkVersuche = 0;
    erkGetroffen = [];
    erkTipp = '';
    erkZeichnen();

    /* Ein Daumen für den einzelnen Schritt, Konfetti erst für die
       fertige Kette. Nur hier und nicht beim Zeichnen - sonst jubelte
       die App bei jedem Umschalten des Materials erneut. */
    const letzter = erkSchritt >= erkDaten().schritte.length;
    if (selbst && letzter) startKonfetti(60);
    else if (selbst) {
        const daumen = document.createElement('span');
        daumen.className = 'erk-daumen';
        daumen.textContent = '👍';
        document.getElementById('erkBild').appendChild(daumen);
    }

    if (!selbst || letzter) return;
    const bei = erkSchritt;
    erkTimer = setTimeout(() => {
        erkTimer = null;
        if (erkSchritt === bei && erkFertig) erkWeiter();
    }, 1800);
}

function erkWeiter() {
    erkTimerStoppen();
    const d = erkDaten();
    if (!d) return;
    if (erkSchritt > 0 && !erkFertig) { erkGeloest(false); return; }
    if (erkSchritt >= d.schritte.length) { erkNeuStart(); return; }
    erkSchritt++;
    erkFertig = false;
    erkVersuche = 0;
    erkGetroffen = [];
    erkTipp = '';
    erkSelbst = false;
    erkZeichnen();
}

/* Zurück geht auf den vorigen, schon gelösten Schritt */
function erkZurueck() {
    erkTimerStoppen();
    if (erkSchritt === 0) {
        if (STATIONS[erkStation].erklaerung.length > 1) {
            erkVariante = null;
            erkZeichnen();
        }
        return;
    }
    erkSchritt--;
    erkFertig = erkSchritt > 0;
    erkVersuche = 0;
    erkGetroffen = [];
    erkTipp = '';
    erkSelbst = false;
    erkZeichnen();
}

/* ---------- Die Erkläraufgaben der sechs Stufen ---------- */
/* Sprünge am Rechenstrich für die Erkläraufgaben. Jeder Sprung wird
   sichtbar, sobald sein Schritt erledigt ist (bekannt: von Anfang an). */
function erkStrich(spruenge) {
    return erledigt => spruenge.map(s => {
        const textDa = s.textAb === undefined || erledigt >= s.textAb;
        const endeDa = s.endeAb === undefined || erledigt >= s.endeAb;
        return { von: s.von, nach: s.nach, text: textDa ? s.text : '?', offen: !textDa,
                 ende: endeDa ? s.nach : '?' };
    });
}

const ERK_STUFE1 = [
    {
        label: '40 + 6',
        aufgabe: { a: 40, op: '+', b: 6 },
        zeilen: [{ teile: [40, '+', 6, '=', 46], gesucht: { erg: 3 } }],
        schritte: [
            { frage: 'Tippe die Zehner an.', pick: ['a.zehner'],
              tipp: 'Die Zehner stehen vorne in der 40.',
              kurz: '4 Zehner', satz: '40 sind 4 Zehner.' },
            { frage: 'Tippe die Einer an, die dazukommen.', pick: ['b'],
              tipp: 'Hinter dem Plus steht, was dazukommt.',
              kurz: '6 Einer kommen dazu', satz: '6 Einer kommen dazu.' },
            { frage: '4 Zehner und 6 Einer – welche Zahl ist das?', wahl: [64, 46, 10], antwort: 46,
              tipp: 'Die Zehner stehen vorne, die Einer hinten.',
              kurz: '40 + 6 = 46', satz: 'Zusammen: 40 + 6 = 46.', zeigt: ['erg'] }
        ],
        merksatz: 'Zehner und Einer zusammen ergeben die Zahl.'
    },
    {
        label: '46 − 6',
        aufgabe: { a: 46, op: '−', b: 6 },
        zeilen: [{ teile: [46, '−', 6, '=', 40], gesucht: { erg: 3 } }],
        schritte: [
            { frage: 'Tippe die Einer der 46 an.', pick: ['a.einer'],
              tipp: 'Die Einer stehen hinten in der Zahl.',
              kurz: '6 Einer', satz: 'Die 46 hat 6 Einer.' },
            { frage: 'Wie viele Einer gehen weg? Tippe sie an.', pick: ['b'],
              tipp: 'Hinter dem Minus steht, was weggeht.',
              kurz: '6 Einer gehen weg', satz: 'Alle 6 Einer gehen weg.' },
            { frage: 'Was bleibt übrig?', wahl: [0, 40, 46], antwort: 40,
              tipp: 'Die Einer sind weg. Nur die Zehner bleiben.',
              kurz: '46 − 6 = 40', satz: 'Es bleiben die Zehner: 46 − 6 = 40.', zeigt: ['erg'] }
        ],
        merksatz: 'Gehen alle Einer weg, bleibt die Zehnerzahl.'
    }
];

const ERK_STUFE2 = [
    {
        label: '30 + 40',
        aufgabe: { a: 30, op: '+', b: 40 },
        zeilen: [
            { teile: [30, '+', 40, '=', 70], gesucht: { erg: 3 } },
            { teile: [3, '+', 4, '=', 7], gesucht: { erg: 2 }, ab: 2, zehner: true }
        ],
        schritte: [
            { frage: 'Tippe die Zehner von beiden Zahlen an.', pick: ['a.zehner', 'b.zehner'],
              tipp: 'Die Zehner stehen vorne: in der 30 und in der 40.',
              kurz: '3 Zehner und 4 Zehner', satz: '30 sind 3 Zehner, 40 sind 4 Zehner.' },
            { frage: 'Rechne die kleine Aufgabe: 3 + 4.', wahl: [6, 7, 8], antwort: 7,
              tipp: 'Zähle von 3 aus 4 weiter.',
              kurz: '3 + 4 = 7', satz: 'Die kleine Aufgabe: 3 + 4 = 7.', zeigt: ['1:erg'] },
            { frage: '7 Zehner – welche Zahl ist das?', wahl: [7, 70, 34], antwort: 70,
              tipp: 'Aus 7 Zehnern wird die Zehnerzahl siebzig.',
              kurz: '30 + 40 = 70', satz: '7 Zehner sind 70. Also: 30 + 40 = 70.', zeigt: ['erg', '1:erg'] }
        ],
        merksatz: 'Rechne mit den Zehnern wie mit Einern: 3 + 4 = 7, also 30 + 40 = 70.'
    },
    {
        label: '70 − 20',
        aufgabe: { a: 70, op: '−', b: 20 },
        zeilen: [
            { teile: [70, '−', 20, '=', 50], gesucht: { erg: 3 } },
            { teile: [7, '−', 2, '=', 5], gesucht: { erg: 2 }, ab: 2, zehner: true }
        ],
        schritte: [
            { frage: 'Tippe die Zehner von beiden Zahlen an.', pick: ['a.zehner', 'b.zehner'],
              tipp: 'Die Zehner stehen vorne: in der 70 und in der 20.',
              kurz: '7 Zehner und 2 Zehner', satz: '70 sind 7 Zehner, 20 sind 2 Zehner.' },
            { frage: 'Rechne die kleine Aufgabe: 7 − 2.', wahl: [4, 5, 6], antwort: 5,
              tipp: 'Zähle von 7 aus 2 zurück.',
              kurz: '7 − 2 = 5', satz: 'Die kleine Aufgabe: 7 − 2 = 5.', zeigt: ['1:erg'] },
            { frage: '5 Zehner – welche Zahl ist das?', wahl: [5, 50, 90], antwort: 50,
              tipp: 'Aus 5 Zehnern wird die Zehnerzahl fünfzig.',
              kurz: '70 − 20 = 50', satz: '5 Zehner sind 50. Also: 70 − 20 = 50.', zeigt: ['erg', '1:erg'] }
        ],
        merksatz: 'Rechne mit den Zehnern wie mit Einern: 7 − 2 = 5, also 70 − 20 = 50.'
    }
];

const ERK_STUFE3 = [
    {
        label: '45 + 30',
        materialNachStelle: true,
        aufgabe: { a: 45, op: '+', b: 30 },
        zeilen: [{ teile: [45, '+', 30, '=', 75], gesucht: { erg: 4 } }],
        schritte: [
            { frage: 'Tippe die Zehner von beiden Zahlen an.', pick: ['a.zehner', 'b.zehner'],
              tipp: 'Die Zehner stehen vorne: in der 45 und in der 30.',
              kurz: '4 Zehner und 3 Zehner', satz: '45 hat 4 Zehner. 3 Zehner kommen dazu.' },
            { frage: 'Wie viele Zehner sind es zusammen?', wahl: [6, 7, 8], antwort: 7,
              tipp: 'Rechne 4 + 3.',
              kurz: '4 + 3 = 7 Zehner', satz: 'Zusammen sind es 7 Zehner.', zeigt: ['a.zehner', 'b.zehner'] },
            { frage: 'Tippe die Einer der 45 an.', pick: ['a.einer'],
              tipp: 'Die Einer stehen hinten in der 45.',
              kurz: 'die 5 Einer bleiben', satz: 'Die 5 Einer bleiben gleich.' },
            { frage: 'Wie heißt das Ergebnis?', wahl: [48, 75, 85], antwort: 75,
              tipp: '7 Zehner und 5 Einer.',
              kurz: '45 + 30 = 75', satz: '7 Zehner und 5 Einer: 45 + 30 = 75.', zeigt: ['erg'] }
        ],
        merksatz: 'Nur die Zehner rechnen. Die Einer bleiben.'
    },
    {
        label: '40 + 26',
        materialNachStelle: true,
        aufgabe: { a: 40, op: '+', b: 26 },
        zeilen: [{ teile: [40, '+', 26, '=', 66], gesucht: { erg: 4 } }],
        schritte: [
            { frage: 'Tippe die Zehner von beiden Zahlen an.', pick: ['a.zehner', 'b.zehner'],
              tipp: 'Die Zehner stehen vorne: in der 40 und in der 26.',
              kurz: '4 Zehner und 2 Zehner', satz: '40 hat 4 Zehner, 26 hat 2 Zehner.' },
            { frage: 'Wie viele Zehner sind es zusammen?', wahl: [5, 6, 7], antwort: 6,
              tipp: 'Rechne 4 + 2.',
              kurz: '4 + 2 = 6 Zehner', satz: 'Zusammen sind es 6 Zehner.', zeigt: ['a.zehner', 'b.zehner'] },
            { frage: 'Tippe die Einer der 26 an.', pick: ['b.einer'],
              tipp: 'Die Einer stehen hinten in der 26.',
              kurz: 'die 6 Einer bleiben', satz: 'Die 6 Einer bleiben gleich.' },
            { frage: 'Wie heißt das Ergebnis?', wahl: [46, 60, 66], antwort: 66,
              tipp: '6 Zehner und 6 Einer.',
              kurz: '40 + 26 = 66', satz: '6 Zehner und 6 Einer: 40 + 26 = 66.', zeigt: ['erg'] }
        ],
        merksatz: 'Nur die Zehner rechnen. Die Einer bleiben.'
    },
    {
        label: '65 − 20',
        aufgabe: { a: 65, op: '−', b: 20 },
        zeilen: [{ teile: [65, '−', 20, '=', 45], gesucht: { erg: 4 } }],
        schritte: [
            { frage: 'Tippe die Zehner von beiden Zahlen an.', pick: ['a.zehner', 'b.zehner'],
              tipp: 'Die Zehner stehen vorne: in der 65 und in der 20.',
              kurz: '6 Zehner und 2 Zehner', satz: '65 hat 6 Zehner. 2 Zehner gehen weg.' },
            { frage: 'Wie viele Zehner bleiben?', wahl: [3, 4, 5], antwort: 4,
              tipp: 'Rechne 6 − 2.',
              kurz: '6 − 2 = 4 Zehner', satz: 'Es bleiben 4 Zehner.', zeigt: ['a.zehner', 'b.zehner'] },
            { frage: 'Tippe die Einer der 65 an.', pick: ['a.einer'],
              tipp: 'Die Einer stehen hinten in der 65.',
              kurz: 'die 5 Einer bleiben', satz: 'Die 5 Einer bleiben gleich.' },
            { frage: 'Wie heißt das Ergebnis?', wahl: [40, 45, 63], antwort: 45,
              tipp: '4 Zehner und 5 Einer.',
              kurz: '65 − 20 = 45', satz: '4 Zehner und 5 Einer: 65 − 20 = 45.', zeigt: ['erg'] }
        ],
        merksatz: 'Nur die Zehner gehen weg. Die Einer bleiben.'
    }
];

const ERK_STUFE4 = [
    {
        label: '34 + 5',
        aufgabe: { a: 34, op: '+', b: 5 },
        zeilen: [
            { teile: [34, '+', 5, '=', 39], gesucht: { erg: 4 } },
            { teile: [4, '+', 5, '=', 9], gesucht: { erg: 2 }, ab: 2 }
        ],
        schritte: [
            { frage: 'Tippe die Einer von beiden Zahlen an.', pick: ['a.einer', 'b'],
              tipp: 'Die Einer stehen hinten. Die 5 hat nur Einer.',
              kurz: '4 Einer und 5 Einer', satz: 'Die 34 hat 4 Einer, 5 Einer kommen dazu.' },
            { frage: 'Der Zehner wartet. Rechne nur die Einer: 4 + 5.', wahl: [8, 9, 10], antwort: 9,
              tipp: 'Zähle von 4 aus 5 weiter.',
              kurz: '4 + 5 = 9', satz: 'Die Einer: 4 + 5 = 9.', zeigt: ['1:erg'] },
            { frage: 'Tippe den Zehner an, der gewartet hat.', pick: ['a.zehner'],
              tipp: 'Der Zehner steht vorne in der 34.',
              kurz: 'die 3 Zehner bleiben', satz: 'Die 3 Zehner bleiben.' },
            { frage: 'Wie heißt das Ergebnis?', wahl: [39, 84, 93], antwort: 39,
              tipp: '3 Zehner und 9 Einer.',
              kurz: '34 + 5 = 39', satz: '3 Zehner und 9 Einer: 34 + 5 = 39.', zeigt: ['erg'] }
        ],
        merksatz: 'Der Zehner wartet. Nur die Einer rechnen.'
    },
    {
        label: '38 − 5',
        aufgabe: { a: 38, op: '−', b: 5 },
        zeilen: [
            { teile: [38, '−', 5, '=', 33], gesucht: { erg: 4 } },
            { teile: [8, '−', 5, '=', 3], gesucht: { erg: 2 }, ab: 2 }
        ],
        schritte: [
            { frage: 'Tippe die Einer der 38 an – und die Einer, die weggehen.', pick: ['a.einer', 'b'],
              tipp: 'Die Einer stehen hinten. Die 5 hat nur Einer.',
              kurz: '8 Einer, 5 gehen weg', satz: 'Die 38 hat 8 Einer, 5 Einer gehen weg.' },
            { frage: 'Der Zehner wartet. Rechne nur die Einer: 8 − 5.', wahl: [2, 3, 4], antwort: 3,
              tipp: 'Zähle von 8 aus 5 zurück.',
              kurz: '8 − 5 = 3', satz: 'Die Einer: 8 − 5 = 3.', zeigt: ['1:erg'] },
            { frage: 'Tippe den Zehner an, der gewartet hat.', pick: ['a.zehner'],
              tipp: 'Der Zehner steht vorne in der 38.',
              kurz: 'die 3 Zehner bleiben', satz: 'Die 3 Zehner bleiben.' },
            { frage: 'Wie heißt das Ergebnis?', wahl: [32, 33, 43], antwort: 33,
              tipp: '3 Zehner und 3 Einer.',
              kurz: '38 − 5 = 33', satz: '3 Zehner und 3 Einer: 38 − 5 = 33.', zeigt: ['erg'] }
        ],
        merksatz: 'Der Zehner wartet. Nur die Einer rechnen.'
    }
];

const ERK_STUFE5 = [
    {
        label: '37 + 3',
        aufgabe: { a: 37, op: '+', b: 3 },
        zeilen: [
            { teile: [37, '+', 3, '=', 40], gesucht: { erg: 4 } },
            { teile: [7, '+', 3, '=', 10], gesucht: { erg: 3 }, ab: 3 }
        ],
        schritte: [
            { frage: 'Tippe die Einer der 37 an.', pick: ['a.einer'],
              tipp: 'Die Einer stehen hinten in der 37.',
              kurz: '7 Einer', satz: 'Die 37 hat 7 Einer.' },
            { frage: 'Tippe an, was dazukommt.', pick: ['b'],
              tipp: 'Hinter dem Plus steht, was dazukommt.',
              kurz: '3 Einer kommen dazu', satz: '3 Einer kommen dazu.' },
            { frage: 'Wie viel sind 7 Einer und 3 Einer?', wahl: [9, 10, 11], antwort: 10,
              tipp: 'Zähle von 7 aus 3 weiter: 8, 9, …',
              kurz: '7 + 3 = 10', satz: '7 + 3 = 10 – ein neuer Zehner ist voll.', zeigt: ['1:erg'] },
            { frage: 'Jetzt sind es 4 Zehner. Wie heißt das Ergebnis?', wahl: [30, 40, 41], antwort: 40,
              tipp: '3 Zehner und noch ein voller Zehner.',
              kurz: '37 + 3 = 40', satz: 'Du landest genau beim Zehner: 37 + 3 = 40.', zeigt: ['erg'] }
        ],
        strich: erkStrich([{ von: 37, nach: 40, text: '+3', endeAb: 4 }]),
        merksatz: 'Machst du die Einer zur 10 voll, landest du genau beim nächsten Zehner.'
    },
    {
        label: '37 + _ = 40',
        aufgabe: { a: 37, op: '+', b: 3, luecke: 'b' },
        zeilen: [{ teile: [37, '+', 3, '=', 40], gesucht: { b: 3 } }],
        schritte: [
            { frage: 'Tippe die Zahl an, bei der du startest.', pick: ['a'],
              tipp: 'Du startest vorne, vor dem Plus.',
              kurz: 'Start: 37', satz: 'Du startest bei 37.' },
            { frage: 'Tippe die Zahl an, zu der du willst.', pick: ['erg'],
              tipp: 'Das Ziel steht hinter dem Gleichheitszeichen.',
              kurz: 'Ziel: 40', satz: 'Du willst zur 40.' },
            { frage: 'Wie viele fehlen von 37 bis 40? Zähle: 38, 39, 40.', wahl: [2, 3, 4], antwort: 3,
              tipp: 'Schau auf die Einer: von 7 bis 10.',
              kurz: '37 + 3 = 40', satz: 'Es fehlen 3. 37 + 3 = 40.', zeigt: ['b'] }
        ],
        strich: erkStrich([{ von: 37, nach: 40, text: '+3', textAb: 3 }]),
        merksatz: 'Schau auf die Einer: von 7 bis 10 fehlen 3.'
    },
    {
        label: '40 − 6',
        aufgabe: { a: 40, op: '−', b: 6 },
        zeilen: [
            { teile: [40, '−', 6, '=', 34], gesucht: { erg: 4 } },
            { teile: [10, '−', 6, '=', 4], gesucht: { erg: 2 }, ab: 2 }
        ],
        schritte: [
            { frage: 'Tippe die Zehner der 40 an.', pick: ['a.zehner'],
              tipp: 'Die Zehner stehen vorne in der 40.',
              kurz: '4 Zehner, keine Einer', satz: '40 sind 4 Zehner. Einer sind keine da.' },
            { frage: 'Ein Zehner wird aufgemacht. Wie viele bleiben von ihm, wenn 6 weggehen?', wahl: [3, 4, 5], antwort: 4,
              tipp: 'Rechne 10 − 6.',
              kurz: '10 − 6 = 4', satz: 'Ein Zehner wird aufgemacht: 10 − 6 = 4.', zeigt: ['1:erg'] },
            { frage: 'Wie viele Zehner bleiben ganz?', wahl: [2, 3, 4], antwort: 3,
              tipp: 'Einen der 4 Zehner hast du aufgemacht.',
              kurz: '3 Zehner bleiben ganz', satz: 'Die anderen 3 Zehner bleiben ganz.', zeigt: ['a.zehner'] },
            { frage: 'Wie heißt das Ergebnis?', wahl: [34, 36, 46], antwort: 34,
              tipp: '3 Zehner und 4 Einer.',
              kurz: '40 − 6 = 34', satz: '3 Zehner und 4 Einer: 40 − 6 = 34.', zeigt: ['erg'] }
        ],
        strich: erkStrich([{ von: 40, nach: 34, text: '−6', endeAb: 4 }]),
        merksatz: 'Ein Zehner wird aufgemacht: 10 − 6 = 4. Die anderen Zehner bleiben.'
    }
];

const ERK_STUFE6 = [
    {
        label: '37 + 5',
        aufgabe: { a: 37, op: '+', b: 5 },
        zeilen: [
            { teile: [37, '+', 5, '=', 42], gesucht: { erg: 3 } },
            { teile: [37, '+', 3, '+', 2, '=', 42], gesucht: { b: 1, c: 2 }, folgt: { erg: 3 }, ab: 1 }
        ],
        schritte: [
            { frage: 'Wie viele fehlen von 37 bis zum nächsten Zehner?', wahl: [2, 3, 4], antwort: 3,
              tipp: 'Zähle: 38, 39, 40.',
              kurz: '37 + 3 = 40', satz: 'Bis zur 40 fehlen 3.', zeigt: ['1:a', '1:b'] },
            { frage: 'Die 5 ist 3 und …?', wahl: [1, 2, 3], antwort: 2,
              tipp: 'Wie viel fehlt von 3 bis 5?',
              kurz: 'die 5 ist 3 und 2', satz: 'Die 5 zerlegst du in 3 und 2.',
              zeigt: ['b', '1:b', '1:c'], mitFrage: true },
            { frage: 'Rechne weiter: 40 + 2.', wahl: [32, 42, 43], antwort: 42,
              tipp: 'Von der 40 aus noch 2 weiter.',
              kurz: '40 + 2 = 42', satz: 'Dann der Rest: 40 + 2 = 42. Also 37 + 5 = 42.', zeigt: ['erg', '1:erg'] }
        ],
        strich: erkStrich([
            { von: 37, nach: 40, text: '+3', textAb: 1 },
            { von: 40, nach: 42, text: '+2', textAb: 2, endeAb: 3 }
        ]),
        merksatz: 'Erst bis zum Zehner, dann den Rest.'
    },
    {
        label: '42 − 5',
        aufgabe: { a: 42, op: '−', b: 5 },
        zeilen: [
            { teile: [42, '−', 5, '=', 37], gesucht: { erg: 3 } },
            { teile: [42, '−', 2, '−', 3, '=', 37], gesucht: { b: 1, c: 2 }, folgt: { erg: 3 }, ab: 1 }
        ],
        schritte: [
            { frage: 'Wie viele gehen von 42 zurück bis zur 40?', wahl: [1, 2, 3], antwort: 2,
              tipp: 'Zähle zurück: 41, 40.',
              kurz: '42 − 2 = 40', satz: 'Bis zur 40 sind es 2 zurück.', zeigt: ['1:a', '1:b'] },
            { frage: 'Die 5 ist 2 und …?', wahl: [2, 3, 4], antwort: 3,
              tipp: 'Wie viel fehlt von 2 bis 5?',
              kurz: 'die 5 ist 2 und 3', satz: 'Die 5 zerlegst du in 2 und 3.',
              zeigt: ['b', '1:b', '1:c'], mitFrage: true },
            { frage: 'Rechne weiter: 40 − 3.', wahl: [33, 37, 47], antwort: 37,
              tipp: 'Von der 40 aus noch 3 zurück.',
              kurz: '40 − 3 = 37', satz: 'Dann der Rest: 40 − 3 = 37. Also 42 − 5 = 37.', zeigt: ['erg', '1:erg'] }
        ],
        strich: erkStrich([
            { von: 42, nach: 40, text: '−2', textAb: 1 },
            { von: 40, nach: 37, text: '−3', textAb: 2, endeAb: 3 }
        ]),
        merksatz: 'Erst zurück bis zum Zehner, dann den Rest.'
    }
];

/* ============================================
   9e. Kopfrechnen (Wiederholung Klasse 1)
   Nachbau des Kopfrechentrainers aus "Mathe Klasse 2": das kleine
   Einspluseins im Zahlenraum bis 20, vier Rechenarten und "Gemischt".
   Die Übung läuft mit derselben Technik wie "Rechnen bis 100"
   (Ziffernblock, keine Aufgabe zweimal hintereinander). Statt der
   Anschauungshilfen gibt es hier nur den Spickzettel und nach dem
   ersten Fehler einen Tipp - Kopfrechnen soll ja das schnelle,
   auswendige Rechnen festigen.
   ============================================ */

/* Alle Aufgaben einer Rechenart. Eine "Reihe" ordnet den Spickzettel:
   beim Plus die erste Zahl (7 + …), beim Minus die abgezogene (… − 7). */
const KR_MODI = {
    plus:      { name: '1+1',  reihe: r => r + ' + …' },
    minus:     { name: '1−1',  reihe: r => '… − ' + r },
    plusZue:   { name: '1+1 mit Zehnerübergang', reihe: r => r + ' + …' },
    minusZue:  { name: '1−1 mit Zehnerübergang', reihe: r => '… − ' + r }
};

function krAlleAufgaben(modus) {
    const liste = [];
    const dazu = (a, op, b, reihe) => liste.push({ a: a, op: op, b: b, reihe: reihe, modus: modus });
    if (modus === 'plus') {
        // Summe höchstens 10: kein Zehnerübergang
        for (let a = 1; a <= 9; a++) for (let b = 1; b <= 10 - a; b++) dazu(a, '+', b, a);
    } else if (modus === 'minus') {
        // Von höchstens 10 aus, das Ergebnis ist mindestens 1
        for (let b = 1; b <= 9; b++) for (let a = b + 1; a <= 10; a++) dazu(a, '−', b, b);
    } else if (modus === 'plusZue') {
        // Beide Zahlen höchstens 9 - mit einer 10 wird kein Zehner überschritten
        for (let a = 2; a <= 9; a++) for (let b = 11 - a; b <= 9; b++) dazu(a, '+', b, a);
    } else if (modus === 'minusZue') {
        // Von 11 bis 18 zurück unter die 10: 12 − 7 = 5
        for (let b = 2; b <= 9; b++) for (let a = 11; a <= b + 9; a++) dazu(a, '−', b, b);
    }
    return liste;
}

/* Tipp nach dem ersten Fehlversuch - wörtlich aus "Mathe Klasse 2" */
function krTipp(t) {
    if (t.modus === 'plus') return 'Tipp: Zähle von ' + t.a + ' aus ' + t.b + ' Schritte weiter.';
    if (t.modus === 'minus') return 'Tipp: Wie viel musst du zu ' + t.b + ' dazuzählen, um auf ' + t.a + ' zu kommen?';
    if (t.modus === 'plusZue') {
        const bisZehn = 10 - t.a;
        return 'Tipp: Von ' + t.a + ' bis 10 fehlen ' + bisZehn + '. Zerlege die ' + t.b + ' in ' +
               bisZehn + ' und ' + (t.b - bisZehn) + '.';
    }
    const abZehn = t.a - 10;
    return 'Tipp: Gehe erst von ' + t.a + ' auf 10 zurück (das sind ' + abZehn + '). Dann ziehe noch ' +
           (t.b - abZehn) + ' ab.';
}

function krTyp(modi) {
    return {
        kopfrechnen: true,
        anweisung: 'Rechne im Kopf. Tippe das Ergebnis ein.',
        neu: () => pick(krAlleAufgaben(pick(modi))),
        tipp: t => krTipp(t),
        hinweis: t => 'Richtig ist: ' + t.a + ' ' + t.op + ' ' + t.b + ' = ' + t.erg + '.'
    };
}

RN_TYPEN.krPlus = krTyp(['plus']);
RN_TYPEN.krMinus = krTyp(['minus']);
RN_TYPEN.krPlusZue = krTyp(['plusZue']);
RN_TYPEN.krMinusZue = krTyp(['minusZue']);
RN_TYPEN.krGemischt = krTyp(['plus', 'minus', 'plusZue', 'minusZue']);

/* ---------- Auswertung der Runde ---------- */
let krRunde = { richtig: 0, gesamt: 0, mitSpick: 0, ohneSpick: 0 };

function krRundeZuruecksetzen() {
    krRunde = { richtig: 0, gesamt: 0, mitSpick: 0, ohneSpick: 0 };
}

/* Gezählt wird jede abgeschlossene Aufgabe - richtig gelöst oder nach
   dem zweiten Fehlversuch aufgelöst. */
function krZaehlen(richtig) {
    krRunde.gesamt++;
    if (!richtig) return;
    krRunde.richtig++;
    if (rnTask.spick) krRunde.mitSpick++;
    else krRunde.ohneSpick++;
}

/* Sterne und Lob nach der Trefferquote, wie in "Mathe Klasse 2" */
function krAuswertungHTML() {
    const r = krRunde;
    if (r.gesamt === 0) return '';
    const quote = r.richtig / r.gesamt * 100;
    let sterne = 1, lob = 'Übe fleißig weiter, du schaffst das! 💪';
    if (quote >= 95) { sterne = 5; lob = 'Unglaublich! Du bist ein Mathe-Profi! 🏆'; }
    else if (quote >= 80) { sterne = 4; lob = 'Super! Das hast du spitze gemacht! ✨'; }
    else if (quote >= 60) { sterne = 3; lob = 'Prima! Eine tolle Leistung! ⭐'; }
    else if (quote >= 40) { sterne = 2; lob = 'Das war schon gut! Übe fleißig weiter!'; }
    return '<div class="kr-auswertung">' +
           '<p class="kr-lob">' + lob + '</p>' +
           '<p class="kr-quote">Du hast <strong>' + r.richtig + '</strong> von <strong>' + r.gesamt +
           '</strong> richtig gelöst!</p>' +
           '<div class="kr-details"><span>🧠 Ohne Spickzettel: <strong>' + r.ohneSpick + '</strong></span>' +
           '<span>📋 Mit Spickzettel: <strong>' + r.mitSpick + '</strong></span></div>' +
           '<div class="kr-sterne">' + '⭐'.repeat(sterne) + '☆'.repeat(5 - sterne) + '</div></div>';
}

/* ---------- Spickzettel ---------- */
function krHilfenHTML() {
    return '<div class="hilfe-bereich" style="--hilfe-farbe: ' + rnFarbe() + ';">' +
           '<button class="hilfe-btn" onclick="krSpickzettelOeffnen()">📋 Spickzettel</button></div>';
}

/* Der Spickzettel zeigt alle Aufgaben der Rechenart, nach Reihen
   geordnet. Bei "Gemischt" ist es die Rechenart der aktuellen Aufgabe -
   alle vier zusammen wären zu viel zum Nachschauen. */
function krSpickzettelOeffnen() {
    if (!rnTask || answerLocked) return;
    rnTask.spick = true;   // zählt als "mit Spickzettel"

    const modus = rnTask.modus;
    const reihen = {};
    krAlleAufgaben(modus).forEach(t => {
        (reihen[t.reihe] = reihen[t.reihe] || []).push(t);
    });
    const html = Object.keys(reihen).map(Number).sort((x, y) => x - y).map(r =>
        '<div class="kr-spick-reihe"><div class="kr-spick-label">' + KR_MODI[modus].reihe(r) + '</div>' +
        '<div class="kr-spick-zellen">' + reihen[r].map(t =>
            '<span class="kr-spick-zelle">' + t.a + ' ' + t.op + ' ' + t.b + ' = <strong>' +
            (t.op === '+' ? t.a + t.b : t.a - t.b) + '</strong></span>').join('') +
        '</div></div>').join('');

    document.getElementById('spickTitel').innerText = 'Spickzettel: ' + KR_MODI[modus].name + ' 📋';
    document.getElementById('spickInhalt').innerHTML = html;
    const overlay = document.getElementById('spickzettel');
    overlay.style.setProperty('--spick-farbe', rnFarbe());
    overlay.hidden = false;
}

function krSpickzettelSchliessen() {
    const overlay = document.getElementById('spickzettel');
    if (overlay) overlay.hidden = true;
}

/* Escape schließt den Spickzettel */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') krSpickzettelSchliessen();
});

/* ============================================
   9f. Arbeitsblatt (Rechnen bis 100)
   Ein Blatt zum Ausdrucken: 20 Aufgaben einer Aufgabenart oder
   gemischt aus der ganzen Stufe, auf Seite 2 die Lösungen. Die
   Aufgaben entstehen mit denselben Regeln wie in der Übung, jedes Mal
   neu. Schwarz-weiß und ohne Bilder, damit es auf jedem Drucker gut
   aussieht.
   ============================================ */
const AB_ANZAHL = 20;

/* Der Knopf über den Unterstationen - nur bei Stationen mit Arbeitsblatt */
function abEinstiegHTML(index) {
    if (!STATIONS[index].arbeitsblatt) return '';
    return '<button class="check-btn ' + STATIONS[index].color + '-color" onclick="abAuswahlToggle(' + index + ')">' +
           '🖨️ Arbeitsblatt drucken</button>';
}

/* Vor dem Drucken: welche Aufgabenart soll aufs Blatt? */
function abAuswahlToggle(index) {
    const box = document.getElementById('abAuswahl');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const station = STATIONS[index];
    const knopf = (sub, text) =>
        '<button class="hilfe-btn" onclick="abDrucken(' + index + ', ' + sub + ')">' + text + '</button>';
    box.innerHTML = '<div class="ab-auswahl" style="--hilfe-farbe: var(--color-' + station.color + ');">' +
        '<p>Welche Aufgaben sollen auf das Blatt?</p><div class="hilfe-tasten">' +
        station.subStations.map((sub, i) => knopf(i, sub.name)).join('') +
        knopf(-1, '🔀 Gemischt') + '</div></div>';
}

/* 20 verschiedene Aufgaben. Gemischt wechseln sich die Aufgabenarten
   reihum ab, damit jede gleich oft vorkommt. Doppelt gibt es keine -
   auch nicht als Tauschaufgabe. */
function abAufgaben(index, sub) {
    const station = STATIONS[index];
    const typen = sub === -1 ? station.subStations.map(s => s.typ) : [station.subStations[sub].typ];
    const reihum = shuffle(typen);
    const schon = new Set();
    const liste = [];
    let guard = 0;
    while (liste.length < AB_ANZAHL && guard++ < 5000) {
        const key = reihum[liste.length % reihum.length];
        const t = RN_TYPEN[key].neu();
        if (schon.has(rnSchluessel(t))) continue;
        schon.add(rnSchluessel(t));
        t.erg = t.op === '+' ? t.a + t.b : t.a - t.b;
        t.luecke = t.luecke || 'erg';
        liste.push(t);
    }
    return liste;
}

/* Eine Aufgabe als Zeile. mitLoesung: die Lücke ist ausgefüllt. */
function abZeileHTML(t, nr, mitLoesung) {
    const luecke = wert => mitLoesung ? '<b>' + wert + '</b>' : '<span class="linie"></span>';
    const b = t.luecke === 'b' ? luecke(t.b) : t.b;
    const erg = t.luecke === 'erg' ? luecke(t.erg) : t.erg;
    return '<div class="aufgabe"><span class="nr">' + nr + ')</span> ' +
           t.a + ' ' + t.op + ' ' + b + ' = ' + erg + '</div>';
}

function abDokumentHTML(titel, untertitel, aufgaben) {
    const spalten = mitLoesung => '<div class="raster">' +
        aufgaben.map((t, i) => abZeileHTML(t, i + 1, mitLoesung)).join('') + '</div>';
    return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Arbeitsblatt ' + titel + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">' +
        '<style>' +
        '@page { size: A4; margin: 16mm 18mm; }' +
        'body { font-family: Outfit, Arial, sans-serif; color: #000; margin: 0; }' +
        '.kopf { font-size: 11pt; color: #444; }' +
        'h1 { font-size: 20pt; margin: 4px 0 2px; }' +
        'h2 { font-size: 14pt; font-weight: 600; margin: 0 0 14px; }' +
        '.name { display: flex; gap: 30px; font-size: 12pt; margin-bottom: 22px; }' +
        '.name span { flex: 1; border-bottom: 1px solid #000; padding-bottom: 2px; }' +
        '.name span.datum { flex: 0 0 35%; }' +
        '.raster { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; ' +
        'grid-template-rows: repeat(' + Math.ceil(aufgaben.length / 2) + ', auto); column-gap: 40px; }' +
        '.aufgabe { font-size: 18pt; padding: 9px 0; border-bottom: 1px dotted #bbb; white-space: nowrap; }' +
        '.nr { display: inline-block; width: 1.6em; font-size: 12pt; color: #666; }' +
        '.linie { display: inline-block; width: 2.4em; border-bottom: 1.5px solid #000; height: 0.9em; }' +
        '.loesungen { page-break-before: always; break-before: page; }' +
        '.loesungen .aufgabe { font-size: 14pt; padding: 5px 0; }' +
        '</style></head><body>' +
        '<div class="kopf">Mathe Klasse 2 – Rechnen bis 100</div>' +
        '<h1>' + titel + '</h1><h2>' + untertitel + '</h2>' +
        '<div class="name"><span>Name:</span><span class="datum">Datum:</span></div>' +
        spalten(false) +
        '<div class="loesungen"><div class="kopf">Mathe Klasse 2 – Rechnen bis 100</div>' +
        '<h1>Lösungen</h1><h2>' + titel + ' – ' + untertitel + '</h2>' + spalten(true) + '</div>' +
        '</body></html>';
}

/* Gedruckt wird aus einem unsichtbaren Rahmen statt aus einem neuen
   Fenster - das blockiert kein Popup-Blocker. Die Schrift darf erst
   fertig geladen sein, sonst druckt der Browser mit Ersatzschrift. */
function abDrucken(index, sub) {
    const station = STATIONS[index];
    const untertitel = sub === -1 ? 'Gemischt' : station.subStations[sub].name;
    const html = abDokumentHTML(stationTitel(index), untertitel, abAufgaben(index, sub));

    const alt = document.getElementById('abRahmen');
    if (alt) alt.remove();
    const rahmen = document.createElement('iframe');
    rahmen.id = 'abRahmen';
    rahmen.className = 'ab-rahmen';
    rahmen.setAttribute('aria-hidden', 'true');
    document.body.appendChild(rahmen);

    const doc = rahmen.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    let gedruckt = false;
    const drucken = () => {
        if (gedruckt) return;
        gedruckt = true;
        rahmen.contentWindow.focus();
        rahmen.contentWindow.print();
    };
    // Ohne Netz kommt die Schrift nie - dann nach kurzer Zeit trotzdem
    setTimeout(drucken, 1500);
    try {
        rahmen.contentWindow.document.fonts.ready.then(() => setTimeout(drucken, 100));
    } catch (e) { /* dann eben nach der Wartezeit */ }
}

/* ============================================
   10. Stationen-Registrierung
   Neue Station = hier einen Eintrag ergänzen.

   title ist die Überschrift ohne Nummer - die Nummer ergibt sich aus
   der Reihenfolge in dieser Liste (siehe stationTitel). Beim Umsortieren
   muss deshalb nichts von Hand nachgezogen werden.
   ============================================ */
const STATIONS = [
    {
        name: 'Zehnerzahlen finden',
        title: 'Zehnerzahlen finden',
        emoji: '📊',
        color: 'modul1',
        newTask: station1NewTask
    },
    {
        name: 'Zehnerzahlen ordnen',
        title: 'Zehnerzahlen ordnen',
        emoji: '⚖️',
        color: 'modul2',
        subStations: [
            { name: 'Größer/Kleiner', emoji: '⚖️',
              hinweis: 'Setze &lt; oder &gt; passend ein.',
              newTask: station2Vergleich },
            { name: 'Kleinste zuerst', emoji: '⬆️',
              hinweis: 'Der Größe nach ordnen – aufsteigend.',
              newTask: station2OrdnenKleinste },
            { name: 'Größte zuerst', emoji: '⬇️',
              hinweis: 'Der Größe nach ordnen – absteigend.',
              newTask: station2OrdnenGroesste },
            { name: 'Zahl einsetzen', emoji: '🔍',
              hinweis: 'Finde eine Zahl, die passt.',
              newTask: station2ZahlEinsetzen }
        ]
    },
    {
        name: 'Rechnen 1 (Plus)',
        title: 'Mit Zehnerzahlen rechnen 1',
        emoji: '➕',
        color: 'modul3',
        newTask: station3NewTask
    },
    {
        name: 'Rechnen 2 (Minus)',
        title: 'Mit Zehnerzahlen rechnen 2',
        emoji: '➖',
        color: 'modul4',
        newTask: station4NewTask
    },
    {
        name: 'Zahlen hören',
        title: 'Zahlen hören',
        emoji: '🔊',
        color: 'modul5',
        subStations: [
            { name: 'Bis 100', emoji: '🔢',
              hinweis: 'Jede Zahl bis 100 hören und eintippen.',
              newTask: station5Bis100 },
            { name: 'Bild finden', emoji: '🧱',
              hinweis: 'Zur gehörten Zahl das passende Bild antippen.',
              newTask: station5Bild }
        ]
    },
    {
        name: 'Zahlwörter bauen',
        title: 'Zahlwörter bauen',
        emoji: '🔤',
        color: 'modul6',
        newTask: station6NewTask
    },
    {
        name: 'Paare finden',
        title: 'Paare finden',
        emoji: '🃏',
        color: 'modul7',
        newTask: station7NewTask
    },
    {
        name: 'Zahlen zerlegen',
        title: 'Zahlen zerlegen',
        emoji: '🧩',
        color: 'modul10',
        newTask: station8NewTask
    },
    {
        name: 'Hunderterfeld',
        title: 'Hunderterfeld',
        emoji: '💯',
        color: 'modul11',
        subStations: [
            { name: 'Welche Zahl?', emoji: '👀',
              hinweis: 'Die Zahl im Punktefeld ablesen.',
              newTask: station11Ablesen },
            { name: 'Zahl legen', emoji: '🧱',
              hinweis: 'Eine Zahl selbst aus Zehnern und Einern aufbauen.',
              newTask: station11Legen }
        ]
    },
    {
        name: 'Hundertertafel',
        title: 'Hundertertafel',
        emoji: '🗺️',
        color: 'modul12',
        subStations: [
            { name: 'Lücken füllen', emoji: '🔢',
              hinweis: 'Fehlende Zahlen in der Tafel ergänzen.',
              newTask: station12Luecken },
            { name: 'Zahlen färben 1', emoji: '🎨',
              hinweis: 'Drei Zeilen und drei Spalten färben.',
              newTask: station12Faerben1 },
            { name: 'Zahlenkönig', emoji: '👑',
              hinweis: 'Auf welcher Zahl sitzt das Bild?',
              newTask: station12Koenig },
            { name: 'Wo wohnt die Zahl?', emoji: '🏠',
              hinweis: 'Das Feld in der leeren Tafel finden.',
              newTask: station12Wohnort },
            { name: 'Zahlen färben 2', emoji: '🖍️',
              hinweis: 'Aus den gefärbten Feldern wird ein Bild.',
              newTask: station12Faerben2 },
            { name: 'Zeile und Spalte', emoji: '📐',
              hinweis: 'Erst die Zahl markieren, dann Zeile oder Spalte nennen.',
              newTask: station12ZeileSpalte },
            { name: 'Zahlendreher', emoji: '🔄',
              hinweis: 'Steht dort die 47 oder die 74?',
              newTask: station12Dreher }
        ]
    },
    {
        name: 'Ausschnitte und Wege',
        title: 'Ausschnitte und Wege',
        emoji: '🧩',
        color: 'modul13',
        subStations: [
            { name: 'Ausschnitte', emoji: '🧩',
              hinweis: 'Ein ausgeschnittenes Stück der Tafel vervollständigen.',
              newTask: station13Ausschnitt },
            { name: 'Nur eine Zahl', emoji: '🔍',
              hinweis: 'Schwerer: auf dem Stück steht nur noch eine Zahl.',
              newTask: station13NurEine },
            { name: 'Nachbarzahlen', emoji: '↔️',
              hinweis: 'Die Nachbarn über, unter, links und rechts.',
              newTask: station13Nachbarn },
            { name: 'Pfeilwege', emoji: '➡️',
              hinweis: 'Den Pfeilen durch die Tafel folgen.',
              newTask: station13Wege }
        ]
    },
    {
        name: 'Zahlenstrahl ablesen',
        title: 'Zahlenstrahl: Zahl ablesen',
        emoji: '👀',
        color: 'modul14',
        newTask: stationZsAblesen
    },
    {
        name: 'Zahlenstrahl einordnen',
        title: 'Zahlenstrahl: Zahl einordnen',
        emoji: '🎯',
        color: 'modul16',
        newTask: stationZsEinordnen
    },
    {
        name: 'Zahlen vergleichen',
        title: 'Zahlen vergleichen',
        emoji: '⚖️',
        color: 'modul9',
        newTask: station9NewTask
    },
    {
        name: 'Wäscheleine',
        title: 'Wäscheleine',
        emoji: '🧺',
        color: 'modul8',
        subStations: [
            { name: 'Kleinste zuerst', emoji: '⬆️',
              hinweis: 'Die Zahlen aufsteigend aufhängen.',
              newTask: station10Aufsteigend },
            { name: 'Größte zuerst', emoji: '⬇️',
              hinweis: 'Die Zahlen absteigend aufhängen.',
              newTask: station10Absteigend }
        ]
    },
    {
        name: 'Nachbarzahlen',
        title: 'Nachbarzahlen',
        emoji: '↔️',
        color: 'modul15',
        newTask: stationVorgaengerNachfolger
    },
    {
        name: 'Nachbarzehner',
        title: 'Nachbarzehner',
        emoji: '🔟',
        color: 'modul17',
        newTask: stationNachbarzehner
    },

    /* ---- Rechnen bis 100: die Stufen bauen aufeinander auf ----
       stufe ersetzt in Überschrift und Knöpfen die Stationsnummer.
       erklaerung: die Erkläraufgabe, je Aufgabenart eine Variante.
       arbeitsblatt: es gibt ein Blatt zum Ausdrucken.
       typ: die Aufgabenart aus RN_TYPEN. */
    {
        name: 'Zehner und Einer',
        title: 'Zehner und Einer',
        stufe: 1,
        gesperrt: true,
        sperrHinweis: 'Das hatten wir schon. Jetzt üben wir etwas anderes.',
        emoji: '🧱',
        color: 'modul18',
        erklaerung: ERK_STUFE1,
        subStations: [
            { name: 'Einer dazu', emoji: '➕',
              hinweis: 'Zum Beispiel: 40 + 6',
              typ: 'zzPlusE',
              newTask: () => rnAufgabe('zzPlusE') },
            { name: 'Einer weg', emoji: '➖',
              hinweis: 'Zum Beispiel: 46 − 6',
              typ: 'zeMinusEZ',
              newTask: () => rnAufgabe('zeMinusEZ') }
        ]
    },
    {
        name: 'Zehnerzahlen',
        title: 'Zehnerzahlen',
        stufe: 2,
        emoji: '🔟',
        color: 'modul19',
        erklaerung: ERK_STUFE2,
        subStations: [
            { name: 'Plus', emoji: '➕',
              hinweis: 'Zum Beispiel: 30 + 40',
              typ: 'zzPlusZz',
              newTask: () => rnAufgabe('zzPlusZz') },
            { name: 'Minus', emoji: '➖',
              hinweis: 'Zum Beispiel: 70 − 20',
              typ: 'zzMinusZz',
              newTask: () => rnAufgabe('zzMinusZz') }
        ]
    },
    {
        name: 'Zehner dazu und weg',
        title: 'Zehner dazu und weg',
        stufe: 3,
        emoji: '🪜',
        color: 'modul20',
        erklaerung: ERK_STUFE3,
        arbeitsblatt: true,
        subStations: [
            { name: 'Zehner dazu', emoji: '➕',
              hinweis: 'Zum Beispiel: 45 + 30 oder 40 + 26',
              typ: 'zehnerDazu',
              newTask: () => rnAufgabe('zehnerDazu') },
            { name: 'Zehner weg', emoji: '➖',
              hinweis: 'Zum Beispiel: 65 − 20',
              typ: 'zeMinusZz',
              newTask: () => rnAufgabe('zeMinusZz') }
        ]
    },
    {
        name: 'Einer ohne Übergang',
        title: 'Einer ohne Zehnerübergang',
        stufe: 4,
        emoji: '🧮',
        color: 'modul21',
        erklaerung: ERK_STUFE4,
        arbeitsblatt: true,
        subStations: [
            { name: 'Einer dazu', emoji: '➕',
              hinweis: 'Zum Beispiel: 34 + 5',
              typ: 'zePlusE',
              newTask: () => rnAufgabe('zePlusE') },
            { name: 'Einer weg', emoji: '➖',
              hinweis: 'Zum Beispiel: 38 − 5',
              typ: 'zeMinusE',
              newTask: () => rnAufgabe('zeMinusE') }
        ]
    },
    {
        name: 'Bis zum Zehner',
        title: 'Bis zum Zehner / vom Zehner weg',
        stufe: 5,
        emoji: '🎯',
        color: 'modul22',
        erklaerung: ERK_STUFE5,
        arbeitsblatt: true,
        subStations: [
            { name: 'Bis zum Zehner', emoji: '🎯',
              hinweis: 'Zum Beispiel: 37 + 3',
              typ: 'zeBisZehner',
              newTask: () => rnAufgabe('zeBisZehner') },
            { name: 'Ergänzen', emoji: '🔍',
              hinweis: 'Zum Beispiel: 37 + _ = 40',
              typ: 'ergaenzen',
              newTask: () => rnAufgabe('ergaenzen') },
            { name: 'Vom Zehner weg', emoji: '➖',
              hinweis: 'Zum Beispiel: 40 − 6',
              typ: 'zzMinusE',
              newTask: () => rnAufgabe('zzMinusE') }
        ]
    },
    {
        name: 'Über den Zehner',
        title: 'Einer mit Zehnerübergang',
        stufe: 6,
        gesperrt: true,
        emoji: '🌉',
        color: 'modul23',
        erklaerung: ERK_STUFE6,
        subStations: [
            { name: 'Plus über den Zehner', emoji: '➕',
              hinweis: 'Zum Beispiel: 37 + 5',
              typ: 'zePlusEUeber',
              newTask: () => rnAufgabe('zePlusEUeber') },
            { name: 'Minus über den Zehner', emoji: '➖',
              hinweis: 'Zum Beispiel: 42 − 5',
              typ: 'zeMinusEUeber',
              newTask: () => rnAufgabe('zeMinusEUeber') }
        ]
    },

    /* ---- Wiederholung Klasse 1 ----
       zeit: die Runde dauert 3 statt 2 Minuten. weiterNach: nach einer
       richtigen Antwort geht es schneller weiter. auswertung: am Ende
       stehen Trefferquote und Spickzettel-Zählung. */
    {
        name: 'Kopfrechnen',
        title: 'Kopfrechnen',
        ohneNummer: true,
        emoji: '🧠',
        color: 'modul24',
        zeit: 180,
        weiterNach: 900,
        auswertung: true,
        subStations: [
            { name: '1+1', emoji: '➕',
              hinweis: 'ohne Zehnerübergang',
              typ: 'krPlus',
              newTask: () => rnAufgabe('krPlus') },
            { name: '1−1', emoji: '➖',
              hinweis: 'ohne Zehnerübergang',
              typ: 'krMinus',
              newTask: () => rnAufgabe('krMinus') },
            { name: '1+1 mit Zehnerübergang', emoji: '➕',
              hinweis: 'über die 10 hinaus',
              typ: 'krPlusZue',
              newTask: () => rnAufgabe('krPlusZue') },
            { name: '1−1 mit Zehnerübergang', emoji: '➖',
              hinweis: 'unter die 10 zurück',
              typ: 'krMinusZue',
              newTask: () => rnAufgabe('krMinusZue') },
            { name: 'Gemischt', emoji: '🔀',
              hinweis: 'alle vier durcheinander',
              typ: 'krGemischt',
              newTask: () => rnAufgabe('krGemischt') }
        ]
    }
];

/* ============================================
   11. Bereiche
   Die Stationen sind in Themenbereiche gegliedert.
   Neuer Bereich = hier einen Eintrag ergänzen.

   gesperrt: true heißt, der Bereich steht schon im Menü, lässt sich
   aber noch nicht öffnen - das Thema war im Unterricht noch nicht
   dran. Freischalten = diese Zeile entfernen. Dasselbe geht auch für
   eine Gruppe im MENUE (sperrt alles darin) und für eine einzelne
   Station in STATIONS.
   ============================================ */
const BEREICHE = [
    {
        name: 'Zehnerzahlen',
        emoji: '🔟',
        color: 'modul1',
        hinweis: '10, 20, 30 … – finden, ordnen und rechnen.',
        stationen: [0, 1, 2, 3]
    },
    {
        name: 'Zehner und Einer',
        emoji: '🔢',
        color: 'modul5',
        hinweis: 'Alle Zahlen bis 100 – hören, bauen, zerlegen und Paare finden.',
        stationen: [4, 5, 6, 7]
    },
    {
        name: 'Hunderterfeld',
        emoji: '💯',
        color: 'modul11',
        hinweis: 'Zahlen im Punktefeld ablesen und sich in der Hundertertafel zurechtfinden.',
        stationen: [8, 9, 10]
    },
    {
        name: 'Zahlenstrahl',
        emoji: '📏',
        color: 'modul9',
        hinweis: 'Zahlen auf dem Zahlenstrahl ablesen, einordnen und der Größe nach vergleichen.',
        stationen: [11, 12, 13, 14, 15, 16]
    },
    {
        name: 'Rechnen bis 100',
        emoji: '🧮',
        color: 'modul21',
        hinweis: 'Plus und Minus in sechs Stufen – von 40 + 6 bis 37 + 5.',
        stationen: [17, 18, 19, 20, 21, 22]
    },
    {
        name: 'Wiederholung Klasse 1',
        emoji: '🧠',
        color: 'modul24',
        hinweis: 'Kopfrechnen im Zahlenraum bis 20 – das kleine Einspluseins.',
        stationen: [23]
    }
];

/* ============================================
   12. Das Menü auf dem Startbildschirm
   Ein Eintrag ist ein Bereich ({ bereich: Index in BEREICHE }) oder
   eine Gruppe mit eigenem Namen und inhalt - darin wieder Bereiche
   oder Gruppen. Ein Bereich zeigt auf seiner Kachel Name, Bild und
   Hinweis aus BEREICHE.
   ============================================ */
const MENUE = [
    { bereich: 5 },
    {
        name: 'Zahlenraum bis 100',
        gesperrt: true,
        sperrHinweis: 'Das hatten wir schon. Jetzt üben wir etwas anderes.',
        emoji: '🗺️',
        color: 'modul7',
        hinweis: 'Zahlen bis 100 kennenlernen – Stellenwerte, Hunderterfeld und Zahlenstrahl.',
        inhalt: [
            {
                name: 'Stellenwerte',
                emoji: '🔢',
                color: 'modul2',
                hinweis: 'Zehnerzahlen, Zehner und Einer – finden, hören, bauen und zerlegen.',
                inhalt: [{ bereich: 0 }, { bereich: 1 }]
            },
            { bereich: 2 },
            { bereich: 3 }
        ]
    },
    { bereich: 4 }
];

document.addEventListener('DOMContentLoaded', buildStationUI);
