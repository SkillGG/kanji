export function extractTags(str: string): string[] {
  const rxExec = /^(?:k|w|s)?\(([^)]+)\)$/g.exec(str);
  if (rxExec && rxExec[1]) {
    return [rxExec[1]];
  }
  return [str];
}

export const WARN_TAGS = [
  "sK",
  "iK",
  "rK",
  "sk",
  "ik",
  "ev",
  "work",
  "rk",
  "arch",
  "obs",
  "company",
  "organization",
  "oK",
  "hist",
];

export const SPECIAL_TAGS: {
  check: (t: string) => boolean;
  groupTag: string;
  list: string[];
  name: (t: string) => string;
  groupName: (t: string) => string;
  shortName?: (t: string) => string;
  type: ("kanji" | "word" | "sentence")[];
}[] = [
  {
    groupTag: `(v5)`,
    check: (tag) => extractTags(tag).some((q) => q.startsWith("v5")),
    list: [
      "v5aru",
      "v5b",
      "v5g",
      "v5k",
      "v5k-s",
      "v5m",
      "v5n",
      "v5r",
      "v5r-i",
      "v5s",
      "v5t",
      "v5u",
      "v5u-s",
      "v5uru",
    ],
    groupName: () => "v5",
    name: () => "v5",
    type: ["word"],
  },
  {
    groupTag: `(jlpt)`,
    check: (tag) => extractTags(tag).some((q) => !!/n[0-5]/gi.exec(q)),
    list: [`n1`, `n2`, `n3`, `n4`, `n5`, `n0`],
    groupName: (j) => `JLPT Level ${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    shortName: (j) => `${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    name: (j) => `JLPT ${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    type: ["word", "kanji"],
  },
  {
    groupTag: `(kk)`,
    check: (tag) => extractTags(tag).some((q) => !!/kk[1-9]0?/gi.exec(q)),
    list: [
      `kk1`,
      `kk2`,
      `kk3`,
      `kk4`,
      `kk5`,
      `kk6`,
      `kk7`,
      `kk8`,
      `kk9`,
      `kk10`,
    ],
    groupName: (j) =>
      `Kanji Kentei Level ${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    shortName: (j) => `${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    name: (j) => `KanKen Lv${j.replace(/\(|\)|kk/gi, "").toUpperCase()}`,
    type: ["kanji"],
  },
  {
    groupTag: "(jis)",
    check: (tag) => extractTags(tag).some((q) => !!/jis[1-5]/gi.exec(q)),
    list: [`jis1`, `jis2`, `jis3`, `jis4`, `jis5`],
    groupName: (j) =>
      `JIS Standard Level ${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    shortName: (j) => `${j.replace(/\(|\)/gi, "").toUpperCase()}`,
    name: (j) => `JIS Level ${j.replace(/\(|\)|jis/gi, "").toUpperCase()}`,
    type: ["kanji"],
  },
  {
    groupTag: "(grade)",
    check: (tag) => extractTags(tag).some((q) => !!/g[1-6]|jh|hs/gi.exec(q)),
    list: [`g1`, `g2`, `g3`, `g4`, `g5`, `g6`, `jh`, `hs`],
    groupName: (j) =>
      `Kanji teching level${
        j
          ? `: ${`${j
              .replace(/\(|\)/gi, "")
              .toUpperCase()
              .replace(/g/i, "Grade ")
              .replace(/jh/i, "Junior High")
              .replace(/hs/gi, "High School")}`}`
          : ""
      }`,
    shortName: (j) =>
      `${j
        .replace(/\(|\)/gi, "")
        .toUpperCase()
        .replace(/g/i, "Grade ")
        .replace(/jh/i, "Junior High")
        .replace(/hs/gi, "High School")}`,
    name: (j) =>
      `${j
        .replace(/\(|\)/gi, "")
        .toUpperCase()
        .replace(/g/i, "Grade ")
        .replace(/jh/i, "Junior High")
        .replace(/hs/gi, "High School")}`,
    type: ["kanji"],
  },
  {
    groupTag: `(nf)`,
    check: (t) => {
      return t.startsWith("(nf") || t.startsWith("nf");
    },
    list: [],
    groupName: (t) => `nf${t}`,
    name: (t) =>
      `Word frequency top ${+t.replace(/nf/g, "").replace(/\(|\)/g, "") * 500}`,
    shortName: (t) =>
      `Top ${+t.replace(/nf/g, "").replace(/\(|\)/g, "") * 500}`,
    type: ["word"],
  },
  {
    check: (t) => t.startsWith("(news") || t.startsWith("news"),
    groupName: (t) => `News Top ${t.includes("1") ? "1200" : "[1200, 2400]"}`,
    groupTag: `(news)`,
    list: ["news1", "news2"],
    name: (t) => `News frequency top ${t.includes("1") ? "1200" : "1200-2400"}`,
    type: ["word"],
    shortName: (t) => `Top #${t.includes("1") ? "1200" : "2400"}`,
  },
];

// Priority/Reference tags from EDICT/JMdict:
//  - news1: Top 12,000 most frequent words in Japanese news
//  - news2: 12,001-24,000 most frequent words in news
//  - ichi1: Top words in "Ichimango goi bunruishuu"
//  - ichi2: Lower frequency(than ichi1) in above
//  - spec1: Common word (not on other major priority lists)
//  - spec2: Like spec1, but less frequently used
//  - gai1: Common loanwords (top 2,500 loanwords)
//  - gai2: Less common loanword, but still frequent
//  - nf01-nf50: Word frequency rank (01 = top 500, 02 = next 500, … up to 25,000th word)

export const TAG_FULLNAME_MAP: Record<string, string> = {
  // Group tag names
  jlpt: "日本語能力試験推奨レベル",
  grade: `学校習得学位`,
  jis: `JIS水準`,
  kk: "漢字検定レベル",

  news1: "ニュース頻出語(上位12000語)",
  news2: "ニュース頻出語(12001～24000位)",
  ichi1: "一級語彙（非常によく使われる語）",
  ichi2: "二級語彙（よく使われる語）",
  spec1: "一般語（他に分類されない語）",
  spec2: "準一般語（やや使用頻度が高い語）",
  gai1: "外来語上位2500語",
  gai2: "外来語上位2501位以降",
  nf: "上位○○○語",
  jk_old: "旧常用漢字",
  joyo: "常用漢字",
  toyo: "当用漢字",
  jinmeiyo: "人名用漢字",
  hyougai: "表外漢字",

  // --- 地域/方言 ---
  bra: "ブラジル方言",
  hob: "北海道方言",
  ksb: "関西方言",
  ktb: "関東方言",
  kyb: "京都方言",
  kyu: "九州方言",
  nab: "長野方言",
  osb: "大阪方言",
  rkb: "琉球方言",
  thb: "東北方言",
  tsb: "土佐方言",
  tsug: "津軽方言",
  // --- 学術・分野ターム ---
  agric: "農業",
  anat: "解剖学",
  archeol: "考古学",
  archit: "建築学",
  art: "美術・芸術",
  astron: "天文学",
  audvid: "映像・音響",
  aviat: "航空",
  baseb: "野球",
  biochem: "生化学",
  biol: "生物学",
  bot: "植物学",
  boxing: "ボクシング",
  Buddh: "仏教",
  bus: "ビジネス・商業",
  cards: "カードゲーム",
  chem: "化学",
  chmyth: "中国神話",
  Christn: "キリスト教",
  civeng: "土木工学",
  cloth: "服飾",
  comp: "コンピュータ",
  cryst: "結晶学",
  dent: "歯科学",
  ecol: "生態学",
  econ: "経済学",
  elec: "電気・電気工学",
  electr: "電子工学",
  embryo: "胚学",
  engr: "工学",
  ent: "昆虫学",
  figskt: "フィギュアスケート",
  film: "映画",
  finc: "金融",
  fish: "釣り",
  food: "料理・食品",
  gardn: "園芸・造園",
  genet: "遺伝学",
  geogr: "地理学",
  geol: "地質学",
  geom: "幾何学",
  go: "囲碁",
  golf: "ゴルフ",
  gramm: "文法",
  grmyth: "ギリシャ神話",
  hanaf: "花札",
  horse: "競馬",
  internet: "インターネット",
  jpmyth: "日本神話",
  kabuki: "歌舞伎",
  law: "法律",
  ling: "言語学",
  logic: "論理学",
  MA: "武道",
  mahj: "麻雀",
  manga: "漫画",
  math: "数学",
  mech: "機械工学",
  med: "医学",
  met: "気象学",
  mil: "軍事",
  min: "鉱物学",
  mining: "鉱業",
  motor: "モータースポーツ",
  music: "音楽",
  noh: "能楽",
  ornith: "鳥類学",
  paleo: "古生物学",
  pathol: "病理学",
  pharm: "薬学",
  phil: "哲学",
  photo: "写真",
  physics: "物理学",
  physiol: "生理学",
  politics: "政治",
  print: "印刷",
  prowres: "プロレス",
  psy: "精神医学",
  psyanal: "精神分析学",
  psych: "心理学",
  rail: "鉄道",
  rommyth: "ローマ神話",
  Shinto: "神道",
  shogi: "将棋",
  ski: "スキー",
  sports: "スポーツ",
  stat: "統計学",
  stockm: "株式市場",
  sumo: "相撲",
  surg: "外科学",
  telec: "電気通信",
  tradem: "商標",
  tv: "テレビ",
  vet: "獣医学",
  vidg: "テレビゲーム",
  zool: "動物学",
  // --- 表記・語種 ---
  ateji: "当て字・仮名",
  ik: "意義表記の仮名",
  iK: "意義表記の漢字",
  io: "送り仮名の異表記",
  oK: "古い漢字または用法",
  rK: "稀な漢字形",
  sK: "検索専用漢字形",
  abbr: "略語",
  arch: "古語",
  char: "キャラクター名",
  chn: "児童語",
  col: "口語",
  company: "会社名",
  creat: "生物名",
  dated: "時代語",
  dei: "神名",
  derog: "蔑称",
  doc: "文書名",
  euph: "婉曲語",
  ev: "イベント名",
  fam: "親しい言い方",
  fem: "女性語",
  fict: "架空・フィクション",
  form: "文語・格式語",
  given: "人名（名）",
  group: "団体名",
  hist: "歴史用語",
  hon: "尊敬語",
  hum: "謙譲語",
  id: "慣用句・成句",
  joc: "冗談語・戯言",
  leg: "伝説",
  "m-sl": "マンガ俗語",
  male: "男性語",
  myth: "神話",
  "net-sl": "ネットスラング",
  obj: "物名",
  obs: "廃語・死語",
  "on-mim": "擬音語・擬態語",
  organization: "組織名",
  oth: "その他",
  person: "実在人物名",
  place: "地名",
  poet: "雅語・詩語",
  pol: "丁寧語",
  product: "商品名",
  proverb: "ことわざ",
  quote: "引用",
  rare: "めったに使われない語",
  relig: "宗教",
  sens: "差別・センシティブ",
  serv: "サービス名",
  ship: "船の名前",
  sl: "俗語",
  station: "駅名",
  surname: "姓・名字",
  uk: "主にカナ書き",
  unclass: "分類外",
  vulg: "卑語・下品語",
  work: "作品名（文学・美術等）",
  X: "不適切語・教育用非表示",
  yoji: "四字熟語",
  // --- 品詞・用法 ---
  "adj-f": "連体詞的用法",
  "adj-i": "形容詞（い形容詞）",
  "adj-ix": "形容詞（い型、よい・いい）",
  "adj-kari": "仮活用形容詞（古語）",
  "adj-ku": "く活用形容詞（古語）",
  "adj-na": "形容動詞（な形容詞）",
  "adj-nari": "ナリ活用形容詞（古語，文語）",
  "adj-no": "ノ格を取る名詞",
  "adj-pn": "連体詞（名詞修飾語）",
  "adj-shiku": "シク活用形容詞（古語）",
  "adj-t": "タル活用形容詞",
  adv: "副詞",
  "adv-to": "と副詞",
  aux: "助動詞",
  "aux-adj": "補助形容詞",
  "aux-v": "補助動詞",
  conj: "接続詞",
  cop: "コピュラ（断定助動詞）",
  ctr: "助数詞・カウンター",
  exp: "表現／句",
  int: "感動詞",
  n: "名詞（普通名詞）",
  "n-adv": "副詞的名詞",
  "n-pr": "固有名詞",
  "n-pref": "接頭語",
  "n-suf": "接尾語",
  "n-t": "時相名詞",
  num: "数詞",
  pn: "代名詞",
  pref: "接頭辞",
  prt: "助詞",
  suf: "接尾辞",
  unc: "未分類",
  "v-unspec": "動詞（種類未分類）",
  v1: "一段動詞",
  "v1-s": "一段動詞（特別：くれる）",
  "v2a-s": "二段動詞（う音便、古語）",
  "v2b-k": "二段動詞（上：-ぶ, 古語）",
  "v2b-s": "二段動詞（下：-ぶ, 古語）",
  "v2d-k": "二段動詞（上：-づ, 古語）",
  "v2d-s": "二段動詞（下：-づ, 古語）",
  "v2g-k": "二段動詞（上：-ぐ, 古語）",
  "v2g-s": "二段動詞（下：-ぐ, 古語）",
  "v2h-k": "二段動詞（上：-ふ, 古語）",
  "v2h-s": "二段動詞（下：-ふ, 古語）",
  "v2k-k": "二段動詞（上：-く, 古語）",
  "v2k-s": "二段動詞（下：-く, 古語）",
  "v2m-k": "二段動詞（上：-む, 古語）",
  "v2m-s": "二段動詞（下：-む, 古語）",
  "v2n-s": "二段動詞（下：-ぬ, 古語）",
  "v2r-k": "二段動詞（上：-る, 古語）",
  "v2r-s": "二段動詞（下：-る, 古語）",
  "v2s-s": "二段動詞（下：-す, 古語）",
  "v2t-k": "二段動詞（上：-つ, 古語）",
  "v2t-s": "二段動詞（下：-つ, 古語）",
  "v2w-s": "二段動詞（下：-う,「ゑ」活用, 古語）",
  "v2y-k": "二段動詞（上：-ゆ, 古語）",
  "v2y-s": "二段動詞（下：-ゆ, 古語）",
  "v2z-s": "二段動詞（下：-ず, 古語）",
  v4b: "四段動詞（-ぶ, 古語）",
  v4g: "四段動詞（-ぐ, 古語）",
  v4h: "四段動詞（-ふ, 古語）",
  v4k: "四段動詞（-く, 古語）",
  v4m: "四段動詞（-む, 古語）",
  v4n: "四段動詞（-ぬ, 古語）",
  v4r: "四段動詞（-る, 古語）",
  v4s: "四段動詞（-す, 古語）",
  v4t: "四段動詞（-つ, 古語）",
  v5: "五段動詞",
  v5aru: "五段動詞（-ある特殊型）",
  v5b: "五段動詞（-ぶ）",
  v5g: "五段動詞（-ぐ）",
  v5k: "五段動詞（-く）",
  "v5k-s": "五段動詞（行く・ゆく特殊）",
  v5m: "五段動詞（-む）",
  v5n: "五段動詞（-ぬ）",
  v5r: "五段動詞（-る）",
  "v5r-i": "五段動詞（-る・不規則）",
  v5s: "五段動詞（-す）",
  v5t: "五段動詞（-つ）",
  v5u: "五段動詞（-う）",
  "v5u-s": "五段動詞（-う特殊）",
  v5uru: "五段動詞（うる・えるの古形）",
  vi: "自動詞",
  vk: "カ変動詞（来る・特別型）",
  vn: "変格活用ぬ動詞",
  vr: "変格活用り動詞",
  vs: "サ変動詞、〜する動詞",
  "vs-c": "サ変動詞（古形）",
  "vs-i": "サ変動詞（現代型）",
  "vs-s": "サ変動詞（特殊型）",
  vt: "他動詞",
  vz: "一段動詞（ずる型、-じる語の異形）",
  gikun: "義訓／熟字訓",
  ok: "歴史的仮名遣い",
  rk: "稀な仮名形",
  sk: "検索専用仮名形",
};

export const TAG_FULLNAME_MAP_ENG: Record<string, string> = {
  // Group tag names
  jlpt: "JLPT Level",
  grade: `School Grade`,
  jis: `JIS Standard`,
  kk: "Kanken Level",

  news: "Top in news",
  news1: "News top 12,000 words",
  news2: "News rank 12,001–24,000",
  ichi1: "High frequency word",
  ichi2: "High frequency word (lower)",
  spec1: "General word",
  spec2: "Semi-general word",
  gai1: "Common loanword",
  gai2: "Frequent loanword",
  nf: "Word frequency",
  jk_old: "Old Joyo",
  joyo: "Joyo",
  toyo: "Toyo",
  jinmeiyou: "Jinmeiyo (kanji not in joyo, but used in names)",
  hyougai: "Hyogai (kanji not in joyo kanji list)",

  // --- Regions/Dialects ---
  bra: "Brazilian dialect",
  hob: "Hokkaido dialect",
  ksb: "Kansai dialect",
  ktb: "Kanto dialect",
  kyb: "Kyoto dialect",
  kyu: "Kyushu dialect",
  nab: "Nagano dialect",
  osb: "Osaka dialect",
  rkb: "Ryukyu dialect",
  thb: "Tohoku dialect",
  tsb: "Tosa dialect",
  tsug: "Tsugaru dialect",
  // --- Academic/Field Terms ---
  agric: "Agriculture",
  anat: "Anatomy",
  archeol: "Archaeology",
  archit: "Architecture",
  art: "Art",
  astron: "Astronomy",
  audvid: "Audio/Video",
  aviat: "Aviation",
  baseb: "Baseball",
  biochem: "Biochemistry",
  biol: "Biology",
  bot: "Botany",
  boxing: "Boxing",
  Buddh: "Buddhism",
  bus: "Business/Commerce",
  cards: "Card games",
  chem: "Chemistry",
  chmyth: "Chinese mythology",
  Christn: "Christianity",
  civeng: "Civil engineering",
  cloth: "Clothing",
  comp: "Computers",
  cryst: "Crystallography",
  dent: "Dentistry",
  ecol: "Ecology",
  econ: "Economics",
  elec: "Electricity/Electrical engineering",
  electr: "Electronics",
  embryo: "Embryology",
  engr: "Engineering",
  ent: "Entomology",
  figskt: "Figure skating",
  film: "Film",
  finc: "Finance",
  fish: "Fishing",
  food: "Food/Cuisine",
  gardn: "Gardening/Landscaping",
  genet: "Genetics",
  geogr: "Geography",
  geol: "Geology",
  geom: "Geometry",
  go: "Go (board game)",
  golf: "Golf",
  gramm: "Grammar",
  grmyth: "Greek mythology",
  hanaf: "Hanafuda",
  horse: "Horse racing",
  internet: "Internet",
  jpmyth: "Japanese mythology",
  kabuki: "Kabuki",
  law: "Law",
  ling: "Linguistics",
  logic: "Logic",
  MA: "Martial arts",
  mahj: "Mahjong",
  manga: "Manga",
  math: "Mathematics",
  mech: "Mechanical engineering",
  med: "Medicine",
  met: "Meteorology",
  mil: "Military",
  min: "Mineralogy",
  mining: "Mining",
  motor: "Motorsports",
  music: "Music",
  noh: "Noh (theatre)",
  ornith: "Ornithology",
  paleo: "Paleontology",
  pathol: "Pathology",
  pharm: "Pharmacy",
  phil: "Philosophy",
  photo: "Photography",
  physics: "Physics",
  physiol: "Physiology",
  politics: "Politics",
  print: "Printing",
  prowres: "Pro wrestling",
  psy: "Psychiatry",
  psyanal: "Psychoanalysis",
  psych: "Psychology",
  rail: "Railways",
  rommyth: "Roman mythology",
  Shinto: "Shinto",
  shogi: "Shogi (Japanese chess)",
  ski: "Skiing",
  sports: "Sports",
  stat: "Statistics",
  stockm: "Stock market",
  sumo: "Sumo",
  surg: "Surgery",
  telec: "Telecommunications",
  tradem: "Trademark",
  tv: "Television",
  vet: "Veterinary medicine",
  vidg: "Video games",
  zool: "Zoology",
  // --- Orthography/Word Types ---
  ateji: "Ateji / phonetic substitute",
  ik: "Kana for meaning only",
  iK: "Kanji for meaning only",
  io: "Irregular okurigana",
  oK: "Obsolete kanji",
  rK: "Rare kanji form",
  sK: "Kanji for search only",
  abbr: "Abbreviation",
  arch: "Archaic word",
  char: "Character name",
  chn: "Child language",
  col: "Colloquial",
  company: "Company name",
  creat: "Creature name",
  dated: "Dated word",
  dei: "Deity name",
  derog: "Derogatory",
  doc: "Document title",
  euph: "Euphemism",
  ev: "Event name",
  fam: "Familiar language",
  fem: "Feminine",
  fict: "Fictional",
  form: "Formal",
  given: "Given name",
  group: "Group name",
  hist: "Historical term",
  hon: "Honorific",
  hum: "Humble",
  id: "Idiomatic/Set phrase",
  joc: "Jocular/Humorous",
  leg: "Legend",
  "m-sl": "Manga slang",
  male: "Masculine",
  myth: "Mythology",
  "net-sl": "Internet slang",
  obj: "Object name",
  obs: "Obsolete",
  "on-mim": "Onomatopoeia/mimetic",
  organization: "Organization",
  oth: "Other",
  person: "Person name",
  place: "Place name",
  poet: "Poetic/Literary",
  pol: "Polite speech",
  product: "Product name",
  proverb: "Proverb",
  quote: "Quotation",
  rare: "Rarely used word",
  relig: "Religion",
  sens: "Sensitive/Discriminatory",
  serv: "Service name",
  ship: "Ship name",
  sl: "Slang",
  station: "Station name",
  surname: "Surname/Family name",
  uk: "Usually written in katakana",
  unclass: "Unclassified",
  vulg: "Vulgar",
  work: "Work title (literature/art/etc.)",
  X: "Inappropriate/Hidden for educational use",
  yoji: "Yojijukugo",
  // --- Part of Speech/Usage ---
  "adj-f": "Pre-noun adjectival",
  "adj-i": "i-adjective",
  "adj-ix": "i-adjective (yoi/ii variant)",
  "adj-kari": "kari-adjective (archaic)",
  "adj-ku": "-ku adjective (archaic)",
  "adj-na": "na-adjective",
  "adj-nari": "nari-adjective (archaic, literary)",
  "adj-no": "'no' particle noun",
  "adj-pn": "Pre-noun modifier",
  "adj-shiku": "shiku-adjective (archaic)",
  "adj-t": "taru-adjective",
  adv: "Adverb",
  "adv-to": "'to' adverb",
  aux: "Auxiliary verb",
  "aux-adj": "Auxiliary adjective",
  "aux-v": "Auxiliary verb",
  conj: "Conjunction",
  cop: "Copula (da/desu)",
  ctr: "Counter",
  exp: "Expression/Phrase",
  int: "Interjection",
  n: "Noun",
  "n-adv": "Noun, used as adverb",
  "n-pr": "Proper noun",
  "n-pref": "Noun prefix",
  "n-suf": "Noun suffix",
  "n-t": "Temporal noun",
  num: "Numeral",
  pn: "Pronoun",
  pref: "Prefix",
  prt: "Particle",
  suf: "Suffix",
  unc: "Unclassified",
  "v-unspec": "Verb (unclassified)",
  v1: "Ichidan verb",
  "v1-s": "Ichidan verb (special: kureru)",
  "v2a-s": "Nidan verb a-row (archaic)",
  "v2b-k": "Nidan verb upper b-row (-bu)",
  "v2b-s": "Nidan verb lower b-row (-bu)",
  "v2d-k": "Nidan verb upper d-row (-dzu)",
  "v2d-s": "Nidan verb lower d-row (-dzu)",
  "v2g-k": "Nidan verb upper g-row (-gu)",
  "v2g-s": "Nidan verb lower g-row (-gu)",
  "v2h-k": "Nidan verb upper h-row (-fu)",
  "v2h-s": "Nidan verb lower h-row (-fu)",
  "v2k-k": "Nidan verb upper k-row (-ku)",
  "v2k-s": "Nidan verb lower k-row (-ku)",
  "v2m-k": "Nidan verb upper m-row (-mu)",
  "v2m-s": "Nidan verb lower m-row (-mu)",
  "v2n-s": "Nidan verb lower n-row (-nu)",
  "v2r-k": "Nidan verb upper r-row (-ru)",
  "v2r-s": "Nidan verb lower r-row (-ru)",
  "v2s-s": "Nidan verb lower s-row (-su)",
  "v2t-k": "Nidan verb upper t-row (-tsu)",
  "v2t-s": "Nidan verb lower t-row (-tsu)",
  "v2w-s": "Nidan verb lower w-row (-u/wye inflection)",
  "v2y-k": "Nidan verb upper y-row (-yu)",
  "v2y-s": "Nidan verb lower y-row (-yu)",
  "v2z-s": "Nidan verb lower z-row (-zu)",
  v4b: "Yodan verb (-bu)",
  v4g: "Yodan verb (-gu)",
  v4h: "Yodan verb (-fu)",
  v4k: "Yodan verb (-ku)",
  v4m: "Yodan verb (-mu)",
  v4n: "Yodan verb (-nu)",
  v4r: "Yodan verb (-ru)",
  v4s: "Yodan verb (-su)",
  v4t: "Yodan verb (-tsu)",
  v5: "Godan verb",
  v5aru: "Godan verb (aru special)",
  v5b: "Godan verb (-bu)",
  v5g: "Godan verb (-gu)",
  v5k: "Godan verb (-ku)",
  "v5k-s": "Godan verb (iku/yuku special)",
  v5m: "Godan verb (-mu)",
  v5n: "Godan verb (-nu)",
  v5r: "Godan verb (-ru)",
  "v5r-i": "Godan verb (-ru, irregular)",
  v5s: "Godan verb (-su)",
  v5t: "Godan verb (-tsu)",
  v5u: "Godan verb (-u)",
  "v5u-s": "Godan verb (-u, special)",
  v5uru: "Godan verb (ancient uru/eru form)",
  vi: "Intransitive verb",
  vk: "Kuru verb",
  vn: "N-verb (nu, irregular)",
  vr: "R-verb (ri, irregular)",
  vs: "Suru verb",
  "vs-c": "Suru verb (classical)",
  "vs-i": "Suru verb (modern)",
  "vs-s": "Suru verb (special)",
  vt: "Transitive verb",
  vz: "Ichidan verb (zuru type, alt. -jiru form)",
  gikun: "Gikun / jukujikun (special reading)",
  ok: "Historical kana usage",
  rk: "Rare kana form",
  sk: "Search-only kana form",
};

export const getFullTagName = (tag: string, short?: boolean) => {
  const fTag = extractTags(tag)[0];
  const actualTag = fTag ? fTag : tag;
  const fromMap = TAG_FULLNAME_MAP_ENG[actualTag.replace(/\(|\)/g, "")];
  const specialTag = SPECIAL_TAGS.find(({ check }) => check(actualTag));
  const special =
    specialTag?.shortName && short
      ? specialTag?.shortName(actualTag)
      : specialTag?.name(actualTag);
  const specialFromMap =
    TAG_FULLNAME_MAP_ENG[special as keyof typeof TAG_FULLNAME_MAP_ENG];
  return fromMap || specialFromMap || special || actualTag;
};

export const aggregateTags = (taglist: string[]) => {
  return [
    ...new Set(
      taglist.map((t) => {
        const spt = SPECIAL_TAGS.find((q) => q.check(t));
        if (!spt) return t;
        return spt.groupName(t);
      }),
    ),
  ];
};

export type TagShortcut = {
  code: RegExp;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  caps?: boolean;
  extract: (r: RegExpExecArray) => (string | undefined)[];
};

/**
 * Shortcuts:  
 * F1 (Caps)        => `(n1)`  
 * F2 (Caps)        => `(n2)`  
 * F3 (Caps)        => `(n3)`  
 * F4 (Caps)        => `(n4)`  
 * F5 (Caps)        => `(n5)`  
 *
 * Digit0 (Caps)    => `(n0)`  
 * KeyA (Caps)      => `(n1)`  
 * KeyS (Caps)      => `(n2)`  
 * KeyD (Caps)      => `(n3)`  
 * KeyF (Caps)      => `(n4)`  
 * KeyG (Caps)      => `(n5)`  
 *
 * Digit1-6 (Caps)  => `(g1)` - `(g6)`  
 *
 * KeyJ (Caps)      => `(joyo)`  
 * Shift+KeyJ (Caps)=> `(hyougai)`  
 *
 * KeyK (Caps)      => `(hs)`  
 * KeyH (Caps)      => `(jh)`  
 *
 * KeyQ (Caps)      => `(kk1)`  
 * KeyW (Caps)      => `(kk2)`  
 * KeyE (Caps)      => `(kk3)`  
 * KeyR (Caps)      => `(kk4)`  
 * KeyT (Caps)      => `(kk5)`  
 * KeyY (Caps)      => `(kk6)`  
 * KeyU (Caps)      => `(kk7)`  
 * KeyI (Caps)      => `(kk8)`  
 * KeyO (Caps)      => `(kk9)`  
 * KeyP (Caps)      => `(kk10)`  
 *
 * KeyZ (Caps)      => `(jis1)`  
 * KeyX (Caps)      => `(jis2)`
 */

export const tagShortcuts: TagShortcut[] = [
  {
    code: /^KeyA$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(n1)"];
    },
  },
  {
    code: /^KeyS$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(n2)"];
    },
  },
  {
    code: /^KeyD$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(n3)"];
    },
  },
  {
    code: /^KeyF$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(n4)"];
    },
  },
  {
    code: /^KeyG$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(n5)"];
    },
  },
  {
    code: /^Digit(?<grade>[1-6])$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      const grade = r?.groups?.grade;
      return grade ? [`(g${grade})`] : [];
    },
  },
  {
    code: /^Digit(?<jlpt>[0])$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      const jlpt = r?.groups?.jlpt;
      return jlpt ? [`(n${jlpt})`] : [];
    },
  },
  {
    code: /^KeyJ$/gi,
    caps: true,
    shift: false,
    extract: (r: RegExpExecArray) => {
      return ["(joyo)"];
    },
  },
  {
    code: /^KeyJ$/gi,
    caps: true,
    shift: true,
    extract: (r: RegExpExecArray) => {
      return ["(hyougai)"];
    },
  },
  {
    code: /^KeyK$/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(hs)"];
    },
  },
  {
    code: /^KeyH/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(jh)"];
    },
  },
  {
    code: /^KeyQ/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk1)"];
    },
  },

  {
    code: /^KeyW/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk2)"];
    },
  },

  {
    code: /^KeyE/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk3)"];
    },
  },

  {
    code: /^KeyR/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk4)"];
    },
  },
  {
    code: /^KeyT/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk5)"];
    },
  },
  {
    code: /^KeyY/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk6)"];
    },
  },
  {
    code: /^KeyU/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk7)"];
    },
  },
  {
    code: /^KeyI/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk8)"];
    },
  },
  {
    code: /^KeyO/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk9)"];
    },
  },
  {
    code: /^KeyP/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(kk10)"];
    },
  },
  {
    code: /^KeyZ/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(jis1)"];
    },
  },
  {
    code: /^KeyX/gi,
    caps: true,
    extract: (r: RegExpExecArray) => {
      return ["(jis2)"];
    },
  },
];
