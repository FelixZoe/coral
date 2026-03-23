/**
 * wordfilter.ts — Comprehensive profanity / sensitive word filter
 * Covers: political, pornographic, violent, abusive, scam, spam, racist content
 * Supports: Chinese, English, mixed scripts, common evasion techniques
 */

// ============================================================
//  BLOCKED WORD DATABASE
//  Categories: political | porn | violence | abuse | scam | spam | racist | drugs
// ============================================================

/** Chinese sensitive words — merged flat set for fast lookup */
const ZH_BLOCKED: string[] = [
  // --- Political sensitive (政治敏感) ---
  '习近平', '习主席', '习总', '习大大', '包子', '小熊维尼', '维尼熊',
  '刁近平', '刁大大', '翠翠', '庆丰', '庆丰帝',
  '李克强', '李强', '王岐山', '温家宝', '胡锦涛', '江泽民', '蛤蟆', '膜蛤',
  '邓小平', '毛泽东', '毛主席',
  '共产党', '共匪', '中共', '土共', '赤匪', 'gcd', 'ccp',
  '六四', '天安门事件', '六四事件', '坦克人', '8964',
  '法轮功', '法轮大法', '李洪志', 'falun',
  '达赖喇嘛', '达赖', '藏独', '疆独', '台独', '港独',
  '民运', '民主运动', '反共', '反华', '颠覆政权', '颠覆国家',
  '独裁', '专制', '极权',
  '翻墙', '梯子', 'vpn', 'v2ray', 'clash', 'shadowsock', 'ssr', 'trojan',
  '文革', '文化大革命', '大跃进', '大饥荒', '反右',
  '刘晓波', '零八宪章', '艾未未', '王丹', '吾尔开希',
  '退党', '三退', '九评', '纪念碑',

  // --- Pornographic (色情) ---
  '操你妈', '操你', '日你妈', '日你', '肏', '艹你', '草你妈', '草你',
  '鸡巴', '几把', '屌', '阴茎', '阴道', '阴唇', '阴蒂',
  '做爱', '性交', '口交', '肛交', '手淫', '自慰', '打飞机',
  '高潮', '潮吹', '颜射', '内射', '中出', '无码', '有码',
  '色情', '黄片', '毛片', 'a片', 'av女优', '苍井空',
  '援交', '约炮', '一夜情', '包夜', '找小姐', '嫖',
  '裸聊', '裸体', '露点', '走光',
  '淫荡', '淫乱', '淫秽', '骚逼', '骚货', '浪叫',
  '乱伦', '人兽', '恋童', '幼女', '萝莉控', 'loli',
  '强奸', '强暴', '轮奸', '迷奸', '迷药', '春药', '催情',
  '阳具', '自慰器', '飞机杯', '充气娃娃', '情趣用品',
  'sm', '调教', '捆绑', '奴隶',

  // --- Violence / Terrorism (暴力/恐怖) ---
  '杀人', '砍人', '捅人', '弑', '屠杀', '血洗',
  '炸弹', '炸药', '爆炸物', '火药', '硝酸铵',
  '枪支', '手枪', '步枪', '冲锋枪', '子弹', '军火',
  '恐怖袭击', '恐怖分子', '圣战', '基地组织',
  '自杀', '自残', '割腕', '跳楼', '上吊',
  '虐待', '酷刑', '活摘', '器官买卖',

  // --- Abuse / Insults (辱骂/侮辱) ---
  '傻逼', '煞笔', '傻B', 'sb', '沙比', '傻比',
  '妈的', '他妈的', '你妈的', '卧槽', '我操', '尼玛',
  '狗日的', '王八蛋', '混蛋', '畜生', '贱人', '贱货',
  '废物', '垃圾', '脑残', '智障', '弱智', '白痴',
  '去死', '滚蛋', '滚犊子', '你全家', '断子绝孙',
  '婊子', '妓女', '鸡', '绿茶婊', '心机婊',
  '死全家', '全家死光', '不得好死', '下地狱',
  '人渣', '败类', '狗东西', '猪狗不如',
  '屁眼', '菊花', '蛋',
  '小日本', '日本鬼子', '棒子', '高丽棒子',
  '黑鬼', '白皮猪', '阿三', '猴子',

  // --- Scam / Gambling / Drugs (诈骗/赌博/毒品) ---
  '赌博', '赌场', '博彩', '菠菜', '彩票预测', '时时彩',
  '代孕', '卖肾', '器官', '枪支买卖',
  '洗钱', '地下钱庄', '跑分',
  '传销', '资金盘', '杀猪盘',
  '大麻', '冰毒', '海洛因', '可卡因', '摇头丸', '吸毒', '贩毒',
  'k粉', '麻古', '安非他命',

  // --- Spam / Ads (垃圾广告) ---
  '加微信', '加qq', '加我', '私聊', '代开发票',
  '刷单', '兼职日赚', '在家赚钱', '月入过万',
  '免费领取', '扫码领', '点击领取',
  '网赚', '暴利项目', '稳赚不赔',
]

/** English blocked words */
const EN_BLOCKED: string[] = [
  // --- Severe profanity ---
  'fuck', 'fucking', 'fucker', 'motherfucker', 'fck', 'fuk', 'f u c k',
  'shit', 'bullshit', 'shitty', 'horseshit',
  'bitch', 'bitches', 'biatch',
  'cunt', 'cunts',
  'dick', 'dickhead', 'cock', 'cocksucker',
  'asshole', 'arsehole', 'ass',
  'bastard', 'wanker', 'twat', 'prick',
  'whore', 'slut', 'hoe',
  'damn', 'goddamn',
  'nigger', 'nigga', 'negro', 'chink', 'gook', 'spic', 'kike', 'wetback',
  'faggot', 'fag', 'dyke', 'tranny',
  'retard', 'retarded',

  // --- Sexual ---
  'porn', 'porno', 'pornography', 'hentai', 'xxx', 'nsfw',
  'blowjob', 'handjob', 'rimjob', 'cumshot', 'creampie',
  'anal', 'orgasm', 'erection', 'dildo', 'vibrator',
  'masturbate', 'masturbation', 'jerkoff',
  'rape', 'rapist', 'molest', 'pedophile', 'paedophile',
  'incest', 'bestiality', 'necrophilia',
  'nude', 'naked', 'titties', 'boobs',
  'escort', 'prostitute', 'hooker', 'brothel',

  // --- Violence ---
  'kill yourself', 'kys', 'go die', 'suicide',
  'bomb', 'terrorist', 'terrorism', 'jihad',
  'genocide', 'massacre', 'slaughter',
  'shoot', 'shooting', 'gunman',
  'murder', 'homicide',

  // --- Hate / Racism ---
  'white supremacy', 'white power', 'heil hitler', 'nazi', 'neo-nazi',
  'kkk', 'ku klux klan',
  'holocaust denial',

  // --- Drugs ---
  'cocaine', 'heroin', 'meth', 'methamphetamine', 'crack',
  'weed', 'marijuana', 'ecstasy', 'mdma', 'lsd',
  'drug dealer', 'drug trafficking',

  // --- Scam / Spam ---
  'free money', 'make money fast', 'get rich quick',
  'click here', 'act now', 'limited offer',
  'casino', 'gambling', 'bet online',
  'crypto pump', 'bitcoin doubler',
]

// ============================================================
//  PRE-PROCESSING: Build optimized lookup structures
// ============================================================

/** Normalize text for matching: lowercase, strip common evasion chars */
function normalize(text: string): string {
  return text
    .toLowerCase()
    // Common number/symbol substitutions
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    // Strip zero-width chars, combining marks, and decoration
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u0300-\u036F]/g, '')
    // Strip common separator chars used to break words
    .replace(/[.*_\-~`|\\\/\s]+/g, '')
}

/** Build a Set of normalized blocked words */
const blockedSet = new Set<string>()
const blockedPatterns: string[] = []

for (const w of ZH_BLOCKED) {
  const n = normalize(w)
  if (n.length <= 1) continue
  blockedSet.add(n)
  blockedPatterns.push(n)
}
for (const w of EN_BLOCKED) {
  const n = normalize(w)
  if (n.length <= 1) continue
  blockedSet.add(n)
  blockedPatterns.push(n)
}

// Sort patterns by length descending so longer matches take priority
blockedPatterns.sort((a, b) => b.length - a.length)

// ============================================================
//  URL / Link detection
// ============================================================
const URL_PATTERN = /https?:\/\/|www\.|\.com|\.cn|\.net|\.org|\.io|\.xyz|\.top|\.vip|\.cc|\.info|t\.me|bit\.ly|短链|网址/i

// ============================================================
//  MAIN FILTER FUNCTION
// ============================================================

export interface FilterResult {
  blocked: boolean
  reason?: string    // category hint (not exposed to user)
  matchedWord?: string
}

/**
 * Check if text contains blocked content.
 * Returns { blocked: true, reason } if detected, { blocked: false } if clean.
 */
export function checkText(rawText: string): FilterResult {
  if (!rawText || typeof rawText !== 'string') {
    return { blocked: false }
  }

  // 1. Check for URLs / links (spam prevention)
  if (URL_PATTERN.test(rawText)) {
    return { blocked: true, reason: 'link', matchedWord: 'URL/link' }
  }

  // 2. Normalize the input
  const normalized = normalize(rawText)

  // 3. Check against all blocked patterns (substring match)
  for (const pattern of blockedPatterns) {
    if (normalized.includes(pattern)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: pattern }
    }
  }

  // 4. Check for repeated char spam (e.g. "啊啊啊啊啊啊啊啊啊啊")
  if (/(.)\1{7,}/.test(rawText)) {
    return { blocked: true, reason: 'spam_repeat', matchedWord: 'repeated chars' }
  }

  // 5. Check for excessive special chars / emoji spam
  const specialRatio = (rawText.replace(/[\w\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]/g, '').length) / rawText.length
  if (rawText.length > 5 && specialRatio > 0.7) {
    return { blocked: true, reason: 'spam_symbols', matchedWord: 'symbol spam' }
  }

  return { blocked: false }
}

/**
 * Quick boolean check — convenience wrapper
 */
export function isBlocked(text: string): boolean {
  return checkText(text).blocked
}
