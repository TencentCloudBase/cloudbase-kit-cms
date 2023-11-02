import { tcbRequest } from '@/utils'

export async function getProject(projectName: string): Promise<{ data: Project }> {
  const res = await tcbRequest(`/projects/${projectName}`, {
    method: 'GET',
  })
  return { data: res }
}

export const GET_PROJECTS_PATH = '/projects'

export async function getProjects() {
  return tcbRequest<{
    data: Project[]
  }>(GET_PROJECTS_PATH, {
    method: 'GET',
  })
}

export async function createProject(payload: {
  projectName: string
  displayName: string
  description: string
}) {
  return tcbRequest<{
    data: Project[]
  }>('/projects', {
    method: 'POST',
    data: payload,
  })
}

export async function updateProject(
  projectName: string,
  payload: Partial<Project> & { keepApiPath?: boolean }
) {
  return tcbRequest<{
    data: Project[]
  }>(`/projects/${projectName}`, {
    method: 'PATCH',
    data: payload,
  })
}

export async function deleteProject(projectName: string) {
  return tcbRequest<{
    data: Project[]
  }>(`/projects/${projectName}`, {
    method: 'DELETE',
  })
}

/**
 * （weida控制台）获取图片上载信息
 */
export async function getStorageUploadInfo(objectId: string) {
  return tcbRequest('/projects/requestStorage', {
    method: 'POST',
    data: {
      path:'/v1/storages/get-objects-upload-info',
      data:[{
        objectId,
      }],
    },
  })
}

/**
 * （weida控制台）获取图片临时下载信息
 */
export async function getStorageDownloadInfo(param: { cloudObjectId: string, maxAge?: number }[]): Promise<{
  cloudObjectId: string
  downloadUrl: string
}[]> {
  return tcbRequest('/projects/requestStorage', {
    method: 'POST',
    data: {
      path:'/v1/storages/get-objects-download-info',
      data:param.map(item => ({ ...item, maxAge: item?.maxAge || 120 }))
    },
  })
}
