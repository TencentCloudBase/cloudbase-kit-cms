import { CONFIG_PLATRORM_ENUM } from '@/constants'

/** 当前是否为微搭平台 */
export function isWedaTool() {
  return window?.TcbCmsConfig?.platform === CONFIG_PLATRORM_ENUM.WEDA_TOOL;
}

/** 微搭平台模型界面路由 */
export const WEDA_DATASOURCE_PATH = '/cloud-admin/#/management/data-model';

/** 微搭工具箱平台适配 */
export async function initWedaTool() {
  if (!isWedaTool()) {
    return
  }

  // 微搭应用菜单栏sdk
  await requireJsSdk(
    'https://qbase.cdn-go.cn/lcap/lcap-resource-cdngo/-/0.1.4/_files/static/weda-page-module-sdk/weda.tools.sdk.js'
  )

  // 这段逻辑必须确保weda.tools.sdk成功加载
  window?.TcbCmsConfig?.envId &&
    window?.['_wedaModuleSdk'] &&
    (window['_wedaModuleSdk'].envId = window.TcbCmsConfig.envId)

  // 微搭应用通用sdk，用来在window上挂载cloudbase
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
