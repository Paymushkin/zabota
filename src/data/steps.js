const STEP_IMAGE = {
  src: '/img/image-2.webp',
  alt: 'Страховка в заказе на Яндекс Маркете',
  width: 1376,
  height: 678,
};

export const STEPS_ITEMS = [
  {
    title: 'Обратитесь<br>к&nbsp;нам',
    number: { src: '/img/number-1.webp', width: 102, height: 118 },
    note: 'Нужно будет оформить короткое обращение, займёт около 5&nbsp;минут',
    image: STEP_IMAGE,
  },
  {
    title: 'Расскажите,<br>что случилось',
    number: { src: '/img/number-2.webp', width: 102, height: 118 },
    note: 'Опишите обстоятельства происшествия — это займёт несколько минут',
    image: STEP_IMAGE,
  },
  {
    title: 'Получите деньги<br>на&nbsp;новое устройство',
    number: { src: '/img/number-3.webp', width: 102, height: 118 },
    note: 'Компенсацию переведём после проверки обращения',
    image: STEP_IMAGE,
  },
];
