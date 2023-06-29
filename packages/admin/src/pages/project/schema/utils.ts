import { SYSTEM_FIELDS } from '@/common'

/**
 * 获取字段对应的ts基础类型文本
 * @param opts.connectDeep 链接类型的字段，是否进一步递归查找为对应的基础数据类型
 * @param opts.schemas 递归查找connect类型对应的基础类型时，查找的schemas字典
 */
export function getParamTsType(
  field: SchemaField,
  opts?: { connectDeep?: boolean; schemas?: Schema[] }
) {
  const { connectDeep = false, schemas } = opts || {}
  let type = 'unknown'
  switch (field.type) {
    case 'String':
    case 'MultiLineString':
    case 'Email':
    case 'Tel':
    case 'Url':
    case 'RichText':
    case 'Markdown':
    case 'File':
    case 'Media':
    case 'Image':
      type = 'string'
      break
    case 'Number':
      type = 'number'
      break
    case 'Boolean':
      type = 'boolean'
      break
    case 'Date':
    case 'Time':
    case 'DateTime':
      if (['timestamp-ms', 'timestamp-s'].includes(field.dateFormatType)) {
        type = 'number'
      } else if (field.dateFormatType === 'date') {
        type = 'Date'
      } else if (field.dateFormatType === 'string') {
        type = 'string'
      }
      break
    case 'Connect':
      if (connectDeep) {
        const connectField = schemas
          ?.find((schemaItem) => schemaItem.collectionName === field.connectResource)
          ?.fields?.find((item) => item.name === field.connectField)
        if (connectField) {
          type = getParamTsType(field, opts)
        }
      } else {
        type = `${field.connectResource}["${field.connectField}"]`
      }
      break
    case 'Array':
      type = 'string[]'
      break
    case 'Enum':
      {
        const enumValues = (field?.enumElements || []).map(
          (item) => `${field.enumElementType === 'number' ? item.value : `"${item.value}"`}`
        )
        if (enumValues?.length) {
          type = enumValues.join(' | ')
        }
      }
      break
    case 'Object':
      type = 'any'
      break
    default:
      break
  }
  return type
}

/** 获取目标schema关联的schema列表 */
export function getConnectSchemas(
  name: string,
  schemas: Schema[],
  connectDic?: { [key: string]: boolean }
) {
  if (!connectDic) {
    // eslint-disable-next-line no-param-reassign
    connectDic = {}
  }
  const curSchema = schemas.find((item) => item.collectionName === name)
  if (curSchema) {
    connectDic[name] = true
    curSchema.fields.map((field) => {
      if (
        field.type === 'Connect' &&
        field?.connectResource &&
        !connectDic?.[field.connectResource]
      ) {
        getConnectSchemas(field.connectResource, schemas, connectDic)
      }
      return null
    })
  }
  return connectDic
}

/** 生成代码文件 */
export function getInterfaceCodeWithSchemas(
  schemas: Schema[],
  names: string[],
  connectDeep?: boolean
) {
  const nameFilter = (str: string) => str.replace(/[-]/g, '')
  const schemaUsedDic: { [key: string]: boolean } = {}
  names.map((name) => getConnectSchemas(name, schemas, schemaUsedDic))
  const usedSchemas = schemas.filter((item) => !!schemaUsedDic?.[item.collectionName])
  let codeStr = '// 本代码文件由cms自动生成'
  const sysInterface = 'CmsSysParam'
  codeStr += `\n\n/** 系统字段 */\nexport interface ${sysInterface} {\n${SYSTEM_FIELDS.map(
    (sysItem) =>
      `\t${sysItem.name}: ${nameFilter(
        getParamTsType(
          {
            type: sysItem.type,
            dateFormatType: sysItem.type === 'DateTime' ? 'timestamp-ms' : '',
          } as any,
          { connectDeep, schemas }
        )
      )}; // ${sysItem.displayName}\n`
  ).join('')}}`
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < usedSchemas.length; ++i) {
    const schemaItem = usedSchemas[i]
    codeStr += `\n\n/** ${schemaItem.displayName}${
      schemaItem.description ? `（${schemaItem.description}）` : ''
    } */\nexport interface ${nameFilter(schemaItem.collectionName)} extends ${sysInterface} {\n`
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let j = 0; j < schemaItem.fields.length; ++j) {
      const fieldItem = schemaItem.fields[j]
      codeStr += `\t${nameFilter(fieldItem.name)}${fieldItem?.isRequired ? '' : '?'}: ${nameFilter(
        getParamTsType(fieldItem, { connectDeep, schemas })
      )}${fieldItem?.isMultiple || fieldItem?.connectMany ? '[]' : ''};${
        fieldItem?.description ? ` // ${fieldItem.description}` : ''
      }\n`
    }
    codeStr += '}'
  }
  return codeStr
}
