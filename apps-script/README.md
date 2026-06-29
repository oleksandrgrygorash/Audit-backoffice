# Apps Script для збору відповідей

`Code.gs` приймає POST з форми (`index.html`) і дописує рядок у Google Sheet
у широкому форматі: один рядок = одна відповідь, по дві колонки на сервіс
(`<name> · користь`, `<name> · важкість`).

## Розгортання (виконується вручну в Google)

1. Створити нову Google-таблицю → **Extensions → Apps Script**.
2. Вставити вміст `Code.gs`, зберегти.
3. (Опційно, рекомендовано) **Run → `testDoPost`** → погодити дозволи →
   перевірити, що в таблиці з'явився аркуш `Responses` із заголовком і
   тестовим рядком. Після перевірки видалити тестовий рядок.
4. **Deploy → New deployment → type Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Скопіювати **Web app URL** (закінчується на `/exec`).
6. Передати цей URL у `index.html` (константа `ENDPOINT`).

> Після КОЖНОЇ зміни `Code.gs` потрібно **Deploy → Manage deployments →
> Edit → New version**, інакше зміни не застосуються.
