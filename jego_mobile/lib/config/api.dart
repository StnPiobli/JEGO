/// Configuration de l'API JEGO.
///
/// Le contenu réel vit désormais dans `api_service.dart`, qui contient
/// à la fois la configuration (ApiConfig) et les appels réseau
/// (ApiService). Ce fichier est conservé pour que les écrans qui
/// importent déjà `config/api.dart` continuent de fonctionner sans
/// modification d'import.
///
/// Il n'existe plus aucun mode de données fictives : tous les écrans
/// parlent au vrai backend.
export 'api_service.dart' show ApiConfig, ApiService, ErreurApi;
