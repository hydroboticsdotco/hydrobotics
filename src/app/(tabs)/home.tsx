import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { BANNERS, NEWS, type Banner, type NewsItem } from "../../data/home";
import { useApp } from "../../store";
import { colors, font, radius, spacing } from "../../theme";
import { HydroMark, Screen } from "../../ui";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = spacing.lg;
const BANNER_W = SCREEN_W - H_PAD * 2;

export default function Home() {
  const router = useRouter();
  const { totalTokens } = useApp();
  const listRef = useRef<FlatList<Banner>>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);

  // Auto-advance the banners every 4s.
  useEffect(() => {
    const t = setInterval(() => {
      const next = (pageRef.current + 1) % BANNERS.length;
      pageRef.current = next;
      setPage(next);
      listRef.current?.scrollToOffset({ offset: next * BANNER_W, animated: true });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    if (p !== pageRef.current) {
      pageRef.current = p;
      setPage(p);
    }
  };

  return (
    <Screen edges={["top"]} padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <HydroMark size={40} />
            <View>
              <Text style={styles.brand}>Hydro</Text>
              <Text style={styles.brandSub}>Data for physical intelligence</Text>
            </View>
          </View>
          <Pressable style={styles.balance} onPress={() => router.push("/profile")}>
            <Text style={styles.balanceNum}>{totalTokens}</Text>
            <Text style={styles.balanceLabel}>$HYDRO</Text>
          </Pressable>
        </View>

        {/* Banner carousel */}
        <FlatList
          ref={listRef}
          data={BANNERS}
          keyExtractor={(b) => b.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={BANNER_W}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: H_PAD }}
          renderItem={({ item }) => <BannerCard banner={item} />}
        />
        <View style={styles.dots}>
          {BANNERS.map((b, i) => (
            <View
              key={b.id}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        {/* CTA */}
        <Pressable style={styles.cta} onPress={() => router.push("/tasks")}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Start contributing</Text>
            <Text style={styles.ctaSub}>Pick a task and record a clip →</Text>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </Pressable>

        {/* News / updates */}
        <Text style={styles.section}>Updates & industry</Text>
        <View style={{ gap: spacing.md, paddingHorizontal: H_PAD }}>
          {NEWS.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </View>

        <Text style={styles.footNote}>
          Hydro turns everyday human motion into training data for robots.
          More tasks and rewards are added over time.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function BannerCard({ banner }: { banner: Banner }) {
  return (
    <View style={[styles.banner, { width: BANNER_W }]}>
      <View style={[styles.bannerAccent, { backgroundColor: banner.accent }]} />
      <View style={styles.bannerBody}>
        <View style={[styles.bannerTag, { borderColor: banner.accent }]}>
          <Text style={[styles.bannerTagText, { color: banner.accent }]}>
            {banner.tag}
          </Text>
        </View>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        <Text style={styles.bannerSub}>{banner.subtitle}</Text>
      </View>
    </View>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const isHydro = item.kind === "Hydro";
  return (
    <View style={styles.news}>
      <View style={styles.newsTop}>
        <View
          style={[
            styles.newsKind,
            { backgroundColor: isHydro ? "rgba(10,132,255,0.16)" : "rgba(94,92,230,0.16)" },
          ]}
        >
          <Text
            style={[
              styles.newsKindText,
              { color: isHydro ? colors.primary : "#8E8CF0" },
            ]}
          >
            {item.kind} · {item.tag}
          </Text>
        </View>
        <Text style={styles.newsDate}>{item.date}</Text>
      </View>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsSummary}>{item.summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brand: { color: colors.text, fontSize: font.title, fontWeight: "800" },
  brandSub: { color: colors.textDim, fontSize: font.tiny },
  balance: {
    backgroundColor: "rgba(10,132,255,0.16)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  balanceNum: { color: colors.primary, fontSize: font.heading, fontWeight: "800" },
  balanceLabel: { color: colors.primary, fontSize: font.tiny, fontWeight: "600" },
  banner: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    minHeight: 168,
  },
  bannerAccent: { width: 6 },
  bannerBody: { flex: 1, padding: spacing.lg, gap: spacing.sm, justifyContent: "center" },
  bannerTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  bannerTagText: { fontSize: font.tiny, fontWeight: "700" },
  bannerTitle: { color: colors.text, fontSize: font.title, fontWeight: "800", letterSpacing: -0.3 },
  bannerSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: -spacing.xs },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: H_PAD,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  ctaTitle: { color: "#fff", fontSize: font.heading, fontWeight: "800" },
  ctaSub: { color: "rgba(255,255,255,0.85)", fontSize: font.small, marginTop: 2 },
  ctaArrow: { color: "#fff", fontSize: 26, fontWeight: "800" },
  section: {
    color: colors.textDim,
    fontSize: font.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: H_PAD,
    marginTop: spacing.sm,
  },
  news: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  newsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  newsKind: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  newsKindText: { fontSize: font.tiny, fontWeight: "700" },
  newsDate: { color: colors.textFaint, fontSize: font.tiny },
  newsTitle: { color: colors.text, fontSize: font.heading, fontWeight: "700", marginTop: 2 },
  newsSummary: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  footNote: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
});
