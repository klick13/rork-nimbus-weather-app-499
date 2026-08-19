package com.rork.nimbushyperlocalweatherappandroid.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Sailing
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.components.AtmosphericBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.BackgroundDark
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextTertiary

data class ProFeature(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val gradient: List<Color>,
    val accentColor: Color,
)

private val PRO_FEATURES = listOf(
    ProFeature(
        id = "hobby",
        title = "Hobby Alerts",
        subtitle = "Cigars  Drones  Photography  Surf",
        icon = Icons.Filled.AutoAwesome,
        gradient = listOf(Color(0x26F4A436), Color(0x08F4A436)),
        accentColor = Accent,
    ),
    ProFeature(
        id = "historical",
        title = "Historical Data",
        subtitle = "30-day lookback & climate trends",
        icon = Icons.Filled.History,
        gradient = listOf(Color(0x264A9FE8), Color(0x084A9FE8)),
        accentColor = Accent,
    ),
    ProFeature(
        id = "marine",
        title = "Marine & Coastal",
        subtitle = "Tides  Swell  Sea temp  Visibility",
        icon = Icons.Filled.Sailing,
        gradient = listOf(Color(0x265CB8FF), Color(0x085CB8FF)),
        accentColor = Color(0xFF00B4D8),
    ),
    ProFeature(
        id = "aviation",
        title = "Aviation Weather",
        subtitle = "METAR  Flight cat  Turbulence  Icing",
        icon = Icons.Filled.Flight,
        gradient = listOf(Color(0x26E8734A), Color(0x08E8734A)),
        accentColor = Color(0xFFFF3D71),
    ),
    ProFeature(
        id = "radar",
        title = "Radar Archives",
        subtitle = "Replay storms & precipitation patterns",
        icon = Icons.Filled.Radar,
        gradient = listOf(Color(0x26FF6B6B), Color(0x08FF6B6B)),
        accentColor = Color(0xFFFF3D71),
    ),
    ProFeature(
        id = "lightning",
        title = "Lightning Strike Map",
        subtitle = "Real-time detection  Safety alerts  Distance",
        icon = Icons.Filled.Bolt,
        gradient = listOf(Color(0x26FFD60A), Color(0x08FFD60A)),
        accentColor = Color(0xFFFFD60A),
    ),
    ProFeature(
        id = "gardening",
        title = "Gardening & Frost",
        subtitle = "Frost alerts  Planting conditions  Watering",
        icon = Icons.Filled.Star,
        gradient = listOf(Color(0x2634C759), Color(0x0834C759)),
        accentColor = Color(0xFF34C759),
    ),
    ProFeature(
        id = "event-planner",
        title = "Event Weather Planner",
        subtitle = "Plan events  Comfort score  Recommendations",
        icon = Icons.Filled.CalendarMonth,
        gradient = listOf(Color(0x26F4A436), Color(0x08F4A436)),
        accentColor = Accent,
    ),
)

@Composable
fun ProScreen(
    isPro: Boolean = false,
    onUpgrade: () -> Unit = {},
) {
    Box(modifier = Modifier.fillMaxSize().background(BackgroundDark)) {
        AtmosphericBackground(conditionId = "clear", isDay = true)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .padding(bottom = 100.dp),
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    text = "Pro",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
                if (isPro) {
                    Box(
                        modifier = Modifier
                            .background(NeonPurple.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                            .border(1.dp, NeonPurple.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                    ) {
                        Text(
                            text = "PRO",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonPurple,
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Accent, RoundedCornerShape(8.dp))
                            .clickable { onUpgrade() }
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                    ) {
                        Text(
                            text = "Upgrade",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = BackgroundDark,
                        )
                    }
                }
            }

            Text(
                text = if (isPro) "All features unlocked" else "Advanced weather intelligence — from \$2.99/wk",
                fontSize = 14.sp,
                color = TextSecondary,
                modifier = Modifier.padding(horizontal = 24.dp),
            )

            // Promo banner
            if (!isPro) {
                Spacer(modifier = Modifier.height(20.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0x1FF4A436), Color(0x0FE8734A)),
                            ),
                            RoundedCornerShape(16.dp),
                        )
                        .border(1.dp, Color(0x33F4A436), RoundedCornerShape(16.dp))
                        .clickable { onUpgrade() }
                        .padding(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = "Pro",
                            tint = Accent,
                            modifier = Modifier.size(24.dp),
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Try Nimbus Pro free for 7 days",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Accent,
                            )
                            Text(
                                text = "Unlock all features below. Cancel anytime.",
                                fontSize = 12.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                        Icon(
                            imageVector = Icons.Filled.NavigateNext,
                            contentDescription = "Upgrade",
                            tint = Accent,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Feature cards
            PRO_FEATURES.forEachIndexed { index, feature ->
                FeatureCardRow(
                    feature = feature,
                    isPro = isPro,
                    onClick = { onUpgrade() },
                )
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun FeatureCardRow(
    feature: ProFeature,
    isPro: Boolean,
    onClick: () -> Unit,
) {
    val scale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(400),
        label = "feature_scale",
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(
                Brush.linearGradient(feature.gradient),
                RoundedCornerShape(16.dp),
            )
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(feature.accentColor.copy(alpha = 0.08f), RoundedCornerShape(13.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = feature.icon,
                    contentDescription = feature.title,
                    tint = feature.accentColor,
                    modifier = Modifier.size(22.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = feature.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                    )
                    if (!isPro) {
                        Icon(
                            imageVector = Icons.Filled.Lock,
                            contentDescription = "Locked",
                            tint = TextTertiary,
                            modifier = Modifier.size(12.dp),
                        )
                    }
                }
                Text(
                    text = feature.subtitle,
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 3.dp),
                )
            }
            Icon(
                imageVector = Icons.Filled.NavigateNext,
                contentDescription = "Open",
                tint = TextTertiary,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}
