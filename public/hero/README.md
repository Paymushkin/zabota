# Hero — медиа

Кадры в формате WebP. Генерация: `npm run optimize-images` (из исходных JPG, если они есть в папках).

## Фаза 1 — loop-1

`hero-1/hero-1-1.webp` … `hero-1-118.webp` — loop «моргание» разбитого экрана.

## Переход 1 → 2

`transfer-1-2/transfer-1-2-1.webp` … `transfer-1-2-60.webp` — scrub по скроллу.

## Фаза 2 — loop-2

`hero-2/hero-2-1.webp` … `hero-2-120.webp` — loop лёгкого моргания.

## Переход 2 → 3

`transfer-2-3/transfer-2-3-1.webp` … `transfer-2-3-120.webp` — scrub по скроллу.

## Фаза 3 — чёрный фон

Без кадров: заливка `#000` на canvas после перехода 2→3.

## Финальный акцент

`/img/ball.webp` — мяч на чёрном фоне.

Константы progress: `src/data/hero.js`.
