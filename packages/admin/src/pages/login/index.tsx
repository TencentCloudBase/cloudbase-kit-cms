import { useModel, history } from 'umi'
import React, { useState, useEffect } from 'react'
import { LockTwoTone, UserOutlined } from '@ant-design/icons'
import { Alert, message, Button, Spin, Card, Typography, Form, Input } from 'antd'
import { getCmsConfig, getPageQuery, loginWithPassword } from '@/utils'
import Footer from '@/components/Footer'
import { LoginParamsType } from '@/services/login'
import styles from './index.less'
import { defaultOpenURIWithCallback, getCaptchaToken, saveCaptchaToken } from './captcha'
import { CONFIG_PLATRORM_ENUM } from '@/constants'
import { isWedaTool } from '@/common/adapters/weda-tool'

const { Title } = Typography
const FormItem = Form.Item

const LoginMessage: React.FC<{
  content: string
}> = ({ content }) => (
  <Alert
    style={{
      marginBottom: 24,
    }}
    message={content}
    type="error"
    showIcon
  />
)

/**
 * 此方法会跳转到 redirect 参数所在的位置
 */
const replaceGoto = () => {
  const urlParams = new URL(window.location.href)
  const params = getPageQuery()
  let { redirect } = params as { redirect: string }

  const historyType = window.TcbCmsConfig.history

  if (redirect) {
    const redirectUrlParams = new URL(redirect)
    if (redirectUrlParams.origin === urlParams.origin) {
      redirect = redirect.substr(urlParams.origin.length)
      if (redirect.match(/^\/.*#/)) {
        redirect = redirect.substr(redirect.indexOf('#') + 1)
      }
    } else {
      window.location.href = historyType === 'hash' ? location.pathname : '/'
      return
    }
  }

  if (historyType === 'hash') {
    window.location.href = location.pathname
  } else {
    window.location.href = urlParams.href.split(urlParams.pathname)[0] + (redirect || '/home')
  }
}

const Login: React.FC<{}> = () => {
  const [submitting, setSubmitting] = useState(false)
  const { refresh, initialState } = useModel('@@initialState')
  const [loginErrorMessage, setLoginErrorMessage] = useState<string>('')

  console.log(initialState)

  // 已登录
  if (initialState?.currentUser?._id && initialState?.currentUser?.username) {
    history.push('/home')
    return <Spin />
  }

  if (isWedaTool()) {
    location.href = `${location.origin}/__auth/?env_id=${window?.TcbCmsConfig?.envId}&client_id=${
      window?.TcbCmsConfig?.clientId
    }&app_id=${window?.TcbCmsConfig?.wedaToolCfg?.appId}&redirect_uri=${encodeURIComponent(
      `${location.origin}${window?.TcbCmsConfig?.wedaToolCfg?.homePath}`
    )}&config_version=${window?.TcbCmsConfig?.wedaToolCfg?.configVersion}`
    return null
  }

  const handleSubmit = async (values: LoginParamsType, autoLogin?: boolean) => {
    setSubmitting(true)
    setLoginErrorMessage('')

    const { username, password } = values

    let loginSuccess = false
    try {
      // 用户名密码登录
      const logRsp: any = await loginWithPassword(username.trim(), password.trim(), values?.captcha)
      if (logRsp?.error) {
        throw new Error(JSON.stringify(logRsp))
      }
      message.success('登录成功')
      loginSuccess = true
      replaceGoto()
      setTimeout(() => {
        refresh()
      }, 1000)
    } catch (err) {
      // 登录异常
      console.log(err)

      try {
        const errObj = JSON.parse((err as Error)?.message)
        if (errObj?.error === 'not_found') {
          setLoginErrorMessage('用户不存在')
        } else if (errObj?.error === 'invalid_password') {
          setLoginErrorMessage('密码错误')
        } else if (errObj?.error === 'captcha_required' || errObj?.error === 'captcha_invalid') {
          if (!autoLogin) {
            const captcha_token = await getCaptchaToken(
              errObj?.error === 'captcha_invalid',
              JSON.stringify(values),
              location.href.split('?')[0],
              defaultOpenURIWithCallback
            ) // 链接中没有拼token的，就去获取一下
            if (captcha_token) {
              handleSubmit({ ...values, captcha: captcha_token }, true)
              return new Promise((resolve, reject) => {})
            }
          }
        } else {
          setLoginErrorMessage(
            /* errObj.error_description || errObj?.code ||  */ '登录失败，请重试！'
          )
        }
      } catch (_e) {
        setLoginErrorMessage(_e && typeof _e === 'string' ? _e : '登录失败，请重试！')
      }
    }

    setSubmitting(false)
    return Promise.resolve(loginSuccess)
  }

  // 验证码登陆，该方式支持getCaptchaToken接口openFunc参数为空的情况，验证后带参数跳回当前界面，然后自动发起登陆
  useEffect(() => {
    if (window.self !== window.top) {
      return
    }
    const query = getPageQuery()
    let queryState = null
    try {
      queryState = JSON.parse(query?.state as any)
    } catch (e) {}
    if (query?.captcha_token && queryState?.username && queryState?.password) {
      saveCaptchaToken({
        captcha_token: query.captcha_token,
        expires_in: Number(query?.expires_in || '0'),
      })
      handleSubmit({ ...queryState, captcha: query.captcha_token }, true)
    }
  }, [])

  const isTopWindow = window.self === window.top
  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {isTopWindow && (
        <div className={styles.container}>
          <div className={styles.content}>
            <Card className="rounded-lg">
              <div className="mt-10 mb-10">
                <div className={styles.top}>
                  <div className={styles.header}>
                    <a href="https://cloudbase.net" target="_blank">
                      <img alt="logo" className={styles.logo} src={getCmsConfig('cmsLogo')} />
                      <span className={styles.title}>{getCmsConfig('cmsTitle')}</span>
                    </a>
                  </div>
                  <div className={styles.desc}>打造云端一体化数据运营平台</div>
                </div>

                <div className={styles.main}>
                  <Form
                    onFinish={(values) => {
                      handleSubmit(values)
                    }}
                  >
                    <Title level={4} className="text-center mt-10 mb-6">
                      账户密码登录
                    </Title>
                    {loginErrorMessage && !submitting && (
                      <LoginMessage content={loginErrorMessage} />
                    )}
                    <FormItem
                      name="username"
                      rules={[
                        {
                          required: true,
                          message: '请输入用户名!',
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        placeholder="用户名"
                        prefix={
                          <UserOutlined twoToneColor="#0052d9" className={styles.prefixIcon} />
                        }
                      />
                    </FormItem>
                    <FormItem
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: '请输入密码！',
                        },
                      ]}
                    >
                      <Input.Password
                        size="large"
                        placeholder="密码"
                        prefix={<LockTwoTone twoToneColor="#0052d9" />}
                      />
                    </FormItem>
                    <Button
                      size="large"
                      className={styles.submit}
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                    >
                      登录
                    </Button>
                  </Form>
                </div>
              </div>
            </Card>
          </div>
          <Footer />
        </div>
      )}
    </>
  )
}

export default Login
