import { GameScene } from './game/GameScene.js';
import { SETTINGS_DEFAULTS, loadSettings, resetSettings, saveSettings } from './ui/settingsStore.js';

const STAGES = [
  { id: 'air', name: '空中戦', desc: '多数の敵戦闘機とドッグファイトを行う。' },
  { id: 'sea', name: '海上戦', desc: '敵艦隊を攻撃。海面と対空砲火に注意。' },
  { id: 'base', name: '要塞戦', desc: '島の基地と地対空防衛網を突破する。' },
  { id: 'totalWar', name: '総力戦', desc: '要塞島の港と滑走路を破壊し、軍事本部を撃破せよ。' },
];

const app = document.getElementById('app');
let selectedStage = STAGES[0].id;
let settings = loadSettings();
let gameScene = null;


window.addEventListener('gesturestart', (event) => {
  event.preventDefault();
});

window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false },
);


renderTop();

function renderTop() {
  app.innerHTML = `
    <div class="top-shell">
      <header class="title-panel">
        <h1>空軍無双</h1>
        <p>近代空戦シミュレーション・プロトタイプ</p>
      </header>
      <div class="tabs">
        <button class="tab active" data-tab="stage">ステージ選択</button>
        <button class="tab" data-tab="custom">カスタマイズ</button>
        <button class="tab" data-tab="setting">設定</button>
      </div>
      <section class="tab-panel" id="panel-stage"></section>
      <section class="tab-panel hidden" id="panel-custom"></section>
      <section class="tab-panel hidden" id="panel-setting"></section>
    </div>
  `;

  bindTabs();
  renderStagePanel();
  renderCustomPanel();
  renderSettingPanel();
}

function bindTabs() {
  const tabs = [...document.querySelectorAll('.tab')];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`panel-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });
}

function renderStagePanel() {
  const panel = document.getElementById('panel-stage');
  panel.innerHTML = `
    <div class="card-grid">
      ${STAGES.map(
        (s, index) => `
          <article class="stage-card ${selectedStage === s.id ? 'selected' : ''}" data-stage="${s.id}">
            <h3>${s.name} <span>（第${index + 1}ステージ）</span></h3>
            <p>${s.desc}</p>
          </article>
        `,
      ).join('')}
    </div>
    <button class="sortie-btn" id="start-btn">出撃</button>
  `;

  panel.querySelectorAll('.stage-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedStage = card.dataset.stage;
      renderStagePanel();
    });
  });

  document.getElementById('start-btn').addEventListener('click', startBattle);
}

function renderCustomPanel() {
  const panel = document.getElementById('panel-custom');
  panel.innerHTML = `
    <div class="setting-grid">
      <label>機体カラー
        <input type="color" id="aircraftColor" value="${settings.aircraftColor}" />
      </label>
      <label>ミサイルエフェクト色
        <input type="color" id="missileColor" value="${settings.missileColor}" />
      </label>
      <label>操縦感度
        <select id="controlSensitivity">
          ${['low', 'medium', 'high']
            .map((v) => `<option value="${v}" ${settings.controlSensitivity === v ? 'selected' : ''}>${labelSensitivity(v)}</option>`)
            .join('')}
        </select>
      </label>
      <label>BGM音量
        <input type="range" id="bgmVolume" min="0" max="1" step="0.01" value="${settings.bgmVolume}" />
      </label>
      <label>SE音量
        <input type="range" id="seVolume" min="0" max="1" step="0.01" value="${settings.seVolume}" />
      </label>
    </div>
  `;
  bindSettingInputs(panel);
}

function renderSettingPanel() {
  const panel = document.getElementById('panel-setting');
  panel.innerHTML = `
    <div class="setting-grid">
      <label>全体音量
        <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="${settings.masterVolume}" />
      </label>
      <label>感度設定
        <select id="sensitivitySetting">
          ${['low', 'medium', 'high']
            .map((v) => `<option value="${v}" ${settings.controlSensitivity === v ? 'selected' : ''}>${labelSensitivity(v)}</option>`)
            .join('')}
        </select>
      </label>
      <label>画質設定
        <select id="quality">
          ${['low', 'medium', 'high']
            .map((v) => `<option value="${v}" ${settings.quality === v ? 'selected' : ''}>${labelQuality(v)}</option>`)
            .join('')}
        </select>
      </label>
      <label>難易度
        <select id="difficulty">
          ${['easy', 'normal', 'hard']
            .map((v) => `<option value="${v}" ${settings.difficulty === v ? 'selected' : ''}>${labelDifficulty(v)}</option>`)
            .join('')}
        </select>
      </label>
      <button class="reset-btn" id="resetSetting">設定を初期化</button>
    </div>
  `;

  bindSettingInputs(panel);
  panel.querySelector('#resetSetting').addEventListener('click', () => {
    settings = resetSettings();
    renderTop();
  });
}

function bindSettingInputs(root) {
  root.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('input', () => {
      const customSensitivity = document.getElementById('controlSensitivity');
      const settingSensitivity = document.getElementById('sensitivitySetting');
      settings = {
        ...settings,
        aircraftColor: document.getElementById('aircraftColor')?.value ?? settings.aircraftColor,
        missileColor: document.getElementById('missileColor')?.value ?? settings.missileColor,
        controlSensitivity: customSensitivity?.value ?? settingSensitivity?.value ?? settings.controlSensitivity,
        bgmVolume: Number(document.getElementById('bgmVolume')?.value ?? settings.bgmVolume),
        seVolume: Number(document.getElementById('seVolume')?.value ?? settings.seVolume),
        masterVolume: Number(document.getElementById('masterVolume')?.value ?? settings.masterVolume),
        quality: document.getElementById('quality')?.value ?? settings.quality,
        difficulty: document.getElementById('difficulty')?.value ?? settings.difficulty,
      };
      saveSettings(settings);
    });
  });
}

async function startBattle() {
  await enforceLandscapeMode();

  app.innerHTML = `
    <div id="battle-root">
      <canvas id="game-canvas"></canvas>
      <div id="hud"></div>
      <div id="overlay" class="hidden"></div>
    </div>
  `;

  gameScene = new GameScene({
    canvas: document.getElementById('game-canvas'),
    hudRoot: document.getElementById('hud'),
    overlayRoot: document.getElementById('overlay'),
    stage: selectedStage,
    settings,
    onExit: () => {
      gameScene?.dispose();
      gameScene = null;
      renderTop();
    },
  });
  gameScene.start();
}

function labelSensitivity(v) {
  return { low: '低', medium: '中', high: '高' }[v];
}

function labelQuality(v) {
  return { low: '低', medium: '中', high: '高' }[v];
}

function labelDifficulty(v) {
  return { easy: '簡単', normal: 'ふつう', hard: '難しい' }[v];
}

window.addEventListener('beforeunload', () => {
  if (gameScene) gameScene.dispose();
});

if (!localStorage.getItem('kugun_settings')) {
  saveSettings(SETTINGS_DEFAULTS);
}


async function enforceLandscapeMode() {
  if (!screen.orientation?.lock) return;
  try {
    await screen.orientation.lock('landscape');
  } catch {
    // モバイルブラウザの制約で失敗する場合はそのまま続行
  }
}
