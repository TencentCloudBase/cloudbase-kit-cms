import _ from 'lodash'
import { Link, useRequest, history } from 'umi'
import { useSetState } from 'react-use'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getProject, updateProject } from '@/services/project'
import {
  Divider,
  Button,
  Space,
  Form,
  Input,
  message,
  Switch,
  Alert,
  Skeleton,
  Checkbox,
  Modal,
  Typography,
} from 'antd'
import { useConcent } from 'concent'
import { ContentCtx, GlobalCtx } from 'typings/store'
import { copyToClipboard, getProjectName } from '@/utils'
import { CopyOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { IS_KIT_MODE } from '@/kitConstants'
import { updateSchemaAndCollection } from '@/services/schema'

const { Text } = Typography

const ApiAccessPath: React.FC<{ project: Project; onReload: Function }> = ({
  project,
  onReload,
}) => {
  const accessDomain = window.TcbCmsConfig.cloudAccessPath.replace('tcb-ext-cms-service', '')
  const projectName = getProjectName()
  const [state, setState] = useSetState({
    apiPath: '',
    modalVisible: false,
  })
  // 修改 api 路径，保留原路径
  const [keepApiPath, setKeepApiPath] = useState(false)

  // 从 project 中读取信息
  const initialValues = useMemo(
    () => ({
      path: project.apiAccessPath,
    }),
    [project]
  )

  // 设置 API 访问路径
  const { loading, run: setApiPath } = useRequest(
    async (projectName: string, path: string) => {
      await updateProject(projectName, {
        keepApiPath,
        apiAccessPath: path,
      })
      message.success('API 访问路径设置成功！')
      onReload()
    },
    {
      manual: true,
      refreshDeps: [projectName, keepApiPath],
      onError: (e) => message.error(`更新失败 ${e.message}`),
    }
  )

  return (
    <>
      <Typography.Title level={3}>访问路径</Typography.Title>
      <Form
        layout="vertical"
        labelAlign="left"
        initialValues={initialValues}
        onFinish={(v = {}) => {
          // API 路径已经存在，需要删除原路径，要警告
          if (project.apiAccessPath) {
            setState({
              apiPath: v?.path,
              modalVisible: true,
            })
          } else {
            setApiPath(projectName, v?.path)
          }
        }}
      >
        {!initialValues.path && (
          <Alert
            type="warning"
            message="请设定 API 访问路径，否则无法使用 API 访问"
            style={{ marginBottom: '10px' }}
          />
        )}
        <Form.Item
          label="使用 RESTful API 时的基础访问路径"
          name="path"
          rules={[
            { required: true, message: '请输入 API 访问的路径！' },
            {
              pattern: /^(?!\/).*$/,
              message: '路径无需以 / 开头',
            },
          ]}
        >
          <Input
            addonBefore={
              <Text ellipsis style={{ maxWidth: '400px' }}>
                {`https://${accessDomain}`}
              </Text>
            }
            placeholder="API 访问的路径，如 rest-api"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" loading={loading} htmlType="submit">
            保存
          </Button>
        </Form.Item>
      </Form>
      <Modal
        okButtonProps={{ loading }}
        visible={state.modalVisible}
        onCancel={() =>
          setState({
            modalVisible: false,
          })
        }
        onOk={async () => setApiPath(projectName, state.apiPath)}
      >
        <div>
          <Space>
            <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
            <Text strong className="text-lg">
              警告
            </Text>
          </Space>
        </div>
        修改路径将会删除原服务路径，会导致原服务路径无法访问，是否确认修改？
        <br />
        <br />
        <Checkbox
          onChange={(e) => {
            setKeepApiPath(e.target.checked)
          }}
          checked={keepApiPath}
        >
          保留原 API 路径
        </Checkbox>
      </Modal>
    </>
  )
}

// 修改权限标志数组
const modifyArray = (collections: string[] = [], collection: string, add: boolean) => {
  // 过滤空集合
  const ret = collections.filter((_) => _ && _ !== collection)
  add ? ret.push(collection) : _.remove(ret, (_) => _ === collection)
  return ret
}

const ApiPermission: React.FC<{ project: Project; onReload: Function }> = ({
  project,
  onReload,
}) => {
  const ctx = useConcent<{}, GlobalCtx>('global')
  const { setting } = ctx.state
  const accessDomain = window.TcbCmsConfig.cloudAccessPath.replace(/(tcb|wx)-ext-cms-service/, '')

  const projectName = getProjectName()
  // 使用 content module 的数据，获取 layout 时，必然被加载、刷新
  const contentCtr = useConcent<{}, ContentCtx>('content')
  const schemas = contentCtr.state.schemas

  const [readableCollections, setReadableCollections] = useState<string[]>([])
  const [modifiableCollections, setModifiableCollections] = useState<string[]>([])
  const [deletableCollections, setDeletableCollections] = useState<string[]>([])

  // 保存修改
  const { run: changePermission, loading } = useRequest(
    async () => {
      // await updateProject(projectName, {
      //   readableCollections,
      //   modifiableCollections,
      //   deletableCollections,
      // })
      await Promise.all(
        schemas
          ?.filter(
            (item) => item.enableApiAccess !== readableCollections?.includes(item.collectionName)
          )
          .map((item) =>
            updateSchemaAndCollection(projectName, item.collectionName, {
              enableApiAccess: readableCollections?.includes(item.collectionName),
            })
          )
      )
      await contentCtr.mr.getContentSchemas(projectName)
      onReload()
    },
    {
      manual: true,
      onSuccess: () => message.success('保存成功，预计一分钟后生效'),
      onError: (e) => message.error(`保存失败: ${e.message}`),
    }
  )

  useEffect(() => {
    if (project?.projectName) {
      // setReadableCollections(project.readableCollections || [])
      setReadableCollections(
        schemas?.filter((item) => item?.enableApiAccess)?.map((item) => item.collectionName) || []
      )
      setModifiableCollections(project.modifiableCollections || [])
      setDeletableCollections(project.deletableCollections || [])
    }
  }, [project])

  const initialValues = useMemo(
    () => ({
      path: setting.apiAccessPath || project.apiAccessPath,
    }),
    [project]
  )

  return (
    <>
      <Typography.Title level={3}>访问权限</Typography.Title>
      {schemas?.map((schema, index) => (
        <div key={index} className="mb-5">
          <Space>
            <span>{schema.displayName}</span>
            <Checkbox
              checked={readableCollections?.includes(schema.collectionName)}
              onChange={(e) => {
                setReadableCollections(
                  modifyArray(readableCollections, schema.collectionName, e.target.checked)
                )
              }}
            >
              允许访问
            </Checkbox>
            {false && (
              <Checkbox
                checked={modifiableCollections?.includes(schema.collectionOldName)}
                onChange={(e) =>
                  setModifiableCollections(
                    modifyArray(modifiableCollections, schema.collectionOldName, e.target.checked)
                  )
                }
              >
                允许修改
              </Checkbox>
            )}
            {false && (
              <Checkbox
                checked={deletableCollections?.includes(schema.collectionOldName)}
                onChange={(e) =>
                  setDeletableCollections(
                    modifyArray(deletableCollections, schema.collectionOldName, e.target.checked)
                  )
                }
              >
                允许删除
              </Checkbox>
            )}
            {
              /* initialValues.path */ schema?.enableApiAccess && (
                <Button
                  type="link"
                  onClick={() => {
                    const path = setting.apiAccessPath || initialValues.path

                    // eslint-disable-next-line no-constant-condition
                    if (!path && false) {
                      message.error('未设置 API 访问路径')
                    } else {
                      // copyToClipboard(`https://${accessDomain}${path}/v1.0/${schema.collectionOldName}`)
                      copyToClipboard(
                        `https://${window.TcbCmsConfig.envId}.${window.TcbCmsConfig.region}.kits.tcloudbase.com/cms/${window.TcbCmsConfig.kitId}/v1/open-api/projects/${projectName}/collections/${schema.collectionName}/contents?limit=10&offset=0`
                      )
                      message.success('复制成功')
                    }
                  }}
                >
                  复制访问链接
                  <CopyOutlined className="ml-2" />
                </Button>
              )
            }
          </Space>
        </div>
      ))}

      {schemas?.length > 0 ? (
        <Button type="primary" loading={loading} onClick={changePermission}>
          保存
        </Button>
      ) : (
        <>内容模型为空</>
      )}
    </>
  )
}

export default (): React.ReactElement => {
  const ctx = useConcent<{}, GlobalCtx>('global')
  const { setting } = ctx.state

  const projectName = getProjectName()
  const [reloadFlag, setReloadFlag] = useState(0)
  // 重新加载 project 信息
  const reload = useCallback(() => setReloadFlag(reloadFlag + 1), [reloadFlag])

  // 重新获取数据
  const { data: project, loading } = useRequest(() => getProject(projectName), {
    refreshDeps: [reloadFlag],
  })

  if (IS_KIT_MODE && !!project) {
    project.enableApiAccess = true // 无头套件特殊处理下
  }

  /**
   * @deprecated
   * 开启/关闭 API 访问
   * TODO 废弃，仅支持关闭，不支持开启
   */
  const { loading: toggleLoading, run: toggleApiAccess } = useRequest(
    async () => {
      try {
        await updateProject(projectName, {
          enableApiAccess: false,
        })
        message.success(`已清理项目 API 访问`)
        reload()
      } catch (e) {
        message.error(`更新失败 ${(e as any)?.message}`)
      }
    },
    {
      manual: true,
      refreshDeps: [projectName],
    }
  )

  if (loading) {
    return <Skeleton active />
  }

  if (!project?.enableApiAccess && !setting.enableApiAccess) {
    return (
      <>
        <Alert
          type="info"
          message="未开启 API 访问，请前往系统设置开启 API 访问"
          style={{ marginBottom: '10px' }}
        />

        <Button
          type="primary"
          onClick={() => {
            history.push('/settings?tab=api')
          }}
        >
          开启 API 访问
        </Button>
      </>
    )
  }

  return (
    <>
      {project?.enableApiAccess && false && (
        <>
          <Typography.Title level={3}>API 访问</Typography.Title>
          <Divider />
          <Alert
            type="error"
            message={
              <>
                项目 API 访问设置已迁移到
                <Link to="/settings?tab=api">系统设置</Link>
                中统一管理，你可以请前往
                <Link to="/settings?tab=api">系统设置</Link>进行 API 访问配置，并关闭当前项目的 API
                访问开关
              </>
            }
            style={{ marginBottom: '10px' }}
          />
          <Space>
            <Switch
              loading={toggleLoading}
              checked={project?.enableApiAccess}
              onChange={toggleApiAccess}
            />
            <span>API 访问已开启</span>
          </Space>
          <Divider />
        </>
      )}
      <ApiPermission project={project!} onReload={reload} />
    </>
  )
}
