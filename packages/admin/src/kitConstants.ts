export const IS_KIT_MODE = true

export const IS_CUSTOM_ENV = true // false

let devMode = false
window.getDevMode = () => devMode
window.setDevMode = (isDev: boolean) => {
  devMode = Boolean(isDev)
}
