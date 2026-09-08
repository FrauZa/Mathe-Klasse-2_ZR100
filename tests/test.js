/* Automatischer Durchklick-Test – wird nur von _test.html geladen.
   Klickt jede Station und Unterstation durch, prüft Punkte, Feedback,
   Timer, Modi, Konfetti und den Ergebnis-Bildschirm. */

const LOG = [];
let fehler = 0;

function check(name, ok, info) {
    if (!ok) fehler++;
    LOG.push((ok ? 'OK   ' : 'FAIL ') + name + (info ? '  [' + info + ']' : ''));
}

window.onerror = function (msg, url, line) {
    fehler++;
    LOG.push('FAIL JS-Fehler: ' + msg + ' (Zeile ' + line + ')');
};

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/* renderOptions abfangen, damit der Test die richtige Antwort kennt */
let optWerte = null;
let optPruef = null;
const echtesRenderOptions = window.renderOptions;
window.renderOptions = function (values, correct, labelFn, hinweis, onAnswer) {
    optWerte = values;
    optPruef = (typeof correct === 'function') ? correct : (v) => v === correct;
    return echtesRenderOptions(values, correct, labelFn, hinweis, onAnswer);
};

const $ = (id) => document.getElementById(id);
const sichtbar = (el) => el && el.style.visibility !== 'hidden' && el.style.display !== 'none';

/* --- Aufgabentyp erkennen und richtig beantworten --- */
async function antworteRichtig() {
    if ($('s1BauArea')) {
        const ziel = parseInt(document.querySelector('#stationInstruction strong').textContent, 10);
        station1SetBuild(ziel / 10);
        document.querySelector('#stationOptions .check-btn').click();
    } else if ($('s2Ziel')) {
        const offen = s2OrderTarget.slice(s2OrderPicked.length);
        offen.forEach(z => $('s2Karte' + z).click());
    } else {
        const btns = Array.from(document.querySelectorAll('#stationOptions .option-btn'));
        const i = optWerte.findIndex(v => optPruef(v));
        if (i < 0) { check('richtige Option vorhanden', false, JSON.stringify(optWerte)); return; }
        btns[i].click();
    }
    await wait(2400);
}

async function antworteFalsch() {
    if ($('s1BauArea')) {
        const ziel = parseInt(document.querySelector('#stationInstruction strong').textContent, 10);
        station1SetBuild(ziel / 10 === 1 ? 2 : 1);
        document.querySelector('#stationOptions .check-btn').click();
    } else if ($('s2Ziel')) {
        const offen = s2OrderTarget.slice(s2OrderPicked.length);
        const falsch = offen[offen.length - 1];
        if (offen.length < 2) return false;   // nur eine Karte offen: kein Fehler möglich
        $('s2Karte' + falsch).click();
    } else {
        const btns = Array.from(document.querySelectorAll('#stationOptions .option-btn'));
        const i = optWerte.findIndex(v => !optPruef(v));
        if (i < 0) return false;
        btns[i].click();
    }
    await wait(200);
    return true;
}

/* --- Ein Modul (Station oder Unterstation) komplett testen --- */
async function testeModul(stationIndex, subIndex, aufgaben) {
    const station = STATIONS[stationIndex];
    const sub = station.subStations ? station.subStations[subIndex] : null;
    const name = station.name + (sub ? ' / ' + sub.name : '');

    showModeScreen(stationIndex, subIndex);
    check(name + ': Modus-Bildschirm', $('modeScreen').classList.contains('active'));
    check(name + ': Modus-Titel gefüllt', $('modeTitle').innerText.length > 0, $('modeTitle').innerText);

    $('modeTempoBtn').click();
    check(name + ': Übungsbildschirm aktiv', $('stationScreen').classList.contains('active'));
    check(name + ': keine Uhr im eigenen Tempo', $('stationTimerDisplay').innerText.indexOf('Eigenes Tempo') >= 0,
        $('stationTimerDisplay').innerText);
    check(name + ': Fertig-Button sichtbar', $('stationFinishBtn').style.display === 'block');
    check(name + ': Unter-Tabs korrekt', ($('stationSubTabs').style.display === 'flex') === !!station.subStations);

    for (let t = 1; t <= aufgaben; t++) {
        check(name + ': Aufgabe ' + t + ' hat Anweisung', $('stationInstruction').innerHTML.length > 0);
        check(name + ': Aufgabe ' + t + ' hat Inhalt', $('stationTaskArea').innerHTML.length > 0);
        await antworteRichtig();
        check(name + ': Punkt ' + t + ' gezählt', stationScore === t, 'Punkte=' + stationScore);
    }

    // Falsche Antwort: Feedback rot, Weiter-Button erscheint
    const ging = await antworteFalsch();
    if (ging) {
        check(name + ': Feedback bei Fehler', $('stationFeedback').className.indexOf('wrong') >= 0);
        check(name + ': Weiter-Button erscheint', sichtbar($('stationNextBtn')));
        check(name + ': kein Punkt für Fehler', stationScore === aufgaben, 'Punkte=' + stationScore);
        $('stationNextBtn').click();
        await wait(100);
        check(name + ': neue Aufgabe nach Fehler', !sichtbar($('stationNextBtn')));
    }

    // Runde selbst beenden
    $('stationFinishBtn').click();
    await wait(300);
    check(name + ': Abschluss-Box sichtbar', $('stationComplete').style.display === 'block');
    check(name + ': Abschlusstext "Geschafft"', $('stationCompleteTitle').innerText.indexOf('Geschafft') >= 0,
        $('stationCompleteTitle').innerText);
    check(name + ': Konfetti fliegt', $('konfetti').children.length > 0, $('konfetti').children.length + ' Teile');
    check(name + ': Stern vergeben', $('stationStar' + stationIndex).innerText === '⭐');
}

/* --- Hilfe-Schalter in den Rechenstationen --- */
async function testeHilfeSchalter(stationIndex) {
    const name = STATIONS[stationIndex].name;
    showModeScreen(stationIndex, 0);
    $('modeTempoBtn').click();

    check(name + ': Hilfe-Schalter vorhanden', !!$('rechenHilfeBtn'));
    check(name + ': Hilfe startet zugeklappt', !$('rechenHilfe').classList.contains('sichtbar'));
    check(name + ': keine Stangen sichtbar vor Klick',
        $('stationTaskArea').querySelectorAll('.hilfe-inhalt.sichtbar .zehnerstange').length === 0);

    $('rechenHilfeBtn').click();
    check(name + ': Hilfe eingeblendet', $('rechenHilfe').classList.contains('sichtbar'));
    check(name + ': Zehnerstangen da', $('rechenHilfe').querySelectorAll('.zehnerstange').length > 0,
        $('rechenHilfe').querySelectorAll('.zehnerstange').length + ' Stangen');
    check(name + ': Fünferlücke gesetzt',
        $('rechenHilfe').querySelectorAll('.zehnerstange').length < 6 ||
        $('rechenHilfe').querySelectorAll('.zs-nach-luecke').length === 1);

    $('rechenHilfeBtn').click();
    check(name + ': Hilfe wieder aus', !$('rechenHilfe').classList.contains('sichtbar'));

    await antworteRichtig();
    check(name + ': Hilfe bei neuer Aufgabe wieder zu', !$('rechenHilfe').classList.contains('sichtbar'));
    check(name + ': nur Rechenaufgabe, kein festes Bild',
        $('stationTaskArea').querySelectorAll('.zs-reihe').length === 1);
}

/* --- Zeitmodus --- */
async function testeZeitmodus() {
    showModeScreen(0, 0);
    $('modeZeitBtn').click();
    check('Zeitmodus: Uhr startet bei 02:00', $('stationTimerDisplay').innerText === '02:00',
        $('stationTimerDisplay').innerText);
    check('Zeitmodus: kein Fertig-Button', $('stationFinishBtn').style.display === 'none');

    await wait(5000);
    check('Zeitmodus: Uhr läuft', $('stationTimerDisplay').innerText !== '02:00',
        $('stationTimerDisplay').innerText);

    await wait(120000);
    check('Zeitmodus: Runde endet automatisch', $('stationComplete').style.display === 'block');
    check('Zeitmodus: Text "Zeit abgelaufen"', $('stationCompleteTitle').innerText.indexOf('Zeit abgelaufen') >= 0,
        $('stationCompleteTitle').innerText);
    check('Zeitmodus: Konfetti', $('konfetti').children.length > 0);
}

/* --- Lösung wird eingeblendet --- */
async function testeLoesungAnzeige() {
    showModeScreen(1, 0);          // Station 2, Unterstation "Größer/Kleiner"
    $('modeTempoBtn').click();
    check('Vergleich: Lücke vorhanden', !!$('s2Zeichen') && $('s2Zeichen').textContent === '?');

    const btns = Array.from(document.querySelectorAll('#stationOptions .option-btn'));
    const falschIdx = optWerte.findIndex(v => !optPruef(v));
    btns[falschIdx].click();
    await wait(100);
    const gezeigt = $('s2Zeichen').textContent;
    check('Vergleich: richtiges Zeichen trotz Fehler eingeblendet',
        (gezeigt === '<' || gezeigt === '>') && optPruef(gezeigt), 'gezeigt: ' + gezeigt);
    check('Vergleich: als Lösung markiert', $('s2Zeichen').className.indexOf('karte-loesung') >= 0);
}

/* --- Gesamtlauf --- */
async function run() {
    check('Startbildschirm aktiv', $('startScreen').classList.contains('active'));
    check('Titel gesetzt', document.title === 'Mathe Klasse 2 - Zahlenraum bis 100', document.title);
    check('4 Stationen im Menü', $('stationButtonGrid').children.length === 4,
        $('stationButtonGrid').children.length + ' Buttons');
    check('4 Stationen-Tabs', $('stationTabs').children.length === 4);
    check('4 Sterne', $('stationStars').children.length === 4);

    await testeLoesungAnzeige();

    for (let i = 0; i < STATIONS.length; i++) {
        const subs = STATIONS[i].subStations ? STATIONS[i].subStations.length : 1;
        for (let s = 0; s < subs; s++) {
            await testeModul(i, s, 6);
        }
    }

    await testeHilfeSchalter(2);
    await testeHilfeSchalter(3);
    await testeZeitmodus();

    // Alle Sterne vergeben -> Ergebnis-Bildschirm
    check('Alle Sterne vergeben', earnedStars.every(Boolean), JSON.stringify(earnedStars));
    $('stationProceedBtn').click();
    await wait(300);
    check('Ergebnis-Bildschirm', $('resultScreen').classList.contains('active'));
    check('Ergebnis: Konfetti', $('konfetti').children.length > 100,
        $('konfetti').children.length + ' Teile');

    LOG.push('');
    LOG.push('ERGEBNIS: ' + (fehler === 0 ? 'ALLE TESTS BESTANDEN' : fehler + ' FEHLER'));
    const pre = document.createElement('pre');
    pre.id = 'testlog';
    pre.textContent = LOG.join('\n');
    document.body.appendChild(pre);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(run, 50));
