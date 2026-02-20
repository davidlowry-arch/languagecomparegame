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

// ------------------------
// Utility: shuffle arrays
function shuffleArray(arr){
  return arr.map(a=>[Math.random(),a]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]);
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
    <h1>Choisissez une langue (v2)</h1>
    <div id="language-buttons">
      ${LANGUAGES.map(lang => `<button onclick="selectLanguage('${lang}')">${capitalize(lang)}</button>`).join('')}
    </div>
  `;
}

// Capitalize first letter
function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ------------------------
// Language selection
function selectLanguage(lang){
  selectedLanguage = lang;
  document.body.innerHTML = `
    <h2>Trouvez 20 mots en ${capitalize(selectedLanguage)}</h2>
    <button onclick="startGame()">Aller</button>
  `;
}

// ------------------------
// Start game
function startGame(){
  currentQuestionIndex = 0;
  questions = shuffleArray(wordsData).slice(0,20);
  loadQuestion();
  // Preload thud sound
  thudSound = new Audio();
  // Generate a simple dull thud programmatically (sine + short envelope)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  thudSound.play = function(){
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 60; // low dull
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  };
}

// ------------------------
// Load question
function loadQuestion(){
  const q = questions[currentQuestionIndex];

  // Build array of options for this question
  const options = LANGUAGES.map(lang => ({
    lang: lang,
    word: q.forms[lang]
  }));

  // Sort alphabetically by the displayed word
  options.sort((a, b) => 
    a.word.localeCompare(b.word, 'fr', { sensitivity: 'base' })
  );

  const buttonsHtml = options.map(opt => 
    `<button onclick="checkAnswer('${opt.lang}', '${opt.word}')">
       ${opt.word}
     </button>`
  ).join('');

  document.body.innerHTML = `
    <h2>${q.gloss_fr}</h2>
    <img src="images/${q.id}.png"><br><br>
    <div class="button-container">
      ${buttonsHtml}
    </div>
    <div id="popup"></div>
  `;
}


// ------------------------
function checkAnswer(langClicked, wordClicked){

  const q = questions[currentQuestionIndex];
  const correctLang = selectedLanguage;
  const correctWord = q.forms[correctLang];

  const popup = document.getElementById("popup");

  const correct = (langClicked === correctLang);

  if(correct){

    const correctAudioPath = `audio/${correctLang}/${q.id}.mp3`;
    new Audio(correctAudioPath).play();

    popup.style.borderColor = "green";
    popup.innerHTML = `
      <h3>Correct</h3>
      <p><strong>${capitalize(correctLang)}</strong></p>
      <p>${correctWord}</p>
      <img src="images/${q.id}.png">
      <button onclick="nextQuestion()">Prochaine question</button>
    `;

  } else {

    const clickedAudioPath = `audio/${langClicked}/${q.id}.mp3`;

    thudSound.play();

    setTimeout(() => {
      new Audio(clickedAudioPath).play();
    }, 400);

    popup.style.borderColor = "red";
    popup.innerHTML = `
      <h3>Incorrect</h3>

      <p>You chose:</p>
      <p><strong>${capitalize(langClicked)}</strong></p>
      <p>${wordClicked}</p>

      <hr>

      <p>Correct answer:</p>
      <p><strong>${capitalize(correctLang)}</strong></p>
      <p>${correctWord}</p>

      <button onclick="closePopup()">Continuer</button>
    `;
  }

  popup.style.display = "block";
}

// ------------------------
// Close incorrect popup
function closePopup(){
  const popup = document.getElementById("popup");
  popup.style.display = "none";
}

// ------------------------
// Next question
function nextQuestion(){
  currentQuestionIndex++;
  if(currentQuestionIndex >= questions.length){
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
    <button onclick="initMainMenu()">Retour au menu</button>
  `;
}

window.addEventListener("beforeunload", function (e) {
  if (currentQuestionIndex > 0 && currentQuestionIndex < questions.length) {
    e.preventDefault();
    e.returnValue = '';
  }
});
