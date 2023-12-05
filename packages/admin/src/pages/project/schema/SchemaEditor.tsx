import React, { useCallback, useEffect } from 'react'
import { useRequest } from 'umi'
import { useConcent } from 'concent'
import { SchmeaCtx } from 'typings/store'
import { createSchema, updateSchemaAndCollection, updateSchemaFiled } from '@/services/schema'
import { Modal, Form, message, Input, Space, Button, Typography, Tooltip, Switch } from 'antd'
import { QuestionCircleTwoTone } from '@ant-design/icons'
import { getSystemConfigurableFields, getProjectName } from '@/utils'
import { IS_KIT_MODE } from '@/kitConstants'
import { DATABASE_RULES } from '@/constants'

const { TextArea } = Input

const ActionTip = {
  create: '创建',
  edit: '更新',
  copy: '复制',
}

// 模型系统数据，拷贝模型时无需复制
const SchemaSystemKeys = ['_id', '_createTime', '_updateTime']

const getSchemaInitialValues = (action: string, currentSchema: Schema) => {
  switch (action) {
    case 'create':
      return {
        docCreateTimeField: '_createTime',
        docUpdateTimeField: '_updateTime',
      }
    case 'edit':
      return currentSchema
    case 'copy':
      return {
        ...currentSchema,
        collectionName: `${currentSchema.collectionOldName}-copy`,
      }
    default:
      return currentSchema
  }
}

/**
 * 新建/更新模型
 */
const SchemaEditor: React.FC = () => {
  const projectName = getProjectName()
  const ctx = useConcent<{}, SchmeaCtx>('schema')
  const contentCtx = useConcent('content')
  const { schemaEditAction, currentSchema } = ctx.state
  const DATABASE_TYPE_KEY = 'kit_cms_schema_databaseType'

  // 关闭弹窗
  const onClose = () =>
    ctx.setState({
      schemaEditVisible: false,
    })

  // action 提示文案
  const actionTip = ActionTip[schemaEditAction]

  // 创建/更新模型
  const { run, loading } = useRequest(
    async (data: Schema) => {
      const {
        collectionName: id,
        displayName,
        description,
        docCreateTimeField,
        docUpdateTimeField,
        databaseType,
      } = data

      // 新建模型
      if (schemaEditAction === 'create') {
        await createSchema(projectName, {
          collectionName: id,
          displayName,
          description,
          docCreateTimeField,
          docUpdateTimeField,
          databaseType,
          // fields: getSystemConfigurableFields({
          //   docCreateTimeField,
          //   docUpdateTimeField,
          // }),
        })
      }

      // 编辑模型
      if (currentSchema && schemaEditAction === 'edit') {
        const diffData = Object.keys(data)
          .filter((key) => currentSchema[key] !== data[key])
          .reduce(
            (ret, key) => ({
              ...ret,
              [key]: data[key],
            }),
            {}
          )

        // await updateSchemaFiled(projectName, currentSchema?.id, diffData)
        IS_KIT_MODE &&
          (await updateSchemaAndCollection(projectName, currentSchema?.collectionName, diffData))
      }

      // 复制模型
      if (currentSchema && schemaEditAction === 'copy') {
        const newSchema = Object.keys(data)
          .filter((key) => !SchemaSystemKeys.includes(key))
          .reduce(
            (ret, key) => ({
              ...ret,
              [key]: data[key],
            }),
            {}
          )

        await createSchema(projectName, { ...newSchema, fields: currentSchema.fields })
      }

      onClose()
      ctx.mr.getSchemas(projectName)
      contentCtx.dispatch('getContentSchemas', projectName)
    },
    {
      manual: true,
      onError: () => message.error(`${actionTip}模型失败`),
      onSuccess: () => message.success(`${actionTip}模型成功`),
    }
  )

  // 获取初始化的值
  const getInitialValues = useCallback(getSchemaInitialValues, [schemaEditAction, currentSchema])

  const [form] = Form.useForm()
  const getDatabaseTypeChecked = useCallback(() => {
    return schemaEditAction === 'create'
      ? ['cloud', 'system'].includes(localStorage.getItem(DATABASE_TYPE_KEY) as string)
        ? localStorage.getItem(DATABASE_TYPE_KEY)
        : 'cloud'
      : currentSchema?.databaseType
  }, [schemaEditAction, currentSchema])

  return (
    <Modal
      centered
      destroyOnClose
      footer={null}
      width={600}
      visible={true}
      onOk={() => onClose()}
      onCancel={() => onClose()}
      title={`${actionTip}模型`}
    >
      <Form
        form={form}
        layout="vertical"
        labelAlign="left"
        initialValues={getInitialValues(schemaEditAction, currentSchema)}
        onFinish={(v: any) => {
          if (schemaEditAction === 'copy' && v.collectionName === currentSchema.collectionName) {
            message.error('复制模型数据库名不能与已有模型数据库名相同')
            onClose()
            return
          }
          localStorage.setItem(DATABASE_TYPE_KEY, v?.databaseType)
          run(v)
        }}
      >
        <Form.Item
          name="collectionName"
          label={
            <>
              模型名称
              {/* {schemaEditAction === 'edit' && (
                  <Typography.Text type="danger">
                    【更改数据库名会自动重命名原数据库（危险操作！仅管理员可操作！）】
                  </Typography.Text>
                )} */}
            </>
          }
          rules={[
            { required: true, message: '请输入模型名称！' },
            {
              pattern: DATABASE_RULES.table.rule,
              message: DATABASE_RULES.table.message,
            },
          ]}
        >
          <Input
            disabled={schemaEditAction === 'edit'}
            showCount
            maxLength={15}
            placeholder="模型名称，如 article"
          />
        </Form.Item>

        <Form.Item
          label="展示名称"
          name="displayName"
          rules={[{ required: true, message: '请输入展示名称！' }]}
        >
          <Input showCount maxLength={15} placeholder="展示名称，如文章" />
        </Form.Item>

        <Form.Item label="描述信息" name="description">
          <TextArea
            showCount
            maxLength={200}
            placeholder="描述信息，会展示在对应内容的管理页面顶部，可用于内容提示，支持 HTML 片段"
          />
        </Form.Item>

        <Form.Item
          label="模型数据是否存储至云开发环境数据库"
          name="databaseType"
          initialValue={getDatabaseTypeChecked()}
        >
          <>
            <Switch
              disabled={schemaEditAction === 'edit'}
              defaultChecked={getDatabaseTypeChecked() === 'cloud'}
              onChange={(checked) =>
                form.setFieldsValue({ databaseType: checked ? 'cloud' : 'system' })
              }
            />
            <div style={{ opacity: 0.5 }}>
              <div>默认关闭，数据存储在CMS中心化数据库，可通过OpenAPI获取数据。</div>
              <div>如果开启，模型数据则存储在云开发环境的数据库，且无法通过OpenAPI获取数据。</div>
            </div>
          </>
        </Form.Item>

        {!IS_KIT_MODE && schemaEditAction === 'create' && (
          <>
            <Form.Item
              label={
                <Space align="center">
                  创建时间（系统）字段名
                  <Tooltip title="自定义创建时间字段的名称，创建内容时，系统会自动添加此字段">
                    <QuestionCircleTwoTone />
                  </Tooltip>
                </Space>
              }
              name="docCreateTimeField"
              rules={[
                { required: true, message: '请输入创建时间字段名！' },
                {
                  pattern: DATABASE_RULES.param.rule,
                  message: DATABASE_RULES.param.message,
                },
              ]}
            >
              <Input placeholder="记录创建时间字段名" />
            </Form.Item>
            <Form.Item
              label={
                <Space>
                  更新时间（系统）字段名
                  <Tooltip title="自定义更新时间字段的名称，更新内容时，系统会自动更新此字段">
                    <QuestionCircleTwoTone />
                  </Tooltip>
                </Space>
              }
              name="docUpdateTimeField"
              rules={[
                { required: true, message: '请输入创建时间字段名！' },
                {
                  pattern: DATABASE_RULES.param.rule,
                  message: DATABASE_RULES.param.message,
                },
              ]}
            >
              <Input placeholder="记录更新时间字段名" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Space size="large" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => onClose()}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {actionTip}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SchemaEditor
