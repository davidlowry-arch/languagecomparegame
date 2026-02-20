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
let correctFirstTry = 0;

// Preload sounds
const dingSound = new Audio('sounds/ding.mp3');
const thudSound = new Audio('sounds/thud.mp3');

// ------------------------
// Utility: shuffle arrays
function shuffleArray(arr){
  return arr.map(a=>[Math.random(),a]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]);
}

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Display language names consistently
function displayLanguageName(lang) {
  switch(lang.toLowerCase()) {
    case 'seereersine': return 'Seereer Sine';
    case 'saafisaafi': return 'Saafi-Saafi';
    default: return capitalize(lang);
  }
}

// ------------------------
// Play word audio helper
function playWordAudio(lang, id) {
  const audioPath = `audio/${lang}/${id}.mp3`;
  const audio = new Audio(audioPath);
  audio.play().catch(err => console.warn("Audio play failed:", err));
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
    <h1>Choisissez une langue</h1>
    <div id="language-buttons">
      ${LANGUAGES.map(lang => 
        `<button onclick="selectLanguage('${lang}')">
          ${displayLanguageName(lang)}
        </button>`
      ).join('')}
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
  correctFirstTry = 0;
  questions = shuffleArray(wordsData)
                .slice(0,20)
                .map(q => ({...q, attempted:false}));
  loadQuestion();
}

// ------------------------
// Load question
function loadQuestion() {
  const q = questions[currentQuestionIndex];

  const progressHtml = `
    <div id="progress">
      Question ${currentQuestionIndex + 1} / ${questions.length}
    </div>
  `;

  let options = LANGUAGES.map(lang => ({
    lang: lang,
    word: q.forms[lang] || ""
  }));

  options = shuffleArray(options);
  options = deduplicateOptions(options, selectedLanguage);

  options.sort((a,b) =>
    a.word.localeCompare(b.word, 'fr', { sensitivity:'base' })
  );

  const buttonsHtml = options.map(opt => {
    const encodedWord = encodeURIComponent(opt.word);
    return `
      <button onclick="checkAnswer('${opt.lang}', decodeURIComponent('${encodedWord}'))">
        ${opt.word}
      </button>
    `;
  }).join('');

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
        result[existingIndex] = opt;
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
      <img 
        src="images/${q.id}.png"
        style="cursor:pointer;"
        onclick="playWordAudio('${correctLang}', '${q.id}')"
      >
      <button onclick="nextQuestion()">Prochaine question</button>
    `;

    popup.style.display = "block";

    dingSound.currentTime = 0;
    dingSound.play().then(() => {
      playWordAudio(correctLang, q.id);
    });

  } else {

    q.attempted = true;

    popup.classList.add('incorrect');
    popup.innerHTML = `
      <h3>Incorrect</h3>
      <p><strong>${displayLanguageName(langClicked)}</strong></p>
      <p>${wordClicked}</p>
      <img 
        src="images/${q.id}.png"
        style="cursor:pointer;"
        onclick="playWordAudio('${langClicked}', '${q.id}')"
      >
      <button onclick="closePopup()">Essayer encore</button>
    `;

    popup.style.display = "block";

    thudSound.currentTime = 0;
    thudSound.play();

    setTimeout(() => {
      playWordAudio(langClicked, q.id);
    }, 400);
  }
}

// ------------------------
function closePopup(){
  document.getElementById("popup").style.display = "none";
}

// ------------------------
function nextQuestion(){
  currentQuestionIndex++;
  if(currentQuestionIndex >= questions.length){
    showFinalScreen();
  } else {
    loadQuestion();
  }
}

// ------------------------
// Final screen with big score
function showFinalScreen(){
  document.body.innerHTML = `
    <h1>Félicitations !</h1>
    <p>Vous avez terminé le quiz.</p>

    <div style="margin:30px 0;">
      <span style="font-size:4.5em; font-weight:bold;">
        ${correctFirstTry}
      </span>
      <span style="font-size:1.8em; color:#555;">
        / 20
      </span>
    </div>

    <p style="font-size:1.1em; color:#444;">
      Seules les réponses correctes dès le premier essai ont été comptées.
    </p>

    <button onclick="initMainMenu()">Retour au menu</button>
    <button onclick="startGameAgain()">Rejouer</button>
  `;
}

function startGameAgain(){
  correctFirstTry = 0;
  startGame();
}

// ------------------------
window.addEventListener("beforeunload", function (e) {
  if(currentQuestionIndex > 0 && currentQuestionIndex < questions.length){
    e.preventDefault();
    e.returnValue = '';
  }
});
