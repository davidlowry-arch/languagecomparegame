// ========================
// LANGUAGE GAME JS
// ========================

// List of languages (must match JSON keys)
const LANGUAGES = [
  "balante", "bandial", "bayot", "fonyi", "kassa", "laalaa",
  "mancagne", "manjak", "ndut", "noon", "pulaar", "saafisaafi",
  "seereersine", "wolof"
];

let wordsData;
let selectedLanguage;
let currentQuestionIndex = 0;
let questions = [];
let thudSound;
let correctFirstTry = 0;
let dingSound = new Audio('sounds/ding.mp3');

// ------------------------
// Utility: shuffle arrays
function shuffleArray(arr){
  return arr.map(a=>[Math.random(),a]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]);
}

// Capitalize first letter
function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ------------------------
// Display language names consistently
function displayLanguageName(lang) {
    switch(lang.toLowerCase()) {
        case 'seereersine': return 'Seereer Sine';
        case 'saafisaafi': return 'Saafi-Saafi';
        default: return capitalize(lang);
    }
}

// ------------------------
// Load JSON
fetch("data/words.json")
  .then(res => res.json())
  .then(data => {
    wordsData = data.words;
    initMainMenu();
  })
  .catch(err => console.error("Error loading JSON:", err));

// ------------------------
// Main menu
function initMainMenu(){
  document.body.innerHTML = `
    <h1>Choisissez une langue (v16)</h1>
    <div id="language-buttons">
      ${LANGUAGES.map(lang => `<button onclick="selectLanguage('${lang}')">${displayLanguageName(lang)}</button>`).join('')}
    </div>
  `;
}

// ------------------------
// Language selection
function selectLanguage(lang){
  selectedLanguage = lang;
  document.body.innerHTML = `
    <h2>Trouvez 20 mots en ${displayLanguageName(selectedLanguage)}</h2>
    <button onclick="startGame()">Aller</button>
  `;
}

// ------------------------
// Start game
function startGame(){
  currentQuestionIndex = 0;
  questions = shuffleArray(wordsData).slice(0,20).map(q => ({...q, attempted: false}));
  correctFirstTry = 0;
  loadQuestion();

  // Preload thud sound (loud beep)
  thudSound.play = function() {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    // Low sine for body
    o1.type = 'sine';
    o1.frequency.value = 350;

    // High sine for punch
    o2.type = 'sine';
    o2.frequency.value = 900;

    // Gain envelope
    g.gain.setValueAtTime(0.0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(10.0, ctx.currentTime + 0.02); // very loud attack
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); // fast decay

    // Connect
    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    // Start/stop
    o1.start();
    o2.start();
    o1.stop(ctx.currentTime + 0.25);
    o2.stop(ctx.currentTime + 0.25);
};
}

// ------------------------
// Load question
function loadQuestion() {
  const q = questions[currentQuestionIndex];

  // Progress indicator
  const progressHtml = `<div id="progress">Question ${currentQuestionIndex + 1} / ${questions.length}</div>`;

  // Build array of options
  let options = LANGUAGES.map(lang => ({
    lang: lang,
    word: q.forms[lang] || ""
  }));

  // Shuffle first to randomize duplicate removal
  options = shuffleArray(options);

  // Deduplicate identical words
  options = deduplicateOptions(options, selectedLanguage);

  // Sort alphabetically by displayed word
  options.sort((a,b) => a.word.localeCompare(b.word, 'fr', { sensitivity: 'base' }));

  // Buttons HTML
  const buttonsHtml = options.map(opt => {
    const encodedWord = encodeURIComponent(opt.word);
    return `<button onclick="checkAnswer('${opt.lang}', decodeURIComponent('${encodedWord}'))">
              ${opt.word}
            </button>`;
  }).join('');

  // Render
  document.body.innerHTML = `
    ${progressHtml}
    <h2>${q.gloss_fr}</h2>
    <img src="images/${q.id}.png"><br><br>
    <div class="button-container">
      ${buttonsHtml}
    </div>
    <div id="popup"></div>
  `;
}

// ------------------------
// Deduplicate identical words
function deduplicateOptions(options, correctLang) {
  const seen = {};
  const result = [];

  options.forEach(opt => {
    const word = opt.word;

    if(word in seen) {
      const existingIndex = seen[word];
      const existingOpt = result[existingIndex];

      if(opt.lang === correctLang && existingOpt.lang !== correctLang) {
        result[existingIndex] = opt; // keep correct answer
      }
    } else {
      seen[word] = result.length;
      result.push(opt);
    }
  });

  return result;
}

// ------------------------
// Check answer
function checkAnswer(langClicked, wordClicked) {
  const q = questions[currentQuestionIndex];
  const correctLang = selectedLanguage;
  const correctWord = q.forms[correctLang];
  const popup = document.getElementById("popup");

  const correct = (langClicked === correctLang);
  popup.classList.remove('incorrect');

  if(correct) {
    if(!q.attempted) correctFirstTry++;
    q.attempted = true;

    popup.style.borderColor = "green";
    popup.innerHTML = `
      <h3>Correct</h3>
      <p><strong>${displayLanguageName(correctLang)}</strong></p>
      <p>${correctWord}</p>
      <img src="images/${q.id}.png">
      <button onclick="nextQuestion()">Prochaine question</button>
    `;
    popup.style.display = "block";

    // Ding then word audio
    dingSound.currentTime = 0;
    dingSound.play().then(() => {
      const correctAudioPath = `audio/${correctLang}/${q.id}.mp3`;
      new Audio(correctAudioPath).play();
    }).catch(err => console.warn("Ding failed:", err));

  } else {
    q.attempted = true;

    popup.classList.add('incorrect');
    popup.innerHTML = `
      <h3>Incorrect</h3>
      <p><strong>${displayLanguageName(langClicked)}</strong></p>
      <p>${wordClicked}</p>
      <img src="images/${q.id}.png">
      <button onclick="closePopup()">Essayer encore</button>
    `;
    popup.style.display = "block";

    // Loud beep
    thudSound.play();

    // Clicked word audio
    setTimeout(() => {
      const clickedAudioPath = `audio/${langClicked}/${q.id}.mp3`;
      new Audio(clickedAudioPath).play();
    }, 400);
  }
}

// ------------------------
// Close popup
function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// ------------------------
// Next question
function nextQuestion() {
  currentQuestionIndex++;
  if(currentQuestionIndex >= questions.length) {
    showFinalScreen();
  } else {
    loadQuestion();
  }
}

// ------------------------
// Final screen
function showFinalScreen(){
  document.body.innerHTML = `
    <h1>Félicitations !</h1>
    <p>Vous avez terminé le quiz.</p>
    <p>Score : ${correctFirstTry} / 20</p>
    <p style="font-size:0.8em; color:#555;">
      Seules les réponses correctes dès le premier essai ont été comptées.
    </p>
    <button onclick="initMainMenu()">Retour au menu</button>
    <button onclick="startGameAgain()">Rejouer</button>
  `;
}

function startGameAgain() {
  correctFirstTry = 0;
  startGame();
}

// ------------------------
// Warn before leaving
window.addEventListener("beforeunload", function (e) {
  if(currentQuestionIndex > 0 && currentQuestionIndex < questions.length){
    e.preventDefault();
    e.returnValue = '';
  }
});
