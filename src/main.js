import { GameScene } from './game/GameScene.js';
import { SETTINGS_DEFAULTS, loadSettings, resetSettings, saveSettings } from './ui/settingsStore.js';

const STAGES = [
  { id: 'air', name: '空中戦', desc: '多数の敵戦闘機とドッグファイトを行う。' },
  { id: 'sea', name: '海上戦', desc: '敵艦隊を攻撃。海面と対空砲火に注意。' },
  { id: 'land', name: '陸上戦', desc: '戦車・地対空ミサイル・歩兵大隊を前線突破前に殲滅する。' },
  { id: 'base', name: '要塞戦', desc: '島の基地と地対空防衛網を突破する。' },
  { id: 'totalWar', name: '総力戦', desc: '要塞島の港と滑走路を破壊し、軍事本部を撃破せよ。' },
];

const HOME_TABS = [
  { id: 'customize', label: '1. カスタマイズ' },
  { id: 'practice', label: '2. 練習' },
  { id: 'combat', label: '3. 実戦' },
  { id: 'records', label: '4. 記録' },
  { id: 'military', label: '5. 軍事情報' },
];

const MILITARY_ORG = {
  commander: '統合司令官',
  joint: ['統合参謀本部'],
  army: ['中央護衛軍', '第1方面軍', '第2方面軍', '第3方面軍', '第4方面軍', '特殊作戦団'],
  navy: ['北部総監部', '東部総監部', '南部総監部', '西部総監部', '補給船団'],
  air: ['北部方面隊', '東部方面隊', '南部方面隊', '西部方面隊', '補給飛行隊'],
};
const AIRCRAFT_OPTIONS = [
  { value: 'f35', label: 'F-35系（ステルス戦闘機）', maxMissiles: 15, speed: 165, minSpeed: 42, armor: '1.0x', stealth: 'あり' },
  { value: 'f15', label: 'F-15系（標準）', maxMissiles: 5, speed: 165, minSpeed: 42, armor: '1.0x', stealth: 'なし' },
  { value: 'b2', label: 'B-2爆撃機（ステルス性能）', maxMissiles: 5, speed: 165, minSpeed: 42, armor: '1.0x', stealth: 'あり' },
  { value: 'blackbird', label: 'ブラックバード（最高速500km）', maxMissiles: 5, speed: 500, minSpeed: 42, armor: '1.0x', stealth: 'なし' },
  { value: 'phoenix', label: 'フェニックス（新型）', maxMissiles: 100, speed: 800, minSpeed: 100, armor: '2.0x', stealth: 'あり' },
];

const COMBAT_COURSES = [
  {
    id: 'ayanishi-recapture',
    label: '本格コース 1',
    title: '綾西島奪還作戦',
    stage: 'ayanishiRecapture',
    story:
      '西国により我が国の領土・綾西島が占領された。西軍は第3管区艦隊と飛行隊を展開し、島には西国陸戦隊が武装展開している。我が国は西部方面隊の第5艦隊と西部航空隊5機を出撃。自機はその1機として参戦し、敵軍掃討をもって作戦完遂とする。',
    enemy: ['西軍 第3管区艦隊', '西軍 飛行隊', '綾西島駐留 西国陸戦隊'],
    ally: ['我が国 西部方面隊 第5艦隊', '我が国 西部航空隊 5機（自機含む）'],
    objective: '敵軍を掃討し、綾西島を奪還せよ。',
  },
  {
    id: 'hokkai-naval-battle',
    label: '本格コース 2',
    title: '北海海戦',
    stage: 'hokkaiNavalBattle',
    story:
      '北国の増援軍が北海航路を南下中。これを阻止するため、我が国北方艦隊と航空隊が洋上迎撃を実施する。敵も海空混成で突入し、制海権・制空権を同時に争う決戦となる。',
    enemy: ['北国 増援艦隊（空母1・巡洋艦2・駆逐艦3・フリゲート2）', '北国 増援飛行隊 10機'],
    ally: ['我が国 北方機動艦隊（空母打撃群）', '我が国 北方航空隊 5機（自機含む）'],
    objective: '増援軍主力を北海上で撃滅し、南下を阻止せよ。',
  },
  {
    id: 'eastern-front',
    label: '本格コース 3',
    title: '東部戦線',
    stage: 'easternFront',
    story:
      '東部国境で敵軍が大規模攻勢を開始。相対する両軍要塞を軸に、地上軍・要塞砲・航空隊が同時投入される全面攻防戦に突入した。味方東部方面隊は防衛線を維持しつつ、敵要塞を破砕して戦線を押し返す。',
    enemy: ['東部侵攻軍 地上打撃群（戦車・機械化歩兵）', '東部侵攻軍 要塞防衛部隊', '東部侵攻軍 航空隊 8機'],
    ally: ['我が国 東部方面隊 要塞守備隊', '我が国 東部航空隊 5機（自機含む）', '我が国 東部機動艦隊 直援部隊'],
    objective: '敵要塞を撃破して戦線を制圧せよ。味方要塞陥落で作戦失敗。',
  },
];

const RECORDS_KEY = 'kugun_records';
const EMPTY_RECORDS = {
  sorties: 0,
  clears: 0,
  failures: 0,
  enemyKills: {
    fighter: 0,
    ship: 0,
    turret: 0,
  },
};

const app = document.getElementById('app');
let selectedStage = STAGES[0].id;
let settings = loadSettings();
let currentPage = null;
let records = loadRecords();
let gameScene = null;
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function applyForcedLandscapeLayout() {
  if (!isTouchDevice) return;

  const isPortrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('force-landscape', isPortrait);

  if (!isPortrait) return;

  document.documentElement.style.setProperty('--forced-landscape-width', `${window.innerHeight}px`);
  document.documentElement.style.setProperty('--forced-landscape-height', `${window.innerWidth}px`);
}

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

window.addEventListener('resize', applyForcedLandscapeLayout);
window.addEventListener('orientationchange', applyForcedLandscapeLayout);
applyForcedLandscapeLayout();

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
        <section class="dashboard-shell" id="dashboard-shell"></section>
      </main>

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
  renderDashboard();
  renderSettingPanel();
}

function renderDashboard() {
  const shell = document.getElementById('dashboard-shell');

  if (!currentPage) {
    shell.classList.remove('is-detail-page');
    shell.innerHTML = `
      <div class="home-top-layout">
        <nav class="quadrant-tabs" id="quadrant-tabs" aria-label="トップタブ"></nav>
        <aside class="home-hero" aria-label="戦闘機イメージ">
          <img src="./src/top-fighter-demo.svg" alt="戦闘機のデモ画像。あとで差し替え可能" />
        </aside>
      </div>
    `;

    const nav = document.getElementById('quadrant-tabs');
    nav.innerHTML = HOME_TABS.map((tab) => `
      <button class="quadrant-tab" data-tab="${tab.id}">${tab.label}</button>
    `).join('');

    nav.querySelectorAll('.quadrant-tab').forEach((button) => {
      button.addEventListener('click', () => {
        currentPage = button.dataset.tab;
        renderDashboard();
      });
    });

    return;
  }

  const pageLabel = HOME_TABS.find((tab) => tab.id === currentPage)?.label ?? '';
  shell.classList.add('is-detail-page');
  shell.innerHTML = `
    <div class="page-head-row">
      <button class="back-btn" id="back-to-home" aria-label="トップに戻る">← トップへ戻る</button>
      <h2>${pageLabel}</h2>
    </div>
    <section class="dashboard-panel home-panel" id="dashboard-content"></section>
  `;

  document.getElementById('back-to-home').addEventListener('click', () => {
    currentPage = null;
    renderDashboard();
  });

  const content = document.getElementById('dashboard-content');
  if (currentPage === 'customize') {
    renderCustomPanel(content);
    return;
  }

  if (currentPage === 'practice') {
    renderPracticePanel(content);
    return;
  }

  if (currentPage === 'combat') {
    renderCombatPanel(content);
    return;
  }

  if (currentPage === 'military') {
    renderMilitaryPanel(content);
    return;
  }

  renderRecordsPanel(content);
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

function renderPracticePanel(panel) {
  panel.innerHTML = `
    <div class="panel-title-row">
      <h2>練習ステージ</h2>
      <p>選択中: ${STAGES.find((stage) => stage.id === selectedStage)?.name}</p>
    </div>
    <div class="stage-button-list">
      ${STAGES.map(
        (s, index) => `
          <button class="stage-card ${selectedStage === s.id ? 'selected' : ''}" data-stage="${s.id}">
            <span class="stage-order">STAGE ${index + 1}</span>
            <strong>${s.name}</strong>
            <small>${s.desc}</small>
            <em>プレイ</em>
          </button>
        `,
      ).join('')}
    </div>
  `;

  panel.querySelectorAll('.stage-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedStage = card.dataset.stage;
      renderPracticePanel(panel);
      startBattle();
    });
  });
}

function renderCombatPanel(panel) {
  panel.innerHTML = `
    <div class="panel-title-row">
      <h2>実戦コース</h2>
    </div>
    <div class="combat-course-list">
      ${COMBAT_COURSES.map((course) => `
        <article class="combat-course-card">
          <p class="combat-course-label">${course.label}</p>
          <h3>${course.title}</h3>
          <p class="combat-story">${course.story}</p>
          <figure class="combat-ally-visual">
            <img src="./src/ayanishi-allied-force.svg" alt="${course.title}に参加する味方艦隊と航空隊の作戦図" />
            <figcaption>味方の艦隊と戦闘機の展開イメージ</figcaption>
          </figure>
          <div class="combat-fleet-grid">
            <section>
              <h4>敵戦力</h4>
              <ul>
                ${course.enemy.map((unit) => `<li>${unit}</li>`).join('')}
              </ul>
            </section>
            <section>
              <h4>味方戦力</h4>
              <ul>
                ${course.ally.map((unit) => `<li>${unit}</li>`).join('')}
              </ul>
            </section>
          </div>
          <p class="combat-objective"><strong>作戦目標：</strong>${course.objective}</p>
          <button class="sortie-btn start-combat-course" data-stage="${course.stage}">作戦開始</button>
        </article>
      `).join('')}
    </div>
  `;

  panel.querySelectorAll('.start-combat-course').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStage = button.dataset.stage;
      startBattle();
    });
  });
}

function renderCustomPanel(panel) {
  panel.innerHTML = `
    <h2>機体カスタマイズ</h2>
    <div class="setting-grid compact">
      <label>機種
        <select id="aircraftModel">
          ${AIRCRAFT_OPTIONS
            .map((v) => `<option value="${v.value}" ${settings.aircraftModel === v.value ? 'selected' : ''}>${v.label}</option>`)
            .join('')}
        </select>
      </label>
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
    <h3 class="custom-spec-title">機体性能一覧</h3>
    <div class="aircraft-spec-grid">
      ${AIRCRAFT_OPTIONS.map((aircraft) => `
        <article class="aircraft-spec-card ${settings.aircraftModel === aircraft.value ? 'is-selected' : ''}">
          <h4>${aircraft.label}</h4>
          <ul>
            <li>ミサイル: ${aircraft.maxMissiles} 発</li>
            <li>速度: ${aircraft.speed} km/h（最低 ${aircraft.minSpeed} km/h）</li>
            <li>装甲強度: ${aircraft.armor}</li>
            <li>ステルス: ${aircraft.stealth}</li>
          </ul>
        </article>
      `).join('')}
    </div>
  `;
  bindSettingInputs(panel);
  const aircraftSelect = panel.querySelector('#aircraftModel');
  aircraftSelect?.addEventListener('change', () => renderCustomPanel(panel));
}

function renderRecordsPanel(panel) {
  panel.innerHTML = `
    <div class="panel-title-row">
      <h2>戦闘記録</h2>
    </div>
    <div class="records-grid">
      <div class="record-pill"><span>出撃回数</span><strong>${records.sorties}</strong></div>
      <div class="record-pill"><span>クリア回数</span><strong>${records.clears}</strong></div>
      <div class="record-pill"><span>失敗回数</span><strong>${records.failures}</strong></div>
    </div>
    <h3 class="record-subtitle">敵種別撃墜数</h3>
    <div class="records-grid">
      <div class="record-pill"><span>敵戦闘機</span><strong>${records.enemyKills.fighter}</strong></div>
      <div class="record-pill"><span>敵艦艇</span><strong>${records.enemyKills.ship}</strong></div>
      <div class="record-pill"><span>対空砲台</span><strong>${records.enemyKills.turret}</strong></div>
    </div>
  `;
}

function renderMilitaryPanel(panel) {
  panel.innerHTML = `
    <div class="panel-title-row">
      <h2>軍事情報 / 組織図</h2>
    </div>
    <article class="org-chart">
      <div class="org-node org-top">${MILITARY_ORG.commander}</div>
      <div class="org-branch">
        ${MILITARY_ORG.joint.map((unit) => `<div class="org-node">${unit}</div>`).join('')}
      </div>
      <div class="org-grid">
        <section class="org-group">
          <h3>陸軍</h3>
          <ul>
            ${MILITARY_ORG.army.map((unit) => `<li>${unit}</li>`).join('')}
          </ul>
        </section>
        <section class="org-group">
          <h3>海軍</h3>
          <ul>
            ${MILITARY_ORG.navy.map((unit) => `<li>${unit}</li>`).join('')}
          </ul>
        </section>
        <section class="org-group">
          <h3>空軍</h3>
          <ul>
            ${MILITARY_ORG.air.map((unit) => `<li>${unit}</li>`).join('')}
          </ul>
        </section>
      </div>
    </article>
  `;
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
        <small>※ 綾西島奪還作戦の味方艦隊・味方機は常時出撃し、難易度は追加調整として反映されます。</small>
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
        aircraftModel: document.getElementById('aircraftModel')?.value ?? settings.aircraftModel,
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
    onEnemyDestroyed: (enemyType) => {
      records.enemyKills[enemyType] = (records.enemyKills[enemyType] ?? 0) + 1;
      saveRecords(records);
    },
    onBattleFinished: (success) => {
      records.sorties += 1;
      if (success) records.clears += 1;
      else records.failures += 1;
      saveRecords(records);
    },
    onExit: () => {
      gameScene?.dispose();
      gameScene = null;
      records = loadRecords();
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

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!parsed) return structuredClone(EMPTY_RECORDS);
    return {
      sorties: Number(parsed.sorties) || 0,
      clears: Number(parsed.clears) || 0,
      failures: Number(parsed.failures) || 0,
      enemyKills: {
        fighter: Number(parsed.enemyKills?.fighter) || 0,
        ship: Number(parsed.enemyKills?.ship) || 0,
        turret: Number(parsed.enemyKills?.turret) || 0,
      },
    };
  } catch {
    return structuredClone(EMPTY_RECORDS);
  }
}

function saveRecords(nextRecords) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords));
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
