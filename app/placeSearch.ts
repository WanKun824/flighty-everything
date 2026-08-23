/**
 * 地名搜索：把用户用任意语言打进来的地名，变成能落到地图上的候选。
 *
 * 这里每条规则都是拿真实 Mapbox API 试出来的，不是推的。八个实测结论决定了整个设计：
 *
 * 1. language 必须按「用户打的是什么文字」选，不是按界面语言。「京都駅」配 language=ja
 *    第一条就是京都站；配 zh-Hans 只能返回福知山市駅前町。
 * 2. Mapbox 的 POI 索引几乎没有中文名。「香港国际机场」「北京首都国际机场」「成田国际机场」
 *    全都查不到，返回的中文 POI 是马来西亚和新加坡的华人商铺 —— 数据里没有，
 *    任何参数组合都救不回来，proximity 也不管用（东京 proximity 照样返回吉隆坡）。
 * 3. 但把中文通名整词换成日文通名、再把简体字形转成新字体，命中率立刻拉满：
 *    「成田国际机场」→「成田空港」、「京都站」→「京都駅」、「宫浦港」→「宮浦港」，
 *    三个都精确命中第一条。日本地名在 Mapbox 里只有日文字形，差一个字就查不到。
 * 4. 日本之外没有字形桥可搭，但有查表这条路。「巴黎戴高乐机场」→「Charles de Gaulle
 *    Airport」直接命中那座机场本身。规范英文名是可靠的桥；IATA 三字码不是，碰撞太狠
 *    （MEL→马六甲、DEL→里斯本、PEK→伊利诺伊州的 Pekin），整类不能用。见 EXONYMS。
 * 5. 大中华区的枢纽 POI 在 Mapbox 里完全没有，桥的只能是查询范围而不是名字。
 *    「北京首都国际机场」不收窄时真正的北京市连前十都进不去，返回的是伊利诺伊州和
 *    爱荷华州两个叫「北京」的小镇；加上 country=cn 第一条就对。见 SCOPES。
 * 6. Geocoding v6 的行政地名有扎实的多语言覆盖。桥表没覆盖到的枢纽，剥掉通名后缀至少能
 *    落到城市级：位置对得上，精度退一档 —— 对行程规划这是可用结果，不是错误结果。
 * 7. 改写出来的命中必须按「改写后的说法」打分，不能按原始输入。拿「京都站」给「京都駅」
 *    打分只有 41 分，反被「京都市」的 69 分压掉 —— 专门用来救场的那一路自己被扣死了。
 *    兜底说法（剥掉通名）要折价，否则「成田」这个街区会盖过成田空港。
 * 8. 名字整个就是一个通名的结果必须丢掉。查「成田国际机场」，Geocoding 会返回一个真的
 *    叫「机场」的马德里街区：通名全匹上、逐字重叠算 100%，一路冲到第一名。
 * 9. 通名要只看结尾。「関西空港駅」整串里有「空港」，按整串判会判成机场，于是查
 *    「关西国际机场」时它会顶掉真正的関西国際空港 —— 结尾是駅，它就是车站。
 *
 * 所以策略是：一次输入并发查几种「说法」，POI 交给 Search Box（只在文字和索引同语言时才灵），
 * 行政地名交给 Geocoding v6（跨语言可靠），回来的东西按各自的说法打分、去重、排序。
 *
 * 已知的精度上限：中国大陆、香港、台湾的枢纽只能给到城市／区一级。那些 POI 在 Mapbox 的
 * 索引里就是没有 —— 中文名、英文名、IATA 码全试过。这是数据决定的，不是打分没调好。
 * 而且不能拿英文名硬凑：「Beijing Capital International Airport」会命中密歇根州的
 * Capital Region International Airport，错得比精度低更糟。
 */

export type Engine = "poi" | "geocode";

/**
 * 一种「说法」：查什么文字、按哪个语言、投给哪个引擎。
 *
 * fidelity 是这个说法有多忠于原意。改写字形（成田国际机场→成田空港）意思一模一样，算 1；
 * 剥掉通名（→成田）是故意丢信息的兜底，算 .55 —— 打分时按它折价，
 * 否则「成田」这个街区会精确命中兜底查询、反过来压掉真正的机场。
 */
export type Variant = {
  q: string;
  language: string;
  engines: Engine[];
  fidelity: number;
  /**
   * 这个说法是查表查出来的当地写法，不是从用户输入推的。
   * 意思是「这个查询发出去就能命中那个枢纽」—— 所以命中不按文字相似度打分，见 rankHits。
   */
  trust?: true;
  /** 把查询收窄到这个国家/地区（ISO 两字码）。见 SCOPES。 */
  country?: string;
};

/** 两个引擎归一后的候选。 */
export type PlaceHit = {
  id: string;
  name: string;
  address: string;
  featureType: string;
  categories: string[];
  /** Geocoding 直接给坐标；Search Box 的 suggestion 要再调一次 retrieve 才有。 */
  coordinate?: [number, number];
  engine: Engine;
  /** 是哪个说法查出来的。打分要用 —— 见 rankHits。 */
  query?: string;
  fidelity?: number;
  /** 是别名桥查出来的。打分走 trusted 分支，不比文字。 */
  trusted?: boolean;
  /** 在它那一批返回里的位置。Mapbox 自己按相关度排过序，同分时用它兜。 */
  rank?: number;
  score: number;
};

/* ---------- 书写系统 → 语言 ---------- */

/**
 * 假名必须排在汉字之前：日文正文里混着汉字，但只要出现假名就一定是日文。
 *
 * 中间那条「日文专用写法」是必需的，不是锦上添花：「京都駅」通篇汉字、一个假名都没有，
 * 只靠码位区间会被判成中文，而它配 zh-Hans 只能查到福知山市駅前町，配 ja 第一条就是京都站。
 * 字形那一组都是简体中文里不出现的形 —— 駅 対 站/驿、沢 対 泽、浜 対 滨、桜 対 樱、
 * 竜 対 龙、円 対 圆 —— 加上 々〆ヶ 这些日文专有符号，误判风险接近零。
 * 「空港」「丁目」是有意收进来的例外：中日都写得出，但「成田空港」这种输入配 ja 才查得到，
 * 代价是国内少数带「空港」的地名（空港新城之类）会走 ja —— 那些地方中文覆盖本来就差，划得来。
 */
const SCRIPTS: Array<[RegExp, string]> = [
  [/[぀-ヿㇰ-ㇿ]/, "ja"],
  [/[々〆ヶヵ駅円沢浜桜竜峠辻込畑﨑]|空港|丁目/, "ja"],
  [/[가-힯ᄀ-ᇿ㄰-㆏]/, "ko"],
  [/[Ѐ-ӿ]/, "ru"],
  [/[؀-ۿݐ-ݿ]/, "ar"],
  [/[฀-๿]/, "th"],
  [/[ऀ-ॿ]/, "hi"],
  [/[֐-׿]/, "he"],
  [/[Ͱ-Ͽ]/, "el"],
  [/[㐀-䶿一-鿿豈-﫿]/, "zh-Hans"],
];

/**
 * 搜什么文字就用什么语言：这样返回的名字和用户输入对得上，比强行本地化好认。
 * 拉丁字母一律落到 en —— 它是 Mapbox POI 索引里唯一的通用语言，覆盖最广。
 */
export function queryLanguage(query: string): string {
  for (const [pattern, language] of SCRIPTS) if (pattern.test(query)) return language;
  return "en";
}

/** 中日韩泰不用空格分词，一个字就是一个有意义的查询；拉丁语得等到两个字母。 */
export function minQueryLength(query: string): number {
  return /[぀-ヿ가-힯฀-๿一-鿿]/.test(query) ? 1 : 2;
}

/* ---------- 通名后缀 ---------- */

/**
 * 交通枢纽的通名。剥掉它剩下的是专名，专名跨语言的命中率高得多 ——
 * 「巴黎戴高乐机场」整串查不到，剥成「巴黎戴高乐」还是查不到，但配合下面的
 * 行政地名引擎至少能落到巴黎。长的排前面，否则「国际机场」会被「机场」先吃掉。
 */
const HUB_SUFFIXES = [
  "国际机场", "國際機場", "国际空港", "國際空港", "国际航站楼", "机场", "機場", "空港",
  "火车站", "火車站", "高铁站", "高鐵站", "客运站", "汽车站", "巴士站", "车站", "車站", "站", "駅", "역",
  "渡轮码头", "轮渡码头", "国际码头", "码头", "碼頭", "港口", "港", "터미널",
  "international airport", "airport", "railway station", "train station", "central station",
  "ferry terminal", "cruise terminal", "terminal", "station", "harbour", "harbor", "port",
];

/** 剥掉通名后缀；没有后缀、或剥完就空了就返回 null（不值得再发一次请求）。 */
export function stripHubSuffix(query: string): string | null {
  const lower = query.toLowerCase();
  for (const suffix of HUB_SUFFIXES) {
    if (!lower.endsWith(suffix)) continue;
    const proper = query.slice(0, query.length - suffix.length).trim().replace(/[·・\-–—,，]+$/, "").trim();
    return proper && proper !== query ? proper : null;
  }
  return null;
}

export type HubKind = "airport" | "station" | "port" | "";

/**
 * 行政区划通名。「北京市」和「北京」是同一个地方，比对时要能互认。
 *
 * 实测：查「北京首都国际机场」，真正的「北京市」因为多了个「市」字掉到部分匹配那一档
 * （41 分），反被伊利诺伊州那个正好叫「北京」的小镇（102 分）压掉 —— 中文用户搜北京
 * 首得到美国的 Beijing，比查不到还糟。它不是排序问题，是「市」字被当成了不匹配的字。
 */
const ADMIN_TAIL = /(市|區|区|縣|县|都|府|州|省|郡|시|구)$|\s+(city|prefecture|province|county|oblast)$/i;

/**
 * 只看结尾那个通名属于哪一类。
 *
 * 必须只看结尾，不能看整串：日文里机场旁边的车站就叫「関西空港駅」，
 * 整串里有「空港」，按整串判会判成机场，于是查「关西国际机场」时那个车站
 * 会顶掉真正的関西国際空港 —— 实测就是这么错的。结尾是駅，它就是车站。
 */
export function tailKind(value: string): HubKind {
  const tail = value.toLowerCase().trim();
  if (/(空港|机场|機場|airport|airfield|aerodrome)$/.test(tail)) return "airport";
  if (/(駅|站|역|station|bahnhof)$/.test(tail)) return "station";
  if (/(港|码头|碼頭|터미널|port|harbou?r|terminal|pier|quay|dock)$/.test(tail)) return "port";
  return "";
}

/* ---------- 中文 → 日文 ---------- */

/** 通名得整词换：机场在日文里是空港，不是機場，光换字形查不到。 */
const JA_WORDS: Array<[RegExp, string]> = [
  [/国际机场|國際機場|国际空港|國際空港/g, "空港"],
  [/机场|機場/g, "空港"],
  [/火车站|火車站|高铁站|高鐵站|车站|車站|站/g, "駅"],
  [/码头|碼頭|渡轮码头/g, "港"],
];

/** 简体 → 日本新字体，只收日本地名里高频、且两边字形确实不同的字。 */
const JA_CHARS: Record<string, string> = {
  东: "東", 广: "広", 关: "関", 铁: "鉄", 长: "長", 门: "門", 阳: "陽", 岛: "島",
  宫: "宮", 泽: "沢", 滨: "浜", 龙: "竜", 泷: "滝", 桥: "橋", 丰: "豊", 边: "辺",
  县: "県", 车: "車", 驿: "駅", 冈: "岡", 际: "際", 场: "場", 机: "機", 汤: "湯",
  馆: "館", 园: "園", 岭: "嶺", 泾: "涇", 义: "義", 户: "戸", 岁: "歳", 荣: "栄",
};

/**
 * 把中文写法改写成日文写法。
 * 顺序不能反：先整词换通名（机场→空港），再逐字换字形，否则「机场」会先被拆成「機場」。
 */
export function toJapanese(query: string): string {
  let value = query;
  for (const [pattern, replacement] of JA_WORDS) value = value.replace(pattern, replacement);
  return [...value].map((character) => JA_CHARS[character] ?? character).join("");
}

/* ---------- 中文别名 → 当地写法 ---------- */

/**
 * 枢纽的中文叫法查不到，因为 Mapbox 的 POI 索引里根本没有这些中文名。日本能靠改字形
 * 救回来（見 toJapanese），法国、韩国、美国救不回来 —— 中文到法文没有字形桥可搭。
 * 那就不推，改成查表：一张中文专名 → 当地/规范写法的对照表。
 *
 * 三条定表的规矩，都是探出来的：
 *
 * 1. 值必须是「Mapbox 真能查到这个枢纽」的写法，一条条对着真实 API 试过才敢写进来。
 *    IATA 三字码看着最省事，实际碰撞极严重：MEL→马六甲、HAN→汉诺威、DEL→里斯本、
 *    PEK→伊利诺伊州的 Pekin、HND→内华达州的 Henderson。整类不能用。
 * 2. 值查回来的名字不一定等于值本身：Mapbox 会把车站名本地化成英文，
 *    「Gare du Nord」返回的是「Northern Station」、「Zurich Hauptbahnhof」返回
 *    「Zurich Main Station」。所以这一路的命中不能按文字相似度打分（见 rankHits 的
 *    trusted 分支）—— 本来就没有文字关系，这张表就是替代文字关系的那个东西。
 * 3. 键要按结尾通名分类匹配。「马德里机场」和「马德里火车站」专名一样、要的东西不一样，
 *    只按专名匹会把火车站查询定位到机场去。
 *
 * 表里没有日本：日本的枢纽英文名在 Mapbox 里同样查不到（Narita / Haneda / Chubu
 * Centrair 全空），但它们已经被字形桥精确命中了，重复收录只会白发一个请求。
 *
 * 表里也没有中国大陆、香港、台湾：那些枢纽在 Mapbox 的 POI 索引里确实不存在，
 * 任何写法都查不出来。更要小心的是「Beijing Capital International Airport」会命中
 * 密歇根州的 Capital Region International Airport —— 错得比查不到更糟，所以不能收。
 */
const EXONYMS: Array<[string, string, HubKind]> = [
  // —— 法国、英国 ——
  ["戴高乐", "Charles de Gaulle Airport", "airport"],
  ["奥利", "Paris Orly Airport", "airport"],
  ["希思罗", "London Heathrow Airport", "airport"],
  ["希斯路", "London Heathrow Airport", "airport"],
  ["盖特威克", "London Gatwick Airport", "airport"],
  ["格域", "London Gatwick Airport", "airport"],
  ["巴黎北", "Gare du Nord", "station"],
  ["巴黎里昂", "Gare de Lyon", "station"],
  ["国王十字", "London King's Cross", "station"],
  ["圣潘克拉斯", "London King's Cross", "station"],
  // —— 德语区、荷兰、北欧 ——
  ["法兰克福", "Frankfurt Airport", "airport"],
  ["慕尼黑", "Munich Airport", "airport"],
  ["史基浦", "Amsterdam Airport Schiphol", "airport"],
  ["斯希普霍尔", "Amsterdam Airport Schiphol", "airport"],
  ["阿姆斯特丹", "Amsterdam Airport Schiphol", "airport"],
  ["苏黎世", "Zurich Airport", "airport"],
  ["维也纳", "Vienna International Airport", "airport"],
  ["哥本哈根", "Copenhagen Airport", "airport"],
  ["阿兰达", "Stockholm Arlanda Airport", "airport"],
  ["斯德哥尔摩", "Stockholm Arlanda Airport", "airport"],
  ["赫尔辛基", "Helsinki Airport", "airport"],
  ["柏林中央", "Berlin Hauptbahnhof", "station"],
  ["苏黎世中央", "Zurich Hauptbahnhof", "station"],
  ["阿姆斯特丹中央", "Amsterdam Centraal", "station"],
  // —— 南欧、土耳其 ——
  ["巴拉哈斯", "Madrid-Barajas International Airport", "airport"],
  ["马德里", "Madrid-Barajas International Airport", "airport"],
  ["埃尔普拉特", "Barcelona El Prat Josep Tarradellas Airport", "airport"],
  ["巴塞罗那", "Barcelona El Prat Josep Tarradellas Airport", "airport"],
  ["菲乌米奇诺", "Rome Fiumicino Airport", "airport"],
  ["罗马", "Rome Fiumicino Airport", "airport"],
  ["马尔彭萨", "Milan Malpensa Airport", "airport"],
  ["米兰", "Milan Malpensa Airport", "airport"],
  ["伊斯坦布尔", "Istanbul Airport", "airport"],
  ["特米尼", "Roma Termini", "station"],
  ["罗马中央", "Roma Termini", "station"],
  ["米兰中央", "Milano Centrale", "station"],
  ["桑茨", "Barcelona Sants", "station"],
  ["阿托查", "Madrid Atocha", "station"],
  // —— 中东 ——
  ["迪拜", "Dubai International Airport", "airport"],
  ["阿布扎比", "Zayed International Airport", "airport"],
  ["扎耶德", "Zayed International Airport", "airport"],
  ["多哈", "Doha International Airport", "airport"],
  // —— 北美 ——
  ["肯尼迪", "John F. Kennedy International Airport", "airport"],
  ["甘迺迪", "John F. Kennedy International Airport", "airport"],
  ["纽瓦克", "Newark Liberty International Airport", "airport"],
  ["拉瓜迪亚", "LaGuardia Airport", "airport"],
  ["洛杉矶", "Los Angeles International Airport", "airport"],
  ["旧金山", "San Francisco International Airport", "airport"],
  ["三藩市", "San Francisco International Airport", "airport"],
  ["西雅图", "Seattle-Tacoma International Airport", "airport"],
  ["奥黑尔", "Chicago O'Hare International Airport", "airport"],
  ["芝加哥", "Chicago O'Hare International Airport", "airport"],
  ["洛根", "Logan International Airport", "airport"],
  ["波士顿", "Logan International Airport", "airport"],
  ["杜勒斯", "Dulles International Airport", "airport"],
  ["亚特兰大", "Hartsfield-Jackson Atlanta International Airport", "airport"],
  ["达拉斯", "Dallas Fort Worth International Airport", "airport"],
  ["皮尔逊", "Toronto Pearson International Airport", "airport"],
  ["多伦多", "Toronto Pearson International Airport", "airport"],
  ["温哥华", "Vancouver International Airport", "airport"],
  // —— 大洋洲 ——
  ["悉尼", "Sydney Airport", "airport"],
  ["墨尔本", "Melbourne Airport", "airport"],
  ["奥克兰", "Auckland Airport", "airport"],
  // —— 东南亚、南亚、韩国 ——
  ["樟宜", "Singapore Changi Airport", "airport"],
  ["新加坡", "Singapore Changi Airport", "airport"],
  ["吉隆坡", "Kuala Lumpur International Airport", "airport"],
  ["素万那普", "Suvarnabhumi Airport", "airport"],
  ["曼谷", "Suvarnabhumi Airport", "airport"],
  ["廊曼", "Don Mueang International Airport", "airport"],
  ["新山一", "Tan Son Nhat International Airport", "airport"],
  ["胡志明", "Tan Son Nhat International Airport", "airport"],
  ["内排", "Noi Bai International Airport", "airport"],
  ["河内", "Noi Bai International Airport", "airport"],
  ["仁川", "Incheon International Airport", "airport"],
  ["金浦", "Gimpo International Airport", "airport"],
  ["英迪拉", "Indira Gandhi International Airport", "airport"],
  ["德里", "Indira Gandhi International Airport", "airport"],
  ["孟买", "Chhatrapati Shivaji Maharaj International Airport", "airport"],
  ["首尔", "Seoul Station", "station"],
  /**
   * 只写城市名的车站查询：「马德里火车站」。这些键刻意放在最后 ——
   * 长键优先，所以「马德里阿托查站」还是走上面那条精确的，这里只兜没指名的情况。
   * 每座城市取它的中央车站，也就是中文用户说「XX 火车站」时默认想去的那个。
   * 巴黎是唯一有歧义的（六个终点站），取北站：欧洲之星和跨国列车从这里发车。
   */
  ["马德里", "Madrid Atocha", "station"],
  ["巴塞罗那", "Barcelona Sants", "station"],
  ["罗马", "Roma Termini", "station"],
  ["米兰", "Milano Centrale", "station"],
  ["柏林", "Berlin Hauptbahnhof", "station"],
  ["苏黎世", "Zurich Hauptbahnhof", "station"],
  ["阿姆斯特丹", "Amsterdam Centraal", "station"],
  ["巴黎", "Gare du Nord", "station"],
];

/**
 * 查表：专名对上、而且结尾通名的类别也对上，才算命中。
 *
 * 长键优先，否则「巴黎北站」会先被短键匹掉。类别必须对上是防串档的：
 * 「马德里机场」和「马德里火车站」在表里是两条不同的记录。
 */
export function exonymOf(query: string): string | null {
  const kind = tailKind(query);
  if (!kind) return null;
  const lower = query.trim().toLowerCase();
  let best: { key: string; value: string } | null = null;
  for (const [key, value, entryKind] of EXONYMS) {
    if (entryKind !== kind || !query.includes(key)) continue;
    if (!best || key.length > best.key.length) best = { key, value };
  }
  // 用户直接打了当地写法时别再重发一遍同样的查询。
  return best && best.value.toLowerCase() !== lower ? best.value : null;
}

/* ---------- 大中华区：按国家/地区收窄 ---------- */

/**
 * 大中华区的枢纽是另一种情况：Mapbox 的 POI 索引里根本没有它们，任何名字都查不出来 ——
 * 中文名、英文名、IATA 码全试过。所以这里桥的不是名字，是查询范围。
 *
 * 实测「北京首都国际机场」不收窄时返回的是：仁川机场高速、马德里那个叫「机场」的街区、
 * 澳洲和印度的机场路、伊利诺伊州和爱荷华州两个正好叫「北京」的小镇 —— 真正的北京市
 * 连前十都进不去。加上 country=cn，第一条就是北京市。上海、广州、台北、香港同理。
 *
 * 所以匹上这张表就把整轮查询收窄到那个国家/地区，顺带跳过日文改写 ——
 * 中国的枢纽不会有日文写法，那两个请求只会带回「海浦（日本熊本县）」这类噪音。
 * 结果精度停在城市/区一级，这是数据决定的上限，不是打分没调好。
 */
const SCOPES: Array<[string[], string]> = [
  [["香港", "九龙", "九龍", "新界", "赤鱲角"], "hk"],
  [["澳门", "澳門"], "mo"],
  [["台北", "桃园", "桃園", "松山", "高雄", "台中", "台南", "花莲", "台东"], "tw"],
  [[
    "北京", "上海", "广州", "深圳", "成都", "重庆", "西安", "杭州", "南京", "武汉",
    "长沙", "青岛", "厦门", "昆明", "三亚", "天津", "大连", "沈阳", "哈尔滨", "郑州",
    "济南", "合肥", "福州", "南宁", "贵阳", "兰州", "乌鲁木齐", "呼和浩特", "拉萨",
    "银川", "西宁", "太原", "石家庄", "南昌", "温州", "宁波", "无锡", "苏州", "珠海",
    "桂林", "丽江", "张家界", "敦煌", "喀什", "西双版纳", "大理", "海口", "烟台", "洛阳",
  ], "cn"],
];

/** 这个中文枢纽查询属于哪个国家/地区。不是枢纽查询就不收窄 —— 光打城市名该照常搜全球。 */
export function scopeOf(query: string): string | null {
  if (!tailKind(query)) return null;
  for (const [names, country] of SCOPES) {
    if (names.some((name) => query.includes(name))) return country;
  }
  return null;
}

/* ---------- 查询计划 ---------- */

/**
 * 一次输入要发几个请求。最多 5 个，都是几百字节的 GET，而且输入防抖过、
 * 下一个键会 abort 上一批 —— 换来的是跨语言从「查不到」到「第一条就对」。
 */
export function queryVariants(raw: string): Variant[] {
  const query = raw.trim().replace(/\s+/g, " ");
  if (!query) return [];
  const language = queryLanguage(query);
  // 大中华区的枢纽：整轮收窄到那个国家/地区，否则同名的外国小镇会顶掉真正的城市。
  const country = language === "zh-Hans" ? scopeOf(query) : null;
  const plan: Variant[] = [{ q: query, language, engines: ["poi", "geocode"], fidelity: 1, country: country ?? undefined }];
  const seen = new Set([`${query}|${language}`]);
  const push = (variant: Variant) => {
    const key = `${variant.q}|${variant.language}`;
    if (!variant.q || seen.has(key)) return;
    seen.add(key);
    plan.push(variant);
  };

  // 别名桥：中文枢纽名换成查得到的当地写法。这一路和下面的日文改写是二选一 ——
  // 表里查到了就说明这个枢纽的当地写法是已知的，再去猜字形没有意义，也白发一个请求。
  const exonym = exonymOf(query);
  if (exonym) push({ q: exonym, language: "en", engines: ["poi"], fidelity: 1, trust: true });
  // 汉字查询：换成日文写法再查一遍，POI 和行政地名都要 —— 「宫浦」查出横须贺，
  // 「宮浦」查出直岛的宮浦港，差的就是一个字形。意思没变，所以 fidelity 是满的。
  // 已经确定是大中华区的枢纽就别改了：中国的枢纽没有日文写法，只会带回噪音。
  else if (language === "zh-Hans" && !country) {
    const japanese = toJapanese(query);
    if (japanese !== query) push({ q: japanese, language: "ja", engines: ["poi", "geocode"], fidelity: 1 });
  }
  // 专名单独查一次行政地名：枢纽全名跨语言查不到时，这一路保底给出城市级的正确位置。
  // 它丢掉了通名，所以打分要折价，不然兜底结果会盖过真正的枢纽。
  // 收窄要一路带下去：兜底那一路同样会撞上同名的外国地名。
  const proper = stripHubSuffix(query);
  if (proper) push({ q: proper, language, engines: ["geocode"], fidelity: .55, country: country ?? undefined });
  return plan;
}

/* ---------- 打分与合并 ---------- */

const normalize = (value: string) =>
  value.toLowerCase().replace(/[\s·・,，.。、\-–—_'"()（）【】[\]]/g, "");

const tokensOf = (value: string) => value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** 逐字取交集：中日韩没有词边界，只能按字算重叠。 */
function charOverlap(name: string, query: string): number {
  const pool = [...query];
  let shared = 0;
  for (const character of name) {
    const at = pool.indexOf(character);
    if (at >= 0) { pool.splice(at, 1); shared += 1; }
  }
  return shared / Math.max(1, [...name].length);
}

/**
 * 通名词。拉丁部分必须带词边界：不带的话 /station/ 会匹上 Stationery，
 * 「Kyoto Station」就是这么匹到巴西文具店的。中日韩不需要边界，\b 对它们也无效。
 *
 * 这张表和 HUB_SUFFIXES 是耦合的：下面 scoreHit 拿「匹上这张表、却剥不掉后缀」
 * 当「整个名字就是通名」的判据。所以往这张表里加词之前，先确认 HUB_SUFFIXES
 * 剥得掉它。试过加 bahnhof／gare／flughafen，结果是 Berlin Hauptbahnhof 这种
 * 真车站被整条丢掉 —— 那三个词的通名判定交给 tailKind，它本来就认得。
 */
const HUB_WORDS = /\b(airports?|airfields?|aerodromes?|railways?|rail|trains?|stations?|metro|subway|tram|bus|coach|ferry|ferries|terminals?|ports?|harbou?rs?|piers?|quays?|docks?)\b|空港|機場|机场|駅|车站|車站|站|码头|碼頭|港口|港|터미널|공항|역/i;

/** 行程站点通常是行政地名这一级。 */
const PLACE_TYPES = new Set(["country", "region", "district", "place", "locality", "city", "neighborhood"]);
/** 门牌号、路名、邮编几乎不会被当成行程站点。 */
const WEAK_TYPES = new Set(["street", "address", "postcode", "block", "brand", "category"]);

/**
 * 强匹配四档：完全一致、名字以查询开头、查询以名字开头、名字里含查询。
 * 判不出来返回 null，交给下面的模糊匹配。
 */
function strongTier(name: string, q: string): number | null {
  if (!name) return null;
  if (name === q) return 140;
  if (name.startsWith(q)) return 100;
  if (q.startsWith(name)) return 74;
  if (name.includes(q)) return 55;
  return null;
}

/**
 * 名字和查询有多像，只看文字。返回 null 表示一个字都不沾，这条直接丢掉。
 *
 * 分档而不是算一个连续的相似度：用户打的是前缀、是全名、还是只沾了几个字，
 * 是性质不同的三件事，中间的灰度没有意义。分数可以是负的 —— 后面的类型、
 * 类目加分还有机会把它捞回来，这里不提前截断。
 */
function textTier(name: string, query: string, q: string): number | null {
  const strong = strongTier(name, q);
  if (strong !== null) return strong;
  // 拉丁语按词、中日韩按字，取宽松的那个；一点都不沾就是噪音，直接丢掉。
  const words = tokensOf(query).filter((token) => token.length > 1);
  const byWord = words.length ? words.filter((token) => name.includes(token)).length / words.length : 0;
  const ratio = Math.max(byWord, charOverlap(name, q));
  if (ratio < .34) return null;
  /**
   * 名字比查询短很多，说明它只解释了查询的一小截 ——「关西国际机场」返回一个叫「西」的
   * 东京街区，逐字重叠是 100%，覆盖率只有六分之一。这一惩罚只加在部分匹配这一支：
   * q.startsWith(name) 那一支（「巴黎」対「巴黎戴高乐机场」）是我们要的城市级兜底，不能罚。
   */
  const shrink = [...name].length / [...q].length;
  return Math.round(ratio * 62) - (shrink < .5 ? Math.round((.5 - shrink) * 140) : 0);
}

export function scoreHit(query: string, hit: Omit<PlaceHit, "score">): number {
  const q = normalize(query);
  const name = normalize(hit.name);
  if (!q || !name) return 0;

  /**
   * 名字整个就是一个通名：「成田国际机场」会返回一个叫「机场」的马德里街区，
   * 「关西国际机场」会返回叫「空港」的东西。它把通名全匹上了，逐字重叠算出 100%，
   * 专名却一个字没匹到 —— 这不是地点，是标签。用户真就打了「机场」两个字的话
   * （name === q）还是给他看，那时候它是唯一能给的东西。
   */
  if (name !== q && HUB_WORDS.test(hit.name) && !stripHubSuffix(hit.name)) return 0;

  /**
   * 剥掉行政通名的形式再比一次，取高的：「北京市」対「北京」不该因为一个「市」字掉档。
   *
   * 只让它参与强匹配那四档，不能进模糊匹配 —— 剥掉字会缩短分母、抬高逐字重叠率，
   * 「都匀市」剥成「都匀」重叠率就从 33% 跳到 50%，够格混进「北京首都国际机场」的
   * 结果里了。行政通名要解决的是「北京市 == 北京」这种同一性，不是相似度。
   */
  const core = normalize(hit.name.replace(ADMIN_TAIL, ""));
  const tiers = [textTier(name, query, q), core === name ? null : strongTier(core, q)]
    .filter((value): value is number => value !== null);
  if (!tiers.length) return 0;
  let score = Math.max(...tiers);

  // 名字比查询长很多，说明查询只是人家店名里的一小截。
  const bloat = name.length / q.length;
  if (bloat > 1.6) score -= Math.min(60, Math.round((bloat - 1.6) * 34));

  if (PLACE_TYPES.has(hit.featureType)) score += 28;
  if (WEAK_TYPES.has(hit.featureType)) score -= 42;
  /**
   * 用户搜的是枢纽、结果自己也是枢纽 —— 最强的一条信号，但证据分两档。
   * 类目是硬证据：Mapbox 标了 train station 就是车站。名字像只是弱证据 ——
   * 叫「Seoul Station」的有首尔那座车站，也有斯特拉斯堡和科罗拉多的韩餐馆，
   * 三个名字一字不差，只有类目能把真的挑出来。
   */
  if (HUB_WORDS.test(query)) {
    if (hit.categories.some((category) => HUB_WORDS.test(category))) score += 46;
    else if (HUB_WORDS.test(hit.name)) score += 24;
  }
  /**
   * 查的是哪一类枢纽，就该给哪一类枢纽加分。
   * 实测：查「关西国际机场」时「関西空港駅」按前缀匹到 100 分，把真正的「関西国際空港」
   * （只有 41 分的部分匹配）压在后面 —— 用户要的是机场，不是机场旁边那个车站。
   */
  const want = tailKind(query);
  const got = tailKind(hit.name);
  if (want && got) score += got === want ? 30 : -42;
  return score;
}

export const MAX_HITS = 8;

/**
 * 打分、去重、排序、截断。
 *
 * 每条候选按「原始输入」和「查出它的那个说法」各打一次分，取高的那个 ——
 * 这是跨语言能用的关键。「京都站」改写成「京都駅」才查得到京都站，但拿「京都站」
 * 给「京都駅」打分只有 41 分，反被「京都市」的 69 分压掉；按查出它的说法打就是 186 分。
 * 兜底说法的分要乘 fidelity 折价，否则剥完通名的「成田」会盖过成田空港。
 *
 * 去重键只能用「名字 + 地址前缀」，不能用坐标：Search Box 的 suggestion 根本没有坐标
 * （要再调一次 retrieve 才有），Geocoding 一定有 —— 谁有坐标就用坐标的话，同一个京都駅
 * 从两个引擎回来会算成两个键，一条都去不掉。地址前缀是两边都给得出的唯一公共字段。
 *
 * 同分时按 Mapbox 自己的相关度顺序兜：叫「巴黎」的城市法国、得州、田纳西州都有，
 * 名字一字不差，光看文字分不出高下，而 Mapbox 已经按知名度排过一次了。
 * 再同分就留有坐标的那条 —— 它能省掉一次 retrieve 往返。
 *
 * 别名桥查出来的命中（trusted）不比文字，这是它存在的全部意义：用户打的是「巴黎戴高乐机场」，
 * 回来的是「Charles de Gaulle Airport」，两串一个字符都不沾，文字打分只会给 0。
 * 那张表本身就是「这个查询命中这个枢纽」的证据，所以只验一件事 —— 类型对不对得上，
 * 别把机场查询定位到航站楼旁边的停车场去。剩下的交给 Mapbox 自己的相关度顺序。
 */
export function rankHits(raw: string, hits: Array<Omit<PlaceHit, "score">>): PlaceHit[] {
  const best = new Map<string, PlaceHit>();
  const wanted = tailKind(raw);
  for (const hit of hits) {
    const viaRaw = scoreHit(raw, hit);
    const viaVariant = hit.query && hit.query !== raw
      ? Math.round(scoreHit(hit.query, hit) * (hit.fidelity ?? 1))
      : 0;
    // 210 略低于文字精确命中的 216：用户自己打对了当地写法时，那一条还是该排第一。
    const viaBridge = hit.trusted && wanted && stopKindOf(hit.featureType, hit.categories, hit.name) === wanted
      ? 210 - Math.min(48, (hit.rank ?? 0) * 12)
      : 0;
    const score = Math.max(viaRaw, viaVariant, viaBridge);
    if (score <= 0) continue;
    const key = `${normalize(hit.name)}|${normalize(hit.address).slice(0, 12)}`;
    const previous = best.get(key);
    const better = !previous || score > previous.score
      || (score === previous.score && !previous.coordinate && hit.coordinate);
    if (better) best.set(key, { ...hit, score });
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, MAX_HITS);
}

/** 站点类型：决定用哪个图标、哪种载具默认接得上。机场要排在车站之前 —— 成田空港駅是车站，成田空港不是。 */
export function stopKindOf(featureType: string, categories: string[] = [], name = ""): "airport" | "station" | "port" | "place" {
  const haystack = `${featureType} ${categories.join(" ")} ${name}`.toLowerCase();
  if (/\bairports?\b|airfield|aerodrome|空港|機場|机场/.test(haystack)) return "airport";
  if (/\b(rail|railway|trains?|metro|subway|tram|stations?)\b|駅|车站|車站|역/.test(haystack)) return "station";
  if (/\b(ferry|ferries|ports?|harbou?rs?|piers?|quays?|terminals?)\b|码头|碼頭|港/.test(haystack)) return "port";
  return "place";
}
