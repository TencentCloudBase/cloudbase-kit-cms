import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { PageContainer, RouteContext, RouteContextType } from '@ant-design/pro-layout'
import { Button, Modal, Tabs, message, Drawer } from 'antd'
import ProTable, { ActionType, ProColumns } from '@ant-design/pro-table'
import { getWebhooks, deleteWebhook } from '@/services/webhook'
import { getProjectName } from '@/utils'
import { WebhookForm } from './WebhookForm'
import WebhookExecLog from './WebhookExecLog'
import { WebhookColumns } from './columns'
import { getSchemas } from '@/services/schema'

const { TabPane } = Tabs

const columns: ProColumns<Webhook>[] = WebhookColumns.map((item) => ({
  ...item,
  align: 'center',
}))

const Webhook: React.FC<RouteContextType> = (props) => {
  const projectName = getProjectName()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook>()
  const [webhookAction, setWebhookAction] = useState<'create' | 'edit'>('create')

  const tableRef = useRef<ActionType>()
  const actionText = webhookAction === 'create' ? '创建' : '更新'

  // 获取 webhooks
  const tableRequest = async (
    params: { pageSize: number; current: number; [key: string]: any },
    sort: {
      [key: string]: 'ascend' | 'descend' | null
    },
    filter: {
      [key: string]: React.ReactText[]
    }
  ) => {
    const { current, pageSize } = params

    try {
      const schemas = await getSchemas(projectName)

      const { data = [], total } = await getWebhooks(projectName, {
        sort,
        filter,
        pageSize,
        page: current,
      })

      /** 根据后端数据中的collections计算对应的displayName列表 */
      const tabData = data?.map((item: Webhook) => {
        if (!(item?.collections?.length > 0)) {
          return { ...item }
        }
        const schemaBriefs = item?.collections?.map((name) => {
          const schema = schemas?.data?.find((schemaItem) => schemaItem.collectionName === name)
          return { collection: name, displayName: schema?.displayName }
        })
        return { ...item, schemaBriefs }
      })

      return {
        data: tabData,
        total,
        success: true,
      }
    } catch (error) {
      console.log(error)
      return {
        data: [],
        total: 0,
        success: true,
      }
    }
  }

  return (
    <PageContainer
      className="page-container"
      content="Webhook 可以用于在内容管理员修改内容数据后，自动回调外部系统，比如自动构建静态网站、发送通知等"
    >
      <Tabs>
        <TabPane tab="Webhooks" key="webhooks">
          <ProTable
            rowKey="_id"
            search={false}
            defaultData={[]}
            actionRef={tableRef}
            dateFormatter="string"
            scroll={{ x: 'max-content' }}
            request={tableRequest}
            pagination={{
              showSizeChanger: true,
            }}
            columns={[
              ...columns,
              {
                title: '操作',
                width: 200,
                align: 'center',
                fixed: props?.isMobile?undefined:'right',
                valueType: 'option',
                render: (_: any, row: any): React.ReactNode => [
                  <Button
                    size="small"
                    type="primary"
                    key="edit"
                    onClick={() => {
                      setWebhookAction('edit')
                      setSelectedWebhook(row)

                      setDrawerVisible(true)
                    }}
                  >
                    编辑
                  </Button>,
                  <Button
                    danger
                    size="small"
                    type="primary"
                    key="delete"
                    onClick={() => {
                      const modal = Modal.confirm({
                        centered: true,
                        title: '确认删除此 Webhook？',
                        onCancel: () => {
                          modal.destroy()
                        },
                        onOk: async () => {
                          await deleteWebhook(projectName, {
                            filter: {
                              _id: row._id,
                            },
                          })
                          message.success('删除 Webhook 成功')
                          tableRef?.current?.reloadAndRest?.()
                        },
                      })
                    }}
                  >
                    删除
                  </Button>,
                ],
              },
            ]}
            toolBarRender={() => [
              <Button
                type="primary"
                key="button"
                icon={<PlusOutlined />}
                onClick={() => {
                  setWebhookAction('create')
                  setSelectedWebhook(undefined)
                  setDrawerVisible(true)
                }}
              >
                新建
              </Button>,
            ]}
          />
        </TabPane>
        <TabPane tab="执行日志" key="log">
          <WebhookExecLog />
        </TabPane>
      </Tabs>

      <Drawer
        width={props?.isMobile?'100%':700}
        destroyOnClose
        placement="right"
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        title={`${actionText} Webhook`}
      >
        <WebhookForm
          action={webhookAction}
          selectedWebhook={selectedWebhook}
          onClose={() => setDrawerVisible(false)}
          onSuccess={() => {
            setDrawerVisible(false)
            tableRef?.current?.reloadAndRest?.()
          }}
        />
      </Drawer>
    </PageContainer>
  )
}

export default function () {
  return (
    <RouteContext.Consumer>
      {(value) => {
        return <Webhook {...value} />
      }}
    </RouteContext.Consumer>
  )
}
