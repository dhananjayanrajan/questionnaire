export function renderHeader(page, pageNum, totalPages, status = 'pending', isExcluded = false, onToggleExclude) {
  const header = document.createElement('header');
  header.className = 'relative flex flex-col w-full bg-black/80 backdrop-blur-xl';

  let badgeColorClass = 'bg-blue-500/10 border-blue-500/30 text-blue-400';
  if (status === 'completed') {
    badgeColorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  } else if (status === 'error') {
    badgeColorClass = 'bg-red-500/10 border-red-500/30 text-red-400';
  } else if (status === 'disabled') {
    badgeColorClass = 'bg-gray-700/50 border-gray-600/50 text-gray-500';
  }

  header.innerHTML = `
    <!-- Top Navigation Bar -->
    <div class="border-b border-gray-800 p-4">
      <div class="max-w-3xl w-full mx-auto flex items-center justify-between">
        <div class="text-white font-medium">Questionnaire Bot</div>
        <div class="flex items-center space-x-3">
          <button 
            id="exclude-section-btn" 
            class="px-3 py-1.5 text-sm ${isExcluded ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'} rounded border transition-colors duration-200 flex items-center"
          >
            ${isExcluded ? '<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Include Section' : '<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>Exclude Section'}
          </button>
          <button 
            id="reset-form-btn" 
            class="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded border border-red-500/30 transition-colors duration-200"
          >
            Reset Form
          </button>
        </div>
      </div>
    </div>

    <!-- Page Header -->
    <div class="p-4 lg:px-0">
      <div class="max-w-3xl w-full mx-auto flex items-end justify-between">
        <div class="flex flex-row items-center justify-start space-x-4">
          <div class="flex flex-col items-center justify-center gap-1 aspect-square px-3 py-2 border rounded-xl text-xs font-medium ${badgeColorClass} transition-colors duration-300">
            Page
            <span>${pageNum} of ${totalPages}</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white ${isExcluded ? 'opacity-50' : ''}">${page.title}</h1>
            <p class="mt-1 text-gray-400 text-sm ${isExcluded ? 'opacity-50' : ''}">${page.description}</p>
          </div>
        </div>
        
        <!-- Progress Info -->
        <div class="text-right hidden sm:block ${isExcluded ? 'opacity-50' : ''}">
           <div class="flex items-center space-x-6 text-lg">
             <div>
               <div class="text-sm uppercase tracking-wider text-gray-500 mb-0.5">Page</div>
               <div class="text-gray-300 font-medium">${pageNum} <span class="text-gray-600">/</span> ${totalPages}</div>
             </div>
             <div>
               <div class="text-sm uppercase tracking-wider text-gray-500 mb-0.5">Section</div>
               <div class="text-gray-300 font-medium section-progress-text">${window.currentSetIndex + 1} <span class="text-gray-600">/</span> ${page.sets.length}</div>
             </div>
             <div>
               <div class="text-sm uppercase tracking-wider text-gray-500 mb-0.5">Fields</div>
               <div class="text-gray-300 font-medium">${window.completedFields} <span class="text-gray-600">/</span> ${window.totalFields}</div>
             </div>
           </div>
        </div>
      </div>
    </div>
  `;

  const resetBtn = header.querySelector('#reset-form-btn');
  resetBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset the entire form? All your progress will be deleted.')) {
      try {
        // Clear client-side state first
        window.responses = {};
        window.fieldErrors = {};

        // Call reset API
        await fetch('/api/reset', { method: 'POST' });

        // Reload the page
        window.location.reload();
      } catch (e) {
        console.error('Reset failed', e);
        // Still reload even if API fails
        window.location.reload();
      }
    }
  });

  const excludeBtn = header.querySelector('#exclude-section-btn');
  if (excludeBtn && onToggleExclude) {
    excludeBtn.onclick = onToggleExclude;
  }

  return header;
}