export function renderPagination(onPrev, onNext, onSubmit) {
  const nav = document.createElement('div');
  nav.className = 'fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-gray-800 px-4 py-3.5 transition-colors duration-200 flex flex-col items-center z-50';

  const currentPage = window.questionnaire?.[window.currentPageIndex] || {};
  const currentSet = currentPage.sets?.[window.currentSetIndex] || {};
  const setTitle = currentSet.title || 'Section';
  const setDescription = currentSet.description || '';

  // Error Alert Container
  const errorAlert = `
    <div id="pagination-error" class="w-full max-w-3xl mx-auto mb-3 hidden">
      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center text-red-400 text-sm">
        <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Please fix the errors above to proceed.</span>
      </div>
    </div>
  `;

  nav.innerHTML = `
    ${errorAlert}
    <div class="max-w-3xl w-full mx-auto flex items-center justify-between">
      <div class="text-left max-w-md transition-opacity duration-200 flex items-center">
        <div id="pagination-section-number" class="flex-shrink-0 size-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mr-5 text-lg font-medium text-blue-400 transition-colors duration-300">
          ${window.currentGlobalSetIndex + 1}
        </div>
        <div>
          <div class="text-lg font-medium text-white transition-colors duration-200">${setTitle}</div>
          ${setDescription ? `<div class="text-sm text-gray-500 mt-0.5 transition-colors duration-200">${setDescription}</div>` : ''}
        </div>
      </div>
      <div class="flex space-x-3">
        ${!window.isFirstStep ? `
        <button id="prev" class="px-5 py-2.5 bg-black border border-gray-700 text-gray-300 rounded-lg font-medium transition-all duration-200 hover:bg-gray-900 hover:border-gray-600 hover:text-gray-100 active:scale-[0.98] flex items-center">
          <svg class="w-4 h-4 mr-1.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>` : ''}
        <button id="action" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow transition-all duration-200 active:scale-[0.98] flex items-center relative overflow-hidden">
          <span class="relative z-10">${window.isAtLastStep ? 'Submit' : 'Next'}</span>
          ${!window.isAtLastStep ? '<svg class="w-4 h-4 ml-1.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : ''}
          <div class="absolute inset-0 bg-blue-700 opacity-0 hover:opacity-20 transition-opacity duration-200"></div>
        </button>
      </div>
    </div>
  `;

  const prevBtn = nav.querySelector('#prev');
  if (prevBtn) prevBtn.onclick = onPrev;
  nav.querySelector('#action').onclick = window.isAtLastStep ? onSubmit : onNext;

  return nav;
}