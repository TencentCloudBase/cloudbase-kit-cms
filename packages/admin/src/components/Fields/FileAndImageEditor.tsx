import React, { useEffect, useState } from 'react'
import { Upload, message, Progress, Radio, Input, Form, Button } from 'antd'
import {
  isFileId,
  uploadFile,
  getPageQuery,
  getTempFileURL,
  getFileNameFromUrl,
  batchGetTempFileURL,
} from '@/utils'
import { InboxOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { DraggerUpload } from '@/components/Upload'
import { ContentLoading } from '@/components/Loading'
import { useSetState } from 'react-use'

const { Dragger } = Upload

interface IFileAndImageEditorProps {
  field: SchemaField
  type: 'file' | 'image'
  value?: string | string[]
  resourceLinkType?: 'https' | 'fileId'
  onChange?: (v: string | string[] | null) => void
}

/**
 * 文件、图片编辑组件
 */
export const IFileAndImageEditor: React.FC<IFileAndImageEditorProps> = (props) => {
  let { value: links, type, field, onChange = () => {}, resourceLinkType = 'fileId' } = props
  const { isMultiple } = field
  const query = getPageQuery()
  const uploadType: any = query?.upload

  // 数组模式，多文件
  if (isMultiple || Array.isArray(links)) {
    return (
      <IMultipleEditorNext
        type={type}
        onChange={onChange}
        fileUris={links as string[]}
        resourceLinkType={resourceLinkType}
      />
    )
  }

  // 单文件
  const fileUri: string = links as string
  return (
    <ISingleFileUploader
      type={type}
      fileUri={fileUri}
      onChange={onChange}
      uploadType={uploadType}
      resourceLinkType={resourceLinkType}
    />
  )
}

/**
 * 单文件、图片上传
 */
export const ISingleFileUploader: React.FC<{
  type: 'file' | 'image'
  fileUri: string
  uploadType: 'hosting' | 'storage'
  onChange: (v: string | string[] | null) => void
  resourceLinkType: 'fileId' | 'https'
}> = ({ type, fileUri, onChange, uploadType, resourceLinkType }) => {
  const [percent, setPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])
  const tipText = type === 'file' ? '文件' : '图片'

  // 加载图片预览
  useEffect(() => {
    if (!fileUri) {
      return
    }

    // 文件名
    const fileName = getFileNameFromUrl(fileUri)

    // 文件，不加载预览
    if (type === 'file') {
      setFileList([
        {
          url: fileUri,
          uid: fileUri,
          name: fileName || `已上传${tipText}`,
          status: 'done',
        },
      ])
      return
    }

    // 非 fileId，无需加载预览
    if (!isFileId(fileUri)) {
      return setFileList([
        {
          url: fileUri,
          uid: fileUri,
          name: fileName || `已上传${tipText}`,
          status: 'done',
        },
      ])
    }

    // 获取临时链接
    getTempFileURL(fileUri)
      .then((url: string) => {
        setFileList([
          {
            url,
            uid: fileUri,
            name: fileName || `已上传${tipText}`,
            status: 'done',
          },
        ])
      })
      .catch((e) => {
        message.error(`加载图片失败 ${e.message}`)
      })
  }, [])

  return (
    <>
      <Dragger
        fileList={fileList}
        listType={type === 'image' ? 'picture' : 'text'}
        onRemove={(file) => {
          onChange(null)
          setFileList([])
        }}
        beforeUpload={(file) => {
          setUploading(true)
          setPercent(0)
          // 上传文件
          uploadFile({
            file,
            uploadType,
            onProgress: (percent) => {
              setPercent(percent)
            },
          }).then(({ fileId, url }) => {
            // 保存链接
            onChange(resourceLinkType === 'fileId' ? fileId : url)
            // 添加图片
            setFileList([
              {
                url,
                uid: fileId,
                name: file.name,
                status: 'done',
              },
            ])
            message.success(`上传${tipText}成功`)
          })
          return false
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽{tipText}上传</p>
      </Dragger>
      {uploading && <Progress style={{ paddingTop: '10px' }} percent={percent} />}
    </>
  )
}

/**
 * 多文件、图片上传
 */
const IMultipleEditorNext: React.FC<{
  fileUris: string[]
  type: 'file' | 'image'
  resourceLinkType: 'fileId' | 'https'
  onChange: (v: string[]) => void
}> = (props) => {
  let { fileUris = [], type, onChange = () => {}, resourceLinkType = 'fileId' } = props

  // 如果为 multiple 模式，但是 fileUris 为字符串，则转为数组
  if (!Array.isArray(fileUris) && typeof fileUris === 'string') {
    fileUris = [fileUris]
  }

  // 全部为 http 链接
  const isAllHttp = fileUris.every((link) => !isFileId(link))
  // 初始 state
  const [{ transformLoading, transformedFileUrls }, setState] = useSetState({
    transformLoading: !fileUris?.length || isAllHttp || type === 'file' ? false : true,
    transformedFileUrls: fileUris,
  })
  const tipText = type === 'file' ? '文件' : '图片'

  // 加载图片预览
  useEffect(() => {
    if (!fileUris?.length) {
      return
    }

    // 文件不加载预览
    // 全部为 http 链接，不用转换
    if (isAllHttp || type === 'file') {
      return
    }

    // 可能存在 fileId 和 http 混合的情况
    const fileIds = fileUris.filter((fileUri) => isFileId(fileUri))

    // 获取临时访问链接
    batchGetTempFileURL(fileIds)
      .then((results) => {
        // 拼接结果和 http 链接
        const fileUrlList = fileUris.map((fileUri: string) => {
          let fileUrl: string = fileUri
          if (isFileId(fileUri)) {
            // eslint-disable-next-line
            const ret = results.find((_) => _.fileID === fileUri)
            fileUrl = ret?.tempFileURL || ''
          }

          return fileUrl
        })

        setState({
          transformLoading: false,
          transformedFileUrls: fileUrlList,
        })
      })
      .catch((e) => {
        setState({
          transformLoading: false,
        })
        message.error(`获取图片链接失败 ${e.message}`)
      })
  }, [fileUris])

  return transformLoading ? (
    <ContentLoading size="default" tip="图片加载中" />
  ) : (
    <DraggerUpload
      onChange={onChange}
      value={transformedFileUrls}
      resourceLinkType={resourceLinkType}
      uploadTip={`点击或拖拽${tipText}上传`}
      listType={type === 'image' ? 'picture' : 'text'}
    />
  )
}

/** 图片/文件输入添加自定义输入模式 */
export const IFileAndImageEditorWithUrl: React.FC<IFileAndImageEditorProps> = (props) => {
  const { field, type, resourceLinkType } = props
  const setTypeOpts: { [key: string]: string } = {
    upload: `上传${type === 'image' ? '图片' : '文件'}`,
    url: 'URL',
  }
  const [uploadType, setUploadType] = useState<string>('upload')
  if (resourceLinkType === 'https') {
    return (
      <>
        <Radio.Group
          style={{ marginBottom: 6 }}
          onChange={(evt) => setUploadType(evt.target.value)}
          value={uploadType}
        >
          {Object.keys(setTypeOpts).map((key) => (
            <Radio key={key} value={key}>
              {setTypeOpts[key]}
            </Radio>
          ))}
        </Radio.Group>
        {uploadType === 'upload' ? (
          <Form.Item {...field}>
            <IFileAndImageEditor {...props} />
          </Form.Item>
        ) : field.isMultiple ? (
          <Form.List name={field.name}>
            {(fields, { add, remove }) => {
              return (
                <div>
                  {fields?.map((fieldItem, index) => {
                    return (
                      <Form.Item key={index}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Form.Item
                            {...fieldItem}
                            noStyle
                            validateTrigger={['onChange', 'onBlur']}
                          >
                            <Input />
                          </Form.Item>
                          <MinusCircleOutlined
                            className="dynamic-delete-button"
                            style={{ margin: '0 8px' }}
                            onClick={() => {
                              remove(fieldItem.name)
                            }}
                          />
                        </div>
                      </Form.Item>
                    )
                  })}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => {
                        add()
                      }}
                      style={{ width: '100%' }}
                    >
                      <PlusOutlined /> 添加字段
                    </Button>
                  </Form.Item>
                </div>
              )
            }}
          </Form.List>
        ) : (
          <Form.Item {...field}>
            <Input />
          </Form.Item>
        )}
      </>
    )
  }
  return (
    <Form.Item {...field}>
      <IFileAndImageEditor {...props} />
    </Form.Item>
  )
}
