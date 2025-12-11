import { renderHeader } from './components/Header.js';
import { renderFooter } from './components/Footer.js';
import { renderProgressBar } from './components/ProgressBar.js';
import { renderPagination } from './components/Pagination.js';
import { renderField } from './components/Field.js';

let responses = {};
let currentPageIndex = 0;
let currentSetIndex = 0;
let questionnaire = [];
let fieldComponents = {};

window.questionnaire = [];
window.fieldErrors = {};
window.currentPageIndex = 0;
window.currentSetIndex = 0;
window.updateProgress = () => { };

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const saveVersion = debounce(async (data) => {
    try {
        // Extract exclusions state to save
        const _excludedSections = {};
        const _excludedFields = {};

        questionnaire.forEach((page, pIdx) => {
            if (page.sets) {
                page.sets.forEach((set, sIdx) => {
                    if (set.exclude) _excludedSections[`${pIdx}-${sIdx}`] = true;
                    if (set.fields) {
                        set.fields.forEach(field => {
                            if (field.exclude) _excludedFields[field.id] = true;
                        });
                    }
                });
            }
        });

        const payload = {
            ...data,
            _excludedSections,
            _excludedFields
        };

        await fetch('/api/save-version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('Auto-save failed');
    }
}, 1500);

async function loadLatestState() {
    try {
        const res = await fetch('/api/latest-version');
        const result = await res.json();
        if (result.exists) {
            responses = result.data || {};
            window.responses = { ...responses };

            const savedExcludedSections = responses._excludedSections || {};
            const savedExcludedFields = responses._excludedFields || {};
            const savedSkippedSections = responses._skippedSections || {};
            const savedSkippedFields = responses._skippedFields || {};

            // Apply saved exclusions and skips to questionnaire object
            for (let p = 0; p < questionnaire.length; p++) {
                const page = questionnaire[p];
                if (!page.sets) continue;
                for (let s = 0; s < page.sets.length; s++) {
                    const set = page.sets[s];
                    // Explicitly set exclusion state based on saved data
                    set.exclude = !!savedExcludedSections[`${p}-${s}`];
                    set.skip = !!savedSkippedSections[`${p}-${s}`];

                    if (set.fields) {
                        for (const field of set.fields) {
                            // Explicitly set exclusion and skip state based on saved data
                            field.exclude = !!savedExcludedFields[field.id];
                            field.skip = !!savedSkippedFields[field.id];
                        }
                    }
                }
            }

            // Navigation logic
            for (let p = 0; p < questionnaire.length; p++) {
                const page = questionnaire[p];
                for (let s = 0; s < page.sets.length; s++) {
                    const set = page.sets[s];

                    if (set.exclude) continue;

                    let setComplete = true;
                    for (let f = 0; f < set.fields.length; f++) {
                        const field = set.fields[f];
                        if (field.exclude) continue;

                        const val = responses[field.id];
                        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                            setComplete = false;
                            break;
                        }
                    }
                    if (!setComplete) {
                        currentPageIndex = p;
                        currentSetIndex = s;
                        return;
                    }
                }
            }
            const lp = questionnaire.length - 1;
            const ls = questionnaire[lp].sets.length - 1;
            currentPageIndex = lp;
            currentSetIndex = ls;
        } else {
            responses = {};
            window.responses = {};
            resetExclusionState();
            resetNavigation();
        }
    } catch (e) {
        responses = {};
        window.responses = {};
        resetExclusionState();
        resetNavigation();
    }
}

function resetExclusionState() {
    // Reset all exclusion and skip states to false (included)
    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        if (!page.sets) continue;
        for (let s = 0; s < page.sets.length; s++) {
            const set = page.sets[s];
            set.exclude = false;
            set.skip = false;
            if (set.fields) {
                for (const field of set.fields) {
                    resetFieldExclusionRecursive(field);
                }
            }
        }
    }
    // Clear all field errors
    window.fieldErrors = {};
}

function resetFieldExclusionRecursive(field) {
    field.exclude = false;
    field.skip = false;
    if (field.type === 'group' && field.group) {
        field.group.forEach(subField => {
            resetFieldExclusionRecursive(subField);
        });
    }
}

async function init() {
    // Reset questionnaire to ensure fresh load
    questionnaire = [];
    window.questionnaire = [];

    try {
        const res = await fetch('/questions.json');
        if (!res.ok) throw new Error('questions.json not found');
        questionnaire = await res.json();
        if (!Array.isArray(questionnaire) || questionnaire.length === 0) throw new Error('Invalid structure');
        window.questionnaire = questionnaire;
    } catch (err) {
        document.getElementById('app').innerHTML = `<div class="text-red-500 p-4">Failed to load questions: ${err.message}</div>`;
        return;
    }

    await loadLatestState();
    renderApp();
    window.addEventListener('beforeunload', () => {
        // Trigger immediate save
        const _excludedSections = {};
        const _excludedFields = {};
        const _skippedSections = {};
        const _skippedFields = {};
        questionnaire.forEach((page, pIdx) => {
            if (page.sets) {
                page.sets.forEach((set, sIdx) => {
                    if (set.exclude) _excludedSections[`${pIdx}-${sIdx}`] = true;
                    if (set.skip) _skippedSections[`${pIdx}-${sIdx}`] = true;
                    if (set.fields) {
                        set.fields.forEach(field => {
                            if (field.exclude) _excludedFields[field.id] = true;
                            if (field.skip) _skippedFields[field.id] = true;
                        });
                    }
                });
            }
        });
        saveVersion({ ...responses, _excludedSections, _excludedFields, _skippedSections, _skippedFields, _unsaved: true });
    });
}

function resetNavigation() {
    currentPageIndex = 0;
    currentSetIndex = 0;
}

function getTotalFieldCount() {
    let total = 0;
    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        if (!page.sets) continue;
        for (let s = 0; s < page.sets.length; s++) {
            const set = page.sets[s];
            if (set.exclude) continue;
            if (!set.fields) continue;
            for (const field of set.fields) {
                if (!field.exclude) {
                    total++;
                }
            }
        }
    }
    return total;
}

function getCurrentSet() {
    if (questionnaire.length === 0) return null;
    const page = questionnaire[currentPageIndex];
    if (!page || !page.sets || currentSetIndex >= page.sets.length) return null;
    return page.sets[currentSetIndex];
}

function clearErrorsFor(fieldId) {
    if (window.fieldErrors[fieldId]) delete window.fieldErrors[fieldId];
    const prefix = fieldId + '-';
    Object.keys(window.fieldErrors).forEach(key => {
        if (key.startsWith(prefix)) delete window.fieldErrors[key];
    });
}

function findFieldRecursive(fields, targetId) {
    for (const f of fields) {
        if (f.id === targetId) return f;
        if (f.type === 'group' && f.group) {
            const found = findFieldRecursive(f.group, targetId);
            if (found) return found;
        }
    }
    return null;
}

function setFieldExclusionRecursive(field, excludeValue) {
    field.exclude = excludeValue;
    if (excludeValue) {
        clearErrorsFor(field.id);
    }
    // If this field is a group, recursively set exclusion on sub-fields
    if (field.type === 'group' && field.group) {
        field.group.forEach(subField => {
            setFieldExclusionRecursive(subField, excludeValue);
        });
    }
}

function toggleSectionExclusion() {
    const set = getCurrentSet();
    if (!set) return;

    if (set.exclude) {
        // Include Section
        set.exclude = false;
        set.fields.forEach(f => {
            setFieldExclusionRecursive(f, false);
        });
    } else {
        // Exclude Section
        set.exclude = true;
        set.fields.forEach(f => {
            setFieldExclusionRecursive(f, true);
        });
    }
    saveVersion({ ...responses });
    renderApp();
}

function toggleFieldExclusion(fieldId) {
    const set = getCurrentSet();
    if (!set) return;

    const field = findFieldRecursive(set.fields, fieldId);
    if (!field) return;

    if (field.exclude) {
        // Include Field
        setFieldExclusionRecursive(field, false);
        // If we include a field, the section must be included
        set.exclude = false;
    } else {
        // Exclude Field
        setFieldExclusionRecursive(field, true);

        // Check if all fields in the set are excluded
        // Note: This logic assumes we only care about top-level fields for section exclusion
        const allExcluded = set.fields.every(f => f.exclude);
        if (allExcluded) {
            set.exclude = true;
        }
    }

    saveVersion({ ...responses });
    renderApp();
}

// Skip functionality - identical to exclude
function setFieldSkipRecursive(field, skipValue) {
    field.skip = skipValue;
    if (skipValue) {
        clearErrorsFor(field.id);
    }
    // If this field is a group, recursively set skip on sub-fields
    if (field.type === 'group' && field.group) {
        field.group.forEach(subField => {
            setFieldSkipRecursive(subField, skipValue);
        });
    }
}

function toggleSectionSkip() {
    const set = getCurrentSet();
    if (!set) return;

    if (set.skip) {
        // Resume Section
        set.skip = false;
        set.fields.forEach(f => {
            setFieldSkipRecursive(f, false);
        });
    } else {
        // Skip Section
        set.skip = true;
        set.fields.forEach(f => {
            setFieldSkipRecursive(f, true);
        });
    }
    saveVersion({ ...responses });
    renderApp();
}

function toggleFieldSkip(fieldId) {
    const set = getCurrentSet();
    if (!set) return;

    const field = findFieldRecursive(set.fields, fieldId);
    if (!field) return;

    if (field.skip) {
        // Resume Field
        setFieldSkipRecursive(field, false);
        // If we resume a field, the section must be resumed
        set.skip = false;
    } else {
        // Skip Field
        setFieldSkipRecursive(field, true);

        // Check if all fields in the set are skipped
        const allSkipped = set.fields.every(f => f.skip);
        if (allSkipped) {
            set.skip = true;
        }
    }

    saveVersion({ ...responses });
    renderApp();
}

function getEffectiveCounts() {
    // Calculate total pages that have at least one non-excluded set
    let activePagesCount = 0;
    let activeCurrentPageNum = 1;
    let foundCurrentPage = false;

    // We also need to map real page index to active page index
    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        const hasIncludedSet = page.sets && page.sets.some(s => !s.exclude);

        if (hasIncludedSet) {
            activePagesCount++;
            if (p === currentPageIndex) {
                activeCurrentPageNum = activePagesCount;
                foundCurrentPage = true;
            } else if (!foundCurrentPage && p > currentPageIndex) {
                // If we passed the current index but it was empty/excluded? 
                // This edge case implies we are on a page that should be skipped. 
                // Navigate logic handles skipping, so we should land on valid page.
            }
        }
    }

    // Calculate active sets in current page
    let activeSetsCount = 0;
    let activeCurrentSetNum = 1;
    if (questionnaire[currentPageIndex]) {
        const page = questionnaire[currentPageIndex];
        if (page.sets) {
            for (let s = 0; s < page.sets.length; s++) {
                if (!page.sets[s].exclude) {
                    activeSetsCount++;
                    if (s === currentSetIndex) {
                        activeCurrentSetNum = activeSetsCount;
                    }
                }
            }
        }
    }

    return {
        activePagesCount,
        activeCurrentPageNum,
        activeSetsCount: activeSetsCount || 1, // Fallback to avoid 0/0
        activeCurrentSetNum
    };
}

function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.style.paddingTop = '240px'; // Static safe padding
    app.style.paddingBottom = '90px'; // Static safe padding

    // Fixed Header Container
    let fixedRoot = document.getElementById('fixed-header-root');
    if (!fixedRoot) {
        fixedRoot = document.createElement('div');
        fixedRoot.id = 'fixed-header-root';
        fixedRoot.className = 'fixed top-0 left-0 right-0 z-50 flex flex-col width-full pointer-events-none';
        // Note: Children (header/progress) should have pointer-events-auto if needed, but they are blocks.
        // Actually we want pointer events on the header.
        fixedRoot.classList.remove('pointer-events-none');
        document.body.insertBefore(fixedRoot, document.body.firstChild);
    }
    fixedRoot.innerHTML = '';

    const set = getCurrentSet();
    if (!set) {
        app.innerHTML = '<div class="max-w-3xl w-full mx-auto px-4 py-10 text-red-500">No valid section to display.</div>';
        return;
    }
    const page = questionnaire[currentPageIndex];
    const ef = getEffectiveCounts();

    const headerComp = renderHeader(page, ef.activeCurrentPageNum, ef.activePagesCount, 'pending', set.exclude, toggleSectionExclusion);
    headerComp.querySelector('.section-progress-text').textContent = `${ef.activeCurrentSetNum} / ${ef.activeSetsCount}`;
    fixedRoot.appendChild(headerComp);

    window.updateProgress = () => {
        // Calculate global field progress (Required vs Optional)
        let totalReq = 0, completedReq = 0;
        let totalOpt = 0, completedOpt = 0;

        for (let p = 0; p < questionnaire.length; p++) {
            const page = questionnaire[p];
            if (!page.sets) continue;
            for (let s = 0; s < page.sets.length; s++) {
                const set = page.sets[s];
                if (set.exclude || set.skip) continue;

                if (!set.fields) continue;
                for (const field of set.fields) {
                    if (field.exclude || field.skip) continue;

                    // Check if field is required
                    const isRequired = !!field.required;
                    if (isRequired) totalReq++; else totalOpt++;

                    const val = responses[field.id];

                    // Check if value is truly filled (not just empty objects for groups)
                    let hasValue = val !== undefined && val !== '';
                    if (Array.isArray(val)) {
                        if (val.length === 0) {
                            hasValue = false;
                        } else if (field.type === 'group') {
                            // For groups, check if at least one item has actual data
                            hasValue = !val.every(item => {
                                if (!item || typeof item !== 'object') return true;
                                return Object.values(item).every(v => v === '' || v === null || v === undefined || v === false);
                            });
                        } else {
                            hasValue = true;
                        }
                    }

                    const hasError = window.fieldErrors[field.id];
                    // Deep check for group sub-errors?
                    const hasDeepError = hasError || (window.fieldErrors && Object.keys(window.fieldErrors).some(k => k.startsWith(field.id + '-')));

                    if (hasValue && !hasDeepError) {
                        if (isRequired) completedReq++; else completedOpt++;
                    }
                }
            }
        }

        const reqPercent = totalReq > 0 ? Math.round((completedReq / totalReq) * 100) : (totalReq === 0 ? 100 : 0);
        const optPercent = totalOpt > 0 ? Math.round((completedOpt / totalOpt) * 100) : 0;

        // Store for Header
        window.completedFields = completedReq + completedOpt;
        window.totalFields = totalReq + totalOpt;
        window.currentGlobalSetIndex = 0;

        // Calculate Section Statuses per Page
        const pagesProgress = [];
        let globalSetIdx = 0;
        let currentSectionStatus = 'pending';

        for (let p = 0; p < questionnaire.length; p++) {
            const pPage = questionnaire[p];
            const pageSections = [];

            for (let s = 0; s < pPage.sets.length; s++) {
                const pSet = pPage.sets[s];

                // Determine status
                let status = 'pending';
                const isActive = p === currentPageIndex && s === currentSetIndex;
                if (isActive) window.currentGlobalSetIndex = globalSetIdx;

                if (pSet.exclude || pSet.skip) {
                    status = isActive ? 'active-disabled' : 'disabled';
                    if (isActive) currentSectionStatus = 'disabled';
                } else {
                    const hasError = pSet.fields.some(f => {
                        if (f.exclude || f.skip) return false;
                        if (window.fieldErrors[f.id]) return true;
                        const prefix = f.id + '-';
                        return Object.keys(window.fieldErrors).some(k => k.startsWith(prefix));
                    });

                    // Helper to check if a value is truly empty (including groups with empty objects)
                    const isValueEmpty = (val, field) => {
                        if (val === undefined || val === '' || val === null) return true;
                        if (Array.isArray(val)) {
                            if (val.length === 0) return true;
                            // For group fields, check if all items are empty objects
                            if (field.type === 'group') {
                                return val.every(item => {
                                    if (!item || typeof item !== 'object') return true;
                                    return Object.values(item).every(v => v === '' || v === null || v === undefined || v === false);
                                });
                            }
                        }
                        return false;
                    };

                    let isCompleted = true;
                    let hasAnyData = false;

                    for (const f of pSet.fields) {
                        if (f.exclude || f.skip) continue;
                        const val = responses[f.id];
                        const fHasError = window.fieldErrors[f.id] || Object.keys(window.fieldErrors).some(k => k.startsWith(f.id + '-'));
                        if (fHasError) {
                            isCompleted = false;
                            break;
                        }
                        // Check if this field has data
                        if (!isValueEmpty(val, f)) {
                            hasAnyData = true;
                        }
                        // Use the helper to check if value is truly empty
                        if (f.required && isValueEmpty(val, f)) {
                            isCompleted = false;
                            break;
                        }
                    }

                    // Section is only complete if it has data OR all fields are optional and empty
                    if (isCompleted && !hasAnyData) {
                        // Check if section has any required fields
                        const hasRequiredFields = pSet.fields.some(f => !f.exclude && f.required);
                        if (!hasRequiredFields) {
                            // Optional-only section with no data is not complete
                            isCompleted = false;
                        }
                    }

                    if (isActive) {
                        status = hasError ? 'active-error' : 'active';
                        currentSectionStatus = hasError ? 'error' : (isCompleted ? 'completed' : 'pending');
                    } else {
                        if (hasError) {
                            status = 'error';
                        } else if (isCompleted) {
                            status = 'completed';
                        } else {
                            status = 'pending';
                        }
                    }
                }

                pageSections.push(status);
                globalSetIdx++;
            }
            pagesProgress.push({ sections: pageSections });
        }

        // Re-render Header to update stats
        const header = document.querySelector('header');
        if (header) {
            const efUpdate = getEffectiveCounts();
            // We only need to update the text content usually, but replacing is safer for state
            const newHeader = renderHeader(page, efUpdate.activeCurrentPageNum, efUpdate.activePagesCount, currentSectionStatus, set.exclude, toggleSectionExclusion);
            newHeader.querySelector('.section-progress-text').textContent = `${efUpdate.activeCurrentSetNum} / ${efUpdate.activeSetsCount}`;
            header.replaceWith(newHeader);
        }

        const progressBar = renderProgressBar(
            pagesProgress,
            reqPercent,
            optPercent
        );

        const existing = document.querySelector('#progress-root');
        if (existing) {
            existing.replaceWith(progressBar);
        } else {
            // Append to fixed container
            const fixedRoot = document.getElementById('fixed-header-root');
            if (fixedRoot) fixedRoot.appendChild(progressBar);
        }

        // Update pagination circle
        const paginationRoot = document.querySelector('#pagination-root');
        if (paginationRoot && paginationRoot.firstChild) {
            const pagination = renderPagination(
                () => navigate(-1),
                () => navigate(1),
                () => handleSubmit(),
                currentSectionStatus
            );
            paginationRoot.innerHTML = '';
            paginationRoot.appendChild(pagination);

            const hasVisibleErrors = document.querySelector('.text-red-500:not(.hidden)');
            const errorAlert = document.getElementById('pagination-error');
            if (hasVisibleErrors && errorAlert) {
                errorAlert.classList.remove('hidden');
            }
        }

        // Force update all field borders to reflect deep errors
        Object.values(fieldComponents).forEach(comp => {
            if (comp && typeof comp.updateBorder === 'function') {
                comp.updateBorder();
            }
        });

        // Update pagination section number square
        const paginationNumber = document.getElementById('pagination-section-number');
        if (paginationNumber) {
            paginationNumber.classList.remove('bg-red-500/10', 'border-red-500/30', 'text-red-400', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400', 'bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
            if (currentSectionStatus === 'error') {
                paginationNumber.classList.add('bg-red-500/10', 'border-red-500/30', 'text-red-400');
            } else if (currentSectionStatus === 'completed') {
                paginationNumber.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
            } else {
                paginationNumber.classList.add('bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
            }
        }
    };

    window.currentPageIndex = currentPageIndex;
    window.currentSetIndex = currentSetIndex;

    const container = document.createElement('div');
    container.className = 'max-w-3xl w-full mx-auto md:px-4 space-y-8';

    // Reset fieldComponents BEFORE creating new fields
    fieldComponents = {};

    set.fields.forEach((field, index) => {
        const fieldComp = renderField(
            field,
            responses[field.id] ?? '',
            (id, value) => {
                responses[id] = value;
                window.responses[id] = value;
                saveVersion({ ...responses });
            },
            '',
            !!set.exclude,
            !!field.exclude,
            (targetId) => toggleFieldExclusion(targetId || field.id),
            index + 1,
            !!field.skip,
            (targetId) => toggleFieldSkip(targetId || field.id)
        );
        fieldComponents[field.id] = fieldComp;
        container.appendChild(fieldComp);
    });

    app.appendChild(container);

    // Call updateProgress AFTER fields are created to initialize borders
    window.updateProgress();

    const totalPages = questionnaire.length;
    const totalSets = page.sets.length;

    const isLastPage = currentPageIndex === totalPages - 1;
    const isLastSet = currentSetIndex === totalSets - 1;
    window.isAtLastStep = isLastPage && isLastSet;
    window.isFirstStep = currentPageIndex === 0 && currentSetIndex === 0;

    const pagination = renderPagination(
        () => navigate(-1),
        () => navigate(1),
        () => handleSubmit(),
        'pending'
    );
    document.querySelector('#pagination-root').innerHTML = '';
    document.querySelector('#pagination-root').appendChild(pagination);

    const hasVisibleErrors = document.querySelector('.text-red-500:not(.hidden)');
    const errorAlert = document.getElementById('pagination-error');
    if (hasVisibleErrors && errorAlert) {
        errorAlert.classList.remove('hidden');
    }
}

function validateCurrent() {
    const set = getCurrentSet();
    if (!set) return false;

    if (set.exclude) {
        return true;
    }

    let allValid = true;
    set.fields.forEach(field => {
        if (field.exclude) return;

        const fieldComp = fieldComponents[field.id];
        if (fieldComp && typeof fieldComp.validate === 'function') {
            if (!fieldComp.validate()) {
                allValid = false;
            }
        }
    });
    return allValid;
}

function validateAll() {
    let firstInvalid = null;

    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        for (let s = 0; s < page.sets.length; s++) {
            const set = page.sets[s];
            if (set.exclude) continue;

            for (let f = 0; f < set.fields.length; f++) {
                const field = set.fields[f];
                if (field.exclude) continue;

                const fieldComp = renderField(field, responses[field.id] ?? '', () => { }, '', false, false, null);
                if (fieldComp.validate && !fieldComp.validate()) {
                    if (!firstInvalid) {
                        firstInvalid = { p, s };
                    }
                }
            }
        }
    }
    return firstInvalid;
}

function navigate(delta) {
    if (questionnaire.length === 0) return;

    if (delta === 1) {
        // Trigger validation to update UI and error states, but do NOT block navigation
        try {
            validateCurrent();
        } catch (e) { console.error(e); }

        currentSetIndex++;
        if (currentSetIndex >= questionnaire[currentPageIndex].sets.length) {
            currentSetIndex = 0;
            currentPageIndex++;
            if (currentPageIndex >= questionnaire.length) {
                currentPageIndex = questionnaire.length - 1;
                currentSetIndex = questionnaire[currentPageIndex].sets.length - 1;
                return;
            }
        }
    } else if (delta === -1) {
        currentSetIndex--;
        if (currentSetIndex < 0) {
            currentPageIndex--;
            if (currentPageIndex < 0) {
                currentPageIndex = 0;
                currentSetIndex = 0;
                return;
            }
            currentSetIndex = questionnaire[currentPageIndex].sets.length - 1;
        }
    }

    renderApp();
    window.scrollTo(0, 0);
}

async function handleSubmit() {
    const firstInvalid = validateAll();

    if (firstInvalid) {
        currentPageIndex = firstInvalid.p;
        currentSetIndex = firstInvalid.s;
        renderApp();

        setTimeout(() => {
            const firstError = document.querySelector('.text-red-500:not(.hidden)');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return;
    }

    const data = { ...responses };
    delete data._excludedSections;
    delete data._excludedFields;

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `questionnaire_response_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    responses = {};
    window.fieldErrors = {};
    // Reset exclusions in memory? Or reload?
    // Reloading is safer to reset state from server
    window.location.reload();
}

init();
