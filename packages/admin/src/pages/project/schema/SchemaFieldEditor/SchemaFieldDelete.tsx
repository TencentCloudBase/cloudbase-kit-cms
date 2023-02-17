import { useConcent } from 'concent'
import React, { useState } from 'react'
import { Modal, message } from 'antd'
import { ContentCtx, SchmeaCtx } from 'typings/store'
import { deleteSchemaFiled, updateSchemaFiled } from '@/services/schema'
import { getProjectName } from '@/utils'
import { IS_KIT_MODE } from '@/kitConstants'

/**
 * 删除字段
 */
export const SchemaFieldDeleteModal: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const projectName = getProjectName()
  const ctx = useConcent<{}, SchmeaCtx>('schema')
  const contentCtx = useConcent<{}, ContentCtx>('content')
  const [loading, setLoading] = useState(false)

  const {
    state: { currentSchema, selectedField },
  } = ctx

  return (
    <Modal
      centered
      destroyOnClose
      visible={visible}
      title={`删除【${selectedField?.displayName}】字段`}
      okButtonProps={{
        loading,
      }}
      onOk={async () => {
        setLoading(true)
        const fields = (currentSchema.fields || []).slice()
        const index = fields.findIndex(
          (_: any) => _.id === selectedField._id || _.name === selectedField.name
        )

        if (index > -1) {
          fields.splice(index, 1)
        }

        try {
          if (IS_KIT_MODE) {
            await deleteSchemaFiled(projectName, currentSchema?.collectionName, selectedField._id)
          } else {
            await updateSchemaFiled(projectName, currentSchema?.collectionName, {
              fields,
            })
          }
          currentSchema.fields.splice(index, 1)
          message.success('删除字段成功')
          ctx.mr.getSchemas(projectName)
          contentCtx.mr.getContentSchemas(projectName)
        } catch (error) {
          message.error('删除字段失败')
        } finally {
          onClose()
          setLoading(false)
        }
      }}
      onCancel={() => onClose()}
    >
      确认删除【{selectedField.displayName}（{selectedField?.name}）】字段吗？
    </Modal>
  )
}
