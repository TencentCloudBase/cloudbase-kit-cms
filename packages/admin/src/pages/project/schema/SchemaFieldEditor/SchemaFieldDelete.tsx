import { useConcent } from 'concent'
import React, { useState } from 'react'
import { Modal, message } from 'antd'
import { ContentCtx, SchmeaCtx } from 'typings/store'
import { deleteSchemaFiled, updateSchemaFiled } from '@/services/schema'
import { getProjectId } from '@/utils'
import { IS_KIT_MODE } from '@/kitConstants'

/**
 * 删除字段
 */
export const SchemaFieldDeleteModal: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const projectId = getProjectId()
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
          (_: any) => _.id === selectedField.id || _.name === selectedField.name
        )

        if (index > -1) {
          fields.splice(index, 1)
        }

        try {
          if (IS_KIT_MODE) {
            await deleteSchemaFiled(projectId, currentSchema?.id, selectedField.id)
          } else {
            await updateSchemaFiled(projectId, currentSchema?.id, {
              fields,
            })
          }
          currentSchema.fields.splice(index, 1)
          message.success('删除字段成功')
          ctx.mr.getSchemas(projectId)
          contentCtx.mr.getContentSchemas(projectId)
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
