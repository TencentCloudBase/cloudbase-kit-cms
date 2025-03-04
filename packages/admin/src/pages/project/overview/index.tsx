import React from 'react'
import { Card } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import MarkdownPreview from '@/components/MarkdownPreview'
import { REMOTE_RESOURCE_BASE_PATH } from '@/kitConstants'

export default (): React.ReactNode => {
  return (
    <PageContainer>
      <Card>
        <MarkdownPreview
          id={Math.random()}
          url={`${REMOTE_RESOURCE_BASE_PATH}/overview.html`}
          onLoad={window?.TcbCmsDynamicMethods?.onOverviewCardLoaded}
        />
      </Card>
    </PageContainer>
  )
}
