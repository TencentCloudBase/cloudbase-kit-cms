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
  const rsp = await tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas`, {
    method: 'GET',
  })
  // rsp.data=(rsp?.data||[]).map((item:any)=>({...item?.['schema'],_id:item.id}))
  return rsp
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
      tcbRequest(`/projects/${projectName}/collections/${collectionName}/schemas/${item._id}`, {
        method: 'PATCH',
        data: { ...item, _id: undefined, name: undefined },
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

/** 获取模板批量导出数据 */
export async function getExportSchemasData(
  projectName: string,
  collections: string[]
): Promise<Schema[]> {
  return tcbRequest(`/projects/${projectName}/collections/export`, {
    method: 'POST',
    data: collections,
  })
}

/** 获取模板批量导出数据 */
export async function importSchemasData(projectName: string, schemas: Partial<Schema>[]) {
  const sysReg = /^_/
  const pureSchemas = schemas.map((schemaItem) => {
    const pureSchema = { ...schemaItem }
    const sysSchemaKeys = Object.keys(pureSchema)

    // 去除schema层系统字段
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    // for (let i = 0; i < sysSchemaKeys.length; ++i) {
    //   const key = sysSchemaKeys[i]
    //   if (sysReg.test(key)) {
    //     delete pureSchema[key] // 去除系统字段
    //   }
    // }

    pureSchema.fields = (pureSchema?.fields || [])
      .filter((fieldItem) => !fieldItem.isSystem)
      .map((fieldItem) => {
        const pureField = { ...fieldItem }
        const sysFieldKeys = Object.keys(pureField)
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let j = 0; j < sysFieldKeys.length; ++j) {
          const key = sysFieldKeys[j]
          if (sysReg.test(key) || key === 'id') {
            delete pureField[key]
          }
        }
        return pureField
      })
    return pureSchema
  })
  return tcbRequest(`/projects/${projectName}/collections/import`, {
    method: 'POST',
    data: pureSchemas,
  })
}
