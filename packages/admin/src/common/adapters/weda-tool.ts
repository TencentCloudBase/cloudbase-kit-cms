import { CONFIG_PLATRORM_ENUM } from '@/constants'

/** 微搭工具箱平台适配 */
export async function initWedaTool() {
  if (window?.TcbCmsConfig?.platform !== CONFIG_PLATRORM_ENUM.WEDA_TOOL) {
    return
  }
  window?.TcbCmsConfig?.envId &&
    window?.['_wedaModuleSdk'] &&
    (window['_wedaModuleSdk'].envId = window.TcbCmsConfig.envId)
  if (!window?.cloudbase) {
    const { region, envId, clientId } = window.TcbCmsConfig
    await requireJsSdk(
      'https://static.cloudbase.net/cloudbase-js-sdk/2.4.7-beta.0/cloudbase.full.js?v=1'
    )

    // 导入js后，window上会自动挂在cloudbase
    if (window.cloudbase) {
      const app = window.cloudbase.init({
        env: envId,
        region,
        clientId,
      })
      app.auth({ persistence: 'local' })
    }
  }
}

/** 远程引入js文件 */
async function requireJsSdk(src: string) {
  return new Promise<void>((resolve, reject) => {
    let script = document.createElement('script')
    script.src = src
    let head = document.getElementsByTagName('head')[0]

    script.onload = () => {
      resolve()
    }
    script.onerror = () => {
      reject()
    }

    head.appendChild(script)
  })
}
