import { MigrateJobDto } from '@/pages/project/migrate'
import { tcbRequest } from '@/utils'

export interface Options {
  page?: number
  pageSize?: number

  filter?: {
    id?: string
    ids?: string[]
    [key: string]: any
  }

  fuzzyFilter?: {
    [key: string]: any
  }

  sort?: {
    [key: string]: 'ascend' | 'descend' | null
  }

  payload?: Record<string, any>
}

export async function getContentSchema(
  projectName: string,
  schemaId: string
): Promise<{ data: Schema }> {
  return tcbRequest(`/projects/${projectName}/contents/${schemaId}`, {
    method: 'GET',
  })
}

export async function getContentSchemas(projectName: string) {
  return tcbRequest(`/projects/${projectName}/collections`, {
    method: 'GET',
  })
}

export async function getAllContents(
  projectName: string,
  collectionName: string,
  options?: Options
) {
  if (!options) {
    // eslint-disable-next-line no-param-reassign
    options = {}
  }
  options.pageSize = 100 // 后端单次最大刷新数量为100
  const firstRsp = await getContents(projectName, collectionName, { ...options, page: 1 })
  if (firstRsp?.total > firstRsp?.data?.length) {
    const loopNum = Math.ceil(firstRsp.total / options.pageSize)
    const pageList: number[] = []

    // 第一页已经拉取过了，这里i取1，把第一项过滤掉
    for (let i = 1; i < loopNum; ++i) {
      pageList.push(i + 1)
    }

    const rspList = await Promise.all(
      pageList.map((page) => getContents(projectName, collectionName, { ...options, page }))
    )
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < rspList.length; ++i) {
      const tempRsp = rspList[i]
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let j = 0; j < tempRsp.data.length; ++j) {
        firstRsp.data.push(tempRsp.data[j])
      }
    }
  }
  return firstRsp
}

function contentQueryFormat(
  options?: Options
): { limit: number; offset: number; sort?: string; search?: string } {
  const { page = 1, pageSize = 10, sort, fuzzyFilter, filter } = options || {}
  const data: any = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
  if (Object.keys(sort || {}).length > 0) {
    data.sort = JSON.stringify(sort)
  }
  const searchParams = { ...(fuzzyFilter || {}), ...(filter || {}) } // fuzzyFilter：通过“添加索引”生成的条件，filter：表格内筛选按钮生成的筛选条件
  if (searchParams && Object.keys(searchParams).length > 0) {
    data.search = JSON.stringify(searchParams)
  }
  return data
}

export async function getContents(
  projectName: string,
  collectionName: string,
  options?: Options
): Promise<{ total: number; data: any[] }> {
  // 将老接口的参数进行缩减
  const data = contentQueryFormat(options)
  const res = await tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents`, {
    method: 'GET',
    data,
    // data: {
    //   options,
    //   resource: collectionName,
    //   action: 'getMany',
    // },
  })
  return res
}

export async function createContent(
  projectName: string,
  collectionName: string,
  payload: Record<string, any>
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents`, {
    method: 'POST',
    data: payload,
    // data: {
    //   resource: collectionName,
    //   action: 'createOne',
    //   options: {
    //     payload,
    //   },
    // },
  })
}

export async function deleteContent(projectName: string, collectionName: string, id: string) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents/${id}`, {
    method: 'DELETE',
    // data: {
    //   resource: collectionName,
    //   options: {
    //     filter: {
    //       _id: id,
    //     },
    //   },
    //   action: 'deleteOne',
    // },
  })
}

export async function batchDeleteContent(
  projectName: string,
  collectionName: string,
  ids: string[]
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents`, {
    method: 'DELETE',
    data: ids,
    // data: {
    //   resource,
    //   options: {
    //     filter: {
    //       ids,
    //     },
    //   },
    //   action: 'deleteMany',
    // },
  })
}

/**
 * 更新内容
 */
export async function updateContent(
  projectName: string,
  collectionName: string,
  id: string,
  payload: Record<string, any>
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents/${id}`, {
    method: 'PATCH',
    data: payload,
    // data: {
    //   resource: collectionName,
    //   options: {
    //     payload,
    //     filter: {
    //       _id: id,
    //     },
    //   },
    //   action: 'updateOne',
    // },
  })
}

/** 获取迁移记录列表数据 */
export async function getMigrateJobs(
  projectName: string,
  page = 1,
  pageSize = 10
): Promise<{ total: number; data: MigrateJobDto[] }> {
  return tcbRequest(`/projects/${projectName}/migrate`, {
    method: 'GET',
    params: {
      page,
      pageSize,
    },
  })
}

/**
 * 创建导入任务
 */
export async function createImportMigrateJob(
  projectName: string,
  data: {
    fileID: string
    filePath: string
    fileType: string
    collectionName: string
    conflictMode: string
  }
) {
  return tcbRequest(`/projects/${projectName}/migrate`, {
    data,
    method: 'POST',
  })
}

/**
 * 创建导出任务
 */
export async function createExportMigrateJob(
  projectName: string,
  data: {
    fileType: string
    collectionName: string
  }
) {
  return tcbRequest(`/projects/${projectName}/migrate/export`, {
    data,
    method: 'POST',
  })
}

/** 数据批量导出 */
export async function contentBatchExport(
  projectName: string,
  collectionName: string,
  options?: Omit<Options, 'page' | 'pageSize'>
) {
  const data = contentQueryFormat(options)
  // @ts-ignore
  delete data.limit
  // @ts-ignore
  delete data.offset
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents/export`, {
    method: 'GET',
    data,
  })
}

/** 数据批量导入 */
export async function contentBatchImport(
  projectName: string,
  collectionName: string,
  data: {
    importData: any
    conflictMode: string
  }
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/contents/import`, {
    method: 'POST',
    data,
    timeout: 30000, // 批量导入数据较大时后端可能校验时间较久，这里调整下timeout时间为30秒
  })
}

/**
 * 请求解析 JSON Lines 文件
 */
export async function parseJsonLinesFile(projectName: string, fileUrl: string) {
  return tcbRequest(`/projects/${projectName}/migrate/parseJsonLinesFile`, {
    method: 'POST',
    data: {
      fileUrl,
    },
  })
}
