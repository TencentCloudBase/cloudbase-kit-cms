import React from 'react'
import ProTable, { ProColumns } from '@ant-design/pro-table'
import { getWebhookLog } from '@/services/webhook'
import { getProjectName } from '@/utils'
import { WebhookLogColumns } from './columns'
import { getSchemas } from '@/services/schema'

const columns: ProColumns<any>[] = WebhookLogColumns.map((item) => ({
  ...item,
  align: 'center',
}))

export default () => {
  const projectName = getProjectName()

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

      const { data = [], total } = await getWebhookLog(projectName, {
        sort: {
          timestamp: 'descend',
        },
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
    <ProTable
      rowKey="_id"
      search={false}
      defaultData={[]}
      columns={columns}
      dateFormatter="string"
      scroll={{ x: 'max-content' }}
      request={tableRequest}
      pagination={{
        showSizeChanger: true,
      }}
    />
  )
}
