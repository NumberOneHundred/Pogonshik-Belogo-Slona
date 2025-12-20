// Простой PDF viewer на PDF.js для всех устройств
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let canvas = document.getElementById('pdf-canvas');
let ctx = canvas.getContext('2d');

const pdfUrl = canvas.getAttribute('data-pdf-url');

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function(page) {
    // Получаем реальную ширину контейнера
    const wrapper = document.querySelector('.pdf-canvas-wrapper');
    const maxWidth = wrapper.clientWidth - 60;
    const maxHeight = window.innerHeight * 0.65;
    
    // Считаем какой scale нужен чтобы влезть
    const pageViewport = page.getViewport({scale: 1});
    const scaleX = maxWidth / pageViewport.width;
    const scaleY = maxHeight / pageViewport.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Рендерим с увеличенным качеством
    const renderScale = scale * 3;
    const renderViewport = page.getViewport({scale: renderScale});
    
    // Физический размер canvas (большой для качества)
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    
    // Отображаемый размер (маленький чтобы влез)
    const displayViewport = page.getViewport({scale: scale});
    canvas.style.width = displayViewport.width + 'px';
    canvas.style.height = displayViewport.height + 'px';

    const renderContext = {
      canvasContext: ctx,
      viewport: renderViewport
    };
    
    const renderTask = page.render(renderContext);

    renderTask.promise.then(function() {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  document.getElementById('page-num').textContent = num;
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById('prev-page').addEventListener('click', onPrevPage);

function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById('next-page').addEventListener('click', onNextPage);

pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
  pdfDoc = pdfDoc_;
  document.getElementById('page-count').textContent = pdfDoc.numPages;
  renderPage(pageNum);
}).catch(function(error) {
  console.error('Ошибка загрузки PDF:', error);
  document.querySelector('.pdf-fallback').style.display = 'block';
});

let lastWidth = window.innerWidth;
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    if (pdfDoc && Math.abs(window.innerWidth - lastWidth) > 50) {
      lastWidth = window.innerWidth;
      renderPage(pageNum);
    }
  }, 300);
});
