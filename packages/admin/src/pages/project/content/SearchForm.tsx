import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import { DeleteTwoTone } from '@ant-design/icons'
import {
  Form,
  Space,
  Button,
  Row,
  Input,
  Switch,
  Select,
  Tooltip,
  Modal,
  message,
  InputNumber,
} from 'antd'
import { IDatePicker, IConnectEditor, IDateRangePicker } from '@/components/Fields'
import { useConcent } from 'concent'
import { ContentCtx } from 'typings/store'
import { calculateFieldWidth, getProjectName, getSchemaSystemFields } from '@/utils'
import { getSearchConditions, updateSchemaFiled, updateSearchConditions } from '@/services/schema'
import { IS_KIT_MODE, TEMP_SAVE_CONDITIONS } from '@/kitConstants'
import { Schema, SchemaField, SearchConditions } from 'typings/field'
import { useRequest } from '@umijs/hooks'

const { Option } = Select

// 判断两个 field 数组是否包含相同的 field
const isFieldSame = (field1: any[], field2: any[]) => {
  if (field1?.length !== field2?.length) return false
  return _.differenceBy(field1, field2, 'name')?.length === 0
}

/**
 * 内容搜索表单
 */
const ContentTableSearchForm: React.FC<{
  schema: Schema
  onSearch: (v: Record<string, any>) => void
}> = ({ schema, onSearch }) => {
  const [form] = Form.useForm()
  const projectName = getProjectName()
  const ctx = useConcent<{}, ContentCtx>('content')
  const { searchFields, searchParams } = ctx.state

  // 删除字段
  const deleteField = (field: SchemaField) => {
    ctx.mr.removeSearchField(field)

    // 在删除单个搜索框时触发一次查询
    if (IS_KIT_MODE) {
      const newSearchParams = { ...(ctx.state?.searchParams || {}) }
      delete newSearchParams?.[field.name]
      ctx.setState({
        searchParams: newSearchParams,
      })
      if(Object.keys(newSearchParams).length === 0){
        saveSearchFields({projectName,collectionName:schema.collectionName})
        onSearch({}) // 如果都删除了，触发一次搜索
      }
      autoSaveFields();
    }
  }

  /** 查询远端记录的搜索条件 */
  const {loading:getting}=useRequest(
    async ()=>getSearchConditions(projectName,schema.collectionName),
    {
      ready:!!projectName&&!!schema?.collectionName&&IS_KIT_MODE,
      refreshDeps:[projectName,schema],
      onSuccess:(res)=>{
        const sysFields=getSchemaSystemFields(schema);
        const allFields=[...sysFields,...(schema?.fields||[])];
        const {conditions}=res as {conditions:SearchConditions[]};
        const showConditions=(conditions||[]).filter(conItem=>!!allFields.find(fieldItem=>fieldItem.name===conItem.key));
        // const tarFields=allFields.filter(fieldItem=>!!(conditions||[]).find(conItem=>fieldItem.name===conItem.key));
        const tarFields=showConditions.map(conItem=>allFields.find(fieldItem=>fieldItem.name===conItem.key)).filter(conItem=>!!conItem); // 按照showConditions的顺序计算目标fields
        const tarParam=showConditions.reduce((dic,item)=>{
          dic[item.key]=item.value;
          try{
            if(typeof item?.value === 'string'){
              dic[item.key]=JSON.parse(item?.value);
            }
          }catch{}
          return dic;
        },{})
        
        // 设定state中的搜索条件
        ctx.mr.setSearchFields(tarFields);
        ctx.setState({
          searchParams: tarParam,
        })
        form.setFieldsValue(tarParam)
      },
    }
  );

  // 保存检索条件
  const { run: saveSearchFields, loading:saving } = useRequest(
    async (param:{projectName:string,collectionName:string,searchParams?:any,searchFields?:SchemaField[]}) => {
      if(IS_KIT_MODE){
        const tarConditions=(param?.searchFields||[]).map(fieldItem=>({key:fieldItem.name,value:JSON.stringify(param?.searchParams?.[fieldItem.name])} as SearchConditions))
        await updateSearchConditions(param.projectName,param.collectionName,tarConditions);
      }
      else {
        await updateSchemaFiled(projectName, schema.collectionName, {
          searchFields,
        })
        ctx.mr.getContentSchemas(projectName)
      }
    },
    {
      manual: true,
      onSuccess: () => !TEMP_SAVE_CONDITIONS && message.success('保存检索条件成功！'),
      onError: (e) => message.error(e.message || '保存检索条件失败！'),
    }
  )

  const autoSaveFields=()=>{
    TEMP_SAVE_CONDITIONS && projectName && schema?.collectionName && saveSearchFields({projectName,collectionName:schema.collectionName,searchParams:form.getFieldsValue(),searchFields});
  };

  return (
    <div>
      {!getting&&searchFields.length ? (
        <Form
          form={form}
          layout="inline"
          initialValues={searchParams}
          style={{ marginTop: '15px' }}
          onValuesChange={()=>autoSaveFields()}
          onFinish={(v: any) => onSearch(v)}
        >
          <Row>
            {searchFields.map((field, index) => (
              <Space
                key={index}
                align="center"
                style={{ marginRight: '15px', marginBottom: '10px' }}
              >
                {getSearchFieldItem(field, index)}
                <DeleteTwoTone onClick={() => deleteField(field)} style={{ marginLeft: '-15px' }} />
              </Space>
            ))}
            <Space style={{ marginBottom: '10px' }}>
              <Tooltip title="删除所有检索条件">
                <Button
                  onClick={() => {
                    const onOk = async () => {
                      try {
                        ctx.mr.clearSearchField()
                        ctx.setState({
                          searchParams: {},
                        })
                        saveSearchFields({projectName,collectionName:schema.collectionName});
                        onSearch({})
                        TEMP_SAVE_CONDITIONS && message.success('重置检索条件成功！')
                        // ctx.mr.getContentSchemas(projectName)
                      } catch (error) {
                        message.error('重置检索条件失败！')
                      }
                    }
                    if(TEMP_SAVE_CONDITIONS){
                      onOk()
                    } else {
                      const modal = Modal.confirm({
                        title: '是否删除保存的检索条件？',
                        onCancel: () => {
                          modal.destroy()
                        },
                        onOk: onOk,
                      })
                    }
                  }}
                >
                  删除
                </Button>
              </Tooltip>

              <Tooltip title="清空搜索输入值，重新搜索">
                <Button
                  type="primary"
                  onClick={() => {
                    ctx.setState(
                      {
                        searchParams: {},
                      },
                      () => {
                        form.resetFields()
                        onSearch({})
                        autoSaveFields();
                      }
                    )
                  }}
                >
                  重置搜索
                </Button>
              </Tooltip>

              <Button type="primary" htmlType="submit">
                搜索
              </Button>

              {/* 仅字段不同时，才显示保存按钮 */}
              {!TEMP_SAVE_CONDITIONS && (
                <Tooltip title="保存检索条件，下次直接搜索">
                  <Button type="primary" loading={getting||saving} onClick={()=>saveSearchFields({projectName,collectionName:schema.collectionName,searchParams:form.getFieldsValue(),searchFields})}>
                    保存
                  </Button>
                </Tooltip>
              )}
            </Space>
          </Row>
        </Form>
      ) : null}
    </div>
  )
}

/**
 * 生成搜索字段输入组件
 */
const getSearchFieldItem = (field: SchemaField, key: number) => {
  const { name, type, min, max, displayName, enumElements } = field
  const width = calculateFieldWidth(field)

  let FormItem

  switch (type) {
    case 'String':
    case 'Url':
    case 'Email':
    case 'Tel':
    case 'Markdown':
    case 'RichText':
    case 'MultiLineString':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <Input type="text" style={{ width }} />
        </Form.Item>
      )
      break
    case 'Boolean':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName} valuePropName="checked">
          <Switch checkedChildren="True" unCheckedChildren="False" />
        </Form.Item>
      )
      break
    case 'Number':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <InputNumber min={min} max={max} style={{ width }} />
        </Form.Item>
      )
      break

    case 'Date':
    case 'Time':
    case 'DateTime':
      // FormItem = (
      //   <Form.Item key={key} name={name} label={displayName}>
      //     <IDatePicker type={type} dateFormatType={field.dateFormatType} />
      //   </Form.Item>
      // )
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <IDateRangePicker type={type} dateFormatType={field.dateFormatType} />
        </Form.Item>
      )
      // FormItem = (
      //   <Form.Item key={key} name={name} label={displayName}>
      //     {
      //       field.dateFormatType === "string"
      //         ? <IDatePicker type={type} dateFormatType={field.dateFormatType} />
      //         : <IDateRangePicker type={type} dateFormatType={field.dateFormatType} />
      //     }
      //   </Form.Item>
      // )
      break
    case 'Enum':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <Select mode="multiple" style={{ width }}>
            {enumElements?.length ? (
              enumElements?.map((ele, index) => (
                <Option value={ele.value} key={index}>
                  {ele.label}
                </Option>
              ))
            ) : (
              <Option value="" disabled>
                空
              </Option>
            )}
          </Select>
        </Form.Item>
      )
      break
    case 'Connect':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <IConnectEditor field={field} />
        </Form.Item>
      )
      break
    case 'Array':
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <Input placeholder="目前只支持单个值搜索" style={{ width }} />
        </Form.Item>
      )
      break
    default:
      FormItem = (
        <Form.Item key={key} name={name} label={displayName}>
          <Input style={{ width }} />
        </Form.Item>
      )
  }

  return FormItem
}

export default ContentTableSearchForm
