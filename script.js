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
let timeLeft = STATION_ZEIT;
let stationTimerInterval = null;
let autoAdvanceTimeout = null;
let konfettiTimeout = null;
let earnedStars = [];
let answerLocked = false;

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
    titel.innerText = station.title;
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
        sub ? station.title + ' – ' + sub.name : station.title;
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
        grid.innerHTML +=
            '<button class="operation-btn ' + bereich.color + '" onclick="showBereich(' + i + ')">' +
            '<span class="emoji">' + bereich.emoji + '</span>' +
            '<span class="text">' + bereich.name + '</span>' +
            '<span class="hinweis">' + bereich.hinweis + '</span>' +
            '</button>';
    });

    // Ein Stern pro Station – der Gesamtfortschritt der App
    STATIONS.forEach((station, i) => {
        stars.innerHTML += '<span id="stationStar' + i + '">☆</span>';
        resultStars.innerHTML += '<span style="color: gold; text-shadow: 0 0 15px rgba(255,215,0,0.8);">⭐</span>';
    });

    earnedStars = STATIONS.map(() => false);
}

/* Zu welchem Bereich gehört eine Station? */
function bereichVon(stationIndex) {
    return BEREICHE.findIndex(b => b.stationen.indexOf(stationIndex) !== -1);
}

/* Die Stationen eines Bereichs zur Auswahl anbieten */
function showBereich(bereichIndex) {
    aktiverBereich = bereichIndex;
    const bereich = BEREICHE[bereichIndex];

    const titel = document.getElementById('bereichTitle');
    titel.innerText = bereich.name;
    titel.className = 'exercise-title ' + bereich.color + '-color';

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
    answerLocked = false;

    const station = STATIONS[currentStationIndex];
    const sub = station.subStations ? station.subStations[currentSubIndex] : null;

    document.getElementById('stationTitle').innerText =
        sub ? station.title + ' – ' + sub.name : station.title;
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

/* Von den Stationen aufgerufen, sobald das Kind geantwortet hat */
function submitAnswer(isCorrect, hinweis) {
    if (answerLocked) return;
    answerLocked = true;

    const feedback = document.getElementById('stationFeedback');
    const text = feedback.querySelector('.feedback-text');

    if (isCorrect) {
        stationScore++;
        document.getElementById('stationScore').innerText = stationScore;
        feedback.className = 'feedback-area correct';
        text.innerText = pick(['Super! 🎉', 'Richtig! 👍', 'Genau! ⭐', 'Klasse! 🌟']);
        feedback.style.visibility = 'visible';
        // etwas Zeit, um die vollständige Lösung noch zu lesen
        autoAdvanceTimeout = setTimeout(newStationTask, 1800);
    } else {
        feedback.className = 'feedback-area wrong';
        text.innerText = hinweis ? 'Nicht ganz. ' + hinweis : 'Nicht ganz – schau nochmal genau hin.';
        feedback.style.visibility = 'visible';
        document.getElementById('stationNextBtn').style.visibility = 'visible';
    }
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

    document.getElementById('stationProceedBtn').innerText =
        earnedStars.every(Boolean) ? 'Zur Auswertung' : 'Zur nächsten Station';
}

function proceedToNextStation() {
    const bigStar = document.getElementById('stationNewStarIcon');
    if (bigStar) bigStar.style.transform = 'scale(0)';

    if (earnedStars.every(Boolean)) {
        showScreen('resultScreen');
        startKonfetti(150);   // alle Stationen geschafft
        return;
    }

    let next = (currentStationIndex + 1) % STATIONS.length;
    while (earnedStars[next]) next = (next + 1) % STATIONS.length;
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
            markOptionButtons(btn, istRichtig, values);
            if (onAnswer) onAnswer(value, ok);
            submitAnswer(ok, hinweis);
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
        onCheck();
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

    renderCheckButton('Fertig', () => {
        const ok = (s1BuildCount * 10 === zahl);
        submitAnswer(ok, zahl + ' sind ' + anzahl + ' Zehnerstangen.');
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
        submitAnswer(false, 'Die richtige Reihenfolge wäre: ' + s2OrderTarget.join(' – '));
        return;
    }

    s2OrderPicked.push(zahl);
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
function station5Aktiv() {
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
        ersatz.innerHTML = silbenHTML(zahlwortDE(s5Zahl));
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
        if (zahl !== s5Zahl || !station5Aktiv()) return;
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
    return '<div class="hoer-ersatz">' + silbenHTML(zahlwortDE(s5Zahl)) + '</div>' +
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
            if (answerLocked || s5Eingabe !== getippt || !station5Aktiv()) return;
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
    fillLuecke('s5Anzeige', s5Zahl, ok);
    if (ok) leuchteGruen('s5Anzeige');

    const feld = document.getElementById('s5Tastenfeld');
    if (feld) Array.from(feld.children).forEach(b => b.disabled = true);

    submitAnswer(ok, 'Das war die ' + s5Zahl + ' (' + zahlwortDE(s5Zahl) + ').');
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
    if (!station5Aktiv()) return;

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

    submitAnswer(ok, s6Zahl + ' heißt ' + zahlwortDE(s6Zahl) +
                     ' – im Deutschen zuerst die Einer, dann die Zehner.');
}

/* ============================================
   9d. Station 7: Paare finden
   Zahlenkarten (blauer Punkt) und Strichbild-Karten
   (oranger Punkt) liegen gemischt auf dem Tisch.
   Das Kind tippt eine Zahl und das passende Bild an.
   Strichbild: ein Strich = ein Zehner, ein Punkt = ein Einer.
   ============================================ */
const S7_PAARE = 4;    // Paare pro Runde

let s7Karten = [];     // { id, typ: 'zahl' | 'bild', zahl, gepaart }
let s7Auswahl = null;  // id der zuerst angetippten Karte
let s7Offen = 0;       // noch zu findende Paare

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

function station7NewTask() {
    const zahlen = [];
    while (zahlen.length < S7_PAARE) {
        const zahl = randomInt(11, 99);
        if (zahlen.indexOf(zahl) === -1) zahlen.push(zahl);
    }

    s7Karten = [];
    zahlen.forEach((zahl, i) => {
        s7Karten.push({ id: 'z' + i, typ: 'zahl', zahl: zahl, gepaart: false });
        s7Karten.push({ id: 'b' + i, typ: 'bild', zahl: zahl, gepaart: false });
    });
    s7Karten = shuffle(s7Karten);
    s7Auswahl = null;
    s7Offen = S7_PAARE;

    setInstruction('Finde die Paare: Welches Bild gehört zu welcher Zahl?');

    const farbe = 'var(--color-' + STATIONS[currentStationIndex].color + ')';
    let html = '<div class="paar-feld" style="--paar-farbe: ' + farbe + ';">';
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
}

function station7Tippe(id) {
    if (answerLocked) return;

    const karte = s7Karten.find(k => k.id === id);
    if (!karte || karte.gepaart) return;

    // Nochmal auf dieselbe Karte tippen = Auswahl wieder aufheben
    if (s7Auswahl === id) {
        s7Auswahl = null;
        station7Markieren();
        return;
    }

    const erste = s7Auswahl ? s7Karten.find(k => k.id === s7Auswahl) : null;

    // Noch nichts gewählt oder nochmal dieselbe Sorte: die Auswahl wandert
    // einfach mit – zwei Zahlen oder zwei Bilder sind kein Fehlversuch.
    if (!erste || erste.typ === karte.typ) {
        s7Auswahl = id;
        station7Markieren();
        return;
    }

    if (erste.zahl === karte.zahl) station7Treffer(erste, karte);
    else station7Fehler(erste, karte);
}

function station7Treffer(a, b) {
    a.gepaart = true;
    b.gepaart = true;
    s7Auswahl = null;
    s7Offen--;
    station7Markieren();

    if (s7Offen === 0) {
        // letztes Paar: die Runde ist geschafft
        submitAnswer(true);
    } else {
        // Zwischenpaare zählen sofort einen Punkt
        stationScore++;
        document.getElementById('stationScore').innerText = stationScore;
    }
}

function station7Fehler(a, b) {
    const bild = (a.typ === 'bild') ? a : b;
    const z = Math.floor(bild.zahl / 10);
    const e = bild.zahl % 10;

    [a, b].forEach(k => {
        const el = document.getElementById('s7' + k.id);
        if (el) el.classList.add('paar-falsch');
    });

    // Zu den offenen Bildern die Zahl einblenden – die Lösung steht danach da
    s7Karten.forEach(k => {
        if (k.typ !== 'bild' || k.gepaart) return;
        const el = document.getElementById('s7L' + k.id);
        if (el) el.textContent = k.zahl;
    });

    s7Auswahl = null;
    submitAnswer(false, 'Das Bild zeigt ' + z + ' Zehner und ' + e + ' Einer, also ' + bild.zahl + '.');
}

/* Auswahl und gefundene Paare auf den Karten anzeigen */
function station7Markieren() {
    s7Karten.forEach(karte => {
        const el = document.getElementById('s7' + karte.id);
        if (!el) return;
        el.classList.toggle('gewaehlt', s7Auswahl === karte.id);
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
        // Die vollständige Zerlegung steht danach einmal komplett da
        for (let i = s8Schritt; i < 3; i++) fillLuecke('s8L' + i, s8Ziele[i], false);
        station8Markieren();
        submitAnswer(false, s8Zahl + ' = ' + s8Ziele[1] + ' + ' + s8Ziele[2] +
                            '. Die blaue Karte sind die Zehner, die rote die Einer.');
        return;
    }

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
        submitAnswer(false, 'Die richtige Reihenfolge wäre: ' + s10Ziel.join(' – '));
        return;
    }

    s10Gehaengt.push(zahl);
    station10Zeichnen();

    if (s10Gehaengt.length === S10_PLAETZE) submitAnswer(true);
}

/* ============================================
   10. Stationen-Registrierung
   Neue Station = hier einen Eintrag ergänzen.
   ============================================ */
const STATIONS = [
    {
        name: 'Zehnerzahlen finden',
        title: 'Station 1: Zehnerzahlen finden',
        emoji: '📊',
        color: 'modul1',
        newTask: station1NewTask
    },
    {
        name: 'Zehnerzahlen ordnen',
        title: 'Station 2: Zehnerzahlen ordnen',
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
        title: 'Station 3: Mit Zehnerzahlen rechnen 1',
        emoji: '➕',
        color: 'modul3',
        newTask: station3NewTask
    },
    {
        name: 'Rechnen 2 (Minus)',
        title: 'Station 4: Mit Zehnerzahlen rechnen 2',
        emoji: '➖',
        color: 'modul4',
        newTask: station4NewTask
    },
    {
        name: 'Zahlen hören',
        title: 'Station 5: Zahlen hören',
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
        title: 'Station 6: Zahlwörter bauen',
        emoji: '🔤',
        color: 'modul6',
        newTask: station6NewTask
    },
    {
        name: 'Paare finden',
        title: 'Station 7: Paare finden',
        emoji: '🃏',
        color: 'modul7',
        newTask: station7NewTask
    },
    {
        name: 'Zahlen zerlegen',
        title: 'Station 8: Zahlen zerlegen',
        emoji: '🧩',
        color: 'modul10',
        newTask: station8NewTask
    },
    {
        name: 'Zahlen vergleichen',
        title: 'Station 9: Zahlen vergleichen',
        emoji: '⚖️',
        color: 'modul9',
        newTask: station9NewTask
    },
    {
        name: 'Wäscheleine',
        title: 'Station 10: Wäscheleine',
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
   Die Stationen sind in zwei Themenbereiche gegliedert.
   Neuer Bereich = hier einen Eintrag ergänzen.
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
        hinweis: 'Alle Zahlen bis 100 – hören, bauen, zerlegen, vergleichen und ordnen.',
        stationen: [4, 5, 6, 7, 8, 9]
    }
];

document.addEventListener('DOMContentLoaded', buildStationUI);
