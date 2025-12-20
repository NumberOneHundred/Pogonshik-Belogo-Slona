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
    // Рендерим в ВЫСОКОМ разрешении для качества при зуме
    const renderScale = 5; // Очень высокое разрешение
    const renderViewport = page.getViewport({scale: renderScale});
    
    // Устанавливаем реальный размер canvas (БОЛЬШОЙ для качества)
    canvas.height = renderViewport.height;
    canvas.width = renderViewport.width;
    
    // Считаем размер для отображения (МАЛЕНЬКИЙ чтобы влез)
    const container = document.querySelector('.pdf-canvas-wrapper');
    const containerWidth = container.offsetWidth - 40;
    const containerHeight = window.innerHeight * 0.6;
    
    const pageViewport = page.getViewport({scale: 1});
    const scaleWidth = containerWidth / pageViewport.width;
    const scaleHeight = containerHeight / pageViewport.height;
    const displayScale = Math.min(scaleWidth, scaleHeight) * 0.9; // 90% чтобы точно влез
    
    const displayViewport = page.getViewport({scale: displayScale});
    
    // Устанавливаем МАЛЕНЬКИЙ размер через CSS
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

let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, 300);
});
