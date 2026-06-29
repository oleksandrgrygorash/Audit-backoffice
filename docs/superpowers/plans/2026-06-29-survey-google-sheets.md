# Survey → Google Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Підключити збір відповідей форми «Аудит сервісів Back Office» у Google Sheet через Google Apps Script, фіналізувати список сервісів і підготувати форму до запуску анонімного опитування.

**Architecture:** Статичний `index.html` на GitHub Pages на `submit` шле JSON-payload `fetch`-ом на Google Apps Script Web App, який дописує рядок у Google Sheet (широкий формат: один рядок = одна відповідь). Логіка навмисно проста й перевіряється вручну в браузері + Sheet — тест-фреймворк не вводимо (статична сторінка, YAGNI).

**Tech Stack:** Vanilla HTML/CSS/JS (один файл), Google Apps Script (`.gs`), Google Sheets, GitHub Pages.

## Global Constraints

- Дизайн і верстку форми НЕ змінювати: ті ж шрифти (Geologica / Golos Text / JetBrains Mono), CSS-змінні з `:root`, наявні класи. Нові елементи стилізувати наявними токенами.
- Повна анонімність: жодних полів імені чи email.
- Широкий формат таблиці: один рядок = одна відповідь. Дві колонки на сервіс: `<name> · користь`, `<name> · важкість`.
- Список `SERVICES` фіналізується ДО запуску й після старту збору НЕ змінюється (інакше зсуваються колонки).
- `Content-Type: text/plain` для POST (уникнення CORS-preflight з Apps Script).
- Кожна задача завершується комітом. Працюємо на гілці `survey-google-sheets`.

---

### Task 1: Фіналізувати список сервісів + групування за owner

Наповнюємо `SERVICES` реальними сервісами (~9–20) і змінюємо рендер так, щоб картки групувалися під підзаголовками owner (для довшого списку). Дизайн існуючих карток не чіпаємо; per-card owner-тег прибираємо, бо owner тепер у заголовку секції (DRY).

**Files:**
- Modify: `index.html` (масив `SERVICES` ~341-347; рендер `#services` ~371-380; CSS — додати `.group`; картка — прибрати `.owner` span у шаблоні ~372-373)

**Interfaces:**
- Produces: `SERVICES` — масив об'єктів `{ id:string, name:string, desc:string, owner:string }`. `id` — короткий латинський slug, унікальний. Порядок елементів = порядок колонок у Sheet. Сервіси одного owner мають іти підряд (рендер групує за першою появою owner).

- [ ] **Step 1: Зібрати фінальний список у користувача**

Запитати в користувача фінальний перелік сервісів. Для кожного потрібні: назва (`name`), короткий опис (`desc`, одне речення «від чого до чого»), та функція-власник (`owner`, напр. Operations / HR / Talent Acquisition / Finance / Legal / IT). Згрупувати уявно за owner. Якщо користувач не впевнений — допомогти сформулювати, спираючись на наявні 5 placeholder-сервісів як приклад тону.

- [ ] **Step 2: Замінити масив `SERVICES`**

У `index.html` замінити поточний масив (рядки ~341-347) на фінальний. Сервіси одного owner — підряд. Приклад структури (значення підставити реальні зі Step 1):

```javascript
const SERVICES = [
  { id:"hire",   name:"Найм людини в команду", desc:"Від брифу на вакансію до виходу кандидата", owner:"Talent Acquisition" },
  { id:"perf",   name:"Performance review",     desc:"Підготовка й супровід циклу оцінки",        owner:"Talent Acquisition" },
  { id:"device", name:"Техніка та робоче місце", desc:"Видача, налаштування, ремонт",             owner:"Operations" },
  { id:"access", name:"Доступи, акаунти, підписки", desc:"Видача й закриття доступів",            owner:"Operations" },
  // … решта сервісів зі Step 1, згруповані за owner
];
```

- [ ] **Step 3: Додати CSS для підзаголовка секції**

У `<style>` (перед `/* ---- service card ---- */`, ~120) додати:

```css
  .group{
    font-family:var(--mono);
    font-size:11px;
    letter-spacing:.12em;
    text-transform:uppercase;
    color:var(--muted);
    margin:26px 0 12px;
    padding-bottom:8px;
    border-bottom:1px solid var(--line);
  }
  .group:first-child{margin-top:0}
```

- [ ] **Step 4: Винести шаблон картки у функцію та групувати рендер за owner**

Замінити блок рендеру (рядки ~371-380) на групований. Прибрати `<span class="owner">` зі шаблону картки (owner тепер у заголовку секції):

```javascript
const cardHTML = (s) => `
  <div class="card" data-sid="${s.id}">
    <p class="name">${s.name}</p>
    <p class="desc">${s.desc}</p>
    ${scaleHTML(s.id,"value", VALUE_Q,  VALUE_A,  "Користь")}
    ${scaleHTML(s.id,"burden",BURDEN_Q, BURDEN_A, "Важкість")}
    <label class="na"><input type="checkbox" id="na-${s.id}"> Не користуюсь цим сервісом</label>
  </div>`;

const groupOrder = [];
const byOwner = {};
SERVICES.forEach(s => {
  if (!byOwner[s.owner]) { byOwner[s.owner] = []; groupOrder.push(s.owner); }
  byOwner[s.owner].push(s);
});
document.getElementById("services").innerHTML = groupOrder.map(owner => `
  <h2 class="group">${owner}</h2>
  ${byOwner[owner].map(cardHTML).join("")}
`).join("");
```

- [ ] **Step 5: Перевірка в браузері**

Відкрити `index.html` у браузері (`open index.html`).
Очікувано: сервіси згруповані під підзаголовками owner; у кожній картці дві шкали 1–4; per-card owner-тег зник; чекбокс «не користуюсь» гасить картку (перевірити клік). Консоль без помилок.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: finalize service list and group cards by owner"
```

---

### Task 2: Google Apps Script Web App + Sheet

Створюємо Apps Script, що приймає payload і дописує широкий рядок. Код тримаємо у репо для версіонування; розгортання — вручну в Google (агент дає інструкції, користувач виконує й повертає URL).

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/README.md` (інструкція з розгортання)

**Interfaces:**
- Consumes: payload зі структурою з Task 3 — `{ submission_id, ts, role, unit, team, comment, answers:[{id,name,owner,value,burden}|{id,name,owner,na:true}] }`.
- Produces: URL Web App виду `https://script.google.com/macros/s/XXXX/exec` — споживається Task 3 як `ENDPOINT`.

- [ ] **Step 1: Створити `apps-script/Code.gs`**

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Responses') || ss.insertSheet('Responses');
    var data = JSON.parse(e.postData.contents);

    // Header — створюється один раз із першого payload (порядок answers = порядок сервісів)
    if (sheet.getLastRow() === 0) {
      var header = ['timestamp','submission_id','role','unit','team','comment'];
      data.answers.forEach(function(a){
        header.push(a.name + ' · користь');
        header.push(a.name + ' · важкість');
      });
      sheet.appendRow(header);
    }

    var row = [data.ts, data.submission_id, data.role, data.unit, data.team, data.comment || ''];
    data.answers.forEach(function(a){
      if (a.na) { row.push('—'); row.push('—'); }
      else { row.push(a.value); row.push(a.burden); }
    });
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Швидка ручна перевірка з редактора Apps Script (Run → testDoPost)
function testDoPost() {
  var payload = {
    submission_id: 'TEST-0001',
    ts: '2026-06-29T12:00:00.000Z',
    role: 'Manager', unit: 'Soportio', team: 'QA',
    comment: 'тестова відповідь',
    answers: [
      { id:'hire', name:'Найм людини', owner:'Talent Acquisition', value:3, burden:4 },
      { id:'device', name:'Техніка', owner:'Operations', na:true }
    ]
  };
  doPost({ postData: { contents: JSON.stringify(payload) } });
}
```

- [ ] **Step 2: Створити `apps-script/README.md` з інструкцією розгортання**

```markdown
# Apps Script для збору відповідей

## Розгортання (виконується вручну в Google)
1. Створити нову Google-таблицю → Extensions → Apps Script.
2. Вставити вміст `Code.gs`, зберегти.
3. (Опційно) Run → `testDoPost` → погодити дозволи → перевірити, що
   в таблиці з'явився аркуш `Responses` із заголовком і тестовим рядком.
   Після перевірки видалити тестовий рядок.
4. Deploy → New deployment → type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Скопіювати **Web app URL** (закінчується на `/exec`).
6. Передати цей URL у `index.html` (константа `ENDPOINT`, Task 3).

> Після КОЖНОЇ зміни `Code.gs` потрібно Deploy → Manage deployments →
> Edit → New version, інакше зміни не застосуються.
```

- [ ] **Step 3: Розгортання користувачем**

Попросити користувача виконати кроки з `apps-script/README.md` і повернути Web app URL (`…/exec`). Зберегти URL для Task 3.

- [ ] **Step 4: Перевірка ендпоінта (test deployment)**

Після того як користувач прогнав `testDoPost`, переконатися (запитати/перевірити скрін), що в таблиці є аркуш `Responses` з коректним заголовком і тестовим рядком, далі тестовий рядок видалено.

- [ ] **Step 5: Commit**

```bash
git add apps-script/
git commit -m "feat: add Apps Script web app for survey responses"
```

---

### Task 3: Підключити форму до ендпоінта

Додаємо `submission_id`, відправку `fetch` на `ENDPOINT`, статус збереження з fallback, і прибираємо застарілий footer-note.

**Files:**
- Modify: `index.html` (script: payload ~441; `renderSummary` ~440-469; summary-блок HTML ~324-335 — прибрати `.draftnote`)

**Interfaces:**
- Consumes: `ENDPOINT` (URL з Task 2).
- Produces: HTTP POST на `ENDPOINT` з тілом-JSON payload (структура — див. Task 2 Interfaces).

- [ ] **Step 1: Додати константу `ENDPOINT`**

На початку `<script>` (після рядка ~339, перед `const SERVICES`) додати (підставити реальний URL з Task 2):

```javascript
const ENDPOINT = "https://script.google.com/macros/s/XXXX/exec";
```

- [ ] **Step 2: Додати `submission_id` у payload**

У `renderSummary` (рядок ~441) замінити рядок створення `payload`:

```javascript
const submission_id = new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,15)
  + "-" + Math.random().toString(36).slice(2,6);
const payload = { submission_id, role, unit, team, answers, comment, ts:new Date().toISOString() };
```

- [ ] **Step 3: Додати відправку та статус-рядок у summary HTML**

У summary-блоці (`index.html` ~332-334) замінити `<pre>`+copy-кнопку-секцію так, щоб над `.draftnote` був статус. Прибрати `.draftnote` повністю й додати `<p class="savestatus" id="saveStatus"></p>` одразу під `#copyBtn`:

```html
    <pre id="json"></pre>
    <button class="copy" id="copyBtn" type="button">Скопіювати дані</button>
    <p class="savestatus" id="saveStatus"></p>
```

Додати CSS поряд із `.draftnote` (заміна, ~258):

```css
  .savestatus{margin-top:18px;font-size:13px}
  .savestatus.ok{color:var(--value)}
  .savestatus.fail{color:var(--burden)}
```

- [ ] **Step 4: Слати payload у `renderSummary`**

У кінці `renderSummary`, після блоку `copyBtn.onclick` (рядок ~468), додати:

```javascript
  const status = document.getElementById("saveStatus");
  status.textContent = "Зберігаю…";
  status.className = "savestatus";
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
  .then(() => { status.textContent = "Збережено ✓"; status.className = "savestatus ok"; })
  .catch(() => {
    status.textContent = "Не вдалось зберегти автоматично — натисни «Скопіювати дані» й надішли вручну.";
    status.className = "savestatus fail";
  });
```

> Примітка про CORS: відповідь Apps Script може бути непрочитною з боку браузера (opaque/redirect). Тому успіхом вважаємо сам факт, що `fetch` не впав мережево (`.then`), а не вміст відповіді. Рядок усе одно дописується на сервері. Мережевий збій → `.catch` → fallback.

- [ ] **Step 5: End-to-end перевірка**

Відкрити `index.html` у браузері, заповнити форму (роль, юніт, команда, усі оцінки), натиснути «Готово».
Очікувано: показано підсумок; статус «Збережено ✓»; у Google Sheet з'явився новий рядок із правильними колонками (метадані + по дві колонки на сервіс, «—» для «не користуюсь»).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: submit responses to Apps Script endpoint"
```

---

### Task 4: Фінальна перевірка, очищення й публікація

**Files:**
- Modify: `index.html` (за потреби дрібні правки за результатами перевірки)
- Google Sheet (очищення тестових даних)

- [ ] **Step 1: Перевірити кейс «не користуюсь»**

Надіслати відповідь, де щонайменше один сервіс позначено «не користуюсь».
Очікувано: у відповідних двох колонках Sheet стоїть `—`, решта значень коректні.

- [ ] **Step 2: Перевірити fallback при недоступному ендпоінті**

Тимчасово зламати `ENDPOINT` (додати зайвий символ), надіслати форму.
Очікувано: статус «Не вдалось зберегти…», кнопка «Скопіювати дані» працює. Повернути коректний `ENDPOINT` назад.

- [ ] **Step 3: Очистити тестові рядки**

Попросити користувача видалити всі тестові рядки з аркуша `Responses`, лишивши тільки header.

- [ ] **Step 4: Перевірити на мобільному вʼюпорті**

У браузері звузити вікно до ~380px (DevTools device toolbar).
Очікувано: верстка не ламається, секції й картки читабельні, кнопки натискаються.

- [ ] **Step 5: Злити у `main` і задеплоїти на GitHub Pages**

```bash
git checkout main
git merge --no-ff survey-google-sheets -m "feat: Google Sheets survey collection"
git push origin main
```

Очікувано: GitHub Pages перебудується; за ~1 хв на `https://oleksandrgrygorash.github.io/Audit-backoffice/` працює збір. Зробити фінальну реальну тестову відправку з live-URL і прибрати її рядок.

- [ ] **Step 6: Запуск опитування**

Передати користувачу live-URL для розсилки (Slack / email). Опитування готове.

---

## Self-Review

**Spec coverage:**
- Архітектура (форма → Apps Script → Sheet) → Tasks 2, 3. ✓
- Apps Script Web App, text/plain, doPost → Task 2 Step 1, Task 3 Step 4. ✓
- Широкий формат, дві колонки на сервіс, `—` для na → Task 2 Step 1, Task 4 Step 1. ✓
- Анонімність (без email/name) → жодна задача не додає таких полів. ✓
- Зміни форми лише в JS + мінімальний CSS, дизайн збережено → Tasks 1, 3 (нові `.group`/`.savestatus` на наявних токенах). ✓
- submission_id, статус-збереження, fallback, прибрати footer-note → Task 3. ✓
- Контент ~9–20 згруповано за owner → Task 1. ✓
- Тестування (E2E, na, fallback, очищення) → Tasks 3, 4. ✓
- Проведення опитування → Task 4 Steps 5-6. ✓

**Placeholder scan:** Реальні значення `SERVICES` і `ENDPOINT` — це користувацькі дані, які збираються в кроках (Task 1 Step 1, Task 2 Step 3), а не код-плейсхолдери; структура й приклади наведені повністю. Решта кроків містить готовий код.

**Type consistency:** Payload `{submission_id, ts, role, unit, team, comment, answers}` однаковий у Task 2 (споживач) і Task 3 (виробник). `answers[]` елементи: `{id,name,owner,value,burden}` або `{id,name,owner,na:true}` — збігається з наявним кодом форми (рядки ~413-420) і з `doPost`. `cardHTML`, `scaleHTML`, `getVal` — імена узгоджені з наявним кодом. ✓
