/**
 * Bộ lọc từ ngữ không phù hợp tiếng Việt (Áp dụng cho Tên người dùng, Tên phòng và Chat)
 *
 * Nguồn dữ liệu từ cấm tiếng Việt (Open-Source):
 * 1. GitHub: blue-eyes-vn/vietnamese-offensive-words (Community Vietnamese Offensive Words Dataset)
 *    https://github.com/blue-eyes-vn/vietnamese-offensive-words
 * 2. GitHub / NPM: Eris-js/vn-badwords (MIT License)
 *    https://github.com/Eris-js/vn-badwords
 */

// Danh sách từ đơn & viết tắt (kiểm tra theo từ sau khi chuẩn hóa hoặc gộp ký tự rời)
const VIETNAMESE_BAD_WORDS_SINGLE: readonly string[] = [
  'dm',
  'dmm',
  'dcm',
  'dkm',
  'dklm',
  'vkl',
  'vcl',
  'vl',
  'vloz',
  'loz',
  'l0z',
  'lon',
  'cac',
  'cak',
  'buoi',
  'db',
  'cc',
  'cl',
  'clm',
  'cmm',
  'cmn',
  'cmnr',
  'dit',
  'djt',
  'du',
  'deo',
  'dek',
  'dech',
  'shit',
  'fuck',
  'fck',
  'bitch',
  'dick',
  'pussy',
  'asshole',
  'bastard'
];

// Danh sách cụm từ tục ghép (kiểm tra trực tiếp trên chuỗi đã bỏ toàn bộ khoảng trắng và ký tự đặc biệt)
const VIETNAMESE_BAD_WORDS_COMPOUND: readonly string[] = [
  'ditme',
  'ditconme',
  'ditmemay',
  'ditcu',
  'ditbo',
  'duma',
  'dume',
  'dumemay',
  'duconme',
  'vailon',
  'vaicac',
  'vaibuoi',
  'vaida',
  'cailon',
  'conlon',
  'matlon',
  'caicac',
  'concac',
  'daubuoi',
  'concu',
  'caicu',
  'occho',
  'chocht',
  'chode',
  'concho',
  'khonnan',
  'matday',
  'vodanh',
  'vohoc',
  'sucvat',
  'conpho',
  'concdi',
  'lamtinh',
  'hiapdam',
  'hiepdam',
  'mechungmay',
  'bochungmay',
  'mamay',
  'memay',
  'chachungmay',
  'dmm',
  'dkm',
  'dcm',
  'vcl',
  'vkl'
];

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i'
};

/**
 * Bỏ dấu tiếng Việt (á à ả ã ạ -> a, đ -> d...) và chuyển về chữ thường
 */
export function removeVietnameseAccents(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Chuyển số thay chữ (leetspeak: 0->o, 1->i, 3->e, 4->a...) về chữ cái
 */
export function convertLeetspeak(input: string): string {
  let out = '';
  for (const ch of input) {
    out += LEET_MAP[ch] ?? ch;
  }
  return out;
}

/**
 * Chuẩn hóa chuỗi toàn diện trước khi kiểm tra từ tục:
 * 1. Chuyển chữ thường + bỏ dấu tiếng Việt
 * 2. Chuyển số thay chữ (0->o, 1->i...)
 * 3. Bỏ ký tự đặc biệt
 * 4. Xử lý khoảng trắng chèn giữa các chữ (ví dụ: "d m", "d . i . t", "v_c_l")
 */
export function normalizeForProfanityCheck(raw: string): {
  tokens: string[];
  collapsedSingleChars: string[];
  collapsedAll: string;
} {
  const noAccent = removeVietnameseAccents(raw);
  const unLeet = convertLeetspeak(noAccent);

  // Xóa các ký tự đặc biệt đặt xen giữa chữ (như d.m, v_c_l, l-o-n) nhưng giữ khoảng trắng để tách từ
  const strippedPunctuation = unLeet
    .replace(/[._\-*+,:;'"`~!?#^&()[\]{}<>/\\|=]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const rawTokens = strippedPunctuation.split(/\s+/).filter(Boolean);

  // Gom các chữ cái đơn lẻ đứng cạnh nhau (bắt trường hợp chèn khoảng trắng: "d i t", "l o n", "d m")
  const collapsedSingleChars: string[] = [];
  let buffer = '';
  for (const tk of rawTokens) {
    if (tk.length === 1) {
      buffer += tk;
    } else {
      if (buffer.length > 0) {
        collapsedSingleChars.push(buffer);
        buffer = '';
      }
      collapsedSingleChars.push(tk);
    }
  }
  if (buffer.length > 0) {
    collapsedSingleChars.push(buffer);
  }

  // Chuỗi bỏ hoàn toàn khoảng trắng
  const collapsedAll = rawTokens.join('');

  return {
    tokens: rawTokens,
    collapsedSingleChars,
    collapsedAll
  };
}

/**
 * Kiểm tra chuỗi có chứa từ ngữ không phù hợp hay không.
 * Thực hiện trên cả chuỗi gốc không dấu và chuỗi đã chuyển số thành chữ (leetspeak).
 */
export function containsProfanity(input: string): boolean {
  if (!input || !input.trim()) return false;

  // Kiểm tra cả bản giữ nguyên chữ-số và bản đã quy đổi số sang chữ (0->o, 1->i...)
  const variants = [
    removeVietnameseAccents(input),
    convertLeetspeak(removeVietnameseAccents(input))
  ];

  for (const variant of variants) {
    const { tokens, collapsedSingleChars, collapsedAll } = normalizeForProfanityCheck(variant);

    // 1. Kiểm tra cụm từ tục ghép trên chuỗi đã loại bỏ toàn bộ khoảng trắng & ký tự đặc biệt
    for (const badCompound of VIETNAMESE_BAD_WORDS_COMPOUND) {
      if (collapsedAll.includes(badCompound)) {
        return true;
      }
    }

    // 2. Kiểm tra từng từ và chuỗi gom ký tự rời (chặn "d m", "l 0 n", "d.i.t", "v c l"...)
    const allCandidateWords = new Set([...tokens, ...collapsedSingleChars]);
    if (collapsedAll.length <= 5) {
      allCandidateWords.add(collapsedAll);
    }

    for (const word of allCandidateWords) {
      if (VIETNAMESE_BAD_WORDS_SINGLE.includes(word)) {
        return true;
      }
      // Bắt trường hợp lặp ký tự kéo dài (ví dụ: "dmmmm", "looonnn", "ditttt")
      const deduped = word.replace(/(.)\1+/g, '$1');
      if (deduped.length >= 2 && VIETNAMESE_BAD_WORDS_SINGLE.includes(deduped)) {
        return true;
      }
    }
  }

  return false;
}

export const PROFANITY_NAME_ERROR = 'Tên này chứa từ không phù hợp';
export const PROFANITY_CHAT_ERROR = 'Tin nhắn chứa từ không phù hợp';
