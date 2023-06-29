import React, { useState } from 'react'
import { Typography, message, Tag, Select, Spin } from 'antd'
import { useRequest } from 'umi'
import { useConcent } from 'concent'
import { getContentSchema, getContents, Options, getAllContents } from '@/services/content'
import { calculateFieldWidth, getProjectName, getValueOrSlug } from '@/utils'
import { ContentCtx } from 'typings/store'
import { IS_KIT_MODE } from '@/kitConstants'

const { Option } = Select
const { Text, Paragraph } = Typography

interface Doc {
  _id: string
  [key: string]: any
}

type IConnectSingleValue = string | Doc
type IConnectMultiValue = string[] & Doc[]
type IConnectValue = IConnectSingleValue | IConnectMultiValue
type ISelectValue = string | string[]

/**
 * 关联渲染
 * TODO: 优化关联渲染
 */
export const IConnectRender: React.FC<{
  value?: IConnectValue
  field: SchemaField
}> = (props) => {
  const { value, field } = props
  const { connectMany } = field
  const width = calculateFieldWidth(field)
  const ctx = useConcent<{}, ContentCtx>('content')
  const { schemas } = ctx.state

  if (!value || typeof value === 'string' || typeof value?.[0] === 'string') return <span>-</span>

  if (!connectMany) {
    return (
      <Text ellipsis style={{ width }}>
        {getConnectFieldDisplayText(value, schemas, field)}
      </Text>
    )
  }

  return (
    <Paragraph style={{ width }}>
      {value
        ?.filter((_: any) => _)
        ?.map((record: any, index: number) => (
          <Tag key={index}>{getConnectFieldDisplayText(record, schemas, field)}</Tag>
        ))}
    </Paragraph>
  )
}

/**
 * 关联类型，编辑
 */
export const IConnectEditor: React.FC<{
  value?: IConnectValue
  field: SchemaField
  onChange?: (v: string | string[]) => void
}> = (props) => {
  const { value = [], onChange, field } = props
  const projectName = getProjectName()
  const ctx = useConcent<{}, ContentCtx>('content')
  const { connectField, connectResource, connectMany } = field
  const { schemas } = ctx.state

  // 加载关联的文档列表
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKey, setSearchKey] = useState<any>()

  useRequest(
    async () => {
      setLoading(true)
      let connectSchema = schemas.find((_: Schema) => _.collectionName === connectResource)

      console.log('关联', connectSchema)
      // 后台获取 Schema
      if (!connectSchema) {
        const { data } = await getContentSchema(projectName, connectResource)
        connectSchema = data
      }

      const fetchOptions: Options = {
        page: 1,
        pageSize: 1000,
      }

      if (searchKey) {
        fetchOptions.fuzzyFilter = {
          [connectField]: searchKey,
        }
      }

      // const { data } = await getContents(projectName, IS_KIT_MODE ? connectResource : connectSchema.collectionOldName, fetchOptions)
      const { data } = await getAllContents(
        projectName,
        IS_KIT_MODE ? connectResource : connectSchema.collectionOldName,
        fetchOptions
      )

      setDocs(data)
      setLoading(false)
    },
    {
      // 根据连接的 schemaId 缓存
      cacheKey: connectResource,
      onError: (e) => {
        message.error(e.message || '获取数据错误')
        setLoading(false)
      },
      refreshDeps: [searchKey],
      debounceInterval: 500,
    }
  )

  // 新版本_id字段修改为id，这里兼容下
  const valueFomat = (oriV: any) => {
    return typeof oriV === 'object' && !!oriV?.['id']
      ? { ...oriV, _id: oriV?.['_id'] || oriV?.['id'] }
      : oriV
  }
  const connectIds = transformConnectValues(
    connectMany
      ? ((value || []) as IConnectMultiValue)?.filter((v) => !!v)?.map((v) => valueFomat(v))
      : valueFomat(value),
    connectMany
  )
  // const connectIds = transformConnectValues(value, connectMany)

  return (
    <Select<ISelectValue>
      showSearch
      loading={loading}
      value={connectIds}
      onChange={onChange}
      onSearch={(v: string) => {
        const connectField = getConnectField(schemas, field)
        const isNumber = connectField?.type === 'Number'
        setSearchKey(isNumber ? Number(v) : v)
      }}
      filterOption={false}
      placeholder="关联字段"
      style={{ width: '240px' }}
      disabled={loading && !searchKey}
      mode={connectMany ? 'multiple' : undefined}
      notFoundContent={loading ? <Spin size="small" /> : null}
    >
      {loading ? (
        <Option value="">
          <Spin size="small" />
        </Option>
      ) : docs?.length ? (
        <>
          {/* <Option value="">空</Option> */}
          {docs?.map((doc) => (
            <Option value={doc._id} key={doc._id}>
              {getConnectFieldDisplayText(doc, schemas, field)}
            </Option>
          ))}
        </>
      ) : (
        <Option value="" disabled>
          空
        </Option>
      )}
    </Select>
  )
}

/**
 * 处理关联字段的展示信息，可能为多层嵌套
 */
const getConnectFieldDisplayText = (doc: any, schemas: Schema[], field: SchemaField) => {
  // 当前关联字段的信息
  const { connectField, connectResource } = field

  // 当前关联字段 => 关联 schema 的信息
  const connectedSchema = schemas.find((_: Schema) => _.collectionName === connectResource)

  // 关联字段的信息
  const connectedFieldInfo = connectedSchema?.fields?.find((_) => _.name === connectField)

  // 关联的字段，又是一个关联类型，则展示关联字段关联的字段
  // A -> B -> C
  let text = null
  if (connectedFieldInfo?.connectResource) {
    text = getValueOrSlug(doc[connectField]?.[connectedFieldInfo.connectField])
  } else {
    text = getValueOrSlug(doc[connectField])
  }

  // 如果引用的field是个json之类的object，直接就会渲染异常，这里我们把特殊的显示格式化为字符串
  if (IS_KIT_MODE && typeof text === 'object') {
    return JSON.stringify(text)
  }
  return text
}

/**
 * 处理关联字段的展示信息，可能为多层嵌套
 */
const getConnectField = (schemas: Schema[], field: SchemaField) => {
  // 当前关联字段的信息
  const { connectField, connectResource } = field

  // 当前关联字段 => 关联 schema 的信息
  const connectedSchema = schemas.find((_) => _.collectionName === connectResource)

  // 关联字段的信息
  let connectedFieldInfo = connectedSchema?.fields.find((_) => _.name === connectField)

  // 关联的字段，又是一个关联类型，则展示关联字段关联的字段
  // A -> B -> C
  if (connectedFieldInfo?.connectResource) {
    const nestConnectSchema = schemas.find(
      (_) => _.collectionName === connectedFieldInfo?.connectResource
    )
    connectedFieldInfo = nestConnectSchema?.fields.find(
      (_) => _.name === connectedFieldInfo?.connectField
    )
  }

  return connectedFieldInfo
}

// 将关联的数据转换成关联数据对应的 _id 数据
const transformConnectValues = (value: IConnectValue, connectMany: boolean): string | string[] => {
  if (connectMany) {
    return (value as IConnectMultiValue)
      .filter((_) => _)
      .map((_: any) => {
        return typeof _ === 'string' ? _ : _?._id
      })
  }

  return typeof value === 'string' ? value : (value as { _id: string; [key: string]: any })?._id
}
