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

        const payload = {
            ...responses,
            _excludedSections,
            _excludedFields,
            _skippedSections,
            _skippedFields
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

            for (let p = 0; p < questionnaire.length; p++) {
                const page = questionnaire[p];
                if (!page.sets) continue;
                for (let s = 0; s < page.sets.length; s++) {
                    const set = page.sets[s];
                    set.exclude = !!savedExcludedSections[`${p}-${s}`];
                    set.skip = !!savedSkippedSections[`${p}-${s}`];
                    if (set.fields) {
                        for (const field of set.fields) {
                            field.exclude = !!savedExcludedFields[field.id];
                            field.skip = !!savedSkippedFields[field.id];
                        }
                    }
                }
            }

            window.fieldErrors = {};
            questionnaire.forEach(page => {
                (page.sets || []).forEach(set => {
                    if (set.exclude || set.skip) return;
                    (set.fields || []).forEach(field => {
                        if (field.exclude || field.skip) return;
                        const value = responses[field.id];
                        if (value !== undefined && value !== null && value !== '') {
                            const fakeOnSave = () => { };
                            const comp = renderField(field, value, fakeOnSave, '', false, false, null, null, false, null);
                            if (comp?.validate) comp.validate();
                        }
                    });
                });
            });

            for (let p = 0; p < questionnaire.length; p++) {
                const page = questionnaire[p];
                for (let s = 0; s < page.sets.length; s++) {
                    const set = page.sets[s];
                    if (set.exclude || set.skip) continue;
                    let setComplete = true;
                    for (let f = 0; f < set.fields.length; f++) {
                        const field = set.fields[f];
                        if (field.exclude || field.skip) continue;
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
    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        if (!page.sets) continue;
        for (let s = 0; s < page.sets.length; s++) {
            const set = page.sets[s];
            set.exclude = false;
            set.skip = false;
            if (set.fields) {
                for (const field of set.fields) {
                    resetFieldStateRecursive(field);
                }
            }
        }
    }
    window.fieldErrors = {};
}

function resetFieldStateRecursive(field) {
    field.exclude = false;
    field.skip = false;
    if (field.type === 'group' && field.group) {
        field.group.forEach(subField => resetFieldStateRecursive(subField));
    }
}

async function init() {
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
        saveVersion({ ...responses, _excludedSections, _excludedFields, _skippedSections, _skippedFields });
    });
}

function resetNavigation() {
    currentPageIndex = 0;
    currentSetIndex = 0;
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

function setFieldStateRecursive(field, excludeValue, skipValue) {
    field.exclude = excludeValue;
    field.skip = skipValue;
    if (excludeValue || skipValue) {
        delete responses[field.id];
        delete window.responses[field.id];
        clearErrorsFor(field.id);
    }
    if (field.type === 'group' && field.group) {
        field.group.forEach(subField => setFieldStateRecursive(subField, excludeValue, skipValue));
    }
}

function toggleSectionExclusion() {
    const set = getCurrentSet();
    if (!set) return;
    if (set.exclude) {
        set.exclude = false;
        set.skip = false;
        set.fields.forEach(f => setFieldStateRecursive(f, false, false));
    } else {
        set.exclude = true;
        set.fields.forEach(f => setFieldStateRecursive(f, true, false));
    }
    saveVersion({ ...responses });
    renderApp();
}

function toggleSectionSkip() {
    const set = getCurrentSet();
    if (!set) return;
    if (set.skip) {
        set.skip = false;
        set.exclude = false;
        set.fields.forEach(f => setFieldStateRecursive(f, false, false));
    } else {
        set.skip = true;
        set.fields.forEach(f => setFieldStateRecursive(f, false, true));
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
        setFieldStateRecursive(field, false, field.skip);
        set.exclude = false;
    } else {
        setFieldStateRecursive(field, true, false);
        const allExcluded = set.fields.every(f => f.exclude);
        if (allExcluded) set.exclude = true;
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
        setFieldStateRecursive(field, field.exclude, false);
        set.skip = false;
    } else {
        setFieldStateRecursive(field, false, true);
        const allSkipped = set.fields.every(f => f.skip);
        if (allSkipped) set.skip = true;
    }
    saveVersion({ ...responses });
    renderApp();
}

function getEffectiveCounts() {
    let activePagesCount = 0;
    let activeCurrentPageNum = 1;
    for (let p = 0; p < questionnaire.length; p++) {
        const page = questionnaire[p];
        const hasActiveSet = page.sets && page.sets.some(s => !(s.exclude || s.skip));
        if (hasActiveSet) {
            activePagesCount++;
            if (p === currentPageIndex) activeCurrentPageNum = activePagesCount;
        }
    }

    let activeSetsCount = 0;
    let activeCurrentSetNum = 1;
    if (questionnaire[currentPageIndex]) {
        const page = questionnaire[currentPageIndex];
        if (page.sets) {
            for (let s = 0; s < page.sets.length; s++) {
                if (!(page.sets[s].exclude || page.sets[s].skip)) {
                    activeSetsCount++;
                    if (s === currentSetIndex) activeCurrentSetNum = activeSetsCount;
                }
            }
        }
    }

    return {
        activePagesCount,
        activeCurrentPageNum,
        activeSetsCount: activeSetsCount || 1,
        activeCurrentSetNum
    };
}

function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.style.paddingTop = '240px';
    app.style.paddingBottom = '90px';

    let fixedRoot = document.getElementById('fixed-header-root');
    if (!fixedRoot) {
        fixedRoot = document.createElement('div');
        fixedRoot.id = 'fixed-header-root';
        fixedRoot.className = 'fixed top-0 left-0 right-0 z-50 flex flex-col';
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
    const isDisabled = set.exclude || set.skip;
    const headerComp = renderHeader(page, ef.activeCurrentPageNum, ef.activePagesCount, 'pending', isDisabled, toggleSectionExclusion);
    headerComp.querySelector('.section-progress-text').textContent = `${ef.activeCurrentSetNum} / ${ef.activeSetsCount}`;
    fixedRoot.appendChild(headerComp);

    window.updateProgress = () => {
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
                    const isRequired = !!field.required;
                    if (isRequired) totalReq++; else totalOpt++;
                    const val = responses[field.id];
                    let hasValue = val !== undefined && val !== '';
                    if (Array.isArray(val)) {
                        if (val.length === 0) hasValue = false;
                        else if (field.type === 'group') {
                            hasValue = !val.every(item => {
                                if (!item || typeof item !== 'object') return true;
                                return Object.values(item).every(v => v === '' || v === null || v === undefined || v === false);
                            });
                        }
                    }
                    const hasError = window.fieldErrors[field.id] || Object.keys(window.fieldErrors).some(k => k.startsWith(field.id + '-'));
                    if (hasValue && !hasError) {
                        if (isRequired) completedReq++; else completedOpt++;
                    }
                }
            }
        }

        const reqPercent = totalReq > 0 ? Math.round((completedReq / totalReq) * 100) : 100;
        const optPercent = totalOpt > 0 ? Math.round((completedOpt / totalOpt) * 100) : 0;

        window.completedFields = completedReq + completedOpt;
        window.totalFields = totalReq + totalOpt;

        const pagesProgress = [];
        let globalSetIdx = 0;
        let currentSectionStatus = 'pending';

        for (let p = 0; p < questionnaire.length; p++) {
            const pPage = questionnaire[p];
            const pageSections = [];
            for (let s = 0; s < pPage.sets.length; s++) {
                const pSet = pPage.sets[s];
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
                        return Object.keys(window.fieldErrors).some(k => k.startsWith(f.id + '-'));
                    });

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
                        if (!isValueEmpty(val, f)) hasAnyData = true;
                        if (f.required && isValueEmpty(val, f)) {
                            isCompleted = false;
                            break;
                        }
                    }
                    if (isCompleted && !hasAnyData) {
                        const hasRequired = pSet.fields.some(f => !(f.exclude || f.skip) && f.required);
                        if (!hasRequired) isCompleted = false;
                    }

                    if (isActive) {
                        status = hasError ? 'active-error' : 'active';
                        currentSectionStatus = hasError ? 'error' : (isCompleted ? 'completed' : 'pending');
                    } else {
                        status = hasError ? 'error' : (isCompleted ? 'completed' : 'pending');
                    }
                }
                pageSections.push(status);
                globalSetIdx++;
            }
            pagesProgress.push({ sections: pageSections });
        }

        const header = document.querySelector('header');
        if (header) {
            const efUpdate = getEffectiveCounts();
            const newHeader = renderHeader(page, efUpdate.activeCurrentPageNum, efUpdate.activePagesCount, currentSectionStatus, isDisabled, toggleSectionExclusion);
            newHeader.querySelector('.section-progress-text').textContent = `${efUpdate.activeCurrentSetNum} / ${efUpdate.activeSetsCount}`;
            header.replaceWith(newHeader);
        }

        const progressBar = renderProgressBar(pagesProgress, reqPercent, optPercent);
        const existing = document.querySelector('#progress-root');
        if (existing) existing.replaceWith(progressBar);
        else fixedRoot.appendChild(progressBar);

        const paginationRoot = document.querySelector('#pagination-root');
        if (paginationRoot) {
            const pagination = renderPagination(
                () => navigate(-1),
                () => navigate(1),
                () => handleSubmit(),
                currentSectionStatus
            );
            paginationRoot.innerHTML = '';
            paginationRoot.appendChild(pagination);
            const errorAlert = document.getElementById('pagination-error');
            const hasVisibleErrors = document.querySelector('.text-red-500:not(.hidden)');
            if (hasVisibleErrors && errorAlert) errorAlert.classList.remove('hidden');
        }

        Object.values(fieldComponents).forEach(comp => {
            if (comp && typeof comp.updateBorder === 'function') comp.updateBorder();
        });

        const paginationNumber = document.getElementById('pagination-section-number');
        if (paginationNumber) {
            paginationNumber.className = 'flex-shrink-0 size-10 rounded-lg border flex items-center justify-center mr-5 text-lg font-medium transition-colors duration-300';
            if (currentSectionStatus === 'error') {
                paginationNumber.classList.add('bg-red-500/10', 'border-red-500/30', 'text-red-400');
            } else if (currentSectionStatus === 'completed') {
                paginationNumber.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
            } else {
                paginationNumber.classList.add('bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
            }
        }
    };

    function isValueEmpty(val, field) {
        if (val === undefined || val === '' || val === null) return true;
        if (Array.isArray(val)) {
            if (val.length === 0) return true;
            if (field.type === 'group') {
                return val.every(item => {
                    if (!item || typeof item !== 'object') return true;
                    return Object.values(item).every(v => v === '' || v === null || v === undefined || v === false);
                });
            }
        }
        return false;
    }

    window.currentPageIndex = currentPageIndex;
    window.currentSetIndex = currentSetIndex;

    const container = document.createElement('div');
    container.className = 'max-w-3xl w-full mx-auto sm:px-4 sm:space-y-8';
    fieldComponents = {};

    set.fields.forEach((field, index) => {
        const isSectionDisabled = set.exclude || set.skip;
        const fieldComp = renderField(
            field,
            responses[field.id] ?? '',
            (id, value) => {
                responses[id] = value;
                window.responses[id] = value;
                saveVersion({ ...responses });
            },
            '',
            isSectionDisabled,
            field.exclude,
            (targetId) => toggleFieldExclusion(targetId || field.id),
            index + 1,
            field.skip,
            (targetId) => toggleFieldSkip(targetId || field.id)
        );
        fieldComponents[field.id] = fieldComp;
        container.appendChild(fieldComp);
    });

    app.appendChild(container);
    window.updateProgress();

    const totalPages = questionnaire.length;
    const totalSets = page.sets.length;
    window.isAtLastStep = currentPageIndex === totalPages - 1 && currentSetIndex === totalSets - 1;
    window.isFirstStep = currentPageIndex === 0 && currentSetIndex === 0;

    const pagination = renderPagination(
        () => navigate(-1),
        () => navigate(1),
        () => handleSubmit(),
        'pending'
    );
    document.querySelector('#pagination-root').innerHTML = '';
    document.querySelector('#pagination-root').appendChild(pagination);

    const errorAlert = document.getElementById('pagination-error');
    const hasVisibleErrors = document.querySelector('.text-red-500:not(.hidden)');
    if (hasVisibleErrors && errorAlert) errorAlert.classList.remove('hidden');
}

function validateCurrent() {
    const set = getCurrentSet();
    if (!set || set.exclude || set.skip) return true;
    let allValid = true;
    set.fields.forEach(field => {
        if (field.exclude || field.skip) return;
        const comp = fieldComponents[field.id];
        if (comp && typeof comp.validate === 'function') {
            if (!comp.validate()) allValid = false;
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
            if (set.exclude || set.skip) continue;
            for (let f = 0; f < set.fields.length; f++) {
                const field = set.fields[f];
                if (field.exclude || field.skip) continue;
                const comp = renderField(field, responses[field.id] ?? '', () => { }, '', false, false, null, null, false, null);
                if (comp.validate && !comp.validate()) {
                    if (!firstInvalid) firstInvalid = { p, s };
                }
            }
        }
    }
    return firstInvalid;
}

function navigate(delta) {
    if (questionnaire.length === 0) return;
    if (delta === 1) {
        validateCurrent();
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
            if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
    }

    const structured = {};
    questionnaire.forEach(page => {
        const pageData = {};
        (page.sets || []).forEach(set => {
            const setData = {};
            (set.fields || []).forEach(field => {
                if (field.exclude || field.skip) return;
                if (responses.hasOwnProperty(field.id)) {
                    setData[field.id] = responses[field.id];
                }
            });
            if (Object.keys(setData).length > 0) {
                pageData[set.id] = setData;
            }
        });
        if (Object.keys(pageData).length > 0) {
            structured[page.id] = pageData;
        }
    });

    const downloadData = {
        submitted_at: new Date().toISOString(),
        responses: structured,
        _excludedSections: responses._excludedSections || {},
        _excludedFields: responses._excludedFields || {},
        _skippedSections: responses._skippedSections || {},
        _skippedFields: responses._skippedFields || {}
    };

    const jsonStr = JSON.stringify(downloadData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questionnaire_response_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    fetch('/api/reset', { method: 'POST' }).finally(() => window.location.reload());
}

init();