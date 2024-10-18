import { useConcent } from 'concent'
import { stringify } from 'querystring'
import { useParams, history } from 'umi'
import { useSetState } from 'react-use'
import React, { useRef, useCallback, useMemo } from 'react'
import ProTable, { ActionType, ProColumns } from '@ant-design/pro-table'
import { Button, Modal, message, Space, Row, Col, Dropdown, Menu, Select } from 'antd'
import { PlusOutlined, DeleteOutlined, FilterOutlined, ExportOutlined } from '@ant-design/icons'
import {
  getContents,
  deleteContent,
  batchDeleteContent,
  contentBatchExport,
} from '@/services/content'
import { getProjectName, getSchemaAllFields, redirectTo } from '@/utils'
import { ContentCtx } from 'typings/store'
import { SortOrder } from 'antd/lib/table/interface'
import { exportData, formatFilter, formatSearchParams } from './tool'
import ContentTableSearchForm from './SearchForm'
import { getTableColumns } from './columns'
import DataImport from './DataImport'
import DataExport from './DataExport'
import { IS_KIT_MODE, TEMP_SAVE_CONDITIONS } from '@/kitConstants'
import { updateSearchConditions } from '@/services/schema'
import { SearchConditions } from 'typings/field'
import { getDatasourcePath, isWedaTool } from '@/common/adapters/weda-tool'

const { Option } = Select

// 不能支持搜索的类型
const negativeTypes = ['File', 'Image']

/**
 * 内容展示表格
 */
export const ContentTable: React.FC<{
  currentSchema: Schema
}> = (props) => {
  const projectName = getProjectName()
  const { currentSchema } = props
  const ctx = useConcent<{}, ContentCtx>('content')
  const { schemaId = 'default' } = useParams<UrlParams>()

  // 检索的字段
  const { searchFields, searchParams } = ctx.state

  // 表格引用，重置、操作表格
  const tableRef = useRef<ActionType>()

  // 表格数据请求
  const tableRequest = useCallback(
    async (
      params: { pageSize: number; current: number; keyword?: string },
      sort: Record<string, SortOrder>,
      filter: Record<string, React.ReactText[]>
    ) => {
      const { pageSize, current } = params
      const resource = currentSchema.collectionOldName

      // 搜索参数
      const fuzzyFilter = formatSearchParams(searchParams, currentSchema)

      try {
        const { data = [], total } = await getContents(projectName, currentSchema.collectionName, {
          sort,
          pageSize,
          fuzzyFilter,
          page: current,
          filter: formatFilter(filter, currentSchema),
        })

        return {
          data,
          total,
          success: true,
        }
      } catch (e) {
        console.log('查询数据异常', e)
        return {
          data: [],
          total: 0,
          success: true,
        }
      }
    },
    [searchParams]
  )

  /**
   * 搜索字段下拉菜单
   */
  const searchableFields = useMemo(
    () =>
      getSchemaAllFields(currentSchema)?.filter(
        (filed: SchemaField) => !negativeTypes.includes(filed.type)
      ),
    [currentSchema]
  )
  const searchFieldMenu = useMemo(
    () => (
      <Menu
        onClick={({ key }) => {
          const field = searchableFields.find((_) => _.name === key)
          const fieldExist = searchFields?.find((_) => _.name === key)
          if (fieldExist) {
            message.error('字段已添加，请勿重复添加')
            return
          }
          // 添加字段
          // field && ctx.mr.addSearchField(field)
          if(field){
            ctx.mr.addSearchField(field)
            ctx.setState({
              searchParams: {...(searchParams||{}),[key]:undefined},
            })
            if(TEMP_SAVE_CONDITIONS){
              const tarConditions=(searchFields||[]).concat(field).map(fieldItem=>({key:fieldItem.name,value:JSON.stringify(searchParams?.[fieldItem.name])} as SearchConditions))
              updateSearchConditions(projectName,currentSchema.collectionName,tarConditions);
            }
          }
        }}
      >
        {searchableFields.map((field) => (
          <Menu.Item key={field.name}>{field.displayName}</Menu.Item>
        ))}
      </Menu>
    ),
    [currentSchema, searchFields,searchParams]
  )

  // 缓存 Table Columns 配置
  const memoTableColumns: ProColumns[] = useMemo(() => {
    const columns = getTableColumns(currentSchema)

    return [
      ...columns,
      {
        title: '操作',
        width: 220,
        align: 'center',
        fixed: ctx?.state?.isMobile?undefined:'right',
        valueType: 'option',
        render: (text, row: any) => [
          <Button
            size="small"
            type="primary"
            key="edit"
            onClick={() => {
              ctx.setState({
                contentAction: 'edit',
                selectedContent: row,
              })
              redirectTo(`content/${schemaId}/edit`)
            }}
          >
            编辑
          </Button>,
          <Button
            danger
            size="small"
            key="delete"
            type="primary"
            onClick={() => {
              const modal = Modal.confirm({
                title: '确认删除此内容？',
                onCancel: () => {
                  modal.destroy()
                },
                onOk: async () => {
                  try {
                    await deleteContent(projectName, currentSchema.collectionName, row._id)
                    tableRef?.current?.reload()
                    message.success('删除内容成功')
                  } catch (error) {
                    message.error('删除内容失败')
                  }
                },
              })
            }}
          >
            删除
          </Button>,
        ],
      },
    ]
  }, [currentSchema,ctx?.state?.isMobile])

  // 表格多选操作
  const tableAlerRender = useMemo(() => getTableAlertRender(projectName, currentSchema, tableRef), [
    currentSchema,
  ])

  // 表格 ToolBar
  const toolBarRender = useMemo(
    () => [
      isWedaTool() && currentSchema?.databaseType === 'cloud'
      ? <Button type="primary" onClick={async ()=>{
          const dsPath = await getDatasourcePath();
          window.open(`${dsPath}?showType=create&createType=cms&cmsProject=${projectName}&cmsModel=${currentSchema.collectionName}`)
        }}>
          导出到云开发数据模型
        </Button>
      : undefined,
      <Dropdown overlay={searchFieldMenu} key="search">
        <Button type="primary">
          <FilterOutlined /> 增加检索
        </Button>
      </Dropdown>,
      <Button
        key="button"
        type="primary"
        icon={<PlusOutlined />}
        disabled={!currentSchema.fields?.length}
        onClick={() => {
          if (!currentSchema?.collectionName) {
            message.error('请选择需要创建的内容类型！')
            return
          }

          ctx.setState({
            contentAction: 'create',
            selectedContent: null,
          })
          redirectTo(`content/${schemaId}/edit`)
        }}
      >
        新建
      </Button>,
      <DataImport
        key="import"
        collectionName={currentSchema.collectionName}
        onSuccess={() => location.reload()}
      />,
      <DataExport
        key="export"
        schema={currentSchema}
        searchParams={searchParams}
        collectionName={currentSchema.collectionName}
      />,
    ].filter(item=>!!item),
    [currentSchema, searchParams, searchFields]
  )

  // 从 url 获取分页条件
  const pagination = useMemo(() => {
    const { query } = history.location
    return {
      showSizeChanger: true,
      defaultCurrent: Number(query?.current) || 1,
      defaultPageSize: Number(query?.pageSize) || 10,
      pageSizeOptions: ['10', '20', '30', '50'],
    }
  }, [])

  return (
    <>
      {/* 搜索表单 */}
      <ContentTableSearchForm
        schema={currentSchema}
        onSearch={(params) => {
          ctx.setState({
            searchParams: params,
          })
          setPageQuery(1, 10)
          tableRef?.current?.reloadAndRest?.()
        }}
      />

      {/* 数据 Table */}
      <ProTable
        rowKey="_id"
        search={false}
        rowSelection={{}}
        actionRef={tableRef}
        dateFormatter="string"
        scroll={{ x: 'max-content', y: 500 }}
        request={tableRequest}
        columns={memoTableColumns}
        toolBarRender={() => toolBarRender}
        tableAlertRender={tableAlerRender}
        // 禁用树特性
        childrenColumnName="__cms_children__"
        pagination={{
          ...pagination,
          // 翻页时，将分页数据保存在 URL 中
          onChange: (current = 1, pageSize = 10) => {
            setPageQuery(current, pageSize)
          },
        }}
      />
    </>
  )
}

/**
 * Table 批量操作
 */
const getTableAlertRender = (projectName: string, currentSchema: Schema, tableRef: any) => ({
  intl,
  selectedRowKeys,
  selectedRows,
}: {
  intl: any
  selectedRowKeys: any[]
  selectedRows: any[]
}) => {
  // 导出文件类型
  const [{ visible, fileType }, setState] = useSetState<any>({
    visible: false,
    fileType: 'json',
  })

  const closeModal = () => setState({ visible: false })

  return (
    <>
      <Row>
        <Col flex="0 0 auto">
          <Space>
            <span>已选中</span>
            <a style={{ fontWeight: 600 }}>{selectedRowKeys?.length}</a>
            <span>项</span>
          </Space>
        </Col>
        <Col flex="1 1 auto" style={{ textAlign: 'right' }}>
          <Space>
            <Button
              danger
              size="small"
              type="primary"
              onClick={() => {
                const modal = Modal.confirm({
                  title: '确认删除选中的内容？',
                  onCancel: () => {
                    modal.destroy()
                  },
                  onOk: async () => {
                    try {
                      const ids = selectedRows.map((_: any) => _._id)
                      await batchDeleteContent(projectName, currentSchema.collectionName, ids)
                      tableRef?.current?.reload()
                      message.success('删除内容成功')
                    } catch (error) {
                      message.error('删除内容失败')
                    }
                  },
                })
              }}
            >
              <DeleteOutlined /> 删除文档
            </Button>
            <Button size="small" type="primary" onClick={() => setState({ visible: true })}>
              <ExportOutlined /> 导出数据
            </Button>
          </Space>
        </Col>
      </Row>
      <Modal
        visible={visible}
        title="确认导出选中的内容？"
        onCancel={closeModal}
        onOk={async () => {
          try {
            const data = await contentBatchExport(projectName, currentSchema.collectionName, {
              fuzzyFilter: { _id: selectedRowKeys },
            })
            await exportData(data, fileType)

            // await exportData(selectedRows, fileType)
            message.success('导出数据成功')
          } catch (error) {
            message.error('导出数据失败')
          }
          closeModal()
        }}
      >
        <div>将导出已选中的数据</div>
        <Select defaultValue="json" onChange={(v) => setState({ fileType: v })} className="mt-3">
          <Option value="csv">导出为 CSV 文件</Option>
          <Option value="json">导出为 JSON 文件</Option>
        </Select>
      </Modal>
    </>
  )
}

/**
 * 修改、添加 URL 中的 pageSize 和 current 参数
 */
const setPageQuery = (current = 1, pageSize = 10) => {
  const { pathname, query } = history.location

  history.replace({
    pathname,
    search: stringify({
      ...query,
      pageSize,
      current,
    }),
  })
}
