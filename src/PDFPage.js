import PDFJS from 'pdfjs-dist/webpack';
import utils from './utils';

export default class PDFPage {
  constructor({
    page, 
    width, 
    height,
    isRenderText = true,
    gap = 10 // page margin-bottom
  }) {
    // could be empty
    // if (!page) {
    //   throw new Error('page can\'t be empty');
    // }
    this.page = page;    
    this.gap = gap || 0;
    this.width = width - 10; // 处理横向滚动条问题
    this.height = height;
    this.isRenderText = isRenderText;

    this.pageElement = document.createElement('div');
    this.pageElement.classList.add('page-container');
    this.pageElement.style.position = 'relative';

    // canvas related
    this.canvas = null;
    this.canvasContext = null;
    this.canvasRenderTask = null;

    // text layer
    this.textLayer = null;
    this.textRenderTask = null;

    this.loadingElement = document.createElement('div');
    this.loadingElement.innerHTML = 'Loading...';
    this.loadingElement.classList.add('page-loading');
    this.pageElement.appendChild(this.loadingElement);

    // highlights, it's a dictionary, 
    this.highlights = {};
    this.isDestroyed = false;
  }

  get originalWidth() {
    return this.page ? this.page.view[2] : this.width;
  }

  get originalHeight() {
    return this.page ? this.page.view[3] : this.height;
  }

  get scale() {
    return this.width / this.originalWidth;
  }

  getPageElement() {
    return this.pageElement;
  }

  render(force) {
    this.loadingElement.style.display = 'block'; 
    this.pageElement.style.marginBottom = `${this.gap}px`;   
    if (!this.page) {
      this.pageElement.style.width = `${this.width}px`;
      this.pageElement.style.height = `${this.height}px`;      
      return Promise.resolve();
    }
    // recalculate page height according to scale
    this.height = this.originalHeight * this.scale;    
    this.pageElement.style.width = `${this.width}px`;
    this.pageElement.style.height = `${this.height}px`;
    
    const viewport = this.page.getViewport({
      scale: this.scale
    });
    const tasks = [];
    // render canvas
    if (force && this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.canvasContext = null;
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      this.canvasContext = this.canvas.getContext('2d');
      this.canvasRenderTask = this.page.render({
        canvasContext: this.canvasContext,
        viewport
      });
      tasks.push(this.canvasRenderTask.promise);
    }

    // render text layer
    if (this.isRenderText) {
      if (force && this.textLayer) {
        this.textLayer.remove();
        this.textLayer = null;
      }
      if (!this.textLayer) {
        this.textLayer = document.createElement('div');
        this.textLayer.style.position = 'absolute';
        this.textLayer.style.top = '0px';
        this.textLayer.style.left = '0px';
        this.textLayer.classList.add('text-layer');
        this.textLayer.style.width = `${this.width}px`;
        this.textLayer.style.height = `${this.height}px`;
        this.textLayer.style.zIndex = 3;
        const textContentStream = this.page.streamTextContent({
          normalizeWhitespace: true // other options?
        });
        this.textRenderTask = PDFJS.renderTextLayer({
          textContentStream,
          container: this.textLayer,
          viewport,
          textDivs: [],
          textContentItemsStr: [],
          enhanceTextSelection: true
        });
      }
    } 

    return Promise.all(tasks).then(() => {
      this.loadingElement.style.display = 'none';
      if (this.canvas) {
        this.pageElement.appendChild(this.canvas);
      }
      
      if (this.textLayer) {
        this.pageElement.appendChild(this.textLayer);
      }

      // handle highlights, force to rerender highlights
      this.removeAllHighlights(false); // just delete element, not source data
      Object.keys(this.highlights).forEach(id => {
        this.highlightById(id);
      });    
    });
  }

  resize(width) {
    if (width) {
      this.width = width;
      this.height = this.width * this.scale;
      // this.render(force);
    }
  }

  highlight(x, y, width, height, color = 'yellow', opacity = 0.5) {
    const id = utils.getUniqueId();  
    this.highlights[id] = {
      elem: null,
      rect: {
        x,
        y,
        width,
        height
      },
      color,
      opacity
    };
    this.highlightById(id);
    return id;
  }

  highlightById(id) {
    const item = this.highlights[id];
    if (!item) {
      return;
    }
    if (item.elem) {
      return;
    }
    item.elem = document.createElement('div');
    item.elem.classList.add('highlight');
    item.elem.style.position = 'absolute';
    item.elem.style.opacity = item.opacity;
    item.elem.style.backgroundColor = item.color;
    item.elem.style.width = `${item.rect.width * this.scale}px`;
    item.elem.style.height = `${item.rect.height * this.scale}px`;
    item.elem.style.top = `${item.rect.y * this.scale}px`;
    item.elem.style.left = `${item.rect.x * this.scale}px`;
    item.elem.style.zIndex = 2;
    this.pageElement.appendChild(item.elem);
  }

  removeHighlight(id, delSource = true) {
    if (!(id in this.highlights)) {
      return;
    }
    const highlight = this.highlights[id];
    if (highlight.elem) {
      highlight.elem.remove();
      highlight.elem = null;
    }
    if (delSource) {
      delete this.highlights[id];
    }    
  }

  removeAllHighlights(delSource = true) {
    Object.keys(this.highlights).forEach(id => {
      this.removeHighlight(id, delSource);
    });
  }

  // just revoke canvas and text layer elements
  revoke() {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.canvasContext = null;
    }    

    if (this.textLayer) {
      this.textLayer.remove();
      this.textLayer = null;
    }

    if (this.page) {
      this.page.cleanup();
      this.page = null;
    }

    this.loadingElement.style.display = 'block';
    this.removeAllHighlights(false);
  }

  // will remove the whole page
  destroy() {
    this.revoke();
    this.pageElement.remove();
    this.pageElement = null;
    this.highlights = null;
  }
}
