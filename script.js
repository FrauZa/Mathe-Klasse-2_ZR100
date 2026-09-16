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

    BEREICHE.forEach((bereich, i) => {
        if (bereich.gesperrt) {
            // Zu sehen, aber noch nicht zu öffnen: das Thema war noch nicht dran
            grid.innerHTML +=
                '<button class="operation-btn ' + bereich.color + ' bereich-zu" disabled>' +
                '<span class="emoji">🔒</span>' +
                '<span class="text">' + bereich.name + '</span>' +
                '<span class="hinweis">Das hatten wir noch nicht – kommt später.</span>' +
                '</button>';
            return;
        }
        grid.innerHTML +=
            '<button class="operation-btn ' + bereich.color + '" onclick="showBereich(' + i + ')">' +
            '<span class="emoji">' + bereich.emoji + '</span>' +
            '<span class="text">' + bereich.name + '</span>' +
            '<span class="hinweis">' + bereich.hinweis + '</span>' +
            '</button>';
    });

    // Ein Stern pro offener Station – der Gesamtfortschritt der App
    offeneStationen().forEach(i => {
        stars.innerHTML += '<span id="stationStar' + i + '">☆</span>';
        resultStars.innerHTML += '<span style="color: gold; text-shadow: 0 0 15px rgba(255,215,0,0.8);">⭐</span>';
    });

    earnedStars = STATIONS.map(() => false);
}

/* Überschrift einer Station. Die Nummer steht nicht in der Liste,
   sondern ergibt sich aus der Reihenfolge - so stimmt sie auch, wenn
   Stationen in einen anderen Bereich umziehen. */
function stationTitel(index) {
    return 'Station ' + (index + 1) + ': ' + STATIONS[index].title;
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
    return !!(bereich && bereich.gesperrt);
}

function stationOffen(index) {
    return !bereichGesperrt(bereichVon(index));
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
        grid.innerHTML +=
            '<button class="operation-btn ' + station.color + '" onclick="openStation(' + index + ')">' +
            '<span class="emoji">' + station.emoji + '</span>' +
            '<span class="text">' + (index + 1) + '. ' + station.name + '</span>' +
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
    BEREICHE[bereichIndex].stationen.forEach(index => {
        tabs.innerHTML +=
            '<div class="tab" id="stationTab' + index + '" onclick="openStation(' + index + ')" ' +
            'style="cursor: pointer;">' + (index + 1) + '. ' + STATIONS[index].name + '</div>';
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

function startStation(index, subIndex, modus) {
    currentStationIndex = index;
    currentSubIndex = subIndex || 0;
    stationModus = modus || 'zeit';
    stationScore = 0;
    stationAufgabe = 0;
    timeLeft = STATION_ZEIT;
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
   zwangsläufig die richtige wäre. */
function submitAnswer(isCorrect, hinweis, sofortAufloesen) {
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
        // etwas Zeit, um die vollständige Lösung noch zu lesen
        autoAdvanceTimeout = setTimeout(newStationTask, 1800);
        return true;
    }

    versuche++;

    if (!sofortAufloesen && versuche < MAX_VERSUCHE) {
        // Der Hinweis verrät die Lösung - er kommt erst beim zweiten Fehler
        feedback.className = 'feedback-area nochmal';
        text.innerText = pick(['Noch nicht ganz – versuch es nochmal! 🔁',
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
    BEREICHE[bereich].stationen.forEach(index => {
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
    }
];

/* ============================================
   11. Bereiche
   Die Stationen sind in Themenbereiche gegliedert.
   Neuer Bereich = hier einen Eintrag ergänzen.

   gesperrt: true heißt, der Bereich steht schon im Menü, lässt sich
   aber noch nicht öffnen - das Thema war im Unterricht noch nicht
   dran. Freischalten = diese Zeile entfernen.
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
        hinweis: 'Zahlen vergleichen und der Größe nach an die Leine hängen.',
        stationen: [11, 12],
        gesperrt: true
    }
];

document.addEventListener('DOMContentLoaded', buildStationUI);
