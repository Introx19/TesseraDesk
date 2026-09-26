# 🛠 Гайд по созданию плагинов (DLC) для TesseraDesk

> **⚠️ Начиная с версии 1.9.0 архитектура плагинов изменилась.** Плагины теперь выполняются в изолированном `<iframe sandbox="allow-scripts">`, а не в окне основного приложения. Если вы писали плагин под старую версию (экспорт React-компонента напрямую), его нужно пересобрать под новый контракт ниже — старый формат больше не поддерживается.

Добро пожаловать в экосистему плагинов TesseraDesk! Эта инструкция поможет вам создать, собрать и установить собственное расширение (DLC) для нашей утилиты.

## 🔒 Как это устроено (и почему)

Код плагина запускается в отдельном `iframe` без `allow-same-origin`. Это значит:
- У плагина **нет доступа** к `window`, `localStorage`, cookies и DOM основного приложения (в том числе к настройкам пользователя и API-ключам).
- Единственный способ взаимодействия с приложением — объект `context`, который вам передаётся в `mount()`. Всё, что не описано в `context`, плагину недоступно.
- Это защищает пользователей TesseraDesk на случай, если плагин окажется багнутым или недобросовестным — соответственно, мы будем чуть более щедры на доверие проверенным (подписанным) плагинам, но это не отменяет песочницу.

## 📁 Структура плагина
Любой плагин для TesseraDesk состоит из папки, внутри которой должны быть минимум два файла:
1. `manifest.json` — метаданные плагина.
2. `index.js` — скомпилированный код плагина (ES-модуль, **со встроенным React**, если вы его используете).
3. `style.css` (опционально) — стили плагина.

Пример структуры:
```
TesseraDesk/
└── plugins/
    └── my-awesome-plugin/
        ├── manifest.json
        ├── index.js
        └── style.css
```

---

## 📝 manifest.json
Этот файл рассказывает приложению о вашем плагине. Пример содержания:
```json
{
  "id": "com.myname.awesomeplugin",
  "name": "Awesome Plugin",
  "version": "1.0.0",
  "description": "Мой первый крутой плагин для TesseraDesk!",
  "author": "MyName",
  "main": "index.js",
  "icon": "Box"
}
```
* **icon**: Имя иконки из библиотеки `lucide-react` (например, `Box`, `Calculator`, `PenTool`).

---

## ⚛️ Разработка плагина

Ваш `index.js` должен экспортировать функцию `mount`:

```tsx
// src/main.tsx — исходник плагина ДО сборки
import { createRoot } from 'react-dom/client';
import MyAwesomePlugin from './MyAwesomePlugin';

export function mount(container, context) {
  const root = createRoot(container);
  root.render(<MyAwesomePlugin context={context} />);

  // (опционально) если хотите реагировать на смену темы/языка в реальном времени,
  // объявите глобальную функцию — TesseraDesk вызовет её сама:
  window.onContextUpdate = (newContext) => {
    root.render(<MyAwesomePlugin context={newContext} />);
  };

  // (опционально) верните функцию очистки — вызовется при закрытии инструмента.
  return () => root.unmount();
}
```

```tsx
// MyAwesomePlugin.tsx — сам компонент, пишется как обычно
export default function MyAwesomePlugin({ context }) {
  return (
    <div className="tool-container">
      <div className="tool-header">
        <span className="tool-title">Мой Супер Плагин</span>
      </div>
      <div className="tool-content">
        <p>Привет, мир! Текущая тема: {context.theme}</p>
        <button className="settings-button" onClick={() => context.writeTextToClipboard("Привет из плагина!")}>
          Скопировать текст
        </button>
      </div>
    </div>
  );
}
```

Если вы не используете React — можно и просто работать с `container` напрямую через `document.createElement` / `innerHTML`, это тоже валидный плагин.

### Доступные методы `context`
Все методы, кроме `theme`/`language`, теперь **асинхронные** (возвращают `Promise`), потому что каждый вызов уходит через мост `postMessage` в основное приложение:
- `context.theme`: текущая тема (`"dark"`, `"light"` и т.д.)
- `context.language`: текущий язык (`"ru"`, `"en"`)
- `context.writeTextToClipboard(text): Promise<boolean>` — скопировать текст
- `context.readTextFromClipboard(): Promise<string>` — прочитать текст
- `context.openExternal(url): Promise<boolean>` — открыть ссылку в браузере

Список методов `context` будет расширяться. Если вашему плагину не хватает какого-то API — напишите разработчику (Yarik), добавим отдельным пунктом в мост, с явным подтверждением, что он безопасен для песочницы.

---

## 🎨 Дизайн и CSS-переменные
Пожалуйста, используйте встроенные CSS-переменные TesseraDesk, чтобы ваш плагин выглядел органично при любой теме:
- `var(--text-color)` — основной цвет текста.
- `var(--glass-bg)` — полупрозрачный фон блоков.
- `var(--glass-border)` — цвет рамок панелей.
- `var(--accent-color)` — акцентный цвет (для кнопок и чекбоксов).

Эти переменные наследуются в `iframe` через подключённый `style.css`, так что достаточно просто использовать их в своих стилях.

---

## 📦 Сборка плагина (с помощью Vite)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx', // файл, который экспортирует mount()
      name: 'MyAwesomePlugin',
      fileName: 'index',
      formats: ['es']
    },
    // ВАЖНО: react/react-dom теперь НЕ external — плагин должен нести их с собой,
    // так как у него больше нет доступа к React основного приложения.
    // (просто не указывайте rollupOptions.external вообще)
  }
})
```

1. Создайте пустой проект React.
2. Настройте `vite.config.ts`, как показано выше.
3. Выполните `npm run build`. Ваш файл появится в папке `dist/index.js`.
4. Перенесите `index.js`, `style.css` (если есть) и `manifest.json` в папку `%APPDATA%\TesseraDesk\plugins\Ваш_Плагин\`.

## ⚠️ Безопасность
Помните, что плагины от сторонних разработчиков при первом запуске вызовут у пользователя **Красное окно предупреждения** о потенциальной опасности — это ожидаемо и не убирается: даже в песочнице плагин может, например, злоупотребить `openExternal` или подсунуть вводящий в заблуждение UI. Если вы хотите, чтобы ваш плагин вошёл в официальный доверенный каталог (без окна предупреждения), свяжитесь с разработчиком (Yarik) для получения официальной подписи!
