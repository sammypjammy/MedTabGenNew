const themeController = {
  storageKey: 'med-tabs-theme',

  getInitialTheme() {
    try {
      const savedTheme = window.localStorage.getItem(this.storageKey);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (error) {
      // The theme still works when storage is unavailable.
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  apply(theme, persist = false) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = theme;

    const toggle = document.getElementById('themeToggle');
    const label = document.getElementById('themeLabel');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    }
    if (label) {
      label.textContent = `${isDark ? 'Dark' : 'Light'} mode`;
    }

    if (persist) {
      try {
        window.localStorage.setItem(this.storageKey, theme);
      } catch (error) {
        // Ignore storage failures without interrupting the UI.
      }
    }
  },

  toggle() {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    this.apply(nextTheme, true);
  }
};

themeController.apply(themeController.getInitialTheme());

const ui = {
  inputText: document.getElementById('inputText'),
  generateBtn: document.getElementById('generateBtn'),
  statusMessage: document.getElementById('statusMessage'),
  resultsContainer: document.getElementById('resultsContainer'),
  resultCount: document.getElementById('resultCount'),
  greenCount: document.getElementById('greenCount'),
  yellowCount: document.getElementById('yellowCount'),
  redCount: document.getElementById('redCount'),
  copyBlankTemplateBtn: document.getElementById('copyBlankTemplateBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  toastContainer: document.getElementById('toastContainer'),
  outputPanel: document.querySelector('.output-panel')
};

const BLANK_MED_TAB_TEMPLATE = [
  'NAME, ADDRESS, PHONE NUMBER, FAX NUMBER:',
  '',
  '',
  'DOCTORS:',
  '',
  '',
  'TREATMENT RANGE: (FV, LV, OR ONGOING)',
  'FV',
  'LV',
  'NV',
  '',
  'CS TREATMENT LOG:',
  '',
  'NOTES: (IMPORTANT TESTS, SURGERIES, HOSPITALIZATIONS)'
].join('\n');

const toastNotifications = {
  duration: 2500,

  show(message, variant = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${variant}`;
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    ui.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, this.duration);
  }
};

const parser = {
  parseIntakeText(rawText) {
    const normalized = rawText.replace(/\r\n?/g, '\n').trim();

    if (!normalized) {
      return [];
    }

    const lines = normalized.split('\n').map((line) => line.trim());

    if (!lines.length) {
      return [];
    }

    const blocks = [];
    let currentBlock = [];
    let labelsInBlock = new Set();
    let separatedByBlankLine = false;

    const pushBlock = () => {
      if (currentBlock.length) {
        blocks.push(currentBlock);
      }
      currentBlock = [];
      labelsInBlock = new Set();
    };

    lines.forEach((line) => {
      if (!line) {
        separatedByBlankLine = currentBlock.length > 0;
        return;
      }

      if (parser.isProviderHeading(line)) {
        const hasClinicData = currentBlock.some((blockLine) => parser.getLineLabel(blockLine) === 'clinic name');
        if (hasClinicData) {
          pushBlock();
        } else {
          currentBlock = [];
          labelsInBlock = new Set();
        }
        separatedByBlankLine = false;
        return;
      }

      const isContactHeading = /^\**\s*name\s*\/\s*address\s*\/\s*phone\s*\/\s*fax\s*:?\s*\**$/i.test(line);
      const blockHasContactHeading = currentBlock.some((blockLine) =>
        /^\**\s*name\s*\/\s*address\s*\/\s*phone\s*\/\s*fax\s*:?\s*\**$/i.test(blockLine)
      );
      if (isContactHeading && blockHasContactHeading) {
        pushBlock();
      }

      const label = parser.getLineLabel(line);
      const clinicLabels = ['clinic name', 'clinic', 'practice name', 'practice', 'facility name', 'facility'];
      const repeatsClinicName =
        clinicLabels.includes(label) && clinicLabels.some((clinicLabel) => labelsInBlock.has(clinicLabel));
      const startsSeparatedProvider =
        separatedByBlankLine &&
        (label === 'provider name' || label === 'provider') &&
        (labelsInBlock.has('provider name') || labelsInBlock.has('provider'));

      if (repeatsClinicName || startsSeparatedProvider) {
        pushBlock();
      }

      currentBlock.push(line);
      if (label) {
        labelsInBlock.add(label);
      }
      separatedByBlankLine = false;
    });

    pushBlock();

    return blocks.map((block, index) => {
      const { fields, notes } = parser.extractPdfFields(block);
      const title = fields.name || fields.doctor || notes[0] || `Provider ${index + 1}`;
      const specialty = fields.specialty || 'Medical Provider';

      return {
        id: index + 1,
        title,
        specialty,
        rawText: block.join('\n'),
        notes,
        fields
      };
    });
  },

  isProviderHeading(line) {
    const cleaned = parser.cleanLine(line);
    return /^(?:provider|clinic|practice)\s*(?:#\s*)?\d+\s*[:\-\u2013\u2014]?$|^provider\s*[:\-\u2013\u2014]?$/i.test(cleaned);
  },

  cleanLine(line) {
    return String(line || '')
      .replace(/\*\*/g, '')
      .replace(/\\_/g, '_')
      .replace(/^[\s\-*\u2022\u25aa\u25e6]+/, '')
      .trim();
  },

  getLineLabel(line) {
    const cleaned = parser.cleanLine(line);
    const match = cleaned.match(/^(clinic name|clinic|provider name|provider|practice name|practice|facility name|facility|doctor name|doctors?|physician name|physician|street address|address|location|phone number|phone|telephone|tel|fax number|fax|specialty|name)\b/i);
    return match ? match[1].toLowerCase() : null;
  },

  normalizeLabel(label) {
    const normalized = label.trim().toLowerCase();
    const aliases = {
      'clinic name': 'name',
      'clinic': 'name',
      'provider name': 'name',
      'practice name': 'name',
      'practice': 'name',
      'facility name': 'name',
      'facility': 'name',
      'name': 'name',
      'address': 'address',
      'street address': 'address',
      'phone number': 'phone',
      'phone': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      'fax': 'fax',
      'fax number': 'fax',
      'specialty': 'specialty',
      'fv': 'fv',
      'first visit': 'fv',
      'lv': 'lv',
      'last visit': 'lv',
      'nv': 'nv',
      'next visit': 'nv',
      'doctor': 'doctor',
      'doctor name': 'doctor',
      'doctors': 'doctor',
      'physician': 'doctor',
      'physician name': 'doctor',
      'location': 'address',
      'provider': 'name',
      'provider details': 'name'
    };

    return aliases[normalized] || null;
  },

  extractPdfFields(lines) {
    const fields = {};
    const notes = [];
    const parts = {
      name: [],
      doctorFirst: [],
      doctorLast: [],
      phone: [],
      address: [],
      city: '',
      state: '',
      zipcode: ''
    };
    let activeField = null;

    const isProvided = (value) => {
      const normalized = String(value || '').trim();
      return normalized && !/^(?:not provided|n\/?a|none|\.)$/i.test(normalized);
    };

    const addPart = (key, value, separator = ' ') => {
      const cleanedValue = String(value || '').trim();
      if (!isProvided(cleanedValue)) {
        return;
      }
      if (separator === '') {
        const previous = parts[key].pop() || '';
        parts[key].push(`${previous}${cleanedValue}`);
      } else {
        parts[key].push(cleanedValue);
      }
    };

    lines.map(parser.cleanLine).filter(Boolean).forEach((line) => {
      if (/^(?:medical providers|clinic\s*\d+|\d+\/\d+\/\d+.*intake form|https?:\/\/)/i.test(line)) {
        activeField = null;
        return;
      }

      let match = line.match(/^clinic name\s*:\s*(.*)$/i);
      if (match) {
        addPart('name', match[1]);
        activeField = 'name';
        return;
      }

      match = line.match(/^doctor first name\s*:\s*(.*)$/i);
      if (match) {
        addPart('doctorFirst', match[1]);
        activeField = 'doctorFirst';
        return;
      }

      match = line.match(/^doctor last name\s*:\s*(.*?)\s+phone number\s*:\s*(.*)$/i);
      if (match) {
        addPart('doctorLast', match[1]);
        addPart('phone', match[2]);
        activeField = 'phone';
        return;
      }

      match = line.match(/^doctor last name\s*:\s*(.*)$/i);
      if (match) {
        addPart('doctorLast', match[1]);
        activeField = 'doctorLast';
        return;
      }

      match = line.match(/^phone number\s*:\s*(.*)$/i);
      if (match) {
        addPart('phone', match[1]);
        activeField = 'phone';
        return;
      }

      if (/^address 2\s*:/i.test(line)) {
        activeField = null;
        return;
      }

      match = line.match(/^address\s*:\s*(.*)$/i);
      if (match) {
        addPart('address', match[1]);
        activeField = 'address';
        return;
      }

      match = line.match(/^city\s*:\s*(.*?)\s+state\s*:\s*(.*)$/i);
      if (match) {
        parts.city = isProvided(match[1]) ? match[1].trim() : '';
        parts.state = isProvided(match[2]) ? match[2].trim() : '';
        activeField = null;
        return;
      }

      match = line.match(/^zipcode\s*:\s*(.*)$/i);
      if (match) {
        parts.zipcode = isProvided(match[1]) ? match[1].trim() : '';
        activeField = null;
        return;
      }

      match = line.match(/^first visit date\s*:\s*(.*?)\s+last visit date\s*:\s*(.*)$/i);
      if (match) {
        fields.fv = isProvided(match[1]) ? match[1].trim() : '';
        fields.lv = isProvided(match[2]) ? match[2].trim() : '';
        activeField = null;
        return;
      }

      match = line.match(/^first visit date\s*:\s*(.*)$/i);
      if (match) {
        fields.fv = isProvided(match[1]) ? match[1].trim() : '';
        activeField = null;
        return;
      }

      match = line.match(/^last visit date\s*:\s*(.*)$/i);
      if (match) {
        fields.lv = isProvided(match[1]) ? match[1].trim() : '';
        activeField = null;
        return;
      }

      match = line.match(/^next visit date\s*:\s*(.*)$/i);
      if (match) {
        fields.nv = isProvided(match[1]) ? match[1].trim() : '';
        activeField = null;
        return;
      }

      if (/^notes\s*:/i.test(line)) {
        activeField = null;
        return;
      }

      if (activeField === 'phone') {
        addPart('phone', line, '');
      } else if (activeField && Array.isArray(parts[activeField])) {
        addPart(activeField, line);
      }
    });

    fields.name = parts.name.join(' ').replace(/\s+/g, ' ').trim();
    fields.doctor = [...parts.doctorFirst, ...parts.doctorLast].join(' ').replace(/\s+/g, ' ').trim();
    fields.phone = parts.phone.join('').replace(/\s+/g, ' ').trim();

    const cityState = [parts.city, parts.state].filter(Boolean).join(', ');
    const locality = [cityState, parts.zipcode].filter(Boolean).join(' ');
    fields.streetAddress = parts.address.join(' ').replace(/\s+/g, ' ').trim();
    fields.city = parts.city;
    fields.state = parts.state;
    fields.zipcode = parts.zipcode;
    fields.address = [fields.streetAddress, locality].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();

    return { fields, notes };
  },

  extractFields(lines) {
    const fields = {};
    const notes = [];
    let pendingLabel = null;
    let section = null;

    lines.forEach((line) => {
      if (!line) {
        return;
      }

      const trimmed = line.replace(/^[-•*]\s*/, '').trim();

      const cleaned = trimmed
        .replace(/\*\*/g, '')
        .replace(/^[\s\-*\u2022\u25aa\u25e6]+/, '')
        .trim();

      if (/^name\s*\/\s*address\s*\/\s*phone\s*\/\s*fax:?$/i.test(cleaned)) {
        section = 'contact';
        pendingLabel = null;
        return;
      }
      if (/^doctors?:?$/i.test(cleaned)) {
        section = 'doctors';
        pendingLabel = null;
        return;
      }
      if (/^treatment range:?$/i.test(cleaned)) {
        section = 'treatment';
        pendingLabel = null;
        return;
      }
      if (/^cs treatment log:?$/i.test(cleaned)) {
        section = 'treatment-log';
        pendingLabel = null;
        return;
      }
      if (/^notes:?$/i.test(cleaned)) {
        section = 'notes';
        pendingLabel = null;
        return;
      }

      if (/^\(.*remain empty.*\)$/i.test(cleaned)) {
        return;
      }

      const treatmentMatch = cleaned.match(/^(fv|first visit|lv|last visit|nv|next visit)\b\s*:?\s*(.*)$/i);
      if (treatmentMatch) {
        const treatmentKeys = {
          fv: 'fv',
          'first visit': 'fv',
          lv: 'lv',
          'last visit': 'lv',
          nv: 'nv',
          'next visit': 'nv'
        };
        fields[treatmentKeys[treatmentMatch[1].toLowerCase()]] = treatmentMatch[2].trim();
        pendingLabel = null;
        return;
      }

      if (section === 'treatment-log' || section === 'notes') {
        return;
      }

      if (pendingLabel) {
        fields[pendingLabel] = cleaned;
        pendingLabel = null;
        return;
      }

      if (section === 'doctors' && !parser.getLineLabel(cleaned)) {
        fields.doctor = fields.doctor ? `${fields.doctor}\n${cleaned}` : cleaned;
        return;
      }

      if (section === 'contact' && !parser.getLineLabel(cleaned)) {
        const nextContactField = ['name', 'address', 'phone', 'fax'].find((key) => !fields[key]);
        if (nextContactField) {
          fields[nextContactField] = cleaned;
          return;
        }
      }
      const labelOnlyMatch = cleaned.match(/^([A-Za-z ]+?)\s*[:\-\u2013\u2014]\s*$/);
      if (labelOnlyMatch) {
        let key = parser.normalizeLabel(labelOnlyMatch[1]);
        if (['provider name', 'provider'].includes(labelOnlyMatch[1].trim().toLowerCase()) && fields.name) {
          key = 'doctor';
        }
        if (key) {
          pendingLabel = key;
          return;
        }
      }

      const directMatch = cleaned.match(/^([A-Za-z .,'/&()]+?)\s*[:\-\u2013\u2014]\s*(.+)$/);
      if (directMatch) {
        let key = parser.normalizeLabel(directMatch[1]);
        if (['provider name', 'provider'].includes(directMatch[1].trim().toLowerCase()) && fields.name) {
          key = 'doctor';
        }

        if (key) {
          fields[key] = directMatch[2].trim();
          pendingLabel = null;
        } else {
          notes.push(cleaned);
          pendingLabel = null;
        }
        return;
      }

      const inlineMatch = cleaned.match(/^(clinic name|clinic|provider name|provider|practice name|practice|facility name|facility|doctor name|doctors?|physician name|physician|street address|address|location|phone number|phone|telephone|tel|fax number|fax|specialty|name)\b\s*(.*)$/i);
      if (inlineMatch) {
        let key = parser.normalizeLabel(inlineMatch[1]);
        if (['provider name', 'provider'].includes(inlineMatch[1].trim().toLowerCase()) && fields.name) {
          key = 'doctor';
        }
        if (key) {
          const value = inlineMatch[2].replace(/^\s*[:\-\u2013\u2014]\s*/, '').trim();
          if (value) {
            fields[key] = value;
            pendingLabel = null;
          } else {
            pendingLabel = key;
          }
        }
        return;
      }

      notes.push(cleaned);
    });

    return { fields, notes };
  }
};

const providerValidator = {
  validate(provider) {
    const fields = provider.fields || {};
    const criticalMissing = [];
    const otherMissing = [];
    const hasClinicName = this.hasValue(fields.name);
    const hasDoctorName = this.hasValue(fields.doctor);
    const phoneStatus = this.validatePhone(fields.phone);

    if (phoneStatus === 'missing') {
      criticalMissing.push('Phone number');
    } else if (phoneStatus === 'invalid') {
      criticalMissing.push('Invalid phone number');
    }
    if (!hasClinicName && !hasDoctorName) {
      criticalMissing.push('Clinic name and doctor name');
    }

    const addressChecks = this.getAddressChecks(fields);
    if (!addressChecks.streetAddress) otherMissing.push('Street address');
    if (!addressChecks.city) otherMissing.push('City');
    if (!addressChecks.state) otherMissing.push('State');
    if (!addressChecks.zipcode) otherMissing.push('ZIP code');
    if (!this.hasValue(fields.fv)) otherMissing.push('First Visit Date');
    if (!this.hasValue(fields.lv)) otherMissing.push('Last Visit Date');

    const missing = [...criticalMissing, ...otherMissing];
    const level = criticalMissing.length ? 'critical' : otherMissing.length ? 'warning' : 'complete';
    const labels = {
      critical: 'Critical information missing',
      warning: 'Information missing',
      complete: 'Complete'
    };

    return {
      level,
      label: labels[level],
      missing,
      summary: missing.length ? `Missing: ${missing.join(', ')}` : ''
    };
  },

  hasValue(value) {
    return Boolean(String(value || '').trim()) && !/^(?:not provided|n\/?a|none|\.)$/i.test(String(value).trim());
  },

  validatePhone(value) {
    const phone = String(value ?? '').trim();
    if (!phone) {
      return 'missing';
    }

    if (!/^[+\d\s().-]+$/.test(phone)) {
      return 'invalid';
    }

    if (phone.includes('+') && !/^\+1/.test(phone)) {
      return 'invalid';
    }

    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.slice(1);
    }

    return digits.length === 10 ? 'valid' : 'invalid';
  },

  getAddressChecks(fields) {
    const address = String(fields.address || '').trim();
    const hasStructuredParts = ['streetAddress', 'city', 'state', 'zipcode'].some((key) =>
      Object.prototype.hasOwnProperty.call(fields, key)
    );

    if (hasStructuredParts) {
      return {
        streetAddress: this.hasValue(fields.streetAddress),
        city: this.hasValue(fields.city),
        state: this.hasValue(fields.state),
        zipcode: this.hasValue(fields.zipcode)
      };
    }

    return {
      streetAddress: this.hasValue(address),
      city: /,\s*[^,]+,\s*[A-Z]{2}\b/i.test(address),
      state: /,\s*[A-Z]{2}\b/i.test(address),
      zipcode: /\b\d{5}(?:-\d{4})?\b/.test(address)
    };
  }
};

const validationSummaryCounters = {
  summarize(providers) {
    return providers.reduce((summary, provider) => {
      const { level } = providerValidator.validate(provider);
      summary.providers += 1;
      if (level === 'complete') summary.complete += 1;
      if (level === 'warning') summary.warning += 1;
      if (level === 'critical') summary.critical += 1;
      return summary;
    }, { providers: 0, complete: 0, warning: 0, critical: 0 });
  },

  update(providers) {
    const summary = this.summarize(providers);
    this.setCounter(ui.resultCount, summary.providers, summary.providers === 1 ? 'Provider' : 'Providers');
    this.setCounter(ui.greenCount, summary.complete, 'Green', true);
    this.setCounter(ui.yellowCount, summary.warning, 'Yellow', true);
    this.setCounter(ui.redCount, summary.critical, 'Red', true);
    return summary;
  },

  setCounter(element, count, label, hideWhenZero = false) {
    element.textContent = `${count} ${label}`;
    element.hidden = hideWhenZero && count === 0;
    element.dataset.count = String(count);
  }
};

const formatter = {
  formatProviderTab(provider) {
    const address = formatter.normalizeAddress(provider.fields?.address);
    const doctorName = provider.fields?.doctor || '';
    const firstVisit = formatter.normalizeVisitDate(provider.fields?.fv);
    const lastVisit = formatter.normalizeVisitDate(provider.fields?.lv);
    const nextVisit = formatter.normalizeVisitDate(provider.fields?.nv);

    const detailsLines = [
      provider.fields?.name || '',
      address || '',
      provider.fields?.phone || '',
      provider.fields?.fax || ''
    ].filter(Boolean);

    const sections = [
      'NAME/ADDRESS/PHONE/FAX:',
      ...detailsLines,
      '',
      'DOCTORS',
      doctorName || '',
      '',
      'TREATMENT RANGE',
      `FV:${firstVisit ? ` ${firstVisit}` : ''}`,
      `LV:${lastVisit ? ` ${lastVisit}` : ''}`,
      `NV:${nextVisit ? ` ${nextVisit}` : ''}`,
      '',
      'CS TREATMENT LOG',
      '',
      'NOTES',
      ''
    ];

    return sections.join('\n');
  },

  normalizeAddress(address) {
    if (!address) {
      return '';
    }

    return address
      .replace(/\s+/g, ' ')
      .replace(/,\s*/g, ', ')
      .trim();
  },

  normalizeVisitDate(date) {
    if (!date || /^(?:not provided|n\/?a|none)$/i.test(date.trim())) {
      return '';
    }

    const match = date.trim().match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
    return match ? `${match[1].padStart(2, '0')}/${match[2]}` : date.trim();
  }
};

const expandableProviderRow = {
  render(provider) {
    const formattedText = formatter.formatProviderTab(provider);
    const validation = providerValidator.validate(provider);
    const statusLabels = {
      complete: 'Complete',
      warning: 'Yellow',
      critical: 'Red'
    };
    const rowId = `provider-${provider.id}`;
    const detailsId = `${rowId}-details`;
    const titleId = `${rowId}-title`;

    return `
      <article class="provider-card provider-row status-${validation.level}" data-id="${provider.id}">
        <div class="provider-summary">
          <button class="provider-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-action="toggle-provider">
            <span class="provider-chevron" aria-hidden="true">&#8250;</span>
            <span id="${titleId}" class="provider-name" title="${escapeHtml(provider.title)}">${escapeHtml(provider.title)}</span>
            <span class="status-badge status-badge-${validation.level}">${statusLabels[validation.level]}</span>
          </button>
          <button class="ghost-btn row-copy-btn" type="button" data-action="copy" aria-label="Copy Med Tab for ${escapeHtml(provider.title)}">Copy</button>
        </div>
        <div id="${detailsId}" class="provider-details" role="region" aria-labelledby="${titleId}" hidden>
          ${validation.summary ? `<p class="missing-summary">${escapeHtml(validation.summary)}</p>` : ''}
          <pre class="medtab-output">${escapeHtml(formattedText)}</pre>
        </div>
      </article>
    `;
  },

  toggle(summaryRow) {
    const card = summaryRow.closest('.provider-row');
    const details = card?.querySelector('.provider-details');
    if (!card || !details) {
      return;
    }

    const isExpanded = summaryRow.getAttribute('aria-expanded') === 'true';
    summaryRow.setAttribute('aria-expanded', String(!isExpanded));
    details.hidden = isExpanded;
    card.classList.toggle('is-expanded', !isExpanded);
  }
};

const uiActions = {
  setLoading(isLoading) {
    ui.generateBtn.disabled = isLoading;
    ui.generateBtn.innerHTML = isLoading
      ? '<span class="spinner"></span>Generating...'
      : 'Generate Med Tabs';

    ui.generateBtn.classList.toggle('is-loading', isLoading);
  },

  setStatus(message, variant = '') {
    ui.statusMessage.textContent = message;
    ui.statusMessage.className = `status-message ${variant}`.trim();
  },

  renderResults(providers, emptyMode = 'no-results') {
    validationSummaryCounters.update(providers);
    ui.clearAllBtn.disabled = providers.length === 0 && !ui.inputText.value;

    if (!providers.length) {
      const isReady = emptyMode === 'ready';
      ui.resultsContainer.innerHTML = `
        <div class="empty-state">
          <h3>${isReady ? 'Ready to generate' : 'No providers found'}</h3>
          <p>${isReady ? 'Paste intake text from one or more providers and generate polished output cards.' : 'Paste more detailed intake text and try again.'}</p>
        </div>
      `;
      return;
    }

    const cards = providers.map((provider) => expandableProviderRow.render(provider));

    ui.resultsContainer.innerHTML = cards.join('');
  },

  clearAll() {
    ui.inputText.value = '';
    uiActions.renderResults([], 'ready');
    uiActions.setStatus('Paste a provider intake block to begin.', '');
    ui.inputText.focus();
    toastNotifications.show('Everything cleared');
  },

  handleGenerate() {
    const rawText = ui.inputText.value.trim();

    if (!rawText) {
      uiActions.setStatus('Please paste intake text before generating.', 'error');
      toastNotifications.show('Generation failed: no input provided', 'error');
      return;
    }

    uiActions.setStatus('Analyzing intake text...', '');
    uiActions.setLoading(true);

    window.setTimeout(() => {
      try {
        const providers = parser.parseIntakeText(rawText).map((provider) => ({
          ...provider,
          formattedText: formatter.formatProviderTab(provider)
        }));

        uiActions.renderResults(providers);
        uiActions.setStatus(providers.length ? `Generated ${providers.length} provider tab${providers.length > 1 ? 's' : ''}.` : 'No provider tabs were generated.', providers.length ? 'success' : '');
        toastNotifications.show(
          providers.length ? `Generated ${providers.length} provider${providers.length === 1 ? '' : 's'}` : 'No providers detected',
          providers.length ? 'success' : 'warning'
        );
        ui.outputPanel.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        uiActions.setStatus('Provider generation failed. Please check the intake text and try again.', 'error');
        toastNotifications.show('Provider generation failed', 'error');
      } finally {
        uiActions.setLoading(false);
      }
    }, 600);
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

ui.generateBtn.addEventListener('click', uiActions.handleGenerate);
ui.clearAllBtn.addEventListener('click', uiActions.clearAll);
ui.copyBlankTemplateBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(BLANK_MED_TAB_TEMPLATE);
    toastNotifications.show('Blank template copied');
  } catch (error) {
    toastNotifications.show('Blank template could not be copied', 'error');
  }
});
document.getElementById('themeToggle').addEventListener('click', () => themeController.toggle());

ui.inputText.addEventListener('input', () => {
  const hasCards = Boolean(ui.resultsContainer.querySelector('.provider-card'));
  ui.clearAllBtn.disabled = !ui.inputText.value && !hasCards;
});

ui.inputText.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    uiActions.handleGenerate();
  }
});

ui.resultsContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');

  if (!button) {
    return;
  }

  const action = button.getAttribute('data-action');
  if (action === 'toggle-provider') {
    expandableProviderRow.toggle(button);
    return;
  }

  const card = button.closest('.provider-card');

  if (!card) {
    return;
  }

  if (action === 'copy') {
    const pre = card.querySelector('.medtab-output');
    const textToCopy = pre?.textContent || '';

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      button.textContent = 'Copied';
      toastNotifications.show('Copied to clipboard');
      window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 1400);
    } catch (error) {
      uiActions.setStatus('Copy failed. Please copy manually.', 'error');
      toastNotifications.show('Copy failed', 'error');
    }
  }
});

uiActions.renderResults([], 'ready');
uiActions.setStatus('Paste a provider intake block to begin.', '');
