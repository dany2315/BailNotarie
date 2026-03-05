/**
 * Types pour l'API Adresse (Base Adresse Nationale - BAN)
 * Documentation: https://api-adresse.data.gouv.fr/api-doc/adresse
 */

export interface BANFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string; // Adresse complète formatée
    score: number;
    housenumber?: string;
    street?: string;
    postcode: string;
    city: string;
    citycode: string; // Code INSEE
    context: string; // Département
    type: string; // Type de résultat (housenumber, street, municipality, etc.)
    importance: number;
    district?: string; // Arrondissement pour Paris/Lyon/Marseille
    oldcity?: string;
    oldcitycode?: string;
    id: string;
    name: string;
  };
}

export interface BANResponse {
  type: string;
  version: string;
  features: BANFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

export interface AddressSuggestion {
  label: string;
  value: string; // Adresse complète
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  citycode: string; // Code INSEE
  department: string;
  region?: string;
  district?: string; // Arrondissement
  coordinates: {
    longitude: number;
    latitude: number;
  };
}

export interface AddressData {
  fullAddress: string;
  housenumber?: string;
  street?: string;
  postalCode: string;
  city: string;
  inseeCode: string; // Code INSEE de la commune
  department: string;
  region?: string;
  district?: string; // Arrondissement pour Paris/Lyon/Marseille
  latitude: number;
  longitude: number;
}

/**
 * Convertit une feature BAN en AddressSuggestion
 */
export function banFeatureToSuggestion(feature: BANFeature): AddressSuggestion {
  const props = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    label: props.label,
    value: props.label,
    housenumber: props.housenumber,
    street: props.street,
    postcode: props.postcode,
    city: props.city,
    citycode: props.citycode,
    department: props.context,
    district: props.district,
    coordinates: {
      longitude,
      latitude,
    },
  };
}

/**
 * Convertit une AddressSuggestion en AddressData
 */
export function suggestionToAddressData(suggestion: AddressSuggestion): AddressData {
  return {
    fullAddress: suggestion.value,
    housenumber: suggestion.housenumber,
    street: suggestion.street,
    postalCode: suggestion.postcode,
    city: suggestion.city,
    inseeCode: suggestion.citycode,
    department: suggestion.department,
    region: suggestion.region,
    district: suggestion.district,
    latitude: suggestion.coordinates.latitude,
    longitude: suggestion.coordinates.longitude,
  };
}











