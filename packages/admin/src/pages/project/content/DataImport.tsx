import React, { useState, useEffect } from 'react'
import {
  Button,
  Modal,
  Menu,
  Upload,
  Alert,
  Select,
  message,
  Dropdown,
  Progress,
  Typography,
} from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { contentBatchImport, createImportMigrateJob } from '@/services/content'
import { getProjectName, random, redirectTo, uploadFile } from '@/utils'
import { IS_KIT_MODE } from '@/kitConstants'

/** 文件加载 */
async function loadFile(
  file: File,
  progressCb?: (file: File, progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    // 加载进度回调
    const onProgress = (evt: ProgressEvent) => {
      if (progressCb) {
        progressCb(file, evt.loaded / evt.total)
      }
    }

    // 加载成功回调
    const onLoad = (evt: ProgressEvent) => {
      let result: string
      try {
        result = JSON.parse(reader?.result as string)
      } catch (e) {
        result = reader.result as string
      }
      resolve(result)
    }

    // 加载错误回调
    const onError = (evt: ProgressEvent) => {
      reject(null)
    }

    // 执行加载
    const reader = new FileReader()
    reader.onprogress = onProgress
    reader.onload = onLoad
    reader.onerror = onError

    // 执行加载
    reader.readAsText(file, undefined)
  })
}

const { Dragger } = Upload
const { Title } = Typography
const { Option } = Select

/**
 * 导入数据
 */
const DataImport: React.FC<{ collectionName: string; onSuccess?: () => any }> = ({
  collectionName,
  onSuccess,
}) => {
  const projectName = getProjectName()
  const [visible, setVisible] = useState(false)
  const [percent, setPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dataType, setDataType] = useState<string>('')
  const [conflictMode, setConflictMode] = useState('insert')

  useEffect(() => {
    if (!visible) {
      setPercent(0)
    }
  }, [visible])

  return (
    <>
      <Dropdown
        overlay={
          <Menu
            onClick={({ key }) => {
              // 查看导入记录
              if (key === 'record') {
                redirectTo('content/migrate')
                return
              }

              // 导入数据
              setVisible(true)
              setDataType(key as string)
            }}
          >
            {!IS_KIT_MODE && <Menu.Item key="csv">通过 CSV 导入</Menu.Item>}
            <Menu.Item key="json">通过 JSON 导入</Menu.Item>
            {/* <Menu.Item key="jsonlines">通过 JSON Lines 导入</Menu.Item> */}
            {!IS_KIT_MODE && <Menu.Item key="record">查看导入记录</Menu.Item>}
          </Menu>
        }
        key="search"
      >
        <Button type="primary">导入数据</Button>
      </Dropdown>
      <Modal
        centered
        destroyOnClose
        width={600}
        title="导入数据"
        footer={null}
        closable={true}
        visible={visible}
        onCancel={() => setVisible(false)}
      >
        {dataType === 'csv' && (
          <>
            <Title level={4}>注意事项</Title>
            <Alert message="CSV 格式的数据默认以第一行作为导入后的所有键名，余下的每一行则是与首行键名一一对应的键值记录" />
            <br />
          </>
        )}
        <Title level={4}>冲突处理模式</Title>
        <Select
          defaultValue="insert"
          onChange={setConflictMode}
          style={{ width: '100%', marginBottom: '10px' }}
        >
          <Option value="insert">Insert（会在导入时总是插入新记录，出现 _id 冲突时会报错）</Option>
          <Option value="upsert">
            Upsert（会判断有无该条记录，如果有则更新记录，否则就插入一条新记录）
          </Option>
        </Select>
        <Dragger
          accept=".csv,.json"
          listType="picture"
          beforeUpload={(file) => {
            setUploading(true)
            setPercent(0)

            if (IS_KIT_MODE) {
              loadFile(file, (_, percent) => setPercent(percent * 100)).then((importData) => {
                contentBatchImport(projectName, collectionName, { importData, conflictMode })
                  .then((rsp) => {
                    setVisible(false)
                    message.success('上传文件成功，数据导入处理中')
                    if (onSuccess) {
                      onSuccess()
                    }
                  })
                  .catch((e) => {
                    message.error(`导入文件失败：${e.message}`)
                    setVisible(false)
                  })
              })
            } else {
              // 文件路径
              const filePath = `cloudbase-cms/data-import/${random(32)}-${file.name}`
              // 上传文件
              uploadFile({
                file,
                filePath,
                onProgress: (percent) => {
                  setPercent(percent)
                },
              })
                .then(({ fileId }) =>
                  createImportMigrateJob(projectName, {
                    fileID: fileId,
                    filePath,
                    conflictMode,
                    collectionName,
                    fileType: dataType,
                  })
                )
                .then(() => {
                  setVisible(false)
                  message.success('上传文件成功，数据导入处理中')
                })
                .catch((e) => {
                  message.error(`导入文件失败：${e.message}`)
                  setVisible(false)
                })
            }
            return false
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>点击或拖拽上传文件，开始导入数据</p>
        </Dragger>
        {uploading && <Progress style={{ paddingTop: '10px' }} percent={percent} />}
      </Modal>
    </>
  )
}

export default DataImport
