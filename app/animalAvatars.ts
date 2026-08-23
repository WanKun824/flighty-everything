/**
 * 可爱动物头像：手绘 SVG 内联成 data URI。
 * 全部在 96x96 视区内绘制，配合 `border-radius: 50%` 与 `object-fit: cover` 裁切。
 * 不引用外部图片，因此没有演示素材的商用授权问题（见 HANDOFF.md 第 9 节）。
 */

const draw = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>${body}</svg>`)}`;

const backdrop = (color: string) => `<rect width='96' height='96' fill='${color}'/>`;

/** 带高光的圆眼睛，是小尺寸下最能读出“可爱”的部件。 */
const eyes = (y: number, gap = 10) =>
  `<g fill='#33261d'><ellipse cx='${48 - gap}' cy='${y}' rx='4.2' ry='5.1'/><ellipse cx='${48 + gap}' cy='${y}' rx='4.2' ry='5.1'/></g>` +
  `<g fill='#fff'><circle cx='${49.6 - gap}' cy='${y - 1.9}' r='1.4'/><circle cx='${49.6 + gap}' cy='${y - 1.9}' r='1.4'/></g>`;

const blush = (y: number, gap = 20) =>
  `<g fill='#ff8f9c' opacity='.4'><ellipse cx='${48 - gap}' cy='${y}' rx='5' ry='3.3'/><ellipse cx='${48 + gap}' cy='${y}' rx='5' ry='3.3'/></g>`;

/** 竖线加一道弧线，组成猫嘴那样的小笑口。 */
const smile = (y: number, w = 5.6) =>
  `<g stroke='#33261d' stroke-width='1.5' fill='none' stroke-linecap='round'><path d='M48 ${y}v2.2'/><path d='M${48 - w} ${y + 1.8}q${w} 3.6 ${w * 2} 0'/></g>`;

const whiskers = (y: number, color: string) =>
  `<g stroke='${color}' stroke-width='1.3' stroke-linecap='round'><path d='M31 ${y}h-9M31 ${y + 4.5}l-9 2M65 ${y}h9M65 ${y + 4.5}l9 2'/></g>`;

export const animalAvatars = {
  /** 橘猫 */
  cat: draw(
    backdrop("#ffe6d2") +
    "<g fill='#f4a65c'><path d='M27 34 24 11l20 13z'/><path d='M69 34 72 11 52 24z'/></g>" +
    "<g fill='#ffc9c0'><path d='M31 27 29 17l9 5z'/><path d='M65 27 67 17l-9 5z'/></g>" +
    "<ellipse cx='48' cy='51' rx='26' ry='24' fill='#f8b268'/>" +
    "<ellipse cx='48' cy='59' rx='15' ry='11' fill='#fff4e6'/>" +
    eyes(46) +
    "<path d='M44.4 54.6h7.2L48 59z' fill='#e0736f'/>" +
    smile(59) +
    whiskers(54, "#e5a071") +
    blush(56, 21),
  ),

  /** 柴犬 */
  shiba: draw(
    backdrop("#ffeed6") +
    "<g fill='#d9873c'><path d='M25 41 19 14l20 10z'/><path d='M71 41 77 14 57 24z'/></g>" +
    "<ellipse cx='48' cy='52' rx='26' ry='23' fill='#e8a352'/>" +
    "<ellipse cx='48' cy='60' rx='16' ry='12' fill='#fff6e8'/>" +
    "<g fill='#fff6e8'><ellipse cx='38' cy='40' rx='5' ry='2.9'/><ellipse cx='58' cy='40' rx='5' ry='2.9'/></g>" +
    eyes(47) +
    "<ellipse cx='48' cy='55' rx='4.6' ry='3.4' fill='#3a2c22'/>" +
    smile(58.6) +
    "<path d='M45.4 63.6h5.2v3.6a2.6 2.6 0 0 1-5.2 0z' fill='#ff8f9c'/>" +
    blush(56, 21),
  ),

  /** 兔子 */
  rabbit: draw(
    backdrop("#ffe3ee") +
    "<g fill='#fdfdfd'><ellipse cx='37' cy='21' rx='6.6' ry='17'/><ellipse cx='59' cy='21' rx='6.6' ry='17'/></g>" +
    "<g fill='#ffbcd2'><ellipse cx='37' cy='22' rx='3' ry='12'/><ellipse cx='59' cy='22' rx='3' ry='12'/></g>" +
    "<ellipse cx='48' cy='55' rx='24' ry='22' fill='#fdfdfd'/>" +
    eyes(51, 9.5) +
    "<path d='M44.8 57h6.4L48 61z' fill='#ff8fae'/>" +
    smile(61, 5) +
    whiskers(58, "#f0b6c8") +
    blush(60, 17),
  ),

  /** 熊猫 */
  panda: draw(
    backdrop("#e8f1f6") +
    "<g fill='#2f3540'><circle cx='28' cy='28' r='10'/><circle cx='68' cy='28' r='10'/></g>" +
    "<ellipse cx='48' cy='54' rx='26' ry='24' fill='#fdfdfd'/>" +
    "<g fill='#2f3540'><ellipse cx='37' cy='49' rx='8.4' ry='10' transform='rotate(-14 37 49)'/><ellipse cx='59' cy='49' rx='8.4' ry='10' transform='rotate(14 59 49)'/></g>" +
    "<g fill='#fff'><circle cx='37.6' cy='48.6' r='3.3'/><circle cx='58.4' cy='48.6' r='3.3'/></g>" +
    "<g fill='#2f3540'><circle cx='38' cy='49' r='1.7'/><circle cx='58.8' cy='49' r='1.7'/></g>" +
    "<ellipse cx='48' cy='60' rx='4.4' ry='3.2' fill='#2f3540'/>" +
    smile(63.4, 5.2),
  ),

  /** 狐狸 */
  fox: draw(
    backdrop("#ffe7d0") +
    "<g fill='#e3703a'><path d='M26 37 20 10l20 13z'/><path d='M70 37 76 10 56 23z'/></g>" +
    "<g fill='#8d4322'><path d='M29 30 27 18l9 5z'/><path d='M67 30 69 18l-9 5z'/></g>" +
    "<ellipse cx='48' cy='50' rx='25' ry='22' fill='#f0803f'/>" +
    "<path d='M32 56q16-6 32 0-5 16-16 20-11-4-16-20z' fill='#fff6ec'/>" +
    eyes(46) +
    "<ellipse cx='48' cy='68' rx='4' ry='3' fill='#33261d'/>" +
    smile(71, 4.6) +
    blush(55, 21),
  ),

  /** 棕熊 */
  bear: draw(
    backdrop("#f2e2d1") +
    "<g fill='#a9764f'><circle cx='27' cy='27' r='10'/><circle cx='69' cy='27' r='10'/></g>" +
    "<g fill='#e0b493'><circle cx='27' cy='27' r='5'/><circle cx='69' cy='27' r='5'/></g>" +
    "<ellipse cx='48' cy='53' rx='26' ry='23' fill='#b9835a'/>" +
    "<ellipse cx='48' cy='61' rx='14' ry='11' fill='#f4dcc4'/>" +
    eyes(48) +
    "<ellipse cx='48' cy='57.4' rx='4.6' ry='3.4' fill='#4a3527'/>" +
    smile(61, 5.2) +
    blush(57, 21),
  ),

  /** 小鸟 */
  bird: draw(
    backdrop("#dff1f5") +
    "<path d='M48 26q-5-9 1-14-1 7 5 9z' fill='#4fb3d4'/>" +
    "<ellipse cx='48' cy='54' rx='24' ry='23' fill='#6fc9e8'/>" +
    "<ellipse cx='48' cy='62' rx='15' ry='13' fill='#fdfdfd'/>" +
    "<g fill='#4fb3d4'><path d='M25 52q-7 7-1 15 5-5 5-13z'/><path d='M71 52q7 7 1 15-5-5-5-13z'/></g>" +
    eyes(48, 9) +
    "<path d='M43.2 55.4h9.6L48 62.4z' fill='#ffb340'/>" +
    blush(60, 18),
  ),

  /** 考拉 */
  koala: draw(
    backdrop("#eceff4") +
    "<g fill='#9aa5b1'><circle cx='24' cy='32' r='12'/><circle cx='72' cy='32' r='12'/></g>" +
    "<g fill='#cfd6de'><circle cx='24' cy='32' r='6.5'/><circle cx='72' cy='32' r='6.5'/></g>" +
    "<ellipse cx='48' cy='54' rx='25' ry='23' fill='#aab5c1'/>" +
    eyes(46) +
    "<ellipse cx='48' cy='59.5' rx='7' ry='9' fill='#4b535d'/>" +
    blush(56, 20),
  ),
} as const;
