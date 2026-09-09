import * as pdfjsLib from 'pdfjs-dist';
import { OilItem, OilSource } from '../types';

// Set worker source safely for browser environment
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    // Use unpkg CDN matching installed version with reliable fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Failed to set pdfjs workerSrc:', e);
  }
}

export interface ParsedPdfResult {
  equipmentNo: string;
  siteName: string;
  inspectorName: string;
  supervisor?: string;
  inspectionDate: string;
  detectedType: OilSource;
  rawText: string;
  items: Array<{
    uid: string;
    item_type?: 'triangle' | 'square';
    description: string;
    title?: string;
    source: OilSource;
  }>;
}

/**
 * Extracts structured plain text page-by-page from a PDF File or ArrayBuffer
 * with maximum precision for Thai typography, tone marks, vowels, and technical checklist codes.
 */
export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as any[];
    if (!items || items.length === 0) continue;

    // Filter valid text items
    const textItems = items.filter((it) => typeof it.str === 'string' && it.str.length > 0);

    // High precision separation:
    // Base items (consonants, numbers, punctuation, latin) anchor the line baselines
    // Combining items (upper/lower vowels, tone marks) must latch onto their base line
    interface TextItemWithCoords {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
      isCombining: boolean;
    }

    const preparedItems: TextItemWithCoords[] = textItems.map((item) => {
      const y = item.transform ? item.transform[5] : 0;
      const x = item.transform ? item.transform[4] : 0;
      const width = item.width || 0;
      const height = item.height || (item.transform ? Math.abs(item.transform[3]) : 10);
      // Check if string contains ONLY Thai combining diacritics / tone marks / floating vowels
      const isCombining = /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+$/.test(item.str.trim());
      return {
        str: item.str,
        x,
        y,
        width,
        height,
        isCombining,
      };
    });

    const lineBuckets: Array<{ baselineY: number; items: TextItemWithCoords[] }> = [];

    // Step 1: Place base items into buckets first
    for (const item of preparedItems) {
      if (item.isCombining) continue;

      let bucket = lineBuckets.find((b) => Math.abs(b.baselineY - item.y) <= 6);
      if (!bucket) {
        bucket = { baselineY: item.y, items: [] };
        lineBuckets.push(bucket);
      } else {
        // Smooth baseline average
        bucket.baselineY = (bucket.baselineY * bucket.items.length + item.y) / (bucket.items.length + 1);
      }
      bucket.items.push(item);
    }

    // Step 2: Assign Thai combining vowels / tone marks to the closest line bucket within tolerance (up to 16pt)
    for (const item of preparedItems) {
      if (!item.isCombining) continue;

      let bestBucket: { baselineY: number; items: TextItemWithCoords[] } | null = null;
      let minDiff = 9999;

      for (const bucket of lineBuckets) {
        // Thai upper diacritics are generally 2-14pt ABOVE baseline (item.y > bucket.baselineY)
        // Lower vowels are 2-8pt BELOW baseline (item.y < bucket.baselineY)
        const diff = Math.abs(bucket.baselineY - item.y);
        if (diff <= 16 && diff < minDiff) {
          minDiff = diff;
          bestBucket = bucket;
        }
      }

      if (bestBucket) {
        bestBucket.items.push(item);
      } else {
        // If no line bucket was found, create one
        let fallbackBucket = lineBuckets.find((b) => Math.abs(b.baselineY - item.y) <= 8);
        if (!fallbackBucket) {
          fallbackBucket = { baselineY: item.y, items: [] };
          lineBuckets.push(fallbackBucket);
        }
        fallbackBucket.items.push(item);
      }
    }

    // Sort line buckets from top to bottom (Y descending)
    lineBuckets.sort((a, b) => b.baselineY - a.baselineY);

    const pageLines: string[] = [];

    for (const bucket of lineBuckets) {
      // Sort items on the same horizontal line from left to right (X ascending)
      bucket.items.sort((a, b) => a.x - b.x);

      let lineText = '';
      let prevItem: TextItemWithCoords | null = null;

      for (const it of bucket.items) {
        const text = it.str;
        if (!text) continue;

        if (!prevItem) {
          lineText += text;
          prevItem = it;
          continue;
        }

        const prevEndX = prevItem.x + prevItem.width;
        const gap = it.x - prevEndX;
        const isThaiCombining = it.isCombining || /^[\u0E30-\u0E3A\u0E47-\u0E4E]/.test(text);
        const prevEndsWithThai = /[\u0E00-\u0E7F]$/.test(lineText);
        const currStartsWithThai = /^[\u0E00-\u0E7F]/.test(text);
        const isPunctuation = /^[\.,:;\)\]]/.test(text);
        const prevIsPunctuation = /[\(\[]$/.test(lineText);
        const prevEndsWithDigitOrDot = /[\d\.]$/.test(lineText.trim());
        const currStartsWithDigitOrDot = /^[\d\.]/.test(text.trim());

        // Decision: should a space be inserted between prevItem and current item?
        if (isThaiCombining) {
          // Never insert space before Thai diacritics / tone marks / upper-lower vowels
          lineText += text;
        } else if (isPunctuation || prevIsPunctuation) {
          lineText += text;
        } else if (prevEndsWithDigitOrDot && currStartsWithDigitOrDot && gap < 8) {
          // UIDs and numbers like 3.4.19 or 6.0.6.b - keep contiguous without spaces!
          lineText += text;
        } else if (prevEndsWithThai && currStartsWithThai) {
          // In Thai writing, words are continuous. Only insert space on large intentional paragraph/column gap (> 16pt)
          if (gap > 16) {
            lineText += ' ' + text;
          } else {
            lineText += text;
          }
        } else if (gap > 3.5) {
          // English words or separate columns
          lineText += ' ' + text;
        } else {
          lineText += text;
        }

        prevItem = it;
      }

      // Thai Typography Normalization & Error Correction:
      let cleanedLine = lineText
        .normalize('NFC')
        // Fix space between Thai consonant and combining upper/lower vowels or tone marks
        .replace(/([\u0E01-\u0E2E])\s+([\u0E30-\u0E3A\u0E47-\u0E4E])/g, '$1$2')
        // Fix space between upper vowel and tone mark: e.g. ิ + ้
        .replace(/([\u0E31\u0E34-\u0E37\u0E47\u0E4D])\s+([\u0E48-\u0E4C])/g, '$1$2')
        // Fix space between Thai leading vowel (เ แ โ ใ ไ) and following consonant
        .replace(/([เแโใไ])\s+([\u0E01-\u0E2E])/g, '$1$2')
        // Fix spaces accidentally split inside Thai words
        .replace(/([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g, (m, c1, c2) => {
          // Keep space if between Thai punctuation or digits
          if (/[\u0E2F\u0E46\u0E50-\u0E59]/.test(c1) || /[\u0E2F\u0E46\u0E50-\u0E59]/.test(c2)) {
            return `${c1} ${c2}`;
          }
          return `${c1}${c2}`;
        })
        // Fix broken spaces around dots in section/UID numbers: 3 . 4 . 19 -> 3.4.19
        .replace(/(\d{1,2})\s*\.\s*(\d{1,2}(?:\s*\.\s*\d{1,2})*(?:\s*\.\s*[a-zA-Z])?)/g, (m) => m.replace(/\s+/g, ''))
        // Normalize multiple spaces into single space
        .replace(/[ \t]+/g, ' ')
        .trim();

      if (cleanedLine.length > 0) {
        pageLines.push(cleanedLine);
      }
    }

    fullText += `\n--- PAGE ${pageNum} ---\n` + pageLines.join('\n');
  }

  return fullText;
}

/**
 * Text parsing algorithm strictly following user rules:
 * - 'Commission number' -> Equipment No.
 * - 'Elevator location' -> Site Name
 * - 'SAIS Inspector' -> Inspector Name
 * - 'Date' (DD/MM/YYYY) -> Inspection Date
 * - Section after 'Responsible fitter':
 *    UID (Section code) & text under 'Annotations Comment' -> Problem description
 *    STRICT BOUNDARY: Strictly extract text inside 'Annotations Comment' only.
 */
export function parseOilPdfText(
  fullText: string,
  preferredSource?: OilSource
): ParsedPdfResult {
  // 1. Determine detected type (Installer vs Customer)
  let detectedType: OilSource = preferredSource || 'Installer';
  const lower = fullText.toLowerCase();
  if (lower.includes('for customer') || lower.includes('findings related to the customer')) {
    detectedType = 'Customer';
  } else if (lower.includes('for installer') || lower.includes('findings related to schindler') || lower.includes('for schindler')) {
    detectedType = 'Installer';
  }

  // 2. Extract Commission number (Equipment No.)
  let equipmentNo = '';
  const commMatch = fullText.match(/Commission\s*number\s*[:]?\s*([A-Za-z0-9]+)/i) ||
                    fullText.match(/Commission\s*No\.?\s*[:]?\s*([A-Za-z0-9]+)/i) ||
                    fullText.match(/Equipment\s*No\.?\s*[:]?\s*([A-Za-z0-9]+)/i);
  if (commMatch && commMatch[1]) {
    equipmentNo = commMatch[1].trim();
  }

  // 3. Extract Elevator location (Site Name)
  let siteName = '';
  const locMatch = fullText.match(/Elevator\s*location\s*[:]?\s*([^\n\r]+)/i);
  if (locMatch && locMatch[1]) {
    siteName = locMatch[1]
      .replace(/SAIS\s*Inspector.*/i, '')
      .replace(/Supervisor.*/i, '')
      .replace(/Responsible.*/i, '')
      .trim();
  }

  // 4. Extract SAIS Inspector
  let inspectorName = '';
  const inspMatch = fullText.match(/SAIS\s*Inspector(?:\s*[\/\&]\s*Re-inspector)?(?:\s*\[#[^\]]+\])?\s*[:]?\s*([^\n\r]+)/i);
  if (inspMatch && inspMatch[1]) {
    inspectorName = inspMatch[1]
      .replace(/^\[#[^\]]+\]\s*/, '')
      .replace(/Supervisor.*/i, '')
      .replace(/Responsible.*/i, '')
      .replace(/Date.*/i, '')
      .trim();
  }

  // 4.1 Extract Supervisor / Responsible fitter
  let supervisor = '';
  const supMatch = fullText.match(/(?:Responsible\s+)?(?:Supervisor|Site\s*Supervisor)\s*[:]?\s*([^\n\r]+)/i) ||
                    fullText.match(/Responsible\s+fitter\s*[:]?\s*([^\n\r]+)/i);
  if (supMatch && supMatch[1]) {
    supervisor = supMatch[1]
      .replace(/^\[#[^\]]+\]\s*/, '')
      .replace(/Date.*/i, '')
      .replace(/Signature.*/i, '')
      .replace(/SAIS\s*Inspector.*/i, '')
      .trim();
  }

  // 5. Extract Date in DD/MM/YYYY or YYYY-MM-DD format
  let inspectionDate = '';
  const dateMatch = fullText.match(/Date(?:\s*\[#[^\]]+\])?\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
  if (dateMatch && dateMatch[1]) {
    inspectionDate = dateMatch[1].trim();
  } else {
    // Fallback search for any DD/MM/YYYY pattern in header or sign-off section
    const anyDateMatch = fullText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (anyDateMatch) {
      inspectionDate = anyDateMatch[1];
    }
  }

  // 6. Extract OIL problem items starting after 'Responsible fitter'
  const items: Array<{
    uid: string;
    description: string;
    title?: string;
    source: OilSource;
    item_type?: 'triangle' | 'square';
  }> = [];

  const fitterIdx = fullText.search(/Responsible\s+fitter/i);
  const afterFitter = fitterIdx !== -1 ? fullText.slice(fitterIdx) : fullText;

  // Sign-off section end boundary
  const signOffIdx = afterFitter.search(/\b(?:17\s+)?Inspection\s+sign[\s\-]*off/i);
  const findingsSection = signOffIdx !== -1 ? afterFitter.slice(0, signOffIdx) : afterFitter;

  // Split strictly by 'Annotations Comment' (handling variations in whitespace and punctuation)
  const parts = findingsSection.split(/Annotations?\s*(?:[:\-])?\s*Comment/i);

  for (let i = 0; i < parts.length - 1; i++) {
    // Strip iteration tags [#2.2] from before-text so they don't get misidentified as UIDs
    const cleanBeforeRaw = parts[i].replace(/\[#[^\]]+\]/g, '');
    // Normalize spaces in dotted numbers e.g. "11 . 13 . 2 . a" -> "11.13.2.a"
    const cleanBefore = cleanBeforeRaw
      .replace(/(\d{1,2})\s*\.\s*(\d{1,2})/g, '$1.$2')
      .replace(/(\d{1,2})\s*\.\s*([a-zA-Z])\b/g, '$1.$2')
      .replace(/([a-zA-Z])\s*\.\s*(\d{1,2})/g, '$1.$2');

    const afterText = parts[i + 1];

    // Detect Triangle (△) vs Square (□) defect classification
    // In Schindler SAIS inspections, items are marked with Triangle (safety/high-risk) or Square (standard nonconformity)
    let itemType: 'triangle' | 'square' = 'square';
    const trailingContext = cleanBefore.slice(-450);
    const leadingContext = afterText.slice(0, 150);
    const context = trailingContext + ' ' + leadingContext;
    if (
      /[△▲▴▵►▷▼▽\u25B2\u25B3\u25B4\u25B5\u25BC\u25BD\u25BA\u25BB]|(?:\b|\(|\[)triangle(?:\b|\)|\])|สามเหลี่ยม|(?:\b|\(|\[)[Tt](?:\)|\]\s*No)|△\s*No|▲\s*No/i.test(
        context
      )
    ) {
      itemType = 'triangle';
    } else if (/[□■\u25A0\u25A1\u25A2]|square|สี่เหลี่ยม|□No|■No/i.test(context)) {
      itemType = 'square';
    }

    // Find UID before this Annotations Comment
    // Prioritize 3-4 level (e.g. 2.14.1.b, 3.4.19, 6.0.6.b, 11.13.2.a), then 2-level (e.g. 3.4, 6.1)
    const uidMatches = [
      ...cleanBefore.matchAll(/(?:^|\n|\r|\s|[\(\[])(\d{1,2}(?:\.\d{1,2})+(?:\.[a-zA-Z])?|\d{1,2}\.\d{1,2}\.[a-zA-Z]|\d{1,2}\.[a-zA-Z]|\d{1,2}\.\d{1,2})(?:[\s\.\:\)\-\]]|$)/g),
    ];

    let uid = '';
    let itemTitle = '';

    if (uidMatches.length > 0) {
      const lastMatch = uidMatches[uidMatches.length - 1];
      uid = lastMatch[1].trim().replace(/[\.\s]+$/, '');

      // Extract item title / question if available between UID and Annotations Comment
      if (lastMatch.index !== undefined) {
        const betweenText = cleanBefore.slice(lastMatch.index + lastMatch[0].length).trim();
        // Remove trailing answers (No / Yes / NA / Fail / □No / △No)
        itemTitle = betweenText
          .replace(/\s*(?:[□■△▲\u25A0\u25A1\u25B2\u25B3])?\s*(?:No|Yes|NA|Fail|Failed)$/i, '')
          .replace(/[\:\-\_]+$/, '')
          .trim();
        // If title contains triangle mark, enforce triangle
        if (/[△▲\u25B2\u25B3]|triangle|สามเหลี่ยม/i.test(itemTitle)) {
          itemType = 'triangle';
        }
      }
    } else {
      // If no dotted UID was found, use numbered sequence Item-N instead of a lone section number
      uid = `Item-${i + 1}`;
    }

    // STRICT BOUNDARY: The comment text is strictly what follows 'Annotations Comment'
    // and terminates IMMEDIATELY before:
    // 1. Next section headers (e.g. "16 Final checks", "17 Inspection sign-off", "11 Machine room", etc.)
    // 2. Next question code / UID (e.g. 11.13.3, 3.4.20, 6.0.7, 2.14.2, 1.1)
    // 3. Document headers / footers / sign-offs / page markers
    // 4. Next Annotations Comment or answer tags
    const boundaryRegexes = [
      // Next item code / UID anywhere (e.g. 3.4.19, 6.0.6.b, 11.13.1.c, 6.0.7)
      /(?:^|\n|\r|\s{2,}|\s+)(?:\d{1,2}\.\d{1,2}(?:\.\d{1,2})+(?:\.[a-zA-Z])?|\d{1,2}\.\d{1,2}\.[a-zA-Z]|\d{1,2}\.\d{1,2})\b/,
      // Section headers with keywords (e.g. "16 Final checks", "17 Inspection sign-off", "11 Machine room")
      /(?:^|\n|\r|\s{2,}|\b)\s*(?:1[0-9]|[1-9])\.?\s+(?:Final\s*checks?|Inspection\s*sign[\s\-]*offs?|Sign[\s\-]*offs?|Machine\s*room|Car\s*enclosure|Car\s*top|Well|Shaft|Pit\s*area|Pit|Landing|General|Maintenance|Traction|Hydraulic|Electrical|Door|Governor|Buffer|Counterweight|Brake|Safety|Emergency|Installation|Overview)\b/i,
      // Standalone section title even inline if PDF text is single-line joined
      /\b(?:1[0-9]|[1-9])\.?\s+(?:Final\s*checks?|Inspection\s*sign[\s\-]*offs?|Sign[\s\-]*offs?)\b/i,
      // Section header with uppercase title e.g. "16. FINAL CHECKS"
      /(?:^|\n|\r|\s{2,})\s*\d{1,2}\.\s+[A-Z]{3,}/,
      // Checkbox and answers leading into next question e.g. "□No", "△No", "No 11.13", "Yes", "NA"
      /(?:^|\n|\r|\s+)(?:[□■△▲\u25A0\u25A1\u25B2\u25B3]\s*)?(?:No|Yes|NA|Fail)\b/i,
      // Any uppercase English question header starting after a Thai sentence (prevents bleeding of question text into comments)
      /(?:[\u0E00-\u0E7F])\s+(?:[A-Z][a-z]+(?:\s+[A-Za-z0-9\/\-]+){2,})/,
      // Page break markers or page count
      /(?:^|\n|\r|\s+)(?:---\s*PAGE\s*\d+\s*---|Page\s*\d+\s*of\s*\d+)/i,
      // Form header/footer labels
      /(?:^|\n|\r|\s+)(?:Commission\s*number|Elevator\s*location|SAIS\s*Inspector|Responsible\s*fitter|Supervisor|Inspection\s*sign-off|Findings\s*related\s*to|Findings\s*for|Schindler)/i,
      // Date or signature lines
      /(?:^|\n|\r|\s+)(?:Date\s*\[#[^\]]+\]|Date\s*:|Signature\s*:)/i,
      // Next Annotations Comment
      /(?:^|\n|\r|\s+)Annotations?\s*(?:[:\-])?\s*Comment/i,
    ];

    let stopIndex = afterText.length;

    for (const regex of boundaryRegexes) {
      const match = afterText.match(regex);
      if (match && match.index !== undefined && match.index < stopIndex) {
        // If the match starts with a Thai character (from the English bleed regex), stop right after the Thai character
        if (regex.source.includes('[\u0E00-\u0E7F]')) {
          stopIndex = match.index + 1;
        } else {
          stopIndex = match.index;
        }
      }
    }

    // Additional scan: if there is a next UID pattern located after index 0
    const nextUidMatch = afterText.slice(0, stopIndex).match(/(?:^|\n|\r|\s+)(\d{1,2}\.\d{1,2}(?:\.\d{1,2})*(?:\.[a-zA-Z])?)(?:\s|$)/);
    if (nextUidMatch && nextUidMatch.index !== undefined && nextUidMatch.index > 0) {
      stopIndex = Math.min(stopIndex, nextUidMatch.index);
    }

    let comment = afterText.slice(0, stopIndex);

    // Clean up comment text strictly: strip leading tildes, dashes, colons, stars
    comment = comment
      .replace(/^[\s~:\-\*#]+/, '')
      // Remove any trailing section header bleed-through (e.g. "แนว 16 Final checks" or "16 Final checks")
      .replace(/(?:^|\s+)แนว\s+\d{1,2}\s+Final\s+checks?.*$/i, '')
      .replace(/(?:^|\s+)\d{1,2}\s+Final\s+checks?.*$/i, '')
      .replace(/(?:^|\s+)\d{1,2}\s+Inspection\s+sign[\s\-]*off.*$/i, '')
      // Strip any trailing English questions or UID codes that bled onto the tail
      .replace(/(?:^|\s+)(?:\d{1,2}\.\d{1,2}(?:\.\d{1,2})*(?:\.[a-zA-Z])?)\s+[A-Za-z].*$/i, '')
      .replace(/(?:^|\s+)(?:[□■△▲\u25A0\u25A1\u25B2\u25B3]\s*)?(?:No|Yes|NA|Fail)$/i, '')
      .normalize('NFC')
      .replace(/\r/g, '')
      .trim();

    // If there's an actual comment inside Annotations Comment
    if (comment.length > 0) {
      items.push({
        uid,
        title: itemTitle || '',
        description: comment,
        source: detectedType,
        item_type: itemType,
      });
    }
  }

  return {
    equipmentNo,
    siteName,
    inspectorName,
    supervisor,
    inspectionDate,
    detectedType,
    rawText: fullText,
    items,
  };
}

/**
 * Merges extracted data from Installer and Customer PDFs into a unified set
 */
export function mergeOilResults(
  installerData: ParsedPdfResult | null,
  customerData: ParsedPdfResult | null
): {
  equipmentNo: string;
  siteName: string;
  inspectorName: string;
  supervisor?: string;
  inspectionDate: string;
  items: OilItem[];
} {
  const equipmentNo = installerData?.equipmentNo || customerData?.equipmentNo || '';
  const siteName = installerData?.siteName || customerData?.siteName || '';
  const inspectorName = installerData?.inspectorName || customerData?.inspectorName || '';
  const supervisor = installerData?.supervisor || customerData?.supervisor || '';
  const inspectionDate = installerData?.inspectionDate || customerData?.inspectionDate || '';

  const mergedItems: OilItem[] = [];
  let itemIndex = 1;

  // Add Installer items
  if (installerData?.items) {
    for (const it of installerData.items) {
      mergedItems.push({
        id: `oil_item_${Date.now()}_${itemIndex++}`,
        uid: it.uid || `Item-${itemIndex}`,
        item_type: it.item_type || 'square',
        source: 'Installer',
        title: it.title || '',
        description: it.description || '',
        status: 'Open',
        responsible: 'Installer / Schindler',
        created_at: new Date().toISOString(),
        notes: '',
      });
    }
  }

  // Add Customer items
  if (customerData?.items) {
    for (const it of customerData.items) {
      // Check if exact same UID and description already exist
      const exists = mergedItems.some(
        (existing) => existing.uid === it.uid && existing.description === it.description
      );
      if (!exists) {
        mergedItems.push({
          id: `oil_item_${Date.now()}_${itemIndex++}`,
          uid: it.uid || `Item-${itemIndex}`,
          item_type: it.item_type || 'square',
          source: 'Customer',
          title: it.title || '',
          description: it.description || '',
          status: 'Open',
          responsible: 'Customer (ลูกค้า)',
          created_at: new Date().toISOString(),
          notes: '',
        });
      }
    }
  }

  return {
    equipmentNo,
    siteName,
    inspectorName,
    supervisor,
    inspectionDate,
    items: mergedItems,
  };
}
