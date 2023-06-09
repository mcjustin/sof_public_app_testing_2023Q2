const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: 'c916889f-4e33-4dfa-980d-966ba49315f3', // I believe clientId is ignored at smit.
        scope: 'openid fhirUser launch/patient patient/Patient.read patient/Immunization.read offline_access',
        iss: '(populated later)',
        completeInTarget: true,
        redirect_uri: 'index.html'
    };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-app-button').addEventListener('click', startApp);

    readCookiesAndApply();
    
    // if 'sof_host' param is present, populate the field with it.
    const fhirUrlsHardCoded = {
        smit: 'https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir',
        epic: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4' // per https://open.epic.com/MyApps/Endpoints
        //const fhirUrl = 'https://vendorservices.epic.com/interconnect-amcurprd-oauth/oauth2/authorize';
        //const fhirUrl = 'https://appmarket.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4'; // per https://vendorservices.epic.com/interconnect-amcurprd-oauth/api/FHIR/R4/metadata and earlier testing.
    };
    const urlParams = new URLSearchParams(window.location.search);
    let sofHostHardcodedShortName = urlParams.get('sof_host');
    if (sofHostHardcodedShortName && (sofHostHardcodedShortName in fhirUrlsHardCoded)) {
        setCookie('fhirUrl', fhirUrlsHardCoded[sofHostHardcodedShortName], 1);
        setCookie('environment', 'non-production', 1);
        readCookiesAndApply();
    }
});


const startApp = () => {
    // At this point, the field has the user's desired host URL.
    const fhirBaseUrlInput = document.getElementById('fhir-base-url');
    const inputFhirUrl = fhirBaseUrlInput.value.trim();

    if (!isValidUrl(inputFhirUrl)) {
        alert('The URL is not valid. Please enter a valid URL.');
        return;
    }
    
    setCookie('fhirUrl', inputFhirUrl, 1);
    config.iss = inputFhirUrl;

    const environmentRadios = document.getElementsByName('environment');
    let selectedEnvironment;
    for (const radio of environmentRadios) {
        if (radio.checked) {
                selectedEnvironment = radio.value;
                break;
        }
    }
    setCookie('environment', selectedEnvironment, 1);
    config.clientId = selectedEnvironment === 'production' ? 'ef227264-2efb-49ac-ad49-0c3b50625d77' : '683d95bc-23cf-480e-afdf-80122574cc22';

    FHIR.oauth2.authorize(config);
}; // const startApp


if (sessionStorage.getItem('SMART_KEY')) { // is there an event like FHIR.oauth2.ready() which would include this criteria?
    FHIR.oauth2.ready().then(client => {
        // For SMIT, "Abdul Koepp" has immunizations...
        const patientInfo = document.getElementById('patient-info');
        const immunizationHistory = document.getElementById('immunization-history');

        client.request('Patient/' + client.getPatientId()).then(patient => {
            const name = patient.name[0];
            const formattedName = `${name.given.join(' ')} ${name.family}`;
            patientInfo.innerHTML = `<h2>Patient Name: ${formattedName}</h2>`;
        });

        client.request(`Immunization?patient=${client.getPatientId()}`, { flat: true }).then(immunizations => {
            immunizationHistory.innerHTML = '<h2>Immunization History:</h2>';
            const list = document.createElement('ul');

            for (let i = 0; i < immunizations.length; i++) {
                const immunization = immunizations[i];
                if (immunization === undefined || immunization.resourceType != 'Immunization') continue;
                const listItem = document.createElement('li');
                //const displayText = immunization.vaccineCode.coding[0].display ? immunization.vaccineCode.coding[0].display : immunization.vaccineCode.text;
                const displayText = immunization.vaccineCode.coding[0].display === undefined ? immunization.vaccineCode.text : immunization.vaccineCode.coding[0].display;
                listItem.textContent = `${displayText} - ${immunization.occurrenceDateTime}`;
                list.appendChild(listItem);
            }

            immunizationHistory.appendChild(list);
        });
    }).catch(console.error);
} //if (sessionStorage.getItem('SMART_KEY'))
    
// Read 'fhirUrl' cookie and populate the field with it.
function readCookiesAndApply() {

    let fhirUrlCookie = getCookie('fhirUrl');
    if (fhirUrlCookie != undefined){
        const fhirBaseUrlInput = document.getElementById('fhir-base-url');
        fhirBaseUrlInput.value = fhirUrlCookie;
    }

    const environmentCookie = getCookie('environment');
    if (environmentCookie) {
        const nonProductionRadio = document.getElementById('non-production');
        const productionRadio = document.getElementById('production');
        if (environmentCookie === 'production') {
            nonProductionRadio.checked = false;
            productionRadio.checked = true;
        } else {
            nonProductionRadio.checked = true;
            productionRadio.checked = false;
        }
    }
}

// Utility function to validate a URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Utility function to set a cookie
function setCookie(name, value, hours) {
  const date = new Date();
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
  const expires = '; expires=' + date.toUTCString();
  document.cookie = name + '=' + value + expires + '; path=/';
}

// Utility function to get a cookie
function getCookie(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }

  return null;
}
