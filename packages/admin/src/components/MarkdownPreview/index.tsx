import React, { useEffect, useState } from 'react'
import VditorX from 'vditor'
import 'vditor/dist/index.css'
import './index.less'
import useRequest from '@umijs/use-request'
import { fetchText } from '@/utils'

export const MarkdownPreview: React.FC<{
  id: number;
  value?: any;
  url?: string;
}> = (props) => {
  const { id = 'default', url } = props;
  const [value, setValue] = useState(props?.value);

  // 加载远端文本文件
  const {run:getUrlValue}=useRequest((url:string)=>fetchText(url),{manual:true,onSuccess:(data)=>{
    // 如果载入的代码文件为html文件，则只解析<body>标签内的元素
    let dataV=data||'';
    const firstBodySign='<body>'
    const firstBodyIndex=data?.indexOf(firstBodySign);
    const lastBodyIndex=data?.indexOf('</body>');
    if(firstBodyIndex>=0&&lastBodyIndex>0&&firstBodyIndex<lastBodyIndex){
      dataV=dataV.substring(firstBodyIndex+firstBodySign.length,lastBodyIndex);
    }
    setValue(dataV)
  }})

  useEffect(()=>{
    if(props?.value){
      setValue(props.value);
    }
    else if(url) {
      getUrlValue(url);
    }
  }, [props?.value, url])

  useEffect(() => {
    if(!value){
      return;
    }
    // eslint-disable-next-line
    const vditor = new VditorX(`${id}-preview`, {
      value,
      toolbar:[],
    //   toolbar: Toolbar,
      input: (text, html) => {
        // onChange(text)
      },
    //   upload: {
    //     headers: authHeader,
    //     url: `${getHttpAccessPath()}/upload`,
    //   },
      theme: 'classic',
    //   placeholder: '欢迎使用云开发 CMS Markdown编辑器',
      // mode: 'sv',
      mode: 'wysiwyg',
      preview:{
        actions:[],
      },
    //   minHeight: 600,
      debugger: false,
      typewriterMode: false,
      cache: {
        enable: false,
      },
    });
    vditor.disabled();
    // return ()=>vditor.destroy();
  }, [value])

  return <div id={`${id}-preview`} className='markdown-preview'/>
}

export default MarkdownPreview
