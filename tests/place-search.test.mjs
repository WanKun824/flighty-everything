import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_HITS, exonymOf, minQueryLength, queryLanguage, queryVariants, rankHits,
  scopeOf, scoreHit, stopKindOf, stripHubSuffix, tailKind, toJapanese,
} from "../app/placeSearch.ts";

/**
 * 这一组测试锁的是拿真实 Mapbox API 试出来的结论，不是我的猜测。
 * 每条断言下面都写了对应的实测事实 —— 以后有人「优化」掉某条规则时，
 * 至少能看见它当初是为了修哪个具体的错。
 */

test("语言按用户打的文字选，不按界面语言", () => {
  // 实测：「京都駅」配 ja 第一条就是京都站，配 zh-Hans 只能返回福知山市駅前町。
  // 它一个假名都没有，全靠「駅 是日文专用字形」这条认出来 —— 去掉那条规则这里就会挂。
  assert.equal(queryLanguage("京都駅"), "ja", "通篇汉字的日文地名要靠专用字形认出来");
  assert.equal(queryLanguage("成田空港"), "ja", "「空港」是有意收的例外：配 ja 才查得到");
  assert.equal(queryLanguage("とうきょう"), "ja");
  assert.equal(queryLanguage("東京スカイツリー"), "ja", "混着汉字的日文必须判成 ja，不能被汉字规则抢走");
  assert.equal(queryLanguage("서울역"), "ko");
  assert.equal(queryLanguage("Шереметьево"), "ru");
  assert.equal(queryLanguage("สุวรรณภูมิ"), "th");
  assert.equal(queryLanguage("成田国际机场"), "zh-Hans", "简体通名不能被日文规则抢走，它要靠改写那一路");
  assert.equal(queryLanguage("北京首都国际机场"), "zh-Hans");
  assert.equal(queryLanguage("Charles de Gaulle"), "en", "拉丁字母一律 en：Mapbox POI 索引里它覆盖最广");
});
test("中日韩泰一个字就能搜，拉丁语要两个字母", () => {
  // 不区分的话「京」「駅」这种单字查询永远发不出去。
  assert.equal(minQueryLength("京"), 1);
  assert.equal(minQueryLength("駅"), 1);
  assert.equal(minQueryLength("역"), 1);
  assert.equal(minQueryLength("Ky"), 2);
});

test("剥掉通名后缀，长后缀优先", () => {
  assert.equal(stripHubSuffix("成田国际机场"), "成田", "「国际机场」要整个剥掉，不能只剥「机场」留下「成田国际」");
  assert.equal(stripHubSuffix("京都站"), "京都");
  assert.equal(stripHubSuffix("宫浦港"), "宫浦");
  assert.equal(stripHubSuffix("Kyoto Station"), "Kyoto");
  assert.equal(stripHubSuffix("Charles de Gaulle International Airport"), "Charles de Gaulle");
  assert.equal(stripHubSuffix("京都"), null, "没有后缀就别多发一次请求");
  assert.equal(stripHubSuffix("机场"), null, "剥完什么都不剩，这次请求没意义");
});

test("中文写法改写成日文写法：通名整词换，字形逐字换", () => {
  // 这四条全部经过真实 API 验证：原文查回来是马来西亚民宿，改写后第一条就精确命中。
  assert.equal(toJapanese("成田国际机场"), "成田空港");
  assert.equal(toJapanese("京都站"), "京都駅");
  assert.equal(toJapanese("东京站"), "東京駅");
  assert.equal(toJapanese("宫浦港"), "宮浦港", "「宫」查出横须贺，「宮」才查出直岛的宮浦港，差的就是一个字形");
  assert.equal(toJapanese("长崎站"), "長崎駅");
  assert.equal(toJapanese("广岛港"), "広島港");
  assert.equal(toJapanese("Kyoto Station"), "Kyoto Station", "拉丁语原样返回，不该被改");
});

test("别名桥：中文枢纽名换成 Mapbox 真查得到的当地写法", () => {
  // 这是用户那句「我要的是具体的机场」的直接答案。实测：「巴黎戴高乐机场」原样查一片空白，
  // 剥成「巴黎」只能给城市级；换成「Charles de Gaulle Airport」第一条就是那座机场本身。
  assert.equal(exonymOf("巴黎戴高乐机场"), "Charles de Gaulle Airport");
  assert.equal(exonymOf("戴高乐机场"), "Charles de Gaulle Airport");
  assert.equal(exonymOf("伦敦希思罗机场"), "London Heathrow Airport");
  assert.equal(exonymOf("首尔站"), "Seoul Station");

  // 必须按结尾通名分类匹配：专名一样、要的东西不一样。
  assert.equal(exonymOf("马德里机场"), "Madrid-Barajas International Airport");
  assert.equal(exonymOf("马德里火车站"), "Madrid Atocha", "查车站不能给机场");

  // 长键优先，否则「巴黎北站」会被短键「巴黎」兜走。
  assert.equal(exonymOf("巴黎北站"), "Gare du Nord");
  assert.equal(exonymOf("巴黎里昂站"), "Gare de Lyon");

  // 不是枢纽查询就不许查表：光打「巴黎」的人要的是城市，不是戴高乐机场。
  assert.equal(exonymOf("巴黎"), null);
  assert.equal(exonymOf("马德里"), null);
  assert.equal(exonymOf("巴黎第五区"), null);

  // 日本不进表：英文名在 Mapbox 里同样查不到，而字形桥已经精确命中了，收进来只会白发请求。
  assert.equal(exonymOf("成田国际机场"), null);
  assert.equal(exonymOf("羽田机场"), null);
  // 大中华区也不进表：那些 POI 索引里根本没有，硬凑英文名会命中错的地方。
  assert.equal(exonymOf("北京首都国际机场"), null);
  assert.equal(exonymOf("香港国际机场"), null);
});

test("大中华区：桥的是查询范围，不是名字", () => {
  // 实测：「北京首都国际机场」不收窄时，返回的是伊利诺伊州和爱荷华州两个正好叫「北京」的
  // 小镇（各 102 分），真正的北京市连前十都进不去；加上 country=cn 第一条就是北京市。
  assert.equal(scopeOf("北京首都国际机场"), "cn");
  assert.equal(scopeOf("上海浦东国际机场"), "cn");
  assert.equal(scopeOf("广州南站"), "cn");
  assert.equal(scopeOf("香港国际机场"), "hk");
  assert.equal(scopeOf("台北桃园国际机场"), "tw");
  assert.equal(scopeOf("澳门国际机场"), "mo");
  // 光打城市名不收窄 —— 全世界叫这个名字的地方用户都可能在找。
  assert.equal(scopeOf("北京"), null);
  assert.equal(scopeOf("上海"), null);
  // 不在表里的中文枢纽照常走全球搜索。
  assert.equal(scopeOf("巴黎戴高乐机场"), null);
  assert.equal(scopeOf("成田国际机场"), null);

  const plan = queryVariants("北京首都国际机场");
  assert.equal(plan[0].country, "cn", "原始查询要收窄");
  assert.ok(plan.every((variant) => variant.language !== "ja"),
    "已经确定在中国就别再改写成日文：那两个请求只会带回「海浦（日本熊本县）」这类噪音");
  const fallback = plan.find((variant) => variant.q === "北京首都");
  assert.equal(fallback?.country, "cn", "兜底那一路同样会撞上同名的外国地名，收窄要带下去");
});

test("查询计划：原文 + 日文写法 + 专名，且不重复", () => {
  const plan = queryVariants("成田国际机场");
  assert.equal(plan[0].q, "成田国际机场");
  assert.equal(plan[0].language, "zh-Hans");
  assert.deepEqual(plan[0].engines, ["poi", "geocode"]);
  assert.equal(plan[0].fidelity, 1);
  const japanese = plan.find((variant) => variant.q === "成田空港");
  assert.ok(japanese, "汉字查询必须额外走一次日文索引，这是命中率的关键");
  assert.equal(japanese.language, "ja");
  assert.ok(japanese.engines.includes("poi"), "POI 才是日文写法真正救回来的那一路");
  assert.equal(japanese.fidelity, 1, "换字形不改变意思，分数不该被折价");
  const proper = plan.find((variant) => variant.q === "成田");
  assert.ok(proper, "专名要单独查一次行政地名兜底");
  assert.ok(proper.fidelity < 1, "剥掉通名是故意丢信息，分数必须折价，否则「成田」街区会盖过成田空港");

  // 请求数要有上限：这是每次输入都会发的。
  const total = plan.reduce((sum, variant) => sum + variant.engines.length, 0);
  assert.ok(total <= 5, `一次输入发了 ${total} 个请求，太多了`);

  // 别名桥和日文改写是二选一，所以走桥的那种输入请求数反而更少。
  const bridged = queryVariants("巴黎戴高乐机场");
  const bridge = bridged.find((variant) => variant.q === "Charles de Gaulle Airport");
  assert.ok(bridge, "查得到当地写法就必须走这一路");
  assert.equal(bridge.language, "en");
  assert.equal(bridge.trust, true, "这一路连文字都不沾，打分要走 trusted 分支");
  assert.deepEqual(bridge.engines, ["poi"], "桥表指向的是 POI，行政地名引擎帮不上");
  assert.ok(bridged.every((variant) => variant.language !== "ja"), "有桥就不必再猜日文字形");
  assert.ok(bridged.reduce((sum, variant) => sum + variant.engines.length, 0) <= 4);

  // 拉丁语没有日文变体，只该有原文 + 专名。
  const latin = queryVariants("Seoul Station");
  assert.deepEqual(latin.map((variant) => variant.q), ["Seoul Station", "Seoul"]);
  assert.deepEqual(queryVariants("   "), [], "空查询不发请求");
});

test("打分：把「Kyoto Station 匹到巴西文具店」这类噪音压下去", () => {
  const hit = (name, featureType, categories = [], address = "") =>
    ({ id: name, name, address, featureType, categories, engine: "poi" });

  // 实测：这条真的会出现在第一位，因为 Stationery 里含 station。
  const junk = scoreHit("Kyoto Station", hit("Bazaar Stationery Kyoto", "poi", ["stationery", "shopping"], "Guarulhos, Brazil"));
  const city = scoreHit("Kyoto Station", hit("Kyoto", "place", [], "Kyoto, Japan"));
  assert.ok(city > junk, `城市 ${city} 应该排在文具店 ${junk} 前面`);

  // 枢纽加分必须带词边界，否则 /station/ 会匹上 Stationery，噪音反而被加分。
  const station = scoreHit("Kyoto Station", hit("Kyoto Station", "poi", ["rail station"], "Kyoto, Japan"));
  assert.ok(station > city && station > junk, "名字完全一致的车站必须是第一名");

  // 一个字都不沾的直接丢掉。
  assert.equal(scoreHit("成田国际机场", hit("KaMi Homestay", "poi", [], "88200, Malaysia")), 0);
  // 剥掉通名查回来的城市级结果要留得住 —— 它是跨语言查不到时唯一的正确答案。
  assert.ok(scoreHit("成田国际机场", hit("成田市", "place", [], "日本千叶县")) > 0);
  // 路名、门牌号几乎不会被当成行程站点。用完整的查询词，不是剥过的：
  // scoreHit 一律拿原始输入打分，所以「巴黎」得靠查询里真有「巴黎」两个字才留得住。
  const street = scoreHit("巴黎戴高乐机场", hit("戴高乐广场", "street", [], "75116 巴黎, 法国"));
  const place = scoreHit("巴黎戴高乐机场", hit("巴黎", "place", [], "法国"));
  assert.ok(place > street, `城市 ${place} 应该排在路名 ${street} 前面`);
  // 反过来说：查询里完全没提到的城市不该被兜进来。「戴高乐机场」和「巴黎」一个字都不沾。
  assert.equal(scoreHit("戴高乐机场", hit("巴黎", "place", [], "法国")), 0, "不沾字的城市不能凭空冒出来");
});

test("整个名字就是一个通名的结果直接丢掉", () => {
  const hit = (name, featureType, categories = [], address = "") =>
    ({ id: name, name, address, featureType, categories, engine: "geocode" });
  // 实测：查「成田国际机场」，Geocoding 返回一个真的叫「机场」的马德里街区，
  // 通名被整个匹上、逐字重叠算 100%，一路冲到 136 分排第一。
  assert.equal(scoreHit("成田国际机场", hit("机场", "neighborhood", [], "马德里, 西班牙")), 0);
  assert.equal(scoreHit("关西国际机场", hit("空港", "neighborhood", [], "大阪府")), 0);
  assert.equal(scoreHit("Kyoto Station", hit("Station", "poi", [], "Berlin")), 0);
  // 但用户真就只打了通名的时候，它是唯一能给的东西，还是要显示。
  assert.ok(scoreHit("机场", hit("机场", "neighborhood", [], "马德里, 西班牙")) > 0);
  // 有专名的枢纽不受影响。这里刻意同文字比较：跨语言那一路（关西国际机场 → 関西国際空港）
  // 逐字重叠只有 33%，本来就该被 scoreHit 拒掉 —— 它靠的是按改写后的说法重新打分，
  // 见「合并：按查出它的那个说法打分」那条。
  assert.ok(scoreHit("関西空港", hit("関西国際空港", "poi", ["airport"], "大阪府")) > 0);
});

test("查机场就别把机场旁边那个车站排前面", () => {
  const hit = (name, categories = []) =>
    ({ id: name, name, address: "", featureType: "poi", categories, engine: "poi" });
  // 实测：「关西国际机场」改写成「関西空港」后，「関西空港駅」按前缀匹到 100 分，
  // 真正的「関西国際空港」只有 41 分的部分匹配 —— 结尾那个通名才是用户要的东西。
  const airport = scoreHit("関西空港", hit("関西国際空港"));
  const station = scoreHit("関西空港", hit("関西空港駅"));
  assert.ok(airport > station, `机场 ${airport} 应该排在机场旁的车站 ${station} 前面`);
  // 成田同理：「成田空港」是机场，「成田空港駅」是车站。
  assert.ok(scoreHit("成田空港", hit("成田空港")) > scoreHit("成田空港", hit("成田空港駅")));
  // 反过来查车站时，车站要赢。
  assert.ok(scoreHit("成田空港駅", hit("成田空港駅")) > scoreHit("成田空港駅", hit("成田空港")));
  // 只看结尾、不看整串：整串里「成田空港駅」含「空港」，按整串判会判成机场。
  assert.ok(scoreHit("京都駅", hit("京都駅", ["rail station"])) > scoreHit("京都駅", hit("京都市")));
});

test("合并：去重、按分排序、有上限", () => {
  const rows = [
    { id: "a", name: "京都駅", address: "京都府京都市下京区", featureType: "poi", categories: ["rail station"], engine: "poi" },
    { id: "b", name: "京都駅", address: "京都府京都市下京区", featureType: "poi", categories: [], engine: "geocode", coordinate: [135.7581, 34.9859] },
    { id: "c", name: "京都市", address: "日本京都府", featureType: "place", categories: [], engine: "geocode", coordinate: [135.7681, 35.0116] },
    { id: "d", name: "无关商铺", address: "Singapore", featureType: "poi", categories: [], engine: "poi" },
  ];
  const ranked = rankHits("京都駅", rows);
  assert.equal(ranked[0].name, "京都駅");
  assert.ok(ranked.every((hit) => hit.name !== "无关商铺"), "一个字都不沾的应该被丢掉");
  assert.ok(ranked.length <= MAX_HITS);
  // 分数必须单调不增，否则排序写反了也看不出来
  for (let index = 1; index < ranked.length; index += 1) {
    assert.ok(ranked[index - 1].score >= ranked[index].score);
  }
  // 同名同地只留一条：两个引擎都返回京都駅时不该出现重复行。
  // a 没坐标（Search Box 的 suggestion 就是这样）、b 有坐标 —— 去重键要是掺了坐标，
  // 这两条会算成两个键，一条都去不掉。
  assert.equal(ranked.filter((hit) => hit.name === "京都駅").length, 1);
});

test("合并：按查出它的那个说法打分，跨语言才排得对", () => {
  // 这是整个跨语言方案的支点。用户打的是「京都站」，京都駅是改写成日文写法之后查到的。
  // 拿原始输入给「京都駅」打分只有 41 分（駅≠站），会被「京都市」的 69 分压掉；
  // 按查出它的说法「京都駅」打就是满分。实测就是这么错的。
  const rows = [
    { id: "a", name: "京都駅", address: "京都府京都市下京区", featureType: "poi", categories: ["rail station"], engine: "poi", query: "京都駅", fidelity: 1, rank: 0 },
    { id: "b", name: "京都市", address: "日本京都府", featureType: "place", categories: [], engine: "geocode", query: "京都站", fidelity: 1, coordinate: [135.7681, 35.0116], rank: 0 },
  ];
  const ranked = rankHits("京都站", rows);
  assert.equal(ranked[0].name, "京都駅", `京都駅 ${ranked[0].score} 必须压过京都市`);

  // 兜底说法要折价：剥掉通名查回来的「成田」街区不能盖过成田空港。
  const fallback = rankHits("成田国际机场", [
    { id: "a", name: "成田空港", address: "千葉県成田市", featureType: "poi", categories: ["airport"], engine: "poi", query: "成田空港", fidelity: 1, rank: 0 },
    { id: "b", name: "成田", address: "日本宫城县富谷町", featureType: "neighborhood", categories: [], engine: "geocode", query: "成田", fidelity: .55, coordinate: [140.9, 38.4], rank: 0 },
  ]);
  assert.equal(fallback[0].name, "成田空港", `成田空港 ${fallback[0].score} 必须压过折价后的成田街区 ${fallback[1]?.score}`);
});

test("合并：别名桥的命中不比文字，只验类型", () => {
  // 这一条是桥能用的前提。Mapbox 会把车站名本地化成英文：查「Zurich Hauptbahnhof」
  // 返回的名字是「Zurich Main Station」，和用户打的「苏黎世中央车站」一个字符都不沾，
  // 文字打分只能给 0，那条真正的车站会被城市级兜底压掉。实测就是这么错的。
  const rows = [
    {
      id: "a", name: "Zurich Main Station", address: "8001 Zürich, Switzerland",
      featureType: "poi", categories: ["train station"], engine: "poi",
      query: "Zurich Hauptbahnhof", fidelity: 1, trusted: true, rank: 0,
    },
    {
      id: "b", name: "苏黎世", address: "苏黎世州, 瑞士", featureType: "place", categories: [],
      engine: "geocode", query: "苏黎世", fidelity: .55, coordinate: [8.54, 47.37], rank: 0,
    },
  ];
  const ranked = rankHits("苏黎世中央车站", rows);
  assert.equal(ranked[0].name, "Zurich Main Station", `车站 ${ranked[0].score} 必须压过城市级兜底`);

  // 类型对不上就不给这个待遇：桥表指的是车站，回来一个停车场不能当答案。
  // 它不会被丢掉（名字和桥发出去的「Zurich Hauptbahnhof」有一半重叠，文字分还在 77），
  // 但拿不到桥的固定分 —— 差距足够让真正那座车站稳压在它上面。
  const withParking = rankHits("苏黎世中央车站", [rows[0], rows[1], {
    ...rows[0], id: "c", name: "Parkhaus Hauptbahnhof", categories: ["parking lot"], rank: 1,
  }]);
  assert.equal(withParking[0].name, "Zurich Main Station");
  const parking = withParking.find((hit) => hit.name === "Parkhaus Hauptbahnhof");
  assert.ok(parking && parking.score < 100,
    `停车场拿了 ${parking?.score} 分：别名桥只保证「这个查询能查到那个枢纽」，不保证每一条都是它`);

  // 桥的分刻意压在文字精确命中之下。实测「巴黎北站」「伦敦盖特威克机场」这些
  // Geocoding 真有中文名的枢纽会以 216／222 分回来 —— 那才是更好的答案，得让它赢。
  const both = rankHits("苏黎世中央车站", [rows[0], {
    id: "c", name: "苏黎世中央车站", address: "8001 苏黎世, 瑞士", featureType: "poi",
    categories: ["train station"], engine: "geocode", query: "苏黎世中央车站", fidelity: 1,
    coordinate: [8.54, 47.38], rank: 0,
  }]);
  assert.equal(both[0].name, "苏黎世中央车站", `中文名那条 ${both[0].score} 该压过桥的固定分`);

  // 用户自己就打了当地写法时根本不发这一路：同一个查询没必要发两次。
  assert.equal(exonymOf("Zurich Hauptbahnhof"), null);
});

test("行政通名不该被当成不匹配的字", () => {
  const hit = (name, featureType, address) =>
    ({ id: name, name, address, featureType, categories: [], engine: "geocode" });
  // 实测：查「北京首都国际机场」，真正的「北京市」因为多一个「市」字掉到部分匹配那一档
  // （41 分），反被伊利诺伊州那个正好叫「北京」的小镇（102 分）压掉 —— 中文用户搜北京
  // 首先得到美国的 Beijing。它不是排序问题，是「市」字被算成了不匹配。
  const city = scoreHit("北京首都国际机场", hit("北京市", "place", "中华人民共和国"));
  const homonym = scoreHit("北京首都国际机场", hit("北京", "locality", "伊利诺伊州, 美国"));
  assert.ok(city >= homonym, `北京市 ${city} 不该输给同名小镇 ${homonym}`);
  assert.equal(city, scoreHit("北京首都国际机场", hit("北京", "place", "中华人民共和国")),
    "「北京市」和「北京」该拿一样的分：它们是同一个地方");
  // 别放得太宽：加了个「市」不代表随便什么带市字的都能匹上。
  assert.equal(scoreHit("北京首都国际机场", hit("都匀市", "locality", "贵州省")), 0);
});

test("合并：同分时按 Mapbox 自己的相关度顺序兜", () => {
  // 叫「巴黎」的城市法国、得州、田纳西州都有，名字一字不差，光看文字分不出高下。
  // 实测：不用 rank 兜的话第一条是得克萨斯州的巴黎。
  const paris = (address, rank) =>
    ({ id: address, name: "巴黎", address, featureType: "place", categories: [], engine: "geocode", coordinate: [rank, rank], rank });
  const ranked = rankHits("巴黎戴高乐机场", [paris("得克萨斯州, 美国", 1), paris("法国", 0), paris("田纳西州, 美国", 2)]);
  assert.equal(ranked[0].score, ranked[1].score, "这三条本来就同分，这个测试才有意义");
  assert.equal(ranked[0].address, "法国");
});

test("站点类型：机场判在车站之前", () => {
  assert.equal(stopKindOf("poi", ["airport"], "成田空港"), "airport");
  assert.equal(stopKindOf("poi", [], "関西国際空港"), "airport");
  assert.equal(stopKindOf("poi", ["rail station"], "京都駅"), "station");
  assert.equal(stopKindOf("poi", [], "Seoul Station"), "station");
  assert.equal(stopKindOf("poi", [], "宮浦港フェリーターミナル"), "port");
  assert.equal(stopKindOf("place", [], "京都市"), "place");
  // Stationery 不该被判成车站 —— 和打分用的是同一套词边界规则
  assert.equal(stopKindOf("poi", ["stationery"], "Bazaar Stationery"), "place");
});

test("通名只看结尾", () => {
  assert.equal(tailKind("关西国际机场"), "airport");
  assert.equal(tailKind("関西空港駅"), "station", "整串里有「空港」，但结尾是駅，它就是车站");
  assert.equal(tailKind("宫浦港"), "port");
  assert.equal(tailKind("Charles de Gaulle Airport"), "airport");
  assert.equal(tailKind("Zurich Hauptbahnhof"), "station");
  assert.equal(tailKind("巴黎"), "", "没有通名就不是枢纽查询 —— 别名桥和范围收窄都靠这个守着");
});
