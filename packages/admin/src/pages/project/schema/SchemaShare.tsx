import { useConcent } from 'concent'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Typography, Upload, message, Checkbox, Space, Alert } from 'antd'
import { SchmeaCtx, ContentCtx } from 'typings/store'
import { getProjectName, random, readFile, saveContentToFile, saveFile } from '@/utils'
import { InboxOutlined } from '@ant-design/icons'
import {
  createSchema,
  getExportSchemasData,
  getSchemaFileds,
  importSchemasData,
} from '@/services/schema'
import { IS_KIT_MODE } from '@/kitConstants'
import { getInterfaceCodeWithSchemas } from './utils'

const { Title, Paragraph } = Typography
const { Dragger } = Upload
const CheckboxGroup = Checkbox.Group

/**
 * Schema 导出
 */
export const SchemaExportModal: React.FC<{
  visible: boolean
  onClose: () => void
  isExportCode?: boolean
}> = ({ visible, onClose, isExportCode }) => {
  const ctx = useConcent<{}, SchmeaCtx>('schema')

  const {
    state: { schemas },
  } = ctx

  const [indeterminate, setIndeterminate] = useState(false)
  const [checkAll, setCheckAll] = useState(false)
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([])
  const [gettingFields, setGettingFields] = useState(false)

  // 可选 Schemas
  const schemaOptions = useMemo(() => {
    if (!schemas?.length) return []
    return schemas?.map(({ displayName, collectionName }) => {
      return {
        label: displayName,
        value: collectionName,
      }
    })
  }, [schemas])

  // 全选
  const onCheckAllChange = useCallback(
    (e) => {
      const { checked } = e.target
      setCheckAll(checked)
      setIndeterminate(false)
      checked ? setSelectedSchemas(schemaOptions.map((_) => _.value)) : setSelectedSchemas([])
    },
    [schemas]
  )

  // 选择
  const onCheckChange = useCallback(
    (v) => {
      setSelectedSchemas(v)
      setCheckAll(v.length === schemaOptions.length)
      setIndeterminate(!!v.length && v.length < schemaOptions.length)
    },
    [schemas]
  )

  return (
    <Modal
      centered
      visible={visible}
      title="选择导出需要导出的模型"
      onOk={async () => {
        const projectName = getProjectName()
        let exportData: any
        if (!IS_KIT_MODE) {
          const exportSchemas = selectedSchemas.map((_: string) => {
            const schema = schemas.find((item) => item.collectionName === _) as Schema
            // 关联字段记录了 schema 的 id，导出 schema 需要携带 collectionName
            const { fields, displayName, description, collectionName } = schema
            return { fields, displayName, description, collectionName }
          })

          // 批量拉取fields
          setGettingFields(true)
          await Promise.all(
            exportSchemas.map((schemaItem) =>
              getSchemaFileds(projectName, schemaItem.collectionName).then((res) => {
                schemaItem.fields = res?.data || []
              })
            )
          )
          setGettingFields(false)

          exportData = exportSchemas
        } else {
          setGettingFields(true)
          let exportErr = null
          const exportRsp = await getExportSchemasData(
            projectName,
            isExportCode ? schemas.map((item) => item.collectionName) : selectedSchemas
          ).catch((e) => {
            exportErr = e
          })
          setGettingFields(false)
          if (!exportErr) {
            exportData = isExportCode
              ? getInterfaceCodeWithSchemas(exportRsp as Schema[], selectedSchemas)
              : exportRsp
          }
        }

        if (!exportData) {
          message.error('导出模型失败，请稍后重试！')
          return
        }

        if (isExportCode) {
          saveFile(new Blob([exportData], { type: 'text' }), `schema-export-${random(8)}.d.ts`)
        } else {
          saveContentToFile(JSON.stringify(exportData), `schema-export-${random(8)}.json`)
        }

        message.success('导出模型成功！')
        onClose()
      }}
      okButtonProps={{
        disabled: !selectedSchemas?.length,
        loading: gettingFields,
      }}
      onCancel={() => onClose()}
    >
      {schemas.length ? (
        <Space direction="vertical">
          <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll}>
            全选
          </Checkbox>
          <CheckboxGroup options={schemaOptions} value={selectedSchemas} onChange={onCheckChange} />
        </Space>
      ) : (
        <span>无可导出模型</span>
      )}
    </Modal>
  )
}

/**
 * Schema 导入
 */
export const SchemaImportModal: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const projectName = getProjectName()
  const ctx = useConcent<{}, SchmeaCtx>('schema')
  const contentCtx = useConcent<{}, ContentCtx>('content')
  const { schemas } = ctx.state

  const [loading, setLoading] = useState(false)
  const [importFileList, setFileList] = useState<any[]>([])
  const [importSchemas, setImportSchemas] = useState<
    {
      uid: string
      schema: Partial<Schema>
    }[]
  >([])

  /** 关闭逻辑 */
  const closeCb = () => {
    setFileList([])
    setImportSchemas([])
    onClose()
  }

  // 读取、校验导入文件
  const validFileContent = useCallback(
    async (file): Promise<boolean | undefined> => {
      const json = await readFile(file)

      if (!json) {
        message.error('导入数据不能为空！')
        return
      }

      try {
        const importData: Partial<Schema>[] = JSON.parse(json)

        // 检查数据格式是否符合基本要求
        const schemaValid = importData.every(
          (_: any) => _.fields?.length && _.displayName && _.collectionName
        )
        if (!schemaValid) {
          message.error('导入数据格式错误')
          return
        }

        // 检查集合名是否存在冲突
        const conflict = importData.some((_: any) =>
          schemas.find((item) => item.collectionName === _.collectionName)
        )

        if (conflict) {
          message.error('导入模型集合名和已有模型集合名存在冲突，无法导入，请修改冲突后重新导入！')
          return
        }

        const importSchemaWrap = importData.map((_) => ({
          uid: file.uid,
          schema: _,
        }))

        setImportSchemas(importSchemas.concat(importSchemaWrap))
      } catch (error) {
        message.error('导入数据格式错误，非法的 JSON 字符串')
        return false
      }

      return true
    },
    [schemas, importSchemas]
  )

  // 创建模型
  const onImportData = useCallback(async () => {
    setLoading(true)
    try {
      if (IS_KIT_MODE) {
        await importSchemasData(
          projectName,
          importSchemas.map((item) => item.schema)
        )
      } else {
        const tasks = importSchemas.map(async (_) => await createSchema(projectName, _.schema))
        await Promise.all(tasks)
      }
      message.success('导入模型成功！')
      ctx.mr.getSchemas(projectName)
      contentCtx.mr.getContentSchemas(projectName)
    } catch (error) {
      message.error('导入模型失败')
    } finally {
      closeCb()
    }
    setLoading(false)
  }, [importSchemas, projectName])

  return (
    <Modal
      centered
      title="导入模型"
      closable={true}
      visible={visible}
      onOk={onImportData}
      onCancel={() => closeCb()}
      okButtonProps={{
        loading,
      }}
    >
      <Title level={4}>注意事项</Title>
      <Alert message="仅支持导入 JSON 格式的数据" />
      <br />
      <Dragger
        accept=".json"
        listType="text"
        fileList={importFileList}
        onChange={({ file, fileList }) => {
          // 删除文件
          if (file.status === 'removed') {
            setFileList(fileList)
            // 删除文件时，也删除导入的模型
            setImportSchemas(importSchemas.filter((_) => _.uid !== file.uid))
            return
          }

          // 导入文件
          if (file instanceof File) {
            // 校验文件是否已经添加
            const fileExist = importFileList.find((_) => _.name === file.name)
            if (fileExist) {
              message.error(`已添加文件 ${file.name}，请勿重复添加`)
              return
            }
            // 校验文件内容
            validFileContent(file)
              .then((valid: boolean | undefined) => {
                if (valid) {
                  setFileList(fileList)
                }
              })
              .catch((e) => {
                message.error(e.message)
              })
          }
        }}
        beforeUpload={() => false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽上传文件，开始导入数据</p>
      </Dragger>
      <br />
      {importSchemas.length ? (
        <>
          <Paragraph>共计 {importSchemas.length} 个模型</Paragraph>
          {importSchemas.map((_, index) => (
            <Paragraph key={index}>
              模型名称：{_?.schema.displayName}，数据库名：{_?.schema.collectionName}，共计{' '}
              {_?.schema.fields?.length} 个字段
            </Paragraph>
          ))}
          <Alert
            message="请确认导入模型集合名与已有模型集合名不存在冲突，否则会导入失败！"
            type="warning"
          />
        </>
      ) : null}
    </Modal>
  )
}
