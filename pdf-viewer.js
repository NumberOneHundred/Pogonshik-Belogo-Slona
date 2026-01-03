// Улучшенный PDF viewer на PDF.js для всех устройств
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
    // Получаем viewport страницы в оригинальном размере
    const originalViewport = page.getViewport({scale: 1});
    
    // Вычисляем доступную ширину
    const isMobile = window.innerWidth <= 768;
    let availableWidth;
    
    if (isMobile) {
      // На мобильных: почти вся ширина экрана минус отступы
      availableWidth = window.innerWidth - 30; // 10px body padding + 6px container border/padding + запас
    } else {
      // На десктопе: ширина контейнера
      const wrapper = document.querySelector('.pdf-canvas-wrapper');
      const container = document.querySelector('.pdf-container');
      availableWidth = Math.min(
        wrapper.clientWidth - 20,
        container.clientWidth - 20,
        1200 // максимум
      );
    }
    
    // Считаем scale чтобы PDF влез по ширине
    const scale = availableWidth / originalViewport.width;
    
    // Для retina дисплеев рендерим в повышенном качестве
    const pixelRatio = window.devicePixelRatio || 1;
    const renderScale = scale * Math.min(pixelRatio, 2); // Ограничиваем 2x для производительности
    
    // Viewport для рендеринга
    const renderViewport = page.getViewport({scale: renderScale});
    
    // Устанавливаем реальный размер canvas (высокое разрешение)
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    
    // Устанавливаем отображаемый размер (масштабированный)
    const displayWidth = Math.floor(originalViewport.width * scale);
    const displayHeight = Math.floor(originalViewport.height * scale);
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
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

// Загрузка PDF
pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
  pdfDoc = pdfDoc_;
  document.getElementById('page-count').textContent = pdfDoc.numPages;
  
  // Отключаем кнопки если всего одна страница
  if (pdfDoc.numPages === 1) {
    document.getElementById('prev-page').disabled = true;
    document.getElementById('next-page').disabled = true;
  }
  
  renderPage(pageNum);
}).catch(function(error) {
  console.error('Ошибка загрузки PDF:', error);
  document.querySelector('.pdf-fallback').style.display = 'block';
});

// Ре-рендер при изменении размера окна (с debounce)
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, 250);
});

// Ре-рендер при изменении ориентации на мобильных
window.addEventListener('orientationchange', function() {
  setTimeout(function() {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, 300);
});
