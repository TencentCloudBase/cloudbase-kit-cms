import { useRequest } from 'umi'
import React, { useState, useMemo } from 'react'
import { contentBatchExport, createExportMigrateJob, getContents } from '@/services/content'
import { Menu, Modal, Button, Dropdown, Alert, message } from 'antd'
import { getProjectName, redirectTo } from '@/utils'
import { exportData, formatSearchParams } from './tool'
import { IS_KIT_MODE } from '@/kitConstants'

type ExportFileType = 'csv' | 'json'

/**
 * 导出数据
 */
const DataExport: React.FC<{ schema: Schema; collectionName: string; searchParams: any }> = ({
  schema,
  searchParams = {},
  collectionName,
}) => {
  const projectName = getProjectName()
  const searchKeys = Object.keys(searchParams)
  const [visible, setVisible] = useState(false)
  const [fileType, setFileType] = useState<ExportFileType>('json')

  const fuzzyFilter = useMemo(() => formatSearchParams(searchParams, schema), [
    schema,
    searchParams,
  ])

  const { run: getExportData, loading } = useRequest(
    async () => {
      if (IS_KIT_MODE) {
        const data = await contentBatchExport(projectName, collectionName)
        await exportData(data, fileType)
      } else {
        // 存在搜索条件时，只导出搜索结果，最大 1000 条
        if (searchKeys?.length) {
          const { data } = await getContents(projectName, collectionName, {
            page: 1,
            fuzzyFilter,
            pageSize: 1000,
          })

          await exportData(data, fileType)
        } else {
          // 导出全量数据
          await createExportMigrateJob(projectName, {
            fileType,
            collectionName,
          })
          redirectTo('content/migrate')
        }
      }
    },
    {
      manual: true,
      onSuccess: () => {
        setVisible(false)
        searchKeys?.length ? message.success('导出数据成功') : message.success('创建导出任务成功')
      },
      onError: (e) => {
        searchKeys?.length
          ? message.error(`导出数据失败：${e.message}`)
          : message.error(`创建导出任务失败：${e.message}`)
      },
    }
  )

  return (
    <>
      <Dropdown
        overlay={
          <Menu
            onClick={({ key }) => {
              // 查看导出记录
              if (key === 'record') {
                redirectTo('content/migrate')
                return
              }
              setVisible(true)
              setFileType(key as ExportFileType)
            }}
          >
            {!IS_KIT_MODE && <Menu.Item key="csv">导出为 CSV 文件</Menu.Item>}
            <Menu.Item key="json">导出为 JSON 文件</Menu.Item>
            {!IS_KIT_MODE && <Menu.Item key="record">查看导出记录</Menu.Item>}
          </Menu>
        }
        key="search"
      >
        <Button type="primary">导出数据</Button>
      </Dropdown>
      <Modal
        centered
        destroyOnClose
        width={600}
        title="导出数据"
        closable={true}
        visible={visible}
        okButtonProps={{ loading }}
        onOk={() => getExportData()}
        okText={loading ? '导出数据中' : '确定'}
        onCancel={() => setVisible(false)}
      >
        {searchKeys?.length ? <span>将导出满足搜索条件的数据</span> : <span>将导出全量数据</span>}
        <Alert type="warning" message="最多支持导出 1000 条数据" className="mt-3" />
        {IS_KIT_MODE && searchKeys?.length ? (
          <Alert type="warning" message="检索情况下最多支持导出 1000 条数据" className="mt-3" />
        ) : null}
      </Modal>
    </>
  )
}

export default DataExport
