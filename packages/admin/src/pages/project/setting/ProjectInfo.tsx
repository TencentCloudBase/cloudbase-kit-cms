import React, { useState } from 'react'
import { useRequest, history } from 'umi'
import { getProject, updateProject, deleteProject } from '@/services/project'
import { Divider, Button, Space, Typography, Form, Input, Skeleton, Modal, message } from 'antd'
import { getProjectName } from '@/utils'

const ProjectDangerAction: React.FC<{ project: Project }> = ({ project }) => {
  const projectName = getProjectName()
  const [modalVisible, setModalVisible] = useState(false)
  const [displayName, setDisplayName] = useState('')

  // 删除项目
  const { run, loading } = useRequest(
    async () => {
      await deleteProject(projectName)
      setModalVisible(false)
      message.success('删除项目成功')
      setTimeout(() => {
        history.push('/home')
      }, 2000)
    },
    {
      manual: true,
    }
  )

  return (
    <>
      <Typography.Title level={3}>危险操作</Typography.Title>
      <Divider />
      <Button
        danger
        type="primary"
        onClick={() => {
          setModalVisible(true)
        }}
      >
        删除项目
      </Button>
      <Modal
        centered
        title="删除项目"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => run()}
        okButtonProps={{
          loading,
          disabled: displayName !== project.displayName,
        }}
      >
        <Space direction="vertical">
          <Typography.Paragraph strong>
            删除项目会删除项目中的内容模型及 Webhooks 等数据
          </Typography.Paragraph>
          <Typography.Paragraph strong>
            删除项目是不能恢复的，您确定要删除此项目吗？
            如果您想继续，请在下面的方框中输入此项目的名称：
            <Typography.Text strong mark>
              {project.displayName}
            </Typography.Text>
          </Typography.Paragraph>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Space>
      </Modal>
    </>
  )
}

export default (): React.ReactElement => {
  const projectName = getProjectName()
  const [reload, setReload] = useState(0)
  const [changed, setChanged] = useState(false)
  const { data: project, loading } = useRequest(() => getProject(projectName), {
    refreshDeps: [reload],
  })

  const { run, loading: updateLoading } = useRequest(
    async (payload: Partial<Project>) => {
      await updateProject(projectName, payload)
      setChanged(false)
      setReload(reload + 1)
      message.success('项目更新成功！')
    },
    {
      manual: true,
    }
  )

  if (loading || !project) {
    return <Skeleton />
  }

  return (
    <>
      <Typography.Title level={3}>项目信息</Typography.Title>
      <Divider />
      <Form
        layout="vertical"
        labelAlign="left"
        initialValues={project}
        onFinish={(v = {}) => {
          run(v)
        }}
        onValuesChange={(_, v: Partial<Project>) => {
          if (v.displayName !== project?.displayName || v.description !== project.description) {
            setChanged(true)
          } else {
            setChanged(false)
          }
        }}
      >
        <Form.Item label="项目名">
          <Typography.Paragraph copyable>{project?.projectName}</Typography.Paragraph>
        </Form.Item>

        <Form.Item
          label="显示名"
          name="displayName"
          rules={[{ required: true, message: '请输入显示名！' }]}
        >
          <Input placeholder="显示名，如官网" />
        </Form.Item>

        <Form.Item label="项目介绍" name="description">
          <Input placeholder="项目介绍，如官网内容管理" />
        </Form.Item>

        <Form.Item>
          <Space size="large" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" disabled={!changed} loading={updateLoading}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <ProjectDangerAction project={project} />
    </>
  )
}
