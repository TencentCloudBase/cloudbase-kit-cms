import { IS_KIT_MODE } from '@/kitConstants'
import { tcbRequest } from '@/utils'

export async function getSchemas(projectId?: string): Promise<{ data: Schema[] }> {
  if (IS_KIT_MODE) {
    return tcbRequest(`/projects/${projectId}/collections`, {
      method: 'GET',
    })
  }
  return tcbRequest(`/projects/${projectId}/schemas`, {
    method: 'GET',
  })
}

export async function updateSchemaAndCollection(
  projectId: string,
  collectionId: string,
  options?: Partial<Schema>
) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}`, {
    method: 'PATCH',
    data: options,
  })
}

export async function deleteSchemaAndCollection(projectId: string, collectionId: string) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}`, {
    method: 'DELETE',
  })
}

/** 根据collectionId获取对应的schema信息 */
export async function getSchemaFileds(
  projectId: string,
  collectionId: string
): Promise<{ data: SchemaField[] }> {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas`, {
    method: 'GET',
  })
}

export async function getSchemaFiled(
  projectId: string,
  collectionId: string,
  schemaId: string
): Promise<{ data: Schema }> {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas/${schemaId}`, {
    method: 'GET',
  })
}

export async function createSchema(projectId: string, schema: Partial<Schema>) {
  return tcbRequest(`/projects/${projectId}/collections`, {
    method: 'POST',
    data: schema,
  })
}

export async function createSchemaFiled(
  projectId: string,
  collectionId: string,
  field: SchemaField
) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas`, {
    method: 'POST',
    data: field,
  })
}

export async function updateSchemaFiled(
  projectId: string,
  collectionId: string,
  schema: Partial<Schema>
) {
  if (schema?.searchFields) {
    throw new Error('当前版本不支持记录搜索条件')
  }
  if (!schema?.fields?.length) {
    throw new Error('当前版本不支持该功能')
  }
  return Promise.all(
    schema.fields.map((item) =>
      tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas/${item.id}`, {
        method: 'PATCH',
        data: { ...item, id: undefined },
      })
    )
  )

  // return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas`, {
  //   method: 'PATCH',
  //   data: schema,
  // })
}

export async function deleteSchema(
  projectId: string,
  collectionId: string,
  deleteCollection: boolean
) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas`, {
    method: 'DELETE',
    data: {
      deleteCollection,
    },
  })
}

export async function deleteSchemaFiled(projectId: string, collectionId: string, schemaId: string) {
  return tcbRequest(`/projects/${projectId}/collections/${collectionId}/schemas/${schemaId}`, {
    method: 'DELETE',
  })
}
