import React, { useEffect, useState } from 'react'
import { useConcent } from 'concent'
import { Menu, Row, Col, Spin } from 'antd'
import { SchmeaCtx } from 'typings/store'
import { IS_KIT_MODE } from '@/kitConstants'
import { getSchemaFiled, getSchemaFileds } from '@/services/schema'
import { getProjectName } from '@/utils'

export interface TableListItem {
  key: number
  name: string
  status: string
  updatedAt: number
  createdAt: number
  progress: number
  money: number
}

/**
 * 展示模型列表
 */
const SchemaMenuList: React.FC = () => {
  const ctx = useConcent<{}, SchmeaCtx>('schema')
  const {
    state: { currentSchema, schemas, loading },
  } = ctx

  const defaultSelectedMenu = currentSchema?.collectionName ? [currentSchema.collectionName] : []

  // 为当前选择的模型拉取数据格式
  useEffect(() => {
    if (IS_KIT_MODE && !!currentSchema?.collectionName && !currentSchema?.fields) {
      const projectName = getProjectName()
      getSchemaFileds(projectName, currentSchema.collectionName).then((res) => {
        !!res?.data &&
          ctx.setState({
            currentSchema: {
              ...currentSchema,
              fields: res?.data || [],
            },
          })
      })
    }
  }, [currentSchema])

  return loading ? (
    <Row justify="center">
      <Col>
        <Spin />
      </Col>
    </Row>
  ) : schemas?.length ? (
    <Menu
      mode="inline"
      defaultSelectedKeys={defaultSelectedMenu}
      onClick={({ key }) => {
        const schema = schemas.find((item) => item.collectionName === key)
        ctx.setState({
          currentSchema: schema,
        })
      }}
    >
      {schemas.map((item: Schema) => (
        <Menu.Item key={item.collectionName}>{item.displayName}</Menu.Item>
      ))}
    </Menu>
  ) : (
    <Row justify="center">
      <Col>模型为空</Col>
    </Row>
  )
}

export default SchemaMenuList
