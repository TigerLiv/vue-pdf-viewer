# vue-pdf-viewer

PDF viewer customization based on pdfjs


github地址：https://github.com/TigerLiv/vue-pdf-viewer  

实现了pdf多种渲染方式、高亮字段、滚动到相应位置等功能
#### 渲染
可以使用二进制，base64等方式渲染  

还有很多有兴趣可以在src文件夹下查看源码及更多API   很详细


```
import pdfViewer from 'vue-pdf-viewer-package'

export default{
  data(){
    return {
      pdfViewer:null
    }
  },
  mouted(){
    this.pdfViewer=new pdfViewer.PDFViewer({url:'',container:''})
  
  
  }
}

```

