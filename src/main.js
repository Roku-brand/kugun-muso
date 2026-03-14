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
    <div class="top-shell home-shell">
      <header class="home-header">
        <div class="resource-strip" aria-label="リソース">
          <div class="resource-pill"><span class="resource-dot gold"></span>520,000</div>
          <div class="resource-pill"><span class="resource-dot blue"></span>1,900</div>
          <div class="resource-pill"><span class="resource-dot silver"></span>380</div>
        </div>
        <h1>空軍無双</h1>
        <div class="header-actions">
          <button class="icon-mail" aria-label="お知らせ">✉️</button>
          <button class="icon-setting" id="setting-toggle" aria-label="設定">⚙️</button>
        </div>
      </header>

      <main class="home-main">
        <section class="hero-panel home-panel" id="panel-model"></section>
        <section class="custom-panel home-panel" id="panel-custom"></section>
      </main>

      <section class="bottom-dock">
        <section class="news-panel home-panel">
          <h2>NEWS</h2>
          <ul>
            <li>2024/04/24</li>
            <li>新イベント開催！</li>
            <li>新鋭機F-35実装！</li>
          </ul>
        </section>
        <section class="sortie-panel home-panel" id="panel-stage"></section>
      </section>

      <nav class="home-nav" aria-label="トップメニュー">
        <button>格納庫</button>
        <button>編成</button>
        <button>任務</button>
        <button class="active">ショップ</button>
        <button>記録</button>
      </nav>

      <section class="setting-drawer hidden" id="panel-setting">
        <div class="setting-drawer-head">
          <h2>設定</h2>
          <button class="setting-close" id="setting-close" aria-label="設定を閉じる">×</button>
        </div>
        <div id="setting-content"></div>
      </section>
    </div>
  `;

  bindSettingDrawer();
  renderStagePanel();
  renderModelPanel();
  renderCustomPanel();
  renderSettingPanel();
}

function bindSettingDrawer() {
  const drawer = document.getElementById('panel-setting');
  document.getElementById('setting-toggle').addEventListener('click', () => {
    drawer.classList.toggle('hidden');
  });
  document.getElementById('setting-close').addEventListener('click', () => {
    drawer.classList.add('hidden');
  });
}

function renderStagePanel() {
  const panel = document.getElementById('panel-stage');
  panel.innerHTML = `
    <div class="sortie-title-row">
      <h2>出撃チーム</h2>
      <p>選択中: ${STAGES.find((stage) => stage.id === selectedStage)?.name}</p>
    </div>
    <div class="stage-button-list">
      ${STAGES.map(
        (s, index) => `
          <button class="stage-card ${selectedStage === s.id ? 'selected' : ''}" data-stage="${s.id}">
            <span class="stage-order">STAGE ${index + 1}</span>
            <strong>${s.name}</strong>
            <small>${s.desc}</small>
            <em>開始</em>
          </button>
        `,
      ).join('')}
    </div>
    <button class="sortie-btn" id="start-btn">作戦開始</button>
  `;

  panel.querySelectorAll('.stage-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedStage = card.dataset.stage;
      renderStagePanel();
      renderModelPanel();
    });
  });

  document.getElementById('start-btn').addEventListener('click', startBattle);
}

function renderModelPanel() {
  const selected = STAGES.find((stage) => stage.id === selectedStage);
  const panel = document.getElementById('panel-model');
  panel.innerHTML = `
    <div class="model-heading">
      <p class="hero-overline">航空母艦打撃群 / 出撃待機</p>
      <h2>自機戦闘機モデル</h2>
      <p class="hero-stage">${selected?.name ?? ''}</p>
    </div>
    <div class="jet-model-view" aria-label="自機戦闘機モデル表示">
      <div class="jet-cloud cloud-a"></div>
      <div class="jet-cloud cloud-b"></div>
      <div class="jet-cloud cloud-c"></div>
      <div class="jet-wing"></div>
      <div class="jet-body"></div>
      <div class="jet-tail"></div>
      <div class="jet-cockpit"></div>
    </div>
    <p class="stage-desc">${selected?.desc ?? ''}</p>
  `;
}

function renderCustomPanel() {
  const panel = document.getElementById('panel-custom');
  panel.innerHTML = `
    <h2>機体カスタマイズ</h2>
    <div class="setting-grid compact">
      <label>機体カラー
        <input type="color" id="aircraftColor" value="${settings.aircraftColor}" />
      </label>
      <label>ミサイル色
        <input type="color" id="missileColor" value="${settings.missileColor}" />
      </label>
      <label>操縦感度
        <select id="controlSensitivity">
          ${['low', 'medium', 'high']
            .map((v) => `<option value="${v}" ${settings.controlSensitivity === v ? 'selected' : ''}>${labelSensitivity(v)}</option>`)
            .join('')}
        </select>
      </label>
      <label>BGM
        <input type="range" id="bgmVolume" min="0" max="1" step="0.01" value="${settings.bgmVolume}" />
      </label>
      <label>SE
        <input type="range" id="seVolume" min="0" max="1" step="0.01" value="${settings.seVolume}" />
      </label>
    </div>
  `;
  bindSettingInputs(panel);
}

function renderSettingPanel() {
  const panel = document.getElementById('setting-content');
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
      <fieldset class="ui-offset-group">
        <legend>操縦UI位置（左下）</legend>
        <label>Xオフセット
          <input type="range" id="pilotUiOffsetX" min="-120" max="120" step="1" value="${settings.pilotUiOffsetX}" />
        </label>
        <label>Yオフセット
          <input type="range" id="pilotUiOffsetY" min="-120" max="120" step="1" value="${settings.pilotUiOffsetY}" />
        </label>
        <div class="offset-preview"><span id="pilotUiOffsetValue">X:${settings.pilotUiOffsetX} / Y:${settings.pilotUiOffsetY}</span></div>
      </fieldset>
      <fieldset class="ui-offset-group">
        <legend>武装UI位置（右下）</legend>
        <label>Xオフセット
          <input type="range" id="weaponUiOffsetX" min="-120" max="120" step="1" value="${settings.weaponUiOffsetX}" />
        </label>
        <label>Yオフセット
          <input type="range" id="weaponUiOffsetY" min="-120" max="120" step="1" value="${settings.weaponUiOffsetY}" />
        </label>
        <div class="offset-preview"><span id="weaponUiOffsetValue">X:${settings.weaponUiOffsetX} / Y:${settings.weaponUiOffsetY}</span></div>
      </fieldset>
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
        pilotUiOffsetX: Number(document.getElementById('pilotUiOffsetX')?.value ?? settings.pilotUiOffsetX),
        pilotUiOffsetY: Number(document.getElementById('pilotUiOffsetY')?.value ?? settings.pilotUiOffsetY),
        weaponUiOffsetX: Number(document.getElementById('weaponUiOffsetX')?.value ?? settings.weaponUiOffsetX),
        weaponUiOffsetY: Number(document.getElementById('weaponUiOffsetY')?.value ?? settings.weaponUiOffsetY),
      };
      const pilotOffsetValue = document.getElementById('pilotUiOffsetValue');
      const weaponOffsetValue = document.getElementById('weaponUiOffsetValue');
      if (pilotOffsetValue) {
        pilotOffsetValue.textContent = `X:${settings.pilotUiOffsetX} / Y:${settings.pilotUiOffsetY}`;
      }
      if (weaponOffsetValue) {
        weaponOffsetValue.textContent = `X:${settings.weaponUiOffsetX} / Y:${settings.weaponUiOffsetY}`;
      }
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
