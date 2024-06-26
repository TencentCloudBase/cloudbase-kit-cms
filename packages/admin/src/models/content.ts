import { IActionCtx } from 'concent'
import { getContentSchemas } from '@/services/content'

interface ContentState {
  schemas: Schema[]
  loading: boolean
  contentAction: 'create' | 'edit'
  selectedContent: any
  searchFields: any[]
  searchParams: any
  currentSchema: any
  isMobile:boolean
}

const state: ContentState = {
  schemas: [],
  loading: false,
  // create 或 edit
  contentAction: 'create',
  selectedContent: {},
  // 保存搜索条件
  searchFields: [],
  searchParams: {},
  currentSchema: {},
  isMobile:false,
}

export default {
  state,
  reducer: {
    addSearchField(field: any, state: ContentState) {
      const { searchFields } = state
      return {
        searchFields: searchFields.concat(field),
      }
    },
    removeSearchField(field: any, state: ContentState) {
      const { searchFields } = state
      const index = searchFields.findIndex((_) => _._id === field._id)
      searchFields.splice(index, 1)
      return {
        searchFields,
      }
    },
    clearSearchField() {
      return {
        searchFields: [],
      }
    },
    setSearchFields(fields: any[], state: ContentState) {
      return {
        searchFields: fields,
      }
    },
    async getContentSchemas(
      projectName: string,
      state: any,
      ctx: IActionCtx
    ): Promise<{ schemas: Schema[]; loading: boolean }> {
      ctx.setState({
        loading: true,
      })

      try {
        const { data } = await getContentSchemas(projectName)

        return {
          schemas: data,
          loading: false,
        }
      } catch (error) {
        console.log(error)
        return {
          schemas: [],
          loading: false,
        }
      }
    },
  },
}
