import jsonExport from 'jsonexport'
import { getSchemaAllFields, getFullDate, saveContentToFile, saveFile } from '@/utils'

/**
 * 格式化搜索参数，去除非 schema 中定义的字段
 */
export const formatSearchParams = (searchParams: Record<string, any>, currentSchema: Schema) =>
  searchParams
    ? Object.keys(searchParams)
        .filter((key) =>
          getSchemaAllFields(currentSchema)?.some((field: SchemaField) => field.name === key)
        )
        .reduce(
          (prev, key) => ({
            ...prev,
            [key]: searchParams[key],
          }),
          {}
        )
    : {}

/**
 * 格式化 filter
 * 默认情况下，Protable 返回的所有 filter 值都是字符串
 * 数字类型的枚举值会过滤失败，需要格式化数字再检索
 */
export const formatFilter = (filter: Record<string, React.ReactText[]>, currentSchema: Schema) => {
  if (!filter) return {}

  return Object.keys(filter)
    .filter((key) => filter[key]?.length)
    .filter((key) => currentSchema.fields?.some((field: SchemaField) => field.name === key))
    .reduce(
      (prev, key) => ({
        ...prev,
        [key]: filter[key].map((_) => {
          const field = currentSchema.fields.find((field) => field.name === key)
          // 格式化 number 类型的枚举值
          if (field?.enumElementType === 'number') {
            return Number(_)
          }
          return _
        }),
      }),
      {}
    )
}

/**
 * 导出类型，支持 CSV 和 JSON 类型
 */
type ExportFileType = 'csv' | 'json'

/**
 * 将数据导出为 CSV 或 JSON
 */
export const exportData = async (data: any, fileType: ExportFileType) => {
  const fileName = `cms-data-export-${getFullDate()}-${Math.floor(Math.random() * 100000)}`
  if (fileType === 'json') {
    await saveContentToFile(JSON.stringify(data), `${fileName}.json`)
  } else {
    const transfromData = (Array.isArray(data) ? data : [data]).map((item) =>
      csvDataWriteEncode(item)
    )
    let csv: any = await jsonExport(transfromData /* data */)
    csv = `\ufeff${csv}`
    await saveFile(new Blob([csv], { type: 'text/csv,charset=utf-8' }), `${fileName}.csv`)
  }
}

/** 将数据储存入csv时编码函数（只转化一层），主要是将复杂结构编码后储存 */
const csvDataWriteEncode = (data: any) => {
  if (!data || Array.isArray(data)) {
    return csvFieldWriteEncode(data)
  }
  if (typeof data === 'object') {
    const transData = Object.keys(data).reduce((dic, cur) => {
      dic[cur] = csvFieldWriteEncode(data[cur])
      return dic
    }, {})
    return transData
  }
  return csvFieldWriteEncode(data)
}

/** 将数据储存入csv时单字段转化函数（jsonExport默认转码不方便parse） */
const csvFieldWriteEncode = (data: any) => {
  if (!data) {
    return data
  }
  if (Array.isArray(data)) {
    return JSON.stringify(data)
  }
  if (typeof data === 'object') {
    return JSON.stringify(data)
  }
  return data
}

interface CsvReadEncodeSign {
  oriStr: string // 原始字符
  transStr: string // 转化后的新字符
  backStr?: string // 回填时使用的符号，如果不填充，将使用oriStr回填
}

/**
 * 将csv字符串中关键符号转化成其他字符，方便外层切割
 * @param rowStr
 * @returns
 * csv单个格子规则如下：
 * 1、如果字段中有英文逗号（,）或换行（\n），该字段使用双引号（"）括起来；
 * 2、如果该字段中有双引号，该双引号前要再加一个双引号，然后把该字段使用双引号括起来。
 */
function csvReadEncode(rowStr: string): { str: string; signs: CsvReadEncodeSign[] } {
  const quotation = '~$#_cms-quotation_#$~'
  const doubleQuotation = '~$#_cms-double-quotation_#$~'
  const comma = '~$#_cms-comma_#$~'
  const enter = '~$#_cms-enter_#$~'
  let str = (rowStr || '').split('""').join(doubleQuotation) // 先把转义双引号（"）去掉，方便进一步分割
  while (true) {
    if (str.indexOf('"') < 0) {
      break
    }

    // 计算第一个（"）位置并校验位置是否合理，不合理就直接转化进行下一轮
    const preIndex = str.indexOf('"')
    if (preIndex > 0 && str.charAt(preIndex - 1) !== ',' && str.charAt(preIndex - 1) !== '\n') {
      str = str.substring(0, preIndex) + quotation + str.substring(preIndex + 1)
      continue
    }

    // 计算第二个（"）位置
    const nextIndex = (str.substring(0, preIndex) + 'a' + str.substring(preIndex + 1)).indexOf('"') // 这里中间随便加个字符“a”，保证下个（"）的位置计算无误

    // 第二个（"）校验
    if (nextIndex < 0) {
      str = str.substring(0, preIndex) + quotation + str.substring(preIndex + 1) // 第二个（"）不存在，第一个也就当失效处理
      continue
    } else if (
      nextIndex + 1 !== str.length &&
      str.charAt(nextIndex + 1) !== ',' &&
      str.charAt(nextIndex + 1) !== '\n'
    ) {
      str = str.substring(0, nextIndex) + quotation + str.substring(nextIndex + 1) // 第二个（"）不是最后一个字符且后面没有跟（,），则第二个（"）认为是普通字符
      continue
    }

    // 将中间段的（,）和（\n）转为特殊字符串，方便后续解析
    let middleStr = str.substring(preIndex + 1, nextIndex)
    middleStr = middleStr.split(',').join(comma)
    middleStr = middleStr.split('\n').join(enter)

    str = str.substring(0, preIndex) + middleStr + str.substring(nextIndex + 1)
  }
  return {
    str,
    signs: [
      { transStr: quotation, oriStr: '"' },
      { transStr: doubleQuotation, oriStr: '""', backStr: '"' },
      { transStr: comma, oriStr: ',' },
      { transStr: enter, oriStr: '\n' },
    ],
  }
  // const commaSplit=str.split(",");
  // const fields=commaSplit.map(splitStr=>splitStr.split(quotation).join('"').split(doubleQuotation).join('"').split(comma).join(",")); //这里双引号
  // return fields;
}

/** 还原经过csvReadEncode函数编码的字符串 */
const csvReadDecode = (str: string, signs: CsvReadEncodeSign[]) => {
  let newStr = str
  ;(signs || []).map((sign) => {
    newStr = newStr.split(sign.transStr).join(sign?.backStr || sign.oriStr)
    return null
  })
  return newStr
}

/** 将csv字符串转为object */
export const scvStrToObject = (str: string) => {
  const transData = csvReadEncode(str || '')
  const rows = transData.str.split('\n')
  const names = (rows.shift() || '').split(',').map((item) => csvReadDecode(item, transData.signs))
  const datas: any[] = []
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < rows.length; ++i) {
    const rowStrs = (rows?.[i] || '').split(',').map((item) => csvReadDecode(item, transData.signs))

    // 空行过滤
    if (rowStrs.filter((item) => item?.length > 0).length === 0) {
      continue
    }

    const obj = {}
    for (let j = 0; j < names.length; ++j) {
      const curName = names[j]
      const curValue = rowStrs?.[j] || ''
      if (!curName || !curValue) {
        continue // 名称为空或者空字符，都不填充（其中value为空字符的情形，前后端都不好判定对应的数据预期应该为空字符还是undefined，这里约定全部按undefined对待）
      }
      obj[curName] = curValue
    }
    if (Object.keys(obj).length > 0) {
      datas.push(obj)
    }
  }
  return datas
}
