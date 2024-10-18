import React, { useState, useEffect, useMemo } from 'react'
import { useConcent } from 'concent'
import ProCard from '@ant-design/pro-card'
import { Layout, Button, Space, Dropdown, Menu, Divider } from 'antd'
import { ExportOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons'
import { PageContainer } from '@ant-design/pro-layout'
import { getProjectName } from '@/utils'
import { SchmeaCtx } from 'typings/store'

import { SchemaExportModal, SchemaImportModal } from './SchemaShare'
import SchemaContent from './SchmeaContent'
import SchemaMenuList from './SchemaMenuList'
import SchemaEditor from './SchemaEditor'
import SchemaFieldPicker from './SchemaFieldPicker'
import './index.less'
import { IS_KIT_MODE } from '@/kitConstants'
import { getDatasourcePath, isWedaTool } from '@/common/adapters/weda-tool'

export interface TableListItem {
  key: number
  name: string
  status: string
  updatedAt: number
  createdAt: number
  progress: number
  money: number
}

export default (): React.ReactNode => {
  const projectName = getProjectName()
  const ctx = useConcent<{}, SchmeaCtx>('schema')

  // 模型导入导出
  const [exportVisible, setExportVisible] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const [exportCodeVisible, setExportCodeVisible] = useState(false)

  const devMode = window?.getDevMode?.() || false

  // 获取 Schema 列表
  useEffect(() => {
    ctx.mr.getSchemas(projectName)
  }, [])

  // 微搭平台引流
  const wedaGuid=useMemo(()=>(
    <Menu>
      <Menu.Item key='datasource' onClick={async ()=>{
          const dsPath = await getDatasourcePath();
          window.open(`${dsPath}?showType=create`)
        }}>
        <div style={{width:280}}>
          <div style={{fontSize:16,fontWeight:'bold',marginBottom:4}}>新建云开发数据模型(推荐)</div>
          <div>支持表格视图管理、类型校验、关联关系、自动解析、云开发SDK访问</div>
        </div>
      </Menu.Item>
      <Divider style={{margin:0}}/>
      <Menu.Item key='cms' onClick={()=>ctx.mr.createSchema()}>
        <div style={{width:280}}>
          <div style={{fontSize:16,fontWeight:'bold',marginBottom:4}}>新建CMS模型</div>
          <div>CMS模型，仅支持数据管理</div>
          <div>　</div>
        </div>
      </Menu.Item>
    </Menu>
  ), []);

  return (
    <PageContainer
      className="schema-page-container"
      extra={
        <Space>
          {
            isWedaTool()
            ? <Dropdown overlay={wedaGuid} key="search">
                <Button type="primary">
                  <PlusOutlined />
                  新建模型
                </Button>
              </Dropdown>
            : <Button
                type="primary"
                onClick={() => {
                  ctx.mr.createSchema()
                }}
              >
                <PlusOutlined />
                新建模型
              </Button>
          }
          <Button type="primary" onClick={() => setExportVisible(true)}>
            <ExportOutlined />
            导出模型
          </Button>
          <Button type="primary" onClick={() => setImportVisible(true)}>
            <ImportOutlined />
            导入模型
          </Button>
          {devMode && (
            <Button type="primary" onClick={() => setExportCodeVisible(true)}>
              <ExportOutlined />
              导出代码
            </Button>
          )}
        </Space>
      }
    >
      <ProCard split="vertical" gutter={[16, 16]} style={{ background: 'inherit' }}>
        {/* 模型菜单 */}
        <ProCard colSpan="220px" className="card-left" style={{ marginBottom: 0 }}>
          <SchemaMenuList />
        </ProCard>
        {/* 模型字段 */}
        <Layout className="schema-layout">
          <SchemaContent />
        </Layout>

        {/* 右侧字段类型列表 */}
        <SchemaFieldPicker />
      </ProCard>

      {/* 编辑弹窗 */}
      {ctx.state.schemaEditVisible && <SchemaEditor />}
      <SchemaExportModal visible={exportVisible} onClose={() => setExportVisible(false)} />
      <SchemaImportModal visible={importVisible} onClose={() => setImportVisible(false)} />
      <SchemaExportModal
        visible={exportCodeVisible}
        onClose={() => setExportCodeVisible(false)}
        isExportCode={true}
      />
    </PageContainer>
  )
}
