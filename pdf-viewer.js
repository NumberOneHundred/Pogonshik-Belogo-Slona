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
    // Получаем размер страницы PDF
    const viewport = page.getViewport({scale: 1});
    
    // Получаем размер контейнера
    const container = document.querySelector('.pdf-canvas-wrapper');
    const containerWidth = container.offsetWidth - 20; // Отступы
    const containerHeight = window.innerHeight * 0.6; // 60% высоты экрана
    
    // Считаем масштаб чтобы PDF влез целиком
    const scaleWidth = containerWidth / viewport.width;
    const scaleHeight = containerHeight / viewport.height;
    scale = Math.min(scaleWidth, scaleHeight); // Берём меньший масштаб
    
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
}).catch(function(error) {
  console.error('Ошибка загрузки PDF:', error);
  document.querySelector('.pdf-fallback').style.display = 'block';
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
