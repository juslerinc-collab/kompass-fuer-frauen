// Detects words that point to acute danger or suicidal thoughts.
// Deterministic on purpose: the emergency hint must not depend on the AI.

const LATIN = (words) => words.map((w) => new RegExp(`(^|[^\\p{L}])${w}`, "iu"));
const ANY = (words) => words.map((w) => new RegExp(w, "iu"));

const DANGER = [
  // Deutsch
  ...LATIN([
    "umbring", "umzubring", "töte", "tötet", "töten", "schlägt mich", "schlagen mich", "geschlagen", "würgt", "gewürgt",
    "messer", "waffe", "pistole", "bedroht mich", "droht mich", "droht mir", "verletzt mich", "blute",
    "sperrt mich ein", "eingesperrt", "angst um mein leben", "lebensgefahr", "vergewaltig", "notfall",
  ]),
  // English
  ...LATIN([
    "kill", "hits me", "hit me", "beats me", "beat me", "beaten", "strangl", "chok", "knife", "gun",
    "weapon", "threaten", "hurts me", "hurt me", "locked in", "locks me in", "bleeding", "rape", "emergency",
    "afraid for my life",
  ]),
  // Türkçe
  ...LATIN(["öldür", "bıçak", "dövüyor", "dövdü", "vuruyor", "silah", "tehdit", "boğ", "tecavüz", "acil"]),
  // Arabic, Ukrainian, Tigrinya (non-Latin scripts: plain substring match)
  ...ANY([
    "يقتل", "قتل", "سكين", "يضرب", "ضربني", "سلاح", "يهدد", "اغتصاب", "يخنق", "طوارئ",
    "вбит", "вб'є", "вбʼє", "ніж", "б'є", "бʼє", "зброя", "погрожу", "душить", "згвалт",
    "ቐቲሉ", "ይቐትለኒ", "ይወቕዓኒ", "ካራ",
  ]),
];

const SELF_HARM = [
  ...LATIN(["suizid", "selbstmord", "mich umbringen", "nicht mehr leben", "suicid", "kill myself", "end my life", "intihar", "kendimi öldür"]),
  ...ANY(["انتحار", "أقتل نفسي", "самогубств", "покінчити з собою"]),
];

export function detectEmergency(text) {
  const t = (text || "").normalize("NFKC");
  const selfHarm = SELF_HARM.some((r) => r.test(t));
  const danger = selfHarm || DANGER.some((r) => r.test(t));
  return { danger, selfHarm };
}

const MESSAGES = {
  de: "Wenn du gerade in Gefahr bist: Ruf sofort die Polizei 117 an (Sanität 144). Rund um die Uhr hilft auch die Opferhilfe 142.",
  en: "If you are in danger right now: call the police on 117 immediately (ambulance 144). Victim support 142 also helps around the clock.",
  ar: "إذا كنتِ في خطر الآن: اتصلي فوراً بالشرطة على 117 (الإسعاف 144). خط مساعدة الضحايا 142 متاح أيضاً على مدار الساعة.",
  tr: "Şu anda tehlikedeysen: Hemen polisi 117'den ara (ambulans 144). Mağdur yardım hattı 142 de 7/24 yardım eder.",
  uk: "Якщо ти зараз у небезпеці: негайно телефонуй у поліцію 117 (швидка 144). Цілодобово допомагає також служба підтримки постраждалих 142.",
};

const SELF_HARM_MESSAGES = {
  de: "Wenn du daran denkst, dir etwas anzutun: Die Dargebotene Hand hört dir rund um die Uhr zu, Telefon 143.",
  en: "If you are thinking about harming yourself: Die Dargebotene Hand listens around the clock, phone 143.",
  ar: "إذا كنتِ تفكرين في إيذاء نفسك: خط Die Dargebotene Hand يستمع إليكِ على مدار الساعة، الهاتف 143.",
  tr: "Kendine zarar vermeyi düşünüyorsan: Die Dargebotene Hand 7/24 seni dinler, telefon 143.",
  uk: "Якщо ти думаєш завдати собі шкоди: Die Dargebotene Hand вислухає тебе цілодобово, телефон 143.",
};

export function emergencyText(lang, { danger, selfHarm }) {
  const parts = [];
  if (danger) parts.push(MESSAGES[lang] || MESSAGES.en);
  if (selfHarm) parts.push(SELF_HARM_MESSAGES[lang] || SELF_HARM_MESSAGES.en);
  return parts.join(" ");
}
