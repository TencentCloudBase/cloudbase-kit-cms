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
