# Team 2 — Social Agents: План реализации

## Моё понимание задачи

Team 2 отвечает за два агента: **Content Factory** и **Instagram**. По сути это конвейер: Content Factory _производит_ контент, Instagram _доставляет_ его в соцсеть. Но каждый агент должен быть самостоятельным — Instagram может постить готовое видео без Content Factory, а Content Factory может генерировать контент без привязки к Instagram.

Главная идея из `idea.md`, которую я хочу заложить в архитектуру: **минимум человеческого внимания на создание видео, максимум контроля над тем, какое именно видео создавать**. Это значит, что атомарные операции (скачать, транскрибировать, заменить лицо) должны работать автоматически, а точки принятия решений (стиль, тема, тон) — явно запрашиваться у пользователя или задаваться через конфиг.

---

## Архитектура: как я вижу устройство агентов

### Принцип: Atomic Skills + Skill Chains

Сложный запрос типа _"скопируй видео, замени лицо, добавь музыку, отправь в Telegram"_ — это не один монолитный скрипт, а **цепочка атомарных скиллов**:

```
download-video → transcribe → detect-hooks → face-swap → add-music → compose → send-telegram
```

Каждый скилл:
- Делает **одну вещь** хорошо
- Принимает входные данные, отдаёт результат
- Может быть вызван самостоятельно или как часть цепочки
- Логирует свою работу в сессию

Это даёт:
- **Переиспользование** — один и тот же `transcribe` работает и для анализа чужого видео, и для субтитров к своему
- **Отладку** — если цепочка сломалась, видно на каком шаге
- **Расширяемость** — новый скилл встраивается в существующие цепочки без переписывания

### Сессии

Каждый запрос пользователя = **сессия**. Сессия — это папка со всеми промежуточными и финальными артефактами:

```
content/sessions/session-abc123/
├── session-metadata.jsonc     # Входной промпт, параметры, статус, timestamps
├── source-video.mp4           # Скачанный исходник
├── transcript.json            # Результат transcribe
├── hooks-analysis.json        # Результат detect-hooks
├── face-swapped.mp4           # Результат face-swap
├── final-v1.mp4               # Итоговый вариант 1
├── final-v2.mp4               # Итоговый вариант 2
└── report.md                  # Отчёт для пользователя
```

Плюсы:
- Всё воспроизводимо — можно перезапустить цепочку с любого шага
- Контент не теряется — symlinks из `collections/` указывают на файлы в сессиях
- Логи встроены — metadata.jsonc содержит полную историю

---

## Технологический стек

### Язык: Python 3.11+

Обоснование: 95% библиотек для работы с медиа, AI и соцсетями — Python. Нет смысла бороться с экосистемой.

### Ключевые зависимости

| Задача | Инструмент | Почему именно он |
|---|---|---|
| **Instagram API** | `instagrapi` | Самая мощная и активно поддерживаемая неофициальная библиотека. Покрывает всё: auth, посты, stories, reels, DM, аналитика |
| **Скачивание видео** | `yt-dlp` | Поддерживает 1000+ платформ включая Instagram, TikTok, YouTube. Стабильный, активно обновляется |
| **Видео/аудио обработка** | `ffmpeg` (через `ffmpeg-python`) | Индустриальный стандарт. Субтитры, нарезка, склейка, конвертация, всё |
| **Транскрипция** | `faster-whisper` | Быстрее оригинального Whisper в 4x, работает на CPU, качество то же |
| **Face swap** | `insightface` + `facefusion` | Open source, лучшее качество среди бесплатных решений, активная разработка |
| **TTS (озвучка)** | ElevenLabs API / OpenAI TTS | Лучшее качество голоса. Можно клонировать свой голос |
| **Генерация видео** | API: Runway / Kling / Minimax | Пока нет хороших open source решений для качественного видео. Используем API, потом можно заменить |
| **Генерация изображений** | FLUX (через fal.ai или Replicate) | Топовое качество, быстрый, доступный по цене |
| **Анализ контента** | Claude API (vision) | Описание фреймов, анализ стиля, определение хуков — Claude с vision лучше всего |
| **БД** | SQLite | Как в идее — локально, просто, потом мигрируем |

### Риски и как их закрывать

| Риск | Последствие | Митигация |
|---|---|---|
| **Instagram бан** | Аккаунт заблокирован | Прогрев аккаунта, задержки между действиями, прокси-ротация, лимиты в конфиге |
| **Качество face swap** | Некачественное видео | Несколько бэкендов (facefusion, insightface, API), выбор лучшего результата |
| **Цена API видеогенерации** | Высокие расходы | Кэширование, пресеты для типовых задач, local-first где возможно |
| **Rate limits соцсетей** | Запросы отклоняются | Очередь задач с exponential backoff, конфигурируемые лимиты |
| **Большие файлы** | Забивается диск | TTL на сессии, автоочистка через cron, symlinks вместо копий |

---

## Content Factory Agent — детальный план

### Базовые скиллы (Sprint 1-2)

#### Уровень 1: Acquisition (получение контента)
| Скилл | Описание | Зависимости |
|---|---|---|
| `download-video` | Скачать видео по URL (Instagram, YouTube, TikTok и др.) | yt-dlp |
| `download-audio` | Извлечь аудио из видео или скачать отдельно | yt-dlp, ffmpeg |
| `screenshot-url` | Скриншот веб-страницы (для включения статей/постов в видео) | playwright |

#### Уровень 2: Analysis (анализ контента)
| Скилл | Описание | Зависимости |
|---|---|---|
| `transcribe` | Транскрибировать аудио/видео → текст + таймкоды | faster-whisper |
| `describe-frames` | Описать ключевые кадры видео (через Claude Vision) | Claude API |
| `detect-hooks` | Найти хуки и ключевые моменты в транскрипте | Claude API |
| `extract-style` | Определить визуальный стиль, темп, тон видео | Claude API |

#### Уровень 3: Generation (создание контента)
| Скилл | Описание | Зависимости |
|---|---|---|
| `generate-script` | Сгенерировать сценарий видео по промпту | Claude API |
| `text-to-speech` | Озвучить текст голосом (включая клон голоса) | ElevenLabs / OpenAI TTS |
| `generate-image` | Сгенерировать изображение по промпту | FLUX API |
| `face-swap` | Заменить лицо в видео | insightface, facefusion |

#### Уровень 4: Post-processing (сборка и обработка)
| Скилл | Описание | Зависимости |
|---|---|---|
| `add-subtitles` | Наложить субтитры на видео (из транскрипта) | ffmpeg |
| `add-music` | Наложить фоновую музыку | ffmpeg |
| `trim-video` | Обрезать видео по таймкодам | ffmpeg |
| `compose-video` | Собрать финальное видео из компонентов | ffmpeg |
| `resize-format` | Привести к формату платформы (9:16, 1:1 и т.д.) | ffmpeg |

### DB Schema (основные таблицы)

```sql
-- Сессии производства контента
sessions (
    id TEXT PRIMARY KEY,
    prompt TEXT,                    -- Исходный запрос пользователя
    status TEXT,                   -- pending | processing | done | failed
    skill_chain TEXT,              -- JSON: последовательность скиллов
    current_step INTEGER,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
)

-- Единицы контента (все файлы)
content (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    type TEXT,                     -- video | audio | image | text | json
    path TEXT,                     -- Относительный путь к файлу
    source_url TEXT,               -- Откуда скачан (если есть)
    metadata TEXT,                 -- JSON: duration, resolution, size и т.д.
    created_at TIMESTAMP
)

-- Коллекции для организации контента
collections (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT
)

content_collections (
    content_id TEXT REFERENCES content(id),
    collection_id TEXT REFERENCES collections(id)
)

-- Музыкальная библиотека пользователя
music_library (
    id TEXT PRIMARY KEY,
    title TEXT,
    path TEXT,
    genre TEXT,
    bpm INTEGER,
    mood TEXT,
    duration_sec REAL
)
```

---

## Instagram Agent — детальный план

### Скиллы по приоритету

#### Priority 1 (без них агент не работает)
| Скилл | Описание | Сложность |
|---|---|---|
| `auth` | Аутентификация, управление сессиями, реконнект | Средняя — нужно хранить сессии, обрабатывать 2FA |
| `download-reel` | Скачать рил по URL | Низкая — yt-dlp делает всё |
| `post` | Опубликовать видео/фото/карусель, с расписанием | Средняя — разные форматы, caption, хэштеги |
| `get-post-data` | Получить данные поста (лайки, комменты, просмотры) | Низкая |
| `create-account` | Создание аккаунта + верификация через email/SMS | Высокая — антифрод Instagram, нужны прокси |
| `configure-channel` | Настройка профиля: bio, аватар, ссылки, категория | Низкая |

#### Priority 2 (важно, но можно жить без)
| Скилл | Описание |
|---|---|
| `show-analytics` | Аналитика канала: охваты, вовлечённость, рост |
| `extract-channel-style` | AI-анализ стиля канала (тон, визуал, частота постов) |
| `schedule-post` | Отложенная публикация (cron или очередь) |
| `post-ad` | Создание рекламного объявления |

#### Priority 3 (расширение)
| Скилл | Описание |
|---|---|
| `send-message` | Отправка DM |
| `send-comment` | Комментирование постов |
| `get-channel-content` | Скачать весь контент канала для анализа |
| `manage-followers` | Аналитика по подписчикам |

### DB Schema

```sql
-- Управляемые Instagram аккаунты
accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    proxy TEXT,                    -- Привязанный прокси
    session_data TEXT,             -- Зашифрованные данные сессии instagrapi
    status TEXT,                   -- active | banned | warming_up
    warmup_until TIMESTAMP,       -- Дата окончания прогрева
    created_at TIMESTAMP
)

-- Каналы (один аккаунт может вести несколько тематических каналов — алиас)
channels (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id),
    name TEXT,                     -- Человекочитаемое имя (@mine, @second_mine)
    style_profile TEXT,            -- JSON: тон, визуальный стиль, хэштеги
    posting_schedule TEXT,         -- JSON: расписание публикаций
    category TEXT
)

-- Посты
posts (
    id TEXT PRIMARY KEY,
    channel_id TEXT REFERENCES channels(id),
    content_id TEXT,               -- Ссылка на content из Content Factory
    caption TEXT,
    hashtags TEXT,
    status TEXT,                   -- draft | scheduled | posted | failed
    scheduled_at TIMESTAMP,
    posted_at TIMESTAMP,
    instagram_post_id TEXT,        -- ID поста в Instagram после публикации
    metrics TEXT                   -- JSON: likes, comments, views, shares
)

-- Лог всех действий (для антибан-аналитики)
action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT REFERENCES accounts(id),
    action_type TEXT,              -- post | like | comment | dm | login
    timestamp TIMESTAMP,
    success BOOLEAN,
    error TEXT
)
```

### Антибан-стратегия

Это критически важная часть. Instagram активно банит автоматизацию. Подход:

1. **Прогрев аккаунта** — новый аккаунт 7-14 дней используется только вручную или с минимальными действиями
2. **Лимиты действий** — конфигурируемые в `config.agent.instagram.jsonc`:
   ```jsonc
   {
     "rate_limits": {
       "posts_per_day": 3,
       "likes_per_hour": 20,
       "comments_per_hour": 10,
       "dms_per_day": 15,
       "min_delay_between_actions_sec": 30
     },
     "proxy": {
       "rotation_strategy": "per_account",  // каждый аккаунт — свой прокси
       "type": "residential"                 // residential > datacenter для Instagram
     }
   }
   ```
3. **Человекоподобные задержки** — случайные интервалы, не фиксированные
4. **Мониторинг** — логирование всех действий, автоматическая пауза при подозрительных ответах API

---

## Взаимодействие между агентами

```
Пользователь: "Создай видео как у @channel и запости на @mine сегодня в 21:00"
     │
     ▼
Content Factory                          Instagram
     │                                       │
     ├─ download-video (с @channel)          │
     ├─ transcribe                           │
     ├─ extract-style                        │
     ├─ describe-frames                      │
     ├─ generate-script (в том же стиле)     │
     ├─ text-to-speech                       │
     ├─ face-swap                            │
     ├─ add-subtitles                        │
     ├─ add-music                            │
     ├─ compose-video                        │
     │                                       │
     └─── content_id ──────────────────────► post (content_id, @mine, 21:00)
                                             │
                                             └─ scheduled ✓
```

Агенты общаются через:
- **БД** — Content Factory записывает `content.id`, Instagram читает его для поста
- **Файловую систему** — symlinks из `instagram/posts/` на `content-factory/content/sessions/`
- **Скиллы** — Instagram Agent может вызывать скиллы Content Factory напрямую и наоборот

---

## Спринты

### Sprint 0 — Фундамент (неделя 1)
- [ ] Создать файловую структуру обоих агентов по шаблону из idea.md
- [ ] Настроить Python окружение (pyproject.toml, venv, зависимости)
- [ ] Написать CLAUDE.md для каждого агента (правила, контекст, ограничения)
- [ ] Создать DB-схемы и init-скрипты
- [ ] Создать config-шаблоны (конфиги для ключей API, прокси, лимитов)
- [ ] Написать базовый run-скрипт и session-менеджер для Content Factory
- [ ] Написать examples.jsonc с начальными use cases

### Sprint 1 — Instagram Core (неделя 2)
- [ ] `auth` — логин через instagrapi, хранение сессий, реконнект
- [ ] `download-reel` — скачивание рилов (через yt-dlp, fallback instagrapi)
- [ ] `get-post-data` — получение метрик поста
- [ ] `post` — публикация видео с caption и хэштегами
- [ ] `configure-channel` — настройка профиля
- [ ] Тесты на реальном тестовом аккаунте

### Sprint 2 — Content Factory: Acquisition + Analysis (неделя 3)
- [ ] `download-video` — мультиплатформенное скачивание
- [ ] `transcribe` — транскрипция через faster-whisper
- [ ] `describe-frames` — описание ключевых кадров через Claude Vision
- [ ] `detect-hooks` — AI-анализ хуков в транскрипте
- [ ] `extract-style` — определение стиля видео
- [ ] Session manager: создание папки сессии, метаданные, статусы

### Sprint 3 — Content Factory: Generation (неделя 4)
- [ ] `generate-script` — генерация сценария через Claude
- [ ] `text-to-speech` — озвучка через ElevenLabs/OpenAI TTS
- [ ] `face-swap` — замена лица (insightface + facefusion)
- [ ] `add-subtitles` — наложение субтитров
- [ ] `add-music` — наложение музыки из библиотеки
- [ ] `compose-video` — финальная сборка

### Sprint 4 — Интеграция и цепочки (неделя 5)
- [ ] Механизм Skill Chains — декларативное описание цепочек
- [ ] Пайплайн Content Factory → Instagram (создать + опубликовать)
- [ ] `create-account` для Instagram (сложный скилл)
- [ ] `schedule-post` — отложенная публикация
- [ ] Полный E2E тест: промпт → видео → пост в Instagram
- [ ] Обновление документации и examples.jsonc

---

## Открытые вопросы (нужен инпут)

1. **GPU** — face-swap и некоторые модели требуют GPU. Какое железо доступно? Или всё через облачные API?
2. **Тестовый Instagram аккаунт** — нужен для разработки. Есть готовый или создаём новый?
3. **API ключи** — ElevenLabs, Runway/Kling, fal.ai — какие уже есть, какие нужно получить?
4. **Прокси** — для Instagram нужны residential прокси. Есть провайдер?
5. **Голос для TTS** — нужен ли клон конкретного голоса или пока стандартные?
6. **Музыкальная коллекция** — уже существует или будем собирать с нуля?
7. **Приоритет** — с чего начать: Instagram (быстрее MVP) или Content Factory (сложнее, но больше ценности)?

---

*Этот план — живой документ. Обновляется по мере продвижения.*
