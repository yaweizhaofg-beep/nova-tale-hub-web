import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  MAX_SHOTS,
  MAX_SHOT_DURATION,
  MIN_SHOT_DURATION,
  SHOT_RATIOS,
  SHOT_RESOLUTIONS,
  type ShotFields,
  type VideoModel,
} from './demo-storyboard';

const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const officeRelationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
const workbookType = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
const headings = ['序号', '描述词', '时长', '分辨率', '比例', '模型', '备注'];
const maxFileSize = 8 * 1024 * 1024;
const maxXmlSize = 16 * 1024 * 1024;

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createShotWorkbook(shots: ShotFields[], defaultModel: VideoModel) {
  const rows = [
    headings,
    ...shots.map((shot, index) => [
      String(index + 1),
      shot.prompt,
      String(shot.durationSeconds),
      shot.resolution,
      shot.ratio,
      shot.videoModel ?? defaultModel,
      shot.remark,
    ]),
  ];
  const sheet = rows
    .map((row, index) => {
      const rowNumber = index + 1;
      const cells = row.map(
        (value, column) =>
          '<c r="' +
          String.fromCharCode(65 + column) +
          rowNumber +
          '" t="inlineStr"><is><t xml:space="preserve">' +
          escapeXml(value) +
          '</t></is></c>',
      );
      return '<row r="' + rowNumber + '">' + cells.join('') + '</row>';
    })
    .join('');
  const xml = (value: string) => strToU8('<?xml version="1.0" encoding="UTF-8"?>' + value);
  const relationships = (type: string, target: string) =>
    xml(
      '<Relationships xmlns="' +
        packageRelationships +
        '"><Relationship Id="rId1" Type="' +
        officeRelationships +
        '/' +
        type +
        '" Target="' +
        target +
        '"/></Relationships>',
    );
  const bytes = zipSync({
    '[Content_Types].xml': xml(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="' +
        workbookType +
        '.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="' +
        workbookType +
        '.worksheet+xml"/></Types>',
    ),
    '_rels/.rels': relationships('officeDocument', 'xl/workbook.xml'),
    'xl/workbook.xml': xml(
      '<workbook xmlns="' +
        spreadsheet +
        '" xmlns:r="' +
        officeRelationships +
        '">' +
        '<sheets><sheet name="分镜" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': relationships('worksheet', 'worksheets/sheet1.xml'),
    'xl/worksheets/sheet1.xml': xml(
      '<worksheet xmlns="' +
        spreadsheet +
        '"><cols><col min="2" max="2" width="55" customWidth="1"/>' +
        '<col min="7" max="7" width="24" customWidth="1"/></cols><sheetData>' +
        sheet +
        '</sheetData></worksheet>',
    ),
  });
  return new Blob([Uint8Array.from(bytes).buffer], { type: workbookType + '.sheet' });
}

function parseXml(bytes: Uint8Array | undefined) {
  if (!bytes) throw new Error('工作簿缺少必要的工作表。');
  const source = strFromU8(bytes);
  if (/<!DOCTYPE/i.test(source)) throw new Error('工作簿包含不支持的 XML 声明。');
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('工作簿格式无效。');
  return doc;
}

function readText(node: Element) {
  return Array.from(node.getElementsByTagNameNS('*', 't'), (item) => item.textContent ?? '').join(
    '',
  );
}

function readCells(row: Element, strings: string[]) {
  const cells = new Map<string, string>();
  for (const cell of Array.from(row.getElementsByTagNameNS('*', 'c'))) {
    const col = cell.getAttribute('r')?.match(/^([A-Z]{1,3})[1-9]\d*$/)?.[1];
    if (!col || cell.getElementsByTagNameNS('*', 'f').length) continue;
    const type = cell.getAttribute('t');
    const value = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? '';
    let text = value;
    if (type === 'inlineStr') text = readText(cell);
    else if (type === 's') text = strings[Number(value)] ?? '';
    cells.set(col, text.trim());
  }
  return cells;
}

function workbookSheet(bytes: Uint8Array) {
  const metadata = new Set(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels']);
  function extract(paths: Set<string>) {
    const seen = new Set<string>();
    return unzipSync(bytes, {
      filter: ({ name, size, originalSize }) => {
        if (!paths.has(name)) return false;
        if (seen.has(name) || size > maxXmlSize || originalSize > maxXmlSize) {
          throw new Error('工作簿包含重复或过大的内容。');
        }
        seen.add(name);
        return true;
      },
    });
  }
  const zip = extract(metadata);
  const sheet = parseXml(zip['xl/workbook.xml']).getElementsByTagNameNS('*', 'sheet')[0];
  const relationId =
    sheet?.getAttributeNS(officeRelationships, 'id') ?? sheet?.getAttribute('r:id');
  const relationships = parseXml(zip['xl/_rels/workbook.xml.rels']).getElementsByTagNameNS(
    '*',
    'Relationship',
  );
  const entries = Array.from(relationships).filter(
    (item) => item.getAttribute('TargetMode') !== 'External',
  );
  const target = entries
    .find(
      (item) =>
        item.getAttribute('Id') === relationId && item.getAttribute('Type')?.endsWith('/worksheet'),
    )
    ?.getAttribute('Target');
  const sheetPath = target?.startsWith('/') ? target.slice(1) : 'xl/' + (target ?? '');
  if (!/^xl\/worksheets\/[\w.-]+\.xml$/.test(sheetPath)) throw new Error('未找到可导入的工作表。');
  const sharedTarget = entries
    .find((item) => item.getAttribute('Type')?.endsWith('/sharedStrings'))
    ?.getAttribute('Target');
  const sharedPath = sharedTarget?.startsWith('/')
    ? sharedTarget.slice(1)
    : 'xl/' + (sharedTarget ?? '');
  const files = extract(new Set([sheetPath, sharedPath]));
  const strings = sharedTarget
    ? Array.from(parseXml(files[sharedPath]).getElementsByTagNameNS('*', 'si'), readText)
    : [];
  return { sheet: parseXml(files[sheetPath]), strings };
}

export async function readShotWorkbook(file: File, defaultModel: VideoModel) {
  if (!/\.xlsx$/i.test(file.name) || file.size > maxFileSize) {
    throw new Error('请选择不超过 8 MB 的 .xlsx 文件。');
  }
  let workbook: ReturnType<typeof workbookSheet>;
  try {
    workbook = workbookSheet(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('无法读取工作簿，请检查文件或使用导出的模板。');
  }
  const rows = Array.from(workbook.sheet.getElementsByTagNameNS('*', 'row'));
  const header = readCells(rows.shift() ?? workbook.sheet.documentElement, workbook.strings);
  const columns = new Map(Array.from(header, ([key, value]) => [value, key]));
  function column(...names: string[]) {
    return names.map((name) => columns.get(name)).find(Boolean) ?? '';
  }
  const promptCol = column('描述词', '描述');
  if (!promptCol) throw new Error('首个工作表的表头需要包含「描述词」。');
  const durationCol = column('时长', '时长（秒）');
  const resolutionCol = column('分辨率');
  const ratioCol = column('比例', '宽高比', 'ratio');
  const modelCol = column('模型', '模型名称');
  const remarkCol = column('备注');
  const shots: ShotFields[] = [];
  for (const [index, row] of rows.entries()) {
    const cells = readCells(row, workbook.strings);
    const prompt = cells.get(promptCol);
    if (!prompt) continue;
    const rowLabel = '第 ' + (row.getAttribute('r') ?? index + 2) + ' 行';
    const durationText = (cells.get(durationCol) || '5').replace(/\s*(秒|s)$/i, '');
    const durationSeconds = Number(durationText);
    const ratio = SHOT_RATIOS.find((item) => item === (cells.get(ratioCol) || '16:9'));
    const resolution = SHOT_RESOLUTIONS.find(
      (item) => item === (cells.get(resolutionCol)?.toLowerCase() || '720p'),
    );
    const model = cells.get(modelCol)?.toLowerCase() || defaultModel;
    const remark = cells.get(remarkCol) ?? '';
    if (
      !Number.isInteger(durationSeconds) ||
      durationSeconds < MIN_SHOT_DURATION ||
      durationSeconds > MAX_SHOT_DURATION ||
      !ratio ||
      !resolution ||
      (model !== 'fast' && model !== 'pro')
    ) {
      throw new Error(rowLabel + '的时长、比例、分辨率或演示模型无效。');
    }
    if (prompt.length > 4000 || remark.length > 500) {
      throw new Error(rowLabel + '的描述词或备注超过长度限制。');
    }
    shots.push({ prompt, durationSeconds, ratio, resolution, videoModel: model, remark });
    if (shots.length > MAX_SHOTS) throw new Error('单次最多导入 ' + MAX_SHOTS + ' 个分镜。');
  }
  if (!shots.length) throw new Error('工作表中没有可导入的分镜。');
  return shots;
}
