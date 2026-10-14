import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AuthImage } from "../../components/auth-image";
import { Body, Card, Empty, Heading, IconButton, Loading, Muted, Notice, Row, Screen, StatusBadge } from "../../components/ui";
import { pinImageUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, fonts, radius } from "../../lib/theme";
import { useApi } from "../../lib/use-api";
import type { Pin } from "../../shared/domain";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function Calendar() {
  const { account } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const lastDay = new Date(month.y, month.m + 1, 0).getDate();
  const from = `${month.y}-${pad(month.m + 1)}-01`;
  const to = `${month.y}-${pad(month.m + 1)}-${pad(lastDay)}`;
  const enabled = account?.plan.features.calendar ?? false;
  const { data, error, loading, refreshing, refresh } = useApi<Pin[]>(enabled ? `/pins?plannedFrom=${from}&plannedTo=${to}` : null);

  const byDay = useMemo(() => {
    const map = new Map<string, Pin[]>();
    for (const p of data ?? []) if (p.plannedFor) map.set(p.plannedFor, [...(map.get(p.plannedFor) ?? []), p]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const shift = (delta: number) => setMonth(({ y, m }) => (m + delta < 0 ? { y: y - 1, m: 11 } : m + delta > 11 ? { y: y + 1, m: 0 } : { y, m: m + delta }));

  if (account && !enabled) {
    return (
      <Screen>
        <Empty icon="calendar" title="Content calendar" body="The calendar isn't part of your current plan. You can still save and share pins from any campaign." color="sky" />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: "space-between" }}>
        <IconButton icon="chevron-left" label="Previous month" onPress={() => shift(-1)} />
        <Heading>
          {MONTHS[month.m]} {month.y}
        </Heading>
        <IconButton icon="chevron-right" label="Next month" onPress={() => shift(1)} />
      </Row>
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {loading ? (
        <Loading />
      ) : byDay.length === 0 ? (
        <Empty icon="calendar" title="Nothing planned this month" body="Open a pin and pick a date to plan when you'll post it." color="butter" />
      ) : (
        byDay.map(([day, pins]) => {
          const d = new Date(`${day}T12:00:00`);
          return (
            <View key={day} style={{ gap: 8 }}>
              <Row gap={10}>
                <View style={{ width: 46, alignItems: "center", paddingVertical: 4, backgroundColor: day === `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` ? colors.mint : colors.surfaceMuted, borderRadius: radius }}>
                  <Muted style={{ fontSize: 11 }}>{DAYS[d.getDay()]}</Muted>
                  <Body style={{ fontFamily: fonts.display, fontSize: 22 }}>{d.getDate()}</Body>
                </View>
                <Muted>
                  {pins.length} pin{pins.length === 1 ? "" : "s"}
                </Muted>
              </Row>
              {pins.map((p) => (
                <Pressable key={p.id} onPress={() => router.push(`/pins/${p.id}`)} accessibilityRole="button" accessibilityLabel={`Open pin ${p.title}`}>
                  <Card>
                    <Row gap={12}>
                      <AuthImage uri={pinImageUrl(p.id, "thumb", p.updatedAt)} cacheKey={`${p.id}-${p.updatedAt}-thumb`} style={{ width: 44, height: 66, borderRadius: radius }} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Body numberOfLines={2}>{p.title}</Body>
                        <StatusBadge status={p.status} />
                      </View>
                    </Row>
                  </Card>
                </Pressable>
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}
