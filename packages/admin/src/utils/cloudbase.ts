import { getState } from 'concent'
import { request, history } from 'umi'
import { notification } from 'antd'
import { RequestOptionsInit } from 'umi-request'
import { uploadFilesToHosting } from '@/services/apis'
import { codeMessage, CONFIG_PLATRORM_ENUM, RESOURCE_PREFIX } from '@/constants'
import defaultSettings from '../../config/defaultSettings'
import { isDevEnv, random } from './common'
import { getDay, getFullDate, getMonth, getYear } from './date'
import { downloadFileFromUrl } from './file'
import { templateCompile } from './templateCompile'
import { CloudbaseOAuth } from '@cloudbase/oauth'
import cloudbase from '@tencent/cloudbase-paas-js-sdk/src'
import { IS_CUSTOM_ENV, IS_KIT_MODE } from '@/kitConstants'
import { getInitialState } from '@/app'
import { ApiUrls } from '@cloudbase/oauth/src/auth/consts'
import { appendCaptchaTokenToURL } from '@/pages/login/captcha'
import moment from 'moment'
import { GlobalCtx } from 'typings/store'
import { GET_PROJECTS_PATH } from '@/services/project'
import { getCurrentProject } from './route'
import { getStorageDownloadInfo, getStorageUploadInfo } from '@/services/project'

interface IntegrationRes {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: true | false
}

/** 后台接口错误处理函数（当前ts文件无法导入显示节点，所以从外部注入下） */
let apiErrorHandler: (result?: any, url?: string) => any = () => ''
export function setApiErrorHandler(func: typeof apiErrorHandler) {
  apiErrorHandler = func
}

let app: any
let auth: CloudbaseOAuth

initCloudBaseApp()

/**
 * 获取 CloudBase App 实例
 */
export async function getCloudBaseApp() {
  const loginState = await auth.authApi.getLoginState()

  if (!loginState && !isDevEnv()) {
    history.push('/login')
  }

  return app
}

let wxCloudApp: any

/**
 * 处理微信 Web SDK 的登录
 */
export function getWxCloudApp() {
  // 全局 state
  const state: any = getState()
  const { envId, mpAppID } = window.TcbCmsConfig || {}
  const miniappID = mpAppID || state?.global?.setting?.miniappID

  if (!wxCloudApp) {
    // 声明新的 cloud 实例
    wxCloudApp = new window.cloud.Cloud({
      // 必填，表示是未登录模式
      identityless: true,
      // 资源方环境 ID
      resourceEnv: envId,
      // 资源方 AppID
      resourceAppid: miniappID,
    })

    wxCloudApp.init({
      env: envId,
      appid: miniappID,
    })
  }

  return wxCloudApp
}

/**
 * 初始化云开发 app、auth 实例
 */
function initCloudBaseApp() {
  const { envId, region, clientId } = window.TcbCmsConfig || {}

  if (!app) {
    if (IS_CUSTOM_ENV) {
      cloudbase.init({
        env: envId, // 环境 ID
        region: region as any,
        clientId,
        // clientId:envId,
      })
    } else {
      app = window.cloudbase.init({
        env: envId,
        // 默认可用区为上海
        region: window.TcbCmsConfig.region || 'ap-shanghai',
      })
    }
    console.log('init cloudbase app')
  }

  if (!auth) {
    console.log('init cloudbase app auth')
    // auth = app.auth({ persistence: 'local' })

    if (IS_CUSTOM_ENV) {
      auth = cloudbase.auth()
    } else {
      auth = new CloudbaseOAuth({
        apiOrigin:
          IS_KIT_MODE && !IS_CUSTOM_ENV
            ? `https://${envId}.${region}.tcb-api.tencentcloudapi.com`
            : `https://${envId}.${region}.auth.tcloudbasegateway.com`,
        clientId: IS_CUSTOM_ENV ? clientId : envId, // 环境 ID
      })
    }
  }
}

/**
 * 用户名密码登录
 * @param username
 * @param password
 */
export async function loginWithPassword(
  username: string,
  password: string,
  captcha_token?: string
) {
  // 需要输入验证码的情况，如短时间内连续多次输入密码
  if (captcha_token) {
    const { envId, region, clientId } = window.TcbCmsConfig || {}
    const apiOrigin =
      IS_KIT_MODE && !IS_CUSTOM_ENV
        ? `https://${envId}.${region}.tcb-api.tencentcloudapi.com`
        : `https://${envId}.${region}.auth.tcloudbasegateway.com`
    const tempAuth = new CloudbaseOAuth({
      apiOrigin,
      clientId: IS_CUSTOM_ENV ? clientId : envId, // 环境 ID
      request: async function (url, options) {
        const pureUrl = url.split('?')[0]
        if (pureUrl === `${apiOrigin}${ApiUrls.AUTH_SIGN_IN_URL}`) {
          // eslint-disable-next-line no-param-reassign
          url = appendCaptchaTokenToURL(url, options?.body?.captcha_token)
          delete options?.body?.captcha_token
        }
        const res = await fetch(url, {
          method: options?.method || 'POST',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers: options?.headers as any,
          body: JSON.stringify(options?.body),
        })
        return await res.json()
      },
    })
    await tempAuth.authApi.signIn({ username, password, captcha_token } as any)
    location.href = location.origin + location.pathname
    return new Promise((resolve, reject) => { })
  }
  // 登陆
  // await auth.signInWithUsernameAndPassword(username, password)
  return auth.authApi.signIn({ username, password })
  // return IS_CUSTOM_ENV?auth.authApi.signInAnonymously():auth.authApi.signIn({username,password})
}

/**
 * 获取当前登录态信息
 */
export async function getLoginState() {
  // sdk内部bug，缓存中的token判定有点问题，我们这里加一步来在业务侧修正这个问题（该函数内会判定token有效期）
  let token
  let err
  try {
    token = await auth.oauth2client.getAccessToken()
  } catch (e) {
    err = e
  }

  // eslint-disable-next-line no-extra-boolean-cast
  if (!!err) {
    throw err // 有明确的错误，就先抛出错误
  }
  if (!token) {
    throw new Error('getAccessToken error')
  }

  // 获取登录态
  return auth.authApi.getLoginState()
}

/**
 * 同步获取 x-cloudbase-credentials
 */
export async function getCredentials() {
  return auth.oauth2client.getCredentials()
}

/** 根据credentials获取请求header */
export function getAuthHeader(credentials: string) {
  return { 'x-cloudbase-credentials': credentials }
}

let gotAuthHeader = false
let gotAuthTime = 0
/**
 * 异步获取 x-cloudbase-credentials 请求 Header
 */
export async function getAuthHeaderAsync() {
  // 直接读取本地
  let res = await getCredentials()
  const diff = Date.now() - gotAuthTime

  // TODO: 当期 SDK 同步获取的 token 可能是过期的
  // 临时解决办法：在首次获取时、间隔大于 3500S 时，刷新 token
  if (!res?.access_token || !gotAuthHeader || diff > 3500000) {
    res = await auth.oauth2client.getCredentialsAsync()
    gotAuthHeader = true
    gotAuthTime = Date.now()
  }

  return Promise.resolve(getAuthHeader(res?.access_token || ''))
}

/**
 * 退出登录
 */
export async function logout() {
  await auth.authApi.signOut()
}

/** url在不同模式下的改造 */
function reqParamFormat(oriUrl: string, options: RequestOptionsInit) {
  let url = oriUrl
  const isGetMethod = !options?.method || options.method === 'GET'
  const method = isGetMethod ? 'GET' : options.method
  let query: { [key: string]: string } = {}
  if (!!options?.data && isGetMethod) {
    const paramsStrs = Object.keys(options.data).map(
      (k) => `${k}=${encodeURIComponent(options.data[k])}`
    )
    const hasQuestionSign = url.includes('?')
    const hasParam = url.split('?')?.[1]?.length > 0
    url = `${url}${hasQuestionSign ? '' : '?'}${hasParam ? '&' : ''}${paramsStrs.join('&')}`
  }

  const queryStr = url.split('?')?.[1]
  if (queryStr?.length > 0) {
    queryStr.split('&').map((kvStr) => {
      const [k, v = ''] = kvStr.split('=')
      query[k] = decodeURIComponent(v)
      return null
    })
  }

  return {
    pureUrl: url.split('?')?.[0] || '',
    url: isGetMethod ? url : url.split('?')?.[0],
    method,
    query: isGetMethod ? query : undefined,
    isGetMethod,
  }
}

/**
 * 兼容本地开发与云函数请求
 */
export async function tcbRequest<T = any>(
  url: string,
  options: RequestOptionsInit & { skipErrorHandler?: boolean } = {}
): Promise<T> {
  if (IS_KIT_MODE && !/\/auth\/v1\//.test(url)) {
    const { envId, region, kitId, platform } = window.TcbCmsConfig || {}
    const reqParam = reqParamFormat(url, { ...(options || {}) })
    let result: any
    if (IS_CUSTOM_ENV && platform !== CONFIG_PLATRORM_ENUM.WEDA_TOOL) {
      await getInitialState()
      result = await cloudbase.kits().request({
        url: `/cms/${kitId}/v1${reqParam.pureUrl}`,
        method: reqParam.method as any,
        // body: options.body,
        body: !reqParam?.isGetMethod && !!options?.data ? JSON.stringify(options.data) : undefined,
        query: reqParam?.query,
        headers: { ...(options.headers || {}), 'Content-Type': 'application/json' } as any,
        timeout: options?.timeout || 3000,
      })

      // 错误处理
      if (result?.code !== 'NORMAL') {
        if (result?.code === 'INVALID_TOKEN') {
          // 这种情况是token格式错误（比如无头cms需要group字段，用auth-sdk其实是可以登陆的，但我们这里要限制只能使用kit-cms对应group）
          await logout()
          await getInitialState() // 通过这句拉起登陆界面
        } else {
          apiErrorHandler(result, url)
          // notification.error({
          //   message: '请求错误',
          //   description: `服务异常：${result?.status || '--'}: ${url}`,
          // })
          return Promise.reject(result?.message)
        }
      }
      return result.result
    } else {
      /** 微搭工具箱集成的应用，属于uin级别，对应的Project结构中记录了其所在的环境和kitid */
      let tarEnvId = envId
      let tarKitId = kitId
      if (platform === CONFIG_PLATRORM_ENUM.WEDA_TOOL && url !== GET_PROJECTS_PATH) {
        const currentProject: Project = getCurrentProject()
        if (!currentProject) {
          history.replace('')
        }
        tarEnvId = currentProject?.envId || envId
        tarKitId = currentProject?.kitId || kitId
      }

      // 重置url
      // eslint-disable-next-line no-param-reassign
      url = `https://${tarEnvId || envId}.${region}.kits.tcloudbasegateway.com/cms/${tarKitId || kitId
        }/v1${url}`

      const addHeaders = {}
      if (platform === CONFIG_PLATRORM_ENUM.WEDA_TOOL) {
        const wedaToolCredentials = auth?.oauth2client?.getCredentialsSync?.()
        if (wedaToolCredentials?.token_type && wedaToolCredentials?.access_token) {
          addHeaders.Authorization = `${wedaToolCredentials.token_type} ${wedaToolCredentials.access_token}`
        }
      }

      result = await fetch(reqParamFormat(url, { ...(options || {}) }).url, {
        method: reqParam.method,
        body: !reqParam?.isGetMethod && !!options?.data ? JSON.stringify(options.data) : undefined,
        headers: { ...(options.headers || {}), ...addHeaders, 'Content-Type': 'application/json' },
      })
      const resultJson = await result.json()
      const data = parseIntegrationRes({
        body: resultJson,
        statusCode: result.status,
        headers: result.headers as any,
        isBase64Encoded: false,
      })
      // console.error("options::",url,options,result,data,resultJson);

      // const headerrsp=await getAuthHeaderAsync();
      // console.error("headerrsp::",headerrsp);

      // 错误处理
      if (data?.code !== 'NORMAL') {
        if (data?.code === 'INVALID_TOKEN') {
          // 这种情况是token格式错误（比如无头cms需要group字段，用auth-sdk其实是可以登陆的，但我们这里要限制只能使用kit-cms对应group）
          await logout()
          await getInitialState()
        } else {
          apiErrorHandler(resultJson || result, url)
          // notification.error({
          //   message: '请求错误',
          //   description: `服务异常：${result.status}: ${url}`,
          // })
          return Promise.reject(resultJson?.message || result?.message);
        }
      }
      return data.result
    }
    // return request<T>(url, options)
  }

  return Promise.reject(undefined)
}

/**
 * 调用微信 Open API
 * @param action 行为
 * @param data POST body 数据
 */
export async function callWxOpenAPI(action: string, data?: Record<string, any>) {
  console.log(`callWxOpenAPI 参数`, data)

  if (isDevEnv()) {
    return request(`/api/${action}`, {
      data,
      prefix: 'http://127.0.0.1:5003',
      method: 'POST',
    })
  }

  const wxCloudApp = getWxCloudApp()

  // 添加 authHeader
  const authHeader = await getAuthHeaderAsync()

  const functionName = `${RESOURCE_PREFIX}-openapi`

  // 调用 open api
  const { result } = await wxCloudApp.callFunction({
    name: functionName,
    data: {
      body: data,
      headers: authHeader,
      httpMethod: 'POST',
      queryStringParameters: '',
      path: `/api/${action}`,
    },
  })
  return parseIntegrationRes(result)
}

/**
 * 解析函数集成响应
 */
function parseIntegrationRes(result: IntegrationRes) {
  // 转化响应值
  let body
  try {
    body =
      typeof result.body === 'string' && result.body?.length ? JSON.parse(result.body) : result.body
  } catch (error) {
    console.log(error)
    body = result.body
  }

  if (body?.error) {
    const errorText = codeMessage[result?.statusCode || 500]
    notification.error({
      message: errorText,
      description: `请求错误：【${body.error.code}】: ${body.error.message}`,
    })
    throw new Error('服务异常')
  }

  return body
}

const STORAGE_BASE_URL = `/v1/storages`

/**
 * 上传文件到文件存储、静态托管
 */
export async function uploadFile(options: {
  /**
   * 需要上传的文件
   */
  file: File

  /**
   * 指定上传文件的路径
   */
  filePath?: string

  /**
   * 文件名随机的长度
   */
  filenameLength?: number

  /**
   * 进度事件
   */
  onProgress?: (v: number) => void
  /**
   * 文件上传存储类型，静态网站托管或云存储
   * 默认为 storage
   */
  uploadType?: 'hosting' | 'storage'

  /**
   * 路径模版，根据模版规则做动态替换
   * 以 cloudbase-cms 为基础路径
   */
  filePathTemplate?: string
}): Promise<{
  fileId: string
  url: string
}> {
  const {
    file,
    onProgress,
    filePath,
    uploadType = 'storage',
    filenameLength = 32,
    filePathTemplate,
  } = options

  const app = await getCloudBaseApp()
  const day = getFullDate()

  // 文件名
  let ext
  if (file.name?.length && file.name.includes('.')) {
    ext = file.name.split('.').pop()
    ext = `.${ext}`
  } else {
    ext = ''
  }

  // 模版变量
  const templateData: any = {
    // 文件扩展
    ext,
    // 文件名
    filename: file.name,
    // 今日日期
    date: day,
    // 年份，如 2021
    year: getYear(),
    // 月份，如 03
    month: getMonth(),
    // 日，如 02
    day: getDay(),
  }

  // 添加 random1 到 random64
  for (let i = 1; i <= 64; i++) {
    templateData[`random${i}`] = random(i)
  }

  const prePath = 'cloudbase-kit-cms'
  let uploadFilePath: string

  // 路径模版优先级最高
  if (filePathTemplate) {
    uploadFilePath = `${prePath}/${templateCompile(filePathTemplate, templateData)}`
  } else {
    uploadFilePath = filePath || `${prePath}/upload/${day}/${random(filenameLength)}_${ext}`
  }

  // 上传文件到静态托管
  if (uploadType === 'hosting') {
    // 返回 URL 信息数组
    const ret = await uploadFilesToHosting(file, uploadFilePath)
    onProgress?.(100)
    return {
      fileId: ret[0].url,
      url: ret[0].url,
    }
  }

  // 上传文件到云存储Kit版
  if (IS_KIT_MODE) {
    // 获取上载目录
    const { envId, region, platform } = window.TcbCmsConfig || {}
    if (!IS_CUSTOM_ENV) {
      const credentials = await getCredentials()
      const preUploadRsp = await fetch(
        `https://${envId}.${region}.tcb-api.tencentcloudapi.com/web`,
        {
          method: 'POST',
          body: JSON.stringify({
            access_token: credentials?.access_token,
            action: 'storage.getUploadMetadata',
            dataVersion: '2020-01-10',
            env: envId,
            path: uploadFilePath,
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      )
      const preRspJson: {
        data: {
          authorization: string
          cosFileId: string
          download_url: string
          fileId: string
          token: string
          url: string
        }
      } = await preUploadRsp.json()

      // 执行上载操作
      const formData = new FormData()
      formData.append('key', uploadFilePath)
      formData.append('signature', preRspJson.data.authorization)
      formData.append('x-cos-meta-fileid', preRspJson.data.cosFileId)
      formData.append('x-cos-security-token', preRspJson.data.token)
      formData.append('success_action_status', '201')
      formData.append('file', file)
      const uploadRsp = await fetch(preRspJson.data.url, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      })
      // const uploadJson=await uploadRsp.json();

      // 刷新上载进度
      onProgress?.(100)
      return {
        fileId: preRspJson.data.fileId,
        url: preRspJson.data.download_url,
      }
    } else {
      const objectId = `kit-cms-upload/${moment().format('YYYY-MM-DD')}/${Math.floor(Math.random() * 1000) + 1000
        }${Date.now()}_${file.name}`;
      const attachedInfos: {
        authorization: string
        cloudObjectId: string
        downloadUrl: string
        objectId: string
        token: string
        uploadUrl: string
        cloudObjectMeta: string
      }[] = platform === CONFIG_PLATRORM_ENUM.WEDA_TOOL
          ? await getStorageUploadInfo(objectId)
          : await cloudbase.storage().request({
            method: 'POST',
            url: `${STORAGE_BASE_URL}/get-objects-upload-info`,
            body: [
              {
                objectId,
              },
            ] as any,
            query: {},
            // enableAbort: true,
            timeout: 3000,
          })

      /** 本地调试如果上传文件报跨域错误，可以在https://console.cloud.tencent.com/cos/bucket找到对应的cos桶，设置跨域策略（如：http://localhost:8000） */
      const attachedInfo = attachedInfos?.[0]
      await fetch(attachedInfo?.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          Authorization: attachedInfo?.authorization,
          'x-cos-meta-fileid': attachedInfo?.cloudObjectMeta,
          'x-cos-security-token': attachedInfo?.token,
        },
        // body:file,
        body: new Blob([file]),
      })

      // 刷新上载进度
      onProgress?.(100)
      return {
        fileId: attachedInfo.cloudObjectId,
        url: attachedInfo.downloadUrl,
      }
    }
  }

  // 上传文件到云存储
  const result = await app.uploadFile({
    filePath: file,
    cloudPath: uploadFilePath,
    onUploadProgress: (progressEvent: ProgressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      onProgress?.(percentCompleted)
    },
  })

  const meta = {
    fileId: result.fileID,
    url: result.download_url,
  }

  // 文件 id
  return meta
}

// 获取文件的临时访问链接
export async function getTempFileURL(fileID: string): Promise<string> {
  if (IS_KIT_MODE) {
    const kitRsp = await kitBatchGetTempFileURL([fileID])
    return kitRsp?.[0]?.tempFileURL || ''
  }
  const app = await getCloudBaseApp()
  const result = await app.getTempFileURL({
    fileList: [fileID],
  })

  if (result.fileList[0].code !== 'SUCCESS') {
    throw new Error(result.fileList[0].code)
  }

  return result.fileList[0].tempFileURL
}

/** kit版批量获取文件临时访问链接 */
export async function kitBatchGetTempFileURL(
  fileIds: string[]
): Promise<
  {
    fileID: string
    tempFileURL: string
  }[]
> {
  if (!fileIds?.length) return []
  const { envId, region, platform } = window.TcbCmsConfig || {}
  if (IS_KIT_MODE) {
    const param = fileIds.map((idItem) => ({ cloudObjectId: idItem, maxAge: 120 }))
    const dataList: {
      cloudObjectId: string
      downloadUrl: string
    }[] = platform === CONFIG_PLATRORM_ENUM.WEDA_TOOL
        ? await getStorageDownloadInfo(param)
        : await cloudbase.storage().request({
          method: 'POST',
          url: `${STORAGE_BASE_URL}/get-objects-download-info`,
          body: param as any,
          query: {},
          // enableAbort: true,
          timeout: 3000,
        })

    if (dataList?.length !== fileIds.length) {
      throw new Error(`图片地址获取错误`)
    }

    return dataList.map((item) => ({ fileID: item.cloudObjectId, tempFileURL: item.downloadUrl }))
  } else {
    const credentials = await getCredentials()
    const result: any = await fetch(`https://${envId}.${region}.tcb-api.tencentcloudapi.com/web`, {
      method: 'POST',
      body: JSON.stringify({
        access_token: credentials?.access_token,
        action: 'storage.batchGetDownloadUrl',
        dataVersion: '2020-01-10',
        env: envId,
        file_list: fileIds.map((idItem) => ({ fileid: idItem })),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const resultJson = await result.json()

    resultJson?.data?.download_list.forEach((ret: any) => {
      if (ret.code !== 'SUCCESS') {
        throw new Error(ret.code)
      }
    })

    return resultJson.data.download_list
  }
}

/**
 * 批量获取文件临时访问链接
 */
export async function batchGetTempFileURL(
  fileIds: string[]
): Promise<
  {
    fileID: string
    tempFileURL: string
  }[]
> {
  if (IS_KIT_MODE) {
    return kitBatchGetTempFileURL(fileIds)
  }
  if (!fileIds?.length) return []
  const app = await getCloudBaseApp()
  const result = await app.getTempFileURL({
    fileList: fileIds,
  })

  result.fileList.forEach((ret: any) => {
    if (ret.code !== 'SUCCESS') {
      throw new Error(ret.code)
    }
  })

  return result.fileList
}

// 下载文件
export async function downloadFile(fileID: string) {
  const tmpUrl = await getTempFileURL(fileID)
  const fileUrl =
    tmpUrl + `${tmpUrl.includes('?') ? '&' : '?'}response-content-disposition=attachment`
  const fileName = decodeURIComponent(new URL(fileUrl).pathname.split('/').pop() || '')

  downloadFileFromUrl(fileUrl, fileName)
}

/**
 * 判断一个 URL 是否为 FileId
 */
export const isFileId = (v: string) => /^cloud:\/\/\S+/.test(v)

export const getFileNameFromUrl = (url: string) => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname || ''
    return pathname.split('/').pop()
  } catch (error) {
    // 直接 split
    return url.split('/').pop() || ''
  }
}

export function fileIdToUrl(fileID: string) {
  if (!fileID) {
    return ''
  }

  // 非 fileId
  if (!/^cloud:\/\//.test(fileID)) {
    return fileID
  }

  // cloudId: cloud://cms-demo.636d-cms-demo-1252710547/cloudbase-cms/upload/2020-09-15/Psa3R3NA4rubCd_R-favicon-wx.svg
  let link = fileID.replace('cloud://', '')
  // 文件路径
  const index = link.indexOf('/')
  // envId.bucket
  const prefix = link.slice(0, index)
  // [envId, bucket]
  const splitPrefix = prefix.split('.')

  // path 路径
  const path = link.slice(index + 1)

  let envId
  let trimBucket
  if (splitPrefix.length === 1) {
    trimBucket = splitPrefix[0]
  } else if (splitPrefix.length === 2) {
    envId = splitPrefix[0]
    trimBucket = splitPrefix[1]
  }

  if (envId) {
    envId = envId.trim()
  }

  return `https://${trimBucket}.tcb.qcloud.la/${path}`
}

/**
 * 获取 HTTP 访问地址
 */
export const getHttpAccessPath = () => {
  return isDevEnv()
    ? defaultSettings.globalPrefix
    : SERVER_MODE
      ? `https://${window.TcbCmsConfig.containerAccessPath}${defaultSettings.globalPrefix}`
      : `https://${window.TcbCmsConfig.cloudAccessPath}${defaultSettings.globalPrefix}`
}
