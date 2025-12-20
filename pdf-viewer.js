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
    // Получаем размер контейнера
    const wrapper = document.querySelector('.pdf-canvas-wrapper');
    const container = document.querySelector('.pdf-container');
    
    // Доступная ширина с учётом padding и border
    const containerPadding = 30; // 10px padding + 3px border с каждой стороны
    const wrapperPadding = 20; // padding wrapper
    const maxWidth = Math.min(
      wrapper.clientWidth - wrapperPadding,
      container.clientWidth - containerPadding,
      window.innerWidth - 40 // Защита от переполнения экрана
    );
    
    // Получаем оригинальный размер страницы
    const viewport = page.getViewport({scale: 1});
    
    // Считаем scale чтобы влезло по ширине
    const scale = maxWidth / viewport.width;
    
    // Для высокого качества на retina дисплеях
    const outputScale = window.devicePixelRatio || 1;
    const renderScale = scale * outputScale;
    
    // Финальный viewport для рендеринга
    const renderViewport = page.getViewport({scale: renderScale});
    
    // Устанавливаем физический размер canvas (большой для качества)
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    
    // Устанавливаем отображаемый размер (масштабированный)
    canvas.style.width = Math.floor(viewport.width * scale) + 'px';
    canvas.style.height = Math.floor(viewport.height * scale) + 'px';
    
    const renderContext = {
      canvasContext: ctx,
      viewport: renderViewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
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
