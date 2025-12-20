// Простой PDF viewer на PDF.js для всех устройств
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let canvas = document.getElementById('pdf-canvas');
let ctx = canvas.getContext('2d');

// URL PDF файла берём из data-атрибута
const pdfUrl = canvas.getAttribute('data-pdf-url');

// Загружаем PDF.js из CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Рендерит страницу
 */
function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function(page) {
    // Адаптируем масштаб под ширину экрана
    const viewport = page.getViewport({scale: 1});
    
    // Для iOS Safari используем window.innerWidth вместо offsetWidth
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const containerWidth = isIOS 
      ? window.innerWidth - 80
      : document.querySelector('.pdf-container').offsetWidth;
    
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      scale = Math.max(2.0, (containerWidth / viewport.width) * 1.5);
    } else {
      scale = containerWidth / viewport.width;
    }
    
    const scaledViewport = page.getViewport({scale: scale});
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport
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

  // Обновляем номер страницы
  document.getElementById('page-num').textContent = num;
}

/**
 * Если другая страница уже рендерится, откладываем
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Предыдущая страница
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById('prev-page').addEventListener('click', onPrevPage);

/**
 * Следующая страница
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById('next-page').addEventListener('click', onNextPage);

/**
 * Загружаем PDF
 */
pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
  pdfDoc = pdfDoc_;
  document.getElementById('page-count').textContent = pdfDoc.numPages;

  // Рендерим первую страницу
  renderPage(pageNum);
});

// Перерендериваем при изменении размера окна
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, 300);
});
