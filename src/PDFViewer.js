import PDFJS from 'pdfjs-dist/webpack';
import PDFPage from './PDFPage';
import utils from './utils';

// TODO list: highlight

// supported events:  load, pagechanged
export default class PDFViewer {
  constructor({
    container, // HTMLElement, where to render pdf viewer
    url = '',
    data = null,
    cMapUrl = '',
    cMapPacked = false,
    isRenderText = true,
    gap = 20, // left and right padding
    backgroundColor = '#808080',
    borderStyle = 'none'
  }) {
    if (!container) {
      throw new Error('Empty container');
    }

    this.container = container;    
    this.url = url;
    this.data = data;
    this.gap = gap || 0;
    this.isRenderText = isRenderText;
    this.pages = [];
    this.pageGap = 10; // gap between pages

    // handle container style
    this.container.style.overflow = 'auto';
    this.container.style.padding = `0 ${this.gap}px`;
    this.container.style.backgroundColor = backgroundColor;
    this.container.style.boxSizing = 'border-box';
    this.container.style.borderStyle = borderStyle;
    this.container.style.scrollBehavior = 'smooth';

    this.width = this.calcWidth();
    this.height = this.container.clientHeight || 500;

    this.doc = null;
    this.ready = false;
    this.currentPage = 0;
    this.renderTimer = null;
    this.resizeTimer = null;

    this.events = {
      load: [],
      pagechanged: []
    };

    const cfg = {
      cMapUrl,
      cMapPacked
    };

    if (url) {
      cfg.url = url;
    } else if (data) {
      cfg.data = data;
    }

    this.pdfTask = PDFJS.getDocument(cfg);
    this.pdfTask.promise.then(doc => {
      this.doc = doc;
      const pageCount = this.doc.numPages;
      if (this.doc.numPages <= 0) {
        this.ready = true;
        return;
      }
      
      for (let index = 1; index <= pageCount; ++index) {
        const page = new PDFPage({
          width: this.width,
          height: this.height,
          gap: this.pageGap,
          isRenderText
        });
        this.pages.push(page);
        this.container.appendChild(page.getPageElement());
      }
      this.ready = true;
    }).then(() => {
      this.render(true);      
    }).then(() => {
      while (this.events.load.length > 0) {
        this.events.load.shift()();
      }
    });
    this.container.addEventListener('scroll', () => this.onScroll());
    window.addEventListener('resize', () => this.onResize());
    
    this.containerWather = new MutationObserver(() => {
      if (!this.ready) {
        return;
      }
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = null;
      }
      this.resizeTimer = setTimeout(() => {
        this.width = this.container.clientWidth - 2 * this.gap;
        if (this.width > 0) {
          this.pages.forEach(page => {
            page.resize(this.width);
          });
          this.render(true);
        }        
      }, 150);
    });

    this.containerWather.observe(this.container, {
      childList: false,
      subtree: false,
      attributes: true
    });
  }

  render(force) {    
    if (!this.ready || !this.container || !this.pages.length) {
      return;
    }

    const containerHeight = this.container.clientHeight;
    const scrollTop = this.container.scrollTop;

    const MAX_HIDDEN_RENDERED_PAGES = 10;
    let currentPage = 0;
    let prevPageHeight = 0;

    this.pages.forEach((page, pageIndex) => {   
      const pageHeight = page.height;
      const tempPageTop = scrollTop - prevPageHeight;
      page.render(force);
      if (tempPageTop < containerHeight + (MAX_HIDDEN_RENDERED_PAGES / 2) * (pageHeight + this.pageGap) && tempPageTop > -containerHeight - (MAX_HIDDEN_RENDERED_PAGES / 2) * (pageHeight + this.pageGap)) {
        // render only pages that meet requirements
        const pageNum = pageIndex + 1;
        if (!page.page) {
          this.doc.getPage(pageNum).then(pdfPage => {
            page.page = pdfPage;
            page.render(force);
          });
        }        
        if (currentPage === 0 && tempPageTop <= 0 && tempPageTop + pageHeight > 0) {
          currentPage = pageIndex + 1;
        }
      } else {
        page.revoke();
      }
      prevPageHeight += pageHeight + this.pageGap;
    });

    if (this.currentPage !== currentPage) {
      this.currentPage = currentPage;
      this.events.pagechanged.forEach(handler => {
        handler({
          currentPage
        });
      });
    }
  }

  calcWidth() {
    return this.container.clientWidth - 2 * this.gap;
  }

  // isOriginalMetrics 代表是否采用原始pdf的坐标系统， 
  // true, 则offset是没有经过缩放的距离当前页顶部的高度
  // false, 则offset是实现渲染过后， 用户所感知的距离当前页顶部的高度
  scrollTo(pageNum, offset, isOriginalMetrics = true) {
    if (!this.ready || pageNum < 1 || pageNum > this.pages.length) {
      return;
    }
    const pageInstance = this.pages[pageNum - 1];
    let pageTop = pageInstance.getPageElement().offsetTop;
    if (isOriginalMetrics) {
      if (pageInstance.page) { // pdf page has been set
        this.container.scrollTop = pageTop + offset * pageInstance.scale;
      } else { // get page to calculate
        this.doc.getPage(pageNum).then(p => {
          pageInstance.page = p;
          pageInstance.render(true).then(() => {
            pageTop = pageInstance.getPageElement().offsetTop;
            this.container.scrollTop = pageTop + offset * pageInstance.scale;
          });          
        });
      }
    } else {      
      this.container.scrollTop = pageTop + offset;
    }
  }

  onScroll() {
    if (!this.ready) {
      return;
    }
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    this.renderTimer = setTimeout(() => this.render(), 150);
  }

  onResize() {
    const newWidth = this.calcWidth();
    if (this.width !== newWidth) { 
      // width changes to trigger rerender
      this.container.setAttribute('resize', utils.getUniqueId());
    }
  }

  destroy() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    this.removeAllHighlights();

    this.pages.forEach(page => {
      page.destroy();
    });
    this.pages = null;
    
    // event listener unregister
    this.container.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);

    this.containerWather.disconnect();
    this.containerWather = null;
    this.container = null;
    this.data = null;

    if (this.doc) {
      this.doc.cleanup();
      this.doc.destroy();
      this.doc = null;
    }
    if (this.pdfTask) {
      this.pdfTask.destroy();
      this.pdfTask = null;
    }   
    this.events = null;
  }

  addEventListener(eventName, handler) {
    if (!this.events[eventName]) {
      return this;
    }
    if (typeof handler === 'function') {
      this.events[eventName].push(handler);
    }
    return this;
  }

  removeEventListener(eventName, handler) {
    if (!this.events[eventName]) {
      return this;
    }
    const index = this.events[eventName].indexOf(handler);
    if (index > -1) {
      this.events[eventName].splice(index, 1);
    }
    return this;
  }

  highlight(pageNum, x, y, width, height, color = 'yellow') {
    if (!this.ready || pageNum < 1 || pageNum > this.pages.length) {
      return '';
    }

    const pageInstance = this.pages[pageNum - 1];
    return pageInstance.highlight(x, y, width, height, color);
  }

  removeHighlight(pageNum, id) {
    if (!this.ready || pageNum < 1 || pageNum > this.pages.length) {
      return;
    }
    const pageInstance = this.pages[pageNum - 1];
    pageInstance.highlight(id);
  }

  removeAllHighlights() {
    this.pages.forEach(page => {
      page.removeAllHighlights();
    });
  }
}
