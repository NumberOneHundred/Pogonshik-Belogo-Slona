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
    const isMobile = window.innerWidth < 768;
    
    // На мобильных: фиксированный scale для читаемости
    // На десктопе: подгоняем под ширину экрана
    if (isMobile) {
      scale = 2.5; // Увеличенный масштаб для мобильных
    } else {
      const viewport = page.getViewport({scale: 1});
      const containerWidth = document.querySelector('.pdf-container').offsetWidth - 40;
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
document.getElementById('page-num').textContent = num;
}

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
