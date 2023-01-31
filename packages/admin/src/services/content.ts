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
  projectId: string,
  schemaId: string
): Promise<{ data: Schema }> {
  return tcbRequest(`/projects/${projectId}/contents/${schemaId}`, {
    method: 'GET',
  })
}

export async function getContentSchemas(projectId: string) {
  return tcbRequest(`/projects/${projectId}/collections`, {
    method: 'GET',
  })
}

export async function getAllContents(projectId: string, collectionId: string, options?: Options) {
  if (!options) {
    // eslint-disable-next-line no-param-reassign
    options = {}
  }
  options.pageSize = 100 // 后端单次最大刷新数量为100
  const firstRsp = await getContents(projectId, collectionId, { ...options, page: 1 })
  if (firstRsp?.total > firstRsp?.data?.length) {
    const loopNum = Math.ceil(firstRsp.total / options.pageSize)
    const pageList: number[] = []

    // 第一页已经拉取过了，这里i取1，把第一项过滤掉
    for (let i = 1; i < loopNum; ++i) {
      pageList.push(i + 1)
    }

    const rspList = await Promise.all(
      pageList.map((page) => getContents(projectId, collectionId, { ...options, page }))
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

export async function getContents(
  projectId: string,
  collectionId: string,
  options?: Options
): Promise<{ total: number; data: any[] }> {
  // 将老接口的参数进行缩减
  const { page = 1, pageSize = 10 } = options || {}
  const res = await tcbRequest(`/projects/${projectId}/collections/${collectionId}/contents`, {
    method: 'GET',
    data: {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
    // data: {
    //   options,
    //   resource: collectionId,
    //   action: 'getMany',
    // },
  })
  const datas = formatServiceContent(res?.data)
  // return contents;

  // const newRes={...res,data:datas};
  // console.error("getContents::",res,newRes)
  return { ...res, data: datas }
}

export function formatServiceContent(items: any[]) {
  if (!items?.length) {
    return items
  }
  return items.map((item: { content?: any }) =>
    item?.content
      ? {
          _id: item?.['id'],
          _createTime: item?.['createTime'],
          _updateTime: item?.['updateTime'],
          ...item.content,
        }
      : item
  )
}

export async function createContent(
  projectId: string,
  collectionId: string,
  payload: Record<string, any>
) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/contents`, {
    method: 'POST',
    data: payload,
    // data: {
    //   resource: collectionId,
    //   action: 'createOne',
    //   options: {
    //     payload,
    //   },
    // },
  })
}

export async function deleteContent(projectId: string, collectionId: string, id: string) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/contents/${id}`, {
    method: 'DELETE',
    // data: {
    //   resource: collectionId,
    //   options: {
    //     filter: {
    //       _id: id,
    //     },
    //   },
    //   action: 'deleteOne',
    // },
  })
}

export async function batchDeleteContent(projectId: string, collectionId: string, ids: string[]) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/contents`, {
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
  projectId: string,
  collectionId: string,
  id: string,
  payload: Record<string, any>
) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/contents/${id}`, {
    method: 'PATCH',
    data: payload,
    // data: {
    //   resource: collectionId,
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

export async function getMigrateJobs(projectId: string, page = 1, pageSize = 10) {
  return tcbRequest(`/projects/${projectId}/migrate`, {
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
  projectId: string,
  data: {
    fileID: string
    filePath: string
    fileType: string
    collectionName: string
    conflictMode: string
  }
) {
  return tcbRequest(`/projects/${projectId}/migrate`, {
    data,
    method: 'POST',
  })
}

/**
 * 创建导出任务
 */
export async function createExportMigrateJob(
  projectId: string,
  data: {
    fileType: string
    collectionName: string
  }
) {
  return tcbRequest(`/projects/${projectId}/migrate/export`, {
    data,
    method: 'POST',
  })
}

/**
 * 请求解析 JSON Lines 文件
 */
export async function parseJsonLinesFile(projectId: string, fileUrl: string) {
  return tcbRequest(`/projects/${projectId}/migrate/parseJsonLinesFile`, {
    method: 'POST',
    data: {
      fileUrl,
    },
  })
}
