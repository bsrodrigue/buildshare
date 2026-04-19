import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// French translations
const fr = {
  translation: {
    jobs: {
      types: {
        BINARY_PROCESSING: 'Traitement de binaire',
      },
      status: {
        PENDING: 'En attente',
        STARTED: 'En cours',
        SUCCESS: 'Réussite',
        FAILURE: 'Échec',
        CANCELLED: 'Annulé',
      },
    },
    common: {
      unknown: 'Inconnu',
      error: 'Erreur',
    },
  },
};

// English translations
const en = {
  translation: {
    jobs: {
      types: {
        BINARY_PROCESSING: 'Binary Processing',
      },
      status: {
        PENDING: 'Pending',
        STARTED: 'In Progress',
        SUCCESS: 'Success',
        FAILURE: 'Failed',
        CANCELLED: 'Cancelled',
      },
    },
    common: {
      unknown: 'Unknown',
      error: 'Error',
    },
  },
};

// eslint-disable-next-line import/no-named-as-default-member
void i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en,
      fr,
    },
    lng: 'fr', // Default to French as requested by current UI language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
