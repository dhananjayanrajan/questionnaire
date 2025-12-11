export function renderProgressBar(
  pagesProgress, // Array of { sections: string[] }
  reqPercent,
  optPercent
) {
  // We will build the HTML using flexbox.
  // Each page container will be a flex container.
  // The root container will be a flex container with gap-2 (for page separation).

  let pagesHTML = '';

  pagesProgress.forEach((page, pageIdx) => {
    let pageSegments = '';
    page.sections.forEach((status, sIdx) => {
      let colorClass = 'bg-gray-800'; // Muted/Inactive
      let borderClass = '';
      let opacityClass = 'opacity-50';

      if (status === 'active') {
        colorClass = 'bg-transparent';
        borderClass = 'border-2 border-blue-500';
        opacityClass = 'opacity-100';
      } else if (status === 'active-completed') {
        colorClass = 'bg-transparent';
        borderClass = 'border-2 border-emerald-500';
        opacityClass = 'opacity-100';
      } else if (status === 'active-error') {
        colorClass = 'bg-red-900/20';
        borderClass = 'border-2 border-red-500';
        opacityClass = 'opacity-100';
      } else if (status === 'error') {
        colorClass = 'bg-red-500';
        opacityClass = 'opacity-100';
      } else if (status === 'completed') {
        colorClass = 'bg-emerald-500'; // Green for completed
        opacityClass = 'opacity-100';
      } else if (status === 'disabled') {
        colorClass = 'bg-gray-800';
        opacityClass = 'opacity-30';
      } else if (status === 'active-disabled') {
        colorClass = 'bg-gray-800';
        borderClass = 'border-2 border-gray-600';
        opacityClass = 'opacity-50';
      }

      const isActive = status.startsWith('active');
      const heightClass = isActive ? 'h-4 -mt-1' : 'h-2';

      pageSegments += `
            <div 
              class="${colorClass} ${borderClass} ${opacityClass} transition-all duration-300 cursor-pointer relative flex-1 ${heightClass}" 
              style="border-radius: 2px;"
              title="Page ${pageIdx + 1} - Section ${sIdx + 1}"
            ></div>`;
    });

    // Page container
    pagesHTML += `
        <div class="flex items-center space-x-0.5" style="flex: ${page.sections.length}">
            ${pageSegments}
        </div>
      `;
  });

  const progressBar = document.createElement('div');
  progressBar.id = 'progress-root';
  // Note: Top position will be calculated dynamically in main.js
  progressBar.className = 'relative w-full bg-black/90 backdrop-blur-sm border-b border-gray-800 shadow-lg transition-all duration-200';
  progressBar.innerHTML = `
    <div class="max-w-3xl w-full mx-auto pt-1 pb-6 px-6 md:px-1">
      <div class="flex items-center justify-between text-sm font-semibold text-gray-400 mb-3">
        <span class="text-white">Progress</span>
        <div class="flex space-x-4">
           <span class="text-emerald-400">Required: ${reqPercent}%</span>
           <span class="text-blue-400">Optional: ${optPercent}%</span>
        </div>
      </div>
      <div class="flex items-center space-x-2 w-full h-2">
        ${pagesHTML}
      </div>
    </div>
  `;

  return progressBar;
}