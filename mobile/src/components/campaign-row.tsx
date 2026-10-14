import { View } from "react-native";
import { router } from "expo-router";
import type { CampaignSummary } from "../shared/domain";
import { pinImageUrl } from "../lib/api";
import { colors, radius } from "../lib/theme";
import { AuthImage } from "./auth-image";
import { Body, Card, Icon, Muted, Row, StatusBadge } from "./ui";

export function CampaignRow({ campaign }: { campaign: CampaignSummary }) {
  return (
    <Card onPress={() => router.push(`/campaigns/${campaign.id}`)} accessibilityLabel={`Open campaign ${campaign.name}`}>
      <Row gap={14} style={{ alignItems: "flex-start" }}>
        {campaign.coverPinId ? (
          <AuthImage uri={pinImageUrl(campaign.coverPinId, "thumb")} cacheKey={`${campaign.coverPinId}-${campaign.updatedAt}`} style={{ width: 56, height: 84, borderRadius: radius }} />
        ) : (
          <View style={{ width: 56, height: 84, borderRadius: radius, backgroundColor: colors.sky, alignItems: "center", justifyContent: "center" }}>
            <Icon name="layers" size={20} />
          </View>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <Body style={{ fontFamily: "InstrumentSans_600SemiBold" }} numberOfLines={2}>
            {campaign.name}
          </Body>
          <StatusBadge status={campaign.status} />
          <Muted>
            {campaign.pinCount} pins · {campaign.approvedCount} approved · {campaign.publishedCount} published
          </Muted>
        </View>
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </Row>
    </Card>
  );
}
