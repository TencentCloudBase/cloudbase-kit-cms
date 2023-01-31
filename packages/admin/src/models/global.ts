import { IS_KIT_MODE } from '@/kitConstants'
import { getSetting, updateSetting } from '@/services/global'
import { getLoginState } from '@/utils'

interface GlobalState {
  /**
   * 当前项目信息
   */
  currentProject?: Project

  /**
   * 设置
   */
  setting: GlobalSetting
}

const state: GlobalState = {
  currentProject: undefined,

  setting: {},
}

export default {
  state,
  reducer: {
    // 重新获取设置信息
    async getSetting() {
      if (IS_KIT_MODE) {
        return null
      }
      const { data } = await getSetting()
      return {
        setting: data,
      }
    },
    // 更新设置信息
    async updateSetting(setting: GlobalSetting & { keepApiPath?: boolean }, state: GlobalState) {
      if (IS_KIT_MODE) {
        return null
      }
      await updateSetting(setting)

      return {
        setting: {
          ...state.setting,
          ...setting,
        },
      }
    },
    // 创建 API Token
    // async createApiAuthToken(_: undefined, state: GlobalState) {
    //   console.log(state)
    //   const res = await createApiAuthToken()
    //   console.log(res)

    //   return {
    //     setting: {
    //       ...state.setting,
    //     },
    //   }
    // },
  },
  init: async () => {
    if (IS_KIT_MODE) {
      return {}
    }
    try {
      // 校验是否登录
      // const app = await getCloudBaseApp()
      // const loginState = await app.auth({ persistence: 'local' }).getLoginState()
      const loginState = await getLoginState()
      if (!loginState) return {}

      // 获取全局设置
      const { data = {} } = await getSetting()

      return {
        setting: data,
      }
    } catch (error) {
      console.log(error)
      return {}
    }
  },
}
