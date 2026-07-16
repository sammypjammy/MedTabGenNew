(function exposeRealIntakeSamples(scope) {
  'use strict';

  const samples = {
    delorian: `MEDICAL PROVIDERS

3/5/26, 4:00 PM Intake Form - Carol Aguero
https://portal.plfportal.com/s3cr3t/intake_forms/export_pdf/3864 5/13

Clinic 1
Clinic Name: LifeStance
Therapists &
Psychiatrists
Round Rock
Doctor First Name: .
Doctor Last Name: . Phone Number: (512) 488-
9116
Address: 505 E Palm
Valley Blvd
Unit 240
Address 2: Not provided
City: Round Rock State: TX
Zipcode: 78664
First Visit Date: 06/01/2025 Last Visit Date: 02/01/2026
Next Visit Date: Not provided
Notes: Not provided
Clinic 2
Clinic Name: HealthTexas
Primary Care
Doctors
Doctor First Name: Not provided
Doctor Last Name: Not provided Phone Number: (210) 225-
4511
Address: 530 San
Pedro Ave
Address 2: Not provided
City: San Antonio State: TX
Zipcode: 78212
First Visit Date: 01/01/2020 Last Visit Date: 12/01/2025
Next Visit Date: Not provided
Notes: Not provided
Clinic 3
3/5/26, 4:00 PM Intake Form - Carol Aguero
https://portal.plfportal.com/s3cr3t/intake_forms/export_pdf/3864 6/13
Clinic Name: University
Health Main
Campus
Doctor First Name: Not provided
Doctor Last Name: Not provided Phone Number: (210) 358-
4000
Address: 4502
Medical Dr
Address 2: Not provided
City: San Antonio State: TX
Zipcode: 78229
First Visit Date: 01/01/2019 Last Visit Date: 12/01/2025
Next Visit Date: Not provided
Notes: Not provided
Clinic 4
Clinic Name: Methodist
Hospital
Doctor First Name: Not provided
Doctor Last Name: Not provided Phone Number: (210) 575-
4000
Address: 7700 Floyd
Curl Dr
Address 2: Not provided
City: San Antonio State: TX
Zipcode: 78229
First Visit Date: 01/01/2019 Last Visit Date: 12/01/2025
Next Visit Date: Not provided
Notes: Not provided`,

    lobbie: `Medical Provider #1
Please provide a photo of the provider's business card:
If you don't have one, add their contact information below:
First Name of Provider *
Christopher
Last Name of Provider *
Ezsparza
Name of Clinic
Hillard Clinic
Phone Number
(210) 352 - 8255
Clinic Street Address
919 LOCKE ST
City
San Antonio
State Zip Code
78208
Approximate Date of First Visit
April 2021
Approximate Date of Last Visit
May 3 2024
Next Appointment
Conditions treated:
Diabetes,sciatica pain, referrals for labs every 3 months

Medical Provider #2
Please provide a photo of the provider's business card:
If you don't have one, add their contact information below:
September 2021
Texas (TX)
7/22/24, 6:44 PM Intake Form - Anissa Denson
https://my.lobbie.com/home/patients/example 5/15
First Name of Provider
Dialobima
Last Name of Provider
Ashorobi
Name of Clinic
Texas Diabetes Institute
Phone Number
(210) 358 - 7000
Clinic Street Address
701 S Zarzamora St
City
San Antonio
State Zip Code
78207
Approximate Date of First Visit
2021
Approximate Date of Last Visit
2023
Next Appointment
Conditions treated:
every 2 months

Medical Provider #3
Please provide a photo of the provider's business card:
If you don't have one, add their contact information below:
First Name of Provider Last Name of Provider Name of Clinic
Texas Oncology Institute
Phone Number
(210) 656 - 7177
Clinic Street Address
2130 NE Interstate 410 Loop Suite 100
City
San antonio
State Zip Code
78217
Approximate Date of First Visit
2018
Approximate Date of Last Visit
7/23
Next Appointment
Conditions treated:
Chronic anemia,received blood transfusions for treatment will be returning here

Medical Provider #4
Please provide a photo of the provider's business card:
If you don't have one, add their contact information below:
First Name of Provider Last Name of Provider Name of Clinic
Opthamology
Phone Number
(210) 450 - 9100
Clinic Street Address
8300 Floyd Curl Dr
City
San Antonio
State Zip Code
78229
Approximate Date of First Visit
2021
Approximate Date of Last Visit
2023
Next Appointment
Conditions treated:
Texas (TX)
Texas (TX)
Texas (TX)
7/22/24, 6:44 PM Intake Form - Anissa Denson
https://my.lobbie.com/home/patients/example 6/15

Medical Provider #5
Please provide a photo of the provider's business card:
If you don't have one, add their contact information below:
First Name of Provider Last Name of Provider Name of Clinic
Baptist Medical Center
Phone Number
(210) 297 - 7000
Clinic Street Address
111 Dallas St,
City
San antonio
State Zip Code
78205
Approximate Date of First Visit
01/2024
Approximate Date of Last Visit
07/2024
Next Appointment
Conditions treated:
diabetes ketodosis - in a coma

Please provide information for any additional Medical Providers below:
BrightStar Care Address: 7710 I-10, San Antonio, TX 78230 Phone: (210) 377-3355 02/2024 - Ongoing post coma therapy`,

    child: `Clinic Name #1
ATASCOSA HEALTH CENTER (DR MARTHA MORENO)
Phone Number
(830) 569 - 2527
Address
310 W. Oaklawn road
City
PLEASANTON
State Zip Code
78064
First Visit (month)
JAN
Year
2022
Last Visit (month)
AUG
Year
2024
Condition Treated
PHYICALS SHOT ACUTE CARE (COVID), PRN

Clinic Name #2
ALMOUIE PEDIATICS
Phone Number
(210) 817 - 7004
Address
2316 SE MILITARY DR
City
SAN ANTONI0
State Zip Code
78223
First Visit (month)
JAN
Year
2021
Last Visit (month)
JAN
Year
2023
Condition Treated
PHYSICALS SHOTS ACUTE CARE
Texas (TX)
Texas (TX)
9/30/24, 1:30 PM Child Intake Form - Chloe Rodriguez
https://my.lobbie.com/home/patients/example 2/7

Clinic Name #3
SMILE KINGS
Phone Number
(210) 236 - 9220
Address City
SAN ANTONIO
State Zip Code
78207
First Visit (month)
JAN
Year
2020
Last Visit (month)
AUG
Year
2024
Condition Treated
REGULAR DENTIST SCREN CLEANING FILLING

Clinic Name #4
STONEBRIDGE BEHAVIORAL HEALTH
Phone Number
(210) 314 - 3476
Address
1010 CENTRAL PARKWAYSOUTH
City
SAN ANTONIO
State Zip Code
78232
First Visit (month)
06/27
Year
2024
Last Visit (month)
06/27
Year
2024
Condition Treated
COMPREHENSIVE TESTING FOR LEANING DISABILITIES AND AUTISM

Clinic Name #5
CAMINO REAL BEHAVIORAL HEALTH CENTER
Phone Number
(830) 769 - 2704
Address
1749 HWY 97 EAST
City
JOURDANTON
State Zip Code
78026
First Visit (month)
08/12
Year
2024
Last Visit (month)
09/23
Year
2024
Condition Treated
TREATMENT FOR AUTISM, 10/2024`
  };

  scope.REAL_INTAKE_SAMPLES = samples;
  if (typeof module !== 'undefined' && module.exports) module.exports = samples;
})(typeof globalThis !== 'undefined' ? globalThis : window);
