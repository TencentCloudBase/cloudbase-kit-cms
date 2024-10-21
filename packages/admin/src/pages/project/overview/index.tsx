import React from 'react'
import { Card } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import MarkdownPreview from '@/components/MarkdownPreview'

export default (): React.ReactNode => {
  return (
    <PageContainer>
      <Card>
        <MarkdownPreview
          id={Math.random()}
          url='https://cloud-public-static-1258016615.cos.ap-shanghai.myqcloud.com/kit-cms-assets/overview.html'
          onLoad={window?.TcbCmsDynamicMethods?.onOverviewCardLoaded}
        />
      </Card>
    </PageContainer>
  )
}
