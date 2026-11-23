// Serveur de recette : `next start` (port 3210) en mode « recette » (voir isolated-env.cjs).
process.env.PREP_ENV = 'recette';
require('./serve-isolated.cjs');
