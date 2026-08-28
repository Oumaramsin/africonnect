import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AddressFeature {
  label: string;
  name?: string;
  postcode?: string;
  citycode?: string;
  city?: string;
  context?: string;
  type?: string;
  street?: string;
  housenumber?: string;
  coordinates?: [number, number]; 
}

export function getQuarterOrCityFromAddress(item: AddressFeature): string {
  if (item.postcode) {
    const pc = item.postcode.trim();
    // Paris: 75001 to 75020
    if (pc.startsWith("750") && pc.length === 5) {
      const arr = parseInt(pc.slice(3), 10);
      if (arr >= 1 && arr <= 20) {
        return arr === 1 ? "Paris 1er" : `Paris ${arr}e`;
      }
    }
    // Lyon: 69001 to 69009
    if (pc.startsWith("6900") && pc.length === 5) {
      const arr = parseInt(pc.slice(4), 10);
      if (arr >= 1 && arr <= 9) {
        return arr === 1 ? "Lyon 1er" : `Lyon ${arr}e`;
      }
    }
    // Marseille: 13001 to 13016
    if (pc.startsWith("130") && pc.length === 5) {
      const arr = parseInt(pc.slice(3), 10);
      if (arr >= 1 && arr <= 16) {
        return arr === 1 ? "Marseille 1er" : `Marseille ${arr}e`;
      }
    }
  }
  return item.city || item.name || item.label;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress?: (item: AddressFeature) => void;
  placeholder?: string;
  type?: "housenumber" | "street" | "locality" | "municipality";
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  placeholderTextColor?: string;
  editable?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelectAddress,
  placeholder = "Saisissez une adresse ou une ville...",
  type,
  containerStyle,
  inputStyle,
  placeholderTextColor = "#94A3B8",
  editable = true,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronise la valeur externe avec l'état local
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchAddress = async (text: string) => {
    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      let url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        text.trim(),
      )}&limit=5`;
      if (type) {
        url += `&type=${type}`;
      }

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("Erreur API Adresse");
      const data = await res.json();

      const results: AddressFeature[] = (data.features || []).map(
        (f: any) => ({
          label: f.properties?.label || "",
          name: f.properties?.name || "",
          postcode: f.properties?.postcode || "",
          citycode: f.properties?.citycode || "",
          city: f.properties?.city || "",
          context: f.properties?.context || "",
          type: f.properties?.type || "",
          street: f.properties?.street || "",
          housenumber: f.properties?.housenumber || "",
          coordinates: f.geometry?.coordinates || undefined,
        }),
      );

      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("[AddressAutocomplete] Erreur API adresse:", err.message);
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    onChangeText(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchAddress(text);
    }, 300);
  };

  const handleSelect = (item: AddressFeature) => {
    setQuery(item.label);
    onChangeText(item.label);
    setIsOpen(false);
    setSuggestions([]);
    if (onSelectAddress) {
      onSelectAddress(item);
    }
  };

  const handleClear = () => {
    setQuery("");
    onChangeText("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Input container */}
      <View style={styles.inputWrapper}>
        <Ionicons
          name="location-outline"
          size={18}
          color="#1D6B45"
          style={styles.leadingIcon}
        />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0 && query.length >= 2) {
              setIsOpen(true);
            }
          }}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#1D6B45" style={styles.trailingIcon} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.trailingIcon}
          >
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>
              Suggestions officielles (data.gouv.fr)
            </Text>
          </View>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.label}-${index}`}
              style={[
                styles.suggestionItem,
                index === suggestions.length - 1 && styles.suggestionItemLast,
              ]}
              activeOpacity={0.7}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.suggestionIconBox}>
                <Ionicons
                  name={
                    item.type === "municipality"
                      ? "business-outline"
                      : "navigate-circle-outline"
                  }
                  size={18}
                  color="#1D6B45"
                />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.context ? (
                  <Text style={styles.suggestionContext} numberOfLines={1}>
                    {item.context}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 100,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 48,
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    height: "100%",
    paddingVertical: 0,
  },
  trailingIcon: {
    marginLeft: 8,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  dropdownHeader: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownHeaderText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(29, 107, 69, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  suggestionContext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});
