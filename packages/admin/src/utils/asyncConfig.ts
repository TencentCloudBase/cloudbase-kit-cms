import { getPageQuery } from "./route";

/** 异步获取参数时，url携带的envId字段key */
const URL_ENV_ID_KEY = 'envId';
/** 本地储存的上一次使用的envId */
const LAST_ASYNC_CONFIG_ENV_ID = 'last-async-config-env-id';
/** 本地储存config时的前缀 */
const ASYNC_STORAGE_CONFIG_PREFIX = 'async-tcb-cms-config-prefix';
/** 异步初始化config标识 */
const ASYNC_CONFIG_KEY = '_async';


/** 获取默认配置（这里获取的可能是全量的配置或者非全量的配置，非全量的配置会在其他地方通过异步方式进行获取） */
export function initDefaultConfig() {
  if(window?.TcbCmsConfig){
    return;
  }
  const urlParams = getPageQuery();
  const envId = urlParams?.[URL_ENV_ID_KEY] || localStorage.getItem(LAST_ASYNC_CONFIG_ENV_ID);
  const localCfg = !!envId?localStorage.getItem(`${ASYNC_STORAGE_CONFIG_PREFIX}_${envId}`):undefined;
  let config = {envId} as ITcbCmsConfing;
  if (!!localCfg) {
    try {
      const parseCfg: ITcbCmsConfing = JSON.parse(localCfg);
      if (parseCfg?.envId) {
        config={...parseCfg};
      }

      // 优先取url上的配置参数
      Object.keys(urlParams).map(key=>{
        config[key] = urlParams[key];
      })
    } catch { }
  }

  // 异常情况
  if(!config?.envId){
    throw new Error('未找到有效参数，请从有效的入口打开');
  }
  localStorage.setItem(LAST_ASYNC_CONFIG_ENV_ID,config.envId);

  // 部分参数适配
  config.clientId = config?.clientId || config.envId
  config.region = config?.region || 'ap-shanghai'
  config.disableNotice = config?.disableNotice || false
  config.disableHelpButton = config?.disableHelpButton || false

  // 特殊标识和赋值
  config[ASYNC_CONFIG_KEY]=true;
  window.TcbCmsConfig = config;
  saveTcbConfig();
}

/** 是否为异步config */
export function isAsyncConfig(){
  return !!window?.TcbCmsConfig?.[ASYNC_CONFIG_KEY]
}

/** 保存config */
export function saveTcbConfig(cfg?:ITcbCmsConfing){
  const config = cfg || window?.TcbCmsConfig;
  config?.envId && localStorage.setItem(`${ASYNC_STORAGE_CONFIG_PREFIX}_${config.envId}`,JSON.stringify(config));
}