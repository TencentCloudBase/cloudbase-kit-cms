import React from 'react'
import { Card } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import { getCmsConfig } from '@/utils'
import Link from 'antd/lib/typography/Link'

export default (): React.ReactNode => {
  const cmsTitle = getCmsConfig('cmsTitle');
  const docUrl = 'https://docs.cloudbase.net/headless-cms/intro';
  return (
    <PageContainer>
      <Card>
        欢迎使用 {cmsTitle}
        <div style={{ marginTop: 14 }}>{`${cmsTitle}产品文档：`}<Link href={docUrl} target='_blank'>{docUrl}</Link></div>
        <div>如您在使用过程中有任何问题，也欢迎加入CMS交流群，与官方团队近距离交流。加群二维码：</div>
        <img src="./img/weWork.jpg" style={{ height: 200, width: 200 }} />
      </Card>
    </PageContainer>
  )
}
