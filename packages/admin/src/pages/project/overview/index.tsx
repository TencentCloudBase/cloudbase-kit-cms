import React from 'react'
import { Card } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import { getCmsConfig } from '@/utils'
import Link from 'antd/lib/typography/Link'

export default (): React.ReactNode => {
  const cmsTitle = getCmsConfig('cmsTitle')
  const docUrl = 'https://docs.cloudbase.net/headless-cms/intro'
  const faqUrl = 'https://docs.cloudbase.net/headless-cms/faq'
  const search = location.hash.split('?')?.[1] || ''
  const openApiUrl = 'https://docs.cloudbase.net/headless-cms/open-api/intro'
  const faqCode = `  a. 新版CMS数据存储在哪里？
  b. 新版 CMS 和目前的开源版有什么不一样？
  c. 如何继续使用旧版CMS？
  …`
  const openApiCode = `  wx.request({
    url: 'open api地址',
    header: {
      'content-type': 'application/json'
    },
    success (res) {
      console.log('cms数据',res)
    }
  })`
  return (
    <PageContainer>
      <Card>
        欢迎使用 {cmsTitle}
        <h3 style={{ marginTop: 20, fontWeight: 'bold' }}>新版CMS介绍：</h3>
        <div style={{ marginTop: 12 }}>
          {`${cmsTitle}产品文档：`}
          <Link href={docUrl} target="_blank">
            {docUrl}
          </Link>
        </div>
        <div>
          {`${cmsTitle}常见问题：`}
          <Link href={faqUrl} target="_blank">
            {faqUrl}
          </Link>
        </div>
        <pre style={{ marginTop: 4, marginLeft: 20, marginBottom: 20 }}>{faqCode}</pre>
        <div>
          如您在使用过程中有任何问题，也欢迎加入CMS交流群，与官方团队近距离交流。加群二维码：
        </div>
        <img src="./img/weWork.jpg" style={{ height: 200, width: 200 }} />
        <h3 style={{ marginTop: 20, fontWeight: 'bold' }}>新版CMS接入指引：</h3>
        <div>新版CMS的数据可以通过Open API获取，以小程序为例：</div>
        <code
          style={{
            marginTop: 10,
            backgroundColor: '#f8f8f8',
            padding: '0.5em',
            display: 'block',
            borderRadius: 5,
          }}
        >
          <pre>{openApiCode}</pre>
        </code>
        <div style={{ marginTop: 20 }}>
          {`Open API地址可以前往 `}
          <Link href={`#/project/setting${search ? `?${search}` : ''}`}>项目设置</Link>
          {` 参考文档：`}
        </div>
        <div>
          <Link href={openApiUrl} target="_blank">
            {openApiUrl}
          </Link>
        </div>
      </Card>
    </PageContainer>
  )
}
