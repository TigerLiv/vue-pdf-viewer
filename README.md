# vue-pdf-viewer

PDF viewer customization based on pdfjs


github地址：https://github.com/TigerLiv/vue-pdf-viewer  
使用
```
npm install --save vue-pdf-viewer-package
```
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
    this.pdfViewer=new pdfViewer.PDFViewer(
        {
          url:'/mock/demo.pdf',
          container:'this.$refs.viewer'
        }
    );
    //页面改变时
    this.pdfViewer.addEventListener('pageschanged',()=>{
      
    });
    //某些字段高亮
    this.pdfViewer.highlight(pageNum, x, y, width, height, color);
    //滚动到某个位置
    // isOriginalMetrics 代表是否采用原始pdf的坐标系统， 
    // true, 则offset是没有经过缩放的距离当前页顶部的高度
    // false, 则offset是实现渲染过后， 用户所感知的距离当前页顶部的高度
    this,pdfViewer.scrollTo(pageNum, offset, isOriginalMetrics = true)
    
  
  },
  beforeDestory(){
    //释放内存
    this.pdfViewer.destory()
  }
}

```

