const fs = require("fs");
const path = require("path");

/*
 * Configuration dynamique : reprend app.json tel quel et y ajoute le fichier Firebase
 * (google-services.json) nécessaire aux notifications push Android, dès qu'il est fourni :
 * - par une variable d'environnement EAS de type « fichier » nommée GOOGLE_SERVICES_JSON ;
 * - ou par le fichier mobile/google-services.json.
 * Sans ce fichier, l'application fonctionne mais ne peut pas obtenir de jeton push sur Android.
 */
module.exports = ({ config }) => {
  const localFile = path.join(__dirname, "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(localFile) ? "./google-services.json" : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
