import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { cguData, CGUArticle } from "../data/cguData";

export default function CGUScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [expandedArticles, setExpandedArticles] = useState<Record<number, boolean>>({});

  const categories = useMemo(() => {
    const cats = Array.from(new Set(cguData.articles.map((a) => a.category)));
    return ["Tous", ...cats];
  }, []);

  const filteredArticles = useMemo(() => {
    return cguData.articles.filter((article) => {
      const matchesCategory =
        selectedCategory === "Tous" || article.category === selectedCategory;

      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchText =
        article.title.toLowerCase().includes(q) ||
        article.number.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.paragraphs.some((p) => p.toLowerCase().includes(q)) ||
        (article.bulletPoints &&
          article.bulletPoints.some((b) => b.toLowerCase().includes(q)));

      return matchesCategory && matchText;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: number) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: "Conditions Générales d'Utilisation - Dabari",
        message:
          "Consultez les Conditions Générales d'Utilisation et de Service (CGU) officielles de Dabari SAS pour le cotransportage et les services traiteurs : https://dabari.fr/cgu",
      });
    } catch {
      // Ignoré
    }
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:contact@ramsin.fr?subject=Question%20CGU%20Dabari");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ── TOP HEADER ── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Conditions Générales</Text>
          <Text style={styles.headerSubtitle}>Cadre Réglementaire CGU</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO BANNER ── */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.officialBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#166534" />
              <Text style={styles.officialBadgeText}>{cguData.version}</Text>
            </View>
            <Text style={styles.dateText}>Mise à jour : {cguData.lastUpdated}</Text>
          </View>

          <Text style={styles.heroMainTitle}>{cguData.title}</Text>
          <Text style={styles.heroSubText}>{cguData.subtitle}</Text>

          <View style={styles.publisherBox}>
            <Ionicons name="business-outline" size={15} color="#1D6B45" />
            <Text style={styles.publisherText}>
              Édité par {cguData.publisher.name} • Siège social France
            </Text>
          </View>
        </View>

        {/* ── 3 PILIERS DE PROTECTION ── */}
        <View style={styles.pillarsGrid}>
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="shield-checkmark" size={18} color="#166534" />
            </View>
            <Text style={styles.pillarTitle}>Cotransportage Conforme</Text>
            <Text style={styles.pillarDesc}>
              Partage strict des frais réels sans but lucratif (Art. L. 3232-1 C. transports).
            </Text>
          </View>

          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="lock-closed" size={18} color="#B45309" />
            </View>
            <Text style={styles.pillarTitle}>Séquestre Dabari SAS</Text>
            <Text style={styles.pillarDesc}>
              Acomptes cantonnés jusqu&apos;à la confirmation effective de la prestation.
            </Text>
          </View>

          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
            </View>
            <Text style={styles.pillarTitle}>Zéro Marchandise Illicite</Text>
            <Text style={styles.pillarDesc}>
              Interdiction absolue des stupéfiants, armes et objets non déclarés en douane.
            </Text>
          </View>
        </View>

        {/* ── BARRE DE RECHERCHE ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un mot-clé (séquestre, bagages, douane)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ padding: 8, marginRight: 4 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── FILTRES CATÉGORIES ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredArticles.length} sur {cguData.articles.length} articles répertoriés
          </Text>
        </View>

        {/* ── LISTE DES ARTICLES ── */}
        <View style={styles.articlesList}>
          {filteredArticles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Aucun article trouvé</Text>
              <Text style={styles.emptySubtitle}>
                Aucun résultat pour &quot;{searchQuery}&quot;. Essayez un autre terme.
              </Text>
            </View>
          ) : (
            filteredArticles.map((article) => {
              const isOpen = expandedArticles[article.id] !== false; // Ouvert par défaut

              return (
                <View key={article.id} style={styles.articleCard}>
                  <TouchableOpacity
                    style={styles.articleHeader}
                    onPress={() => toggleExpand(article.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.articleTagRow}>
                        <View style={styles.articleNumBadge}>
                          <Text style={styles.articleNumBadgeText}>{article.number}</Text>
                        </View>
                        <Text style={styles.articleCategoryText}>• {article.category}</Text>
                      </View>
                      <Text style={styles.articleTitle}>{article.title}</Text>
                    </View>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#64748B"
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  {/* Résumé de l'article */}
                  <View style={styles.summaryBox}>
                    <Ionicons name="information-circle" size={16} color="#1D6B45" />
                    <Text style={styles.summaryText}>{article.summary}</Text>
                  </View>

                  {/* Contenu complet */}
                  {isOpen && (
                    <View style={styles.articleBody}>
                      {article.paragraphs.map((para, idx) => (
                        <Text key={idx} style={styles.paragraphText}>
                          {para}
                        </Text>
                      ))}

                      {article.bulletPoints && article.bulletPoints.length > 0 && (
                        <View style={styles.bulletBox}>
                          {article.bulletPoints.map((bp, bpIdx) => (
                            <View key={bpIdx} style={styles.bulletRow}>
                              <Text style={styles.bulletDot}>•</Text>
                              <Text style={styles.bulletText}>{bp}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── FOOTER D'INFORMATIONS LÉGALES ── */}
        <View style={styles.legalFooterCard}>
          <View style={styles.legalFooterHeader}>
            <Ionicons name="scale-outline" size={18} color="#166534" />
            <Text style={styles.legalFooterTitle}>Droit Français & Résolution des Litiges</Text>
          </View>
          <Text style={styles.legalFooterText}>
            Les présentes Conditions Générales régissent l&apos;utilisation de Dabari. En cas de réclamation, une solution amiable est privilégiée avec recours possible à un médiateur de la consommation.
          </Text>

          <TouchableOpacity
            style={styles.contactSupportBtn}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={16} color="#FFFFFF" />
            <Text style={styles.contactSupportBtnText}>
              Contacter le service juridique Dabari
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B3B24",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "600",
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  dateText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  heroMainTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 24,
  },
  heroSubText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  publisherBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  publisherText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  pillarsGrid: {
    gap: 8,
  },
  pillarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  pillarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  pillarDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  categoriesScroll: {
    marginVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  countRow: {
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  articlesList: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  articleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  articleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  articleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  articleNumBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  articleNumBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  articleCategoryText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  summaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    flex: 1,
    lineHeight: 16,
  },
  articleBody: {
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  paragraphText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  bulletBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bulletDot: {
    color: "#1D6B45",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  bulletText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
    lineHeight: 16,
  },
  legalFooterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    marginTop: 8,
  },
  legalFooterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legalFooterTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  legalFooterText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  contactSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D6B45",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  contactSupportBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
