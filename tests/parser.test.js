(function runParserTests(scope) {
  'use strict';

  const api = typeof module !== 'undefined' && module.exports
    ? require('../med-tab-parser.js')
    : scope;
  const realSamples = typeof module !== 'undefined' && module.exports
    ? require('./fixtures/real-intake-samples.js')
    : scope.REAL_INTAKE_SAMPLES;

  const completeByFormat = [
    {
      format: 'delorian',
      raw: `Clinic 1
Clinic Name: Alamo Orthopedics
Doctor First Name: Jane
Doctor Last Name: Smith
Phone Number: (210) 555-0123
Fax Number: 210.555.0199
Address: 530 San Pedro Ave
City: San Antonio  State: tx
Zipcode: 78212
First Visit Date: 1/15/2025  Last Visit Date: 06/02/2026
Next Visit Date: N/A
Notes: page reviewed`,
      clinicName: 'Alamo Orthopedics'
    },
    {
      format: 'lobbie',
      raw: `Medical Provider #1
Provider Organization: River City Health
Treating Provider: Dr. Elena Garcia, MD
Office Phone: 1-512-555-0184
Office Fax: (512) 555-0185
Clinic Address: 100 Main St, Austin, TX 78701
Initial Visit: January 4, 2024
Most Recent Visit: Jun 2026
Upcoming Visit: 8/20/2026
Additional Notes: Follow-up pending`,
      clinicName: 'River City Health'
    },
    {
      format: 'label-value-generic',
      raw: `COMMENTS: imported from alternate form
postal code = 77002
STATE = Tx
city = Houston
ADDRESS 1 = 45 Travis Street
PHYSICIAN = CHRIS LEE
FACILITY NAME = Metro Care
TELEPHONE = 713.555.0100
FAX = +1 (713) 555-0101
DATE FIRST SEEN = 2024-03-12
DATE LAST SEEN = 05/2026
FOLLOW-UP DATE = none`,
      clinicName: 'Metro Care'
    },
    {
      format: 'unknown',
      raw: `Imported page marker and unrelated heading
Phone: 830 555 0111`,
      clinicName: ''
    }
  ];

  const incompleteByFormat = [
    ['delorian', `Clinic 1\nClinic Name: Lone Star Clinic\nPhone: bad-number`],
    ['lobbie', `Medical Provider #1\nTreating Provider: Pat Jones\nComments: no contact details`],
    ['label-value-generic', `Practice Name: Hill Country\nTelephone: N/A`],
    ['unknown', `Fax: 210-555-0122`]
  ];

  const multipleByFormat = [
    ['delorian', `Clinic 1\nClinic Name: First Clinic\nPhone: 2105550101\n\nClinic 2\nClinic Name: Second Clinic\nPhone: 2105550102`],
    ['lobbie', `Medical Provider #1\nProvider Organization: First Medical\nProvider: Ava Stone\nPhone: 2105550103\n\fMedical Provider #2\nProvider Organization: Second Medical\nProvider: Ben Hall\nPhone: 2105550104`],
    ['label-value-generic', `Facility: First Facility\nPhysician: Cora Reed\nPhone: 2105550105\nAddress: 1 First St\n\nFacility: Second Facility\nPhysician: Drew Cole\nPhone: 2105550106\nAddress: 2 Second St`],
    ['unknown', `Doctor: Erin West\nPhone: 2105550107\nAddress: 3 West St\n\nDoctor: Finn North\nPhone: 2105550108\nAddress: 4 North St`]
  ];

  const variantByFormat = [
    ['delorian', `  cLiNiC 1  \n\nPHONE NUMBER : +1 (210) 555-0133\nDOCTOR LAST NAME: Quinn\nDOCTOR FIRST NAME: Alex\nNAME OF CLINIC: Space Care\nPAGE 1 OF 1\nirrelevant footer`],
    ['lobbie', `medical provider #1\n  office phone = 512.555.0134\nSTREET ADDRESS: 9 Oak Rd\nPOSTAL CODE: 78702\nCITY: Austin\nSTATE: tx\nTREATING PROVIDER: Morgan Yu\nPROVIDER ORGANIZATION: Oak Medical\nrandom legal text`],
    ['label-value-generic', `nOtEs : keep this\nLV : July 2026\nCLINIC FAX : 713 555 0136\nPROVIDER PHONE : (713)555-0135\nPHYSICIAN NAME : Taylor Fox\nPRACTICE NAME : Fox Health\nADDRESS LINE 1 : 10 Pine Ave\nZIP : 77003\nSTATE : tx\nCITY : Houston\nFV : 7-1-2025`],
    ['unknown', `unrecognized cover sheet\n\nPhone Number: (956) 555-0137`]
  ];

  const results = [];
  function test(name, callback) {
    try {
      callback();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
  }

  function equal(actual, expected, message) {
    if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }

  completeByFormat.forEach((fixture) => {
    test(`${fixture.format}: complete provider`, () => {
      equal(api.detectInputFormat(fixture.raw), fixture.format, 'format');
      const [provider] = api.normalizeProviders(fixture.raw, fixture.format);
      equal(provider.clinicName, fixture.clinicName, 'clinic name');
      equal(provider.phone, fixture.format === 'unknown' ? '830-555-0111' : provider.phone, 'phone normalization');
      equal(provider.rawSource.length > 0, true, 'raw source');
    });
  });

  incompleteByFormat.forEach(([format, raw]) => {
    test(`${format}: incomplete provider does not invent values`, () => {
      const [provider] = api.normalizeProviders(raw, format);
      equal(Boolean(provider), true, 'provider returned');
      equal(provider.city, '', 'missing city');
      equal(provider.firstVisitDate, '', 'missing first visit');
    });
  });

  multipleByFormat.forEach(([format, raw]) => {
    test(`${format}: multiple providers`, () => {
      equal(api.normalizeProviders(raw, format).length, 2, 'provider count');
    });
  });

  variantByFormat.forEach(([format, raw]) => {
    test(`${format}: spacing, capitalization, order, aliases, and extra text`, () => {
      const [provider] = api.normalizeProviders(raw, format);
      equal(Boolean(provider), true, 'provider returned');
      equal(/^\d{3}-\d{3}-\d{4}$/.test(provider.phone), true, 'alternate phone normalized');
    });
  });

  test('combined address and full doctor name normalize canonically', () => {
    const [provider] = api.normalizeProviders(completeByFormat[1].raw, 'lobbie');
    equal(provider.address, '100 Main St', 'street');
    equal(provider.city, 'Austin', 'city');
    equal(provider.state, 'TX', 'state');
    equal(provider.zip, '78701', 'zip');
    equal(provider.doctorFirst, 'Elena', 'doctor first');
    equal(provider.doctorLast, 'Garcia', 'doctor last');
    equal(provider.firstVisitDate, '01/2024', 'first visit');
    equal(provider.lastVisitDate, '06/2026', 'last visit');
    equal(provider.nextVisitDate, '08/2026', 'next visit');
  });

  test('final Med Tab headings and layout remain stable', () => {
    const [provider] = api.normalizeProviders(completeByFormat[0].raw, 'delorian');
    const output = api.formatMedTab(provider);
    equal(output.startsWith('NAME/ADDRESS/PHONE/FAX:\n'), true, 'contact heading');
    equal(output.includes('\nDOCTORS\nJane Smith\n\nTREATMENT RANGE\n'), true, 'doctor and treatment layout');
    equal(output.endsWith('\nCS TREATMENT LOG\n\nNOTES\n'), true, 'empty log and notes layout');
    equal(output.includes('page reviewed'), false, 'intake notes excluded');
  });

  test('Delorian supplied sample normalizes four wrapped provider records', () => {
    equal(api.detectInputFormat(realSamples.delorian), 'delorian', 'format');
    const providers = api.normalizeProviders(realSamples.delorian, 'delorian');
    equal(providers.length, 4, 'provider count');
    equal(providers[0].clinicName, 'LifeStance Therapists & Psychiatrists Round Rock', 'wrapped clinic');
    equal(providers[0].phone, '512-488-9116', 'wrapped phone');
    equal(providers[0].address, '505 E Palm Valley Blvd Unit 240', 'wrapped address');
    equal(providers[2].clinicName, 'University Health Main Campus', 'page-spanning clinic');
    equal(providers[3].lastVisitDate, '12/2025', 'date normalization');
  });

  test('Lobbie supplied sample normalizes five form providers and one additional provider', () => {
    equal(api.detectInputFormat(realSamples.lobbie), 'lobbie', 'format');
    const providers = api.normalizeProviders(realSamples.lobbie, 'lobbie');
    equal(providers.length, 6, 'provider count');
    equal(providers[0].doctorFirst, 'Christopher', 'doctor first');
    equal(providers[0].doctorLast, 'Ezsparza', 'doctor last');
    equal(providers[0].firstVisitDate, '04/2021', 'month date');
    equal(providers[2].clinicName, 'Texas Oncology Institute', 'stacked blank doctor labels');
    equal(providers[2].lastVisitDate, '07/2023', 'short month/year');
    equal(providers[5].clinicName, 'BrightStar Care', 'additional clinic');
    equal(providers[5].lastVisitDate, 'Ongoing', 'ongoing treatment');
  });

  test('Child supplied sample normalizes five clinics and paired month/year dates', () => {
    equal(api.detectInputFormat(realSamples.child), 'child', 'format');
    const providers = api.normalizeProviders(realSamples.child, 'child');
    equal(providers.length, 5, 'provider count');
    equal(providers[0].clinicName, 'ATASCOSA HEALTH CENTER', 'clinic name');
    equal(providers[0].doctorFirst, 'MARTHA', 'embedded doctor first');
    equal(providers[0].doctorLast, 'MORENO', 'embedded doctor last');
    equal(providers[0].state, 'TX', 'displaced first state');
    equal(providers[1].state, 'TX', 'displaced second state');
    equal(providers[2].state, 'TX', 'ZIP-derived third state');
    equal(providers[0].firstVisitDate, '01/2022', 'first visit');
    equal(providers[3].firstVisitDate, '06/2024', 'month/day plus year');
    equal(providers[4].lastVisitDate, '09/2024', 'last visit');
    equal(providers[4].notes, 'TREATMENT FOR AUTISM, 10/2024', 'condition notes');
  });

  test('Delorian, Lobbie, and Child all use the identical Med Tab template', () => {
    const expectedHeadings = [
      'NAME/ADDRESS/PHONE/FAX:',
      'DOCTORS',
      'TREATMENT RANGE',
      'CS TREATMENT LOG',
      'NOTES'
    ];
    ['delorian', 'lobbie', 'child'].forEach((format) => {
      const [provider] = api.normalizeProviders(realSamples[format], format);
      const output = api.formatMedTab(provider);
      const headings = output.split('\n').filter((line) => expectedHeadings.includes(line));
      equal(headings.join('|'), expectedHeadings.join('|'), `${format} headings`);
    });
  });

  test('all formats keep CS TREATMENT LOG and NOTES empty', () => {
    ['delorian', 'lobbie', 'child'].forEach((format) => {
      const providers = api.normalizeProviders(realSamples[format], format);
      providers.forEach((provider, index) => {
        const output = api.formatMedTab(provider);
        equal(
          output.endsWith('\nCS TREATMENT LOG\n\nNOTES\n'),
          true,
          `${format} provider ${index + 1} empty sections`
        );
        if (provider.notes) equal(output.includes(provider.notes), false, `${format} provider ${index + 1} notes excluded`);
      });
    });
  });

  test('ZIP fallback works across Delorian, Lobbie, and Child without guessing', () => {
    equal(api.lookupStateByZip('78212'), 'TX', 'Texas ZIP');
    equal(api.lookupStateByZip('90210'), 'CA', 'California ZIP');
    equal(api.lookupStateByZip('10001-1234'), 'NY', 'ZIP+4');
    equal(api.lookupStateByZip('00000'), '', 'unassigned ZIP');
    equal(api.lookupStateByZip('21300'), '', 'unassigned in-range prefix');
    equal(api.lookupStateByZip('96910'), '', 'ambiguous territory prefix');

    ['delorian', 'lobbie', 'child'].forEach((format) => {
      const provider = api.normalizeProviders(
        `${format === 'lobbie' ? 'Medical Provider #1' : format === 'child' ? 'Clinic Name #1' : 'Clinic 1'}\n` +
        `${format === 'child' ? '' : 'Clinic Name: '}Fallback Test Clinic\nPhone: 2105550100\nAddress: 1 Main St\nCity: Beverly Hills\nZip: 90210`,
        format
      )[0];
      equal(provider.state, 'CA', `${format} ZIP state`);
    });
  });

  test('explicit recognized state wins and unknown ZIP remains missing', () => {
    const [explicit] = api.normalizeProviders(
      'Clinic 1\nClinic Name: Explicit State\nPhone: 2105550100\nAddress: 1 Main St\nCity: Austin\nState: California\nZip: 78212',
      'delorian'
    );
    equal(explicit.state, 'CA', 'explicit state wins');

    const [unknown] = api.normalizeProviders(
      'Clinic 1\nClinic Name: Unknown ZIP\nPhone: 2105550100\nAddress: 1 Main St\nCity: Somewhere\nZip: 00000',
      'delorian'
    );
    equal(unknown.state, '', 'unknown state remains blank');
  });

  test('year-only dates are preserved and missing FV copies LV across all formats', () => {
    ['delorian', 'lobbie', 'child'].forEach((format) => {
      const heading = format === 'lobbie' ? 'Medical Provider #1' : format === 'child' ? 'Clinic Name #1' : 'Clinic 1';
      const clinicLabel = format === 'child' ? '' : 'Clinic Name: ';
      const [provider] = api.normalizeProviders(
        `${heading}\n${clinicLabel}Year Test Clinic\nPhone: 2105550100\nAddress: 1 Main St\nCity: Austin\nZip: 78212\nLast Visit: 2023`,
        format
      );
      equal(provider.lastVisitDate, '2023', `${format} preserves LV year`);
      equal(provider.firstVisitDate, '2023', `${format} copies LV into FV`);
      const output = api.formatMedTab(provider);
      equal(output.includes('FV: 2023\nLV: 2023'), true, `${format} formatted dates`);
    });
  });

  test('FV-only remains valid data without inventing LV', () => {
    const [provider] = api.normalizeProviders(
      'Clinic 1\nClinic Name: FV Only\nPhone: 2105550100\nAddress: 1 Main St\nCity: Austin\nZip: 78212\nFirst Visit: 2022',
      'delorian'
    );
    equal(provider.firstVisitDate, '2022', 'FV year');
    equal(provider.lastVisitDate, '', 'LV remains blank');
  });

  const failures = results.filter((result) => !result.passed);
  if (typeof module !== 'undefined' && module.exports) {
    failures.forEach((failure) => console.error(`FAIL ${failure.name}: ${failure.error}`));
    if (failures.length) process.exitCode = 1;
    else console.log(`PASS ${results.length} parser tests`);
  } else {
    scope.parserTestResults = results;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
