export const IS_KIT_MODE = true

export const IS_CUSTOM_ENV = true // false

export const TEMP_SAVE_CONDITIONS=true //是否将页面搜索内容保存为临时（页面刷新后重置）数据

let devMode = false
window.getDevMode = () => devMode
window.setDevMode = (isDev: boolean) => {
  devMode = Boolean(isDev)
}
