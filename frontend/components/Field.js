export function renderField(question, value = '', onSave, namespace = '', sectionDisabled = false, fieldExcluded = false, onToggleFieldExclude = null, questionNumber = null, fieldSkipped = false, onToggleFieldSkip = null) {
  const {
    id,
    type,
    label,
    description,
    helper,
    example,
    required,
    min,
    max,
    validation,
    options,
    group = [],
    rules = {},
    exclude, // Use property from question object
    skip // Use property from question object
  } = question;

  const fullId = `${namespace}${id}`;
  // Use the exclude property from the question object if available, otherwise fallback to passed arg
  // The question object is mutated in main.js, so this is the source of truth.
  const isExcluded = exclude !== undefined ? exclude === true : fieldExcluded;
  const isSkipped = skip !== undefined ? skip === true : fieldSkipped;
  const disabled = sectionDisabled || isExcluded || isSkipped;

  const inputBase = 'w-full px-input-padding-x py-input-padding-y bg-surface border border-input-border rounded-input text-text-primary placeholder-text-tertiary text-base transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-blue-500 focus:shadow-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const errorClass = 'mt-2.5 text-red-500 text-sm font-medium leading-tight';
  const successClass = 'mt-2.5 text-emerald-500 text-sm font-medium leading-tight';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Build validation badges
  const badges = [];
  if (required && !isExcluded) {
    badges.push('<span class="inline-flex items-center justify-center px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded-badge uppercase tracking-wider">Required</span>');
  }
  if (rules.minLength) {
    badges.push(`<span class="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded-badge">Min ${rules.minLength} chars</span>`);
  }
  if (rules.maxLength) {
    badges.push(`<span class="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded-badge">Max ${rules.maxLength} chars</span>`);
  }
  if (rules.min !== undefined) {
    badges.push(`<span class="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded-badge">Min ${rules.min}</span>`);
  }
  if (rules.max !== undefined) {
    badges.push(`<span class="inline-flex items-center justify-center px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded-badge">Max ${rules.max}</span>`);
  }
  if (validation || rules.pattern) {
    badges.push('<span class="inline-flex items-center justify-center px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-semibold rounded-badge">Pattern</span>');
  }

  const baseHTML = `
    <fieldset class="p-6 border-2 rounded-field bg-surface-soft transition-colors duration-200 ${isSkipped ? 'border-yellow-500/50 bg-yellow-500/5' : isExcluded ? 'border-orange-500/50 bg-orange-500/5' : 'border-input-border'}">
      <div class="flex flex-col sm:flex-row items-start justify-between mb-3 cursor-pointer" id="field-header-${fullId}">
        <div class="flex-1 order-2 sm:order-1 flex items-center gap-4">
          ${questionNumber !== null ? `
            <div id="field-number-${fullId}" class="flex-shrink-0 size-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg font-medium text-blue-400 transition-colors duration-300">
              ${questionNumber}
            </div>
          ` : ''}
          <div class="flex-1">
            <legend class="text-label text-text-primary block ${isExcluded || isSkipped ? 'text-gray-500 line-through' : ''}">
              ${label || ''}
            </legend>
          </div>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-fit mb-4 sm:mb-0 order-1 sm:order-2">
           ${helper || example ? `
             <button type="button" id="info-btn-${fullId}" class="flex items-center gap-2 px-3 py-1.5 sm:p-2 sm:aspect-square rounded-md transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'}" title="Toggle Info" ${disabled ? 'disabled' : ''}>
               <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               <span class="text-sm font-medium sm:hidden">Info</span>
             </button>
           ` : ''}
            <button type="button" id="skip-btn-${fullId}" class="flex items-center gap-2 px-3 py-1.5 sm:p-2 sm:aspect-square rounded-md transition-colors duration-200 ${isExcluded ? 'opacity-50 cursor-not-allowed' : isSkipped ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'}" title="${isSkipped ? 'Resume Field' : 'Skip Field'}" ${isExcluded ? 'disabled' : ''}>
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
              <span class="text-sm font-medium sm:hidden">${isSkipped ? 'Resume' : 'Skip'}</span>
            </button>
            <button type="button" id="exclude-btn-${fullId}" class="flex items-center gap-2 px-3 py-1.5 sm:p-2 sm:aspect-square rounded-md transition-colors duration-200 ${isSkipped ? 'opacity-50 cursor-not-allowed' : isExcluded ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10'}" title="${isExcluded ? 'Include Field' : 'Exclude Field'}" ${isSkipped ? 'disabled' : ''}>
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              <span class="text-sm font-medium sm:hidden">${isExcluded ? 'Include' : 'Exclude'}</span>
            </button>
            <div id="collapse-icon-${fullId}" class="ml-auto text-gray-400 transform transition-transform duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div id="info-container-${fullId}" class="hidden mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        ${helper ? `<div class="flex gap-2">
          <span class="inline-flex items-center text-[12px] font-mono text-blue-400">Helper:</span>
          <span class="inline-flex items-center text-[12px] font-mono text-gray-300">${helper}</span>
        </div>` : ''}
        ${example ? `<div class="flex gap-2 ${helper ? 'mt-2' : ''}">
          <span class="inline-flex items-center text-[12px] font-mono text-blue-400">Example:</span>
          <span class="inline-flex items-center text-[12px] font-mono text-gray-300">${example}</span>
        </div>` : ''}
      </div>

      <div id="field-body-${fullId}" class="transition-all duration-200 ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}">
        ${description ? `<p class="text-text-tertiary text-sm mb-2">${description}</p>` : ''}
        ${badges.length > 0 ? `<div class="flex flex-wrap gap-1.5 mb-3">${badges.join('')}</div>` : ''}
        
        <div class="mt-3">
          <div id="field-content-wrapper-${fullId}">
            <div id="field-content-${fullId}"></div>
          </div>
        </div>

        <div id="error-${fullId}" class="${errorClass} hidden"></div>
        <div id="success-${fullId}" class="${successClass} hidden"></div>
      </div>
    </fieldset>
  `;

  const field = document.createElement('div');
  field.className = 'mb-4';
  field.innerHTML = baseHTML;

  const headerEl = field.querySelector(`#field-header-${fullId}`);
  const bodyEl = field.querySelector(`#field-body-${fullId}`);
  const collapseIcon = field.querySelector(`#collapse-icon-${fullId}`);
  const contentEl = field.querySelector(`#field-content-${fullId}`);
  const errorEl = field.querySelector(`#error-${fullId}`);
  const successEl = field.querySelector(`#success-${fullId}`);
  const excludeBtn = field.querySelector(`#exclude-btn-${fullId}`);

  const skipBtn = field.querySelector(`#skip-btn-${fullId}`);
  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onToggleFieldSkip) {
        const wasSkipped = isSkipped;
        onToggleFieldSkip();
        // Auto-collapse only when ACTIVATING skip (not when resuming)
        if (!wasSkipped) {
          setTimeout(() => {
            if (!collapsed) {
              bodyEl.classList.add('hidden');
              collapseIcon.classList.add('-rotate-90');
              collapsed = true;
            }
          }, 100);
        }
      }
    });
  }

  if (excludeBtn) {
    excludeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onToggleFieldExclude) {
        const wasExcluded = isExcluded;
        onToggleFieldExclude();
        // Auto-collapse only when ACTIVATING exclude (not when including)
        if (!wasExcluded) {
          setTimeout(() => {
            if (!collapsed) {
              bodyEl.classList.add('hidden');
              collapseIcon.classList.add('-rotate-90');
              collapsed = true;
            }
          }, 100);
        }
      }
    });
  }

  const infoBtn = field.querySelector(`#info-btn-${fullId}`);
  if (infoBtn) {
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent collapse
      const infoContainer = field.querySelector(`#info-container-${fullId}`);
      if (infoContainer) {
        infoContainer.classList.toggle('hidden');
      }
    });
  }

  let collapsed = isExcluded || isSkipped; // Start collapsed if excluded or skipped
  if (collapsed) {
    bodyEl.classList.add('hidden');
    collapseIcon.classList.add('-rotate-90');
  }

  headerEl.addEventListener('click', (e) => {
    // Prevent collapse when clicking inputs inside header if any
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    collapsed = !collapsed;
    if (collapsed) {
      bodyEl.classList.add('hidden');
      collapseIcon.classList.add('-rotate-90');
    } else {
      bodyEl.classList.remove('hidden');
      collapseIcon.classList.remove('-rotate-90');
    }
  });

  const updateFieldBorder = () => {
    const fieldset = field.querySelector('fieldset');
    if (!fieldset) return;

    if (disabled) {
      fieldset.classList.remove('border-red-500', 'border-emerald-500', 'bg-emerald-500/5', 'bg-red-500/5');
      if (isExcluded) {
        fieldset.classList.add('border-gray-700', 'bg-gray-900/30');
      } else {
        fieldset.classList.add('border-input-border');
      }
      return;
    }

    // specific check for group/deep errors
    const hasDirectError = !!window.fieldErrors?.[fullId];
    const hasChildError = window.fieldErrors && Object.keys(window.fieldErrors).some(k => k.startsWith(fullId + '-'));
    const hasError = hasDirectError || hasChildError;

    const val = getValue();

    // Check if value is truly empty (including groups with only empty objects)
    let isEmpty = val === undefined || val === null || val === '';
    if (Array.isArray(val)) {
      if (val.length === 0) {
        isEmpty = true;
      } else if (type === 'group') {
        // For groups, check if all items are empty objects
        isEmpty = val.every(item => {
          if (!item || typeof item !== 'object') return true;
          return Object.values(item).every(v => v === '' || v === null || v === undefined || v === false);
        });
      } else {
        isEmpty = false;
      }
    }

    // Reset base classes
    fieldset.classList.remove('border-red-500', 'border-emerald-500', 'border-gray-500', 'border-input-border', 'bg-surface-soft', 'bg-emerald-500/5', 'bg-red-500/5', 'border-gray-700', 'bg-gray-900/30');
    fieldset.classList.add('bg-surface-soft'); // Default bg

    // Update number square if it exists
    const numberSquare = field.querySelector(`#field-number-${fullId}`);
    if (numberSquare) {
      numberSquare.classList.remove('bg-red-500/10', 'border-red-500/30', 'text-red-400', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400', 'bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
    }

    if (hasError) {
      fieldset.classList.add('border-red-500', 'bg-red-500/5');
      fieldset.classList.remove('bg-surface-soft');
      if (numberSquare) {
        numberSquare.classList.add('bg-red-500/10', 'border-red-500/30', 'text-red-400');
      }
    } else if (!isEmpty) {
      // Success state: Emerald border and background tint
      fieldset.classList.add('border-emerald-500', 'bg-emerald-500/5');
      fieldset.classList.remove('bg-surface-soft');
      if (numberSquare) {
        numberSquare.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
      }
    } else {
      fieldset.classList.add('border-input-border');
      if (numberSquare) {
        numberSquare.classList.add('bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
      }
    }
  };

  // Placeholder for getValue, will be overridden
  let getValue = () => value;

  const runCustomValidation = (val) => {
    if (disabled) return true; // Skip validation if disabled

    // Check required first, regardless of rules
    if (required) {
      const isEmpty = val === '' || val === null || val === undefined || (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        if (type === 'checkbox' || type === 'radio') return 'Please select at least one option.';
        return 'This field is required.';
      }
    }

    const r = rules;
    if (!r) return true;

    if (typeof val === 'string') {
      if (r.minLength !== undefined && val.length < r.minLength) return `Must be at least ${r.minLength} characters.`;
      if (r.maxLength !== undefined && val.length > r.maxLength) return `Must not exceed ${r.maxLength} characters.`;
    }
    if (type === 'number' && val !== '' && !isNaN(val)) {
      const num = parseFloat(val);
      if (r.min !== undefined && num < r.min) return `Must be ≥ ${r.min}.`;
      if (r.max !== undefined && num > r.max) return `Must be ≤ ${r.max}.`;
    }
    if (r.pattern && typeof val === 'string' && val) {
      const regex = new RegExp(r.pattern);
      if (!regex.test(val)) return r.patternMessage || 'Invalid format.';
    }
    return true;
  };

  const showError = (msg, touched = true) => {
    if (disabled) return; // Don't show errors if disabled
    if (msg && touched) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      if (!window.fieldErrors) window.fieldErrors = {};
      window.fieldErrors[fullId] = msg;
    } else {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      if (window.fieldErrors) delete window.fieldErrors[fullId];
    }
    if (typeof window.updateProgress === 'function') window.updateProgress();
    updateFieldBorder();
  };

  const buildInputHTML = () => {
    const disabledAttr = disabled ? 'disabled' : '';
    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return `<input type="${type}" id="${fullId}" value="${escapeHtml(value)}" ${required ? 'required' : ''} ${disabledAttr} class="${inputBase}" placeholder="" />`;
      case 'number':
        return `<input type="number" id="${fullId}" value="${escapeHtml(value)}" ${required ? 'required' : ''} ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${disabledAttr} class="${inputBase}" placeholder="" />`;
      case 'textarea':
        return `<textarea id="${fullId}" ${required ? 'required' : ''} ${disabledAttr} class="${inputBase} resize-none overflow-hidden" rows="3" style="min-height: 80px;">${escapeHtml(value)}</textarea>`;
      case 'radio':
      case 'checkbox': {
        const opts = Array.isArray(options) ? options : [];
        const isCheckbox = type === 'checkbox';
        const isArray = Array.isArray(value);
        return opts.map(opt => `
          <label class="flex items-start space-x-3 py-2 pl-1 cursor-pointer group ${disabled ? 'cursor-not-allowed opacity-70' : ''}">
            <div class="mt-0.5">
              <input type="${type}" name="${fullId}" value="${opt.value}" ${isCheckbox && isArray && value.includes(opt.value) ? 'checked' : (!isCheckbox && value === opt.value ? 'checked' : '')} ${disabledAttr} class="w-5 h-5 text-emerald-500 bg-black border-gray-700 ${isCheckbox ? 'rounded' : ''} focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
            </div>
            <div>
              <span class="text-gray-200 group-hover:text-gray-100 font-medium">${opt.label}</span>
              ${opt.description ? `<div class="text-sm text-gray-400 mt-0.5">${opt.description}</div>` : ''}
            </div>
          </label>
        `).join('');
      }
      case 'select': {
        const opts = Array.isArray(options) ? options : [];
        return `
          <div class="relative">
            <select id="${fullId}" ${required ? 'required' : ''} ${disabledAttr} class="${inputBase} appearance-none cursor-pointer pr-10">
              <option value="" ${!value ? 'selected' : ''} class="bg-surface text-gray-400">Select an option...</option>
              ${opts.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''} class="bg-surface text-white py-2">${opt.label}</option>`).join('')}
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        `;
      }
      case 'date':
        return `<input type="date" id="${fullId}" value="${escapeHtml(value)}" ${required ? 'required' : ''} ${disabledAttr} class="${inputBase} cursor-pointer" />`;
      case 'group':
        return null;
      default:
        return `<input type="text" id="${fullId}" value="${escapeHtml(value)}" class="${inputBase}" placeholder="" />`;
    }
  };

  if (type !== 'group') {
    const inputHTML = buildInputHTML();
    contentEl.innerHTML = inputHTML || '';
    const input = field.querySelector(`#${fullId}`);

    getValue = () => {
      if (type === 'checkbox') {
        return Array.from(field.querySelectorAll(`input[name="${fullId}"]:checked`)).map(cb => cb.value);
      }
      if (type === 'radio') {
        const checked = field.querySelector(`input[name="${fullId}"]:checked`);
        return checked ? checked.value : '';
      }
      return input ? input.value : '';
    };

    const validate = () => {
      if (disabled) return true;
      const val = getValue();
      onSave(id, val);

      const r = runCustomValidation(val);
      if (r !== true) { showError(r); return false; }

      if (validation && typeof val === 'string' && val) {
        const regex = new RegExp(validation);
        if (!regex.test(val)) { showError('Invalid format.'); return false; }
      }
      showError('', true);
      return true;
    };

    if (input && !disabled) {
      input.addEventListener('input', validate);
      input.addEventListener('blur', validate);

      // Auto-expand textarea
      if (type === 'textarea') {
        const autoExpand = () => {
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
        };
        autoExpand(); // Initial sizing
        input.addEventListener('input', autoExpand);
      }
    }
    if (['checkbox', 'radio'].includes(type) && !disabled) {
      field.querySelectorAll(`input[name="${fullId}"]`).forEach(cb => cb.addEventListener('change', validate));
    }

    field.validate = () => validate();
    field.setAttribute('data-has-validate', 'true');

    // Restore error state if exists
    if (window.fieldErrors && window.fieldErrors[fullId] && !disabled) {
      errorEl.textContent = window.fieldErrors[fullId];
      errorEl.classList.remove('hidden');
    }

    field.updateBorder = updateFieldBorder;
    updateFieldBorder();
    return field;
  }

  // GROUP FIELDSET (accordion)
  const localItems = Array.isArray(value) ? value.map(v => ({ ...v })) : [{}];
  getValue = () => localItems;

  const groupContainer = document.createElement('div');
  groupContainer.id = `group-container-${fullId}`;
  groupContainer.className = 'space-y-4 mb-2';
  contentEl.appendChild(groupContainer);

  if (!disabled) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.id = `add-${fullId}`;
    addBtn.className = 'w-full py-3 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all duration-200 font-medium text-sm group mt-4';
    addBtn.innerHTML = `<svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Add Entry`;
    addBtn.addEventListener('click', () => {
      localItems.push(makeEmptyItem());
      onSave(id, localItems);
      renderGroupItems();
    });
    contentEl.appendChild(addBtn);
  }

  const makeEmptyItem = () => {
    const n = {};
    group.forEach(q => { n[q.id] = q.type === 'checkbox' ? false : ''; });
    return n;
  };

  const renderGroupItems = () => {
    groupContainer.innerHTML = '';
    localItems.forEach((item, idx) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'group-item border border-gray-800 rounded-xl bg-black/50 py-3 px-5 relative';

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-4 cursor-pointer';
      header.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mr-3">
            <span class="text-blue-400 text-sm font-medium">${idx + 1}</span>
          </div>
          <h3 class="text-white font-medium">Entry ${idx + 1}</h3>
        </div>
      `;

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'flex items-center space-x-2';
      header.appendChild(controlsDiv);

      if (!disabled) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'flex items-center px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 group';
        removeBtn.innerHTML = `<svg class="w-3.5 h-3.5 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Remove`;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent collapse when clicking remove
          localItems.splice(idx, 1);
          onSave(id, localItems);
          renderGroupItems();
        });
        controlsDiv.appendChild(removeBtn);
      }

      const collapseBtnItem = document.createElement('button');
      collapseBtnItem.type = 'button';
      collapseBtnItem.className = 'p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all duration-200 transform';
      collapseBtnItem.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
      controlsDiv.appendChild(collapseBtnItem);

      itemWrapper.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 gap-2';
      itemWrapper.appendChild(grid);

      group.forEach((subQ) => {
        const subNamespace = `${fullId}-item${idx}-`;
        const subValue = item[subQ.id] ?? (subQ.type === 'checkbox' ? false : '');
        const subFieldEl = renderField(subQ, subValue, (subId, subVal) => {
          localItems[idx] = localItems[idx] || {};
          localItems[idx][subQ.id] = subVal;
          onSave(id, localItems);
        }, subNamespace, disabled, subQ.exclude, (targetId) => {
          if (onToggleFieldExclude) onToggleFieldExclude(targetId || subQ.id);
        });
        const wrapperDiv = document.createElement('div');
        wrapperDiv.appendChild(subFieldEl);
        grid.appendChild(wrapperDiv);
      });

      let itemCollapsed = false;

      // Make entire header clickable for collapse
      header.addEventListener('click', (e) => {
        // Don't collapse if clicking on buttons or inputs
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;

        itemCollapsed = !itemCollapsed;
        if (itemCollapsed) {
          grid.classList.add('hidden');
          collapseBtnItem.classList.add('-rotate-90');
        } else {
          grid.classList.remove('hidden');
          collapseBtnItem.classList.remove('-rotate-90');
        }
      });

      groupContainer.appendChild(itemWrapper);
    });
    updateFieldBorder();
  };

  renderGroupItems();

  const validateGroup = () => {
    if (disabled) return true;
    if (required && (!Array.isArray(localItems) || localItems.length === 0 || (localItems.length === 1 && Object.keys(localItems[0]).every(k => !localItems[0][k])))) {
      showError('At least one complete entry is required.');
      return false;
    }
    let allValid = true;
    groupContainer.querySelectorAll('.group-item').forEach((itemEl) => {
      itemEl.querySelectorAll('[data-has-validate]').forEach(nf => {
        if (typeof nf.validate === 'function') {
          const ok = nf.validate();
          if (!ok) allValid = false;
        }
      });
    });
    const r = runCustomValidation(JSON.stringify(localItems));
    if (r !== true) { showError(r); return false; }
    showError('');
    return allValid;
  };

  field.validate = () => validateGroup();
  field.setAttribute('data-has-validate', 'true');
  field.updateBorder = updateFieldBorder;

  updateFieldBorder();
  return field;
}
