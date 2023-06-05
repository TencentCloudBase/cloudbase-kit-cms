import { tcbRequest } from '@/utils'

export interface Options {
  page?: number
  pageSize?: number

  filter?: {
    _id?: string
    ids?: string[]
    [key: string]: any
  }

  fuzzyFilter?: {
    [key: string]: any
  }

  sort?: {
    [key: string]: 'ascend' | 'descend' | null
  }

  payload: Record<string, any>
}

export const getWebhooks = async (projectName: string, options?: Partial<Options>) => {
  const { page = 1, pageSize = 10, sort } = options || {}
  const data: any = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
  if (Object.keys(sort || {}).length > 0) {
    data.sort = JSON.stringify(sort)
  }
  return tcbRequest(`/projects/${projectName}/webhooks`, {
    method: 'GET',
    data,
  })
  // return tcbRequest(`/projects/${projectName}/webhooks`, {
  //   method: 'POST',
  //   data: {
  //     options,
  //     action: 'getMany',
  //   },
  // })
}

export const getWebhookLog = async (projectName: string, options?: Partial<Options>) => {
  const { page = 1, pageSize = 10, sort } = options || {}
  const data: any = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
  if (Object.keys(sort || {}).length > 0) {
    data.sort = JSON.stringify(sort)
  }
  return tcbRequest(`/projects/${projectName}/webhookLog`, {
    method: 'GET',
    data,
  })
  // return tcbRequest(`/projects/${projectName}/webhooks/log`, {
  //   method: 'POST',
  //   data: {
  //     options,
  //     action: 'getMany',
  //   },
  // })
}

export const createWebhook = async (projectName: string, options?: Partial<Options>) => {
  return tcbRequest(`/projects/${projectName}/webhooks`, {
    method: 'POST',
    data: options?.payload,
  })
  // return tcbRequest(`/projects/${projectName}/webhooks`, {
  //   method: 'POST',
  //   data: {
  //     options,
  //     action: 'createOne',
  //   },
  // })
}

export const updateWebhook = async (projectName: string, options?: Partial<Options>) => {
  return tcbRequest(`/projects/${projectName}/webhooks/${options?.filter?._id}`, {
    method: 'PATCH',
    data: options?.payload,
  })
  // return tcbRequest(`/projects/${projectName}/webhooks`, {
  //   method: 'POST',
  //   data: {
  //     options,
  //     action: 'updateOne',
  //   },
  // })
}

export const deleteWebhook = async (projectName: string, options?: Partial<Options>) => {
  return tcbRequest(`/projects/${projectName}/webhooks/${options?.filter?._id}`, {
    method: 'DELETE',
    data: options?.payload,
  })
  // return tcbRequest(`/projects/${projectName}/webhooks`, {
  //   method: 'POST',
  //   data: {
  //     options,
  //     action: 'deleteOne',
  //   },
  // })
}
