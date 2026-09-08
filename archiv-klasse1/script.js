/* ============================================
   1. Zentrale Navigation (SPA Logik)
   ============================================ */
function showScreen(screenId) {
    if (typeof timerIntervalM1 !== 'undefined' && timerIntervalM1) clearInterval(timerIntervalM1);
    if (typeof timerIntervalM2 !== 'undefined' && timerIntervalM2) clearInterval(timerIntervalM2);
    if (typeof timerIntervalM3 !== 'undefined' && timerIntervalM3) clearInterval(timerIntervalM3);
    if (typeof timerIntervalKopfrechnen !== 'undefined' && timerIntervalKopfrechnen) clearInterval(timerIntervalKopfrechnen);
    if (typeof modul1AutoAdvanceTimeout !== 'undefined' && modul1AutoAdvanceTimeout) {
        clearTimeout(modul1AutoAdvanceTimeout);
        modul1AutoAdvanceTimeout = null;
    }
    
    // Verstecke alle Elemente mit der Klasse "screen"
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    // Zeige das Ziel-Element an
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

/* ============================================
   2. Modul 1: Simultane Erfassung Logik & State
   ============================================ */
let currentScoreM1 = 0;
let currentModul1Mode = 'wuerfel'; // 'wuerfel', 'finger', 'punkte'
let expectedSumM1 = 0;
let timerIntervalM1 = null;
let timeLeftM1 = 90; // 90 Sekunden (1:30)
let modul1Attempts = 0;
let modul1AutoAdvanceTimeout = null;

const dicePatternsM1 = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 20], [25, 50], [25, 80], [75, 20], [75, 50], [75, 80]]
};

function createDiceSVGM1(number, addRollingClass = false) {
    const dots = dicePatternsM1[number] || dicePatternsM1[1];
    let dotsSVG = dots.map(pos => `<circle cx="${pos[0]}" cy="${pos[1]}" r="10" fill="#2f3542" />`).join('');
    let rollClass = addRollingClass ? ' rolling' : '';
    
    return `
        <div class="dice${rollClass}">
            <svg width="100%" height="100%" viewBox="0 0 100 100">
                ${dotsSVG}
            </svg>
        </div>
    `;
}

/* Zeichnet eine Hand aus der Perspektive Handrücken nach dem Referenzbild des Nutzers */
function drawHandSVG(extendedCount, uid = 'h') {
    const thumbExtended = extendedCount >= 1;
    const indexExtended = extendedCount >= 2;
    const middleExtended = extendedCount >= 3;
    const ringExtended = extendedCount >= 4;
    const pinkyExtended = extendedCount >= 5;

    // Organische Außenkontur für ausgestreckte Finger oder abgerundete Knöchel (Faust)
    let pPinky = pinkyExtended
        ? "C 24 94, 16 70, 8 50 C 5 40, 18 36, 23 43 C 28 50, 36 76, 42 100 "
        : "C 27 104, 29 95, 37 91 C 43 89, 47 93, 46 98 C 45 103, 42 106, 38 107 ";

    let pRing = ringExtended
        ? "C 38 80, 32 50, 33 32 C 34 22, 48 20, 51 29 C 55 42, 56 68, 59 92 "
        : "C 42 102, 46 91, 54 85 C 60 81, 64 85, 63 91 C 62 97, 58 102, 54 104 ";

    let pMiddle = middleExtended
        ? "C 58 72, 60 40, 61 16 C 62 5, 76 5, 77 16 C 78 40, 78 68, 79 90 "
        : "C 58 99, 62 87, 70 82 C 76 78, 80 82, 79 88 C 78 94, 74 99, 70 101 ";

    let pIndex = indexExtended
        ? "C 80 72, 86 46, 89 27 C 91 17, 105 21, 104 31 C 103 50, 101 78, 101 106 "
        : "C 74 98, 80 87, 88 83 C 94 80, 99 85, 98 91 C 97 97, 91 102, 86 105 C 93 107, 99 111, 101 118 ";

    let pThumb = thumbExtended
        ? "C 110 114, 124 106, 136 105 C 144 105, 148 111, 145 117 C 140 124, 128 134, 114 144 C 105 152, 99 155, 94 158 "
        : "C 106 118, 108 132, 104 144 C 100 152, 97 155, 94 158 ";

    let dPerimeter = `M 42 225 L 38 185 C 33 158, 28 135, 25 115 ${pPinky}${pRing}${pMiddle}${pIndex}C 101 110, 101 114, 101 118 ${pThumb}L 90 185 L 90 225 Z`;

    let details = '';

    // Fingernägel und Gelenkfalten für ausgestreckte Finger bzw. feine Knöchelfalten für eingeklappte Finger
    if (pinkyExtended) {
        details += `<path d="M 11 54 C 10 48, 17 44, 21 46 C 23 49, 23 54, 18 57 Z" fill="#faeedd" stroke="#231f20" stroke-width="1.8"/>`;
        details += `<path d="M 18 70 C 20 72, 23 72, 25 70" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
        details += `<path d="M 22 80 C 24 82, 27 82, 29 80" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
    } else {
        details += `<path d="M 32 98 C 33 104, 34 110, 35 116" fill="none" stroke="#442a1d" stroke-width="1.5" stroke-linecap="round"/>`;
    }

    if (ringExtended) {
        details += `<path d="M 35 34 C 35 27, 45 25, 47 30 C 48 35, 44 40, 38 38 Z" fill="#faeedd" stroke="#231f20" stroke-width="1.8"/>`;
        details += `<path d="M 39 54 C 42 56, 47 56, 50 54" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
        details += `<path d="M 42 66 C 45 68, 49 68, 52 66" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
    } else {
        details += `<path d="M 48 88 C 49 94, 50 102, 51 108" fill="none" stroke="#442a1d" stroke-width="1.5" stroke-linecap="round"/>`;
    }

    if (middleExtended) {
        details += `<path d="M 63 20 C 63 13, 73 13, 74 18 C 75 24, 71 28, 65 27 Z" fill="#faeedd" stroke="#231f20" stroke-width="1.8"/>`;
        details += `<path d="M 64 46 C 67 48, 72 48, 74 46" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
        details += `<path d="M 65 62 C 68 64, 73 64, 75 62" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
    } else {
        details += `<path d="M 67 82 C 68 88, 68 96, 69 104" fill="none" stroke="#442a1d" stroke-width="1.5" stroke-linecap="round"/>`;
    }

    if (indexExtended) {
        details += `<path d="M 92 30 C 93 24, 102 26, 103 31 C 104 36, 99 39, 95 38 Z" fill="#faeedd" stroke="#231f20" stroke-width="1.8"/>`;
        details += `<path d="M 87 52 C 90 54, 95 54, 97 52" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
        details += `<path d="M 89 66 C 92 68, 96 68, 98 66" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
    } else {
        details += `<path d="M 88 84 C 88 90, 87 98, 86 106" fill="none" stroke="#442a1d" stroke-width="1.5" stroke-linecap="round"/>`;
        details += `<path d="M 98 100 C 96 108, 95 118, 96 126" fill="none" stroke="#442a1d" stroke-width="1.6" stroke-linecap="round"/>`;
    }

    if (thumbExtended) {
        details += `<path d="M 137 107 C 142 105, 149 108, 150 113 C 151 117, 145 119, 139 117 Z" fill="#faeedd" stroke="#231f20" stroke-width="1.8"/>`;
        details += `<path d="M 124 122 C 126 126, 130 128, 133 126" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>`;
    } else {
        details += `<path d="M 101 126 C 103 132, 102 140, 99 146" fill="none" stroke="#331e14" stroke-width="1.8" stroke-linecap="round"/>`;
    }

    // Handrücken-Falten unterhalb der Knöchel
    details += `
        <path d="M 37 116 C 38 120, 41 120, 42 117" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M 52 110 C 53 114, 56 114, 57 111" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M 68 108 C 69 112, 72 112, 73 109" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M 84 112 C 85 116, 88 116, 89 113" fill="none" stroke="#5a3520" stroke-width="1.6" stroke-linecap="round"/>
    `;

    return `
        <defs>
            <linearGradient id="${uid}Skin" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f7ceb0"/>
                <stop offset="60%" stop-color="#eeb48f"/>
                <stop offset="100%" stop-color="#d6966f"/>
            </linearGradient>
        </defs>
        <path d="${dPerimeter}" fill="url(#${uid}Skin)" stroke="#231f20" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
        ${details}
    `;
}

/* Erzeugt zwei Hände nebeneinander nach der 'Kraft der 5' */
function createTwoHandsHTML(totalFingers) {
    const leftCount = Math.min(5, totalFingers);
    const rightCount = Math.max(0, totalFingers - 5);

    const leftHandSVG = drawHandSVG(leftCount, 'lHand' + totalFingers);
    const rightHandSVG = drawHandSVG(rightCount, 'rHand' + totalFingers);

    return `
        <div class="hands-container">
            <div class="hand-card">
                <svg class="hand-svg" viewBox="0 0 160 230">
                    ${leftHandSVG}
                </svg>
                <span class="hand-label">Linke Hand</span>
            </div>
            <div class="hand-card">
                <svg class="hand-svg" viewBox="0 0 160 230">
                    <g transform="translate(160, 0) scale(-1, 1)">
                        ${rightHandSVG}
                    </g>
                </svg>
                <span class="hand-label">Rechte Hand</span>
            </div>
        </div>
    `;
}

/* Erzeugt einen Zehnerstreifen mit 10 Kugeln und 5er-Lücke */
function createTenBeadsHTML(activeCount) {
    let group1HTML = '';
    for (let i = 1; i <= 5; i++) {
        let isActive = i <= activeCount;
        let beadClass = isActive ? 'bead active-red' : 'bead empty';
        group1HTML += `<div class="${beadClass}"></div>`;
    }

    let group2HTML = '';
    for (let i = 6; i <= 10; i++) {
        let isActive = i <= activeCount;
        let beadClass = isActive ? 'bead active-blue' : 'bead empty';
        group2HTML += `<div class="${beadClass}"></div>`;
    }

    return `
        <div class="ten-frame-container">
            <div class="ten-frame-bar">
                <div class="bead-group">${group1HTML}</div>
                <div class="bead-gap"></div>
                <div class="bead-group">${group2HTML}</div>
            </div>
        </div>
    `;
}

function startModul1Exercise(mode) {
    if (modul1AutoAdvanceTimeout) {
        clearTimeout(modul1AutoAdvanceTimeout);
        modul1AutoAdvanceTimeout = null;
    }
    currentModul1Mode = mode;
    currentScoreM1 = 0;
    modul1Attempts = 0;
    timeLeftM1 = 90;
    
    document.getElementById('modul1Score').innerText = currentScoreM1;
    document.getElementById('modul1Feedback').style.visibility = 'hidden';
    document.getElementById('modul1NextBtn').style.visibility = 'hidden';
    document.getElementById('modul1NextBtn').style.display = 'inline-block'; 
    
    const titleEl = document.getElementById('modul1Title');
    const instructEl = document.getElementById('modul1Instruction');
    
    if (mode === 'wuerfel') {
        if (titleEl) titleEl.innerText = "Würfelbilder";
        if (instructEl) instructEl.innerText = "Wie viele Augen siehst du?";
    } else if (mode === 'finger') {
        if (titleEl) titleEl.innerText = "Fingerbilder";
        if (instructEl) instructEl.innerText = "Wie viele Finger siehst du?";
    } else {
        if (titleEl) titleEl.innerText = "Punktebilder";
        if (instructEl) instructEl.innerText = "Wie viele Punkte siehst du?";
    }
    
    updateTimerDisplayM1();
    showScreen('modul1Screen');
    
    generateModul1Task(mode === 'wuerfel');
    
    if (timerIntervalM1) clearInterval(timerIntervalM1);
    timerIntervalM1 = setInterval(() => {
        timeLeftM1--;
        updateTimerDisplayM1();
        if (timeLeftM1 <= 0) {
            clearInterval(timerIntervalM1);
            endModul1Round();
        }
    }, 1000);
}

function updateTimerDisplayM1() {
    let m = Math.floor(timeLeftM1 / 60);
    let s = timeLeftM1 % 60;
    document.getElementById('timerDisplayModul1').innerText = 
        (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function getRandomIntM1(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateModul1Task(animate = false) {
    if (modul1AutoAdvanceTimeout) {
        clearTimeout(modul1AutoAdvanceTimeout);
        modul1AutoAdvanceTimeout = null;
    }
    modul1Attempts = 0;

    document.getElementById('modul1Feedback').style.visibility = 'hidden';
    document.getElementById('modul1NextBtn').style.visibility = 'hidden';
    document.getElementById('modul1OptionsArea').style.visibility = 'hidden';

    // Buttons zurücksetzen
    document.querySelectorAll('#modul1OptionsArea .option-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.backgroundColor = '';
        btn.style.color = '';
    });

    const container = document.getElementById('modul1TaskContainer');

    if (currentModul1Mode === 'wuerfel') {
        let val = getRandomIntM1(1, 6);
        expectedSumM1 = val;

        if (animate) {
            container.innerHTML = `<div class="dice-container">${createDiceSVGM1(getRandomIntM1(1,6), true)}</div>`;
            let svgElement = container.querySelector('.dice svg');
            let rollCounter = 0;
            let rollInterval = setInterval(() => {
                let randomNum = getRandomIntM1(1, 6);
                let dots = dicePatternsM1[randomNum];
                if (svgElement && dots) {
                    svgElement.innerHTML = dots.map(pos => `<circle cx="${pos[0]}" cy="${pos[1]}" r="10" fill="#2f3542" />`).join('');
                }
                rollCounter++;
                if (rollCounter > 5) clearInterval(rollInterval);
            }, 100);

            setTimeout(() => {
                clearInterval(rollInterval);
                container.innerHTML = `<div class="dice-container">${createDiceSVGM1(val, false)}</div>`;
                generateModul1Options(6);
                document.getElementById('modul1OptionsArea').style.visibility = 'visible';
            }, 600);
        } else {
            container.innerHTML = `<div class="dice-container">${createDiceSVGM1(val, false)}</div>`;
            generateModul1Options(6);
            document.getElementById('modul1OptionsArea').style.visibility = 'visible';
        }
    } else if (currentModul1Mode === 'finger') {
        let val = getRandomIntM1(1, 10);
        expectedSumM1 = val;
        container.innerHTML = createTwoHandsHTML(val);
        generateModul1Options(10);
        document.getElementById('modul1OptionsArea').style.visibility = 'visible';
    } else if (currentModul1Mode === 'punkte') {
        let val = getRandomIntM1(1, 10);
        expectedSumM1 = val;
        container.innerHTML = createTenBeadsHTML(val);
        generateModul1Options(10);
        document.getElementById('modul1OptionsArea').style.visibility = 'visible';
    }
}

function generateModul1Options(maxNumber) {
    let optionsArray = [];
    for (let i = 1; i <= maxNumber; i++) {
        optionsArray.push(i);
    }
    
    const optionsArea = document.getElementById('modul1OptionsArea');
    optionsArea.innerHTML = optionsArray.map(opt => 
        `<button class="option-btn" onclick="checkModul1Answer(${opt}, this)">${opt}</button>`
    ).join('');
}

function checkModul1Answer(selectedSum, buttonElement) {
    if (timeLeftM1 <= 0) return;
    
    const feedbackArea = document.getElementById('modul1Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    if (selectedSum === expectedSumM1) {
        // RICHTIGE ANTWORT (beim 1. oder 2. Versuch)
        currentScoreM1++;
        document.getElementById('modul1Score').innerText = currentScoreM1;
        
        feedbackArea.className = 'feedback-area correct';
        if (modul1Attempts === 0) {
            feedbackText.innerText = "Super! Das ist richtig.";
        } else {
            feedbackText.innerText = "Klasse! Im zweiten Versuch gelöst.";
        }
        
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        
        // Alle Buttons sperren
        document.querySelectorAll('#modul1OptionsArea .option-btn').forEach(btn => btn.disabled = true);
        document.getElementById('modul1NextBtn').style.visibility = 'visible';
    } else {
        // FALSCHE ANTWORT
        modul1Attempts++;
        buttonElement.disabled = true;
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        
        if (modul1Attempts === 1) {
            // 1. Fehler: Erneute Eingabe ermöglichen
            feedbackArea.className = 'feedback-area wrong';
            feedbackText.innerText = "Nicht ganz richtig. Du hast noch einen Versuch!";
            document.getElementById('modul1NextBtn').style.visibility = 'hidden';
        } else {
            // 2. Fehler: Alle Buttons sperren, richtige Antwort einmal zeigen und neue Aufgabe stellen
            document.querySelectorAll('#modul1OptionsArea .option-btn').forEach(btn => btn.disabled = true);
            
            // Richtigen Button grün hervorheben
            const buttons = document.querySelectorAll('#modul1OptionsArea .option-btn');
            buttons.forEach(btn => {
                if (parseInt(btn.innerText.trim()) === expectedSumM1) {
                    btn.style.backgroundColor = '#2ed573';
                    btn.style.color = '#fff';
                }
            });
            
            feedbackArea.className = 'feedback-area wrong';
            feedbackText.innerText = `Schade, das war nicht richtig. Die richtige Antwort ist ${expectedSumM1}.`;
            document.getElementById('modul1NextBtn').style.visibility = 'visible';
            
            // Nach 2,5 Sekunden automatisch neue Aufgabe stellen
            if (modul1AutoAdvanceTimeout) clearTimeout(modul1AutoAdvanceTimeout);
            modul1AutoAdvanceTimeout = setTimeout(() => {
                nextModul1Task();
            }, 2500);
        }
    }
}

function nextModul1Task() {
    if (modul1AutoAdvanceTimeout) {
        clearTimeout(modul1AutoAdvanceTimeout);
        modul1AutoAdvanceTimeout = null;
    }
    generateModul1Task(currentModul1Mode === 'wuerfel');
}

function endModul1Round() {
    if (modul1AutoAdvanceTimeout) {
        clearTimeout(modul1AutoAdvanceTimeout);
        modul1AutoAdvanceTimeout = null;
    }
    document.getElementById('finalScoreValueModul1').innerText = currentScoreM1;
    showScreen('resultScreenModul1');
}

/* ============================================
   3. Modul 1: Kopfrechnen
   ============================================ */
let currentScoreKopfrechnen = 0;
let expectedAnswerKopfrechnen = 0;
let currentTaskKopfrechnen = '';
let timerIntervalKopfrechnen = null;
let timeLeftKopfrechnen = 90;

function startKopfrechnenExercise() {
    currentScoreKopfrechnen = 0;
    timeLeftKopfrechnen = 90;
    document.getElementById('kopfrechnenScore').innerText = currentScoreKopfrechnen;
    document.getElementById('kopfrechnenNextBtn').style.visibility = 'hidden';
    updateTimerDisplayKopfrechnen();
    showScreen('kopfrechnenScreen');
    generateKopfrechnenTask();

    if (timerIntervalKopfrechnen) clearInterval(timerIntervalKopfrechnen);
    timerIntervalKopfrechnen = setInterval(() => {
        timeLeftKopfrechnen--;
        updateTimerDisplayKopfrechnen();
        if (timeLeftKopfrechnen <= 0) {
            clearInterval(timerIntervalKopfrechnen);
            endKopfrechnenRound();
        }
    }, 1000);
}

function updateTimerDisplayKopfrechnen() {
    const minutes = Math.floor(timeLeftKopfrechnen / 60);
    const seconds = timeLeftKopfrechnen % 60;
    document.getElementById('timerDisplayKopfrechnen').innerText =
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function generateKopfrechnenTask() {
    const isAddition = Math.random() < 0.5;
    let firstNumber = getRandomIntM1(1, 10);
    let secondNumber = getRandomIntM1(1, 10);

    if (!isAddition && secondNumber > firstNumber) {
        [firstNumber, secondNumber] = [secondNumber, firstNumber];
    }

    expectedAnswerKopfrechnen = isAddition
        ? firstNumber + secondNumber
        : firstNumber - secondNumber;
    currentTaskKopfrechnen = `${firstNumber} ${isAddition ? '+' : '-'} ${secondNumber}`;

    document.getElementById('kopfrechnenTaskContainer').innerText = `${currentTaskKopfrechnen} = ?`;
    document.getElementById('kopfrechnenFeedback').style.visibility = 'hidden';
    document.getElementById('kopfrechnenNextBtn').style.visibility = 'hidden';

    const answers = [expectedAnswerKopfrechnen];
    while (answers.length < 4) {
        const distractor = Math.max(0, expectedAnswerKopfrechnen + getRandomIntM1(-3, 3));
        if (!answers.includes(distractor)) answers.push(distractor);
    }
    answers.sort(() => Math.random() - 0.5);
    document.getElementById('kopfrechnenOptionsArea').innerHTML = answers.map(answer =>
        `<button class="option-btn" onclick="checkKopfrechnenAnswer(${answer}, this)">${answer}</button>`
    ).join('');
}

function checkKopfrechnenAnswer(selectedAnswer, buttonElement) {
    if (timeLeftKopfrechnen <= 0) return;

    document.querySelectorAll('#kopfrechnenOptionsArea .option-btn').forEach(btn => btn.disabled = true);
    const feedbackArea = document.getElementById('kopfrechnenFeedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';

    if (selectedAnswer === expectedAnswerKopfrechnen) {
        currentScoreKopfrechnen++;
        document.getElementById('kopfrechnenScore').innerText = currentScoreKopfrechnen;
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = 'Super! Das ist richtig.';
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = `Nicht ganz. Die richtige Antwort ist ${expectedAnswerKopfrechnen}.`;
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        document.querySelectorAll('#kopfrechnenOptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText, 10) === expectedAnswerKopfrechnen) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
            }
        });
    }
    document.getElementById('kopfrechnenNextBtn').style.visibility = 'visible';
}

function nextKopfrechnenTask() {
    generateKopfrechnenTask();
}

function endKopfrechnenRound() {
    document.getElementById('finalScoreValueKopfrechnen').innerText = currentScoreKopfrechnen;
    showScreen('resultScreenKopfrechnen');
}

/* ============================================
   4. Modul 2 Logik & State (Größer, Kleiner, Gleich)
   ============================================ */
let currentScoreM2 = 0;
let currentDifficultyM2 = 'einfach';
let expectedAnswerM2 = ''; // '<', '>', '='
let timerIntervalM2 = null;
let timeLeftM2 = 90; // 90 Sekunden (1:30)

function startModul2Exercise(difficulty) {
    currentDifficultyM2 = difficulty;
    currentScoreM2 = 0;
    timeLeftM2 = 90;
    
    // UI zurücksetzen
    document.getElementById('modul2Score').innerText = currentScoreM2;
    document.getElementById('modul2Feedback').style.visibility = 'hidden';
    document.getElementById('modul2NextBtn').style.visibility = 'hidden';
    document.getElementById('modul2NextBtn').style.display = 'inline-block';
    
    updateTimerDisplayM2();
    
    showScreen('modul2Screen');
    generateModul2Task();
    
    if (timerIntervalM2) clearInterval(timerIntervalM2);
    timerIntervalM2 = setInterval(() => {
        timeLeftM2--;
        updateTimerDisplayM2();
        if (timeLeftM2 <= 0) {
            clearInterval(timerIntervalM2);
            endModul2Round();
        }
    }, 1000);
}

function updateTimerDisplayM2() {
    let m = Math.floor(timeLeftM2 / 60);
    let s = timeLeftM2 % 60;
    document.getElementById('timerDisplayModul2').innerText = 
        (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function getRandomIntM2(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateModul2Task() {
    document.getElementById('modul2Feedback').style.visibility = 'hidden';
    document.getElementById('modul2NextBtn').style.visibility = 'hidden';
    
    // Buttons reaktivieren und Styling resetten
    document.querySelectorAll('#modul2OptionsArea .option-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.backgroundColor = 'var(--color-modul2-light)';
        btn.style.color = 'var(--color-text)';
    });

    let num1, num2;
    if (currentDifficultyM2 === 'einfach') {
        num1 = getRandomIntM2(1, 10);
        num2 = getRandomIntM2(1, 10);
    } else {
        num1 = getRandomIntM2(1, 20);
        num2 = getRandomIntM2(1, 20);
    }
    
    // Vermeide zu viele "="-Aufgaben, indem ggf. eine Seite nochmal gewürfelt wird
    if (num1 === num2 && Math.random() > 0.2) {
        num2 = currentDifficultyM2 === 'einfach' ? getRandomIntM2(1, 10) : getRandomIntM2(1, 20);
    }

    if (num1 < num2) {
        expectedAnswerM2 = '<';
    } else if (num1 > num2) {
        expectedAnswerM2 = '>';
    } else {
        expectedAnswerM2 = '=';
    }

    const taskContainer = document.getElementById('modul2TaskContainer');
    taskContainer.innerHTML = `
        <span>${num1}</span>
        <span style="display:inline-block; width: 80px; height: 80px; border: 3px dashed #ccc; border-radius: 10px; margin: 0 15px;"></span>
        <span>${num2}</span>
    `;
}

function checkModul2Answer(selectedSymbol, buttonElement) {
    if (timeLeftM2 <= 0) return;

    document.querySelectorAll('#modul2OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const taskContainer = document.getElementById('modul2TaskContainer');
    // Setze das gewählte Symbol in den Platzhalter ein
    let num1 = taskContainer.children[0].innerText;
    let num2 = taskContainer.children[2].innerText;

    taskContainer.innerHTML = `
        <span>${num1}</span>
        <span style="display:flex; width: 80px; height: 80px; color: var(--color-modul2); border: 3px solid var(--color-modul2); border-radius: 10px; margin: 0 15px; align-items: center; justify-content: center;">${selectedSymbol}</span>
        <span>${num2}</span>
    `;

    const feedbackArea = document.getElementById('modul2Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    if (selectedSymbol === expectedAnswerM2) {
        currentScoreM2++;
        document.getElementById('modul2Score').innerText = currentScoreM2;
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = "Klasse! Das stimmt.";
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Das ist leider nicht richtig.";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        
        // Zeige die richtige Lösung an
        taskContainer.innerHTML = `
            <span>${num1}</span>
            <span style="display:flex; width: 80px; height: 80px; color: #cc3945; border: 3px solid #cc3945; border-radius: 10px; margin: 0 15px; align-items: center; justify-content: center;">${expectedAnswerM2}</span>
            <span>${num2}</span>
        `;
    }
    
    document.getElementById('modul2NextBtn').style.visibility = 'visible';
}

function nextModul2Task() {
    generateModul2Task();
}

function endModul2Round() {
    document.getElementById('finalScoreValueModul2').innerText = currentScoreM2;
    showScreen('resultScreenModul2');
}

/* ============================================
   4. Modul 3 Logik & State (Schüttelbox)
   ============================================ */
let currentScoreM3 = 0;
let currentTotalM3 = 5;
let expectedAnswerM3 = 0;
let leftBallsM3 = 0;
let rightBallsM3 = 0;
let timerIntervalM3 = null;
let timeLeftM3 = 90; // 1:30

function startModul3Exercise(total) {
    currentTotalM3 = total;
    currentScoreM3 = 0;
    timeLeftM3 = 90;
    
    document.getElementById('modul3Score').innerText = currentScoreM3;
    document.getElementById('modul3Feedback').style.visibility = 'hidden';
    document.getElementById('modul3NextBtn').style.visibility = 'hidden';
    document.getElementById('modul3NextBtn').style.display = 'inline-block';
    
    document.getElementById('modul3TotalText').innerText = total + (total === 1 ? " Kugel" : " Kugeln");
    
    updateTimerDisplayM3();
    showScreen('modul3Screen');
    
    // Initialer Zustand: Leere Box und Schütteln-Button
    document.getElementById('shakeBoxLeft').innerHTML = '';
    
    // Abdeckung anzeigen, rechts leeren
    document.getElementById('shakeCoverRight').style.opacity = '1';
    let rightHalf = document.getElementById('shakeBoxRight');
    Array.from(rightHalf.children).forEach(child => {
        if(child.id !== 'shakeCoverRight') child.remove();
    });
    
    document.getElementById('modul3OptionsArea').style.visibility = 'hidden';
    document.getElementById('modul3RollContainer').style.display = 'block';
    
    if (timerIntervalM3) clearInterval(timerIntervalM3);
    timerIntervalM3 = setInterval(() => {
        timeLeftM3--;
        updateTimerDisplayM3();
        if (timeLeftM3 <= 0) {
            clearInterval(timerIntervalM3);
            endModul3Round();
        }
    }, 1000);
}

function updateTimerDisplayM3() {
    let m = Math.floor(timeLeftM3 / 60);
    let s = timeLeftM3 % 60;
    document.getElementById('timerDisplayModul3').innerText = 
        (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function getKugelnHTML(count) {
    if (count === 0) return '';
    let html = '<div style="display:flex; justify-content:center; gap: 5px; width: 100%; height: 100%; align-items: center; flex-wrap: wrap;">';
    
    function makeDiceSVG(num) {
        if(num === 0) return '';
        const dots = dicePatternsM1[num];
        let dotsSVG = dots.map(pos => `<circle cx="${pos[0]}" cy="${pos[1]}" r="12" fill="url(#redGrad_${num})" filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.3))" />`).join('');
        return `<svg width="55" height="55" viewBox="0 0 100 100" style="overflow:visible; background: rgba(255,255,255,0.4); border-radius: 10px; padding: 2px;">
            <defs>
                <radialGradient id="redGrad_${num}" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#FF5252" />
                    <stop offset="100%" stop-color="#B71C1C" />
                </radialGradient>
            </defs>
            ${dotsSVG}
        </svg>`;
    }
    
    if (count <= 5) {
        html += makeDiceSVG(count);
    } else {
        html += makeDiceSVG(5);
        html += makeDiceSVG(count - 5);
    }
    html += '</div>';
    return html;
}

function performShakeM3() {
    document.getElementById('modul3RollContainer').style.display = 'none';
    generateModul3Task(true);
}

function nextModul3Task() {
    performShakeM3();
}

function generateModul3Task(animate = true) {
    document.getElementById('modul3Feedback').style.visibility = 'hidden';
    document.getElementById('modul3NextBtn').style.visibility = 'hidden';
    document.getElementById('modul3OptionsArea').style.visibility = 'hidden';
    
    // Cover wieder drüber
    document.getElementById('shakeCoverRight').style.opacity = '1';
    
    // Zufällige Zerlegung (Verwende getRandomIntM2 aus Modul 2, es macht dasselbe)
    leftBallsM3 = getRandomIntM2(0, currentTotalM3);
    rightBallsM3 = currentTotalM3 - leftBallsM3;
    expectedAnswerM3 = rightBallsM3;
    
    const boxContainer = document.getElementById('shakeBoxContainer');
    
    if (animate) {
        boxContainer.classList.add('shaking');
        // Nach Animation Kugeln anzeigen
        setTimeout(() => {
            boxContainer.classList.remove('shaking');
            renderModul3State();
            generateModul3Options();
            document.getElementById('modul3OptionsArea').style.visibility = 'visible';
        }, 800);
    } else {
        renderModul3State();
        generateModul3Options();
        document.getElementById('modul3OptionsArea').style.visibility = 'visible';
    }
}

function renderModul3State() {
    document.getElementById('shakeBoxLeft').innerHTML = getKugelnHTML(leftBallsM3);
    
    let rightHalf = document.getElementById('shakeBoxRight');
    // Alte Kugeln entfernen, Cover behalten
    Array.from(rightHalf.children).forEach(child => {
        if(child.id !== 'shakeCoverRight') child.remove();
    });
    // Verdeckte Kugeln einfügen
    rightHalf.insertAdjacentHTML('beforeend', getKugelnHTML(rightBallsM3));
}

function generateModul3Options() {
    const optionsArea = document.getElementById('modul3OptionsArea');
    let html = '';
    // Optionen von 0 bis currentTotalM3 generieren
    for(let i = 0; i <= currentTotalM3; i++) {
        html += `<button class="option-btn" onclick="checkModul3Answer(${i}, this)" style="background-color: var(--color-modul3-light); box-shadow: 0 5px 0 var(--color-modul3); color: var(--color-text);">${i}</button>`;
    }
    optionsArea.innerHTML = html;
}

function checkModul3Answer(selectedNumber, buttonElement) {
    if (timeLeftM3 <= 0) return;

    document.querySelectorAll('#modul3OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const feedbackArea = document.getElementById('modul3Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    // Zeige rechte Seite durch Ausblenden des Covers
    document.getElementById('shakeCoverRight').style.opacity = '0';
    
    if (selectedNumber === expectedAnswerM3) {
        currentScoreM3++;
        document.getElementById('modul3Score').innerText = currentScoreM3;
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = "Super! Du hast richtig zerlegt.";
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #20bf6b';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Schau noch einmal genau hin!";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #ff6b81';
        
        // Correct button highlight
        document.querySelectorAll('#modul3OptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText) === expectedAnswerM3) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 5px 0 #20bf6b';
            }
        });
    }
    
    document.getElementById('modul3NextBtn').style.visibility = 'visible';
}

function endModul3Round() {
    document.getElementById('finalScoreValueModul3').innerText = currentScoreM3;
    showScreen('resultScreenModul3');
}

/* ============================================
   5. Modul 4 Logik & State (Immer 10 – 5 Stationen)
   ============================================ */
let m4CurrentStation = 1;
let m4CorrectAnswers = 0;
const M4_TOTAL = 10;
let timerIntervalM4 = null;
let timeLeftM4 = 120; // 2 Minuten

function startModul4Exercise() {
    // Sterne beim Neustart des gesamten Moduls auch resetten
    for(let i=1; i<=5; i++) {
        let st = document.getElementById('m4Star'+i);
        if(st) {
            st.className = '';
            st.innerText = '☆';
            st.style.color = '#ccc';
            st.style.textShadow = '1px 1px 3px rgba(0,0,0,0.2)';
        }
    }
    
    switchM4Station(1);
    showScreen('modul4Screen');
}

function switchM4Station(stationNum) {
    m4CurrentStation = stationNum;
    m4CorrectAnswers = 0;
    timeLeftM4 = 120;
    
    // UI Reset
    document.getElementById('m4StationCorrect').innerText = m4CorrectAnswers;
    updateTimerDisplayM4();
    
    // Tabs Update
    for(let i=1; i<=5; i++) {
        let tab = document.getElementById('m4Tab' + i);
        if(!tab) continue;
        if (i === stationNum) {
            tab.className = 'tab modul4-tab active';
            tab.style.color = 'var(--color-modul4)';
            tab.style.opacity = '1';
        } else {
            tab.className = 'tab modul4-tab';
            tab.style.color = '#888';
            tab.style.opacity = '1'; // Kein Schloss mehr
        }
    }
    
    showM4Station(stationNum);
    
    // Initialisiere die gewählte Station
    if (stationNum === 1) initM4S1();
    else if (stationNum === 2) initM4S2();
    else if (stationNum === 3) initM4S3();
    else if (stationNum === 4) initM4S4();
    else if (stationNum === 5) initM4S5();

    // Timer starten
    if (timerIntervalM4) clearInterval(timerIntervalM4);
    timerIntervalM4 = setInterval(() => {
        timeLeftM4--;
        updateTimerDisplayM4();
        if (timeLeftM4 <= 0) {
            clearInterval(timerIntervalM4);
            endM4StationRound();
        }
    }, 1000);
}

function updateTimerDisplayM4() {
    let m = Math.floor(timeLeftM4 / 60);
    let s = timeLeftM4 % 60;
    document.getElementById('timerDisplayModul4').innerText = 
        (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function showM4Station(stationNum) {
    for(let i=1; i<=5; i++) {
        let st = document.getElementById('m4Station' + i);
        if(st) st.style.display = (stationNum === i) ? 'block' : 'none';
    }
    document.getElementById('m4StationComplete').style.display = 'none';
}

function endM4StationRound() {
    // Stern vergeben
    let star = document.getElementById('m4Star' + m4CurrentStation);
    if(star) {
        star.innerText = '⭐';
        star.classList.add('star-earned');
        star.style.color = 'gold';
    }
    
    document.getElementById('m4Station' + m4CurrentStation).style.display = 'none';
    document.getElementById('m4CompleteTitle').innerText = `Zeit abgelaufen! Du hast ${m4CorrectAnswers} Punkte gesammelt.`;
    document.getElementById('m4StationComplete').style.display = 'block';
    
    let bigStar = document.getElementById('m4NewStarIcon');
    if(bigStar) {
        setTimeout(() => {
            bigStar.style.transform = 'scale(1)';
        }, 100);
    }
}

function proceedToNextStationM4() {
    let bigStar = document.getElementById('m4NewStarIcon');
    if(bigStar) bigStar.style.transform = 'scale(0)';
    
    let nextStation = m4CurrentStation < 5 ? m4CurrentStation + 1 : 1;
    switchM4Station(nextStation);
}

function handleM4CorrectAnswer() {
    m4CorrectAnswers++;
    document.getElementById('m4StationCorrect').innerText = m4CorrectAnswers;
    // In der neuen Logik läuft die Station immer 2 Minuten durch
    return false; // return false bedeutet "nicht beenden"
}

// ----------------------------------------------------
// Station 1: Schüttelbox der 10
// ----------------------------------------------------
function initM4S1() {
    document.getElementById('m4s1LeftBox').innerHTML = '';
    document.getElementById('m4s1RightCover').style.opacity = '1';
    document.getElementById('m4s1RightBalls').style.display = 'none';
    document.getElementById('m4s1RightBalls').innerHTML = '';
    
    document.getElementById('m4s1OptionsArea').style.visibility = 'hidden';
    document.getElementById('m4s1Feedback').style.visibility = 'hidden';
    document.getElementById('m4s1NextBtn').style.visibility = 'hidden';
    
    document.getElementById('m4s1RollContainer').style.display = 'block';
}

function performM4S1Shake() {
    document.getElementById('m4s1RollContainer').style.display = 'none';
    generateM4S1Task(true);
}

function nextM4S1Task() {
    performM4S1Shake();
}

function generateM4S1Task(animate = true) {
    document.getElementById('m4s1Feedback').style.visibility = 'hidden';
    document.getElementById('m4s1NextBtn').style.visibility = 'hidden';
    document.getElementById('m4s1OptionsArea').style.visibility = 'hidden';
    
    document.getElementById('m4s1RightCover').style.opacity = '1';
    document.getElementById('m4s1RightBalls').style.display = 'none';
    
    m4s1LeftBalls = getRandomIntM2(1, 9);
    m4s1ExpectedAnswer = M4_TOTAL - m4s1LeftBalls;
    
    const leftBox = document.getElementById('m4s1LeftBox');
    const animContainer = leftBox.parentElement.parentElement;
    
    if (animate) {
        animContainer.classList.add('shaking');
        setTimeout(() => {
            animContainer.classList.remove('shaking');
            renderM4S1State();
        }, 800);
    } else {
        renderM4S1State();
    }
}

function renderM4S1State() {
    document.getElementById('m4s1LeftBox').innerHTML = getKugelnHTML(m4s1LeftBalls);
    document.getElementById('m4s1RightBalls').innerHTML = getKugelnHTML(m4s1ExpectedAnswer);
    
    let options = [m4s1ExpectedAnswer];
    while(options.length < 3) {
        let r = getRandomIntM2(1, 9);
        if(!options.includes(r)) options.push(r);
    }
    options.sort(() => Math.random() - 0.5);
    
    const optionsArea = document.getElementById('m4s1OptionsArea');
    optionsArea.innerHTML = options.map(opt => 
        `<button class="option-btn" onclick="checkM4S1Answer(${opt}, this)" style="background-color: var(--color-modul4-light); box-shadow: 0 5px 0 var(--color-modul4); color: var(--color-text);">${opt}</button>`
    ).join('');
    
    optionsArea.style.visibility = 'visible';
}

function checkM4S1Answer(selectedNumber, buttonElement) {
    document.querySelectorAll('#m4s1OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const feedbackArea = document.getElementById('m4s1Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    document.getElementById('m4s1RightCover').style.opacity = '0';
    document.getElementById('m4s1RightBalls').style.display = 'flex';
    document.getElementById('m4s1RightBalls').style.alignItems = 'center';
    
    if (selectedNumber === m4s1ExpectedAnswer) {
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = `${m4s1LeftBalls} + ${m4s1ExpectedAnswer} = 10 ✓`;
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #20bf6b';
        
        let isDone = handleM4CorrectAnswer();
        if(!isDone) document.getElementById('m4s1NextBtn').style.visibility = 'visible';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Das ergibt nicht 10!";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #ff6b81';
        
        document.querySelectorAll('#m4s1OptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText) === m4s1ExpectedAnswer) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 5px 0 #20bf6b';
            }
        });
        document.getElementById('m4s1NextBtn').style.visibility = 'visible';
    }
}

// ----------------------------------------------------
// Station 2: Herz-Ziffern
// ----------------------------------------------------
let m4s2TargetValues = [];
let m4s2DraggableValues = [];
let m4s2HeartsSolved = 0;

function initM4S2() {
    m4s2HeartsSolved = 0;
    
    // Generiere 5 Aufgaben
    m4s2TargetValues = [];
    while(m4s2TargetValues.length < 5) {
        let r = getRandomIntM2(1, 9);
        if(!m4s2TargetValues.includes(r)) m4s2TargetValues.push(r);
    }
    
    m4s2DraggableValues = m4s2TargetValues.map(v => M4_TOTAL - v);
    m4s2DraggableValues.sort(() => Math.random() - 0.5); // mischen
    
    renderM4S2();
}

function renderM4S2() {
    const topContainer = document.getElementById('m4s2HeartsTop');
    const bottomContainer = document.getElementById('m4s2HeartsBottom');
    
    topContainer.innerHTML = '';
    m4s2TargetValues.forEach((val, idx) => {
        let expected = M4_TOTAL - val;
        let html = `
            <div class="m4s2-heart-container" id="m4s2Target_${idx}" data-expected="${expected}">
                <div class="m4s2-heart-half m4s2-heart-left">${val}</div>
                <div class="m4s2-heart-half m4s2-heart-right-placeholder" ondragover="m4s2AllowDrop(event)" ondrop="m4s2Drop(event, ${idx})"></div>
            </div>
        `;
        topContainer.insertAdjacentHTML('beforeend', html);
    });
    
    bottomContainer.innerHTML = '';
    m4s2DraggableValues.forEach((val, idx) => {
        let html = `
            <div class="m4s2-draggable-heart" draggable="true" id="m4s2Drag_${idx}" data-val="${val}" ondragstart="m4s2Drag(event)" ondragend="m4s2DragEnd(event)" ontouchstart="m4s2TouchStart(event)" ontouchmove="m4s2TouchMove(event)" ontouchend="m4s2TouchEnd(event)">
                ${val}
            </div>
        `;
        bottomContainer.insertAdjacentHTML('beforeend', html);
    });
    
    document.getElementById('m4s2Feedback').style.visibility = 'hidden';
    document.getElementById('m4s2NextBtn').style.visibility = 'hidden';
}

function nextM4S2Round() {
    initM4S2();
}

// --- Drag & Drop Handlers (Mouse) ---
function m4s2AllowDrop(ev) {
    ev.preventDefault();
}

function m4s2Drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.style.opacity = '0.5';
}

function m4s2DragEnd(ev) {
    ev.target.style.opacity = '1';
}

function m4s2Drop(ev, targetIdx) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    let draggedEl = document.getElementById(data);
    if (!draggedEl) return;
    
    handleM4S2DropLogic(draggedEl, targetIdx);
}

// --- Touch Support Handlers (Tablets) ---
let m4s2ActiveTouchEl = null;

function m4s2TouchStart(ev) {
    m4s2ActiveTouchEl = ev.target;
    // Style update for free movement
    m4s2ActiveTouchEl.style.position = 'absolute';
    m4s2ActiveTouchEl.style.zIndex = '1000';
    document.body.appendChild(m4s2ActiveTouchEl); // Move to body DOM layer
    
    m4s2MoveAt(ev.touches[0].pageX, ev.touches[0].pageY);
}

function m4s2TouchMove(ev) {
    if (!m4s2ActiveTouchEl) return;
    ev.preventDefault(); // Prevent scrolling while dragging
    m4s2MoveAt(ev.touches[0].pageX, ev.touches[0].pageY);
}

function m4s2MoveAt(pageX, pageY) {
    m4s2ActiveTouchEl.style.left = pageX - m4s2ActiveTouchEl.offsetWidth / 2 + 'px';
    m4s2ActiveTouchEl.style.top = pageY - m4s2ActiveTouchEl.offsetHeight / 2 + 'px';
}

function m4s2TouchEnd(ev) {
    if (!m4s2ActiveTouchEl) return;
    
    let changedTouch = ev.changedTouches[0];
    m4s2ActiveTouchEl.style.display = 'none'; // hide temporarily to find element underneath
    let elemBelow = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
    m4s2ActiveTouchEl.style.display = 'flex';
    
    m4s2ActiveTouchEl.style.position = 'static';
    m4s2ActiveTouchEl.style.zIndex = '10';
    
    let dropTarget = elemBelow ? elemBelow.closest('.m4s2-heart-right-placeholder') : null;
    
    if (dropTarget) {
        let container = dropTarget.closest('.m4s2-heart-container');
        let targetIdx = parseInt(container.id.split('_')[1]);
        handleM4S2DropLogic(m4s2ActiveTouchEl, targetIdx);
    } else {
        document.getElementById('m4s2HeartsBottom').appendChild(m4s2ActiveTouchEl);
    }
    m4s2ActiveTouchEl = null;
}

function handleM4S2DropLogic(draggedEl, targetIdx) {
    let container = document.getElementById('m4s2Target_' + targetIdx);
    let expected = parseInt(container.getAttribute('data-expected'));
    let val = parseInt(draggedEl.getAttribute('data-val'));
    
    const feedbackArea = document.getElementById('m4s2Feedback');
    const feedbackText = document.getElementById('m4s2FeedbackText');
    feedbackArea.style.visibility = 'visible';
    
    if (val === expected) {
        // Success
        let placeholder = container.querySelector('.m4s2-heart-right-placeholder');
        container.replaceChild(draggedEl, placeholder);
        
        // Disable drag
        draggedEl.draggable = false;
        draggedEl.style.position = 'static';
        draggedEl.ontouchstart = null;
        draggedEl.ontouchmove = null;
        draggedEl.ontouchend = null;
        
        container.classList.add('success');
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = `Richtig! ${M4_TOTAL - expected} + ${val} = 10`;
        
        m4s2HeartsSolved++;
        handleM4CorrectAnswer(); // M4 Progress system handles the 5 star requirement
        if (m4s2HeartsSolved >= 5) {
            document.getElementById('m4s2NextBtn').style.visibility = 'visible';
            setTimeout(() => { if(m4s2HeartsSolved >= 5) initM4S2(); }, 2000);
        }
    } else {
        // Fail
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = `Das passt nicht. ${M4_TOTAL - expected} und ${val} sind nicht 10.`;
        
        // Put back to bottom pool
        document.getElementById('m4s2HeartsBottom').appendChild(draggedEl);
    }
}

// ----------------------------------------------------
// Station 3: Rechenhäuser
// ----------------------------------------------------
let m4s3ExpectedAnswer = 0;
let m4s3LeftNum = 0;

function initM4S3() {
    document.getElementById('m4s3OptionsArea').style.visibility = 'hidden';
    document.getElementById('m4s3Feedback').style.visibility = 'hidden';
    document.getElementById('m4s3NextBtn').style.visibility = 'hidden';
    
    generateM4S3Task();
}

function generateM4S3Task() {
    document.getElementById('m4s3Feedback').style.visibility = 'hidden';
    document.getElementById('m4s3NextBtn').style.visibility = 'hidden';
    
    m4s3LeftNum = getRandomIntM2(0, 10);
    m4s3ExpectedAnswer = M4_TOTAL - m4s3LeftNum;
    
    document.getElementById('m4s3LeftNum').innerText = m4s3LeftNum;
    document.getElementById('m4s3RightNum').innerText = '_';
    document.getElementById('m4s3RightNum').style.color = 'var(--color-modul4)';
    
    // Generate Options
    let options = [m4s3ExpectedAnswer];
    while(options.length < 4) {
        let r = getRandomIntM2(0, 10);
        if(!options.includes(r)) options.push(r);
    }
    options.sort(() => Math.random() - 0.5);
    
    const optionsArea = document.getElementById('m4s3OptionsArea');
    optionsArea.innerHTML = options.map(opt => 
        `<button class="option-btn" onclick="checkM4S3Answer(${opt}, this)" style="background-color: var(--color-modul4-light); box-shadow: 0 5px 0 var(--color-modul4); color: var(--color-text);">${opt}</button>`
    ).join('');
    
    optionsArea.style.visibility = 'visible';
}

function checkM4S3Answer(selectedNumber, buttonElement) {
    document.querySelectorAll('#m4s3OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const feedbackArea = document.getElementById('m4s3Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    document.getElementById('m4s3RightNum').innerText = selectedNumber;
    
    if (selectedNumber === m4s3ExpectedAnswer) {
        document.getElementById('m4s3RightNum').style.color = '#20bf6b';
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = "Stimmt! Das Stockwerk ist komplett.";
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #20bf6b';
        
        let isDone = handleM4CorrectAnswer();
        if(!isDone) document.getElementById('m4s3NextBtn').style.visibility = 'visible';
    } else {
        document.getElementById('m4s3RightNum').style.color = '#ff4757';
        
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Das ist leider falsch.";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #ff6b81';
        
        document.querySelectorAll('#m4s3OptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText) === m4s3ExpectedAnswer) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 5px 0 #20bf6b';
            }
        });
        document.getElementById('m4s3NextBtn').style.visibility = 'visible';
    }
}

function nextM4S3Task() {
    generateM4S3Task();
}

// ----------------------------------------------------
// Station 4: Zehnerfeld
// ----------------------------------------------------
let m4s4ExpectedAnswer = 0;
let m4s4LeftNum = 0;

function initM4S4() {
    document.getElementById('m4s4OptionsArea').style.visibility = 'hidden';
    document.getElementById('m4s4Feedback').style.visibility = 'hidden';
    document.getElementById('m4s4NextBtn').style.visibility = 'hidden';
    
    generateM4S4Task();
}

function generateM4S4Task() {
    document.getElementById('m4s4Feedback').style.visibility = 'hidden';
    document.getElementById('m4s4NextBtn').style.visibility = 'hidden';
    
    m4s4LeftNum = getRandomIntM2(0, 10);
    m4s4ExpectedAnswer = M4_TOTAL - m4s4LeftNum;
    
    // Render Zehnerstreifen
    const tenFrame = document.getElementById('m4s4TenFrame');
    let dotsHtml = '';
    for(let i=0; i<10; i++) {
        if (i < m4s4LeftNum) {
            dotsHtml += `<div style="width: 40px; height: 40px; background-color: #ff4757; border-radius: 50%; margin: 5px auto; box-shadow: inset -2px -2px 5px rgba(0,0,0,0.2);"></div>`;
        } else {
            dotsHtml += `<div style="width: 40px; height: 40px; border: 2px dashed #ccc; border-radius: 50%; margin: 5px auto;"></div>`;
        }
        if (i === 4) {
            dotsHtml += `<div style="width: 15px;"></div>`; // Lücke zwischen 5 und 6
        }
    }
    tenFrame.innerHTML = dotsHtml;
    
    // Generate Options
    let options = [m4s4ExpectedAnswer];
    while(options.length < 4) {
        let r = getRandomIntM2(0, 10);
        if(!options.includes(r)) options.push(r);
    }
    options.sort(() => Math.random() - 0.5);
    
    const optionsArea = document.getElementById('m4s4OptionsArea');
    optionsArea.innerHTML = options.map(opt => 
        `<button class="option-btn" onclick="checkM4S4Answer(${opt}, this)" style="background-color: var(--color-modul4-light); box-shadow: 0 5px 0 var(--color-modul4); color: var(--color-text);">${opt}</button>`
    ).join('');
    
    optionsArea.style.visibility = 'visible';
}

function checkM4S4Answer(selectedNumber, buttonElement) {
    document.querySelectorAll('#m4s4OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const feedbackArea = document.getElementById('m4s4Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    if (selectedNumber === m4s4ExpectedAnswer) {
        // Fülle die fehlenden Plättchen blau aus
        const tenFrame = document.getElementById('m4s4TenFrame');
        let dotsHtml = '';
        for(let i=0; i<10; i++) {
            if (i < m4s4LeftNum) {
                dotsHtml += `<div style="width: 40px; height: 40px; background-color: #ff4757; border-radius: 50%; margin: 5px auto; box-shadow: inset -2px -2px 5px rgba(0,0,0,0.2);"></div>`;
            } else {
                dotsHtml += `<div style="width: 40px; height: 40px; background-color: #1e90ff; border-radius: 50%; margin: 5px auto; box-shadow: inset -2px -2px 5px rgba(0,0,0,0.2);"></div>`;
            }
            if (i === 4) {
                dotsHtml += `<div style="width: 15px;"></div>`; // Lücke zwischen 5 und 6
            }
        }
        tenFrame.innerHTML = dotsHtml;
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = "Super! Das Zehnerfeld ist voll.";
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #20bf6b';
        
        let isDone = handleM4CorrectAnswer();
        if(!isDone) document.getElementById('m4s4NextBtn').style.visibility = 'visible';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Das stimmt leider nicht.";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #ff6b81';
        
        document.querySelectorAll('#m4s4OptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText) === m4s4ExpectedAnswer) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 5px 0 #20bf6b';
            }
        });
        document.getElementById('m4s4NextBtn').style.visibility = 'visible';
    }
}

function nextM4S4Task() {
    generateM4S4Task();
}

// ----------------------------------------------------
// Station 5: Finger
// ----------------------------------------------------
let m4s5ExpectedAnswer = 0;
let m4s5LeftNum = 0;

function initM4S5() {
    document.getElementById('m4s5OptionsArea').style.visibility = 'hidden';
    document.getElementById('m4s5Feedback').style.visibility = 'hidden';
    document.getElementById('m4s5NextBtn').style.visibility = 'hidden';
    
    generateM4S5Task();
}

function getHandSVG(num) {
    // num ranges 0 to 5
    let svgFingers = '';
    for(let i=0; i<5; i++) {
        let isExtended = (i < num); // 0 to num-1 are extended
        let height = isExtended ? 35 : 12;
        let y = isExtended ? 5 : 28;
        let x = i * 14 + 6;
        let w = 11;
        if (i===0) { w = 12; height = isExtended ? 30 : 12; y = isExtended ? 10 : 28; x -= 2; } // Daumen etwas dicker 
        svgFingers += `<rect x="${x}" y="${y}" width="${w}" height="${height}" rx="5" fill="#FFCC80" stroke="#EF6C00" stroke-width="1.5" />`;
    }
    
    return `<svg width="85" height="85" viewBox="0 0 85 85" style="filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.2)); vertical-align: middle; margin: 0 5px;">
        <rect x="4" y="32" width="70" height="40" rx="8" fill="#FFCC80" stroke="#EF6C00" stroke-width="1.5" />
        ${svgFingers}
    </svg>`;
}

function getFingerEmojis(num) {
    if(num === 0) return getHandSVG(0);
    if(num <= 5) return getHandSVG(num);
    return getHandSVG(5) + '&nbsp;&nbsp;' + getHandSVG(num - 5);
}

function generateM4S5Task() {
    document.getElementById('m4s5Feedback').style.visibility = 'hidden';
    document.getElementById('m4s5NextBtn').style.visibility = 'hidden';
    
    m4s5LeftNum = getRandomIntM2(0, 10);
    m4s5ExpectedAnswer = M4_TOTAL - m4s5LeftNum;
    
    document.getElementById('m4s5Fingers').innerHTML = `<span style="border-bottom: 5px solid #ccc; padding-bottom: 10px;">${getFingerEmojis(m4s5LeftNum)}</span>`;
    
    // Generate Options
    let options = [m4s5ExpectedAnswer];
    while(options.length < 4) {
        let r = getRandomIntM2(0, 10);
        if(!options.includes(r)) options.push(r);
    }
    options.sort(() => Math.random() - 0.5);
    
    const optionsArea = document.getElementById('m4s5OptionsArea');
    optionsArea.innerHTML = options.map(opt => 
        `<button class="option-btn" onclick="checkM4S5Answer(${opt}, this)" style="background-color: var(--color-modul4-light); box-shadow: 0 5px 0 var(--color-modul4); color: var(--color-text);">${opt}</button>`
    ).join('');
    
    optionsArea.style.visibility = 'visible';
}

function checkM4S5Answer(selectedNumber, buttonElement) {
    document.querySelectorAll('#m4s5OptionsArea .option-btn').forEach(btn => btn.disabled = true);
    
    const feedbackArea = document.getElementById('m4s5Feedback');
    const feedbackText = feedbackArea.querySelector('.feedback-text');
    feedbackArea.style.visibility = 'visible';
    
    if (selectedNumber === m4s5ExpectedAnswer) {
        document.getElementById('m4s5Fingers').innerHTML = `<span style="border-bottom: 5px solid #2ed573; padding-bottom: 10px; color: #2ed573;">${getFingerEmojis(m4s5LeftNum)} <span style="font-weight:bold;">+ ${getFingerEmojis(m4s5ExpectedAnswer)}</span></span>`;
        
        feedbackArea.className = 'feedback-area correct';
        feedbackText.innerText = "Richtig! Zusammen sind das 10 Finger.";
        buttonElement.style.backgroundColor = '#2ed573';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #20bf6b';
        
        let isDone = handleM4CorrectAnswer();
        if(!isDone) document.getElementById('m4s5NextBtn').style.visibility = 'visible';
    } else {
        feedbackArea.className = 'feedback-area wrong';
        feedbackText.innerText = "Zähl nochmal genau nach!";
        buttonElement.style.backgroundColor = '#ff4757';
        buttonElement.style.color = '#fff';
        buttonElement.style.boxShadow = '0 5px 0 #ff6b81';
        
        document.querySelectorAll('#m4s5OptionsArea .option-btn').forEach(btn => {
            if (parseInt(btn.innerText) === m4s5ExpectedAnswer) {
                btn.style.backgroundColor = '#2ed573';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 5px 0 #20bf6b';
            }
        });
        document.getElementById('m4s5NextBtn').style.visibility = 'visible';
    }
}

function nextM4S5Task() {
    generateM4S5Task();
}
