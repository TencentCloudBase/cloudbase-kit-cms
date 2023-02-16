import { IS_KIT_MODE } from '@/kitConstants'
import { tcbRequest } from '@/utils'

export async function getSchemas(projectName?: string): Promise<{ data: Schema[] }> {
  if (IS_KIT_MODE) {
    return tcbRequest(`/projects/${projectName}/collections`, {
      method: 'GET',
    })
  }
  return tcbRequest(`/projects/${projectName}/schemas`, {
    method: 'GET',
  })
}

export async function updateSchemaAndCollection(
  projectName: string,
  collectionName: string,
  options?: Partial<Schema>
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}`, {
    method: 'PATCH',
    data: options,
  })
}

export async function deleteSchemaAndCollection(projectName: string, collectionName: string) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}`, {
    method: 'DELETE',
  })
}

/** 根据collectionName获取对应的schema信息 */
export async function getSchemaFileds(
  projectName: string,
  collectionName: string
): Promise<{ data: SchemaField[] }> {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas`, {
    method: 'GET',
  })
}

export async function getSchemaFiled(
  projectName: string,
  collectionName: string,
  schemaId: string
): Promise<{ data: Schema }> {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas/${schemaId}`, {
    method: 'GET',
  })
}

export async function createSchema(projectName: string, schema: Partial<Schema>) {
  return tcbRequest(`/projects/${projectName}/collections`, {
    method: 'POST',
    data: schema,
  })
}

export async function createSchemaFiled(
  projectName: string,
  collectionName: string,
  field: SchemaField
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas`, {
    method: 'POST',
    data: field,
  })
}

export async function updateSchemaFiled(
  projectName: string,
  collectionName: string,
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
      tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas/${item.id}`, {
        method: 'PATCH',
        data: { ...item, id: undefined },
      })
    )
  )

  // return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas`, {
  //   method: 'PATCH',
  //   data: schema,
  // })
}

export async function deleteSchema(
  projectName: string,
  collectionName: string,
  deleteCollection: boolean
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas`, {
    method: 'DELETE',
    data: {
      deleteCollection,
    },
  })
}

export async function deleteSchemaFiled(
  projectName: string,
  collectionName: string,
  schemaId: string
) {
  return tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas/${schemaId}`, {
    method: 'DELETE',
  })
}
