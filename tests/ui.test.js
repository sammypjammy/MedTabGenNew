(function runUiTests(scope) {
  'use strict';

  const results = [];
  const test = (name, condition) => results.push({ name, passed: Boolean(condition) });
  const wait = (milliseconds) => new Promise((resolve) => scope.setTimeout(resolve, milliseconds));
  const option = (theme) => document.querySelector(`[data-theme-option="${theme}"]`);

  function renderResults() {
    const parserFailures = parserTestResults.filter((result) => !result.passed);
    parserSummary.textContent = `${parserTestResults.length - parserFailures.length}/${parserTestResults.length} tests passed`;
    parserSummary.className = parserFailures.length ? 'fail' : 'pass';
    parserTestResults.forEach((result) => {
      const item = document.createElement('li');
      item.className = result.passed ? 'pass' : 'fail';
      item.textContent = `${result.passed ? 'PASS' : 'FAIL'}: ${result.name}${result.error ? ` — ${result.error}` : ''}`;
      parserResults.appendChild(item);
    });

    const uiFailures = results.filter((result) => !result.passed);
    uiSummary.textContent = `${results.length - uiFailures.length}/${results.length} tests passed`;
    uiSummary.className = uiFailures.length ? 'fail' : 'pass';
    results.forEach((result) => {
      const item = document.createElement('li');
      item.className = result.passed ? 'pass' : 'fail';
      item.textContent = `${result.passed ? 'PASS' : 'FAIL'}: ${result.name}`;
      uiResults.appendChild(item);
    });
    document.title = parserFailures.length || uiFailures.length ? 'FAIL: Med Tabs Test Suite' : 'PASS: Med Tabs Test Suite';
  }

  function testNavigation() {
    const links = [...toolkitNavigation.querySelectorAll('a')];
    test('navigation: only configured tools are links', links.length === 2);
    test('navigation: Canned Remarks URL', links[0]?.href === 'https://cannedremarks.vercel.app/');
    test('navigation: Welcome Emails URL', links[1]?.href === 'https://welcome-email-sender.vercel.app/');
    test('navigation: current tool highlighted', toolkitNavigation.querySelector('[aria-current="page"]')?.textContent.includes('Med Tabs'));
    test('navigation: unconfigured tools disabled', toolkitNavigation.querySelectorAll('[aria-disabled="true"]').length === 3);

    appMenuToggle.click();
    test('navigation: menu and backdrop open', !appMenu.hidden && !appMenuBackdrop.hidden);
    test('navigation: page scrolling locked', document.body.classList.contains('menu-open'));
    test('navigation: focus moves into drawer', document.activeElement === appMenuClose);

    appMenuBackdrop.click();
    test('navigation: backdrop closes drawer', appMenu.hidden && appMenuBackdrop.hidden);
    test('navigation: backdrop restores focus', document.activeElement === appMenuToggle);

    appMenuToggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    test('navigation: Escape closes and restores focus', appMenu.hidden && document.activeElement === appMenuToggle);
  }

  function testThemes() {
    test('theme: starts in light theme', document.documentElement.dataset.theme === 'light');
    test('theme: active theme is checked', option('light').getAttribute('aria-checked') === 'true');
    test('theme: all options exist', document.querySelectorAll('[data-theme-option]').length === 5);

    const palettes = {
      sepia: ['#F4EEDF', '#FFF8EB', '#F8EEDC', '#3B2F24', '#735F4B', '#9A6C35', '#EAD8BD', '#D8C4A7'],
      forest: ['#EDF4EF', '#FFFFFF', '#F4F8F5', '#183326', '#5B7465', '#3F7D58', '#DDECE2', '#C8DDD0'],
      blossom: ['#FDF4F8', '#FFFFFF', '#FAF1FB', '#342238', '#7A637D', '#B65FCF', '#F0DDF4', '#EBCBEF']
    };
    const variables = ['--page-bg', '--panel-bg', '--surface-bg', '--text', '--text-muted', '--accent', '--accent-soft', '--border'];
    Object.entries(palettes).forEach(([theme, expectedColors]) => {
      themeController.apply(theme);
      const styles = getComputedStyle(document.documentElement);
      test(`theme: ${theme} palette values`, variables.every(
        (variable, index) => styles.getPropertyValue(variable).trim().toUpperCase() === expectedColors[index]
      ));
    });
    themeController.apply('light');

    themeToggle.click();
    test('theme: button opens menu', !themeMenu.hidden && themeToggle.getAttribute('aria-expanded') === 'true');
    option('sepia').click();
    test('theme: selection applies immediately', document.documentElement.dataset.theme === 'sepia');
    test('theme: selection persists', localStorage.getItem('med-tabs-theme') === 'sepia');
    test('theme: selection checks item and closes menu', themeMenu.hidden && option('sepia').getAttribute('aria-checked') === 'true');

    themeController.apply(themeController.getInitialTheme());
    test('theme: stored selection restores', document.documentElement.dataset.theme === 'sepia');

    themeToggle.click();
    document.body.click();
    test('theme: outside click closes menu', themeMenu.hidden);

    themeToggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    test('theme: Escape closes and restores focus', themeMenu.hidden && document.activeElement === themeToggle);

    themeToggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    test('theme: arrow key opens at active option', !themeMenu.hidden && document.activeElement === option('sepia'));
    themeMenu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    test('theme: arrow keys navigate options', document.activeElement === option('forest'));
    themeController.apply('light');
    localStorage.removeItem('med-tabs-theme');
  }

  async function testOutOfStateProviders() {
    inputText.value = `Clinic 1
Clinic Name: California Clinic
Phone: 3105550100
Address: 1 Main St
City: Beverly Hills
Zip: 90210
First Visit: 01/2024
Last Visit: 02/2025

Clinic 2
Clinic Name: Texas Clinic
Phone: 2105550101
Address: 2 Main St
City: San Antonio
Zip: 78212
First Visit: 01/2024
Last Visit: 02/2025

Clinic 3
Clinic Name: Unknown State Clinic
Phone: 2105550102
Address: 3 Main St
City: Somewhere
Zip: 00000
First Visit: 01/2024
Last Visit: 02/2025

Clinic 4
Clinic Name: LV Only Clinic
Phone: 2105550103
Address: 4 Main St
City: Austin
Zip: 78701
Last Visit: 2023

Clinic 5
Clinic Name: FV Only Clinic
Phone: 2105550104
Address: 5 Main St
City: Austin
Zip: 78701
First Visit: 2022

Clinic 6
Clinic Name: No Visit Dates Clinic
Phone: 2105550105
Address: 6 Main St
City: Austin
Zip: 78701

Clinic 7
Clinic Name: California Yellow Clinic
Phone: 3105550106
City: Beverly Hills
Zip: 90210
First Visit: 2022

Clinic 8
Clinic Name: California Red Clinic
Phone: invalid
Address: 8 Main St
City: Beverly Hills
Zip: 90210
First Visit: 2022`;
    generateBtn.click();
    await wait(700);

    const cards = [...document.querySelectorAll('.provider-card')];
    test('providers: eight out-of-state fixtures render', cards.length === 8);
    test('providers: California card is purple status', cards[0]?.classList.contains('status-out-of-state'));
    test('providers: California title has suffix', cards[0]?.querySelector('.provider-name')?.textContent.endsWith(' - OUT OF STATE'));
    test('providers: suffix excluded from Med Tab', !cards[0]?.querySelector('.medtab-output')?.textContent.includes('OUT OF STATE'));
    test('providers: Texas card remains complete', cards[1]?.classList.contains('status-complete'));
    test('providers: unknown ZIP remains warning', cards[2]?.classList.contains('status-warning'));
    test('providers: last-visit-only card is complete', cards[3]?.classList.contains('status-complete'));
    test('providers: last visit copies to first visit', cards[3]?.querySelector('.medtab-output')?.textContent.includes('FV: 2023\nLV: 2023'));
    test('providers: first-visit-only card is complete', cards[4]?.classList.contains('status-complete'));
    test('providers: missing dates is warning', cards[5]?.classList.contains('status-warning'));
    test('providers: out-of-state errors remain warning', cards[6]?.classList.contains('status-warning'));
    test('providers: warning retains purple badge', Boolean(cards[6]?.querySelector('.status-badge-out-of-state')));
    test('providers: out-of-state errors remain critical', cards[7]?.classList.contains('status-critical'));
    test('providers: critical retains purple badge', Boolean(cards[7]?.querySelector('.status-badge-out-of-state')));
    test('providers: warning counter includes out-of-state', yellowCount.dataset.count === '3');
    test('providers: critical counter includes out-of-state', redCount.dataset.count === '1');
    clearAllBtn.click();
  }

  async function testDuplicateProviders() {
    test('duplicates: phone normalization', normalizePhoneForDuplicateCheck('+1 (210) 555-0123') === '2105550123');
    test('duplicates: bare country code stays invalid', normalizePhoneForDuplicateCheck('1-210-555-0123') === '');
    test('duplicates: invalid phone ignored', normalizePhoneForDuplicateCheck('Unknown') === '');
    test(
      'duplicates: address abbreviation normalization',
      normalizeAddressForDuplicateCheck(' 100 North Main Street, Suite 2. Austin, TX 78701 ') ===
        normalizeAddressForDuplicateCheck('100 N Main St Ste 2 Austin TX 78701')
    );
    test('duplicates: generic address ignored', normalizeAddressForDuplicateCheck('Not provided') === '');

    const recycled = [
      { id: 1, fields: { phone: '210-555-0100', address: '1 Main St, Austin, TX 78701' } },
      { id: 2, fields: { phone: '210-555-0100', address: '1 Main Street, Austin, TX 78701' } }
    ];
    markDuplicateGroups(recycled);
    test('duplicates: initial batch marked', recycled.every((provider) => provider.duplicate));
    recycled[1].fields.phone = '210-555-0199';
    markDuplicateGroups(recycled);
    test('duplicates: regeneration clears stale state', recycled.every((provider) => !provider.duplicate));

    inputText.value = `Clinic 1
Clinic Name: Alpha Clinic
Doctor First Name: Alex
Doctor Last Name: One
Phone: (210) 555-0123
Address: 100 North Main Street, Suite 2
City: Austin
State: TX
Zip: 78701
First Visit: 01/2024
Last Visit: 02/2025

Clinic 2
Clinic Name: Totally Different Clinic
Doctor First Name: Blair
Doctor Last Name: Two
Phone: +1 210.555.0123
Address: 100 N Main St Ste 2
City: Austin
State: TX
Zip: 78701
First Visit: 01/2024
Last Visit: 02/2025

Clinic 3
Clinic Name: Third Name
Phone: 210-555-0123
Address: 100 N Main St Ste 2
City: Austin
State: TX
Zip: 78701
First Visit: 01/2024
Last Visit: 02/2025

Clinic 4
Clinic Name: Different Address
Phone: 210-555-0123
Address: 200 N Main St Ste 2
City: Austin
State: TX
Zip: 78701
First Visit: 01/2024
Last Visit: 02/2025

Clinic 5
Clinic Name: Invalid Phone
Phone: Unknown
Address: 100 N Main St Ste 2
City: Austin
State: TX
Zip: 78701
First Visit: 01/2024
Last Visit: 02/2025`;
    generateBtn.click();
    await wait(700);

    const cards = [...document.querySelectorAll('.provider-card')];
    test('duplicates: five providers retained', cards.length === 5);
    test('duplicates: all group members badged', document.querySelectorAll('.status-badge-duplicate').length === 3);
    test('duplicates: counter counts every group member', duplicateCount.dataset.count === '3');
    test('duplicates: counter visible', !duplicateCount.hidden);
    test('duplicates: original has no reference label', !cards[0]?.querySelector('.duplicate-reference'));
    test('duplicates: second references original', cards[1]?.querySelector('.duplicate-reference')?.textContent === 'Duplicate of Provider 1');
    test('duplicates: third references original', cards[2]?.querySelector('.duplicate-reference')?.textContent === 'Duplicate of Provider 1');
    test('duplicates: details list phone match', cards[1]?.querySelector('.duplicate-details')?.textContent.includes('Phone number'));
    test('duplicates: details list address match', cards[1]?.querySelector('.duplicate-details')?.textContent.includes('Address'));
    test('duplicates: validation badge retained', Boolean(cards[1]?.querySelector('.status-badge-complete')));
    test('duplicates: copy remains available', cards.every((card) => card.querySelector('[data-action="copy"]')));

    clearAllBtn.click();
    test('duplicates: clear removes flags', document.querySelectorAll('.status-badge-duplicate').length === 0);
    test('duplicates: clear hides counter', duplicateCount.hidden);
  }

  scope.addEventListener('DOMContentLoaded', async () => {
    try {
      testNavigation();
      testThemes();
      await testOutOfStateProviders();
      await testDuplicateProviders();
    } catch (error) {
      results.push({ name: `test suite completed without an exception: ${error.message}`, passed: false });
    }
    renderResults();
  });
})(window);
