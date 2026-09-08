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
   Modus-Auswahl vor jedem Aufgabenmodul
   ============================================ */
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
    const grid = document.getElementById('stationButtonGrid');
    const tabs = document.getElementById('stationTabs');
    const stars = document.getElementById('stationStars');
    const resultStars = document.getElementById('resultStars');

    grid.innerHTML = '';
    tabs.innerHTML = '';
    stars.innerHTML = '';
    resultStars.innerHTML = '';

    STATIONS.forEach((station, i) => {
        grid.innerHTML +=
            '<button class="operation-btn ' + station.color + '" onclick="showModeScreen(' + i + ')">' +
            '<span class="emoji">' + station.emoji + '</span>' +
            '<span class="text">' + (i + 1) + '. ' + station.name + '</span>' +
            '</button>';

        tabs.innerHTML +=
            '<div class="tab" id="stationTab' + i + '" onclick="showModeScreen(' + i + ')" style="cursor: pointer;">' +
            (i + 1) + '. ' + station.name + '</div>';

        stars.innerHTML += '<span id="stationStar' + i + '">☆</span>';
        resultStars.innerHTML += '<span style="color: gold; text-shadow: 0 0 15px rgba(255,215,0,0.8);">⭐</span>';
    });

    earnedStars = STATIONS.map(() => false);
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
    showModeScreen(next);   // auch hier darf der Modus neu gewählt werden
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

function station1Zuordnen() {
    const anzahl = randomInt(1, 10);
    const zahl = anzahl * 10;
    const darstellung = pick(['zahlwort', 'zehner', 'stellentafel', 'stangen']);

    let html;
    if (darstellung === 'zahlwort') {
        html = '<div class="zuordnen-karte">' + ZAHLWORTE[zahl] + '</div>';
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
            { name: 'Größer/Kleiner', newTask: station2Vergleich },
            { name: 'Kleinste zuerst', newTask: station2OrdnenKleinste },
            { name: 'Größte zuerst', newTask: station2OrdnenGroesste },
            { name: 'Zahl einsetzen', newTask: station2ZahlEinsetzen }
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
    }
];

document.addEventListener('DOMContentLoaded', buildStationUI);
