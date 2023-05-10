import { isDevEnv } from '../../utils'

/** 验证token本地储存结构 */
export interface CaptchaToken {
  captcha_token: string
  expires_in?: number
  expires_at?: Date | null
}

/** 远端获取的token结构 */
export interface GetCaptchaResponse {
  captcha_token?: string
  expires_in?: number
  url?: string
}

/** 验证token本地缓存key */
const STORAGE_TOKEN_KEY = 'kit_cms_captcha_token'

/** 远端获取验证token地址 */
const GET_CAPTCHA_URL = `https://${window.TcbCmsConfig.envId}.${window.TcbCmsConfig.region}.auth.tcloudbasegateway.com/auth/v1/captcha/init?client_id=${window.TcbCmsConfig.clientId}`

/** 储存验证token到本地 */
export function saveCaptchaToken(token: CaptchaToken) {
  if (!token?.expires_in) {
    return
  }
  token.expires_at = new Date(Date.now() + (token.expires_in - 10) * 1000)
  const tokenStr: string = JSON.stringify(token)
  localStorage.setItem(STORAGE_TOKEN_KEY, tokenStr)
}

/** 从本地读取验证token */
function findCaptchaToken(): string {
  const tokenStr = localStorage.getItem(STORAGE_TOKEN_KEY)
  if (tokenStr) {
    try {
      const captchaToken = JSON.parse(tokenStr)
      if (!!captchaToken && !!captchaToken?.expires_at) {
        captchaToken.expires_at = new Date(captchaToken.expires_at)
      }
      const isExpired = captchaToken.expires_at < new Date()
      if (isExpired) {
        localStorage.removeItem(STORAGE_TOKEN_KEY)
        return ''
      }
      return captchaToken.captcha_token
    } catch (error) {
      localStorage.removeItem(STORAGE_TOKEN_KEY)
      return ''
    }
  }
  localStorage.removeItem(STORAGE_TOKEN_KEY)
  return ''
}

/** 返回附带验证token的请求链接 */
export function appendCaptchaTokenToURL(url: string, captchaToken: string) {
  if (!captchaToken) {
    return url
  }
  let returnUrl = url
  if (url.indexOf('?') > 0) {
    returnUrl += '&captcha_token=' + captchaToken
  } else {
    returnUrl += '?captcha_token=' + captchaToken
  }
  return returnUrl
}

/** 获取验证token（本地或远程获取） */
export async function getCaptchaToken(
  forceNewToken: boolean,
  state: string,
  redirectUrl?: string,
  openFunc?: OpenURIWithCallback
): Promise<string> {
  if (!forceNewToken) {
    // if local has captcha token then return
    const captchaToken = findCaptchaToken()
    if (captchaToken) {
      return captchaToken
    }
  }
  const redirectURL = redirectUrl || location.origin + location.pathname
  const oriRsp = await fetch(GET_CAPTCHA_URL, {
    method: 'POST',
    body: JSON.stringify({
      redirect_uri: redirectURL,
      state: state,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  const captchaTokenResp: GetCaptchaResponse = await oriRsp.json()

  // 这里多一步，当captchaTokenResp?.url不空时，当下url竟然是http链接，这里我们改下………………（实测两种协议都可）晕
  if (captchaTokenResp?.url) {
    const regExp = /^http:\/\//
    if (regExp.test(captchaTokenResp.url) !== regExp.test(location.origin)) {
      const splitSign = '://'
      const urlSplit = captchaTokenResp.url.split(splitSign)
      urlSplit[0] = location.origin.split(splitSign)[0]
      captchaTokenResp.url = urlSplit.join(splitSign)
    }
  }

  // 直接跳转的话就跳转至验证页面
  if (captchaTokenResp?.url && !openFunc) {
    location.href = captchaTokenResp.url
    return new Promise(() => {}) // 返回一个不触发回调的promise，让外部逻辑终止执行，直接跳转
  }

  // 直接获取到了验证码
  if (captchaTokenResp?.captcha_token) {
    const captchaToken = {
      captcha_token: captchaTokenResp.captcha_token,
      expires_in: captchaTokenResp.expires_in,
    }
    saveCaptchaToken(captchaToken)
    return captchaTokenResp.captcha_token
  }

  // 通过默认弹窗拉起验证码
  if (openFunc && captchaTokenResp?.url) {
    const callbackData = await openFunc(captchaTokenResp.url, { width: '355px', height: '355px' })
    const captchaToken: CaptchaToken = {
      captcha_token: callbackData.captcha_token,
      expires_in: Number(callbackData.expires_in),
    }
    await saveCaptchaToken(captchaToken)
    return captchaToken.captcha_token
  }

  return Promise.reject(null)
}

export interface OpenURIOptions {
  width: string
  height: string
}

export type OpenURIWithCallback = (
  url: string,
  opts?: OpenURIOptions
) => Promise<{ [key: string]: string }>

class Callback {
  public callFunc: ((data?: { [key: string]: string }) => void) | undefined
}
/**
 * default use iframe to open url can return callback
 * for example : open https://example.com/callback?rediret_uri=http://127.0.0.1:8080/
 *     the it is done, it will callback http://127.0.0.1:8080/?data1=x&data2=3
 *
 * for example : open https://example.com/callback?rediret_uri=http://127.0.0.1:8080/?__iframe==on
 *      window.addEventListener('message', function(e) {
        console.log(e)
        alert('data from domain2 ---> ' + e.data);
    }, false);
 *
 */
export const defaultOpenURIWithCallback: OpenURIWithCallback = (
  url: string,
  opts?: OpenURIOptions
): Promise<{ [key: string]: string }> => {
  let iframeTag = '__iframe'
  if (window.location.search.indexOf(iframeTag) > 0) {
    document.body.style.display = 'none'
  }
  if (!opts) {
    // eslint-disable-next-line no-param-reassign
    opts = {
      width: '355px',
      height: '355px',
    }
  }
  if (document.getElementById('_iframe_panel_wrap') === null) {
    const elementDiv = document.createElement('div')
    elementDiv.style.cssText =
      'background-color: rgba(0, 0, 0, 0.7);position: fixed;left: 0px;right: 0px;top: 0px;bottom: 0px;padding: 9vw 0 0 0;display: none;z-index:100;'
    elementDiv.setAttribute('id', '_iframe_panel_wrap')
    document.body.appendChild(elementDiv)
  }
  const target = document.getElementById('_iframe_panel_wrap') as HTMLElement
  const iframe = document.createElement('iframe')
  target.innerHTML = ''
  const openURL = new URL(url)
  const redirectUri = openURL.searchParams.get('redirect_uri')
  if (redirectUri) {
    const redirectUrl = new URL(redirectUri)
    redirectUrl.searchParams.append(iframeTag, 'on')
    openURL.searchParams.set('redirect_uri', redirectUrl.href)
    // eslint-disable-next-line no-param-reassign
    url = openURL.href
  }
  iframe.setAttribute('src', url)
  iframe.setAttribute('id', '_iframe_panel_wrap_iframe')
  iframe.style.cssText = `min-width:${opts.width};display:block;height:${opts.height};margin:0 auto;background-color: rgb(255, 255, 255);border: none;`
  target.appendChild(iframe)
  target.style.display = 'block'

  let callBack = new Callback()
  // handle callback from iframe post message
  window.addEventListener(
    'message',
    (e) => {
      if (e.origin === openURL.origin && callBack.callFunc) {
        target.style.display = 'none'
        const data = JSON.parse(e.data)
        try {
          callBack.callFunc(data)
        } catch (e) {}
      }
    },
    false
  )
  return new Promise<{ [key: string]: string }>((resolve, reject) => {
    callBack.callFunc = (data: any) => {
      if (data.error) {
        return reject(data)
      }
      return resolve(data)
    }
    // handle callback from iframe redirect uri
    iframe.onload = () => {
      try {
        const windowLocation = window.location
        const iframeLocation = iframe?.contentWindow?.location as Location
        if (
          iframeLocation.host + iframeLocation.pathname ===
          windowLocation.host + windowLocation.pathname
        ) {
          target.style.display = 'none'
          const iframeUrlParams = new URLSearchParams(iframeLocation.search)
          const data: { [key: string]: string } = {}
          iframeUrlParams.forEach((v, k) => {
            data[k] = v
          })
          if (data.error) {
            return reject({
              error: iframeUrlParams.get('error'),
              error_description: iframeUrlParams.get('error_description'),
            })
          }
          return resolve(data)
        } else {
          target.style.display = 'block'
        }
      } catch (error) {
        target.style.display = 'block'
      }
    }
  })
}
